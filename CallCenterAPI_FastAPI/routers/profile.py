import bcrypt
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from .auth import get_current_user
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
    monthlySalary: Optional[float] = 0.0
    cnic: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    dateOfBirth: Optional[date] = None
    dateOfJoining: Optional[date] = None
    emergContactName: Optional[str] = None
    emergContactNumber: Optional[str] = None




class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    currentPassword: Optional[str] = None
    newPassword: Optional[str] = Field(None, max_length=128)


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
    )


@router.put("")
def update_profile(
    dto: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if dto.name is not None:
        current_user.name = dto.name.strip()
    if dto.email is not None:
        clean = dto.email.strip().lower()
        existing = db.query(User).filter(User.email == clean, User.id != current_user.id).first()
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

    current_user.updated_at = datetime.now()
    db.commit()
    db.refresh(current_user)

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
    )
