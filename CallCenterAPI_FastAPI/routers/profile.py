import bcrypt
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import User, EmailVerification
from .auth import get_current_user
from ..utils.logger import log_activity, get_client_ip
from ..utils.email import generate_otp, send_otp_email
from pydantic import BaseModel, Field
import bcrypt
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import User, EmailVerification
from .auth import get_current_user
from ..utils.logger import log_activity, get_client_ip
from ..utils.email import generate_otp, send_otp_email
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

router = APIRouter(prefix="/api/profile", tags=["profile"])


class ProfileOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    commissionRate: Optional[float] = None
    isActive: int
    managerId: Optional[int] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    fatherName: Optional[str] = None
    monthlySalary: Optional[int] = 0
    cnic: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    dateOfBirth: Optional[date] = None
    dateOfJoining: Optional[date] = None
    emergContactName: Optional[str] = None
    emergContactNumber: Optional[str] = None
    bankName: Optional[str] = None
    bankAccountNumber: Optional[str] = None
    jobCadre: Optional[str] = "Full time"




class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    currentPassword: Optional[str] = None
    newPassword: Optional[str] = Field(None, max_length=128)
    bankName: Optional[str] = None
    bankAccountNumber: Optional[str] = None
    jobCadre: Optional[str] = None


@router.get("")
def get_profile(current_user: User = Depends(get_current_user)):
    return ProfileOut(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        phone=current_user.phone,
        commissionRate=current_user.commission_rate,
        isActive=current_user.is_active,
        managerId=current_user.manager_id,
        createdAt=current_user.created_at.isoformat() if current_user.created_at else None,
        updatedAt=current_user.updated_at.isoformat() if current_user.updated_at else None,
        fatherName=current_user.father_name,
        monthlySalary=current_user.monthly_salary,
        cnic=current_user.cnic,
        department=current_user.department,
        designation=current_user.designation,
        dateOfBirth=current_user.date_of_birth,
        dateOfJoining=current_user.date_of_joining,
        emergContactName=current_user.emerg_contact_name,
        emergContactNumber=current_user.emerg_contact_number,
        bankName=current_user.bank_name,
        bankAccountNumber=current_user.bank_account_number,
        jobCadre=current_user.job_cadre,
    )


class SendNewEmailOTPRequest(BaseModel):
    newEmail: str


class VerifyNewEmailOTPRequest(BaseModel):
    newEmail: str
    otp: str


@router.post("/send-new-email-otp")
def send_new_email_otp(
    dto: SendNewEmailOTPRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_email = dto.newEmail.strip().lower()
    existing = db.query(User).filter(func.lower(User.email) == new_email, User.id != current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")

    otp = generate_otp()
    ev = db.query(EmailVerification).filter(EmailVerification.user_id == current_user.id).first()
    if not ev:
        ev = EmailVerification(user_id=current_user.id)
        db.add(ev)
    ev.otp_code = otp
    ev.otp_expiry = datetime.utcnow() + timedelta(minutes=5)
    ev.is_verified = False
    db.commit()

    sent = send_otp_email(new_email, otp)
    return {"sent": sent}


@router.post("/verify-new-email")
def verify_new_email(
    dto: VerifyNewEmailOTPRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_email = dto.newEmail.strip().lower()

    ev = db.query(EmailVerification).filter(EmailVerification.user_id == current_user.id).first()
    if not ev or not ev.otp_code or not ev.otp_expiry:
        raise HTTPException(status_code=400, detail="No OTP requested. Please request a new OTP.")
    if ev.otp_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new OTP.")
    if ev.otp_code != dto.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")

    current_user.email = new_email
    ev.is_verified = True
    ev.otp_code = None
    ev.otp_expiry = None
    current_user.updated_at = datetime.now()
    db.commit()

    return {"ok": True, "email": new_email}

@router.put("")
def update_profile(
    dto: ProfileUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if dto.name is not None:
        current_user.name = dto.name.strip()
    if dto.email is not None:
        clean = dto.email.strip().lower()
        existing = db.query(User).filter(func.lower(User.email) == clean, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = clean
    if dto.phone is not None:
        current_user.phone = dto.phone.strip() or None

    if dto.newPassword:
        if not dto.currentPassword:
            raise HTTPException(status_code=400, detail="Current password is required to set a new password")
        if not bcrypt.checkpw(dto.currentPassword.encode("utf-8"), current_user.password_hash.encode("utf-8")):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        if len(dto.newPassword) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
        current_user.password_hash = bcrypt.hashpw(dto.newPassword.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    if dto.bankName is not None:
        current_user.bank_name = dto.bankName.strip() or None
    if dto.bankAccountNumber is not None:
        current_user.bank_account_number = dto.bankAccountNumber.strip() or None
    if dto.jobCadre is not None:
        current_user.job_cadre = dto.jobCadre or "Full time"

    current_user.updated_at = datetime.now()
    db.commit()
    db.refresh(current_user)

    log_activity(db, current_user.id, "updated", "profile", current_user.id,
                 f"Updated profile",
                 get_client_ip(request))

    return ProfileOut(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        phone=current_user.phone,
        commissionRate=current_user.commission_rate,
        isActive=current_user.is_active,
        managerId=current_user.manager_id,
        createdAt=current_user.created_at.isoformat() if current_user.created_at else None,
        updatedAt=current_user.updated_at.isoformat() if current_user.updated_at else None,
        fatherName=current_user.father_name,
        monthlySalary=current_user.monthly_salary,
        cnic=current_user.cnic,
        department=current_user.department,
        designation=current_user.designation,
        dateOfBirth=current_user.date_of_birth,
        dateOfJoining=current_user.date_of_joining,
        emergContactName=current_user.emerg_contact_name,
        emergContactNumber=current_user.emerg_contact_number,
        bankName=current_user.bank_name,
        bankAccountNumber=current_user.bank_account_number,
        jobCadre=current_user.job_cadre,
    )
