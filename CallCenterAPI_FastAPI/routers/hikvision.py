from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from ..database import get_db
from ..models import User
from .auth import require_admin
from ..utils.logger import log_activity, get_client_ip

router = APIRouter(prefix="/api/attendance", tags=["attendance"])
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/hikvision-status")
def hikvision_status(db: Session = Depends(get_db)):
    total = db.query(func.count(User.id)).filter(User.device_user_id.isnot(None)).scalar() or 0
    return {"enabled": True, "mappedUsers": total}


class DeviceMappingUpdate(BaseModel):
    deviceUserId: str


@admin_router.get("/device-mappings")
def list_device_mappings(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).filter(
        User.is_deleted == False,
        User.role != "admin",
    ).order_by(User.name.asc()).all()
    return [
        {
            "userId": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "deviceUserId": u.device_user_id,
        }
        for u in users
    ]


@admin_router.put("/device-mappings/{user_id}")
def set_device_mapping(
    user_id: int,
    data: DeviceMappingUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_id = data.deviceUserId.strip()
    if not new_id:
        raise HTTPException(status_code=400, detail="Device user id cannot be empty")

    dup = db.query(User).filter(
        User.device_user_id == new_id,
        User.id != user_id,
        User.is_deleted == False,
    ).first()
    if dup:
        raise HTTPException(status_code=400, detail=f"Device id already assigned to {dup.name}")

    user.device_user_id = new_id
    user.updated_at = datetime.utcnow()
    db.commit()
    log_activity(db, admin.id, "device_mapping", "user", user.id,
                 f"Mapped device user {new_id} to {user.name}", get_client_ip(request))
    return {"userId": user.id, "deviceUserId": new_id}


@admin_router.delete("/device-mappings/{user_id}")
def delete_device_mapping(
    user_id: int,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.device_user_id = None
    user.updated_at = datetime.utcnow()
    db.commit()
    log_activity(db, admin.id, "device_mapping_removed", "user", user.id,
                 f"Removed device mapping from {user.name}", get_client_ip(request))
    return {"userId": user.id, "deviceUserId": None}


# ─── Hikvision Real-time Event Webhook ───────────────────────────

@router.post("/hikvision-event")
async def receive_hikvision_event(request: Request, db: Session = Depends(get_db)):
    """
    Receives real-time attendance events pushed directly by Hikvision devices
    via HTTP Listening (ISAPI / Event Notification).
    """
    import json
    import re
    from datetime import datetime, date, timedelta
    from ..models import Attendance

    HIK_MAP = {
        "1": 142,   # Fizzah Zahid
        "2": 131,   # M Ahsan Shahid / Mustafa
        "3": 134,   # Boez Tahir
        "4": 133,   # Aleem Ullah
        "6": 144,   # ABRAHAM CHOUHAN
        "7": 110,   # Sunny
        "8": 1,     # Sana Ishfaq
        "9": 138,   # Ambreen
        "10": 121,  # Taimoor
        "11": 148,  # Umair
        "12": 122,  # Salman Waris
        "13": 123,  # Azeem
        "15": 120,  # Shamoon Waris
        "16": 151,  # sabir
        "18": 140,  # AMBER
        "19": 112,  # Dilshad
        "20": 131,  # M Ahsan Shahid
        "22": 118,  # Sarmad
        "23": 143,  # Zuha Khalid
        "25": 150,  # Ozain Malik
        "26": 141,  # Raim chouhan
        "27": 147,  # khansa
        "29": 152,  # ADAN
        "30": 153,  # Murtaza Haider
    }

    try:
        body_str = ""
        try:
            body = await request.body()
            body_str = body.decode("utf-8", errors="ignore")
        except Exception:
            pass

        form_str = ""
        try:
            form = await request.form()
            form_str = " ".join([f"{k}:{v}" for k, v in form.items() if isinstance(v, str)])
        except Exception:
            pass

        full_text = body_str + " " + form_str

        # Log raw incoming event payload to /tmp/hikvision_events.log
        try:
            with open("/tmp/hikvision_events.log", "a") as f_log:
                f_log.write(f"\n--- EVENT {datetime.now()} ---\nHeaders: {dict(request.headers)}\nBody: {body_str[:1000]}\nForm: {form_str[:1000]}\n")
        except Exception:
            pass

        emp_id = None
        event_time_str = None

        if body_str:
            try:
                data = json.loads(body_str)
                acs = data.get("AccessControllerEvent", {}) or data.get("AcsEvent", {}) or data
                emp_id = str(acs.get("employeeNoString") or acs.get("employeeNo") or acs.get("EmployeeNo") or "")
                event_time_str = str(acs.get("eventTime") or acs.get("time") or "")
            except Exception:
                pass

        if not emp_id and full_text:
            m_emp = re.search(r'(?:employeeNoString|employeeNo|EmployeeNo)[^0-9>]*([0-9]+)', full_text, re.IGNORECASE)
            if m_emp:
                emp_id = m_emp.group(1).strip()

        if not event_time_str and full_text:
            m_time = re.search(r'(?:eventTime|time)[^0-9>]*(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})', full_text, re.IGNORECASE)
            if m_time:
                event_time_str = m_time.group(1).strip()

        if not emp_id:
            return {"status": "ok", "message": "Received payload without employee ID"}

        # 4-Step Smart Matching:
        user = db.query(User).filter(User.device_user_id == str(emp_id), User.is_deleted.isnot(True)).first()
        if not user:
            mapped_id = HIK_MAP.get(str(emp_id))
            if mapped_id:
                user = db.query(User).filter(User.id == mapped_id, User.is_deleted.isnot(True)).first()
        if not user and emp_id.isdigit():
            user = db.query(User).filter(User.id == int(emp_id), User.is_deleted.isnot(True)).first()

        if not user:
            return {"status": "ignored", "message": f"Biometric ID '{emp_id}' not linked to any portal user"}

        now_pkt = datetime.utcnow() + timedelta(hours=5)
        punch_dt = now_pkt
        if event_time_str:
            try:
                cleaned = event_time_str.replace("T", " ").split("+")[0].split(".")[0]
                punch_dt = datetime.strptime(cleaned, "%Y-%m-%d %H:%M:%S")
            except Exception:
                pass

        today = punch_dt.date()

        record = db.query(Attendance).filter(
            Attendance.user_id == user.id,
            Attendance.date == today
        ).first()

        if not record:
            custom_shift = getattr(user, "shift_start_time", None)
            if custom_shift and ":" in str(custom_shift):
                try:
                    parts = str(custom_shift).strip().split(":")
                    sh_h = int(parts[0])
                    sh_m = int(parts[1])
                    grace_total = sh_h * 60 + sh_m + 15
                    th_h = (grace_total // 60) % 24
                    th_m = grace_total % 60
                except Exception:
                    is_friday = (today.weekday() == 4)
                    th_h, th_m = (15, 15) if is_friday else (14, 15)
            else:
                is_friday = (today.weekday() == 4)
                th_h, th_m = (15, 15) if is_friday else (14, 15)

            threshold = datetime.combine(today, datetime.min.time()).replace(hour=th_h, minute=th_m)
            status = "late" if punch_dt > threshold else "present"

            record = Attendance(
                user_id=user.id,
                date=today,
                check_in=punch_dt,
                status=status,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(record)
        else:
            record.check_out = punch_dt
            record.updated_at = datetime.utcnow()

        db.commit()

        log_activity(
            db, user.id, "biometric_checkin", "attendance", record.id,
            f"Hikvision auto check-in/out for {user.name} (Bio ID {emp_id}) at {punch_dt}",
            get_client_ip(request)
        )

        return {
            "status": "success",
            "userId": user.id,
            "userName": user.name,
            "date": str(today),
            "punchTime": str(punch_dt)
        }

    except Exception as e:
        return {"status": "error", "detail": str(e)}
