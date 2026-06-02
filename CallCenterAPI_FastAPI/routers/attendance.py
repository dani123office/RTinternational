from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from ..database import get_db
from ..models import User, Attendance
from .auth import get_current_user
from ..schemas import AttendanceCheckIn, AttendanceCheckOut, AttendanceOut, AttendanceSummary, UserAttendanceToday

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

PKT_OFFSET = timedelta(hours=5)

# Weekday-aware thresholds: Mon-Thu -> 14:10, Fri -> 15:10 (PKT)
LATE_THRESHOLD_MON_THU = (14, 10)
LATE_THRESHOLD_FRIDAY = (15, 10)

def _now_pkt():
    return datetime.utcnow() + PKT_OFFSET

def _today_pkt():
    return _now_pkt().date()

def _attendance_to_out(a: Attendance) -> AttendanceOut:
    return AttendanceOut(
        id=a.id,
        userId=a.user_id,
        date=a.date,
        checkIn=a.check_in,
        checkOut=a.check_out,
        status=a.status,
        checkout_reason=a.checkout_reason,
        checkin_reason=a.checkin_reason,
        createdAt=a.created_at,
        updatedAt=a.updated_at,
    )


@router.get("/today")
def get_today_attendance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = _now_pkt()
    today = now.date()
    record = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        Attendance.date == today,
    ).first()

    if record and record.check_in and not record.check_out and now.hour >= 22:
        record.check_out = now
        record.checkout_reason = (record.checkout_reason or "") + (" | " if record.checkout_reason else "") + "Auto check-out at 10 PM"
        record.updated_at = now
        db.commit()
        db.refresh(record)

    if record:
        return _attendance_to_out(record)
    return None


@router.post("/check-in")
def check_in(
    dto: AttendanceCheckIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = _now_pkt()
    today = now.date()

    existing = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        Attendance.date == today,
    ).first()
    if existing and existing.check_in:
        raise HTTPException(status_code=400, detail="Already checked in today")

    # determine weekday-specific threshold
    wd = now.weekday()  # 0=Mon ... 4=Fri
    if wd == 4:
        th_h, th_m = LATE_THRESHOLD_FRIDAY
    else:
        th_h, th_m = LATE_THRESHOLD_MON_THU

    is_late = now.hour > th_h or (now.hour == th_h and now.minute > th_m)
    status = "late" if is_late else "present"

    if existing:
        existing.check_in = now
        existing.status = status
        if dto.checkin_reason is not None:
            existing.checkin_reason = dto.checkin_reason
        existing.updated_at = now
        db.commit()
        db.refresh(existing)
        return _attendance_to_out(existing)

    record = Attendance(
        user_id=current_user.id,
        date=today,
        check_in=now,
        status=status,
        checkin_reason=dto.checkin_reason,
        created_at=now,
        updated_at=now,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _attendance_to_out(record)


@router.post("/check-out")
def check_out(
    dto: AttendanceCheckOut,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = _now_pkt()
    today = now.date()

    record = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        Attendance.date == today,
    ).first()
    if not record:
        raise HTTPException(status_code=400, detail="No check-in found for today")
    if record.check_out:
        raise HTTPException(status_code=400, detail="Already checked out today")

    record.check_out = now
    if dto.checkout_reason is not None:
        record.checkout_reason = (record.checkout_reason or "") + (" | " if record.checkout_reason else "") + dto.checkout_reason
    record.updated_at = now
    db.commit()
    db.refresh(record)
    return _attendance_to_out(record)


@router.get("/my-history")
def my_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    total = db.query(func.count(Attendance.id)).filter(
        Attendance.user_id == current_user.id,
    ).scalar()
    records = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
    ).order_by(
        Attendance.date.desc()
    ).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": [_attendance_to_out(r) for r in records],
        "total": total,
        "page": page,
        "perPage": per_page,
        "totalPages": (total + per_page - 1) // per_page,
    }


@router.get("/stats")
def my_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    month: int = Query(None),
    year: int = Query(None),
):
    today = _today_pkt()
    m = month or today.month
    y = year or today.year
    _, last_day = monthrange(y, m)
    start = date(y, m, 1)
    end = date(y, m, last_day)

    total_working = sum(
        1 for d in range((end - start).days + 1)
        if (start + timedelta(days=d)).weekday() < 5
    )

    present = db.query(func.count(Attendance.id)).filter(
        Attendance.user_id == current_user.id,
        Attendance.date >= start,
        Attendance.date <= end,
        Attendance.status == "present",
    ).scalar() or 0

    late = db.query(func.count(Attendance.id)).filter(
        Attendance.user_id == current_user.id,
        Attendance.date >= start,
        Attendance.date <= end,
        Attendance.status == "late",
    ).scalar() or 0

    absent = max(0, total_working - present - late)

    return AttendanceSummary(
        presentCount=present,
        lateCount=late,
        absentCount=absent,
        totalDays=total_working,
    )


@router.get("/team-today")
def team_today(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Only managers and admins can view team attendance")
    today = _today_pkt()

    if current_user.role == "manager":
        team = db.query(User).filter(
            User.manager_id == current_user.id,
            User.role == "agent",
        ).all()
    else:
        team = db.query(User).filter(User.role == "agent").all()

    result = []
    for agent in team:
        record = db.query(Attendance).filter(
            Attendance.user_id == agent.id,
            Attendance.date == today,
        ).first()
        result.append(UserAttendanceToday(
            userId=agent.id,
            userName=agent.name,
            userEmail=agent.email,
            attendance=_attendance_to_out(record) if record else None,
        ))

    return result


@router.get("/agent-history/{agent_id}")
def agent_history(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    if current_user.role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Only managers and admins can view agent attendance")

    agent = db.query(User).filter(User.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if current_user.role == "manager" and agent.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view your own team members")

    total = db.query(func.count(Attendance.id)).filter(
        Attendance.user_id == agent_id,
    ).scalar()
    records = db.query(Attendance).filter(
        Attendance.user_id == agent_id,
    ).order_by(
        Attendance.date.desc()
    ).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": [_attendance_to_out(r) for r in records],
        "total": total,
        "page": page,
        "perPage": per_page,
        "totalPages": (total + per_page - 1) // per_page,
    }
