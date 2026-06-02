import bcrypt
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import User, Customer, CallBack, Transfer, Sale, ActivityLog, Attendance
from .auth import require_admin
from ..schemas import (
    CreateManagerRequest, CreateAgentRequest, AssignAgentRequest,
    UpdateUserRequest, UpdateAgentStaffRequest, ApproveUserRequest, ResetUserPasswordRequest,
    OverallStats, ManagerKpi, AgentKpi, AgentDetail, AgentStats, AgentOut,
    AdminPerformanceOverview, BusinessFeedItem,
)
from .callbacks import _build_callback_out
from .transfers import _transfer_out
from .sales import _sale_out
from .salary import _SalarySlipPDF, _employee_id, _month_name, _attendance_summary
import io

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _safe_div(a: int, b: int) -> float:
    if b == 0:
        return 0.0
    return round((a / b) * 100, 1)


# ─── User Management ─────────────────────────────────────


@router.post("/create-manager", status_code=201)
def create_manager(data: CreateManagerRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        hashed = bcrypt.hashpw(data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        user = User(
            name=data.name,
            email=data.email,
            password_hash=hashed,
            role="manager",
            is_active=1,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create manager: {str(e)}")


@router.post("/create-agent", status_code=201)
def create_agent(data: CreateAgentRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        manager = db.query(User).filter(
            User.id == data.managerId, User.role == "manager", User.is_active == True,
        ).first()
        if not manager:
            raise HTTPException(status_code=400, detail="Manager not found or inactive")
        hashed = bcrypt.hashpw(data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        user = User(
            name=data.name,
            email=data.email,
            password_hash=hashed,
            role="agent",
            manager_id=data.managerId,
            is_active=1,
            father_name=data.fatherName,
            monthly_salary=data.monthlySalary,
            cnic=data.cnic,
            phone=data.phone,
            department=data.department,
            designation=data.designation,
            date_of_birth=data.dateOfBirth,
            date_of_joining=data.dateOfJoining,
            emerg_contact_name=data.emergContactName,
            emerg_contact_number=data.emergContactNumber,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "managerId": user.manager_id}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create agent: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to create agent: {str(e)}")


@router.get("/users")
def get_all_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.role, User.name).all()
    return [
        {
            "id": u.id, "name": u.name, "email": u.email,
            "role": u.role, "isActive": 1 if u.is_active else 0,
            "managerId": u.manager_id,
            "phone": u.phone,
            "fatherName": u.father_name,
            "monthlySalary": u.monthly_salary,
            "cnic": u.cnic,
            "department": u.department,
            "designation": u.designation,
            "dateOfBirth": u.date_of_birth.isoformat() if u.date_of_birth else None,
            "dateOfJoining": u.date_of_joining.isoformat() if u.date_of_joining else None,
            "emergContactName": u.emerg_contact_name,
            "emergContactNumber": u.emerg_contact_number,
            "createdAt": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.get("/managers")
def get_managers(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    managers = db.query(User).filter(User.role == "manager", User.is_active == True).order_by(User.name).all()
    result = []
    for m in managers:
        agent_ids = [a.id for a in db.query(User).filter(User.manager_id == m.id).all()]
        if agent_ids:
            cb = db.query(func.count(CallBack.id)).filter(CallBack.employee_id.in_(agent_ids)).scalar() or 0
            tr = db.query(func.count(Transfer.id)).filter(Transfer.employee_id.in_(agent_ids)).scalar() or 0
            sa = db.query(func.count(Sale.id)).filter(Sale.employee_id.in_(agent_ids)).scalar() or 0
        else:
            cb = tr = sa = 0
        total_opps = tr
        result.append(ManagerKpi(
            id=m.id, name=m.name, teamSize=len(agent_ids),
            callbacks=cb, transfers=tr, sales=sa,
            conversionRate=_safe_div(sa, total_opps),
        ))
    return result


@router.get("/agents")
def get_agents(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    showAll: bool = False,
):
    query = db.query(User).filter(User.role == "agent")
    if not showAll:
        query = query.filter(User.is_active == True)
    agents = query.order_by(User.name).all()
    manager_map = {}
    for a in agents:
        if a.manager_id not in manager_map:
            mgr = db.query(User).filter(User.id == a.manager_id).first()
            manager_map[a.manager_id] = mgr.name if mgr else "Unassigned"
    result = []
    for a in agents:
        cb = db.query(func.count(CallBack.id)).filter(CallBack.employee_id == a.id).scalar() or 0
        tr = db.query(func.count(Transfer.id)).filter(Transfer.employee_id == a.id).scalar() or 0
        sa = db.query(func.count(Sale.id)).filter(Sale.employee_id == a.id).scalar() or 0
        total_opps = tr
        result.append(AgentKpi(
            id=a.id, name=a.name,
            managerName=manager_map.get(a.manager_id, "Unassigned"),
            callbacks=cb, transfers=tr, sales=sa,
            conversionRate=_safe_div(sa, total_opps),
            isActive=1 if a.is_active else 0,
            monthlySalary=a.monthly_salary if a.monthly_salary else 0,
        ))
    return result


@router.get("/managers/{manager_id}")
def get_manager_detail(
    manager_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    manager = db.query(User).filter(User.id == manager_id, User.role == "manager").first()
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")

    agents = db.query(User).filter(User.manager_id == manager.id, User.role == "agent").all()

    agent_list = []
    for a in agents:
        cb = db.query(func.count(CallBack.id)).filter(CallBack.employee_id == a.id).scalar() or 0
        tr = db.query(func.count(Transfer.id)).filter(Transfer.employee_id == a.id).scalar() or 0
        sa = db.query(func.count(Sale.id)).filter(Sale.employee_id == a.id).scalar() or 0
        total_opps = tr
        agent_list.append(AgentKpi(
            id=a.id, name=a.name,
            managerName=manager.name,
            callbacks=cb, transfers=tr, sales=sa,
            conversionRate=_safe_div(sa, total_opps),
            isActive=1 if a.is_active else 0,
        ))

    return {
        "manager": {
            "id": manager.id, "name": manager.name, "email": manager.email,
            "role": manager.role, "isActive": 1 if manager.is_active else 0,
            "createdAt": manager.created_at.isoformat() if manager.created_at else None,
        },
        "agents": agent_list,
        "teamSize": len(agents),
    }


@router.get("/agents/{agent_id}")
def get_agent_detail(
    agent_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    agent = db.query(User).filter(User.id == agent_id, User.role == "agent").first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    callbacks = db.query(CallBack).filter(CallBack.employee_id == agent.id).all()
    transfers = db.query(Transfer).filter(Transfer.employee_id == agent.id).all()
    sales = db.query(Sale).filter(Sale.employee_id == agent.id).all()

    ac = len(callbacks)
    at = len(transfers)
    as_ = len(sales)
    a_total = ac + at
    a_cr = _safe_div(as_, a_total)

    return AgentDetail(
        agent=AgentOut(
            id=agent.id, name=agent.name, email=agent.email,
            role=agent.role, isActive=agent.is_active, managerId=agent.manager_id,
            phone=agent.phone,
            fatherName=agent.father_name,
            monthlySalary=agent.monthly_salary,
            cnic=agent.cnic,
            department=agent.department,
            designation=agent.designation,
            dateOfBirth=agent.date_of_birth,
            dateOfJoining=agent.date_of_joining,
            emergContactName=agent.emerg_contact_name,
            emergContactNumber=agent.emerg_contact_number,
        ),
        callbacks=[_build_callback_out(c, c.customer) for c in callbacks],
        transfers=[_transfer_out(t, t.customer) for t in transfers],
        sales=[_sale_out(s, s.customer) for s in sales],
        stats=AgentStats(
            agent=AgentOut(
                id=agent.id, name=agent.name, email=agent.email,
                role=agent.role, isActive=agent.is_active, managerId=agent.manager_id,
                phone=agent.phone,
                fatherName=agent.father_name,
                monthlySalary=agent.monthly_salary,
                cnic=agent.cnic,
                department=agent.department,
                designation=agent.designation,
                dateOfBirth=agent.date_of_birth,
                dateOfJoining=agent.date_of_joining,
                emergContactName=agent.emerg_contact_name,
                emergContactNumber=agent.emerg_contact_number,
            ),
            callbacks=ac, transfers=at, sales=as_, conversionRate=a_cr,
        ),
    )


@router.put("/agents/{agent_id}")
def update_agent_staff(
    agent_id: int,
    data: UpdateAgentStaffRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        agent = db.query(User).filter(User.id == agent_id, User.role == "agent").first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        if data.name is not None:
            agent.name = data.name
        if data.email is not None:
            clean = data.email.strip().lower()
            existing = db.query(User).filter(User.email == clean, User.id != agent_id).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email already in use")
            agent.email = clean
        if data.phone is not None:
            agent.phone = data.phone or None
        if data.fatherName is not None:
            agent.father_name = data.fatherName or None
        if data.monthlySalary is not None:
            agent.monthly_salary = data.monthlySalary
        if data.cnic is not None:
            agent.cnic = data.cnic or None
        if data.department is not None:
            agent.department = data.department or None
        if data.designation is not None:
            agent.designation = data.designation or None
        if data.dateOfBirth is not None:
            agent.date_of_birth = data.dateOfBirth
        if data.dateOfJoining is not None:
            agent.date_of_joining = data.dateOfJoining
        if data.emergContactName is not None:
            agent.emerg_contact_name = data.emergContactName or None
        if data.emergContactNumber is not None:
            agent.emerg_contact_number = data.emergContactNumber or None
        db.commit()
        db.refresh(agent)
        return AgentOut(
            id=agent.id, name=agent.name, email=agent.email,
            role=agent.role, isActive=agent.is_active, managerId=agent.manager_id,
            phone=agent.phone,
            fatherName=agent.father_name,
            monthlySalary=agent.monthly_salary,
            cnic=agent.cnic,
            department=agent.department,
            designation=agent.designation,
            dateOfBirth=agent.date_of_birth,
            dateOfJoining=agent.date_of_joining,
            emergContactName=agent.emerg_contact_name,
            emergContactNumber=agent.emerg_contact_number,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update agent: {str(e)}")


@router.put("/user/{user_id}")
def update_user(
    user_id: int, data: UpdateUserRequest,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if data.name is not None:
            user.name = data.name
        if data.email is not None:
            existing = db.query(User).filter(User.email == data.email, User.id != user_id).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email already in use")
            user.email = data.email
        if data.isActive is not None:
            user.is_active = data.isActive
        if data.managerId is not None:
            if user.role != "agent":
                raise HTTPException(status_code=400, detail="Only agents can be assigned a manager")
            mgr = db.query(User).filter(
                User.id == data.managerId, User.role == "manager", User.is_active == True,
            ).first()
            if not mgr:
                raise HTTPException(status_code=400, detail="Manager not found or inactive")
            user.manager_id = data.managerId
        db.commit()
        db.refresh(user)
        return {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "isActive": 1 if user.is_active else 0, "managerId": user.manager_id}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update user: {str(e)}")


@router.delete("/user/{user_id}")
def delete_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.role == "admin":
            raise HTTPException(status_code=400, detail="Cannot delete admin account")
        if user.role == "manager":
            agents = db.query(User).filter(User.manager_id == user.id).count()
            if agents > 0:
                raise HTTPException(status_code=400, detail=f"Cannot delete manager with {agents} agent(s). Reassign agents first.")
        name = user.name
        db.query(CallBack).filter(CallBack.employee_id == user.id).delete()
        db.query(Transfer).filter(Transfer.employee_id == user.id).delete()
        db.query(Sale).filter(Sale.employee_id == user.id).delete()
        db.query(Customer).filter(Customer.created_by == user.id).delete()
        db.delete(user)
        db.commit()
        return {"ok": True, "message": f"User {name} and all associated records permanently deleted"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete user: {str(e)}")


@router.patch("/assign-agent")
def assign_agent(data: AssignAgentRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        agent = db.query(User).filter(User.id == data.agentId, User.role == "agent").first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        manager = db.query(User).filter(
            User.id == data.managerId, User.role == "manager", User.is_active == True,
        ).first()
        if not manager:
            raise HTTPException(status_code=400, detail="Manager not found or inactive")
        agent.manager_id = data.managerId
        db.commit()
        return {"ok": True, "agentId": agent.id, "managerId": manager.id}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to assign agent: {str(e)}")


# ─── Pending Users (Admin Approval) ──────────────────────


@router.get("/pending-users")
def get_pending_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).filter(
        User.is_active == False,
        User.role.in_(["agent", "manager"]),
    ).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id, "name": u.name, "email": u.email,
            "role": u.role, "createdAt": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.post("/approve-user/{user_id}")
def approve_user(
    user_id: int, data: ApproveUserRequest,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_active:
        raise HTTPException(status_code=400, detail="User is already active")

    manager = db.query(User).filter(
        User.id == data.managerId, User.role == "manager", User.is_active == True,
    ).first()
    if not manager:
        raise HTTPException(status_code=400, detail="Manager not found or inactive")

    user.manager_id = data.managerId
    user.is_active = True
    db.commit()
    db.refresh(user)
    return {"ok": True, "message": f"User {user.name} approved and assigned to {manager.name}"}


@router.post("/reset-user-password/{user_id}")
def reset_user_password(
    user_id: int, data: ResetUserPasswordRequest,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if len(data.newPassword) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user.password_hash = bcrypt.hashpw(data.newPassword.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    db.commit()
    return {"ok": True, "message": f"Password for {user.name} has been reset"}


# ─── Analytics ────────────────────────────────────────────


@router.get("/overall-stats")
def overall_stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    total_agents = db.query(func.count(User.id)).filter(User.role == "agent", User.is_active == True).scalar() or 0
    total_managers = db.query(func.count(User.id)).filter(User.role == "manager", User.is_active == True).scalar() or 0
    total_cb = db.query(func.count(CallBack.id)).scalar() or 0
    total_tr = db.query(func.count(Transfer.id)).scalar() or 0
    total_sa = db.query(func.count(Sale.id)).scalar() or 0
    total_opps = total_tr
    return OverallStats(
        totalAgents=total_agents,
        totalManagers=total_managers,
        totalCallbacks=total_cb,
        totalTransfers=total_tr,
        totalSales=total_sa,
        conversionRate=_safe_div(total_sa, total_opps),
    )


@router.get("/performance-overview")
def performance_overview(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    managers_data = []
    managers = db.query(User).filter(User.role == "manager", User.is_active == True).all()
    for m in managers:
        a_ids = [a.id for a in db.query(User).filter(User.manager_id == m.id, User.is_active == True).all()]
        if a_ids:
            cb = db.query(func.count(CallBack.id)).filter(CallBack.employee_id.in_(a_ids)).scalar() or 0
            tr = db.query(func.count(Transfer.id)).filter(Transfer.employee_id.in_(a_ids)).scalar() or 0
            sa = db.query(func.count(Sale.id)).filter(Sale.employee_id.in_(a_ids)).scalar() or 0
        else:
            cb = tr = sa = 0
        managers_data.append(ManagerKpi(
            id=m.id, name=m.name, teamSize=len(a_ids),
            callbacks=cb, transfers=tr, sales=sa,
            conversionRate=_safe_div(sa, tr),
        ))

    agents_data = []
    agents = db.query(User).filter(User.role == "agent", User.is_active == True).all()
    mgr_names = {m.id: m.name for m in db.query(User).filter(User.role == "manager", User.is_active == True).all()}
    for a in agents:
        cb = db.query(func.count(CallBack.id)).filter(CallBack.employee_id == a.id).scalar() or 0
        tr = db.query(func.count(Transfer.id)).filter(Transfer.employee_id == a.id).scalar() or 0
        sa = db.query(func.count(Sale.id)).filter(Sale.employee_id == a.id).scalar() or 0
        agents_data.append(AgentKpi(
            id=a.id, name=a.name,
            managerName=mgr_names.get(a.manager_id, "Unassigned"),
            callbacks=cb, transfers=tr, sales=sa,
            conversionRate=_safe_div(sa, tr),
            isActive=1 if a.is_active else 0,
        ))

    agents_data.sort(key=lambda x: x.conversionRate, reverse=True)
    top_agents = agents_data[:5]
    bottom_agents = list(reversed(agents_data[-5:])) if len(agents_data) > 5 else list(reversed(agents_data))

    total_cb = sum(a.callbacks for a in agents_data)
    total_tr = sum(a.transfers for a in agents_data)
    total_sa = sum(a.sales for a in agents_data)

    return AdminPerformanceOverview(
        topManagers=sorted(managers_data, key=lambda x: x.conversionRate, reverse=True),
        topAgents=top_agents,
        bottomAgents=bottom_agents,
        totalCallbacks=total_cb,
        totalTransfers=total_tr,
        totalSales=total_sa,
        conversionRate=_safe_div(total_sa, total_tr),
    )


@router.get("/business-feed")
def business_feed(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user_map = {u.id: u.name for u in db.query(User).all()}
    events = []

    callbacks = db.query(CallBack).order_by(CallBack.created_at.desc()).limit(30).all()
    for cb in callbacks:
        events.append(BusinessFeedItem(
            type="callback", action="created",
            agentName=user_map.get(cb.employee_id, "Unknown"),
            description="created a callback",
            timestamp=cb.created_at.isoformat() if cb.created_at else None,
            id=cb.id,
        ))

    transfers = db.query(Transfer).order_by(Transfer.created_at.desc()).limit(30).all()
    for t in transfers:
        events.append(BusinessFeedItem(
            type="transfer", action="created",
            agentName=user_map.get(t.employee_id, "Unknown"),
            description="created a transfer",
            timestamp=t.created_at.isoformat() if t.created_at else None,
            id=t.id,
        ))

    sales = db.query(Sale).order_by(Sale.created_at.desc()).limit(30).all()
    for s in sales:
        events.append(BusinessFeedItem(
            type="sale", action="closed",
            agentName=user_map.get(s.employee_id, "Unknown"),
            description="closed a sale",
            timestamp=s.created_at.isoformat() if s.created_at else None,
            id=s.id,
        ))

    events.sort(key=lambda e: e.timestamp or "", reverse=True)
    return events[:50]


@router.get("/callbacks")
def admin_callbacks(
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(CallBack)
    if status:
        q = q.filter(CallBack.status == status)
    total = q.count()
    items = [_build_callback_out(c, c.customer) for c in q.order_by(CallBack.created_at.desc()).offset(skip).limit(limit).all()]
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/transfers")
def admin_transfers(
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(Transfer)
    if status:
        q = q.filter(Transfer.status == status)
    total = q.count()
    items = [_transfer_out(t, t.customer) for t in q.order_by(Transfer.created_at.desc()).offset(skip).limit(limit).all()]
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/sales")
def admin_sales(
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(Sale)
    if status:
        q = q.filter(Sale.cot_status == status)
    total = q.count()
    items = [_sale_out(s, s.customer) for s in q.order_by(Sale.created_at.desc()).offset(skip).limit(limit).all()]
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/sales/{sale_id}")
def admin_sale_detail(sale_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return _sale_out(sale, sale.customer)


@router.get("/callbacks/{callback_id}")
def admin_callback_detail(callback_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    cb = db.query(CallBack).filter(CallBack.id == callback_id).first()
    if not cb:
        raise HTTPException(status_code=404, detail="Callback not found")
    return _build_callback_out(cb, cb.customer)


@router.get("/audit-log")
def get_audit_log(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(100).all()
    return [
        {
            "id": log.id,
            "userId": log.user_id,
            "action": log.action,
            "entityType": log.entity_type,
            "entityId": log.entity_id,
            "description": log.description,
            "ipAddress": log.ip_address,
            "createdAt": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


@router.get("/salary/slip/{user_id}")
def admin_salary_slip(
    user_id: int,
    month: int = Query(None, ge=1, le=12),
    year: int = Query(None, ge=2020, le=2100),
    commission: float = Query(0.0, ge=0),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    agent = db.query(User).filter(User.id == user_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    now = datetime.now()
    m = month or now.month
    y = year or now.year

    working_days, present_days, absent_days = _attendance_summary(db, agent.id, m, y)
    gross = (agent.monthly_salary or 0) + commission

    basic = round(gross * 0.50, 0)
    hra = round(gross * 0.15, 0)
    utility = round(gross * 0.30, 0)
    conveyance = round(gross * 0.05, 0)

    daily_rate = gross / working_days if working_days > 0 else 0
    absent_deduction = round(daily_rate * absent_days, 0)
    total_deductions = absent_deduction
    net_salary = gross - total_deductions

    pdf = _SalarySlipPDF()
    pdf.build(
        title="RT International",
        subtitle="Salary Slip",
        period=f"for the month of {_month_name(m)} {y}",
        employee_name=agent.name,
        employee_id=_employee_id(agent),
        designation=agent.designation or "-",
        department=agent.department or "-",
        cnic=agent.cnic or "-",
        doj=agent.date_of_joining.strftime("%d/%m/%Y") if agent.date_of_joining else "-",
        working_days=str(working_days),
        present_days=str(present_days),
        absent_days=str(absent_days),
        earnings=[
            ("Basic Salary", int(basic)),
            ("House Rent Allowance", int(hra)),
            ("Utility Allowance", int(utility)),
            ("Conveyance Allowance", int(conveyance)),
        ],
        deductions=[
            ("Absent Days Deduction", int(absent_deduction)),
        ],
        gross=int(gross),
        total_deductions=int(total_deductions),
        net_salary=int(net_salary),
        generated_at=datetime.now().strftime("%B %d, %Y at %I:%M %p"),
    )

    return Response(
        content=pdf.bytes(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Salary_Slip_{_month_name(m)}_{y}_{agent.name}.pdf"'},
    )
