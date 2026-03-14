from fastapi import APIRouter, HTTPException, Depends
from database.connection import users_col
from models.schemas import *
from utils.auth import hash_password, verify_password, create_token, get_current_user
from utils.encryption import encrypt_bank_details
from services.email_service import email_password_reset
from bson import ObjectId
from datetime import datetime
import requests, os, random, string

router = APIRouter(tags=["Auth"])

def user_out(user: dict) -> dict:
    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
    user.pop("bank_details", None)
    user.pop("reset_otp", None)
    user.pop("pin_hash", None)
    return user

# ── Step 1: Basic signup ──────────────────────────────
@router.post("/signup/step1")
def signup_step1(data: SignupStep1):
    if users_col.find_one({"email": data.email}):
        raise HTTPException(400, "Email already registered")

    user = {
        "full_name": data.full_name,
        "email": data.email,
        "phone": data.phone,
        "role": data.role,
        "password_hash": hash_password(data.password),
        "profile_complete": False,
        "bank_details": None,
        "kyc_verified": False,
        "pfi_score": 70.0 if data.role == "freelancer" else None,
        "available": True,
        "wallet_balance": 0.0,
        "interests": [],
        "created_at": datetime.utcnow(),
        "profile_photo": "",
        "totp_secret": None,
        "totp_enabled": False,
    }
    result = users_col.insert_one(user)
    token = create_token(str(result.inserted_id), data.role)
    user["_id"] = str(result.inserted_id)
    return {"token": token, "user": user_out(user)}

# ── Step 2: Freelancer profile ───────────────────────
@router.post("/signup/freelancer-profile")
def signup_freelancer_profile(data: FreelancerProfile, user=Depends(get_current_user)):
    users_col.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {
            "domains": data.domains,
            "sub_skills": data.sub_skills,
            "years_experience": data.years_experience,
            "hourly_rate": data.hourly_rate,
            "portfolio_links": data.portfolio_links,
            "linkedin": data.linkedin,
            "bio": data.bio,
            "languages": data.languages,
            "availability": data.availability,
            "min_budget": data.min_budget,
            "max_budget": data.max_budget,
            "profile_complete": True,
        }}
    )
    return {"message": "Profile updated"}

# ── Step 3: Bank details (encrypted) ─────────────────
@router.post("/signup/bank-details")
def signup_bank_details(data: BankDetails, user=Depends(get_current_user)):
    encrypted = encrypt_bank_details(data.dict())
    users_col.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"bank_details": encrypted, "kyc_verified": False}}
    )
    return {"message": "Bank details saved securely"}

# ── Step 2: Employer profile ─────────────────────────
@router.post("/signup/employer-profile")
def signup_employer_profile(data: EmployerProfile, user=Depends(get_current_user)):
    users_col.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {
            "company_name": data.company_name,
            "industry_type": data.industry_type,
            "gst_number": data.gst_number,
            "billing_address": data.billing_address,
            "payment_method": data.payment_method,
            "website": data.website,
            "team_size": data.team_size,
            "profile_complete": True,
        }}
    )
    return {"message": "Employer profile updated"}

# ── Onboarding interests ──────────────────────────────
@router.post("/signup/interests")
def signup_interests(data: OnboardingInterests, user=Depends(get_current_user)):
    users_col.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"interests": data.domains_of_interest, "discovery_source": data.discovery_source}}
    )
    return {"message": "Interests saved"}

# ── Login ─────────────────────────────────────────────
@router.post("/login")
def login(data: LoginRequest):
    user = users_col.find_one({"email": data.email})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(str(user["_id"]), user["role"])
    return {"token": token, "user": user_out(user)}

# ── Google OAuth ──────────────────────────────────────
@router.post("/google-login")
def google_login(data: GoogleLoginRequest):
    r = requests.get(f"https://www.googleapis.com/oauth2/v3/tokeninfo?id_token={data.token}")
    if r.status_code != 200:
        raise HTTPException(401, "Invalid Google token")
    info = r.json()
    email = info.get("email")
    existing = users_col.find_one({"email": email})
    if existing:
        token = create_token(str(existing["_id"]), existing["role"])
        return {"token": token, "user": user_out(existing), "new_user": False}
    user = {
        "full_name": info.get("name", ""),
        "email": email,
        "phone": "",
        "role": data.role,
        "password_hash": "",
        "google_id": info.get("sub"),
        "profile_complete": False,
        "bank_details": None,
        "kyc_verified": False,
        "pfi_score": 70.0 if data.role == "freelancer" else None,
        "available": True,
        "wallet_balance": 0.0,
        "profile_photo": info.get("picture", ""),
        "created_at": datetime.utcnow(),
    }
    result = users_col.insert_one(user)
    token = create_token(str(result.inserted_id), data.role)
    user["_id"] = str(result.inserted_id)
    return {"token": token, "user": user_out(user), "new_user": True}

# ── Get current user ──────────────────────────────────
@router.get("/me")
def get_me(user=Depends(get_current_user)):
    return user_out(user)

# ── Change password ───────────────────────────────────
@router.post("/change-password")
def change_password(data: ChangePassword, user=Depends(get_current_user)):
    db_user = users_col.find_one({"_id": ObjectId(user["_id"])})
    if not verify_password(data.old_password, db_user.get("password_hash", "")):
        raise HTTPException(400, "Old password incorrect")
    users_col.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    return {"message": "Password changed"}

# ── Forgot password ───────────────────────────────────
@router.post("/forgot-password")
def forgot_password(email: str):
    user = users_col.find_one({"email": email})
    if not user:
        return {"message": "If that email exists, an OTP has been sent"}
    otp = "".join(random.choices(string.digits, k=6))
    users_col.update_one({"email": email}, {"$set": {"reset_otp": otp, "reset_otp_at": datetime.utcnow()}})
    email_password_reset(email, otp)
    return {"message": "OTP sent to your email"}

@router.post("/reset-password")
def reset_password(email: str, otp: str, new_password: str):
    from datetime import timedelta
    user = users_col.find_one({"email": email, "reset_otp": otp})
    if not user:
        raise HTTPException(400, "Invalid OTP")
    if (datetime.utcnow() - user["reset_otp_at"]).seconds > 900:
        raise HTTPException(400, "OTP expired")
    users_col.update_one(
        {"email": email},
        {"$set": {"password_hash": hash_password(new_password)}, "$unset": {"reset_otp": "", "reset_otp_at": ""}}
    )
    return {"message": "Password reset successful"}
