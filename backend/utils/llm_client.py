from groq import Groq
import os, json, re
from dotenv import load_dotenv
load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"

def call_claude(system: str, user: str, max_tokens: int = 1024) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ]
    )
    return response.choices[0].message.content

def parse_json(text: str) -> dict | list:
    cleaned = re.sub(r"```json|```", "", text).strip()
    return json.loads(cleaned)

# ── 1. Requirement gathering ──────────────────────────
REQUIREMENT_SYSTEM = """You are a project scoping assistant on Sakaa-AI, a freelance platform.
Your job is to help employers describe their project clearly.
In each turn:
- Acknowledge what they said
- Suggest 1-2 improvements or additions they might have missed
- Ask one clarifying follow-up question
- When you have enough info (project type, tech stack, budget, deadline, buffer days, min PFI, min projects done), output ONLY valid JSON:
{"complete": true, "project_description": "...", "required_domains": [], "budget": 0, "deadline": "YYYY-MM-DD", "buffer_days": 3, "min_pfi": 60, "min_projects": 2, "suggested_improvements": []}
Until complete, keep asking. Never output JSON unless complete=true."""

def requirement_chat(history: list, new_message: str) -> str:
    messages = [{"role": "system", "content": REQUIREMENT_SYSTEM}]
    messages += history
    messages.append({"role": "user", "content": new_message})
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=1024,
        messages=messages
    )
    return response.choices[0].message.content

# ── 2. Smart search / freelancer ranking ─────────────
def rank_freelancers(project_desc: str, freelancers: list) -> list:
    system = """You are a hiring algorithm. Given a project description and list of freelancers,
rank them by fit. Return ONLY valid JSON array:
[{"freelancer_id": "...", "match_score": 85, "reason": "one line why"}]
Sorted best match first."""
    user = f"Project: {project_desc}\n\nFreelancers: {json.dumps(freelancers)}"
    result = call_claude(system, user, max_tokens=2048)
    try:
        return parse_json(result)
    except Exception:
        return freelancers

# ── 3. Milestone generator ────────────────────────────
def generate_milestones(project_desc: str, deadline: str, budget: float) -> list:
    system = """You are a technical project manager. Generate a structured milestone roadmap.
Return ONLY valid JSON array (3-6 milestones):
[{"title": "...", "description": "...", "deadline": "YYYY-MM-DD", "payout_percent": 20, "checklist": ["item1", "item2"]}]
Payout percents must sum to exactly 100. Each milestone needs a clear deliverable."""
    user = f"Project: {project_desc}\nFinal deadline: {deadline}\nTotal budget: ₹{budget}"
    result = call_claude(system, user, max_tokens=2048)
    try:
        return parse_json(result)
    except Exception:
        return []

# ── 4. AQA evaluator ──────────────────────────────────
def evaluate_submission(original_prompt: str, checklist: list, submission_url: str, notes: str = "") -> dict:
    system = """You are an automated quality assurance reviewer for a freelance platform.
Evaluate the submitted work against the original requirements and checklist.
Return ONLY valid JSON:
{"verdict": "pass"|"partial"|"fail", "score": 0-100, "passed_items": [], "failed_items": [], "feedback": "clear actionable feedback", "corrections_needed": ["specific item to fix"]}"""
    user = f"""Original requirements: {original_prompt}
Milestone checklist: {json.dumps(checklist)}
Submission URL/details: {submission_url}
Freelancer notes: {notes}

Evaluate thoroughly. Be specific about what's missing or wrong."""
    result = call_claude(system, user, max_tokens=1024)
    try:
        return parse_json(result)
    except Exception:
        return {"verdict": "fail", "score": 0, "feedback": "Could not evaluate. Please resubmit.", "corrections_needed": []}

# ── 5. Check negotiation for deal/deadlock ────────────
def check_negotiation(chat_log: list, round_number: int) -> dict:
    system = """You are reading a negotiation chat log between an employer and freelancer on a platform.
Determine if they reached a deal or are deadlocked.
Return ONLY valid JSON:
{"outcome": "deal"|"deadlock"|"ongoing", "agreed_price": null or number, "summary": "one line summary"}
A deal = both explicitly agreed on a price. Deadlock = 5+ rounds with no agreement or hostile tone. Ongoing = still negotiating."""
    user = f"Round {round_number} of negotiation.\nChat log: {json.dumps(chat_log)}"
    result = call_claude(system, user, max_tokens=256)
    try:
        return parse_json(result)
    except Exception:
        return {"outcome": "ongoing", "agreed_price": None, "summary": "Unable to assess"}

# ── 6. Work assignment check ─────────────────────────
def check_work_assignment(new_offer: dict, active_projects: list) -> dict:
    system = """You are a workload advisor for freelancers. Assess if they can safely take a new project.
Rules: max 3 active projects, deadlines must not overlap dangerously.
Return ONLY valid JSON:
{"recommendation": "accept"|"risky"|"reject", "reason": "...", "slot_available": true|false}"""
    user = f"New offer: {json.dumps(new_offer)}\nCurrent active projects: {json.dumps(active_projects)}"
    result = call_claude(system, user, max_tokens=512)
    try:
        return parse_json(result)
    except Exception:
        return {"recommendation": "risky", "reason": "Could not assess", "slot_available": False}

# ── 7. PFI explainer ─────────────────────────────────
def explain_pfi_change(old_score: float, new_score: float, project_summary: dict) -> str:
    system = """You are a career coach explaining a freelancer's reputation score change on a platform.
Be encouraging but honest. 2-3 sentences max. Plain language."""
    user = f"Score changed from {old_score} to {new_score}.\nProject summary: {json.dumps(project_summary)}"
    return call_claude(system, user, max_tokens=256)

# ── 8. Portfolio AI summary (for employers) ──────────
def summarize_portfolio(freelancer: dict) -> str:
    system = """You are an AI hiring assistant. Summarize a freelancer's portfolio for an employer in 3 bullet points.
Be specific: mention strongest skills, best domain, and one standout fact. Keep it under 60 words."""
    user = f"Freelancer profile: {json.dumps(freelancer)}"
    return call_claude(system, user, max_tokens=256)
