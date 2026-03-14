# Sakaa-AI — Autonomous AI Freelance Platform

## Project structure

```
sakaa-ai/
├── backend/
│   ├── main.py                    ← FastAPI entry point
│   ├── requirements.txt
│   ├── .env.example               ← Copy to .env and fill keys
│   ├── database/
│   │   ├── connection.py          ← MongoDB connection + collections
│   │   └── seed_domains.py        ← Seeds 80+ domains on startup
│   ├── models/
│   │   └── schemas.py             ← All Pydantic request/response models
│   ├── routers/
│   │   ├── auth.py                ← Signup, login, Google OAuth, password reset
│   │   ├── employer.py            ← Explore, hire, tender, contracts
│   │   ├── freelancer.py          ← Offers, tenders, milestones, AQA submission
│   │   ├── ai_agent.py            ← All AI routes (chat, milestones, AQA, PFI)
│   │   └── other_routers.py       ← Negotiation, wallet, admin
│   ├── services/
│   │   ├── escrow_service.py      ← Wallet logic, payouts, refunds
│   │   ├── pfi_service.py         ← PFI calculation and history
│   │   └── email_service.py       ← SendGrid email notifications
│   └── utils/
│       ├── auth.py                ← JWT, bcrypt, role guards
│       ├── encryption.py          ← AES-256 bank detail encryption
│       └── llm_client.py          ← Claude API — all 8 AI functions
│
└── frontend/
    ├── src/
    │   ├── main.jsx               ← App entry, Google OAuth provider
    │   ├── App.jsx                ← All routes, protected route wrapper
    │   ├── index.css              ← Tailwind base
    │   ├── services/api.js        ← All API calls, axios instance + JWT
    │   ├── store/authStore.js     ← Zustand auth state
    │   ├── components/Layout.jsx  ← Sidebar navigation
    │   └── pages/
    │       ├── Landing.jsx
    │       ├── Login.jsx
    │       ├── Signup.jsx         ← 4-step signup flow
    │       ├── ForgotPassword.jsx
    │       ├── employer/          ← Dashboard, Explore, Hire, Contracts, Wallet, Tender
    │       ├── freelancer/        ← Dashboard, Offers, Tenders, Contracts, Wallet, PFI
    │       ├── shared/            ← NegotiationRoom, ContractDetail, Settings
    │       └── admin/             ← Dashboard, Users, Disputes
```

---

## Step-by-step setup

### 1. Clone / download and open in VS Code

### 2. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate          # Windows
source venv/bin/activate        # Mac / Linux

# Install all packages
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
# Now open .env in VS Code and fill in your keys (see below)
```

### 3. Fill in your .env keys

Open `backend/.env` and fill:

| Key | Where to get it |
|-----|----------------|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `MONGODB_URI` | mongodb.com/atlas → Connect → Drivers |
| `GOOGLE_CLIENT_ID` | console.cloud.google.com → Credentials |
| `GOOGLE_CLIENT_SECRET` | Same Google console page |
| `JWT_SECRET` | Type any random 40+ character string |
| `ENCRYPTION_KEY` | Run `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `SENDGRID_API_KEY` | app.sendgrid.com → Settings → API Keys |
| `RAZORPAY_KEY_ID` | dashboard.razorpay.com → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Same Razorpay page |

### 4. Start the backend

```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

Visit http://localhost:8000/docs to see all API endpoints with live testing.

### 5. Frontend setup

```bash
cd frontend

# Install packages (only needed once)
npm install

# Create frontend .env
cp .env.example .env
# Fill VITE_GOOGLE_CLIENT_ID with your Google Client ID
```

### 6. Start the frontend

```bash
cd frontend
npm run dev
```

Visit http://localhost:5173

---

## API endpoints summary

| Route | Description |
|-------|-------------|
| `POST /auth/signup/step1` | Create account |
| `POST /auth/login` | Email + password login |
| `POST /auth/google-login` | Google OAuth login |
| `GET /auth/me` | Get current user |
| `GET /employer/explore` | Browse freelancers |
| `POST /employer/send-offers` | Direct hire to multiple freelancers |
| `POST /employer/tender` | Float a tender |
| `POST /ai/chat` | AI requirement chat |
| `POST /ai/projects/{id}/generate-milestones` | Claude generates milestone roadmap |
| `POST /ai/work-assignment` | Claude checks freelancer workload |
| `GET /ai/portfolio-summary/{id}` | Claude summarises a freelancer portfolio |
| `POST /freelancer/milestones/submit` | Submit + auto-trigger AQA |
| `POST /freelancer/milestones/review` | Employer approves / flags milestone |
| `POST /negotiation/message` | Send negotiation message (human only) |
| `POST /wallet/topup` | Employer tops up wallet via Razorpay |
| `POST /wallet/transfer` | Freelancer initiates bank transfer |
| `GET /admin/dashboard` | Platform stats |
| `GET /admin/disputes` | Open dispute queue |

---

## AI functions (Claude)

All in `backend/utils/llm_client.py`:

| Function | What it does |
|----------|-------------|
| `requirement_chat()` | Multi-turn chat guiding employer through project scoping |
| `rank_freelancers()` | Ranks freelancer list by project fit |
| `generate_milestones()` | Creates structured roadmap from project description |
| `evaluate_submission()` | AQA — pass/partial/fail with specific corrections |
| `check_negotiation()` | Reads chat log to detect deal or deadlock (never participates) |
| `check_work_assignment()` | Advises freelancer on accepting based on current workload |
| `explain_pfi_change()` | Plain-language explanation of score change |
| `summarize_portfolio()` | 3-bullet AI summary of freelancer for employers |

---

## Money flow

```
Employer pays upfront (project + platform fee + tax)
    ↓
Platform escrow account (your MongoDB / company account)
    ↓  per milestone completion + AQA pass + employer approval
Freelancer wallet (locked, per-contract instance)
    ↓  on full project completion
Wallet unlocked → freelancer initiates transfer
    ↓
Freelancer bank account via Razorpay Payout API

On deadline + buffer miss: full wallet balance → refunded to employer
Platform fee + tax: retained by platform regardless
```
