from database.connection import wallets_col, contracts_col, transactions_col
from bson import ObjectId
from datetime import datetime
import os

PLATFORM_FEE = float(os.getenv("PLATFORM_FEE_PERCENT", 10)) / 100
TAX = float(os.getenv("TAX_PERCENT", 18)) / 100

def calculate_amounts(agreed_price: float):
    platform_fee = round(agreed_price * PLATFORM_FEE, 2)
    tax = round(agreed_price * TAX, 2)
    freelancer_receives = round(agreed_price - platform_fee - tax, 2)
    employer_pays = round(agreed_price + platform_fee + tax, 2)
    return {
        "agreed_price": agreed_price,
        "platform_fee": platform_fee,
        "tax": tax,
        "freelancer_receives": freelancer_receives,
        "employer_pays": employer_pays,
    }

def create_wallet_instance(freelancer_id: str, contract_id: str, total_freelancer_amount: float):
    """Create a locked wallet instance for this contract."""
    wallet = {
        "freelancer_id": freelancer_id,
        "contract_id": contract_id,
        "total_amount": total_freelancer_amount,
        "locked_balance": 0.0,
        "status": "locked",  # locked | partially_unlocked | unlocked | refunded
        "transactions": [],
        "created_at": datetime.utcnow()
    }
    result = wallets_col.insert_one(wallet)
    return str(result.inserted_id)

def release_milestone_payout(contract_id: str, milestone_index: int, payout_percent: float):
    """Add milestone payout to locked wallet balance."""
    wallet = wallets_col.find_one({"contract_id": contract_id})
    if not wallet:
        return False

    payout_amount = round(wallet["total_amount"] * payout_percent / 100, 2)
    new_balance = round(wallet["locked_balance"] + payout_amount, 2)

    wallets_col.update_one(
        {"contract_id": contract_id},
        {
            "$set": {"locked_balance": new_balance, "status": "partially_unlocked"},
            "$push": {"transactions": {
                "type": "credit",
                "amount": payout_amount,
                "reason": f"Milestone {milestone_index + 1} payout",
                "timestamp": datetime.utcnow()
            }}
        }
    )
    return payout_amount

def unlock_wallet(contract_id: str):
    """Flip wallet status to unlocked on final project completion."""
    wallets_col.update_one(
        {"contract_id": contract_id},
        {"$set": {"status": "unlocked"}}
    )

def refund_wallet(contract_id: str):
    """Refund full wallet balance to employer (missed deadline + buffer)."""
    wallet = wallets_col.find_one({"contract_id": contract_id})
    if not wallet:
        return 0

    amount = wallet.get("locked_balance", 0)
    wallets_col.update_one(
        {"contract_id": contract_id},
        {
            "$set": {"locked_balance": 0, "status": "refunded"},
            "$push": {"transactions": {
                "type": "refund",
                "amount": amount,
                "reason": "Deadline + buffer missed. Full refund to employer.",
                "timestamp": datetime.utcnow()
            }}
        }
    )

    # Return amount to employer wallet
    contract = contracts_col.find_one({"_id": ObjectId(contract_id)})
    if contract:
        from database.connection import users_col
        users_col.update_one(
            {"_id": ObjectId(contract["employer_id"])},
            {"$inc": {"wallet_balance": amount}}
        )
    return amount

def get_wallet_summary(freelancer_id: str):
    """Get all wallet instances for a freelancer."""
    wallets = list(wallets_col.find({"freelancer_id": freelancer_id}))
    total_unlocked = sum(w["locked_balance"] for w in wallets if w["status"] == "unlocked")
    total_locked = sum(w["locked_balance"] for w in wallets if w["status"] in ["locked", "partially_unlocked"])

    for w in wallets:
        w["_id"] = str(w["_id"])

    return {
        "wallets": wallets,
        "total_unlocked": total_unlocked,
        "total_locked": total_locked,
        "total_balance": total_unlocked + total_locked
    }

def initiate_bank_transfer(freelancer_id: str, contract_id: str):
    """Mark wallet as transferred after Razorpay payout (stub — wire to Razorpay in production)."""
    wallet = wallets_col.find_one({"contract_id": contract_id, "freelancer_id": freelancer_id})
    if not wallet or wallet["status"] != "unlocked":
        return {"success": False, "message": "Wallet not unlocked or not found"}

    amount = wallet["locked_balance"]
    wallets_col.update_one(
        {"contract_id": contract_id},
        {
            "$set": {"locked_balance": 0, "status": "transferred"},
            "$push": {"transactions": {
                "type": "debit",
                "amount": amount,
                "reason": "Bank transfer initiated",
                "timestamp": datetime.utcnow()
            }}
        }
    )
    contracts_col.update_one({"_id": ObjectId(contract_id)}, {"$set": {"status": "completed"}})
    return {"success": True, "amount": amount, "message": f"₹{amount} transfer initiated"}
