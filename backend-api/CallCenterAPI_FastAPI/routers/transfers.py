from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Transfer, Customer, CallBack, User
from schemas import TransferOut, CustomerOut, ElectricityMeterOut, GasMeterOut, TransferCreate, TransferUpdate
from datetime import datetime
from routers.auth import get_current_user

router = APIRouter(prefix="/api/transfers", tags=["transfers"])


def _customer_out(customer) -> CustomerOut:
    return CustomerOut(
        id=customer.id,
        businessName=customer.business_name,
        ownerName=customer.owner_name,
        businessPhone=customer.business_phone,
        ownerPhone=customer.owner_phone,
        email=customer.email,
        businessAddress=customer.business_address,
        postcode=customer.postcode,
        utilityType=customer.utility_type,
        employeeId=customer.created_by,
        createdAt=customer.created_at,
        electricityMeters=[ElectricityMeterOut(
            id=m.id, customerId=m.customer_id, meterNumber=m.meter_number,
            currentSupplier=m.current_supplier, supplyNumber=m.supply_number,
            dayUnitRate=m.day_unit_rate, nightUnitRate=m.night_unit_rate,
            eveningUnitRate=m.evening_unit_rate, standingRate=m.standing_rate,
            monthlyBill=m.monthly_bill, contractEndDate=m.contract_end_date,
        ) for m in customer.electricity_meters],
        gasMeters=[GasMeterOut(
            id=m.id, customerId=m.customer_id, meterNumber=m.meter_number,
            currentSupplier=m.current_supplier, unitRate=m.unit_rate,
            standingRate=m.standing_rate, monthlyBill=m.monthly_bill,
            contractEndDate=m.contract_end_date,
        ) for m in customer.gas_meters],
    )


def _elec_rates_out(t):
    if not t.elec_offer_contract_length:
        return []
    return [{
        "id": 0, "transferId": t.id,
        "contractLength": t.elec_offer_contract_length,
        "supplier": t.elec_offer_supplier,
        "meterType": t.elec_offer_meter_type,
        "commissionType": t.elec_offer_commission_type,
        "dayUnitRate": t.elec_commission_day_rate,
        "nightUnitRate": t.elec_commission_night_rate,
        "eveningUnitRate": t.elec_commission_evening_rate,
        "standingRate": t.elec_commission_standing,
        "nonCommissionDayRate": t.elec_noncom_day_rate,
        "nonCommissionNightRate": t.elec_noncom_night_rate,
        "nonCommissionEveningRate": t.elec_noncom_evening_rate,
        "nonCommissionStandingRate": t.elec_noncom_standing,
        "brokerServiceCharge": t.elec_broker_charge,
    }]


def _gas_rates_out(t):
    if not t.gas_offer_contract_length:
        return []
    return [{
        "id": 0, "transferId": t.id,
        "contractLength": t.gas_offer_contract_length,
        "supplier": t.gas_offer_supplier,
        "unitRate": t.gas_commission_unit_rate,
        "standingRate": t.gas_commission_standing,
        "nonCommissionUnitRate": t.gas_noncom_unit_rate,
        "nonCommissionStandingRate": t.gas_noncom_standing,
        "brokerServiceCharge": t.gas_broker_charge,
    }]


def _transfer_out(t: Transfer, customer: Customer = None) -> TransferOut:
    customer_out = _customer_out(customer) if customer else None
    return TransferOut(
        id=t.id,
        employeeId=t.employee_id,
        customerId=t.customer_id,
        callBackId=t.call_back_id,
        utilityType=t.utility_type,
        supplier=t.elec_offer_supplier,
        status=t.status,
        outcome=t.outcome,
        notInterestedReason=t.not_interested_reason,
        scheduledDateTime=t.scheduled_datetime,
        accountNumber=t.account_number,
        mpan=t.mpan,
        mprn=t.mprn,
        msn=t.msn,
        notes=t.notes,
        createdAt=t.created_at,
        customer=customer_out,
        offeredElectricityRates=_elec_rates_out(t),
        offeredGasRates=_gas_rates_out(t),
        agentName=t.employee.name if t.employee else "Unknown Agent",
    )


@router.get("")
def get_transfers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    query = db.query(Transfer).filter(Transfer.employee_id == current_user.id)
    total = query.count()
    transfers = query.order_by(Transfer.created_at.desc()).offset(skip).limit(limit).all()
    items = [_transfer_out(t, db.query(Customer).filter(Customer.id == t.customer_id).first()) for t in transfers]
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/{id}")
def get_transfer(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(Transfer).filter(Transfer.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    is_auth = (t.employee_id == current_user.id)
    if not is_auth and current_user.role == "manager":
        creator = db.query(User).filter(User.id == t.employee_id).first()
        if creator and creator.manager_id == current_user.id:
            is_auth = True
            
    if not is_auth:
        raise HTTPException(status_code=403, detail="Not authorized to access this transfer")
        
    customer = db.query(Customer).filter(Customer.id == t.customer_id).first()
    return _transfer_out(t, customer)


@router.post("")
def create_transfer(dto: TransferCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        existing = db.query(Transfer).filter(Transfer.customer_id == dto.customerId).first()
        if existing:
            raise HTTPException(status_code=400, detail="A transfer already exists for this customer. Only one transfer per customer is allowed.")
        transfer = Transfer(
            employee_id=current_user.id,
            customer_id=dto.customerId,
            call_back_id=dto.callBackId,
            utility_type=dto.utilityType,
            status="pending",
            scheduled_datetime=dto.scheduledDateTime,
            account_number=dto.accountNumber,
            mpan=dto.mpan,
            mprn=dto.mprn,
            msn=dto.msn,
            notes=dto.notes,
        )
        if dto.supplier:
            transfer.elec_offer_supplier = dto.supplier
        if dto.offeredElectricityRates:
            r = dto.offeredElectricityRates[0]
            transfer.elec_offer_contract_length = r.contractLength
            transfer.elec_offer_supplier = r.supplier or dto.supplier
            transfer.elec_offer_meter_type = r.meterType
            transfer.elec_offer_commission_type = r.commissionType
            transfer.elec_commission_day_rate = r.dayUnitRate
            transfer.elec_commission_night_rate = r.nightUnitRate
            transfer.elec_commission_evening_rate = r.eveningUnitRate
            transfer.elec_commission_standing = r.standingRate
            transfer.elec_noncom_day_rate = r.nonCommissionDayRate
            transfer.elec_noncom_night_rate = r.nonCommissionNightRate
            transfer.elec_noncom_evening_rate = r.nonCommissionEveningRate
            transfer.elec_noncom_standing = r.nonCommissionStandingRate
            transfer.elec_broker_charge = r.brokerServiceCharge
        if dto.offeredGasRates:
            r = dto.offeredGasRates[0]
            transfer.gas_offer_contract_length = r.contractLength
            transfer.gas_offer_supplier = r.supplier
            transfer.gas_commission_unit_rate = r.unitRate
            transfer.gas_commission_standing = r.standingRate
            transfer.gas_noncom_unit_rate = r.nonCommissionUnitRate
            transfer.gas_noncom_standing = r.nonCommissionStandingRate
            transfer.gas_broker_charge = r.brokerServiceCharge

        if dto.callBackId:
            cb = db.query(CallBack).filter(CallBack.id == dto.callBackId).first()
            if cb and cb.elec_offer_contract_length and not dto.offeredElectricityRates:
                transfer.elec_offer_contract_length = cb.elec_offer_contract_length
                transfer.elec_offer_supplier = cb.elec_offer_supplier
                transfer.elec_offer_meter_type = cb.elec_offer_meter_type
                transfer.elec_offer_commission_type = cb.elec_offer_commission_type
                transfer.elec_commission_day_rate = cb.elec_commission_day_rate
                transfer.elec_commission_night_rate = cb.elec_commission_night_rate
                transfer.elec_commission_evening_rate = cb.elec_commission_evening_rate
                transfer.elec_commission_standing = cb.elec_commission_standing
                transfer.elec_noncom_day_rate = cb.elec_noncom_day_rate
                transfer.elec_noncom_night_rate = cb.elec_noncom_night_rate
                transfer.elec_noncom_evening_rate = cb.elec_noncom_evening_rate
                transfer.elec_noncom_standing = cb.elec_noncom_standing
                transfer.elec_broker_charge = cb.elec_broker_charge
            if cb and cb.gas_offer_contract_length and not dto.offeredGasRates:
                transfer.gas_offer_contract_length = cb.gas_offer_contract_length
                transfer.gas_offer_supplier = cb.gas_offer_supplier
                transfer.gas_commission_unit_rate = cb.gas_commission_unit_rate
                transfer.gas_commission_standing = cb.gas_commission_standing
                transfer.gas_noncom_unit_rate = cb.gas_noncom_unit_rate
                transfer.gas_noncom_standing = cb.gas_noncom_standing
                transfer.gas_broker_charge = cb.gas_broker_charge

        db.add(transfer)
        db.commit()
        db.refresh(transfer)
        customer = db.query(Customer).filter(Customer.id == transfer.customer_id).first()
        return _transfer_out(transfer, customer)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create transfer: {str(e)}")


@router.put("/{id}")
def update_transfer(id: int, dto: TransferUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    transfer = db.query(Transfer).filter(Transfer.id == id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
        
    is_auth = (transfer.employee_id == current_user.id)
    if not is_auth and current_user.role == "manager":
        creator = db.query(User).filter(User.id == transfer.employee_id).first()
        if creator and creator.manager_id == current_user.id:
            is_auth = True
            
    if not is_auth:
        raise HTTPException(status_code=403, detail="Not authorized to update this transfer")
    try:
        if dto.utilityType is not None:
            transfer.utility_type = dto.utilityType
        if dto.supplier is not None:
            transfer.elec_offer_supplier = dto.supplier
        if dto.status is not None:
            transfer.status = dto.status
        if dto.outcome is not None:
            transfer.outcome = dto.outcome
        if dto.notInterestedReason is not None:
            transfer.not_interested_reason = dto.notInterestedReason
        if dto.scheduledDateTime is not None:
            transfer.scheduled_datetime = dto.scheduledDateTime
        if dto.accountNumber is not None:
            transfer.account_number = dto.accountNumber
        if dto.mpan is not None:
            transfer.mpan = dto.mpan
        if dto.mprn is not None:
            transfer.mprn = dto.mprn
        if dto.msn is not None:
            transfer.msn = dto.msn
        if dto.notes is not None:
            transfer.notes = dto.notes
        if dto.callBackId is not None:
            transfer.call_back_id = dto.callBackId

        if dto.offeredElectricityRates is not None:
            if dto.offeredElectricityRates:
                r = dto.offeredElectricityRates[0]
                transfer.elec_offer_contract_length = r.contractLength
                transfer.elec_offer_supplier = r.supplier
                transfer.elec_offer_meter_type = r.meterType
                transfer.elec_offer_commission_type = r.commissionType
                transfer.elec_commission_day_rate = r.dayUnitRate
                transfer.elec_commission_night_rate = r.nightUnitRate
                transfer.elec_commission_evening_rate = r.eveningUnitRate
                transfer.elec_commission_standing = r.standingRate
                transfer.elec_noncom_day_rate = r.nonCommissionDayRate
                transfer.elec_noncom_night_rate = r.nonCommissionNightRate
                transfer.elec_noncom_evening_rate = r.nonCommissionEveningRate
                transfer.elec_noncom_standing = r.nonCommissionStandingRate
                transfer.elec_broker_charge = r.brokerServiceCharge
            else:
                for f in ['elec_offer_contract_length', 'elec_offer_supplier', 'elec_offer_meter_type',
                          'elec_offer_commission_type', 'elec_commission_day_rate', 'elec_commission_night_rate',
                          'elec_commission_evening_rate', 'elec_commission_standing', 'elec_noncom_day_rate',
                          'elec_noncom_night_rate', 'elec_noncom_evening_rate', 'elec_noncom_standing', 'elec_broker_charge']:
                    setattr(transfer, f, None)

        if dto.offeredGasRates is not None:
            if dto.offeredGasRates:
                r = dto.offeredGasRates[0]
                transfer.gas_offer_contract_length = r.contractLength
                transfer.gas_offer_supplier = r.supplier
                transfer.gas_commission_unit_rate = r.unitRate
                transfer.gas_commission_standing = r.standingRate
                transfer.gas_noncom_unit_rate = r.nonCommissionUnitRate
                transfer.gas_noncom_standing = r.nonCommissionStandingRate
                transfer.gas_broker_charge = r.brokerServiceCharge
            else:
                for f in ['gas_offer_contract_length', 'gas_offer_supplier', 'gas_commission_unit_rate',
                          'gas_commission_standing', 'gas_noncom_unit_rate', 'gas_noncom_standing', 'gas_broker_charge']:
                    setattr(transfer, f, None)

        db.commit()
        db.refresh(transfer)
        customer = db.query(Customer).filter(Customer.id == transfer.customer_id).first()
        return _transfer_out(transfer, customer)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update transfer: {str(e)}")


@router.delete("/{id}")
def delete_transfer(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    transfer = db.query(Transfer).filter(Transfer.id == id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
        
    is_auth = (transfer.employee_id == current_user.id)
    if not is_auth and current_user.role == "manager":
        creator = db.query(User).filter(User.id == transfer.employee_id).first()
        if creator and creator.manager_id == current_user.id:
            is_auth = True
            
    if not is_auth:
        raise HTTPException(status_code=403, detail="Not authorized to delete this transfer")
    try:
        db.delete(transfer)
        db.commit()
        return {"success": True}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete transfer: {str(e)}")
