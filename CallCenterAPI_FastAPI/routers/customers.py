from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Customer, ElectricityMeter, GasMeter, User, Sale
from ..schemas import CustomerOut, CustomerCreate, CustomerUpdate, ElectricityMeterOut, GasMeterOut, ElectricityMeterCreate, GasMeterCreate
from .auth import get_current_user
from ..utils.logger import log_activity, get_client_ip

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
    creator_name = c.creator.name if (hasattr(c, 'creator') and c.creator) else None
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
        createdByName=creator_name,
        createdAt=c.created_at,
        electricityMeters=[ElectricityMeterOut(
            id=m.id,
            customerId=m.customer_id,
            meterNumber=m.meter_number,
            currentSupplier=m.current_supplier,
            supplyNumber=m.supply_number,
            meterSerial=m.meter_serial,
            accountNumber=m.account_number,
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
            mprn=m.mprn,
            meterSerial=m.meter_serial,
            accountNumber=m.account_number,
            unitRate=m.unit_rate,
            standingRate=m.standing_rate,
            monthlyBill=m.monthly_bill,
            contractEndDate=_safe_date(m.contract_end_date),
        ) for m in c.gas_meters],
    )


@router.get("", response_model=list[CustomerOut])
def get_customers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    if current_user.role == "admin":
        query = db.query(Customer)
    elif current_user.role == "manager":
        agent_ids = [u.id for u in db.query(User.id).filter(User.manager_id == current_user.id).all()]
        agent_ids.append(current_user.id)
        query = db.query(Customer).filter(Customer.created_by.in_(agent_ids))
    else:
        query = db.query(Customer).filter(Customer.created_by == current_user.id)
    customers = query.order_by(Customer.created_at.desc()).offset(skip).limit(limit).all()
    return [_customer_out(c) for c in customers]


@router.get("/check-duplicate")
def check_duplicate(
    postcode: str = Query(None),
    phone: str = Query(None),
    business_name: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Customer)
    conditions = []
    
    if postcode and postcode.strip():
        conditions.append(func.lower(Customer.postcode) == func.lower(postcode.strip()))
    if phone and phone.strip():
        clean_phone = phone.strip()
        conditions.append(Customer.business_phone == clean_phone)
        conditions.append(Customer.owner_phone == clean_phone)
        
    if not conditions:
        return {"isDuplicate": False}
        
    from sqlalchemy import or_
    existing = query.filter(or_(*conditions)).first()
    if not existing:
        return {"isDuplicate": False}
        
    creator = existing.creator
    is_creator_deactive = not creator or not creator.is_active or getattr(creator, 'is_deleted', False)
    
    # Check if this customer is an orphan (has 0 callbacks, 0 transfers, and 0 sales)
    from ..models import CallBack, Transfer, Sale
    has_cb = db.query(CallBack.id).filter(CallBack.customer_id == existing.id).first() is not None
    has_tr = db.query(Transfer.id).filter(Transfer.customer_id == existing.id).first() is not None
    has_sale = db.query(Sale.id).filter(Sale.customer_id == existing.id).first() is not None
    is_orphan = (not has_cb and not has_tr and not has_sale)

    # Check if belongs to current user or accessible
    is_auth = (existing.created_by == current_user.id)
    if not is_auth and current_user.role == "manager":
        if creator and creator.manager_id == current_user.id:
            is_auth = True
    if not is_auth and current_user.role == "admin":
        is_auth = True
        
    if is_orphan:
        # Orphan customer with no callbacks/transfers/sales can be claimed by any agent
        return {
            "isDuplicate": False,
            "reassignable": True,
            "businessName": existing.business_name,
            "customerId": existing.id,
            "message": "Customer profile is unassigned and will be linked to your record."
        }

    if is_creator_deactive:
        has_sale_creator = db.query(Sale).filter(
            Sale.customer_id == existing.id,
            Sale.employee_id == existing.created_by
        ).first() is not None
        if not has_sale_creator:
            # Re-assignable lead
            return {
                "isDuplicate": False,
                "reassignable": True,
                "businessName": existing.business_name,
                "message": "Customer is from a deactivated agent and will be assigned to you."
            }
            
    if is_auth:
        return {
            "isDuplicate": False,
            "ownedByYou": True,
            "businessName": existing.business_name,
            "customerId": existing.id
        }
        
    creator_name = creator.name if creator else "another agent"
    return {
        "isDuplicate": True,
        "ownedByYou": False,
        "agentName": creator_name,
        "businessName": existing.business_name,
        "postcode": existing.postcode,
        "message": f"This customer belongs to agent: {creator_name} ({existing.business_name or 'Existing Customer'})"
    }


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
    if not is_auth and current_user.role == "admin":
        is_auth = True
            
    if not is_auth:
        raise HTTPException(status_code=403, detail="Not authorized to access this customer")
    return _customer_out(c)


@router.post("")
def create_customer(dto: CustomerCreate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        if dto.postcode:
            existing = db.query(Customer).filter(
                func.lower(Customer.postcode) == func.lower(dto.postcode.strip())
            ).first()
            if existing:
                creator = existing.creator
                is_creator_deactive = not creator or not creator.is_active or getattr(creator, 'is_deleted', False)
                
                # Check if this existing customer is an orphan profile (0 callbacks, 0 transfers, 0 sales)
                from ..models import CallBack, Transfer, Sale
                has_cb = db.query(CallBack.id).filter(CallBack.customer_id == existing.id).first() is not None
                has_tr = db.query(Transfer.id).filter(Transfer.customer_id == existing.id).first() is not None
                has_sale = db.query(Sale.id).filter(Sale.customer_id == existing.id).first() is not None
                is_orphan = (not has_cb and not has_tr and not has_sale)

                if is_orphan:
                    # Reassign orphan customer to current user
                    existing.created_by = current_user.id
                    is_auth = True
                elif is_creator_deactive:
                    has_sale = db.query(Sale).filter(
                        Sale.customer_id == existing.id,
                        Sale.employee_id == existing.created_by
                    ).first() is not None
                    
                    if has_sale:
                        creator_name = creator.name if creator else "deactivated agent"
                        raise HTTPException(
                            status_code=400,
                            detail=f"This customer belongs to agent: {creator_name}"
                        )
                    else:
                        existing.created_by = current_user.id
                        is_auth = True
                else:
                    is_auth = (existing.created_by == current_user.id)
                    if not is_auth and current_user.role == "manager":
                        if creator and creator.manager_id == current_user.id:
                            is_auth = True
                    if not is_auth and current_user.role == "admin":
                        is_auth = True
                    
                    if not is_auth:
                        creator_name = creator.name if creator else "another agent"
                        raise HTTPException(
                            status_code=400,
                            detail=f"This customer belongs to agent: {creator_name}"
                        )

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
                            meter_serial=rate.meterSerial, account_number=rate.accountNumber,
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
                            current_supplier=rate.currentSupplier, mprn=rate.mprn,
                            meter_serial=rate.meterSerial, account_number=rate.accountNumber,
                            unit_rate=rate.unitRate, standing_rate=rate.standingRate,
                            monthly_bill=rate.monthlyBill, contract_end_date=rate.contractEndDate,
                        ))

                db.commit()
                db.refresh(existing)
                log_activity(db, current_user.id, "created", "customer", existing.id,
                             f"Updated existing customer #{existing.id} by postcode match",
                             get_client_ip(request))
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
                    meter_serial=rate.meterSerial,
                    account_number=rate.accountNumber,
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
                    mprn=rate.mprn,
                    meter_serial=rate.meterSerial,
                    account_number=rate.accountNumber,
                    unit_rate=rate.unitRate,
                    standing_rate=rate.standingRate,
                    monthly_bill=rate.monthlyBill,
                    contract_end_date=rate.contractEndDate,
                )
                db.add(meter)

        db.commit()
        db.refresh(customer)
        log_activity(db, current_user.id, "created", "customer", customer.id,
                     f"Created customer #{customer.id}",
                     get_client_ip(request))
        return _customer_out(customer)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{id}")
def update_customer(id: int, dto: CustomerUpdate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
                    meter_serial=rate.meterSerial, account_number=rate.accountNumber,
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
                    current_supplier=rate.currentSupplier, mprn=rate.mprn,
                    meter_serial=rate.meterSerial, account_number=rate.accountNumber,
                    unit_rate=rate.unitRate, standing_rate=rate.standingRate,
                    monthly_bill=rate.monthlyBill, contract_end_date=rate.contractEndDate,
                ))

        db.commit()
        db.refresh(customer)
        log_activity(db, current_user.id, "updated", "customer", customer.id,
                     f"Updated customer #{customer.id}",
                     get_client_ip(request))
        return _customer_out(customer)
    except Exception:
        db.rollback()
        raise


@router.delete("/{id}")
def delete_customer(id: int, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    is_auth = (customer.created_by == current_user.id)
    if not is_auth and current_user.role == "manager":
        creator = db.query(User).filter(User.id == customer.created_by).first()
        if creator and creator.manager_id == current_user.id:
            is_auth = True
    if not is_auth and current_user.role == "admin":
        is_auth = True
            
    if not is_auth:
        raise HTTPException(status_code=403, detail="Not authorized to delete this customer")
    try:
        from ..models import Transfer, Sale, CallBack
        db.query(ElectricityMeter).filter(ElectricityMeter.customer_id == id).delete()
        db.query(GasMeter).filter(GasMeter.customer_id == id).delete()
        db.query(Sale).filter(Sale.customer_id == id).delete()
        db.query(Transfer).filter(Transfer.customer_id == id).delete()
        db.query(CallBack).filter(CallBack.customer_id == id).delete()
        
        c_id = customer.id
        db.delete(customer)
        db.commit()
        log_activity(db, current_user.id, "deleted", "customer", c_id,
                     f"Deleted customer #{c_id}",
                     get_client_ip(request))
        return {"success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete customer: {str(e)}")


@router.post("/{id}/electricity-meters")
def add_electricity_meter(id: int, dto: ElectricityMeterCreate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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

    log_activity(db, current_user.id, "created", "electricity_meter", meter.id,
                 f"Added electricity meter #{meter.id} to customer #{id}",
                 get_client_ip(request))
    
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
def add_gas_meter(id: int, dto: GasMeterCreate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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

    log_activity(db, current_user.id, "created", "gas_meter", meter.id,
                 f"Added gas meter #{meter.id} to customer #{id}",
                 get_client_ip(request))
    
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
