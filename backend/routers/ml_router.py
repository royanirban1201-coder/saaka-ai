"""
ML Router — endpoints for ML model management and analytics.
All admin-only except the smart search which employer uses.
"""

from fastapi import APIRouter, Depends, HTTPException
from utils.auth import require_admin, require_employer
from database.connection import (
    contracts_col, milestones_col, tenders_col,
    pfi_col, users_col
)
from services.pfi_ml_service import (
    train_pfi_model, build_training_data_from_db,
    predict_pfi, get_feature_importance
)
from services.embedding_service import rank_freelancers_by_embedding
from services.aqa_vision import full_vision_analysis
from services.analytics_service import (
    get_full_admin_analytics, compute_freelancer_trend
)
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

router = APIRouter(tags=["ML"])


class SmartSearchRequest(BaseModel):
    project_description: str
    min_pfi: float = 0
    top_k: int = 10
    domains: Optional[list] = None


class VisionTestRequest(BaseModel):
    image_url: str
    domain: Optional[str] = ""


# ── Smart embedding search (used by employer Hire page) ──
@router.post("/search/smart")
def smart_search(req: SmartSearchRequest, user=Depends(require_employer)):
    """
    Semantic search for freelancers using sentence-transformer embeddings.
    Much better than keyword search — understands intent.
    """
    query = {"role": "freelancer", "available": True}
    if req.min_pfi > 0:
        query["pfi_score"] = {"$gte": req.min_pfi}
    if req.domains:
        query["domains"] = {"$in": req.domains}

    freelancers = list(users_col.find(query, {
        "password_hash": 0, "bank_details": 0, "reset_otp": 0
    }).limit(100))

    for f in freelancers:
        f["_id"] = str(f["_id"])

    ranked = rank_freelancers_by_embedding(
        req.project_description, freelancers,
        min_pfi=req.min_pfi, top_k=req.top_k
    )

    return {"results": ranked, "count": len(ranked)}


# ── Vision AQA test ───────────────────────────────────
@router.post("/vision/analyze")
def analyze_image(req: VisionTestRequest, user=Depends(require_employer)):
    """Test vision analysis on any image URL. Used internally by AQA pipeline."""
    result = full_vision_analysis(req.image_url, req.domain)
    return result


# ── Train PFI model ───────────────────────────────────
@router.post("/pfi/train")
def train_pfi(user=Depends(require_admin)):
    """
    Build training data from completed contracts and retrain the PFI model.
    Run this from admin panel after you have 20+ completed projects.
    """
    training_data = build_training_data_from_db()
    if len(training_data) < 5:
        return {
            "status": "insufficient_data",
            "message": f"Only {len(training_data)} completed contracts. Need 20+ to train. Using formula fallback.",
            "samples": len(training_data)
        }
    result = train_pfi_model(training_data)
    return result


# ── PFI feature importance ────────────────────────────
@router.get("/pfi/feature-importance")
def pfi_importance(user=Depends(require_admin)):
    """See which factors matter most in the trained PFI model."""
    return get_feature_importance()


# ── Freelancer PFI trend ──────────────────────────────
@router.get("/pfi/trend/{freelancer_id}")
def freelancer_trend(freelancer_id: str, user=Depends(require_admin)):
    """Analyze a freelancer's PFI trajectory over time."""
    history = list(pfi_col.find(
        {"freelancer_id": freelancer_id}
    ).sort("timestamp", 1))
    for h in history:
        h["_id"] = str(h["_id"])
        h["timestamp"] = str(h["timestamp"])
    trend = compute_freelancer_trend(history)
    return {"trend": trend, "history": history}


# ── Full admin analytics ──────────────────────────────
@router.get("/analytics")
def full_analytics(user=Depends(require_admin)):
    """
    Full platform analytics: revenue, domain demand, AQA stats,
    deadline adherence. Powered by pandas + numpy.
    """
    contracts = list(contracts_col.find({}))
    milestones = list(milestones_col.find({}))
    tenders = list(tenders_col.find({}))
    pfi_history = list(pfi_col.find({}))

    # Serialize ObjectIds
    for c in contracts:
        c["_id"] = str(c["_id"])
    for m in milestones:
        m["_id"] = str(m["_id"])
    for t in tenders:
        t["_id"] = str(t["_id"])

    analytics = get_full_admin_analytics(contracts, milestones, tenders, pfi_history)
    return analytics


# ── Predict PFI for a freelancer manually ────────────
@router.get("/pfi/predict/{freelancer_id}")
def predict_freelancer_pfi(freelancer_id: str, user=Depends(require_admin)):
    """
    Run ML prediction on a freelancer's current stats.
    Useful for debugging or pre-project estimation.
    """
    from services.pfi_service import calculate_pfi
    from services.pfi_ml_service import predict_pfi, build_training_data_from_db
    from database.connection import contracts_col, milestones_col

    contracts = list(contracts_col.find({"freelancer_id": freelancer_id}))
    milestones = list(milestones_col.find({
        "contract_id": {"$in": [str(c["_id"]) for c in contracts]}
    }))

    total = len(milestones)
    if total == 0:
        return {"predicted_pfi": 70.0, "method": "default_new_user"}

    approved = sum(1 for m in milestones if m.get("status") == "approved")
    on_time = sum(1 for m in milestones if m.get("submitted_on_time"))
    first_pass = sum(1 for m in milestones if m.get("aqa_result", {}).get("verdict") == "pass")
    not_flagged = sum(1 for m in milestones if not m.get("employer_flagged"))

    history = {
        "milestone_accuracy": first_pass / max(total, 1),
        "deadline_adherence": on_time / max(total, 1),
        "aqa_pass_rate": approved / max(total, 1),
        "employer_satisfaction": not_flagged / max(total, 1),
        "total_projects": len(contracts),
        "avg_correction_rounds": 1.0,
        "buffer_days_used_rate": 0.0,
        "abandonment_rate": 0.0,
    }

    predicted = predict_pfi(history)
    formula = calculate_pfi(freelancer_id)

    return {
        "ml_predicted_pfi": predicted,
        "formula_pfi": formula,
        "features_used": history,
        "method": "ml_model" if predicted != formula else "formula_fallback"
    }
