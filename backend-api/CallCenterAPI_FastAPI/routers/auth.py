import jwt
import bcrypt
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import LoginRequest, LoginResponse, RegisterRequest, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

SECRET_KEY = os.environ.get("RT_JWT_SECRET", "rt-international-secret-key-2026")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 2
REFRESH_EXPIRE_DAYS = 7


def _create_token(user_id: int) -> str:
    payload = {
        "userId": user_id,
        "type": "access",
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _create_refresh_token(user_id: int) -> str:
    payload = {
        "userId": user_id,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=REFRESH_EXPIRE_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    db: Session = Depends(get_db),
    authorization: str = Header(None),
) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("userId")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        if payload.get("type") not in (None, "access"):
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except (ValueError, jwt.PyJWTError):
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.is_active != 1:
        raise HTTPException(status_code=401, detail="Account is inactive")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_manager(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Manager access required")
    return current_user


def require_agent(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "agent":
        raise HTTPException(status_code=403, detail="Agent access required")
    return current_user


def require_admin_or_manager(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Admin or manager access required")
    return current_user


def verify_manager_agent(manager: User, agent_id: int, db: Session) -> User:
    agent = db.query(User).filter(
        User.id == agent_id,
        User.role == "agent",
        User.is_active == 1,
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found or not assigned to you")
    if manager.role != "admin" and agent.manager_id != manager.id:
        raise HTTPException(status_code=404, detail="Agent not found or not assigned to you")
    return agent


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.is_active != 1:
        raise HTTPException(status_code=401, detail="Account is inactive")

    if not bcrypt.checkpw(request.password.encode("utf-8"), user.password_hash.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = _create_token(user.id)
    refresh = _create_refresh_token(user.id)
    return LoginResponse(
        token=token,
        refreshToken=refresh,
        name=user.name,
        role=user.role,
        userId=user.id,
        managerId=user.manager_id,
    )


@router.post("/refresh")
def refresh_token(db: Session = Depends(get_db), authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload.get("userId")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except (ValueError, jwt.PyJWTError):
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.is_active != 1:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    new_token = _create_token(user.id)
    new_refresh = _create_refresh_token(user.id)
    return LoginResponse(
        token=new_token,
        refreshToken=new_refresh,
        name=user.name,
        role=user.role,
        userId=user.id,
        managerId=user.manager_id,
    )


@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed = bcrypt.hashpw(request.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user = User(
        name=request.name,
        email=request.email,
        password_hash=hashed,
        role=request.role or "agent",
        is_active=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = _create_token(user.id)
    refresh = _create_refresh_token(user.id)
    return LoginResponse(
        token=token,
        refreshToken=refresh,
        name=user.name,
        role=user.role,
        userId=user.id,
        managerId=user.manager_id,
    )


@router.get("/users")
def get_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        UserOut(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role,
            isActive=u.is_active,
            managerId=u.manager_id,
        )
        for u in users
    ]
