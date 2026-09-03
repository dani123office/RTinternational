import io
from calendar import monthrange
from datetime import datetime, date, time, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from ..database import get_db
from ..models import User, Attendance
from .auth import get_current_user
from pydantic import BaseModel
from ..schemas import AttendanceCheckIn, AttendanceCheckOut, AttendanceManualUpdate, AttendanceOut, AttendanceSummary, UserAttendanceToday, LateArrivalReport
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side


class AttendanceRecordOut(BaseModel):
    record: AttendanceOut
    agentName: str
    agentEmail: str


class AttendanceFeedItem(BaseModel):
    id: int
    userId: int
    userName: str
    userEmail: str
    date: date
    checkIn: Optional[datetime] = None
    checkOut: Optional[datetime] = None
    status: str
    checkin_reason: Optional[str] = None
    checkout_reason: Optional[str] = None
    expected_arrival_time: Optional[str] = None
    late_arrival_reason: Optional[str] = None
from ..utils.logger import log_activity, get_client_ip

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

PKT_OFFSET = timedelta(hours=5)

# Weekday-aware thresholds: Mon-Thu -> 14:15, Fri -> 15:15 (PKT)
LATE_THRESHOLD_MON_THU = (14, 15)
LATE_THRESHOLD_FRIDAY = (15, 15)

def _now_pkt():
    return datetime.utcnow() + PKT_OFFSET

def _today_pkt():
    return _now_pkt().date()

def _is_mobile_device(request: Request) -> bool:
    user_agent = request.headers.get("user-agent", "").lower()
    mobile_keywords = ["mobile", "android", "iphone", "ipad", "phone", "opera mini", "iemobile", "windows phone"]
    return any(keyword in user_agent for keyword in mobile_keywords)


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
        expected_arrival_time=a.expected_arrival_time.strftime("%H:%M") if a.expected_arrival_time else None,
        late_arrival_reason=a.late_arrival_reason,
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

    end_hour = 22
    custom_end = getattr(current_user, "shift_end_time", None)
    if custom_end and ":" in str(custom_end):
        try:
            end_hour = int(str(custom_end).strip().split(":")[0])
        except Exception:
            end_hour = 22

    if record and record.check_in and not record.check_out and now.hour >= end_hour:
        record.check_out = now
        record.checkout_reason = (record.checkout_reason or "") + (" | " if record.checkout_reason else "") + f"Auto check-out at {end_hour}:00"
        record.updated_at = now
        db.commit()
        db.refresh(record)

    if record:
        return _attendance_to_out(record)
    return None


@router.post("/check-in")
def check_in(
    dto: AttendanceCheckIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if _is_mobile_device(request):
        raise HTTPException(
            status_code=400,
            detail="Mobile devices are not allowed use office wifi/pc"
        )

    now = _now_pkt()
    today = now.date()

    existing = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        Attendance.date == today,
    ).first()
    if existing and existing.check_in:
        raise HTTPException(status_code=400, detail="Already checked in today")

    # determine shift threshold: custom agent shift or default Mon-Thu 14:15 / Fri 15:15
    custom_shift = getattr(current_user, "shift_start_time", None)
    if custom_shift and ":" in str(custom_shift):
        try:
            parts = str(custom_shift).strip().split(":")
            sh_h = int(parts[0])
            sh_m = int(parts[1])
            # Late threshold is 15 minutes after shift start time
            grace_total = sh_h * 60 + sh_m + 15
            th_h = (grace_total // 60) % 24
            th_m = grace_total % 60
        except Exception:
            wd = now.weekday()
            th_h, th_m = LATE_THRESHOLD_FRIDAY if wd == 4 else LATE_THRESHOLD_MON_THU
    else:
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
        log_activity(db, current_user.id, "checked_in", "attendance", existing.id,
                     f"Checked in at {now.strftime('%H:%M')}",
                     get_client_ip(request))
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
    log_activity(db, current_user.id, "checked_in", "attendance", record.id,
                     f"Checked in at {now.strftime('%H:%M')}",
                     get_client_ip(request))
    return _attendance_to_out(record)


@router.post("/check-out")
def check_out(
    dto: AttendanceCheckOut,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if _is_mobile_device(request):
        raise HTTPException(
            status_code=400,
            detail="Mobile devices are not allowed use office wifi/pc"
        )

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
    if record.check_in:
        diff_minutes = (now - record.check_in).total_seconds() / 60
        if diff_minutes < 240:
            record.status = "half_day"
            h_worked = int(diff_minutes // 60)
            m_worked = int(diff_minutes % 60)
            half_day_note = f"Half Day ({h_worked}h {m_worked}m worked)"
            record.checkout_reason = (record.checkout_reason or "") + (" | " if record.checkout_reason else "") + half_day_note

    if dto.checkout_reason is not None:
        record.checkout_reason = (record.checkout_reason or "") + (" | " if record.checkout_reason else "") + dto.checkout_reason
    record.updated_at = now
    db.commit()
    db.refresh(record)
    log_activity(db, current_user.id, "checked_out", "attendance", record.id,
                 f"Checked out at {now.strftime('%H:%M')}",
                 get_client_ip(request))
    return _attendance_to_out(record)


@router.post("/report-late-arrival")
def report_late_arrival(
    dto: LateArrivalReport,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if dto.date > _today_pkt():
        raise HTTPException(status_code=400, detail="Cannot report late arrival for a future date")

    record = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        Attendance.date == dto.date,
    ).first()

    if not record:
        record = Attendance(
            user_id=current_user.id,
            date=dto.date,
            status="late",
            check_in=None,
            check_out=None,
            expected_arrival_time=dto.expected_arrival_time,
            late_arrival_reason=dto.reason,
            created_at=_now_pkt(),
            updated_at=_now_pkt(),
        )
        db.add(record)
    else:
        record.expected_arrival_time = dto.expected_arrival_time
        record.late_arrival_reason = dto.reason
        if record.status == "present":
            record.status = "late"
        record.updated_at = _now_pkt()

    db.commit()
    db.refresh(record)
    log_activity(db, current_user.id, "reported_late", "attendance", record.id,
                 f"Reported late arrival for {dto.date}: expected {dto.expected_arrival_time.strftime('%H:%M')}",
                 get_client_ip(request))
    return _attendance_to_out(record)


def _build_full_user_attendance_history(target_user: User, db: Session) -> list[AttendanceOut]:
    existing_records = db.query(Attendance).filter(
        Attendance.user_id == target_user.id
    ).all()
    record_map = {r.date: r for r in existing_records}

    today = _today_pkt()
    user_created = target_user.created_at.date() if target_user.created_at else today
    earliest_dates = [user_created, today - timedelta(days=90)]
    if existing_records:
        earliest_dates.extend([r.date for r in existing_records])
    earliest = min(earliest_dates)

    all_out = []
    curr = today
    while curr >= earliest:
        if curr in record_map:
            all_out.append(_attendance_to_out(record_map[curr]))
        else:
            if curr.weekday() < 5 and curr <= today:
                synthetic_absent = AttendanceOut(
                    id=0,
                    userId=target_user.id,
                    date=curr,
                    checkIn=None,
                    checkOut=None,
                    status="absent",
                    checkout_reason=None,
                    checkin_reason="Absent (No check-in)",
                    expected_arrival_time=None,
                    late_arrival_reason=None,
                    createdAt=datetime.combine(curr, datetime.min.time()),
                    updatedAt=datetime.combine(curr, datetime.min.time()),
                )
                all_out.append(synthetic_absent)
        curr -= timedelta(days=1)

    return all_out


@router.get("/my-history")
def my_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    all_items = _build_full_user_attendance_history(current_user, db)
    total = len(all_items)
    paginated = all_items[(page - 1) * per_page : page * per_page]

    return {
        "items": paginated,
        "total": total,
        "page": page,
        "perPage": per_page,
        "totalPages": (total + per_page - 1) // per_page if total > 0 else 0,
    }


@router.get("/stats")
@router.get("/my-stats")
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

    # Don't count future working days for current month
    if m == today.month and y == today.year:
        effective_end = min(end, today)
    else:
        effective_end = end

    records = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        Attendance.date >= start,
        Attendance.date <= end,
    ).all()
    att_map = {r.date: r for r in records}

    user_created_date = current_user.created_at.date() if current_user.created_at else start
    if records:
        min_rec_date = min(r.date for r in records)
        effective_start = max(start, min(user_created_date, min_rec_date))
    else:
        effective_start = max(start, min(user_created_date, effective_end))
    
    if effective_start > effective_end:
        effective_start = effective_end

    working_days = []
    if effective_start <= effective_end:
        curr = effective_start
        while curr <= effective_end:
            if curr.weekday() < 5 or curr in att_map:
                working_days.append(curr)
            curr += timedelta(days=1)

    present = 0
    late = 0
    absent = 0
    half_day = 0
    total_minutes_worked = 0
    now_ts = _now_pkt()

    for wd in working_days:
        if wd in att_map:
            rec = att_map[wd]
            st = rec.status
            if rec.check_in and rec.check_out:
                mins = max(0, int((rec.check_out - rec.check_in).total_seconds() / 60))
                total_minutes_worked += mins
            elif rec.check_in and wd == today:
                mins = max(0, int((now_ts - rec.check_in).total_seconds() / 60))
                total_minutes_worked += mins

            if st == "present":
                present += 1
            elif st == "late":
                late += 1
            elif st == "half_day":
                half_day += 1
            elif st == "absent":
                absent += 1
            else:
                absent += 1
        else:
            absent += 1

    total_days = len(working_days)
    score = round(((present + late + 0.5 * half_day) / total_days * 100), 1) if total_days > 0 else 100.0
    total_hours_str = f"{total_minutes_worked // 60}h {total_minutes_worked % 60}m"

    return AttendanceSummary(
        presentCount=present,
        lateCount=late,
        absentCount=absent,
        halfDayCount=half_day,
        totalDays=total_days,
        attendanceScore=score,
        totalHoursWorked=total_hours_str,
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
            User.is_active == True,
        ).all()
    else:
        team = db.query(User).filter(
            User.role == "agent",
            User.is_active == True,
        ).all()

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

    all_items = _build_full_user_attendance_history(agent, db)
    total = len(all_items)
    paginated = all_items[(page - 1) * per_page : page * per_page]

    return {
        "items": paginated,
        "total": total,
        "page": page,
        "perPage": per_page,
        "totalPages": (total + per_page - 1) // per_page if total > 0 else 0,
    }


@router.get("/record/{record_id}")
def attendance_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Only managers and admins can view attendance records")

    record = db.query(Attendance).filter(Attendance.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    agent = db.query(User).filter(User.id == record.user_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if current_user.role == "manager" and agent.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view your own team members")

    return AttendanceRecordOut(
        record=_attendance_to_out(record),
        agentName=agent.name,
        agentEmail=agent.email,
    )


@router.get("/feed")
def attendance_feed(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    from_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    employee_id: Optional[int] = Query(None, description="Filter by employee"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    if current_user.role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Only managers and admins can view attendance feed")

    # Determine scoped agents
    if employee_id:
        scoped_agents = db.query(User).filter(User.id == employee_id, User.is_active == True).all()
        if current_user.role == "manager":
            scoped_agents = [ag for ag in scoped_agents if ag.manager_id == current_user.id]
    else:
        if current_user.role == "manager":
            scoped_agents = db.query(User).filter(User.manager_id == current_user.id, User.role == "agent", User.is_active == True).all()
        else:
            scoped_agents = db.query(User).filter(User.role == "agent", User.is_active == True).all()

    today = _today_pkt()
    eff_to = min(to_date, today)

    all_feed_items = []
    agent_map = {ag.id: ag for ag in scoped_agents}

    # Query all physical attendance rows for scoped agents in date range
    if scoped_agents:
        scoped_ids = [ag.id for ag in scoped_agents]
        physical_rows = db.query(Attendance).filter(
            Attendance.user_id.in_(scoped_ids),
            Attendance.date >= from_date,
            Attendance.date <= to_date
        ).all()
    else:
        physical_rows = []

    # Map existing records by (user_id, date)
    att_by_user_date = {}
    for a in physical_rows:
        att_by_user_date[(a.user_id, a.date)] = a
        u = agent_map.get(a.user_id)
        if u:
            all_feed_items.append(
                AttendanceFeedItem(
                    id=a.id,
                    userId=a.user_id,
                    userName=u.name,
                    userEmail=u.email,
                    date=a.date,
                    checkIn=a.check_in,
                    checkOut=a.check_out,
                    status=a.status,
                    checkin_reason=a.checkin_reason,
                    checkout_reason=a.checkout_reason,
                    expected_arrival_time=a.expected_arrival_time.strftime("%H:%M") if a.expected_arrival_time else None,
                    late_arrival_reason=a.late_arrival_reason,
                )
            )

    # Synthesize absent entries for past working days without check-ins
    for ag in scoped_agents:
        join_d = ag.created_at.date() if ag.created_at else from_date
        eff_start = max(from_date, join_d)
        if eff_start <= eff_to:
            curr = eff_start
            while curr <= eff_to:
                if curr.weekday() < 5:
                    if (ag.id, curr) not in att_by_user_date:
                        all_feed_items.append(
                            AttendanceFeedItem(
                                id=0,
                                userId=ag.id,
                                userName=ag.name,
                                userEmail=ag.email,
                                date=curr,
                                checkIn=None,
                                checkOut=None,
                                status="absent",
                                checkin_reason="Absent (No check-in)",
                                checkout_reason=None,
                                expected_arrival_time=None,
                                late_arrival_reason=None,
                            )
                        )
                curr += timedelta(days=1)

    # Sort all feed items by date desc, then user name asc
    all_feed_items.sort(key=lambda x: (x.date, x.userName or ""), reverse=True)

    present_count = sum(1 for item in all_feed_items if item.status == "present")
    late_count = sum(1 for item in all_feed_items if item.status == "late")
    absent_count = sum(1 for item in all_feed_items if item.status == "absent")
    total = len(all_feed_items)

    paginated = all_feed_items[(page - 1) * per_page : page * per_page]

    return {
        "items": paginated,
        "total": total,
        "page": page,
        "perPage": per_page,
        "totalPages": (total + per_page - 1) // per_page if total else 0,
        "summary": {
            "presentCount": present_count,
            "lateCount": late_count,
            "absentCount": absent_count,
            "totalRecords": total,
        }
    }


@router.get("/export")
def attendance_export(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    from_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    employee_id: Optional[int] = Query(None, description="Filter by employee"),
):
    if current_user.role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Only managers and admins can export attendance")

    query = db.query(Attendance, User).join(User, Attendance.user_id == User.id).filter(User.is_active == True)

    if current_user.role == "manager":
        query = query.filter(User.manager_id == current_user.id, User.role == "agent")

    query = query.filter(Attendance.date >= from_date, Attendance.date <= to_date)

    if employee_id:
        query = query.filter(Attendance.user_id == employee_id)

    rows = query.order_by(Attendance.date.desc(), User.name.asc()).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Attendance Feed"

    headers = ["Date", "Employee Name", "Email", "Status", "Check In", "Check Out", "Check-in Reason", "Check-out Reason", "Exp. Arrival Time", "Late Arrival Reason"]
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    thin_border = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0"),
    )

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border

    for row_idx, (a, u) in enumerate(rows, 2):
        values = [
            a.date.isoformat() if a.date else "",
            u.name or "",
            u.email or "",
            a.status.capitalize() if a.status else "",
            a.check_in.strftime("%H:%M") if a.check_in else "",
            a.check_out.strftime("%H:%M") if a.check_out else "",
            a.checkin_reason or "",
            a.checkout_reason or "",
            a.expected_arrival_time.strftime("%H:%M") if a.expected_arrival_time else "",
            a.late_arrival_reason or "",
        ]
        for col_idx, val in enumerate(values, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.border = thin_border
            cell.alignment = Alignment(vertical="center")

    ws.column_dimensions["A"].width = 14
    ws.column_dimensions["B"].width = 24
    ws.column_dimensions["C"].width = 30
    ws.column_dimensions["D"].width = 12
    ws.column_dimensions["E"].width = 10
    ws.column_dimensions["F"].width = 10
    ws.column_dimensions["G"].width = 28
    ws.column_dimensions["H"].width = 28
    ws.column_dimensions["I"].width = 16
    ws.column_dimensions["J"].width = 28

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"attendance_{from_date.isoformat()}_{to_date.isoformat()}.xlsx"
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/late-arrivals")
def late_arrivals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    from_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    if current_user.role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Only managers and admins can view late arrivals")

    query = db.query(Attendance, User).join(User, Attendance.user_id == User.id).filter(User.is_active == True)

    if current_user.role == "manager":
        query = query.filter(User.manager_id == current_user.id, User.role == "agent")

    query = query.filter(
        Attendance.late_arrival_reason.isnot(None),
        Attendance.date >= from_date,
        Attendance.date <= to_date,
    )

    total = query.with_entities(func.count()).scalar()
    rows = query.order_by(Attendance.date.desc(), User.name.asc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    items = [
        AttendanceFeedItem(
            id=a.id,
            userId=a.user_id,
            userName=u.name,
            userEmail=u.email,
            date=a.date,
            checkIn=a.check_in,
            checkOut=a.check_out,
            status=a.status,
            checkin_reason=a.checkin_reason,
            checkout_reason=a.checkout_reason,
            expected_arrival_time=a.expected_arrival_time.strftime("%H:%M") if a.expected_arrival_time else None,
            late_arrival_reason=a.late_arrival_reason,
        )
        for a, u in rows
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "perPage": per_page,
        "totalPages": (total + per_page - 1) // per_page if total else 0,
    }


def _parse_time_str(time_str: Optional[str], target_date: date) -> Optional[datetime]:
    if not time_str or not time_str.strip():
        return None
    s = time_str.strip()
    try:
        if "T" in s or " " in s:
            return datetime.fromisoformat(s.replace("Z", ""))
    except Exception:
        pass
    parts = s.split(":")
    if len(parts) >= 2:
        try:
            h = int(parts[0])
            m = int(parts[1])
            sec = int(parts[2]) if len(parts) > 2 else 0
            return datetime.combine(target_date, time(h, m, sec))
        except Exception:
            pass
    return None


@router.put("/manual-update")
@router.post("/manual-update")
def manual_update_attendance(
    dto: AttendanceManualUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Only managers and admins can edit attendance records")

    target_agent = db.query(User).filter(User.id == dto.userId).first()
    if not target_agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if current_user.role == "manager" and target_agent.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit attendance for your own team members")

    record = db.query(Attendance).filter(
        Attendance.user_id == dto.userId,
        Attendance.date == dto.date
    ).first()

    parsed_check_in = _parse_time_str(dto.checkIn, dto.date) if dto.checkIn is not None else None
    parsed_check_out = _parse_time_str(dto.checkOut, dto.date) if dto.checkOut is not None else None

    new_status = dto.status
    if not new_status:
        if parsed_check_in:
            new_status = "present"
        else:
            new_status = "absent"

    if not record:
        now_utc = _now_pkt()
        record = Attendance(
            user_id=dto.userId,
            date=dto.date,
            check_in=parsed_check_in,
            check_out=parsed_check_out,
            status=new_status,
            checkin_reason=dto.checkin_reason or ("Manual Entry" if parsed_check_in else "Absent (No check-in)"),
            checkout_reason=dto.checkout_reason,
            created_at=now_utc,
            updated_at=now_utc,
        )
        db.add(record)
        action_verb = "created_manual"
    else:
        if dto.checkIn is not None:
            record.check_in = parsed_check_in
        if dto.checkOut is not None:
            record.check_out = parsed_check_out
        if dto.status:
            record.status = dto.status
        elif parsed_check_in is None and record.check_in is None:
            record.status = "absent"

        if dto.checkin_reason is not None:
            record.checkin_reason = dto.checkin_reason
        if dto.checkout_reason is not None:
            record.checkout_reason = dto.checkout_reason
        record.updated_at = _now_pkt()
        action_verb = "updated_manual"

    db.commit()
    db.refresh(record)

    log_activity(
        db, current_user.id, action_verb, "attendance", record.id,
        f"{current_user.name} adjusted attendance for {target_agent.name} on {dto.date} (Status: {record.status})",
        get_client_ip(request),
    )

    return _attendance_to_out(record)
