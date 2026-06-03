from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from ..database import get_db
from ..models import User, LeaveRequest
from .auth import get_current_user
from ..schemas import LeaveRequestCreate, LeaveRequestReview, LeaveRequestOut
from ..utils.logger import log_activity, get_client_ip

router = APIRouter(prefix="/api/leaves", tags=["leaves"])


def _leave_to_out(l: LeaveRequest) -> LeaveRequestOut:
    return LeaveRequestOut(
        id=l.id,
        userId=l.user_id,
        userName=l.user.name if l.user else None,
        leaveType=l.leave_type,
        fromDate=l.from_date,
        toDate=l.to_date,
        reason=l.reason,
        status=l.status,
        adminId=l.admin_id,
        adminNotes=l.admin_notes,
        createdAt=l.created_at,
        updatedAt=l.updated_at,
    )


@router.post("")
def create_leave(
    dto: LeaveRequestCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if dto.from_date > dto.to_date:
        raise HTTPException(status_code=400, detail="From date cannot be after to date")

    record = LeaveRequest(
        user_id=current_user.id,
        leave_type=dto.leave_type,
        from_date=dto.from_date,
        to_date=dto.to_date,
        reason=dto.reason,
        status="pending",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    log_activity(db, current_user.id, "created", "leave", record.id,
                 f"Created leave request #{record.id}",
                 get_client_ip(request))
    return _leave_to_out(record)


@router.get("/my")
def my_leaves(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    total = db.query(func.count(LeaveRequest.id)).filter(
        LeaveRequest.user_id == current_user.id,
    ).scalar()
    records = db.query(LeaveRequest).filter(
        LeaveRequest.user_id == current_user.id,
    ).order_by(
        LeaveRequest.created_at.desc()
    ).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": [_leave_to_out(r) for r in records],
        "total": total,
        "page": page,
        "perPage": per_page,
        "totalPages": (total + per_page - 1) // per_page,
    }


@router.get("/pending")
def pending_leaves(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view pending leaves")
    records = db.query(LeaveRequest).filter(
        LeaveRequest.status == "pending",
    ).order_by(LeaveRequest.created_at.asc()).all()
    return [_leave_to_out(r) for r in records]


@router.put("/{leave_id}/review")
def review_leave(
    leave_id: int,
    dto: LeaveRequestReview,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can review leaves")
    record = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if record.status != "pending":
        raise HTTPException(status_code=400, detail=f"Leave already {record.status}")

    record.status = dto.status
    record.admin_id = current_user.id
    if dto.admin_notes is not None:
        record.admin_notes = dto.admin_notes
    record.updated_at = datetime.now()
    db.commit()
    db.refresh(record)
    log_activity(db, current_user.id, "reviewed", "leave", record.id,
                 f"Reviewed leave #{record.id} as {dto.status}",
                 get_client_ip(request))
    return _leave_to_out(record)


@router.get("/agent/{agent_id}")
def agent_leaves(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    if current_user.role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Only managers and admins can view agent leaves")

    agent = db.query(User).filter(User.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if current_user.role == "manager" and agent.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view your own team members")

    total = db.query(func.count(LeaveRequest.id)).filter(
        LeaveRequest.user_id == agent_id,
    ).scalar()
    records = db.query(LeaveRequest).filter(
        LeaveRequest.user_id == agent_id,
    ).order_by(
        LeaveRequest.created_at.desc()
    ).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": [_leave_to_out(r) for r in records],
        "total": total,
        "page": page,
        "perPage": per_page,
        "totalPages": (total + per_page - 1) // per_page,
    }
