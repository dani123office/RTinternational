from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from ..database import get_db
from ..models import User, LoanRequest
from .auth import get_current_user
from ..schemas import LoanCreate, LoanReview, LoanOut, LoanPayback
from ..utils.logger import log_activity, get_client_ip

router = APIRouter(prefix="/api/loans", tags=["loans"])


def _loan_to_out(l: LoanRequest) -> LoanOut:
    return LoanOut(
        id=l.id,
        userId=l.user_id,
        userName=l.user.name if l.user else None,
        amount=l.amount,
        paidAmount=l.paid_amount if l.paid_amount is not None else 0.0,
        reason=l.reason,
        status=l.status,
        adminId=l.admin_id,
        adminNotes=l.admin_notes,
        createdAt=l.created_at,
        updatedAt=l.updated_at,
    )


@router.post("")
def create_loan(
    dto: LoanCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("agent", "manager"):
        raise HTTPException(status_code=403, detail="Only agents and managers can request loans")

    record = LoanRequest(
        user_id=current_user.id,
        amount=dto.amount,
        reason=dto.reason,
        status="pending",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    log_activity(db, current_user.id, "created", "loan", record.id,
                 f"Created loan request #{record.id} for Rs. {dto.amount}",
                 get_client_ip(request))
    return _loan_to_out(record)


@router.get("/my")
def my_loans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    total = db.query(func.count(LoanRequest.id)).filter(
        LoanRequest.user_id == current_user.id,
    ).scalar()
    records = db.query(LoanRequest).filter(
        LoanRequest.user_id == current_user.id,
    ).order_by(
        LoanRequest.created_at.desc()
    ).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": [_loan_to_out(r) for r in records],
        "total": total,
        "page": page,
        "perPage": per_page,
        "totalPages": (total + per_page - 1) // per_page,
    }


@router.get("/pending")
def pending_loans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view pending loans")
    records = db.query(LoanRequest).filter(
        LoanRequest.status == "pending",
    ).order_by(LoanRequest.created_at.asc()).all()
    return [_loan_to_out(r) for r in records]


@router.get("/all")
def all_loans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view all loans")
    total = db.query(func.count(LoanRequest.id)).scalar()
    records = db.query(LoanRequest).order_by(
        LoanRequest.created_at.desc()
    ).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": [_loan_to_out(r) for r in records],
        "total": total,
        "page": page,
        "perPage": per_page,
        "totalPages": (total + per_page - 1) // per_page if total else 0,
    }


@router.put("/{loan_id}/review")
def review_loan(
    loan_id: int,
    dto: LoanReview,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can review loans")
    record = db.query(LoanRequest).filter(LoanRequest.id == loan_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Loan request not found")
    if record.status != "pending":
        raise HTTPException(status_code=400, detail=f"Loan already {record.status}")

    record.status = dto.status
    record.admin_id = current_user.id
    if dto.admin_notes is not None:
        record.admin_notes = dto.admin_notes
    record.updated_at = datetime.now()
    db.commit()
    db.refresh(record)
    log_activity(db, current_user.id, "reviewed", "loan", record.id,
                 f"Reviewed loan #{record.id} as {dto.status}",
                 get_client_ip(request))
    return _loan_to_out(record)


@router.delete("/{loan_id}")
def delete_loan(
    loan_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete loans")
    record = db.query(LoanRequest).filter(LoanRequest.id == loan_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Loan request not found")
    db.delete(record)
    db.commit()
    log_activity(db, current_user.id, "deleted", "loan", loan_id,
                 f"Deleted loan request #{loan_id}",
                 get_client_ip(request))
    return {"detail": "Loan request deleted"}


@router.put("/{loan_id}/payback")
def record_payback(
    loan_id: int,
    dto: LoanPayback,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can record paybacks")
    record = db.query(LoanRequest).filter(LoanRequest.id == loan_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Loan request not found")
    if record.status != "approved":
        raise HTTPException(status_code=400, detail="Can only record payback for approved loans")

    current_paid = record.paid_amount if record.paid_amount is not None else 0.0
    remaining_balance = record.amount - current_paid
    if dto.payback_amount > remaining_balance + 0.01:
        raise HTTPException(status_code=400, detail=f"Payback amount exceeds remaining balance of Rs. {remaining_balance}")

    record.paid_amount = current_paid + dto.payback_amount
    if dto.admin_notes:
        if record.admin_notes:
            record.admin_notes += f"\n[Payback: Rs. {dto.payback_amount}] {dto.admin_notes}"
        else:
            record.admin_notes = f"[Payback: Rs. {dto.payback_amount}] {dto.admin_notes}"
    record.updated_at = datetime.now()
    db.commit()
    db.refresh(record)

    log_activity(db, current_user.id, "payback", "loan", record.id,
                 f"Recorded payback of Rs. {dto.payback_amount} for loan #{record.id}",
                 get_client_ip(request))
    return _loan_to_out(record)
