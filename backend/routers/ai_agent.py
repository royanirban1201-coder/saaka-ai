from fastapi import APIRouter, Depends, HTTPException
from database.connection import users_col, contracts_col, milestones_col, pfi_col
from utils.auth import get_current_user, require_employer, require_freelancer
from utils.llm_client import (
    requirement_chat, rank_freelancers, generate_milestones,
    evaluate_submission, check_work_assignment, explain_pfi_change,
    summarize_portfolio, check_negotiation, parse_json
)
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(tags=["AI Agent"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    history: List[ChatMessage]
    message: str
    stage: str = "requirement"
    project_id: Optional[str] = None

class WorkCheckRequest(BaseModel):
    offer_deadline: str
    offer_description: str
    offer_budget: float

# ── 1. Main AI chat endpoint ──────────────────────────
@router.post("/chat")
def ai_chat(req: ChatRequest, user=Depends(get_current_user)):
    history = [{"role": m.role, "content": m.content} for m in req.history]
    response = requirement_chat(history, req.message)
    # Try to detect if requirements are complete
    try:
        parsed = parse_json(response)
        if isinstance(parsed, dict) and parsed.get("complete"):
            return {"response": response, "complete": True, "data": parsed}
    except Exception:
        pass
    return {"response": response, "complete": False}

# ── 2. Generate milestones ────────────────────────────
@router.post("/projects/{project_id}/generate-milestones")
def gen_milestones(project_id: str, user=Depends(require_employer)):
    contract = contracts_col.find_one({"_id": ObjectId(project_id)})
    if not contract:
        raise HTTPException(404, "Contract not found")
    milestones = generate_milestones(
        contract["project_description"],
        contract["deadline"],
        contract["agreed_price"]
    )
    if not milestones:
        raise HTTPException(500, "Failed to generate milestones")
    # Save milestones to DB
    for i, m in enumerate(milestones):
        milestones_col.insert_one({
            "contract_id": project_id,
            "index": i,
            "title": m["title"],
            "description": m["description"],
            "deadline": m["deadline"],
            "payout_percent": m["payout_percent"],
            "checklist": m["checklist"],
            "status": "pending",
            "submission_url": None,
            "aqa_result": None,
            "employer_flagged": False,
            "submitted_on_time": False,
            "created_at": datetime.utcnow()
        })
    return {"milestones": milestones, "count": len(milestones)}

# ── 3. Work assignment check ──────────────────────────
@router.post("/work-assignment")
def work_assignment_check(req: WorkCheckRequest, user=Depends(require_freelancer)):
    active = list(contracts_col.find({
        "freelancer_id": user["_id"],
        "status": "active"
    }))
    active_simple = [{"description": c.get("project_description", "")[:80], "deadline": c.get("deadline", "")} for c in active]
    new_offer = {"description": req.offer_description, "deadline": req.offer_deadline, "budget": req.offer_budget}
    result = check_work_assignment(new_offer, active_simple)
    return result

# ── 4. Portfolio AI summary ───────────────────────────
@router.get("/portfolio-summary/{freelancer_id}")
def portfolio_summary(freelancer_id: str, user=Depends(require_employer)):
    freelancer = users_col.find_one({"_id": ObjectId(freelancer_id), "role": "freelancer"})
    if not freelancer:
        raise HTTPException(404, "Freelancer not found")
    safe = {
        "name": freelancer.get("full_name"),
        "domains": freelancer.get("domains", []),
        "sub_skills": freelancer.get("sub_skills", []),
        "years_experience": freelancer.get("years_experience"),
        "portfolio_links": freelancer.get("portfolio_links", []),
        "bio": freelancer.get("bio", ""),
        "pfi_score": freelancer.get("pfi_score"),
    }
    summary = summarize_portfolio(safe)
    return {"summary": summary}

# ── 5. Check negotiation outcome ─────────────────────
@router.post("/check-negotiation/{contract_id}")
def check_negotiation_outcome(contract_id: str, user=Depends(get_current_user)):
    from database.connection import messages_col
    messages = list(messages_col.find({"contract_id": contract_id, "type": "negotiation"}).sort("timestamp", 1))
    if not messages:
        return {"outcome": "ongoing", "agreed_price": None}
    chat_log = [{"sender": m.get("sender_role"), "message": m.get("content"), "price": m.get("proposed_price")} for m in messages]
    result = check_negotiation(chat_log, len(messages))
    return result

# ── 6. PFI history with AI explanations ──────────────
@router.get("/pfi/history")
def pfi_history(user=Depends(require_freelancer)):
    history = list(pfi_col.find({"freelancer_id": user["_id"]}).sort("timestamp", -1))
    for h in history:
        h["_id"] = str(h["_id"])
        h["timestamp"] = str(h["timestamp"])
    return {"history": history, "current_score": user.get("pfi_score", 70.0)}
