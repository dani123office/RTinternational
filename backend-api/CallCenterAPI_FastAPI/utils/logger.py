from datetime import datetime
from fastapi import Request
from sqlalchemy.orm import Session
from models import ActivityLog


def log_activity(
    db: Session,
    user_id: int,
    action: str,
    entity_type: str = None,
    entity_id: int = None,
    description: str = None,
    ip_address: str = None,
):
    log = ActivityLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        ip_address=ip_address,
        created_at=datetime.now(),
    )
    db.add(log)
    db.commit()


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"
