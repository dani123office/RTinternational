from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Sale, Customer, User
from ..schemas import SaleOut, CustomerOut, ElectricityMeterOut, GasMeterOut, SaleCreate, SaleUpdate
from datetime import datetime
from .auth import get_current_user
from ..utils.logger import log_activity, get_client_ip
from .transfers import _transfer_out

router = APIRouter(prefix="/api/sales", tags=["sales"])


def _sale_out(s: Sale, customer: Customer = None) -> SaleOut:
    customer_out = None
    if customer:
        customer_out = CustomerOut(
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
    transfer_out = None
    if s.transfer:
        transfer_out = _transfer_out(s.transfer)

    return SaleOut(
        id=s.id,
        transferId=s.transfer_id,
        employeeId=s.employee_id,
        agentName=s.employee.name if s.employee else "Unknown Agent",
        customerId=s.customer_id,
        ownerFullName=s.owner_full_name,
        homeAddress=s.home_address,
        dateOfBirth=s.date_of_birth,
        businessType=s.business_type,
        billFrequency=s.bill_frequency,
        paymentMethod=s.payment_method,
        bankName=s.bank_name,
        accountType=s.account_type,
        accountTitle=s.account_title,
        sortCode=s.sort_code,
        bankAccountNumber=s.bank_account_number,
        cotStatus=s.cot_status,
        cotDate=s.cot_date,
        saleType=s.sale_type,
        notes=s.notes,
        createdAt=s.created_at,
        customer=customer_out,
        transfer=transfer_out,
    )


@router.get("")
def get_sales(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    query = db.query(Sale).filter(Sale.employee_id == current_user.id)
    total = query.count()
    sales = query.order_by(Sale.created_at.desc()).offset(skip).limit(limit).all()
    items = [_sale_out(s, db.query(Customer).filter(Customer.id == s.customer_id).first()) for s in sales]
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/{id}")
def get_sale(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.query(Sale).filter(Sale.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Sale not found")
    is_auth = (s.employee_id == current_user.id)
    if not is_auth and current_user.role == "manager":
        creator = db.query(User).filter(User.id == s.employee_id).first()
        if creator and creator.manager_id == current_user.id:
            is_auth = True
    if not is_auth and current_user.role == "admin":
        is_auth = True
    if not is_auth:
        raise HTTPException(status_code=403, detail="Not authorized to access this sale")
    customer = db.query(Customer).filter(Customer.id == s.customer_id).first()
    return _sale_out(s, customer)


@router.post("")
def create_sale(dto: SaleCreate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        existing = db.query(Sale).filter(Sale.customer_id == dto.customerId).first()
        if existing:
            raise HTTPException(status_code=400, detail="A sale already exists for this customer. Only one sale per customer is allowed.")
        sale = Sale(
            transfer_id=dto.transferId,
            employee_id=current_user.id,
            customer_id=dto.customerId,
            owner_full_name=dto.ownerFullName,
            home_address=dto.homeAddress,
            date_of_birth=dto.dateOfBirth,
            business_type=dto.businessType,
            bill_frequency=dto.billFrequency,
            payment_method=dto.paymentMethod,
            bank_name=dto.bankName,
            account_type=dto.accountType,
            account_title=dto.accountTitle,
            sort_code=dto.sortCode,
            bank_account_number=dto.bankAccountNumber,
            notes=dto.notes,
            sale_type=dto.saleType or "cot",
            cot_status="done" if dto.saleType in ("renewal", "out_of_contract") else "chasing",
            created_at=datetime.now(),
        )
        db.add(sale)
        db.commit()
        db.refresh(sale)
        customer = db.query(Customer).filter(Customer.id == sale.customer_id).first()
        log_activity(db, current_user.id, "created", "sale", sale.id,
                     f"Created sale #{sale.id}",
                     get_client_ip(request))
        return _sale_out(sale, customer)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create sale: {str(e)}")


@router.put("/{id}")
def update_sale(id: int, dto: SaleUpdate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sale = db.query(Sale).filter(Sale.id == id, Sale.employee_id == current_user.id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    try:
        if dto.ownerFullName is not None:
            sale.owner_full_name = dto.ownerFullName
        if dto.homeAddress is not None:
            sale.home_address = dto.homeAddress
        if dto.businessType is not None:
            sale.business_type = dto.businessType
        if dto.dateOfBirth is not None:
            sale.date_of_birth = dto.dateOfBirth
        if dto.billFrequency is not None:
            sale.bill_frequency = dto.billFrequency
        if dto.paymentMethod is not None:
            sale.payment_method = dto.paymentMethod
        if dto.bankName is not None:
            sale.bank_name = dto.bankName
        if dto.accountType is not None:
            sale.account_type = dto.accountType
        if dto.accountTitle is not None:
            sale.account_title = dto.accountTitle
        if dto.sortCode is not None:
            sale.sort_code = dto.sortCode
        if dto.bankAccountNumber is not None:
            sale.bank_account_number = dto.bankAccountNumber
        if dto.cotStatus is not None:
            sale.cot_status = dto.cotStatus
        if dto.cotDate is not None:
            sale.cot_date = dto.cotDate
        if dto.saleType is not None:
            sale.sale_type = dto.saleType
            if dto.saleType in ("renewal", "out_of_contract"):
                sale.cot_status = "done"
        if dto.notes is not None:
            sale.notes = dto.notes

        db.commit()
        db.refresh(sale)
        customer = db.query(Customer).filter(Customer.id == sale.customer_id).first()
        log_activity(db, current_user.id, "updated", "sale", sale.id,
                     f"Updated sale #{sale.id}",
                     get_client_ip(request))
        return _sale_out(sale, customer)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update sale: {str(e)}")


@router.delete("/{id}")
def delete_sale(id: int, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sale = db.query(Sale).filter(Sale.id == id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    is_auth = (sale.employee_id == current_user.id)
    if not is_auth and current_user.role == "manager":
        creator = db.query(User).filter(User.id == sale.employee_id).first()
        if creator and creator.manager_id == current_user.id:
            is_auth = True
    if not is_auth and current_user.role == "admin":
        is_auth = True
    if not is_auth:
        raise HTTPException(status_code=403, detail="Not authorized to delete this sale")
    try:
        s_id = sale.id
        db.delete(sale)
        db.commit()
        log_activity(db, current_user.id, "deleted", "sale", s_id,
                     f"Deleted sale #{s_id}",
                     get_client_ip(request))
        return {"success": True}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete sale: {str(e)}")
