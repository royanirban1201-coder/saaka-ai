"""
Full AQA Pipeline — combines all three layers:

Layer 1: Vision check (OpenCV + YOLO) — for image/screenshot submissions
Layer 2: Embedding similarity — checks submission is relevant to project
Layer 3: Claude evaluation — final semantic quality assessment

Result is the union of all three, with the most specific feedback surfaced.
"""

import re
from services.aqa_vision import full_vision_analysis
from services.embedding_service import embed_text, cosine_similarity
from utils.llm_client import evaluate_submission as claude_evaluate


def run_full_aqa(
    original_prompt: str,
    checklist: list,
    submission_url: str,
    notes: str = "",
    domain: str = "",
) -> dict:
    """
    Run full 3-layer AQA pipeline on a milestone submission.

    Returns the same structure as claude_evaluate() but enriched with
    vision and embedding analysis.
    """

    vision_result = None
    embedding_result = None
    vision_issues = []

    # ── Layer 1: Vision check (images only) ──────────────
    vision_result = full_vision_analysis(submission_url, domain)
    if not vision_result.get("skipped"):
        if not vision_result.get("overall_passed"):
            vision_issues = vision_result.get("issues", [])
            # If vision fails hard (blank/corrupt), short-circuit
            if vision_result.get("score", 100) < 40:
                return {
                    "verdict": "fail",
                    "score": vision_result["score"],
                    "passed_items": [],
                    "failed_items": checklist,
                    "feedback": f"Submission failed visual quality check. {vision_result.get('summary', '')}",
                    "corrections_needed": vision_issues,
                    "vision_analysis": vision_result,
                    "layer": "vision_short_circuit",
                }

    # ── Layer 2: Embedding relevance check ───────────────
    try:
        req_vec = embed_text(original_prompt)
        sub_text = f"{submission_url} {notes} {domain}"
        sub_vec = embed_text(sub_text)
        relevance_score = cosine_similarity(req_vec, sub_vec)
        embedding_result = {
            "relevance_score": round(relevance_score * 100, 1),
            "is_relevant": relevance_score > 0.2,
        }
    except Exception as e:
        embedding_result = {"error": str(e), "is_relevant": True}

    # ── Layer 3: Claude semantic evaluation ──────────────
    # Add vision context to Claude's prompt if available
    enriched_notes = notes
    if vision_result and not vision_result.get("skipped"):
        enriched_notes += f"\n\n[Vision Analysis]: {vision_result.get('summary', '')}"
    if embedding_result:
        enriched_notes += f"\n[Relevance Score]: {embedding_result.get('relevance_score', 'N/A')}/100"

    claude_result = claude_evaluate(original_prompt, checklist, submission_url, enriched_notes)

    # ── Merge results ─────────────────────────────────────
    # If vision found issues, append them to corrections
    if vision_issues:
        existing = claude_result.get("corrections_needed", [])
        claude_result["corrections_needed"] = existing + [f"[Visual] {i}" for i in vision_issues]

    # Downgrade score if vision failed
    if vision_result and not vision_result.get("skipped") and not vision_result.get("overall_passed"):
        vision_penalty = (100 - vision_result.get("score", 100)) * 0.3
        claude_result["score"] = max(0, int(claude_result.get("score", 50) - vision_penalty))

    # Attach analysis metadata
    claude_result["vision_analysis"] = vision_result
    claude_result["embedding_relevance"] = embedding_result

    return claude_result
