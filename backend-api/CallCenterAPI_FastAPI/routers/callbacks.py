from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import CallBack, Customer, ElectricityMeter, GasMeter, Transfer, User
from schemas import CallBackOut, CustomerOut, ElectricityMeterOut, GasMeterOut, CallBackCreate, CallBackUpdate
from routers.auth import get_current_user

router = APIRouter(prefix="/api/callbacks", tags=["callbacks"])


def _customer_out(c) -> CustomerOut:
    return CustomerOut(
        id=c.id,
        businessName=c.business_name,
        ownerName=c.owner_name,
        businessPhone=c.business_phone,
        ownerPhone=c.owner_phone,
        email=c.email,
        businessAddress=c.business_address,
        postcode=c.postcode,
        utilityType=c.utility_type,
        employeeId=c.created_by,
        createdAt=c.created_at,
        electricityMeters=[ElectricityMeterOut(
            id=m.id, customerId=m.customer_id, meterNumber=m.meter_number,
            currentSupplier=m.current_supplier, supplyNumber=m.supply_number,
            dayUnitRate=m.day_unit_rate, nightUnitRate=m.night_unit_rate,
            eveningUnitRate=m.evening_unit_rate, standingRate=m.standing_rate,
            monthlyBill=m.monthly_bill, contractEndDate=m.contract_end_date,
        ) for m in c.electricity_meters],
        gasMeters=[GasMeterOut(
            id=m.id, customerId=m.customer_id, meterNumber=m.meter_number,
            currentSupplier=m.current_supplier, unitRate=m.unit_rate,
            standingRate=m.standing_rate, monthlyBill=m.monthly_bill,
            contractEndDate=m.contract_end_date,
        ) for m in c.gas_meters],
    )


def _elec_rates_out(c):
    if not c.elec_offer_contract_length:
        return []
    return [{
        "id": 0,
        "callbackId": c.id,
        "contractLength": c.elec_offer_contract_length,
        "supplier": c.elec_offer_supplier,
        "meterType": c.elec_offer_meter_type,
        "commissionType": c.elec_offer_commission_type,
        "dayUnitRate": c.elec_commission_day_rate,
        "nightUnitRate": c.elec_commission_night_rate,
        "eveningUnitRate": c.elec_commission_evening_rate,
        "standingRate": c.elec_commission_standing,
        "nonCommissionDayRate": c.elec_noncom_day_rate,
        "nonCommissionNightRate": c.elec_noncom_night_rate,
        "nonCommissionEveningRate": c.elec_noncom_evening_rate,
        "nonCommissionStandingRate": c.elec_noncom_standing,
        "brokerServiceCharge": c.elec_broker_charge,
    }]


def _gas_rates_out(c):
    if not c.gas_offer_contract_length:
        return []
    return [{
        "id": 0,
        "callbackId": c.id,
        "contractLength": c.gas_offer_contract_length,
        "supplier": c.gas_offer_supplier,
        "unitRate": c.gas_commission_unit_rate,
        "standingRate": c.gas_commission_standing,
        "nonCommissionUnitRate": c.gas_noncom_unit_rate,
        "nonCommissionStandingRate": c.gas_noncom_standing,
        "brokerServiceCharge": c.gas_broker_charge,
    }]


def _build_callback_out(c: CallBack, customer: Customer = None) -> CallBackOut:
    customer_out = _customer_out(customer) if customer else None
    sd = c.scheduled_datetime
    t = c.transfers[0] if c.transfers else None
    transfer_id = t.id if t else None
    return CallBackOut(
        id=c.id,
        employeeId=c.employee_id,
        customerId=c.customer_id,
        scheduledDateTime=sd,
        dayOfWeek=sd.strftime("%A") if sd else None,
        notes=c.notes,
        status=c.status,
        outcome=c.outcome,
        notInterestedReason=c.not_interested_reason,
        createdAt=c.created_at,
        agentName=c.employee.name if c.employee else "Unknown Agent",
        customer=customer_out,
        offeredElectricityRates=_elec_rates_out(c),
        offeredGasRates=_gas_rates_out(c),
        transferId=transfer_id,
        accountNumber=c.account_number,
        mpan=c.mpan,
        mprn=c.mprn,
        msn=c.msn,
        linkedTransferAccountNumber=t.account_number if t else None,
        linkedTransferMpan=t.mpan if t else None,
        linkedTransferMprn=t.mprn if t else None,
        linkedTransferMsn=t.msn if t else None,
    )


@router.get("")
def get_callbacks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    query = db.query(CallBack).filter(CallBack.employee_id == current_user.id, CallBack.scheduled_datetime.isnot(None))
    total = query.count()
    callbacks = query.order_by(CallBack.scheduled_datetime.desc()).offset(skip).limit(limit).all()
    items = [_build_callback_out(c, db.query(Customer).filter(Customer.id == c.customer_id).first()) for c in callbacks]
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/{id}")
def get_callback(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(CallBack).filter(CallBack.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Callback not found")
        
    is_auth = (c.employee_id == current_user.id)
    if not is_auth and current_user.role == "manager":
        creator = db.query(User).filter(User.id == c.employee_id).first()
        if creator and creator.manager_id == current_user.id:
            is_auth = True
            
    if not is_auth:
        raise HTTPException(status_code=403, detail="Not authorized to access this callback")
    customer = db.query(Customer).filter(Customer.id == c.customer_id).first()
    return _build_callback_out(c, customer)


@router.post("")
def create_callback(dto: CallBackCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        dt = dto.scheduledDateTime
        
        # Check if callback already exists for this customer
        callback = db.query(CallBack).filter(CallBack.customer_id == dto.customerId).first()
        if callback:
            callback.employee_id = current_user.id
            callback.scheduled_datetime = dt
            if dto.notes:
                callback.notes = (callback.notes or "") + f"\n[Rescheduled by Agent] " + dto.notes
            callback.status = "pending"
        else:
            callback = CallBack(
                employee_id=current_user.id,
                customer_id=dto.customerId,
                scheduled_datetime=dt,
                notes=dto.notes,
                status="pending",
            )
            db.add(callback)

        if dto.offeredElectricityRates:
            r = dto.offeredElectricityRates[0]
            callback.elec_offer_contract_length = r.contractLength
            callback.elec_offer_supplier = r.supplier
            callback.elec_offer_meter_type = r.meterType
            callback.elec_offer_commission_type = r.commissionType
            callback.elec_commission_day_rate = r.dayUnitRate
            callback.elec_commission_night_rate = r.nightUnitRate
            callback.elec_commission_evening_rate = r.eveningUnitRate
            callback.elec_commission_standing = r.standingRate
            callback.elec_noncom_day_rate = r.nonCommissionDayRate
            callback.elec_noncom_night_rate = r.nonCommissionNightRate
            callback.elec_noncom_evening_rate = r.nonCommissionEveningRate
            callback.elec_noncom_standing = r.nonCommissionStandingRate
            callback.elec_broker_charge = r.brokerServiceCharge
        if dto.offeredGasRates:
            r = dto.offeredGasRates[0]
            callback.gas_offer_contract_length = r.contractLength
            callback.gas_offer_supplier = r.supplier
            callback.gas_commission_unit_rate = r.unitRate
            callback.gas_commission_standing = r.standingRate
            callback.gas_noncom_unit_rate = r.nonCommissionUnitRate
            callback.gas_noncom_standing = r.nonCommissionStandingRate
            callback.gas_broker_charge = r.brokerServiceCharge

        db.flush()
        # Link callback to transfer automatically if exists
        from models import Transfer
        transfer = db.query(Transfer).filter(Transfer.customer_id == callback.customer_id).first()
        if transfer:
            transfer.call_back_id = callback.id
            transfer.status = "chasing"

        db.commit()
        db.refresh(callback)
        customer = db.query(Customer).filter(Customer.id == callback.customer_id).first()
        return _build_callback_out(callback, customer)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create callback: {str(e)}")


@router.put("/{id}")
def update_callback(id: int, dto: CallBackUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    callback = db.query(CallBack).filter(CallBack.id == id).first()
    if not callback:
        raise HTTPException(status_code=404, detail="Callback not found")
        
    is_auth = (callback.employee_id == current_user.id)
    if not is_auth and current_user.role == "manager":
        creator = db.query(User).filter(User.id == callback.employee_id).first()
        if creator and creator.manager_id == current_user.id:
            is_auth = True
            
    if not is_auth:
        raise HTTPException(status_code=403, detail="Not authorized to update this callback")
    try:
        if dto.scheduledDateTime is not None:
            callback.scheduled_datetime = dto.scheduledDateTime
        if dto.notes is not None:
            callback.notes = dto.notes
        if dto.status is not None:
            callback.status = dto.status
        if dto.outcome is not None:
            callback.outcome = dto.outcome
        if dto.notInterestedReason is not None:
            callback.not_interested_reason = dto.notInterestedReason
        if dto.accountNumber is not None:
            callback.account_number = dto.accountNumber
        if dto.mpan is not None:
            callback.mpan = dto.mpan
        if dto.mprn is not None:
            callback.mprn = dto.mprn
        if dto.msn is not None:
            callback.msn = dto.msn

        if dto.offeredElectricityRates is not None:
            if dto.offeredElectricityRates:
                r = dto.offeredElectricityRates[0]
                callback.elec_offer_contract_length = r.contractLength
                callback.elec_offer_supplier = r.supplier
                callback.elec_offer_meter_type = r.meterType
                callback.elec_offer_commission_type = r.commissionType
                callback.elec_commission_day_rate = r.dayUnitRate
                callback.elec_commission_night_rate = r.nightUnitRate
                callback.elec_commission_evening_rate = r.eveningUnitRate
                callback.elec_commission_standing = r.standingRate
                callback.elec_noncom_day_rate = r.nonCommissionDayRate
                callback.elec_noncom_night_rate = r.nonCommissionNightRate
                callback.elec_noncom_evening_rate = r.nonCommissionEveningRate
                callback.elec_noncom_standing = r.nonCommissionStandingRate
                callback.elec_broker_charge = r.brokerServiceCharge
            else:
                callback.elec_offer_contract_length = None
                callback.elec_offer_supplier = None
                callback.elec_offer_meter_type = None
                callback.elec_offer_commission_type = None
                callback.elec_commission_day_rate = None
                callback.elec_commission_night_rate = None
                callback.elec_commission_evening_rate = None
                callback.elec_commission_standing = None
                callback.elec_noncom_day_rate = None
                callback.elec_noncom_night_rate = None
                callback.elec_noncom_evening_rate = None
                callback.elec_noncom_standing = None
                callback.elec_broker_charge = None

        if dto.offeredGasRates is not None:
            if dto.offeredGasRates:
                r = dto.offeredGasRates[0]
                callback.gas_offer_contract_length = r.contractLength
                callback.gas_offer_supplier = r.supplier
                callback.gas_commission_unit_rate = r.unitRate
                callback.gas_commission_standing = r.standingRate
                callback.gas_noncom_unit_rate = r.nonCommissionUnitRate
                callback.gas_noncom_standing = r.nonCommissionStandingRate
                callback.gas_broker_charge = r.brokerServiceCharge
            else:
                callback.gas_offer_contract_length = None
                callback.gas_offer_supplier = None
                callback.gas_commission_unit_rate = None
                callback.gas_commission_standing = None
                callback.gas_noncom_unit_rate = None
                callback.gas_noncom_standing = None
                callback.gas_broker_charge = None

        customer = db.query(Customer).filter(Customer.id == callback.customer_id).first()
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
        db.refresh(callback)
        customer = db.query(Customer).filter(Customer.id == callback.customer_id).first()
        return _build_callback_out(callback, customer)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update callback: {str(e)}")


@router.delete("/{id}")
def delete_callback(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    callback = db.query(CallBack).filter(CallBack.id == id).first()
    if not callback:
        raise HTTPException(status_code=404, detail="Callback not found")
        
    is_auth = (callback.employee_id == current_user.id)
    if not is_auth and current_user.role == "manager":
        creator = db.query(User).filter(User.id == callback.employee_id).first()
        if creator and creator.manager_id == current_user.id:
            is_auth = True
            
    if not is_auth:
        raise HTTPException(status_code=403, detail="Not authorized to delete this callback")
    try:
        db.delete(callback)
        db.commit()
        return {"success": True}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete callback: {str(e)}")
