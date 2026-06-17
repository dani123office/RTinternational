import os
import smtplib
import random
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SENDER_EMAIL = os.environ.get("SMTP_EMAIL", "")
SENDER_PASSWORD = os.environ.get("SMTP_PASSWORD", "")


def generate_otp(length: int = 6) -> str:
    return str(random.randint(10 ** (length - 1), 10**length - 1))


def send_otp_email(to_email: str, otp: str) -> bool:
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print("[EMAIL] SMTP credentials not configured — OTP", otp, "for", to_email)
        return False

    msg = MIMEMultipart()
    msg["From"] = SENDER_EMAIL
    msg["To"] = to_email
    msg["Subject"] = "Your OTP Code - RT International"

    body = f"""
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Email Verification</h2>
  <p>Your OTP code is:</p>
  <h1 style="letter-spacing: 8px; font-size: 32px; color: #4f46e5;">{otp}</h1>
  <p>This code expires in <strong>5 minutes</strong>.</p>
  <hr>
  <p style="color: #64748b; font-size: 12px;">RT International Call Centre CRM</p>
</body>
</html>
"""
    msg.attach(MIMEText(body, "html"))

    ctx = ssl.create_default_context()
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls(context=ctx)
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        print("[EMAIL] OTP sent to", to_email)
        return True
    except Exception as e:
        print("[EMAIL] Failed to send OTP to", to_email, ":", e)
        print("[EMAIL] Fallback — OTP for", to_email, "is:", otp)
        return False
