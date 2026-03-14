from database.connection import pfi_col, contracts_col, milestones_col
from bson import ObjectId
from datetime import datetime
from utils.llm_client import explain_pfi_change

WEIGHTS = {
    "milestone_accuracy":     0.25,
    "deadline_adherence":     0.30,
    "aqa_pass_rate":          0.25,
    "employer_satisfaction":  0.20,
}

def calculate_pfi(freelancer_id: str) -> float:
    """Recalculate PFI from full project history."""
    contracts = list(contracts_col.find({
        "freelancer_id": freelancer_id,
        "status": {"$in": ["completed", "refunded"]}
    }))
    if not contracts:
        return 70.0  # Starting score for new freelancers

    total_milestone_accuracy = []
    total_deadline_adherence = []
    total_aqa_pass_rate = []
    total_employer_satisfaction = []

    for contract in contracts:
        cid = str(contract["_id"])
        milestones = list(milestones_col.find({"contract_id": cid}))
        if not milestones:
            continue

        # Milestone accuracy: did first AQA attempt pass?
        first_pass = [m for m in milestones if m.get("aqa_result", {}).get("verdict") == "pass"]
        accuracy = len(first_pass) / len(milestones) if milestones else 0
        total_milestone_accuracy.append(accuracy)

        # Deadline adherence: submitted before deadline?
        on_time = [m for m in milestones if m.get("submitted_on_time", False)]
        adherence = len(on_time) / len(milestones) if milestones else 0
        total_deadline_adherence.append(adherence)

        # AQA pass rate: milestones that eventually passed (even after corrections)
        passed = [m for m in milestones if m.get("status") == "approved"]
        aqa_rate = len(passed) / len(milestones) if milestones else 0
        total_aqa_pass_rate.append(aqa_rate)

        # Employer satisfaction: employer approved without flagging
        no_flags = [m for m in milestones if not m.get("employer_flagged", False)]
        satisfaction = len(no_flags) / len(milestones) if milestones else 0
        total_employer_satisfaction.append(satisfaction)

    def avg(lst):
        return sum(lst) / len(lst) if lst else 0

    raw_score = (
        avg(total_milestone_accuracy)   * WEIGHTS["milestone_accuracy"] +
        avg(total_deadline_adherence)   * WEIGHTS["deadline_adherence"] +
        avg(total_aqa_pass_rate)        * WEIGHTS["aqa_pass_rate"] +
        avg(total_employer_satisfaction) * WEIGHTS["employer_satisfaction"]
    )

    return round(raw_score * 100, 1)

def update_pfi(freelancer_id: str, contract_id: str):
    """Update PFI after project completion and store history."""
    from database.connection import users_col
    user = users_col.find_one({"_id": ObjectId(freelancer_id)})
    old_score = user.get("pfi_score", 70.0)
    new_score = calculate_pfi(freelancer_id)

    contract = contracts_col.find_one({"_id": ObjectId(contract_id)})
    project_summary = {
        "project": contract.get("project_description", "")[:100],
        "status": contract.get("status"),
        "milestones_total": milestones_col.count_documents({"contract_id": contract_id}),
        "milestones_approved": milestones_col.count_documents({"contract_id": contract_id, "status": "approved"}),
    }

    explanation = explain_pfi_change(old_score, new_score, project_summary)

    users_col.update_one(
        {"_id": ObjectId(freelancer_id)},
        {"$set": {"pfi_score": new_score}}
    )

    pfi_col.insert_one({
        "freelancer_id": freelancer_id,
        "contract_id": contract_id,
        "old_score": old_score,
        "new_score": new_score,
        "explanation": explanation,
        "timestamp": datetime.utcnow()
    })

    return {"old": old_score, "new": new_score, "explanation": explanation}

def apply_pfi_penalty(freelancer_id: str, reason: str, penalty: float = 10.0):
    """Apply manual penalty (missed deadline + buffer)."""
    from database.connection import users_col
    user = users_col.find_one({"_id": ObjectId(freelancer_id)})
    old_score = user.get("pfi_score", 70.0)
    new_score = max(0, round(old_score - penalty, 1))

    users_col.update_one(
        {"_id": ObjectId(freelancer_id)},
        {"$set": {"pfi_score": new_score}}
    )
    pfi_col.insert_one({
        "freelancer_id": freelancer_id,
        "contract_id": None,
        "old_score": old_score,
        "new_score": new_score,
        "explanation": f"Penalty applied: {reason}",
        "timestamp": datetime.utcnow()
    })
    return new_score
