from fastapi import APIRouter, Depends, HTTPException
from database.connection import messages_col, contracts_col, disputes_col, users_col, wallets_col
from utils.auth import get_current_user, require_employer, require_admin
from utils.llm_client import check_negotiation
from services.escrow_service import get_wallet_summary, initiate_bank_transfer, refund_wallet
from services.pfi_service import apply_pfi_penalty, update_pfi
from models.schemas import NegotiationMessage, WalletTopup, TransferRequest, PFIOverride, DisputeVerdict
from bson import ObjectId
from datetime import datetime
import os

# Razorpay is optional — app runs without it in dev mode
try:
    import razorpay
    RAZORPAY_AVAILABLE = True
except ImportError:
    RAZORPAY_AVAILABLE = False

# ── Negotiation Router ────────────────────────────────
neg_router = APIRouter(tags=["Negotiation"])

@neg_router.post("/message")
def send_negotiation_message(data: NegotiationMessage, user=Depends(get_current_user)):
    contract = contracts_col.find_one({"_id": ObjectId(data.contract_id)})
    if not contract:
        raise HTTPException(404, "Contract not found")
    if user["_id"] not in [contract["employer_id"], contract["freelancer_id"]]:
        raise HTTPException(403, "Not part of this contract")

    msg = {
        "contract_id": data.contract_id,
        "type": "negotiation",
        "sender_id": user["_id"],
        "sender_role": user["role"],
        "content": data.message,
        "proposed_price": data.proposed_price,
        "timestamp": datetime.utcnow()
    }
    messages_col.insert_one(msg)

    round_count = messages_col.count_documents({"contract_id": data.contract_id, "type": "negotiation"})

    if round_count >= 5:
        chat_log = list(messages_col.find({"contract_id": data.contract_id, "type": "negotiation"}).sort("timestamp", 1))
        log = [{"sender": m["sender_role"], "message": m["content"], "price": m.get("proposed_price")} for m in chat_log]
        outcome = check_negotiation(log, round_count)

        if outcome.get("outcome") == "deal":
            contracts_col.update_one(
                {"_id": ObjectId(data.contract_id)},
                {"$set": {"agreed_price": outcome.get("agreed_price"), "negotiation_done": True}}
            )
            return {"message": "sent", "outcome": "deal", "agreed_price": outcome.get("agreed_price")}

        if outcome.get("outcome") == "deadlock":
            disputes_col.insert_one({
                "contract_id": data.contract_id,
                "type": "negotiation_deadlock",
                "chat_log": log,
                "status": "open",
                "created_at": datetime.utcnow()
            })
            contracts_col.update_one({"_id": ObjectId(data.contract_id)}, {"$set": {"status": "disputed"}})
            return {"message": "sent", "outcome": "deadlock", "escalated": True}

    return {"message": "sent", "outcome": "ongoing", "round": round_count}

@neg_router.get("/messages/{contract_id}")
def get_messages(contract_id: str, user=Depends(get_current_user)):
    msgs = list(messages_col.find({"contract_id": contract_id, "type": "negotiation"}).sort("timestamp", 1))
    for m in msgs:
        m["_id"] = str(m["_id"])
        m["timestamp"] = str(m["timestamp"])
    return {"messages": msgs}

# ── Wallet Router ─────────────────────────────────────
wallet_router = APIRouter(tags=["Wallet"])

@wallet_router.get("/summary")
def wallet_summary(user=Depends(get_current_user)):
    if user["role"] == "freelancer":
        return get_wallet_summary(user["_id"])
    return {"balance": user.get("wallet_balance", 0.0)}

@wallet_router.post("/topup")
def topup_wallet(data: WalletTopup, user=Depends(require_employer)):
    # Verify Razorpay payment if available
    if RAZORPAY_AVAILABLE:
        key_id = os.getenv("RAZORPAY_KEY_ID", "")
        key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
        if key_id and key_secret and data.payment_id and not data.payment_id.startswith("test_"):
            try:
                rz = razorpay.Client(auth=(key_id, key_secret))
                payment = rz.payment.fetch(data.payment_id)
                if payment.get("status") != "captured":
                    raise HTTPException(400, "Payment not captured by Razorpay")
            except Exception as e:
                print(f"[Razorpay] Verification warning: {e}")

    users_col.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$inc": {"wallet_balance": data.amount}}
    )
    updated = users_col.find_one({"_id": ObjectId(user["_id"])})
    return {
        "message": f"₹{data.amount} added to wallet",
        "new_balance": updated.get("wallet_balance", 0)
    }

@wallet_router.post("/transfer")
def transfer_to_bank(data: TransferRequest, user=Depends(get_current_user)):
    result = initiate_bank_transfer(user["_id"], data.contract_id)
    if not result["success"]:
        raise HTTPException(400, result["message"])
    return result

@wallet_router.get("/razorpay-key")
def get_razorpay_key():
    """Return public Razorpay key for frontend to use in checkout."""
    return {"key_id": os.getenv("RAZORPAY_KEY_ID", "")}

# ── Admin Router ──────────────────────────────────────
admin_router = APIRouter(tags=["Admin"])

@admin_router.get("/dashboard")
def admin_dashboard(user=Depends(require_admin)):
    total_users = users_col.count_documents({})
    total_employers = users_col.count_documents({"role": "employer"})
    total_freelancers = users_col.count_documents({"role": "freelancer"})
    active_contracts = contracts_col.count_documents({"status": "active"})
    completed_contracts = contracts_col.count_documents({"status": "completed"})
    open_disputes = disputes_col.count_documents({"status": "open"})
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$locked_balance"}}}]
    escrow_result = list(wallets_col.aggregate(pipeline))
    escrow_held = escrow_result[0]["total"] if escrow_result else 0
    return {
        "total_users": total_users,
        "employers": total_employers,
        "freelancers": total_freelancers,
        "active_contracts": active_contracts,
        "completed_contracts": completed_contracts,
        "open_disputes": open_disputes,
        "escrow_held": escrow_held
    }

@admin_router.get("/users")
def list_users(role: str = None, skip: int = 0, limit: int = 50, user=Depends(require_admin)):
    query = {}
    if role:
        query["role"] = role
    users = list(users_col.find(query, {"password_hash": 0, "bank_details": 0}).skip(skip).limit(limit))
    for u in users:
        u["_id"] = str(u["_id"])
    return {"users": users}

@admin_router.post("/ban/{user_id}")
def ban_user(user_id: str, reason: str, user=Depends(require_admin)):
    users_col.update_one({"_id": ObjectId(user_id)}, {"$set": {"banned": True, "ban_reason": reason}})
    return {"message": "User banned"}

@admin_router.post("/kyc/approve/{user_id}")
def approve_kyc(user_id: str, user=Depends(require_admin)):
    users_col.update_one({"_id": ObjectId(user_id)}, {"$set": {"kyc_verified": True}})
    return {"message": "KYC approved"}

@admin_router.post("/pfi/override")
def override_pfi(data: PFIOverride, user=Depends(require_admin)):
    from database.connection import pfi_col
    old_user = users_col.find_one({"_id": ObjectId(data.freelancer_id)})
    old_score = old_user.get("pfi_score", 70.0) if old_user else 70.0
    users_col.update_one({"_id": ObjectId(data.freelancer_id)}, {"$set": {"pfi_score": data.new_score}})
    pfi_col.insert_one({
        "freelancer_id": data.freelancer_id,
        "contract_id": None,
        "old_score": old_score,
        "new_score": data.new_score,
        "explanation": f"Admin override: {data.reason}",
        "admin_id": user["_id"],
        "timestamp": datetime.utcnow()
    })
    return {"message": "PFI updated", "old": old_score, "new": data.new_score}

@admin_router.get("/disputes")
def list_disputes(user=Depends(require_admin)):
    disputes = list(disputes_col.find({"status": "open"}))
    for d in disputes:
        d["_id"] = str(d["_id"])
        if "created_at" in d:
            d["created_at"] = str(d["created_at"])
    return {"disputes": disputes}

@admin_router.post("/disputes/resolve")
def resolve_dispute(data: DisputeVerdict, user=Depends(require_admin)):
    dispute = disputes_col.find_one({"_id": ObjectId(data.dispute_id)})
    if not dispute:
        raise HTTPException(404, "Dispute not found")
    disputes_col.update_one(
        {"_id": ObjectId(data.dispute_id)},
        {"$set": {
            "status": "resolved",
            "verdict": data.verdict,
            "winner": data.winner,
            "notes": data.notes,
            "resolved_by": user["_id"],
            "resolved_at": datetime.utcnow()
        }}
    )
    if data.winner == "employer":
        refund_wallet(dispute["contract_id"])
    contracts_col.update_one({"_id": ObjectId(dispute["contract_id"])}, {"$set": {"status": "resolved"}})
    return {"message": "Dispute resolved"}

@admin_router.post("/contracts/{contract_id}/refund")
def manual_refund(contract_id: str, user=Depends(require_admin)):
    amount = refund_wallet(contract_id)
    return {"message": f"Refunded ₹{amount} to employer"}
