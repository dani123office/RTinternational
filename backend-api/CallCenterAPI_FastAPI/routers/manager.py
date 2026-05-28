import re
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, CallBack, Transfer, Sale
from routers.auth import require_manager, verify_manager_agent
from schemas import (
    AgentOut, AgentStats, ManagerTeamStats, AgentDetail,
    ManagerCallbackCreate, ManagerTransferCreate, ManagerSaleCreate,
    CallBackUpdate,
)
from routers.transfers import _transfer_out
from routers.sales import _sale_out

def _to_camel(s: str) -> str:
    parts = s.split('_')
    return parts[0] + ''.join(p.capitalize() for p in parts[1:])

def _to_snake(s: str) -> str:
    # Convert camelCase and PascalCase fields to snake_case.
    # Treat DateTime suffixes as datetime to match SQLAlchemy model names.
    s = re.sub(r'DateTime', 'Datetime', s)
    return ''.join('_' + c.lower() if c.isupper() else c for c in s).lstrip('_')

def _model_dict(m):
    out = {}
    for k, v in m.__dict__.items():
        if k.startswith('_'):
            continue
        if isinstance(v, (datetime, date)):
            v = v.isoformat()
        out[_to_camel(k)] = v
    return out

router = APIRouter(prefix="/api/manager", tags=["manager"])


def get_agent_ids(manager: User, db: Session) -> list[int]:
    query = db.query(User).filter(
        User.role == "agent",
        User.is_active == 1,
    )
    if manager.role != "admin":
        query = query.filter(User.manager_id == manager.id)
    agents = query.all()
    return [a.id for a in agents]


def _safe_div(a: int, b: int) -> float:
    if b == 0:
        return 0.0
    return round((a / b) * 100, 1)


@router.get("/team-stats")
def get_team_stats(
    timeframe: str = Query("all_time"),  # "today", "this_week", "all_time"
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    agent_ids = get_agent_ids(manager, db)
    agents = db.query(User).filter(User.id.in_(agent_ids)).all()

    linked_cb_ids = db.query(Transfer.call_back_id).filter(
        Transfer.call_back_id.isnot(None),
        Transfer.employee_id.in_(agent_ids)
    ).distinct().subquery()

    total_callbacks_query = db.query(func.count(CallBack.id)).filter(
        CallBack.id.in_(linked_cb_ids),
        CallBack.scheduled_datetime.isnot(None)
    )
    total_transfers_query = db.query(func.count(Transfer.id)).filter(
        Transfer.employee_id.in_(agent_ids)
    )
    total_sales_query = db.query(func.count(Sale.id)).filter(Sale.employee_id.in_(agent_ids))

    if timeframe == "today":
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        total_callbacks_query = total_callbacks_query.filter(CallBack.created_at >= today_start)
        total_transfers_query = total_transfers_query.filter(Transfer.created_at >= today_start)
        total_sales_query = total_sales_query.filter(Sale.created_at >= today_start)
    elif timeframe == "this_week":
        week_start = datetime.now() - timedelta(days=7)
        total_callbacks_query = total_callbacks_query.filter(CallBack.created_at >= week_start)
        total_transfers_query = total_transfers_query.filter(Transfer.created_at >= week_start)
        total_sales_query = total_sales_query.filter(Sale.created_at >= week_start)

    total_callbacks = total_callbacks_query.scalar() or 0
    total_transfers = total_transfers_query.scalar() or 0
    total_sales = total_sales_query.scalar() or 0
    total_records = total_transfers
    conversion_rate = _safe_div(total_sales, total_records)

    agent_stats_list = []
    for agent in agents:
        ac_q = db.query(func.count(CallBack.id)).filter(
            CallBack.id.in_(linked_cb_ids),
            CallBack.employee_id == agent.id,
            CallBack.scheduled_datetime.isnot(None)
        )
        at_q = db.query(func.count(Transfer.id)).filter(
            Transfer.employee_id == agent.id
        )
        as_q = db.query(func.count(Sale.id)).filter(Sale.employee_id == agent.id)

        if timeframe == "today":
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            ac_q = ac_q.filter(CallBack.created_at >= today_start)
            at_q = at_q.filter(Transfer.created_at >= today_start)
            as_q = as_q.filter(Sale.created_at >= today_start)
        elif timeframe == "this_week":
            week_start = datetime.now() - timedelta(days=7)
            ac_q = ac_q.filter(CallBack.created_at >= week_start)
            at_q = at_q.filter(Transfer.created_at >= week_start)
            as_q = as_q.filter(Sale.created_at >= week_start)

        ac = ac_q.scalar() or 0
        at = at_q.scalar() or 0
        as_ = as_q.scalar() or 0
        a_total = at
        a_cr = _safe_div(as_, a_total)
        agent_stats_list.append(AgentStats(
            agent=AgentOut(
                id=agent.id, name=agent.name, email=agent.email,
                role=agent.role, isActive=agent.is_active, managerId=agent.manager_id,
            ),
            callbacks=ac, transfers=at, sales=as_, conversionRate=a_cr,
        ))

    agent_stats_list.sort(key=lambda x: x.conversionRate, reverse=True)

    return ManagerTeamStats(
        totalCallbacks=total_callbacks,
        totalTransfers=total_transfers,
        totalSales=total_sales,
        conversionRate=conversion_rate,
        agents=agent_stats_list,
    )


@router.get("/agents")
def get_agents(
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    agents = db.query(User).filter(
        User.manager_id == manager.id,
        User.role == "agent",
        User.is_active == 1,
    ).all()
    return [
        AgentOut(
            id=a.id, name=a.name, email=a.email,
            role=a.role, isActive=a.is_active, managerId=a.manager_id,
        )
        for a in agents
    ]


@router.get("/agent/{agent_id}")
def get_agent_detail(
    agent_id: int,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    agent = verify_manager_agent(manager, agent_id, db)

    linked_cb_ids = db.query(Transfer.call_back_id).filter(
        Transfer.call_back_id.isnot(None),
        Transfer.employee_id == agent.id
    ).distinct().subquery()
    callbacks = db.query(CallBack).filter(
        CallBack.employee_id == agent.id,
        CallBack.id.in_(linked_cb_ids)
    ).all()
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
        ),
        callbacks=[],
        transfers=[_transfer_out(t, t.customer) for t in transfers],
        sales=[_sale_out(s, s.customer) for s in sales],
        stats=AgentStats(
            agent=AgentOut(
                id=agent.id, name=agent.name, email=agent.email,
                role=agent.role, isActive=agent.is_active, managerId=agent.manager_id,
            ),
            callbacks=ac, transfers=at, sales=as_, conversionRate=a_cr,
        ),
    )


@router.get("/callbacks")
def get_manager_callbacks(
    agent_id: int | None = Query(None),
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    agent_ids = get_agent_ids(manager, db)
    # Only callbacks linked to a transfer (created via "Schedule as Callback")
    linked_cb_ids = db.query(Transfer.call_back_id).filter(
        Transfer.call_back_id.isnot(None),
        Transfer.employee_id.in_(agent_ids)
    ).distinct().subquery()
    query = db.query(CallBack).filter(CallBack.id.in_(linked_cb_ids), CallBack.scheduled_datetime.isnot(None))
    if agent_id:
        verify_manager_agent(manager, agent_id, db)
        query = query.filter(CallBack.employee_id == agent_id)
    if status:
        query = query.filter(CallBack.status == status)
    total = query.count()
    callbacks = query.order_by(CallBack.scheduled_datetime.desc()).offset(skip).limit(limit).all()

    from models import Customer
    from routers.callbacks import _build_callback_out
    items = []
    for cb in callbacks:
        customer = db.query(Customer).filter(Customer.id == cb.customer_id).first()
        items.append(_build_callback_out(cb, customer))

    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/transfers")
def get_manager_transfers(
    agent_id: int | None = Query(None),
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    agent_ids = get_agent_ids(manager, db)
    query = db.query(Transfer).filter(Transfer.employee_id.in_(agent_ids))
    if agent_id:
        verify_manager_agent(manager, agent_id, db)
        query = query.filter(Transfer.employee_id == agent_id)
    if status:
        query = query.filter(Transfer.status == status)
    total = query.count()
    transfers = query.order_by(Transfer.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": [_transfer_out(t, t.customer) for t in transfers], "total": total, "skip": skip, "limit": limit}


@router.get("/sales")
def get_manager_sales(
    agent_id: int | None = Query(None),
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    agent_ids = get_agent_ids(manager, db)
    query = db.query(Sale).filter(Sale.employee_id.in_(agent_ids))
    if agent_id:
        verify_manager_agent(manager, agent_id, db)
        query = query.filter(Sale.employee_id == agent_id)
    if status:
        query = query.filter(Sale.cot_status == status)
    total = query.count()
    sales = query.order_by(Sale.created_at.desc()).offset(skip).limit(limit).all()
    from models import Customer
    items = []
    for s in sales:
        customer = db.query(Customer).filter(Customer.id == s.customer_id).first()
        items.append(_sale_out(s, customer))
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.post("/callback", status_code=201)
def create_manager_callback(
    data: ManagerCallbackCreate,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    import traceback
    try:
        print(f"\n=== MANAGER CALLBACK START ===")
        print(f"data.employeeId={data.employeeId}, data.customerId={data.customerId}, data.transferId={data.transferId}, data.scheduledDateTime={data.scheduledDateTime}")
        verify_manager_agent(manager, data.employeeId, db)
        print("verify_manager_agent OK")
        
        transfer = None
        if data.transferId:
            transfer = db.query(Transfer).filter(Transfer.id == data.transferId).first()
            print(f"transfer found: {transfer is not None}")

        # Check if callback already exists for this customer
        cb = db.query(CallBack).filter(CallBack.customer_id == data.customerId).first()
        if cb:
            print(f"Existing callback found for customer, rescheduling: {cb.id}")
            cb.employee_id = data.employeeId
            cb.scheduled_datetime = data.scheduledDateTime
            if data.notes:
                cb.notes = (cb.notes or "") + f"\n[Rescheduled by Manager] " + data.notes
            cb.status = data.status or "pending"
            if data.accountNumber is not None:
                cb.account_number = data.accountNumber
            if data.mpan is not None:
                cb.mpan = data.mpan
            if data.mprn is not None:
                cb.mprn = data.mprn
            if data.msn is not None:
                cb.msn = data.msn
        else:
            cb = CallBack(
                employee_id=data.employeeId,
                customer_id=data.customerId,
                created_by_manager_id=manager.id,
                scheduled_datetime=data.scheduledDateTime,
                notes=data.notes,
                status=data.status or "pending",
                account_number=data.accountNumber,
                mpan=data.mpan,
                mprn=data.mprn,
                msn=data.msn,
            )
            db.add(cb)
            print("cb added")
        
        if transfer:
            cb.elec_offer_contract_length = transfer.elec_offer_contract_length
            cb.elec_offer_supplier = transfer.elec_offer_supplier
            cb.elec_offer_meter_type = transfer.elec_offer_meter_type
            cb.elec_offer_commission_type = transfer.elec_offer_commission_type
            cb.elec_commission_day_rate = transfer.elec_commission_day_rate
            cb.elec_commission_night_rate = transfer.elec_commission_night_rate
            cb.elec_commission_evening_rate = transfer.elec_commission_evening_rate
            cb.elec_commission_standing = transfer.elec_commission_standing
            cb.elec_noncom_day_rate = transfer.elec_noncom_day_rate
            cb.elec_noncom_night_rate = transfer.elec_noncom_night_rate
            cb.elec_noncom_evening_rate = transfer.elec_noncom_evening_rate
            cb.elec_noncom_standing = transfer.elec_noncom_standing
            cb.elec_broker_charge = transfer.elec_broker_charge
            
            cb.gas_offer_contract_length = transfer.gas_offer_contract_length
            cb.gas_offer_supplier = transfer.gas_offer_supplier
            cb.gas_commission_unit_rate = transfer.gas_commission_unit_rate
            cb.gas_commission_standing = transfer.gas_commission_standing
            cb.gas_noncom_unit_rate = transfer.gas_noncom_unit_rate
            cb.gas_noncom_standing = transfer.gas_noncom_standing
            cb.gas_broker_charge = transfer.gas_broker_charge
        else:
            if data.offeredElectricityRates:
                r = data.offeredElectricityRates[0]
                cb.elec_offer_contract_length = r.contractLength
                cb.elec_offer_supplier = r.supplier
                cb.elec_offer_meter_type = r.meterType
                cb.elec_offer_commission_type = r.commissionType
                cb.elec_commission_day_rate = r.dayUnitRate
                cb.elec_commission_night_rate = r.nightUnitRate
                cb.elec_commission_evening_rate = r.eveningUnitRate
                cb.elec_commission_standing = r.standingRate
                cb.elec_noncom_day_rate = r.nonCommissionDayRate
                cb.elec_noncom_night_rate = r.nonCommissionNightRate
                cb.elec_noncom_evening_rate = r.nonCommissionEveningRate
                cb.elec_noncom_standing = r.nonCommissionStandingRate
                cb.elec_broker_charge = r.brokerServiceCharge
            if data.offeredGasRates:
                r = data.offeredGasRates[0]
                cb.gas_offer_contract_length = r.contractLength
                cb.gas_offer_supplier = r.supplier
                cb.gas_commission_unit_rate = r.unitRate
                cb.gas_commission_standing = r.standingRate
                cb.gas_noncom_unit_rate = r.nonCommissionUnitRate
                cb.gas_noncom_standing = r.nonCommissionStandingRate
                cb.gas_broker_charge = r.brokerServiceCharge

        db.flush()
        print(f"cb flushed, cb.id={cb.id}")

        if transfer:
            transfer.call_back_id = cb.id
            transfer.status = "chasing"
            print(f"transfer updated: call_back_id={cb.id}, status=chasing")

        db.commit()
        print("db committed")
        db.refresh(cb)
        print("cb refreshed")

        from models import Customer
        from routers.callbacks import _build_callback_out
        customer = db.query(Customer).filter(Customer.id == cb.customer_id).first()
        result = _build_callback_out(cb, customer)
        print(f"=== MANAGER CALLBACK SUCCESS ===")
        return result
    except HTTPException:
        print("HTTPException caught, rolling back")
        db.rollback()
        raise
    except Exception as e:
        print(f"EXCEPTION: {type(e).__name__}: {e}")
        traceback.print_exc()
        try:
            db.rollback()
        except Exception as rb_err:
            print(f"rollback also failed: {rb_err}")
        raise HTTPException(status_code=400, detail=f"Callback error: {type(e).__name__}: {str(e)}")


@router.post("/transfer", status_code=201)
def create_manager_transfer(
    data: ManagerTransferCreate,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        verify_manager_agent(manager, data.employeeId, db)
        existing = db.query(Transfer).filter(Transfer.customer_id == data.customerId).first()
        if existing:
            raise HTTPException(status_code=400, detail="A transfer already exists for this customer. Only one transfer per customer is allowed.")
        t = Transfer(
            employee_id=data.employeeId,
            customer_id=data.customerId,
            utility_type=data.utilityType,
            elec_offer_supplier=data.supplier,
            status=data.status or "pending",
            scheduled_datetime=data.scheduledDateTime,
            account_number=data.accountNumber,
            mpan=data.mpan,
            mprn=data.mprn,
            msn=data.msn,
            notes=data.notes,
        )
        db.add(t)
        db.commit()
        db.refresh(t)
        return _transfer_out(t, t.customer)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create transfer: {str(e)}")


@router.post("/sale", status_code=201)
def create_manager_sale(
    data: ManagerSaleCreate,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        verify_manager_agent(manager, data.employeeId, db)
        existing = db.query(Sale).filter(Sale.customer_id == data.customerId).first()
        if existing:
            raise HTTPException(status_code=400, detail="A sale already exists for this customer. Only one sale per customer is allowed.")
        s = Sale(
            employee_id=data.employeeId,
            customer_id=data.customerId,
            transfer_id=data.transferId,
            owner_full_name=data.ownerFullName,
            home_address=data.homeAddress,
            date_of_birth=data.dateOfBirth,
            business_type=data.businessType,
            bill_frequency=data.billFrequency,
            payment_method=data.paymentMethod,
            bank_name=data.bankName,
            account_type=data.accountType,
            account_title=data.accountTitle,
            sort_code=data.sortCode,
            bank_account_number=data.bankAccountNumber,
            notes=data.notes,
        )
        db.add(s)
        db.commit()
        db.refresh(s)
        return _sale_out(s, s.customer)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create sale: {str(e)}")


@router.put("/callbacks/{callback_id}")
def update_callback(
    callback_id: int,
    dto: CallBackUpdate,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        cb = db.query(CallBack).filter(CallBack.id == callback_id).first()
        if not cb:
            raise HTTPException(status_code=404, detail="Callback not found")
        agent_ids = get_agent_ids(manager, db)
        linked = db.query(Transfer).filter(
            Transfer.call_back_id == callback_id,
            Transfer.employee_id.in_(agent_ids)
        ).first()
        if not linked:
            raise HTTPException(status_code=403, detail="Cannot modify this callback")
        
        from models import Customer, ElectricityMeter, GasMeter
        from routers.callbacks import _build_callback_out

        if getattr(dto, 'assignedAgentId', None) is not None:
            if dto.assignedAgentId in agent_ids:
                cb.employee_id = dto.assignedAgentId
            else:
                raise HTTPException(status_code=400, detail="Cannot assign callback to agent outside team")
        if dto.scheduledDateTime is not None:
            cb.scheduled_datetime = dto.scheduledDateTime
        if dto.notes is not None:
            cb.notes = dto.notes
        if dto.status is not None:
            cb.status = dto.status
        if dto.outcome is not None:
            cb.outcome = dto.outcome

        if dto.offeredElectricityRates is not None:
            if dto.offeredElectricityRates:
                r = dto.offeredElectricityRates[0]
                cb.elec_offer_contract_length = r.contractLength
                cb.elec_offer_supplier = r.supplier
                cb.elec_offer_meter_type = r.meterType
                cb.elec_offer_commission_type = r.commissionType
                cb.elec_commission_day_rate = r.dayUnitRate
                cb.elec_commission_night_rate = r.nightUnitRate
                cb.elec_commission_evening_rate = r.eveningUnitRate
                cb.elec_commission_standing = r.standingRate
                cb.elec_noncom_day_rate = r.nonCommissionDayRate
                cb.elec_noncom_night_rate = r.nonCommissionNightRate
                cb.elec_noncom_evening_rate = r.nonCommissionEveningRate
                cb.elec_noncom_standing = r.nonCommissionStandingRate
                cb.elec_broker_charge = r.brokerServiceCharge
            else:
                cb.elec_offer_contract_length = None
                cb.elec_offer_supplier = None
                cb.elec_offer_meter_type = None
                cb.elec_offer_commission_type = None
                cb.elec_commission_day_rate = None
                cb.elec_commission_night_rate = None
                cb.elec_commission_evening_rate = None
                cb.elec_commission_standing = None
                cb.elec_noncom_day_rate = None
                cb.elec_noncom_night_rate = None
                cb.elec_noncom_evening_rate = None
                cb.elec_noncom_standing = None
                cb.elec_broker_charge = None

        if dto.offeredGasRates is not None:
            if dto.offeredGasRates:
                r = dto.offeredGasRates[0]
                cb.gas_offer_contract_length = r.contractLength
                cb.gas_offer_supplier = r.supplier
                cb.gas_commission_unit_rate = r.unitRate
                cb.gas_commission_standing = r.standingRate
                cb.gas_noncom_unit_rate = r.nonCommissionUnitRate
                cb.gas_noncom_standing = r.nonCommissionStandingRate
                cb.gas_broker_charge = r.brokerServiceCharge
            else:
                cb.gas_offer_contract_length = None
                cb.gas_offer_supplier = None
                cb.gas_commission_unit_rate = None
                cb.gas_commission_standing = None
                cb.gas_noncom_unit_rate = None
                cb.gas_noncom_standing = None
                cb.gas_broker_charge = None

        customer = db.query(Customer).filter(Customer.id == cb.customer_id).first()
        if customer:
            if dto.businessName is not None:
                customer.business_name = dto.businessName
            if dto.businessAddress is not None:
                customer.business_address = dto.businessAddress
            if dto.businessPhone is not None:
                customer.business_phone = dto.businessPhone
            if dto.ownerName is not None:
                customer.owner_name = dto.ownerName
            if dto.ownerPhone is not None:
                customer.owner_phone = dto.ownerPhone
            if dto.email is not None:
                customer.email = dto.email
            if dto.utilityType is not None:
                customer.utility_type = dto.utilityType
            if dto.postcode is not None:
                customer.postcode = dto.postcode

            if dto.electricityRates is not None:
                db.query(ElectricityMeter).filter(ElectricityMeter.customer_id == customer.id).delete()
                db.flush()
                for rate in dto.electricityRates:
                    db.add(ElectricityMeter(
                        customer_id=customer.id, meter_number=rate.meterNumber,
                        current_supplier=rate.currentSupplier, supply_number=rate.supplyNumber,
                        day_unit_rate=rate.dayUnitRate, night_unit_rate=rate.nightUnitRate,
                        evening_unit_rate=rate.eveningUnitRate, standing_rate=rate.standingRate,
                        monthly_bill=rate.monthlyBill, contract_end_date=rate.contractEndDate,
                    ))

            if dto.gasRates is not None:
                db.query(GasMeter).filter(GasMeter.customer_id == customer.id).delete()
                db.flush()
                for rate in dto.gasRates:
                    db.add(GasMeter(
                        customer_id=customer.id, meter_number=rate.meterNumber,
                        current_supplier=rate.currentSupplier, unit_rate=rate.unitRate,
                        standing_rate=rate.standingRate, monthly_bill=rate.monthlyBill,
                        contract_end_date=rate.contractEndDate,
                    ))

        db.commit()
        db.refresh(cb)
        customer = db.query(Customer).filter(Customer.id == cb.customer_id).first()
        return _build_callback_out(cb, customer)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update callback: {str(e)}")

# Ensure we import CallBackUpdate schema globally in manager.py router.
# We will do a replacement or define CallBackUpdate in the function parameters using schemas.CallBackUpdate
# Wait! Let's just import CallBackUpdate inside the file at the top or in schemas import block.
# Let's import CallBackUpdate directly in the route function parameter using standard annotation.
# FastAPI router will require CallBackUpdate to be imported. So let's import it in the schemas import block!


@router.put("/transfers/{transfer_id}")
def update_transfer(
    transfer_id: int,
    data: dict,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        t = db.query(Transfer).filter(Transfer.id == transfer_id).first()
        if not t:
            raise HTTPException(status_code=404, detail="Transfer not found")
        agent_ids = get_agent_ids(manager, db)
        if t.employee_id not in agent_ids:
            raise HTTPException(status_code=403, detail="Cannot modify this transfer")
        for key, val in data.items():
            attr = _to_snake(key)
            if hasattr(t, attr):
                setattr(t, attr, val)
        db.commit()
        db.refresh(t)
        return _transfer_out(t, t.customer)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update transfer: {str(e)}")


@router.put("/sales/{sale_id}")
def update_sale(
    sale_id: int,
    data: dict,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        s = db.query(Sale).filter(Sale.id == sale_id).first()
        if not s:
            raise HTTPException(status_code=404, detail="Sale not found")
        agent_ids = get_agent_ids(manager, db)
        if s.employee_id not in agent_ids:
            raise HTTPException(status_code=403, detail="Cannot modify this sale")
        for key, val in data.items():
            attr = _to_snake(key)
            if hasattr(s, attr):
                setattr(s, attr, val)
        db.commit()
        db.refresh(s)
        return _sale_out(s, s.customer)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update sale: {str(e)}")


@router.delete("/callbacks/{callback_id}")
def delete_callback(
    callback_id: int,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        cb = db.query(CallBack).filter(CallBack.id == callback_id).first()
        if not cb:
            raise HTTPException(status_code=404, detail="Callback not found")
        agent_ids = get_agent_ids(manager, db)
        linked = db.query(Transfer).filter(
            Transfer.call_back_id == callback_id,
            Transfer.employee_id.in_(agent_ids)
        ).first()
        if not linked:
            raise HTTPException(status_code=403, detail="Cannot delete this callback")
        db.delete(cb)
        db.commit()
        return {"ok": True}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete callback: {str(e)}")


@router.delete("/transfers/{transfer_id}")
def delete_transfer(
    transfer_id: int,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        t = db.query(Transfer).filter(Transfer.id == transfer_id).first()
        if not t:
            raise HTTPException(status_code=404, detail="Transfer not found")
        agent_ids = get_agent_ids(manager, db)
        if t.employee_id not in agent_ids:
            raise HTTPException(status_code=403, detail="Cannot delete this transfer")
        db.delete(t)
        db.commit()
        return {"ok": True}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete transfer: {str(e)}")


@router.delete("/sales/{sale_id}")
def delete_sale(
    sale_id: int,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    try:
        s = db.query(Sale).filter(Sale.id == sale_id).first()
        if not s:
            raise HTTPException(status_code=404, detail="Sale not found")
        agent_ids = get_agent_ids(manager, db)
        if s.employee_id not in agent_ids:
            raise HTTPException(status_code=403, detail="Cannot delete this sale")
        db.delete(s)
        db.commit()
        return {"ok": True}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete sale: {str(e)}")


@router.get("/notifications")
def get_notifications(
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    agent_ids = get_agent_ids(manager, db)
    agents_map = {a.id: a.name for a in db.query(User).filter(User.id.in_(agent_ids)).all()}

    events = []
    transfers = db.query(Transfer).filter(Transfer.employee_id.in_(agent_ids)).order_by(Transfer.created_at.desc()).limit(20).all()
    for t in transfers:
        events.append({
            "type": "transfer",
            "action": "created",
            "agentName": agents_map.get(t.employee_id, "Unknown"),
            "description": f"created a transfer",
            "timestamp": t.created_at.isoformat() if t.created_at else None,
            "id": t.id,
        })

    sales = db.query(Sale).filter(Sale.employee_id.in_(agent_ids)).order_by(Sale.created_at.desc()).limit(20).all()
    for s in sales:
        events.append({
            "type": "sale",
            "action": "closed",
            "agentName": agents_map.get(s.employee_id, "Unknown"),
            "description": f"closed a sale",
            "timestamp": s.created_at.isoformat() if s.created_at else None,
            "id": s.id,
        })

    events.sort(key=lambda e: e.get("timestamp") or "", reverse=True)
    return events[:50]

# reload marker