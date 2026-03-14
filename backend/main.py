from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()

from database.seed_domains import seed_domains
from routers.auth import router as auth_router
from routers.employer import router as employer_router
from routers.freelancer import router as freelancer_router
from routers.ai_agent import router as ai_router
from routers.other_routers import neg_router, wallet_router, admin_router
from routers.ml_router import router as ml_router

import os

app = FastAPI(
    title="Sakaa-AI",
    description="Autonomous AI Freelance Platform",
    version="1.0.0"
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173"), "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router,       prefix="/auth")
app.include_router(employer_router,   prefix="/employer")
app.include_router(freelancer_router, prefix="/freelancer")
app.include_router(ai_router,         prefix="/ai")
app.include_router(neg_router,        prefix="/negotiation")
app.include_router(wallet_router,     prefix="/wallet")
app.include_router(admin_router,      prefix="/admin")
app.include_router(ml_router,         prefix="/ml")

@app.on_event("startup")
def startup():
    seed_domains()
    print("Sakaa-AI backend started")

@app.get("/")
def root():
    return {"message": "Sakaa-AI API running", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}
