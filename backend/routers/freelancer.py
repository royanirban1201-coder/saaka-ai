from fastapi import APIRouter, Depends, HTTPException
from database.connection import (
    users_col, offers_col, tenders_col,
    contracts_col, milestones_col
)
from utils.auth import require_freelancer, get_current_user
from services.escrow_service import (
    release_milestone_payout, unlock_wallet, get_wallet_summary
)
from services.pfi_service import update_pfi
from services.email_service import (
    email_aqa_result, email_milestone_paid, email_wallet_unlocked
)
from services.aqa_pipeline import run_full_aqa
from models.schemas import MilestoneSubmit, MilestoneReview, UpdateAvailability
from bson import ObjectId
from datetime import datetime

router = APIRouter(tags=["Freelancer"])


def s(obj):
    if isinstance(obj, list):
        for o in obj:
            if "_id" in o:
                o["_id"] = str(o["_id"])
        return obj
    if "_id" in obj:
        obj["_id"] = str(obj["_id"])
    return obj


def _finalize_contract(
    employer_id, freelancer_id, description,
    agreed_price, deadline, buffer_days
):
    from services.escrow_service import calculate_amounts, create_wallet_instance
    amounts = calculate_amounts(float(agreed_price))
    contract = {
        "employer_id": employer_id,
        "freelancer_id": freelancer_id,
        "project_description": description,
        "agreed_price": float(agreed_price),
        **amounts,
        "deadline": deadline,
        "buffer_days": int(buffer_days),
        "status": "active",
        "created_at": datetime.utcnow(),
        "buffer_revealed": False
    }
    result = contracts_col.insert_one(contract)
    cid = str(result.inserted_id)
    create_wallet_instance(freelancer_id, cid, amounts["freelancer_receives"])
    return {"contract_id": cid, "amounts": amounts}


def _auto_generate_milestones(contract_id, description, deadline, budget, freelancer_id):
    """Generate milestones via AI and save to DB."""
    try:
        from utils.llm_client import generate_milestones
        import json, re
        raw = generate_milestones(description, deadline, float(budget))
        # parse if string
        if isinstance(raw, str):
            cleaned = re.sub(r"```json|```", "", raw).strip()
            milestones = json.loads(cleaned)
        else:
            milestones = raw

        if not isinstance(milestones, list) or len(milestones) == 0:
            raise ValueError("Empty milestones")

        # Ensure percents sum to 100
        total_pct = sum(m.get("payout_percent", 0) for m in milestones)
        if total_pct != 100:
            each = round(100 / len(milestones))
            for i, m in enumerate(milestones):
                m["payout_percent"] = each
            milestones[-1]["payout_percent"] = 100 - (each * (len(milestones) - 1))

        for i, m in enumerate(milestones):
            milestones_col.insert_one({
                "contract_id": contract_id,
                "index": i,
                "title": m.get("title", f"Milestone {i + 1}"),
                "description": m.get("description", ""),
                "deadline": m.get("deadline", deadline),
                "payout_percent": m.get("payout_percent", round(100 / len(milestones))),
                "checklist": m.get("checklist", []),
                "status": "pending",
                "submission_url": None,
                "aqa_result": None,
                "employer_flagged": False,
                "employer_feedback": "",
                "submitted_on_time": False,
                "freelancer_id": freelancer_id,
                "created_at": datetime.utcnow()
            })
        print(f"[Milestones] Generated {len(milestones)} for contract {contract_id}")
        return len(milestones)
    except Exception as e:
        print(f"[Milestone generation error] {e}")
        # Fallback: create 3 basic milestones
        basic = [
            {"title": "Initial setup & planning", "payout_percent": 20},
            {"title": "Core development", "payout_percent": 50},
            {"title": "Final delivery & testing", "payout_percent": 30},
        ]
        for i, m in enumerate(basic):
            milestones_col.insert_one({
                "contract_id": contract_id,
                "index": i,
                "title": m["title"],
                "description": "",
                "deadline": deadline,
                "payout_percent": m["payout_percent"],
                "checklist": [],
                "status": "pending",
                "submission_url": None,
                "aqa_result": None,
                "employer_flagged": False,
                "employer_feedback": "",
                "submitted_on_time": False,
                "freelancer_id": freelancer_id,
                "created_at": datetime.utcnow()
            })
        return 3


# ── Offers inbox ──────────────────────────────────────────────
@router.get("/offers")
def get_offers(user=Depends(require_freelancer)):
    offers = list(offers_col.find({
        "freelancer_id": user["_id"],
        "status": {"$in": ["pending", "negotiating"]}
    }))
    for o in offers:
        o["_id"] = str(o["_id"])
        emp = users_col.find_one({"_id": ObjectId(o["employer_id"])})
        o["company_name"] = emp.get("company_name", emp.get("full_name", "")) if emp else ""
    return {"offers": offers}


# ── Accept offer ──────────────────────────────────────────────
@router.post("/offers/{offer_id}/accept")
def accept_offer(offer_id: str, user=Depends(require_freelancer)):
    active_count = contracts_col.count_documents({
        "freelancer_id": user["_id"], "status": "active"
    })
    if active_count >= 3:
        raise HTTPException(400, "You already have 3 active projects. Cannot accept more.")

    offer = offers_col.find_one({
        "_id": ObjectId(offer_id), "freelancer_id": user["_id"]
    })
    if not offer:
        raise HTTPException(404, "Offer not found")

    result = _finalize_contract(
        offer["employer_id"], user["_id"],
        offer["project_description"], offer["budget"],
        offer["deadline"], offer["buffer_days"]
    )
    cid = result["contract_id"]

    # Auto-generate milestones
    _auto_generate_milestones(
        cid,
        offer["project_description"],
        offer["deadline"],
        offer["budget"],
        user["_id"]
    )

    # Cancel other pending direct offers
    offers_col.update_many(
        {
            "employer_id": offer["employer_id"],
            "status": "pending",
            "_id": {"$ne": ObjectId(offer_id)}
        },
        {"$set": {"status": "cancelled"}}
    )
    offers_col.update_one(
        {"_id": ObjectId(offer_id)},
        {"$set": {"status": "accepted"}}
    )
    return result


# ── Reject offer ──────────────────────────────────────────────
@router.post("/offers/{offer_id}/reject")
def reject_offer(offer_id: str, user=Depends(require_freelancer)):
    offers_col.update_one(
        {"_id": ObjectId(offer_id), "freelancer_id": user["_id"]},
        {"$set": {"status": "rejected"}}
    )
    return {"message": "Offer rejected"}


# ── Browse open tenders ───────────────────────────────────────
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
        already = any(a["freelancer_id"] == user["_id"] for a in t.get("applicants", []))
        t["already_applied"] = already
    return {"tenders": tenders}


# ── Apply to tender ───────────────────────────────────────────
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
        {"$push": {"applicants": {
            "freelancer_id": user["_id"],
            "proposed_price": proposed_price,
            "applied_at": datetime.utcnow()
        }}}
    )
    return {"message": "Application submitted"}


# ── Active contracts ──────────────────────────────────────────
@router.get("/contracts")
def my_contracts(user=Depends(require_freelancer)):
    contracts = list(contracts_col.find({"freelancer_id": user["_id"]}))
    for c in contracts:
        c["_id"] = str(c["_id"])
        c["milestones"] = s(list(milestones_col.find({"contract_id": str(c["_id"])})))
    return {"contracts": contracts}


# ── Submit milestone ──────────────────────────────────────────
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

    # Get contract for original prompt
    contract = contracts_col.find_one({"_id": ObjectId(milestone["contract_id"])})
    if not contract:
        raise HTTPException(404, "Contract not found")
    original_prompt = contract.get("project_description", "")
    domains = contract.get("required_domains", [])
    domain_str = domains[0] if domains else ""

    # Run 3-layer AQA: Vision → Embedding → AI
    try:
        aqa_result = run_full_aqa(
            original_prompt,
            milestone.get("checklist", []),
            data.submission_url,
            data.notes or "",
            domain_str
        )
    except Exception as e:
        print(f"[AQA Error] {e}")
        aqa_result = {
            "verdict": "partial",
            "score": 50,
            "feedback": "AQA evaluation encountered an issue. Please resubmit.",
            "corrections_needed": [],
            "passed_items": [],
            "failed_items": []
        }

    status = "aqa_passed" if aqa_result.get("verdict") == "pass" else "correction_needed"

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

    # Email freelancer with AQA result
    try:
        freelancer = users_col.find_one({"_id": ObjectId(user["_id"])})
        if freelancer:
            email_aqa_result(
                freelancer["email"],
                milestone["title"],
                aqa_result.get("verdict", "fail"),
                aqa_result.get("feedback", "")
            )
    except Exception as e:
        print(f"[Email error] {e}")

    return {"aqa_result": aqa_result, "status": status}


# ── Employer reviews milestone ────────────────────────────────
@router.post("/milestones/review")
def employer_review_milestone(data: MilestoneReview, user=Depends(get_current_user)):
    milestone = milestones_col.find_one({"_id": ObjectId(data.milestone_id)})
    if not milestone:
        raise HTTPException(404, "Milestone not found")
    if milestone["status"] != "aqa_passed":
        raise HTTPException(400, "Milestone not ready for review")

    if data.approved:
        milestones_col.update_one(
            {"_id": ObjectId(data.milestone_id)},
            {"$set": {"status": "approved", "employer_flagged": False}}
        )

        cid = milestone["contract_id"]
        payout = release_milestone_payout(cid, milestone["index"], milestone["payout_percent"])

        # Email freelancer about payment
        try:
            freelancer_id = milestone.get("freelancer_id", "")
            freelancer = users_col.find_one({"_id": ObjectId(freelancer_id)}) if freelancer_id else None
            if freelancer:
                email_milestone_paid(freelancer["email"], payout, milestone["title"])
        except Exception as e:
            print(f"[Email error] {e}")

        # Check if ALL milestones approved
        all_milestones = list(milestones_col.find({"contract_id": cid}))
        all_approved = all(m["status"] == "approved" for m in all_milestones)

        if all_approved:
            unlock_wallet(cid)
            contracts_col.update_one(
                {"_id": ObjectId(cid)},
                {"$set": {"status": "awaiting_transfer"}}
            )
            try:
                if freelancer:
                    wallet_info = get_wallet_summary(str(freelancer["_id"]))
                    email_wallet_unlocked(freelancer["email"], wallet_info.get("total_unlocked", 0))
            except Exception as e:
                print(f"[Email error] {e}")

            # Update PFI
            try:
                freelancer_id = milestone.get("freelancer_id", "")
                if freelancer_id:
                    update_pfi(freelancer_id, cid)
            except Exception as e:
                print(f"[PFI update error] {e}")

        return {"message": "Milestone approved", "payout": payout}

    else:
        milestones_col.update_one(
            {"_id": ObjectId(data.milestone_id)},
            {"$set": {
                "status": "correction_needed",
                "employer_flagged": True,
                "employer_feedback": data.feedback or ""
            }}
        )
        return {"message": "Corrections requested", "feedback": data.feedback}


# ── Availability toggle ───────────────────────────────────────
@router.post("/availability")
def set_availability(data: UpdateAvailability, user=Depends(require_freelancer)):
    users_col.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"available": data.available}}
    )
    return {"available": data.available}


# ── Update profile photo ──────────────────────────────────────
@router.post("/profile/photo")
def update_photo(photo_url: str, user=Depends(require_freelancer)):
    users_col.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"profile_photo": photo_url}}
    )
    return {"message": "Photo updated", "photo_url": photo_url}


# ── Add past project to portfolio ────────────────────────────
@router.post("/portfolio/project")
def add_portfolio_project(
    title: str,
    description: str,
    link: str,
    domain: str,
    year: int,
    user=Depends(require_freelancer)
):
    project = {
        "title": title,
        "description": description,
        "link": link,
        "domain": domain,
        "year": year,
        "added_at": datetime.utcnow()
    }
    users_col.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$push": {"portfolio_projects": project}}
    )
    return {"message": "Project added to portfolio"}


# ── Get my portfolio ──────────────────────────────────────────
@router.get("/portfolio")
def get_portfolio(user=Depends(require_freelancer)):
    me = users_col.find_one({"_id": ObjectId(user["_id"])})
    return {
        "portfolio_projects": me.get("portfolio_projects", []),
        "portfolio_links": me.get("portfolio_links", []),
        "domains": me.get("domains", []),
        "bio": me.get("bio", ""),
    }