import os
import smtplib
import random
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication

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


def send_salary_slip_email(to_email: str, employee_name: str, month_name: str, year: int, pdf_bytes: bytes, filename: str) -> bool:
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print(f"[EMAIL] SMTP credentials not configured — Salary slip for {employee_name} ({to_email})")
        return False

    msg = MIMEMultipart()
    msg["From"] = SENDER_EMAIL
    msg["To"] = to_email
    msg["Subject"] = f"Salary Slip - {month_name} {year} - RT International"

    body = f"""
<html>
<body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; line-height: 1.6;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px;">
    <div style="border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 20px;">
      <h2 style="color: #0f172a; margin: 0; font-size: 20px;">RT International Call Center</h2>
      <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">Official Monthly Salary Slip</p>
    </div>
    <p>Dear <strong>{employee_name}</strong>,</p>
    <p>Please find attached your salary slip for the month of <strong>{month_name} {year}</strong>.</p>
    <p>If you have any inquiries regarding your salary components, please reach out to HR/Administration.</p>
    <div style="margin: 24px 0; padding: 16px; background: #f8fafc; border-radius: 12px; border-left: 4px solid #6366f1;">
      <p style="margin: 0; font-size: 13px; font-weight: 600; color: #334155;">Attachment: {filename}</p>
    </div>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 11px; margin: 0;">This is an automated communication from RT International CRM.</p>
  </div>
</body>
</html>
"""
    msg.attach(MIMEText(body, "html"))

    part = MIMEApplication(pdf_bytes, Name=filename)
    part["Content-Disposition"] = f'attachment; filename="{filename}"'
    msg.attach(part)

    ctx = ssl.create_default_context()
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls(context=ctx)
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        print(f"[EMAIL] Salary slip sent to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send salary slip to {to_email}: {e}")
        return False
