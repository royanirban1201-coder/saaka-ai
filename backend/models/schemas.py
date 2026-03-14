from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# ── Auth ──────────────────────────────────────────────
class SignupStep1(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: str
    role: str  # "employer" | "freelancer"

class FreelancerProfile(BaseModel):
    domains: List[str]
    sub_skills: List[str]
    years_experience: int
    hourly_rate: float
    portfolio_links: List[str]
    linkedin: Optional[str] = ""
    bio: str
    languages: List[str]
    availability: str  # "full-time" | "part-time"
    min_budget: float
    max_budget: float

class BankDetails(BaseModel):
    account_holder: str
    bank_name: str
    account_number: str
    ifsc: str
    account_type: str
    upi_id: Optional[str] = ""
    pan: str
    gst: Optional[str] = ""

class EmployerProfile(BaseModel):
    company_name: str
    industry_type: str
    gst_number: Optional[str] = ""
    billing_address: str
    payment_method: str
    website: Optional[str] = ""
    team_size: Optional[str] = ""

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleLoginRequest(BaseModel):
    token: str
    role: Optional[str] = "freelancer"

class OnboardingInterests(BaseModel):
    domains_of_interest: List[str]
    discovery_source: str

# ── Hiring ────────────────────────────────────────────
class HireRequest(BaseModel):
    project_description: str
    required_domains: List[str]
    min_pfi: Optional[float] = 0
    min_projects: Optional[int] = 0
    budget: float
    deadline: str
    buffer_days: int
    hire_mode: str  # "direct" | "tender"

class TenderCreate(BaseModel):
    title: str
    description: str
    required_domains: List[str]
    min_pfi: float
    budget_min: float
    budget_max: float
    deadline: str
    buffer_days: int

class SendOfferRequest(BaseModel):
    freelancer_ids: List[str]
    project_description: str
    budget: float
    deadline: str
    buffer_days: int
    required_domains: List[str]

# ── Negotiation ───────────────────────────────────────
class NegotiationMessage(BaseModel):
    contract_id: str
    message: str
    proposed_price: Optional[float] = None

# ── Contract ──────────────────────────────────────────
class ContractCreate(BaseModel):
    employer_id: str
    freelancer_id: str
    project_description: str
    total_amount: float
    deadline: str
    buffer_days: int
    agreed_price: float

# ── Milestone ─────────────────────────────────────────
class MilestoneSubmit(BaseModel):
    milestone_id: str
    submission_url: str
    notes: Optional[str] = ""

class MilestoneReview(BaseModel):
    milestone_id: str
    approved: bool
    feedback: Optional[str] = ""

# ── Wallet ────────────────────────────────────────────
class WalletTopup(BaseModel):
    amount: float
    payment_id: str

class TransferRequest(BaseModel):
    contract_id: str

# ── Settings ──────────────────────────────────────────
class ChangePassword(BaseModel):
    old_password: str
    new_password: str

class UpdateAvailability(BaseModel):
    available: bool

class PinSetup(BaseModel):
    pin: str

# ── Admin ─────────────────────────────────────────────
class PFIOverride(BaseModel):
    freelancer_id: str
    new_score: float
    reason: str

class DisputeVerdict(BaseModel):
    dispute_id: str
    verdict: str
    winner: str  # "employer" | "freelancer"
    notes: str
