from fastapi import APIRouter, Depends, HTTPException
from database.connection import users_col, tenders_col, offers_col, contracts_col
from utils.auth import require_employer, get_current_user
from services.embedding_service import rank_freelancers_by_embedding
from services.escrow_service import calculate_amounts, create_wallet_instance
from services.email_service import email_new_offer
from models.schemas import TenderCreate, SendOfferRequest, ContractCreate
from bson import ObjectId
from datetime import datetime
from typing import Optional

router = APIRouter(tags=["Employer"])


def serialize(obj):
    if isinstance(obj, list):
        for o in obj:
            if "_id" in o:
                o["_id"] = str(o["_id"])
        return obj
    if "_id" in obj:
        obj["_id"] = str(obj["_id"])
    return obj


# ── Explore freelancers ───────────────────────────────────────
@router.get("/explore")
def explore_freelancers(
    domain: Optional[str] = None,
    min_pfi: float = 0,
    max_rate: Optional[float] = None,
    available_only: bool = True,
    skip: int = 0,
    limit: int = 20,
    user=Depends(require_employer)
):
    query = {"role": "freelancer"}
    if domain:
        query["domains"] = {"$in": [domain]}
    if min_pfi > 0:
        query["pfi_score"] = {"$gte": min_pfi}
    if max_rate:
        query["hourly_rate"] = {"$lte": max_rate}
    if available_only:
        query["available"] = True

    freelancers = list(users_col.find(
        query,
        {"password_hash": 0, "bank_details": 0, "reset_otp": 0}
    ).skip(skip).limit(limit))

    for f in freelancers:
        f["_id"] = str(f["_id"])

    return {"freelancers": freelancers, "count": len(freelancers)}


# ── Get single freelancer profile ────────────────────────────
@router.get("/freelancer/{freelancer_id}")
def get_freelancer(freelancer_id: str, user=Depends(require_employer)):
    f = users_col.find_one(
        {"_id": ObjectId(freelancer_id), "role": "freelancer"},
        {"password_hash": 0, "bank_details": 0}
    )
    if not f:
        raise HTTPException(404, "Freelancer not found")
    f["_id"] = str(f["_id"])
    completed = contracts_col.count_documents({
        "freelancer_id": freelancer_id, "status": "completed"
    })
    f["completed_projects"] = completed
    return f


# ── Send direct hire offers ───────────────────────────────────
@router.post("/send-offers")
def send_offers(data: SendOfferRequest, user=Depends(require_employer)):
    if len(data.freelancer_ids) == 0:
        raise HTTPException(400, "Select at least one freelancer")

    # Calculate required amount
    amounts = calculate_amounts(float(data.budget))
    required = amounts["employer_pays"]
    current_balance = float(user.get("wallet_balance", 0))

    if current_balance < required:
        raise HTTPException(
            400,
            f"Insufficient wallet balance. "
            f"Required: ₹{required:.2f} (contract + {amounts['platform_fee']:.2f} fee + {amounts['tax']:.2f} tax). "
            f"Current balance: ₹{current_balance:.2f}. "
            f"Please top up your wallet first."
        )

    # Deduct from employer wallet — hold in escrow
    users_col.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$inc": {"wallet_balance": -required}}
    )

    offer_ids = []
    for fid in data.freelancer_ids:
        freelancer = users_col.find_one({"_id": ObjectId(fid)})
        if not freelancer:
            continue
        offer = {
            "employer_id": user["_id"],
            "freelancer_id": fid,
            "project_description": data.project_description,
            "budget": float(data.budget),
            "deadline": data.deadline,
            "buffer_days": int(data.buffer_days),
            "required_domains": data.required_domains,
            "status": "pending",
            "hire_mode": "direct",
            "amounts": amounts,
            "created_at": datetime.utcnow(),
        }
        result = offers_col.insert_one(offer)
        offer_ids.append(str(result.inserted_id))
        try:
            email_new_offer(
                freelancer["email"],
                user.get("company_name", user["full_name"]),
                ", ".join(data.required_domains),
                data.budget,
                data.deadline
            )
        except Exception as e:
            print(f"[Email error] {e}")

    return {
        "message": f"Offers sent to {len(offer_ids)} freelancers",
        "offer_ids": offer_ids,
        "amount_held": required,
        "wallet_balance_remaining": current_balance - required
    }


# ── Create tender ─────────────────────────────────────────────
@router.post("/tender")
def create_tender(data: TenderCreate, user=Depends(require_employer)):
    tender = {
        "employer_id": user["_id"],
        "employer_name": user.get("company_name", user["full_name"]),
        **data.dict(),
        "status": "open",
        "applicants": [],
        "created_at": datetime.utcnow()
    }
    result = tenders_col.insert_one(tender)
    return {"tender_id": str(result.inserted_id), "message": "Tender posted"}


# ── View tender applicants ────────────────────────────────────
@router.get("/tender/{tender_id}/applicants")
def tender_applicants(tender_id: str, user=Depends(require_employer)):
    tender = tenders_col.find_one({
        "_id": ObjectId(tender_id), "employer_id": user["_id"]
    })
    if not tender:
        raise HTTPException(404, "Tender not found")
    applicants = []
    for app in tender.get("applicants", []):
        f = users_col.find_one(
            {"_id": ObjectId(app["freelancer_id"])},
            {"password_hash": 0, "bank_details": 0}
        )
        if f:
            f["_id"] = str(f["_id"])
            f["proposed_price"] = app.get("proposed_price")
            f["applied_at"] = str(app.get("applied_at", ""))
            applicants.append(f)
    return {"applicants": applicants}


# ── Select tender winner ──────────────────────────────────────
@router.post("/tender/{tender_id}/select/{freelancer_id}")
def select_tender_winner(
    tender_id: str,
    freelancer_id: str,
    agreed_price: float,
    user=Depends(require_employer)
):
    tender = tenders_col.find_one({"_id": ObjectId(tender_id)})
    if not tender:
        raise HTTPException(404, "Tender not found")

    amounts = calculate_amounts(float(agreed_price))
    required = amounts["employer_pays"]
    current_balance = float(user.get("wallet_balance", 0))

    if current_balance < required:
        raise HTTPException(
            400,
            f"Insufficient balance. Required: ₹{required:.2f}. Current: ₹{current_balance:.2f}"
        )

    users_col.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$inc": {"wallet_balance": -required}}
    )

    contract = {
        "employer_id": user["_id"],
        "freelancer_id": freelancer_id,
        "project_description": tender.get("description", ""),
        "agreed_price": float(agreed_price),
        **amounts,
        "deadline": tender.get("deadline", ""),
        "buffer_days": int(tender.get("buffer_days", 3)),
        "status": "active",
        "created_at": datetime.utcnow(),
        "buffer_revealed": False
    }
    result = contracts_col.insert_one(contract)
    cid = str(result.inserted_id)
    create_wallet_instance(freelancer_id, cid, amounts["freelancer_receives"])
    tenders_col.update_one(
        {"_id": ObjectId(tender_id)},
        {"$set": {"status": "closed"}}
    )
    return {"contract_id": cid, "amounts": amounts}


# ── Employer contracts ────────────────────────────────────────
@router.get("/contracts")
def employer_contracts(user=Depends(require_employer)):
    from database.connection import milestones_col
    contracts = list(contracts_col.find({"employer_id": user["_id"]}))
    for c in contracts:
        c["_id"] = str(c["_id"])
        c["milestones"] = [
            {**m, "_id": str(m["_id"])}
            for m in milestones_col.find({"contract_id": str(c["_id"])})
        ]
    return {"contracts": serialize(contracts)}


# ── Employer wallet ───────────────────────────────────────────
@router.get("/wallet")
def employer_wallet(user=Depends(require_employer)):
    return {"balance": float(user.get("wallet_balance", 0))}