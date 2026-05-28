from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Customer, ElectricityMeter, GasMeter, User
from schemas import CustomerOut, CustomerCreate, CustomerUpdate, ElectricityMeterOut, GasMeterOut, ElectricityMeterCreate, GasMeterCreate
from routers.auth import get_current_user

router = APIRouter(prefix="/api/customers", tags=["customers"])


def _safe_date(val):
    if val is None:
        return None
    if isinstance(val, date):
        return val
    try:
        return date.fromisoformat(str(val))
    except (ValueError, TypeError):
        return None


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
            id=m.id,
            customerId=m.customer_id,
            meterNumber=m.meter_number,
            currentSupplier=m.current_supplier,
            supplyNumber=m.supply_number,
            dayUnitRate=m.day_unit_rate,
            nightUnitRate=m.night_unit_rate,
            eveningUnitRate=m.evening_unit_rate,
            standingRate=m.standing_rate,
            monthlyBill=m.monthly_bill,
            contractEndDate=_safe_date(m.contract_end_date),
        ) for m in c.electricity_meters],
        gasMeters=[GasMeterOut(
            id=m.id,
            customerId=m.customer_id,
            meterNumber=m.meter_number,
            currentSupplier=m.current_supplier,
            unitRate=m.unit_rate,
            standingRate=m.standing_rate,
            monthlyBill=m.monthly_bill,
            contractEndDate=_safe_date(m.contract_end_date),
        ) for m in c.gas_meters],
    )


@router.get("")
def get_customers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    query = db.query(Customer).filter(Customer.created_by == current_user.id)
    total = query.count()
    customers = query.order_by(Customer.created_at.desc()).offset(skip).limit(limit).all()
    items = [_customer_out(c) for c in customers]
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/{id}")
def get_customer(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    is_auth = (c.created_by == current_user.id)
    if not is_auth and current_user.role == "manager":
        creator = db.query(User).filter(User.id == c.created_by).first()
        if creator and creator.manager_id == current_user.id:
            is_auth = True
            
    if not is_auth:
        raise HTTPException(status_code=403, detail="Not authorized to access this customer")
    return _customer_out(c)


@router.post("")
def create_customer(dto: CustomerCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        if dto.postcode:
            existing = db.query(Customer).filter(
                func.lower(Customer.postcode) == func.lower(dto.postcode.strip())
            ).first()
            if existing:
                if dto.businessName:
                    existing.business_name = dto.businessName
                if dto.ownerName:
                    existing.owner_name = dto.ownerName
                if dto.businessPhone:
                    existing.business_phone = dto.businessPhone
                if dto.ownerPhone is not None:
                    existing.owner_phone = dto.ownerPhone
                if dto.email is not None:
                    existing.email = dto.email
                if dto.businessAddress:
                    existing.business_address = dto.businessAddress
                if dto.utilityType:
                    existing.utility_type = dto.utilityType

                if dto.electricityRates is not None:
                    db.query(ElectricityMeter).filter(ElectricityMeter.customer_id == existing.id).delete()
                    db.flush()
                    for rate in dto.electricityRates:
                        db.add(ElectricityMeter(
                            customer_id=existing.id, meter_number=rate.meterNumber,
                            current_supplier=rate.currentSupplier, supply_number=rate.supplyNumber,
                            day_unit_rate=rate.dayUnitRate, night_unit_rate=rate.nightUnitRate,
                            evening_unit_rate=rate.eveningUnitRate, standing_rate=rate.standingRate,
                            monthly_bill=rate.monthlyBill, contract_end_date=rate.contractEndDate,
                        ))

                if dto.gasRates is not None:
                    db.query(GasMeter).filter(GasMeter.customer_id == existing.id).delete()
                    db.flush()
                    for rate in dto.gasRates:
                        db.add(GasMeter(
                            customer_id=existing.id, meter_number=rate.meterNumber,
                            current_supplier=rate.currentSupplier, unit_rate=rate.unitRate,
                            standing_rate=rate.standingRate, monthly_bill=rate.monthlyBill,
                            contract_end_date=rate.contractEndDate,
                        ))

                db.commit()
                db.refresh(existing)
                return _customer_out(existing)

        customer = Customer(
            business_name=dto.businessName or "Unknown",
            owner_name=dto.ownerName or "Not provided",
            business_phone=dto.businessPhone or "Not provided",
            owner_phone=dto.ownerPhone,
            email=dto.email or "",
            business_address=dto.businessAddress or "",
            utility_type=dto.utilityType or "electricity",
            created_by=current_user.id,
            postcode=dto.postcode or "",
            created_at=datetime.now(),
        )
        db.add(customer)
        db.flush()

        if dto.electricityRates:
            for rate in dto.electricityRates:
                meter = ElectricityMeter(
                    customer_id=customer.id,
                    meter_number=rate.meterNumber,
                    current_supplier=rate.currentSupplier,
                    supply_number=rate.supplyNumber,
                    day_unit_rate=rate.dayUnitRate,
                    night_unit_rate=rate.nightUnitRate,
                    evening_unit_rate=rate.eveningUnitRate,
                    standing_rate=rate.standingRate,
                    monthly_bill=rate.monthlyBill,
                    contract_end_date=rate.contractEndDate,
                )
                db.add(meter)

        if dto.gasRates:
            for rate in dto.gasRates:
                meter = GasMeter(
                    customer_id=customer.id,
                    meter_number=rate.meterNumber,
                    current_supplier=rate.currentSupplier,
                    unit_rate=rate.unitRate,
                    standing_rate=rate.standingRate,
                    monthly_bill=rate.monthlyBill,
                    contract_end_date=rate.contractEndDate,
                )
                db.add(meter)

        db.commit()
        db.refresh(customer)
        return _customer_out(customer)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{id}")
def update_customer(id: int, dto: CustomerUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    is_auth = (customer.created_by == current_user.id)
    if not is_auth and current_user.role == "manager":
        creator = db.query(User).filter(User.id == customer.created_by).first()
        if creator and creator.manager_id == current_user.id:
            is_auth = True
            
    if not is_auth:
        raise HTTPException(status_code=403, detail="Not authorized to update this customer")
    try:
        if dto.businessName is not None:
            customer.business_name = dto.businessName
        if dto.ownerName is not None:
            customer.owner_name = dto.ownerName
        if dto.businessPhone is not None:
            customer.business_phone = dto.businessPhone
        if dto.ownerPhone is not None:
            customer.owner_phone = dto.ownerPhone
        if dto.email is not None:
            customer.email = dto.email
        if dto.businessAddress is not None:
            customer.business_address = dto.businessAddress
        if dto.utilityType is not None:
            customer.utility_type = dto.utilityType

        if dto.electricityRates is not None:
            db.query(ElectricityMeter).filter(ElectricityMeter.customer_id == id).delete()
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
            db.query(GasMeter).filter(GasMeter.customer_id == id).delete()
            db.flush()
            for rate in dto.gasRates:
                db.add(GasMeter(
                    customer_id=customer.id, meter_number=rate.meterNumber,
                    current_supplier=rate.currentSupplier, unit_rate=rate.unitRate,
                    standing_rate=rate.standingRate, monthly_bill=rate.monthlyBill,
                    contract_end_date=rate.contractEndDate,
                ))

        db.commit()
        db.refresh(customer)
        return _customer_out(customer)
    except Exception:
        db.rollback()
        raise


@router.delete("/{id}")
def delete_customer(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    is_auth = (customer.created_by == current_user.id)
    if not is_auth and current_user.role == "manager":
        creator = db.query(User).filter(User.id == customer.created_by).first()
        if creator and creator.manager_id == current_user.id:
            is_auth = True
            
    if not is_auth:
        raise HTTPException(status_code=403, detail="Not authorized to delete this customer")
    try:
        from models import Transfer, Sale, CallBack
        db.query(ElectricityMeter).filter(ElectricityMeter.customer_id == id).delete()
        db.query(GasMeter).filter(GasMeter.customer_id == id).delete()
        db.query(Sale).filter(Sale.customer_id == id).delete()
        db.query(Transfer).filter(Transfer.customer_id == id).delete()
        db.query(CallBack).filter(CallBack.customer_id == id).delete()
        
        db.delete(customer)
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete customer: {str(e)}")


@router.post("/{id}/electricity-meters")
def add_electricity_meter(id: int, dto: ElectricityMeterCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    is_auth = (customer.created_by == current_user.id)
    if not is_auth and current_user.role == "manager":
        creator = db.query(User).filter(User.id == customer.created_by).first()
        if creator and creator.manager_id == current_user.id:
            is_auth = True
            
    if not is_auth:
        raise HTTPException(status_code=403, detail="Not authorized to update this customer")
        
    meter = ElectricityMeter(
        customer_id=customer.id,
        meter_number=dto.meterNumber,
        current_supplier=dto.currentSupplier,
        supply_number=dto.supplyNumber,
        day_unit_rate=dto.dayUnitRate,
        night_unit_rate=dto.nightUnitRate,
        evening_unit_rate=dto.eveningUnitRate,
        standing_rate=dto.standingRate,
        monthly_bill=dto.monthlyBill,
        contract_end_date=dto.contractEndDate,
    )
    db.add(meter)
    db.commit()
    db.refresh(meter)
    
    return {
        "id": meter.id,
        "customerId": meter.customer_id,
        "meterNumber": meter.meter_number,
        "currentSupplier": meter.current_supplier,
        "supplyNumber": meter.supply_number,
        "dayUnitRate": meter.day_unit_rate,
        "nightUnitRate": meter.night_unit_rate,
        "eveningUnitRate": meter.evening_unit_rate,
        "standingRate": meter.standing_rate,
        "monthlyBill": meter.monthly_bill,
        "contractEndDate": _safe_date(meter.contract_end_date),
    }


@router.post("/{id}/gas-meters")
def add_gas_meter(id: int, dto: GasMeterCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    is_auth = (customer.created_by == current_user.id)
    if not is_auth and current_user.role == "manager":
        creator = db.query(User).filter(User.id == customer.created_by).first()
        if creator and creator.manager_id == current_user.id:
            is_auth = True
            
    if not is_auth:
        raise HTTPException(status_code=403, detail="Not authorized to update this customer")
        
    meter = GasMeter(
        customer_id=customer.id,
        meter_number=dto.meterNumber,
        current_supplier=dto.currentSupplier,
        unit_rate=dto.unitRate,
        standing_rate=dto.standingRate,
        monthly_bill=dto.monthlyBill,
        contract_end_date=dto.contractEndDate,
    )
    db.add(meter)
    db.commit()
    db.refresh(meter)
    
    return {
        "id": meter.id,
        "customerId": meter.customer_id,
        "meterNumber": meter.meter_number,
        "currentSupplier": meter.current_supplier,
        "unitRate": meter.unit_rate,
        "standingRate": meter.standing_rate,
        "monthlyBill": meter.monthly_bill,
        "contractEndDate": _safe_date(meter.contract_end_date),
    }
