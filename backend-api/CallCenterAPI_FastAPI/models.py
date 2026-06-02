from datetime import datetime, date
from sqlalchemy import Column, Integer, String, DateTime, Date, Float, Text, BigInteger, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(10), nullable=False, default="agent")
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    phone = Column(String(20), nullable=True)
    commission_rate = Column(Float, nullable=False, default=0.00)
    father_name = Column(String(100), nullable=True)
    monthly_salary = Column(Integer, nullable=True, default=0)
    cnic = Column(String(25), nullable=True)
    department = Column(String(100), nullable=True)
    designation = Column(String(100), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    date_of_joining = Column(Date, nullable=True)
    emerg_contact_name = Column(String(100), nullable=True)
    emerg_contact_number = Column(String(30), nullable=True)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime, nullable=True)
    reset_token = Column(String(255), nullable=True, index=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    manager = relationship("User", remote_side="User.id", backref="agents", foreign_keys=[manager_id])


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False)
    business_name = Column(String(255), nullable=False)
    owner_name = Column(String(150), nullable=False)
    business_phone = Column(String(30), nullable=False)
    owner_phone = Column(String(30), nullable=True)
    email = Column(String(150), nullable=True)
    business_address = Column(Text, nullable=True)
    postcode = Column(String(15), nullable=True)
    utility_type = Column(String(15), nullable=False, default="electricity")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    creator = relationship("User", foreign_keys=[created_by])
    electricity_meters = relationship("ElectricityMeter", backref="customer", cascade="all, delete-orphan", passive_deletes=True)
    gas_meters = relationship("GasMeter", backref="customer", cascade="all, delete-orphan", passive_deletes=True)
    callbacks = relationship("CallBack", cascade="all, delete-orphan", passive_deletes=True)
    transfers = relationship("Transfer", cascade="all, delete-orphan", passive_deletes=True)
    sales = relationship("Sale", cascade="all, delete-orphan", passive_deletes=True)


class ElectricityMeter(Base):
    __tablename__ = "electricity_meters"
    __table_args__ = (
        UniqueConstraint("customer_id", "meter_number", name="uq_electricity_meter_per_customer"),
    )

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    meter_number = Column(Integer, nullable=False, default=1)
    current_supplier = Column(String(150), nullable=True)
    supply_number = Column(String(100), nullable=True)
    meter_serial = Column(String(100), nullable=True)
    meter_type = Column(String(15), nullable=False, default="standard")
    day_unit_rate = Column(Float, nullable=True)
    night_unit_rate = Column(Float, nullable=True)
    evening_unit_rate = Column(Float, nullable=True)
    standing_rate = Column(Float, nullable=True)
    monthly_bill = Column(Float, nullable=True)
    contract_end_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class GasMeter(Base):
    __tablename__ = "gas_meters"
    __table_args__ = (
        UniqueConstraint("customer_id", "meter_number", name="uq_gas_meter_per_customer"),
    )

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    meter_number = Column(Integer, nullable=False, default=1)
    current_supplier = Column(String(150), nullable=True)
    mprn = Column(String(100), nullable=True)
    meter_serial = Column(String(100), nullable=True)
    unit_rate = Column(Float, nullable=True)
    standing_rate = Column(Float, nullable=True)
    monthly_bill = Column(Float, nullable=True)
    contract_end_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class CallBack(Base):
    __tablename__ = "call_backs"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="NO ACTION"), nullable=False, index=True)
    created_by_manager_id = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=True, index=True)
    scheduled_datetime = Column(DateTime, nullable=False)
    status = Column(String(15), nullable=False, default="pending")
    outcome = Column(String(20), nullable=True)
    not_interested_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    elec_offer_contract_length = Column(String(20), nullable=True)
    elec_offer_supplier = Column(String(150), nullable=True)
    elec_offer_meter_type = Column(String(15), nullable=True)
    elec_offer_commission_type = Column(String(20), nullable=True)
    elec_commission_day_rate = Column(Float, nullable=True)
    elec_commission_night_rate = Column(Float, nullable=True)
    elec_commission_evening_rate = Column(Float, nullable=True)
    elec_commission_standing = Column(Float, nullable=True)
    elec_noncom_day_rate = Column(Float, nullable=True)
    elec_noncom_night_rate = Column(Float, nullable=True)
    elec_noncom_evening_rate = Column(Float, nullable=True)
    elec_noncom_standing = Column(Float, nullable=True)
    elec_broker_charge = Column(Float, nullable=True)
    gas_offer_contract_length = Column(String(20), nullable=True)
    gas_offer_supplier = Column(String(150), nullable=True)
    gas_commission_unit_rate = Column(Float, nullable=True)
    gas_commission_standing = Column(Float, nullable=True)
    gas_noncom_unit_rate = Column(Float, nullable=True)
    gas_noncom_standing = Column(Float, nullable=True)
    gas_broker_charge = Column(Float, nullable=True)
    account_number = Column(String(50), nullable=True)
    mpan = Column(String(50), nullable=True)
    mprn = Column(String(50), nullable=True)
    msn = Column(String(50), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    employee = relationship("User", foreign_keys=[employee_id])
    customer = relationship("Customer", foreign_keys=[customer_id], overlaps="callbacks")
    transfers = relationship("Transfer", backref="callback")


class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="NO ACTION"), nullable=False, index=True)
    call_back_id = Column(Integer, ForeignKey("call_backs.id", ondelete="SET NULL"), nullable=True, index=True)
    utility_type = Column(String(15), nullable=False, default="electricity")
    status = Column(String(20), nullable=False, default="pending")
    outcome = Column(String(20), nullable=True)
    not_interested_reason = Column(Text, nullable=True)
    scheduled_datetime = Column(DateTime, nullable=True)
    account_number = Column(String(50), nullable=True)
    mpan = Column(String(50), nullable=True)
    mprn = Column(String(50), nullable=True)
    msn = Column(String(50), nullable=True)
    elec_offer_contract_length = Column(String(20), nullable=True)
    elec_offer_supplier = Column(String(150), nullable=True)
    elec_offer_meter_type = Column(String(15), nullable=True)
    elec_offer_commission_type = Column(String(20), nullable=True)
    elec_commission_day_rate = Column(Float, nullable=True)
    elec_commission_night_rate = Column(Float, nullable=True)
    elec_commission_evening_rate = Column(Float, nullable=True)
    elec_commission_standing = Column(Float, nullable=True)
    elec_noncom_day_rate = Column(Float, nullable=True)
    elec_noncom_night_rate = Column(Float, nullable=True)
    elec_noncom_evening_rate = Column(Float, nullable=True)
    elec_noncom_standing = Column(Float, nullable=True)
    elec_broker_charge = Column(Float, nullable=True)
    gas_offer_contract_length = Column(String(20), nullable=True)
    gas_offer_supplier = Column(String(150), nullable=True)
    gas_commission_unit_rate = Column(Float, nullable=True)
    gas_commission_standing = Column(Float, nullable=True)
    gas_noncom_unit_rate = Column(Float, nullable=True)
    gas_noncom_standing = Column(Float, nullable=True)
    gas_broker_charge = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    employee = relationship("User", foreign_keys=[employee_id])
    customer = relationship("Customer", foreign_keys=[customer_id], overlaps="transfers")


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="NO ACTION"), nullable=False, index=True)
    transfer_id = Column(Integer, ForeignKey("transfers.id", ondelete="SET NULL"), nullable=True, index=True)
    owner_full_name = Column(String(150), nullable=True)
    home_address = Column(Text, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    business_type = Column(String(20), nullable=True)
    bill_frequency = Column(String(10), nullable=False, default="monthly")
    payment_method = Column(String(15), nullable=False, default="direct_debit")
    bank_name = Column(String(150), nullable=True)
    account_type = Column(String(50), nullable=True)
    account_title = Column(String(150), nullable=True)
    sort_code = Column(String(10), nullable=True)
    bank_account_number = Column(String(20), nullable=True)
    cot_status = Column(String(20), nullable=False, default="submitted")
    cot_date = Column(Date, nullable=True)
    cot_notes = Column(Text, nullable=True)
    commission_amount = Column(Float, nullable=False, default=0.00)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    employee = relationship("User", foreign_keys=[employee_id])
    customer = relationship("Customer", foreign_keys=[customer_id], overlaps="sales")
    transfer = relationship("Transfer", foreign_keys=[transfer_id])


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="NO ACTION"), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.now)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=False, default="present")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_user_attendance_per_date"),
    )
    user = relationship("User", backref="attendances")
