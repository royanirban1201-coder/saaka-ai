"""
Analytics Service — pandas + numpy for platform-level analytics.

Provides:
- Freelancer performance trends over time
- Platform revenue analytics
- Domain demand heatmap
- Deadline miss rate analysis
- AQA pass rate trends
- Admin dashboard statistics
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional


def compute_freelancer_trend(pfi_history: list) -> dict:
    """
    Analyze a freelancer's PFI trend over time.
    Returns: trending up / down / stable + velocity.
    """
    if len(pfi_history) < 2:
        return {"trend": "new", "message": "Not enough history yet"}

    df = pd.DataFrame(pfi_history)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp")

    scores = df["new_score"].values
    # Simple linear regression slope
    x = np.arange(len(scores))
    slope = np.polyfit(x, scores, 1)[0]

    if slope > 1.0:
        trend = "rising"
        msg = f"Score improving by ~{slope:.1f} points per project"
    elif slope < -1.0:
        trend = "falling"
        msg = f"Score declining by ~{abs(slope):.1f} points per project"
    else:
        trend = "stable"
        msg = "Score is stable"

    return {
        "trend": trend,
        "slope": round(slope, 2),
        "message": msg,
        "first_score": round(float(scores[0]), 1),
        "latest_score": round(float(scores[-1]), 1),
        "change": round(float(scores[-1] - scores[0]), 1),
    }


def compute_platform_revenue(contracts: list) -> dict:
    """
    Compute platform revenue breakdown from contract data.
    Used in admin dashboard.
    """
    if not contracts:
        return {"total_revenue": 0, "by_month": {}}

    df = pd.DataFrame(contracts)

    # Ensure numeric
    df["platform_fee"] = pd.to_numeric(df.get("platform_fee", pd.Series([0]*len(df))), errors="coerce").fillna(0)
    df["tax"] = pd.to_numeric(df.get("tax", pd.Series([0]*len(df))), errors="coerce").fillna(0)
    df["agreed_price"] = pd.to_numeric(df.get("agreed_price", pd.Series([0]*len(df))), errors="coerce").fillna(0)

    total_revenue = float(df["platform_fee"].sum())
    total_tax = float(df["tax"].sum())
    total_contract_value = float(df["agreed_price"].sum())

    # Monthly breakdown
    if "created_at" in df.columns:
        df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")
        df["month"] = df["created_at"].dt.strftime("%Y-%m")
        monthly = df.groupby("month")["platform_fee"].sum().to_dict()
    else:
        monthly = {}

    return {
        "total_platform_fee": round(total_revenue, 2),
        "total_tax_collected": round(total_tax, 2),
        "total_contract_value": round(total_contract_value, 2),
        "by_month": {k: round(v, 2) for k, v in monthly.items()},
        "avg_contract_value": round(total_contract_value / max(len(df), 1), 2),
    }


def compute_domain_demand(contracts: list, tenders: list) -> dict:
    """
    Analyze which domains are most in demand from contracts + tenders.
    Returns a ranked list for admin insights.
    """
    domain_counts = {}

    for contract in contracts:
        desc = contract.get("project_description", "")
        # Simple keyword approach — could be enhanced with embedding clustering
        for domain in contract.get("required_domains", []):
            domain_counts[domain] = domain_counts.get(domain, 0) + 1

    for tender in tenders:
        for domain in tender.get("required_domains", []):
            domain_counts[domain] = domain_counts.get(domain, 0) + 1

    if not domain_counts:
        return {"domains": []}

    df = pd.DataFrame(list(domain_counts.items()), columns=["domain", "count"])
    df = df.sort_values("count", ascending=False)
    total = df["count"].sum()
    df["percentage"] = (df["count"] / total * 100).round(1)

    return {
        "domains": df.head(15).to_dict("records"),
        "total_demand_signals": int(total),
    }


def compute_aqa_stats(milestones: list) -> dict:
    """
    Compute AQA performance statistics across all milestones.
    """
    if not milestones:
        return {}

    df = pd.DataFrame(milestones)

    total = len(df)
    has_result = df[df["aqa_result"].notna()] if "aqa_result" in df.columns else pd.DataFrame()

    if len(has_result) == 0:
        return {"total_milestones": total, "aqa_evaluated": 0}

    verdicts = has_result["aqa_result"].apply(
        lambda x: x.get("verdict", "unknown") if isinstance(x, dict) else "unknown"
    )
    verdict_counts = verdicts.value_counts().to_dict()
    pass_count = verdict_counts.get("pass", 0)
    fail_count = verdict_counts.get("fail", 0)
    partial_count = verdict_counts.get("partial", 0)
    evaluated = len(has_result)

    scores = has_result["aqa_result"].apply(
        lambda x: x.get("score", 0) if isinstance(x, dict) else 0
    )

    return {
        "total_milestones": total,
        "aqa_evaluated": evaluated,
        "pass_count": pass_count,
        "fail_count": fail_count,
        "partial_count": partial_count,
        "pass_rate": round(pass_count / max(evaluated, 1) * 100, 1),
        "avg_aqa_score": round(float(scores.mean()), 1),
        "verdict_breakdown": verdict_counts,
    }


def compute_deadline_stats(contracts: list, milestones: list) -> dict:
    """
    Analyze deadline adherence across the platform.
    """
    if not milestones:
        return {}

    df = pd.DataFrame(milestones)

    if "submitted_on_time" not in df.columns:
        return {}

    submitted = df[df["status"].isin(["approved", "aqa_passed"])]
    if len(submitted) == 0:
        return {}

    on_time = submitted["submitted_on_time"].sum()
    total_submitted = len(submitted)
    on_time_rate = round(float(on_time) / max(total_submitted, 1) * 100, 1)

    buffer_used = sum(1 for c in contracts if c.get("buffer_revealed", False))
    refunded = sum(1 for c in contracts if c.get("status") == "refunded")

    return {
        "on_time_rate": on_time_rate,
        "late_rate": round(100 - on_time_rate, 1),
        "total_submitted_milestones": total_submitted,
        "contracts_used_buffer": buffer_used,
        "contracts_refunded": refunded,
    }


def get_full_admin_analytics(contracts: list, milestones: list, tenders: list, pfi_history: list) -> dict:
    """
    Master analytics function — combines all metrics for the admin dashboard.
    """
    return {
        "revenue": compute_platform_revenue(contracts),
        "domain_demand": compute_domain_demand(contracts, tenders),
        "aqa_stats": compute_aqa_stats(milestones),
        "deadline_stats": compute_deadline_stats(contracts, milestones),
        "generated_at": datetime.utcnow().isoformat(),
    }
