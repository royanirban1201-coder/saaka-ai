import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

SENDGRID_KEY = os.getenv("SENDGRID_API_KEY", "")
FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "noreply@sakaa.ai")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

def send_email(to: str, subject: str, html: str):
    if not SENDGRID_KEY:
        print(f"[EMAIL SKIPPED - no SendGrid key] To: {to} | Subject: {subject}")
        return
    try:
        sg = SendGridAPIClient(SENDGRID_KEY)
        message = Mail(from_email=FROM_EMAIL, to_emails=to, subject=subject, html_content=html)
        sg.send(message)
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")

def email_new_offer(freelancer_email: str, company: str, domain: str, budget: float, deadline: str):
    send_email(
        to=freelancer_email,
        subject=f"New project offer from {company} — Sakaa-AI",
        html=f"""<h2>New Offer Received</h2>
        <p><strong>{company}</strong> wants to hire you for a <strong>{domain}</strong> project.</p>
        <p>Budget: ₹{budget} | Deadline: {deadline}</p>
        <a href="{FRONTEND_URL}/dashboard/offers" style="background:#7F77DD;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">View Offer</a>"""
    )

def email_aqa_result(to: str, milestone_title: str, verdict: str, feedback: str):
    color = "#639922" if verdict == "pass" else "#E24B4A"
    send_email(
        to=to,
        subject=f"AQA Result: {verdict.upper()} — {milestone_title}",
        html=f"""<h2>Milestone Review: {verdict.upper()}</h2>
        <p style="color:{color}"><strong>{milestone_title}</strong> has been evaluated.</p>
        <p>{feedback}</p>
        <a href="{FRONTEND_URL}/dashboard/contracts" style="background:#7F77DD;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">View Details</a>"""
    )

def email_milestone_paid(freelancer_email: str, amount: float, milestone_title: str):
    send_email(
        to=freelancer_email,
        subject=f"₹{amount} added to your wallet — Sakaa-AI",
        html=f"""<h2>Milestone Payment Released</h2>
        <p>₹<strong>{amount}</strong> has been added to your locked wallet for completing <strong>{milestone_title}</strong>.</p>
        <p>Funds will be available for transfer once the full project is complete.</p>"""
    )

def email_wallet_unlocked(freelancer_email: str, total: float):
    send_email(
        to=freelancer_email,
        subject="Your wallet is unlocked — Transfer funds now",
        html=f"""<h2>Project Complete!</h2>
        <p>Your wallet of ₹<strong>{total}</strong> is now unlocked.</p>
        <p>You can now transfer funds to your bank account.</p>
        <a href="{FRONTEND_URL}/dashboard/wallet" style="background:#1D9E75;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">Transfer Now</a>"""
    )

def email_deadline_warning(freelancer_email: str, project_title: str, hours_left: int):
    send_email(
        to=freelancer_email,
        subject=f"Deadline in {hours_left}h — {project_title}",
        html=f"""<h2>Deadline Approaching</h2>
        <p>Your project <strong>{project_title}</strong> is due in <strong>{hours_left} hours</strong>.</p>
        <p>Submit your work before the deadline to avoid penalties.</p>
        <a href="{FRONTEND_URL}/dashboard/contracts" style="background:#BA7517;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">Submit Now</a>"""
    )

def email_password_reset(to: str, otp: str):
    send_email(
        to=to,
        subject="Reset your Sakaa-AI password",
        html=f"""<h2>Password Reset OTP</h2>
        <p>Your OTP is: <strong style="font-size:24px;letter-spacing:4px">{otp}</strong></p>
        <p>This OTP expires in 15 minutes. Do not share it.</p>"""
    )
