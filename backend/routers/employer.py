from fastapi import APIRouter, Depends, HTTPException
from database.connection import users_col, tenders_col, offers_col, contracts_col
from utils.auth import require_employer, get_current_user
from models.schemas import TenderCreate, SendOfferRequest, ContractCreate
from services.escrow_service import calculate_amounts, create_wallet_instance
from services.email_service import email_new_offer
from services.embedding_service import rank_freelancers_by_embedding
from bson import ObjectId
from datetime import datetime
from typing import Optional

router = APIRouter(tags=["Employer"])

def serialize(obj):
    if isinstance(obj, list):
        for o in obj:
            if "_id" in o: o["_id"] = str(o["_id"])
        return obj
    if "_id" in obj: obj["_id"] = str(obj["_id"])
    return obj

# ── Explore freelancers ───────────────────────────────
@router.get("/explore")
def explore_freelancers(domain: Optional[str] = None, min_pfi: float = 0,
                         max_rate: Optional[float] = None, available_only: bool = True,
                         skip: int = 0, limit: int = 20, user=Depends(require_employer)):
    query = {"role": "freelancer"}
    if domain:
        query["domains"] = {"$in": [domain]}
    if min_pfi > 0:
        query["pfi_score"] = {"$gte": min_pfi}
    if max_rate:
        query["hourly_rate"] = {"$lte": max_rate}
    if available_only:
        query["available"] = True

    freelancers = list(users_col.find(query, {
        "password_hash": 0, "bank_details": 0, "reset_otp": 0
    }).skip(skip).limit(limit))

    for f in freelancers:
        f["_id"] = str(f["_id"])
    return {"freelancers": freelancers, "count": len(freelancers)}

# ── Get single freelancer profile ─────────────────────
@router.get("/freelancer/{freelancer_id}")
def get_freelancer(freelancer_id: str, user=Depends(require_employer)):
    f = users_col.find_one({"_id": ObjectId(freelancer_id), "role": "freelancer"},
                            {"password_hash": 0, "bank_details": 0})
    if not f:
        raise HTTPException(404, "Freelancer not found")
    f["_id"] = str(f["_id"])
    # Count completed contracts
    completed = contracts_col.count_documents({"freelancer_id": freelancer_id, "status": "completed"})
    f["completed_projects"] = completed
    return f

# ── Direct hire: send offers to multiple freelancers ──
@router.post("/send-offers")
def send_offers(data: SendOfferRequest, user=Depends(require_employer)):
    if len(data.freelancer_ids) == 0:
        raise HTTPException(400, "Select at least one freelancer")

    offer_ids = []
    for fid in data.freelancer_ids:
        freelancer = users_col.find_one({"_id": ObjectId(fid)})
        if not freelancer:
            continue
        offer = {
            "employer_id": user["_id"],
            "freelancer_id": fid,
            "project_description": data.project_description,
            "budget": data.budget,
            "deadline": data.deadline,
            "buffer_days": data.buffer_days,
            "required_domains": data.required_domains,
            "status": "pending",
            "hire_mode": "direct",
            "created_at": datetime.utcnow(),
            "expires_at": None
        }
        result = offers_col.insert_one(offer)
        offer_ids.append(str(result.inserted_id))
        # Send email
        email_new_offer(
            freelancer["email"],
            user.get("company_name", user["full_name"]),
            ", ".join(data.required_domains),
            data.budget, data.deadline
        )
    return {"message": f"Offers sent to {len(offer_ids)} freelancers", "offer_ids": offer_ids}

# ── Tender float ──────────────────────────────────────
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

# ── View tender applicants ────────────────────────────
@router.get("/tender/{tender_id}/applicants")
def tender_applicants(tender_id: str, user=Depends(require_employer)):
    tender = tenders_col.find_one({"_id": ObjectId(tender_id), "employer_id": user["_id"]})
    if not tender:
        raise HTTPException(404, "Tender not found")
    applicants = []
    for app in tender.get("applicants", []):
        f = users_col.find_one({"_id": ObjectId(app["freelancer_id"])},
                                {"password_hash": 0, "bank_details": 0})
        if f:
            f["_id"] = str(f["_id"])
            f["proposed_price"] = app.get("proposed_price")
            f["applied_at"] = str(app.get("applied_at", ""))
            applicants.append(f)
    return {"applicants": applicants}

# ── Select tender winner & create contract ────────────
@router.post("/tender/{tender_id}/select/{freelancer_id}")
def select_tender_winner(tender_id: str, freelancer_id: str, agreed_price: float, user=Depends(require_employer)):
    tender = tenders_col.find_one({"_id": ObjectId(tender_id)})
    if not tender:
        raise HTTPException(404, "Tender not found")
    return _finalize_contract(user["_id"], freelancer_id, tender["description"], agreed_price, tender["deadline"], tender["buffer_days"])

# ── Employer active contracts ─────────────────────────
@router.get("/contracts")
def employer_contracts(user=Depends(require_employer)):
    contracts = list(contracts_col.find({"employer_id": user["_id"]}))
    return {"contracts": serialize(contracts)}

# ── Employer wallet ───────────────────────────────────
@router.get("/wallet")
def employer_wallet(user=Depends(require_employer)):
    return {"balance": user.get("wallet_balance", 0.0)}

def _finalize_contract(employer_id, freelancer_id, description, agreed_price, deadline, buffer_days):
    amounts = calculate_amounts(agreed_price)
    contract = {
        "employer_id": employer_id,
        "freelancer_id": freelancer_id,
        "project_description": description,
        "agreed_price": agreed_price,
        **amounts,
        "deadline": deadline,
        "buffer_days": buffer_days,
        "status": "active",
        "created_at": datetime.utcnow(),
        "buffer_revealed": False
    }
    result = contracts_col.insert_one(contract)
    cid = str(result.inserted_id)
    create_wallet_instance(freelancer_id, cid, amounts["freelancer_receives"])
    return {"contract_id": cid, "amounts": amounts}
