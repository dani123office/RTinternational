import os
import smtplib
import random
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication

DEFAULT_SMTP_SERVER = "smtp.gmail.com"
DEFAULT_SMTP_PORT = 587
DEFAULT_SMTP_EMAIL = "danoffice52@gmail.com"
DEFAULT_SMTP_PASSWORD = "reothmatfyfbkvyz"


def _get_smtp_config():
    # Attempt to load .env if not loaded
    env_paths = [
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.getcwd(), "CallCenterAPI_FastAPI", ".env"),
        "/app/.env",
        "/app/CallCenterAPI_FastAPI/.env"
    ]
    for p in env_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k, v = k.strip(), v.strip().strip("'\"")
                            if k and k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass

    server = os.environ.get("SMTP_SERVER") or DEFAULT_SMTP_SERVER
    port = int(os.environ.get("SMTP_PORT") or DEFAULT_SMTP_PORT)
    email = os.environ.get("SMTP_EMAIL") or os.environ.get("SMTP_USER") or os.environ.get("MAIL_USERNAME") or DEFAULT_SMTP_EMAIL
    password = os.environ.get("SMTP_PASSWORD") or os.environ.get("SMTP_PASS") or os.environ.get("MAIL_PASSWORD") or DEFAULT_SMTP_PASSWORD

    return server, port, email, password


def generate_otp(length: int = 6) -> str:
    return str(random.randint(10 ** (length - 1), 10**length - 1))


def send_otp_email(to_email: str, otp: str) -> bool:
    smtp_server, smtp_port, sender_email, sender_password = _get_smtp_config()

    if not sender_email or not sender_password:
        print(f"[EMAIL] SMTP credentials not configured — OTP {otp} for {to_email}")
        return False

    msg = MIMEMultipart()
    msg["From"] = f"RT International <{sender_email}>"
    msg["To"] = to_email
    msg["Subject"] = "Your OTP Code - RT International"

    body = f"""
<html>
<body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; line-height: 1.6;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 20px;">
      <h2 style="color: #0f172a; margin: 0; font-size: 20px;">RT International Call Centre</h2>
      <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">Email Verification Security Code</p>
    </div>
    <p>Your one-time verification code (OTP) is:</p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0;">
      <span style="letter-spacing: 10px; font-size: 34px; font-weight: 800; color: #4f46e5; font-family: monospace;">{otp}</span>
    </div>
    <p style="color: #64748b; font-size: 13px;">This code will expire in <strong>5 minutes</strong>. If you did not request this code, please ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 11px; margin: 0;">RT International CRM Platform &bull; Automated Security Service</p>
  </div>
</body>
</html>
"""
    msg.attach(MIMEText(body, "html"))

    ctx = ssl.create_default_context()
    try:
        with smtplib.SMTP(smtp_server, smtp_port, timeout=15) as server:
            server.starttls(context=ctx)
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())
        print(f"[EMAIL] OTP successfully sent to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send OTP to {to_email}: {e}")
        print(f"[EMAIL] Fallback — OTP for {to_email} is: {otp}")
        return False


def send_salary_slip_email(to_email: str, employee_name: str, month_name: str, year: int, pdf_bytes: bytes, filename: str) -> bool:
    smtp_server, smtp_port, sender_email, sender_password = _get_smtp_config()

    if not sender_email or not sender_password:
        print(f"[EMAIL] SMTP credentials not configured — Salary slip for {employee_name} ({to_email})")
        return False

    msg = MIMEMultipart()
    msg["From"] = f"RT International <{sender_email}>"
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
        with smtplib.SMTP(smtp_server, smtp_port, timeout=15) as server:
            server.starttls(context=ctx)
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())
        print(f"[EMAIL] Salary slip sent to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send salary slip to {to_email}: {e}")
        return False
