from fastapi import APIRouter, Depends, HTTPException
from database.connection import users_col, offers_col, tenders_col, contracts_col, milestones_col
from utils.auth import require_freelancer, get_current_user
from utils.llm_client import evaluate_submission
from services.aqa_pipeline import run_full_aqa
from services.escrow_service import release_milestone_payout, unlock_wallet, get_wallet_summary
from services.pfi_service import update_pfi, apply_pfi_penalty
from services.email_service import email_aqa_result, email_milestone_paid, email_wallet_unlocked
from models.schemas import MilestoneSubmit, MilestoneReview, UpdateAvailability
from bson import ObjectId
from datetime import datetime

router = APIRouter(tags=["Freelancer"])

def s(obj):
    if isinstance(obj, list):
        for o in obj:
            if "_id" in o: o["_id"] = str(o["_id"])
        return obj
    if "_id" in obj: obj["_id"] = str(obj["_id"])
    return obj

# ── Offers inbox ──────────────────────────────────────
@router.get("/offers")
def get_offers(user=Depends(require_freelancer)):
    offers = list(offers_col.find({"freelancer_id": user["_id"], "status": {"$in": ["pending", "negotiating"]}}))
    for o in offers:
        o["_id"] = str(o["_id"])
        emp = users_col.find_one({"_id": ObjectId(o["employer_id"])})
        o["company_name"] = emp.get("company_name", emp.get("full_name", "")) if emp else ""
    return {"offers": offers}

# ── Accept offer ──────────────────────────────────────
@router.post("/offers/{offer_id}/accept")
def accept_offer(offer_id: str, user=Depends(require_freelancer)):
    active_count = contracts_col.count_documents({"freelancer_id": user["_id"], "status": "active"})
    if active_count >= 3:
        raise HTTPException(400, "You already have 3 active projects. Cannot accept more.")
    offer = offers_col.find_one({"_id": ObjectId(offer_id), "freelancer_id": user["_id"]})
    if not offer:
        raise HTTPException(404, "Offer not found")

    result = _finalize_contract(
        offer["employer_id"], user["_id"],
        offer["project_description"], offer["budget"],
        offer["deadline"], offer["buffer_days"]
    )
    # Cancel other pending direct offers from same employer for same project
    offers_col.update_many(
        {"employer_id": offer["employer_id"], "status": "pending", "_id": {"$ne": ObjectId(offer_id)}},
        {"$set": {"status": "cancelled"}}
    )
    offers_col.update_one({"_id": ObjectId(offer_id)}, {"$set": {"status": "accepted"}})
    return result


def _finalize_contract(employer_id, freelancer_id, description, agreed_price, deadline, buffer_days):
    from services.escrow_service import calculate_amounts, create_wallet_instance
    amounts = calculate_amounts(float(agreed_price))
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

# ── Reject offer ──────────────────────────────────────
@router.post("/offers/{offer_id}/reject")
def reject_offer(offer_id: str, user=Depends(require_freelancer)):
    offers_col.update_one({"_id": ObjectId(offer_id), "freelancer_id": user["_id"]}, {"$set": {"status": "rejected"}})
    return {"message": "Offer rejected"}

# ── Browse open tenders (filtered by PFI + domains) ──
@router.get("/tenders")
def browse_tenders(user=Depends(require_freelancer)):
    user_pfi = user.get("pfi_score", 70.0)
    user_domains = user.get("domains", [])
    tenders = list(tenders_col.find({
        "status": "open",
        "min_pfi": {"$lte": user_pfi},
        "required_domains": {"$in": user_domains}
    }))
    for t in tenders:
        t["_id"] = str(t["_id"])
        already_applied = any(a["freelancer_id"] == user["_id"] for a in t.get("applicants", []))
        t["already_applied"] = already_applied
    return {"tenders": tenders}

# ── Apply to tender ───────────────────────────────────
@router.post("/tenders/{tender_id}/apply")
def apply_tender(tender_id: str, proposed_price: float, user=Depends(require_freelancer)):
    tender = tenders_col.find_one({"_id": ObjectId(tender_id)})
    if not tender:
        raise HTTPException(404, "Tender not found")
    already = any(a["freelancer_id"] == user["_id"] for a in tender.get("applicants", []))
    if already:
        raise HTTPException(400, "Already applied")
    tenders_col.update_one(
        {"_id": ObjectId(tender_id)},
        {"$push": {"applicants": {"freelancer_id": user["_id"], "proposed_price": proposed_price, "applied_at": datetime.utcnow()}}}
    )
    return {"message": "Application submitted"}

# ── Active contracts ──────────────────────────────────
@router.get("/contracts")
def my_contracts(user=Depends(require_freelancer)):
    contracts = list(contracts_col.find({"freelancer_id": user["_id"]}))
    for c in contracts:
        c["_id"] = str(c["_id"])
        c["milestones"] = s(list(milestones_col.find({"contract_id": str(c["_id"])})))
    return {"contracts": contracts}

# ── Submit milestone ──────────────────────────────────
@router.post("/milestones/submit")
def submit_milestone(data: MilestoneSubmit, user=Depends(require_freelancer)):
    milestone = milestones_col.find_one({"_id": ObjectId(data.milestone_id)})
    if not milestone:
        raise HTTPException(404, "Milestone not found")
    if milestone["status"] not in ["pending", "correction_needed"]:
        raise HTTPException(400, "Cannot submit at this stage")

    # Check if on time
    deadline = milestone.get("deadline", "")
    on_time = datetime.utcnow().strftime("%Y-%m-%d") <= deadline if deadline else True

    # Get original contract description
    contract = contracts_col.find_one({"_id": ObjectId(milestone["contract_id"])})
    original_prompt = contract.get("project_description", "")

    # Run full 3-layer AQA: Vision → Embedding → Claude
    domains = contract.get("required_domains", [])
    domain_str = domains[0] if domains else ""
    aqa_result = run_full_aqa(
        original_prompt, milestone["checklist"],
        data.submission_url, data.notes, domain_str
    )

    status = "aqa_passed" if aqa_result["verdict"] == "pass" else "correction_needed"

    milestones_col.update_one(
        {"_id": ObjectId(data.milestone_id)},
        {"$set": {
            "submission_url": data.submission_url,
            "aqa_result": aqa_result,
            "status": status,
            "submitted_on_time": on_time,
            "submitted_at": datetime.utcnow()
        }}
    )

    # Email both parties
    contract_data = contracts_col.find_one({"_id": ObjectId(milestone["contract_id"])})
    freelancer = users_col.find_one({"_id": ObjectId(user["_id"])})
    email_aqa_result(freelancer["email"], milestone["title"], aqa_result["verdict"], aqa_result["feedback"])

    return {"aqa_result": aqa_result, "status": status}

# ── Availability toggle ───────────────────────────────
@router.post("/availability")
def set_availability(data: UpdateAvailability, user=Depends(require_freelancer)):
    users_col.update_one({"_id": ObjectId(user["_id"])}, {"$set": {"available": data.available}})
    return {"available": data.available}

# ── Employer reviews milestone after AQA pass ─────────
@router.post("/milestones/review")
def employer_review_milestone(data: MilestoneReview, user=Depends(get_current_user)):
    milestone = milestones_col.find_one({"_id": ObjectId(data.milestone_id)})
    if not milestone or milestone["status"] != "aqa_passed":
        raise HTTPException(400, "Milestone not ready for review")

    if data.approved:
        milestones_col.update_one(
            {"_id": ObjectId(data.milestone_id)},
            {"$set": {"status": "approved", "employer_flagged": False}}
        )
        # Release payout
        cid = milestone["contract_id"]
        payout = release_milestone_payout(cid, milestone["index"], milestone["payout_percent"])

        freelancer = users_col.find_one({"_id": ObjectId(milestone.get("freelancer_id", ""))})
        if freelancer:
            email_milestone_paid(freelancer["email"], payout, milestone["title"])

        # Check if all milestones approved → unlock wallet
        all_milestones = list(milestones_col.find({"contract_id": cid}))
        all_approved = all(m["status"] == "approved" for m in all_milestones)
        if all_approved:
            unlock_wallet(cid)
            contracts_col.update_one({"_id": ObjectId(cid)}, {"$set": {"status": "awaiting_transfer"}})
            wallet_summary = get_wallet_summary(str(milestone.get("freelancer_id", user["_id"])))
            if freelancer:
                email_wallet_unlocked(freelancer["email"], wallet_summary["total_unlocked"])
            # Update PFI
            update_pfi(str(milestone.get("freelancer_id", user["_id"])), cid)

        return {"message": "Milestone approved", "payout": payout}
    else:
        milestones_col.update_one(
            {"_id": ObjectId(data.milestone_id)},
            {"$set": {"status": "correction_needed", "employer_flagged": True, "employer_feedback": data.feedback}}
        )
        return {"message": "Corrections requested", "feedback": data.feedback}
