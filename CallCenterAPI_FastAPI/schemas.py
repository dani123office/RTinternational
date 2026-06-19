from datetime import datetime, date, time, timedelta
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import re


# ─── Helpers ──────────────────────────────────────────────

UK_POSTCODE_RE = re.compile(r'^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$', re.IGNORECASE)
PHONE_RE = re.compile(r'^\+?[\d\s\-\(\)]{7,20}$')
EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
NAME_RE = re.compile(r"^[a-zA-Z0-9\s'\-\.&,\(\)\/]+$")
SORT_CODE_RE = re.compile(r'^\d{2}-\d{2}-\d{2}$')
BANK_ACCOUNT_RE = re.compile(r'^\d{6,10}$')


def normalize_postcode(v: str) -> str:
    v = v.strip().upper()
    v = re.sub(r'\s+', '', v)
    if len(v) > 3:
        v = v[:-3] + ' ' + v[-3:]
    return v


def strip_str(v):
    if isinstance(v, str):
        return v.strip()
    return v


def _fmt(name):
    return name.replace('_', ' ').title()


FIELD_NAMES = {
    'businessName': 'Business name',
    'ownerName': 'Owner name',
    'businessPhone': 'Business phone',
    'ownerPhone': 'Owner phone',
    'businessAddress': 'Business address',
    'utilityType': 'Utility type',
    'postcode': 'Postcode',
    'email': 'Email address',
    'dayUnitRate': 'Day unit rate',
    'nightUnitRate': 'Night unit rate',
    'eveningUnitRate': 'Evening unit rate',
    'standingRate': 'Standing charge',
    'monthlyBill': 'Monthly bill',
    'unitRate': 'Unit rate',
    'supplier': 'Supplier name',
    'supplyNumber': 'Supply number',
    'contractLength': 'Contract length',
    'brokerServiceCharge': 'Broker service charge',
    'currentSupplier': 'Current supplier',
    'meterNumber': 'Meter number',
    'meterType': 'Meter type',
    'commissionType': 'Commission type',
    'nonCommissionDayRate': 'Day rate (non-commission)',
    'nonCommissionNightRate': 'Night rate (non-commission)',
    'nonCommissionEveningRate': 'Evening rate (non-commission)',
    'nonCommissionStandingRate': 'Standing charge (non-commission)',
    'nonCommissionUnitRate': 'Unit rate (non-commission)',
    'accountNumber': 'Account number',
    'ownerFullName': 'Owner full name',
    'homeAddress': 'Home address',
    'dateOfBirth': 'Date of birth',
    'businessType': 'Business type',
    'billFrequency': 'Bill frequency',
    'paymentMethod': 'Payment method',
    'bankName': 'Bank name',
    'accountType': 'Account type',
    'accountTitle': 'Account title',
    'sortCode': 'Sort code',
    'bankAccountNumber': 'Bank account number',
    'cotStatus': 'COT status',
    'cotDate': 'COT date',
    'notes': 'Notes',
    'name': 'Full name',
    'password': 'Password',
    'role': 'Role',
}


def friendly_name(field: str) -> str:
    return FIELD_NAMES.get(field, field.replace('_', ' ').title())


def check_required_str(v, field: str, max_len: int = 255, min_len: int = 1):
    name = friendly_name(field)
    if not v or not isinstance(v, str) or not v.strip():
        raise ValueError(f'{name} is required — please enter a value')
    v = v.strip()
    if len(v) < min_len:
        raise ValueError(f'{name} must be at least {min_len} character{"s" if min_len > 1 else ""}')
    if len(v) > max_len:
        raise ValueError(f'{name} is too long — maximum {max_len} characters allowed')
    return v


def check_optional_str(v, field: str, max_len: int = 255):
    if not v:
        return v
    v = v.strip()
    if len(v) > max_len:
        raise ValueError(f'{friendly_name(field)} is too long — maximum {max_len} characters allowed')
    return v


def check_phone(v, field: str):
    name = friendly_name(field)
    if not v:
        return v
    v = v.strip()
    if not PHONE_RE.match(v):
        raise ValueError(f'{name} should be 7–20 digits, optionally with +, spaces, hyphens, or brackets')
    return v


def check_postcode(v):
    if not v:
        return v
    v = normalize_postcode(v)
    if not UK_POSTCODE_RE.match(v):
        raise ValueError('Postcode format is not valid — it should look like "AB1 2CD" or "SW1A 1AA"')
    return v


def check_rate(v, field: str):
    name = friendly_name(field)
    if v is None:
        return v
    if v < 0:
        raise ValueError(f'{name} cannot be negative — please enter a positive number')
    if v > 999:
        raise ValueError(f'{name} looks too high — maximum is 999. Please check the value')
    return v


def check_bill(v):
    if v is None:
        return v
    if v < 0:
        raise ValueError('Monthly bill cannot be negative')
    if v > 99999:
        raise ValueError('Monthly bill looks too high — maximum is £99,999')
    return v


def check_broker_charge(v):
    if v is None:
        return v
    if v < 0:
        raise ValueError('Broker service charge cannot be negative')
    if v > 99999:
        raise ValueError('Broker service charge looks too high — maximum is £99,999')
    return v


def check_name_chars(v, field: str):
    name = friendly_name(field)
    if v and not NAME_RE.match(v):
        raise ValueError(f'{name} contains invalid characters — only letters, numbers, spaces, and basic punctuation allowed')
    return v


def check_email(v):
    if not v:
        return v
    v = v.strip().lower()
    if not EMAIL_RE.match(v):
        raise ValueError('Email address format is not valid — it should look like "name@company.com"')
    return v


def check_utility(v):
    if v and v not in ('electricity', 'gas', 'both'):
        raise ValueError('Utility type should be either "electricity", "gas", or "both"')
    return v


def check_sort_code(v):
    if not v:
        return v
    v = v.strip()
    if not SORT_CODE_RE.match(v):
        raise ValueError('Sort code format is not valid — it should look like "12-34-56"')
    return v


def check_bank_account(v):
    if not v:
        return v
    v = v.strip()
    if not BANK_ACCOUNT_RE.match(v):
        raise ValueError('Bank account number should be 6–10 digits only')
    return v


def check_yes_no(v, field: str):
    if v and v not in ('yes', 'no'):
        raise ValueError(f'{friendly_name(field)} should be "yes" or "no"')
    return v


def check_cnic(v):
    if not v:
        return v
    v = v.strip()
    digits = re.sub(r'\D', '', v)
    if len(digits) != 13:
        raise ValueError('CNIC must contain exactly 13 digits (format: 12345-1234567-1)')
    return f"{digits[:5]}-{digits[5:12]}-{digits[12]}"


# ─── Auth ───────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str = Field(
        ..., max_length=255,
        description="Email address",
        json_schema_extra={'example': 'user@example.com'}
    )
    password: str = Field(..., description="Account password")


class LoginResponse(BaseModel):
    token: str
    refreshToken: Optional[str] = None
    name: str
    role: str
    userId: int
    managerId: Optional[int] = None


class RegisterRequest(BaseModel):
    name: str = Field(
        ..., max_length=255,
        description="Full name"
    )
    email: str = Field(
        ..., max_length=255,
        description="Email address"
    )
    password: str = Field(
        ..., max_length=128,
        description="Password (min 6 characters)"
    )
    role: str = Field(
        "employee",
        description="User role"
    )
    fatherName: Optional[str] = None
    cnic: Optional[str] = None
    phone: Optional[str] = None
    dateOfBirth: Optional[date] = None
    emergContactName: Optional[str] = None
    emergContactNumber: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., max_length=255, description="Email address")


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="Reset token from email")
    password: str = Field(..., max_length=128, description="New password (min 6 characters)")


class SendOTPRequest(BaseModel):
    email: str = Field(..., max_length=255, description="Email address to send OTP")
    existingEmail: str | None = Field(None, max_length=255, description="Original registered email (for change-email flow)")


class VerifyOTPRequest(BaseModel):
    email: str = Field(..., max_length=255, description="Email address")
    otp: str = Field(..., min_length=6, max_length=6, description="OTP code received via email")
    existingEmail: str | None = Field(None, max_length=255, description="Original registered email (for change-email flow)")


class VerifyOTPResponse(BaseModel):
    message: str
    verified: bool


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    isActive: int
    managerId: Optional[int] = None
    phone: Optional[str] = None
    fatherName: Optional[str] = None
    monthlySalary: Optional[int] = 0
    cnic: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    dateOfBirth: Optional[date] = None
    dateOfJoining: Optional[date] = None
    emergContactName: Optional[str] = None
    emergContactNumber: Optional[str] = None


class AgentOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    isActive: int
    managerId: Optional[int] = None
    phone: Optional[str] = None
    fatherName: Optional[str] = None
    monthlySalary: Optional[int] = 0
    cnic: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    dateOfBirth: Optional[date] = None
    dateOfJoining: Optional[date] = None
    emergContactName: Optional[str] = None
    emergContactNumber: Optional[str] = None


class ManagerTeamStats(BaseModel):
    totalCallbacks: int
    totalTransfers: int
    totalSales: int
    conversionRate: float
    agents: list["AgentStats"]


class AgentStats(BaseModel):
    agent: AgentOut
    callbacks: int
    transfers: int
    sales: int
    conversionRate: float


class AgentDetail(BaseModel):
    agent: AgentOut
    callbacks: List['CallBackOut']
    transfers: List['TransferOut']
    sales: List['SaleOut']
    stats: AgentStats


# ─── Admin Schemas ─────────────────────────────────────────

class ApproveUserRequest(BaseModel):
    managerId: int = Field(..., description="Manager ID to assign to this user")
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    fatherName: Optional[str] = None
    monthlySalary: Optional[int] = 0
    cnic: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    dateOfBirth: Optional[date] = None
    dateOfJoining: Optional[date] = None
    emergContactName: Optional[str] = None
    emergContactNumber: Optional[str] = None

    @field_validator('cnic')
    @classmethod
    def validate_cnic(cls, v):
        return check_cnic(v)


class ResetUserPasswordRequest(BaseModel):
    oldPassword: Optional[str] = Field(None, description="Current password for verification (required when changing own password)")
    newPassword: str = Field(..., max_length=128, description="New password (min 6 characters)")


class CreateManagerRequest(BaseModel):
    name: str
    email: str
    password: str


class CreateAgentRequest(BaseModel):
    name: str
    email: str
    password: str
    managerId: int
    fatherName: Optional[str] = None
    monthlySalary: Optional[int] = 0
    cnic: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    dateOfBirth: Optional[date] = None
    dateOfJoining: Optional[date] = None
    emergContactName: Optional[str] = None
    emergContactNumber: Optional[str] = None

    @field_validator('cnic')
    @classmethod
    def validate_cnic(cls, v):
        return check_cnic(v)


class AssignAgentRequest(BaseModel):
    agentId: int
    managerId: int


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    isActive: Optional[int] = None
    managerId: Optional[int] = None


class UpdateAgentStaffRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    fatherName: Optional[str] = None
    monthlySalary: Optional[int] = 0
    cnic: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    dateOfBirth: Optional[date] = None
    dateOfJoining: Optional[date] = None
    emergContactName: Optional[str] = None
    emergContactNumber: Optional[str] = None

    @field_validator('cnic')
    @classmethod
    def validate_cnic(cls, v):
        return check_cnic(v)


class OverallStats(BaseModel):
    totalAgents: int
    totalManagers: int
    totalCallbacks: int
    totalTransfers: int
    totalSales: int
    conversionRate: float


class ManagerKpi(BaseModel):
    id: int
    name: str
    teamSize: int
    callbacks: int
    transfers: int
    sales: int
    conversionRate: float


class AgentKpi(BaseModel):
    id: int
    name: str
    managerName: Optional[str] = None
    callbacks: int
    transfers: int
    sales: int
    conversionRate: float
    isActive: int
    monthlySalary: Optional[float] = None


class BusinessFeedItem(BaseModel):
    type: str
    action: str
    agentName: str
    description: str
    timestamp: Optional[str] = None
    id: int


class AdminPerformanceOverview(BaseModel):
    topManagers: list[ManagerKpi]
    topAgents: list[AgentKpi]
    bottomAgents: list[AgentKpi]
    totalCallbacks: int
    totalTransfers: int
    totalSales: int
    conversionRate: float


class CallbackOfferedElectricityRateCreate(BaseModel):
    contractLength: Optional[str] = Field(
        None, max_length=50,
        description="Contract length (e.g. 1 Year, 2 Years)"
    )
    supplier: Optional[str] = Field(
        None, max_length=255,
        description="Supplier name for offered rate"
    )
    meterType: Optional[str] = Field(
        None, max_length=50,
        description="Meter type (Standard, Economy 7, etc.)"
    )
    commissionType: Optional[str] = Field(
        None, max_length=50,
        description="Commission type (Commission or Non-Commission)"
    )
    dayUnitRate: Optional[float] = Field(None, description="Day unit rate in p/kWh")
    nightUnitRate: Optional[float] = Field(None, description="Night unit rate in p/kWh")
    eveningUnitRate: Optional[float] = Field(None, description="Evening unit rate in p/kWh")
    standingRate: Optional[float] = Field(None, description="Standing charge in p/day")
    nonCommissionDayRate: Optional[float] = Field(None, description="Day rate (non-commission)")
    nonCommissionNightRate: Optional[float] = Field(None, description="Night rate (non-commission)")
    nonCommissionEveningRate: Optional[float] = Field(None, description="Evening rate (non-commission)")
    nonCommissionStandingRate: Optional[float] = Field(None, description="Standing charge (non-commission)")
    brokerServiceCharge: Optional[float] = Field(None, description="Broker fee in GBP")

    @field_validator('supplier')
    @classmethod
    def strip_supplier(cls, v):
        return v.strip() if v else v

    @field_validator('dayUnitRate', 'nightUnitRate', 'eveningUnitRate', 'standingRate',
                     'nonCommissionDayRate', 'nonCommissionNightRate', 'nonCommissionEveningRate',
                     'nonCommissionStandingRate')
    @classmethod
    def validate_all_rates(cls, v, info):
        return check_rate(v, info.field_name)

    @field_validator('brokerServiceCharge')
    @classmethod
    def validate_broker_charge(cls, v):
        return check_broker_charge(v)


class CallbackOfferedGasRateCreate(BaseModel):
    contractLength: Optional[str] = Field(
        None, max_length=50,
        description="Contract length (e.g. 1 Year)"
    )
    supplier: Optional[str] = Field(
        None, max_length=255,
        description="Supplier name for offered rate"
    )
    unitRate: Optional[float] = Field(None, description="Unit rate in p/kWh")
    standingRate: Optional[float] = Field(None, description="Standing charge in p/day")
    nonCommissionUnitRate: Optional[float] = Field(None, description="Unit rate (non-commission)")
    nonCommissionStandingRate: Optional[float] = Field(None, description="Standing charge (non-commission)")
    brokerServiceCharge: Optional[float] = Field(None, description="Broker fee in GBP")

    @field_validator('unitRate', 'standingRate', 'nonCommissionUnitRate', 'nonCommissionStandingRate')
    @classmethod
    def validate_all_rates(cls, v, info):
        return check_rate(v, info.field_name)

    @field_validator('brokerServiceCharge')
    @classmethod
    def validate_broker_charge(cls, v):
        return check_broker_charge(v)


class ManagerCallbackCreate(BaseModel):
    employeeId: int
    customerId: int
    scheduledDateTime: datetime
    dayOfWeek: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "pending"
    transferId: Optional[int] = None
    accountNumber: Optional[str] = Field(None, max_length=100)
    mpan: Optional[str] = Field(None, max_length=100)
    mprn: Optional[str] = Field(None, max_length=100)
    msn: Optional[str] = Field(None, max_length=100)
    offeredElectricityRates: Optional[List[CallbackOfferedElectricityRateCreate]] = None
    offeredGasRates: Optional[List[CallbackOfferedGasRateCreate]] = None

    @field_validator('accountNumber')
    @classmethod
    def validate_account(cls, v):
        return check_optional_str(v, 'accountNumber', max_len=100)

    @field_validator('mpan')
    @classmethod
    def validate_mpan(cls, v):
        return check_optional_str(v, 'mpan', max_len=100)

    @field_validator('mprn')
    @classmethod
    def validate_mprn(cls, v):
        return check_optional_str(v, 'mprn', max_len=100)

    @field_validator('msn')
    @classmethod
    def validate_msn(cls, v):
        return check_optional_str(v, 'msn', max_len=100)


class ManagerTransferCreate(BaseModel):
    employeeId: int
    customerId: int
    utilityType: str = "electricity"
    supplier: Optional[str] = None
    status: Optional[str] = "pending"
    scheduledDateTime: Optional[datetime] = None
    accountNumber: Optional[str] = None
    mpan: Optional[str] = None
    mprn: Optional[str] = None
    msn: Optional[str] = None
    notes: Optional[str] = None


class ManagerSaleCreate(BaseModel):
    employeeId: int
    customerId: int
    transferId: Optional[int] = None
    ownerFullName: Optional[str] = None
    homeAddress: Optional[str] = None
    dateOfBirth: Optional[date] = None
    businessType: Optional[str] = None
    billFrequency: Optional[str] = None
    paymentMethod: Optional[str] = None
    bankName: Optional[str] = None
    accountType: Optional[str] = None
    accountTitle: Optional[str] = None
    sortCode: Optional[str] = None
    bankAccountNumber: Optional[str] = None
    notes: Optional[str] = None


# ─── Electricity Meter ────────────────────────────────

class ElectricityMeterOut(BaseModel):
    id: int
    customerId: int
    meterNumber: int
    currentSupplier: Optional[str] = None
    supplyNumber: Optional[str] = None
    dayUnitRate: Optional[float] = None
    nightUnitRate: Optional[float] = None
    eveningUnitRate: Optional[float] = None
    standingRate: Optional[float] = None
    monthlyBill: Optional[float] = None
    contractEndDate: Optional[date] = None


class ElectricityMeterCreate(BaseModel):
    meterNumber: int = Field(1, description="Meter number (1-based)")
    currentSupplier: Optional[str] = Field(
        None, max_length=255,
        description="Current energy supplier name"
    )
    supplyNumber: Optional[str] = Field(
        None, max_length=100,
        description="Supply number / MPAN"
    )
    dayUnitRate: Optional[float] = Field(
        None,
        description="Day unit rate in p/kWh"
    )
    nightUnitRate: Optional[float] = Field(
        None,
        description="Night unit rate in p/kWh"
    )
    eveningUnitRate: Optional[float] = Field(
        None,
        description="Evening unit rate in p/kWh"
    )
    standingRate: Optional[float] = Field(
        None,
        description="Standing charge in p/day"
    )
    monthlyBill: Optional[float] = Field(
        None,
        description="Estimated monthly bill in GBP"
    )
    contractEndDate: Optional[date] = Field(
        None, description="Contract end date (YYYY-MM-DD)"
    )

    @field_validator('currentSupplier', 'supplyNumber')
    @classmethod
    def strip_fields(cls, v):
        return strip_str(v) if v else v

    @field_validator('dayUnitRate')
    @classmethod
    def validate_day_rate(cls, v):
        return check_rate(v, 'dayUnitRate')

    @field_validator('nightUnitRate')
    @classmethod
    def validate_night_rate(cls, v):
        return check_rate(v, 'nightUnitRate')

    @field_validator('eveningUnitRate')
    @classmethod
    def validate_evening_rate(cls, v):
        return check_rate(v, 'eveningUnitRate')

    @field_validator('standingRate')
    @classmethod
    def validate_standing_rate(cls, v):
        return check_rate(v, 'standingRate')

    @field_validator('monthlyBill')
    @classmethod
    def validate_bill(cls, v):
        return check_bill(v)


class GasMeterOut(BaseModel):
    id: int
    customerId: int
    meterNumber: int
    currentSupplier: Optional[str] = None
    unitRate: Optional[float] = None
    standingRate: Optional[float] = None
    monthlyBill: Optional[float] = None
    contractEndDate: Optional[date] = None



class GasMeterCreate(BaseModel):
    meterNumber: int = Field(1, description="Meter number (1-based)")
    currentSupplier: Optional[str] = Field(
        None, max_length=255,
        description="Current gas supplier name"
    )
    unitRate: Optional[float] = Field(
        None,
        description="Unit rate in p/kWh"
    )
    standingRate: Optional[float] = Field(
        None,
        description="Standing charge in p/day"
    )
    monthlyBill: Optional[float] = Field(
        None,
        description="Estimated monthly bill in GBP"
    )
    contractEndDate: Optional[date] = Field(
        None, description="Contract end date (YYYY-MM-DD)"
    )

    @field_validator('currentSupplier')
    @classmethod
    def strip_fields(cls, v):
        return strip_str(v) if v else v

    @field_validator('unitRate')
    @classmethod
    def validate_unit_rate(cls, v):
        return check_rate(v, 'unitRate')

    @field_validator('standingRate')
    @classmethod
    def validate_standing_rate(cls, v):
        return check_rate(v, 'standingRate')

    @field_validator('monthlyBill')
    @classmethod
    def validate_bill(cls, v):
        return check_bill(v)


# ─── Address ──────────────────────────────────────────────

class AddressOut(BaseModel):
    id: int
    customerId: int
    businessAddress: Optional[str] = None
    postcode: Optional[str] = None



class AddressCreate(BaseModel):
    businessAddress: Optional[str] = Field(
        None, max_length=500,
        description="Full business address"
    )
    postcode: Optional[str] = Field(
        None, max_length=20,
        description="UK postcode (e.g. AB1 2CD)"
    )

    @field_validator('postcode')
    @classmethod
    def format_postcode(cls, v):
        return check_postcode(v) if v else v

    @field_validator('businessAddress')
    @classmethod
    def strip_address(cls, v):
        return strip_str(v) if v else v


# ─── Customer ───────────────────────────────────────────

class CustomerOut(BaseModel):
    id: int
    businessName: str
    ownerName: str
    businessPhone: str
    ownerPhone: Optional[str] = None
    email: Optional[str] = None
    businessAddress: Optional[str] = None
    postcode: Optional[str] = None
    utilityType: str
    employeeId: Optional[int] = None
    createdAt: datetime
    electricityMeters: List[ElectricityMeterOut] = []
    gasMeters: List[GasMeterOut] = []
    addresses: List[AddressOut] = []



class CustomerCreate(BaseModel):
    businessName: str = Field(
        ..., max_length=255,
        description="Business name is required"
    )
    ownerName: Optional[str] = Field(
        None, max_length=255,
        description="Owner / director full name"
    )
    businessPhone: str = Field(
        ..., max_length=20,
        description="Business phone number"
    )
    ownerPhone: Optional[str] = Field(
        None, max_length=20,
        description="Owner personal phone number"
    )
    email: Optional[str] = Field(
        None, max_length=255,
        description="Email address"
    )
    businessAddress: str = Field(
        ..., max_length=500,
        description="Business address is required"
    )
    utilityType: str = Field(
        "electricity",
        description="Utility type (electricity or gas)"
    )
    employeeId: Optional[int] = Field(
        None,
        description="Employee ID (auto-set from JWT on server)"
    )
    postcode: str = Field(
        ..., max_length=20,
        description="Postcode is required (UK format, e.g. AB1 2CD)"
    )
    electricityRates: Optional[List[ElectricityMeterCreate]] = None
    gasRates: Optional[List[GasMeterCreate]] = None

    @field_validator('businessName')
    @classmethod
    def validate_business_name(cls, v):
        return check_name_chars(check_required_str(v, 'businessName'), 'businessName')

    @field_validator('ownerName')
    @classmethod
    def validate_owner_name(cls, v):
        return check_name_chars(check_optional_str(v, 'ownerName'), 'ownerName')

    @field_validator('businessPhone')
    @classmethod
    def validate_phone(cls, v):
        v = check_required_str(v, 'businessPhone')
        return check_phone(v, 'businessPhone')

    @field_validator('ownerPhone')
    @classmethod
    def validate_owner_phone(cls, v):
        return check_phone(v, 'ownerPhone')

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        return check_email(v)

    @field_validator('businessAddress')
    @classmethod
    def validate_address(cls, v):
        return check_required_str(v, 'businessAddress', max_len=500)

    @field_validator('utilityType')
    @classmethod
    def validate_utility(cls, v):
        return check_utility(v)

    @field_validator('postcode')
    @classmethod
    def validate_postcode(cls, v):
        v = check_required_str(v, 'postcode')
        return check_postcode(v)


class CustomerUpdate(BaseModel):
    businessName: Optional[str] = Field(
        None, max_length=255,
        description="Business name"
    )
    ownerName: Optional[str] = Field(
        None, max_length=255,
        description="Owner / director full name"
    )
    businessPhone: Optional[str] = Field(
        None, max_length=20,
        description="Business phone number"
    )
    ownerPhone: Optional[str] = Field(
        None, max_length=20,
        description="Owner personal phone number"
    )
    email: Optional[str] = Field(
        None, max_length=255,
        description="Email address"
    )
    businessAddress: Optional[str] = Field(
        None, max_length=500,
        description="Business address"
    )
    utilityType: Optional[str] = Field(
        None,
        description="Utility type (electricity or gas)"
    )
    postcode: Optional[str] = Field(
        None, max_length=20,
        description="UK postcode (e.g. AB1 2CD)"
    )
    electricityRates: Optional[List[ElectricityMeterCreate]] = None
    gasRates: Optional[List[GasMeterCreate]] = None

    @field_validator('businessName')
    @classmethod
    def validate_business_name(cls, v):
        return check_name_chars(check_optional_str(v, 'businessName'), 'businessName')

    @field_validator('ownerName')
    @classmethod
    def validate_owner_name(cls, v):
        return check_name_chars(check_optional_str(v, 'ownerName'), 'ownerName')

    @field_validator('businessPhone')
    @classmethod
    def validate_phone(cls, v):
        return check_phone(v, 'businessPhone')

    @field_validator('ownerPhone')
    @classmethod
    def validate_owner_phone(cls, v):
        return check_phone(v, 'ownerPhone')

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        return check_email(v)

    @field_validator('businessAddress')
    @classmethod
    def validate_address(cls, v):
        if v:
            v = v.strip()
            if len(v) > 500:
                raise ValueError('Business address is too long — maximum 500 characters')
        return v

    @field_validator('utilityType')
    @classmethod
    def validate_utility(cls, v):
        return check_utility(v)

    @field_validator('postcode')
    @classmethod
    def validate_postcode(cls, v):
        return check_postcode(v)


# ─── CallBack Offered Rates ─────────────────────────────

class CallbackOfferedElectricityRateOut(BaseModel):
    id: int
    callbackId: int
    contractLength: Optional[str] = None
    supplier: Optional[str] = None
    meterType: Optional[str] = None
    commissionType: Optional[str] = None
    dayUnitRate: Optional[float] = None
    nightUnitRate: Optional[float] = None
    eveningUnitRate: Optional[float] = None
    standingRate: Optional[float] = None
    nonCommissionDayRate: Optional[float] = None
    nonCommissionNightRate: Optional[float] = None
    nonCommissionEveningRate: Optional[float] = None
    nonCommissionStandingRate: Optional[float] = None
    brokerServiceCharge: Optional[float] = None



def _rate_validators(cls):
    cls._add_rate_validators()
    return cls


def _add_rate_validators(*fields):
    validators = {}
    for field in fields:
        @classmethod
        def make_validator(f=field):
            @classmethod
            def validator(cls, v):
                return check_rate(v, f)
            return validator
        validators[f'validate_{field}'] = make_validator()
    return validators





class CallbackOfferedGasRateOut(BaseModel):
    id: int
    callbackId: int
    contractLength: Optional[str] = None
    supplier: Optional[str] = None
    unitRate: Optional[float] = None
    standingRate: Optional[float] = None
    nonCommissionUnitRate: Optional[float] = None
    nonCommissionStandingRate: Optional[float] = None
    brokerServiceCharge: Optional[float] = None






# ─── Transfer Offered Rates ─────────────────────────────

class TransferOfferedElectricityRateOut(BaseModel):
    id: int
    transferId: int
    contractLength: Optional[str] = None
    supplier: Optional[str] = None
    meterType: Optional[str] = None
    commissionType: Optional[str] = None
    dayUnitRate: Optional[float] = None
    nightUnitRate: Optional[float] = None
    eveningUnitRate: Optional[float] = None
    standingRate: Optional[float] = None
    nonCommissionDayRate: Optional[float] = None
    nonCommissionNightRate: Optional[float] = None
    nonCommissionEveningRate: Optional[float] = None
    nonCommissionStandingRate: Optional[float] = None
    brokerServiceCharge: Optional[float] = None



class TransferOfferedElectricityRateCreate(BaseModel):
    contractLength: Optional[str] = None
    supplier: Optional[str] = None
    meterType: Optional[str] = None
    commissionType: Optional[str] = None
    dayUnitRate: Optional[float] = Field(None, description="Day unit rate in p/kWh")
    nightUnitRate: Optional[float] = Field(None, description="Night unit rate in p/kWh")
    eveningUnitRate: Optional[float] = Field(None, description="Evening unit rate in p/kWh")
    standingRate: Optional[float] = Field(None, description="Standing charge in p/day")
    nonCommissionDayRate: Optional[float] = Field(None, description="Day rate (non-commission)")
    nonCommissionNightRate: Optional[float] = Field(None, description="Night rate (non-commission)")
    nonCommissionEveningRate: Optional[float] = Field(None, description="Evening rate (non-commission)")
    nonCommissionStandingRate: Optional[float] = Field(None, description="Standing charge (non-commission)")
    brokerServiceCharge: Optional[float] = Field(None, description="Broker fee in GBP")

    @field_validator('dayUnitRate', 'nightUnitRate', 'eveningUnitRate', 'standingRate',
                     'nonCommissionDayRate', 'nonCommissionNightRate', 'nonCommissionEveningRate',
                     'nonCommissionStandingRate')
    @classmethod
    def validate_all_rates(cls, v, info):
        return check_rate(v, info.field_name)

    @field_validator('brokerServiceCharge')
    @classmethod
    def validate_broker_charge(cls, v):
        return check_broker_charge(v)


class TransferOfferedGasRateOut(BaseModel):
    id: int
    transferId: int
    contractLength: Optional[str] = None
    supplier: Optional[str] = None
    unitRate: Optional[float] = None
    standingRate: Optional[float] = None
    nonCommissionUnitRate: Optional[float] = None
    nonCommissionStandingRate: Optional[float] = None
    brokerServiceCharge: Optional[float] = None



class TransferOfferedGasRateCreate(BaseModel):
    contractLength: Optional[str] = None
    supplier: Optional[str] = None
    unitRate: Optional[float] = Field(None, description="Unit rate in p/kWh")
    standingRate: Optional[float] = Field(None, description="Standing charge in p/day")
    nonCommissionUnitRate: Optional[float] = Field(None, description="Unit rate (non-commission)")
    nonCommissionStandingRate: Optional[float] = Field(None, description="Standing charge (non-commission)")
    brokerServiceCharge: Optional[float] = Field(None, description="Broker fee in GBP")

    @field_validator('unitRate', 'standingRate', 'nonCommissionUnitRate', 'nonCommissionStandingRate')
    @classmethod
    def validate_all_rates(cls, v, info):
        return check_rate(v, info.field_name)

    @field_validator('brokerServiceCharge')
    @classmethod
    def validate_broker_charge(cls, v):
        return check_broker_charge(v)


# ─── CallBack ────────────────────────────────────────────

class CallBackOut(BaseModel):
    id: int
    employeeId: int
    customerId: int
    scheduledDateTime: datetime
    dayOfWeek: Optional[str] = None
    notes: Optional[str] = None
    status: str
    outcome: Optional[str] = None
    notInterestedReason: Optional[str] = None
    createdAt: datetime
    customer: Optional[CustomerOut] = None
    agentName: Optional[str] = None
    offeredElectricityRates: List[CallbackOfferedElectricityRateOut] = []
    offeredGasRates: List[CallbackOfferedGasRateOut] = []
    transferId: Optional[int] = None
    accountNumber: Optional[str] = None
    mpan: Optional[str] = None
    mprn: Optional[str] = None
    msn: Optional[str] = None
    linkedTransferAccountNumber: Optional[str] = None
    linkedTransferMpan: Optional[str] = None
    linkedTransferMprn: Optional[str] = None
    linkedTransferMsn: Optional[str] = None


class CallBackCreate(BaseModel):
    employeeId: Optional[int] = Field(None, description="Employee ID (auto-set from JWT on server)")
    customerId: int = Field(..., description="Customer ID is required")
    scheduledDateTime: datetime = Field(..., description="Scheduled date/time is required")
    dayOfWeek: Optional[str] = Field(
        None, max_length=20,
        description="Day of week (auto-calculated on server)"
    )
    notes: Optional[str] = Field(
        None, max_length=2000,
        description="Callback notes"
    )
    accountNumber: Optional[str] = Field(None, max_length=100, description="Account number with supplier")
    mpan: Optional[str] = Field(None, max_length=100, description="MPAN (electricity supply number)")
    mprn: Optional[str] = Field(None, max_length=100, description="MPRN (gas supply number)")
    msn: Optional[str] = Field(None, max_length=100, description="Meter serial number")
    offeredElectricityRates: Optional[List[CallbackOfferedElectricityRateCreate]] = None
    offeredGasRates: Optional[List[CallbackOfferedGasRateCreate]] = None

    @field_validator('scheduledDateTime')
    @classmethod
    def validate_scheduled_datetime(cls, v):
        if v and v < datetime.now():
            raise ValueError('Scheduled date/time cannot be in the past')
        return v

    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v):
        return check_optional_str(v, 'notes', max_len=2000)

    @field_validator('accountNumber')
    @classmethod
    def validate_account(cls, v):
        return check_optional_str(v, 'accountNumber', max_len=100)

    @field_validator('mpan')
    @classmethod
    def validate_mpan(cls, v):
        return check_optional_str(v, 'mpan', max_len=100)

    @field_validator('mprn')
    @classmethod
    def validate_mprn(cls, v):
        return check_optional_str(v, 'mprn', max_len=100)

    @field_validator('msn')
    @classmethod
    def validate_msn(cls, v):
        return check_optional_str(v, 'msn', max_len=100)


class CallBackUpdate(BaseModel):
    assignedAgentId: Optional[int] = None
    scheduledDateTime: Optional[datetime] = None
    dayOfWeek: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=2000)
    status: Optional[str] = Field(
        None, description="Status: pending, completed, failed, overdue, chasing, cotInProgress, done"
    )
    outcome: Optional[str] = Field(
        None, description="Outcome: interested, not_interested, no_answer, rescheduled, converted"
    )
    notInterestedReason: Optional[str] = Field(None, max_length=500, description="Reason for not interested")
    offeredElectricityRates: Optional[List[CallbackOfferedElectricityRateCreate]] = None
    offeredGasRates: Optional[List[CallbackOfferedGasRateCreate]] = None
    businessName: Optional[str] = Field(None, max_length=255)
    businessAddress: Optional[str] = Field(None, max_length=500)
    businessPhone: Optional[str] = Field(None, max_length=20)
    ownerName: Optional[str] = Field(None, max_length=255)
    ownerPhone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    utilityType: Optional[str] = Field(
        None, description="Utility type (electricity or gas)"
    )
    postcode: Optional[str] = Field(None, max_length=20)
    accountNumber: Optional[str] = Field(None, max_length=100, description="Account number with supplier")
    mpan: Optional[str] = Field(None, max_length=100, description="MPAN (electricity supply number)")
    mprn: Optional[str] = Field(None, max_length=100, description="MPRN (gas supply number)")
    msn: Optional[str] = Field(None, max_length=100, description="Meter serial number")
    electricityRates: Optional[List[ElectricityMeterCreate]] = None
    gasRates: Optional[List[GasMeterCreate]] = None

    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v):
        return check_optional_str(v, 'notes', max_len=2000)

    @field_validator('businessName')
    @classmethod
    def validate_name(cls, v):
        return check_name_chars(check_optional_str(v, 'businessName'), 'businessName')

    @field_validator('ownerName')
    @classmethod
    def validate_owner(cls, v):
        return check_name_chars(check_optional_str(v, 'ownerName'), 'ownerName')

    @field_validator('businessAddress')
    @classmethod
    def validate_address(cls, v):
        return check_optional_str(v, 'businessAddress', max_len=500)

    @field_validator('businessPhone')
    @classmethod
    def validate_phone(cls, v):
        return check_phone(v, 'businessPhone')

    @field_validator('ownerPhone')
    @classmethod
    def validate_owner_phone(cls, v):
        return check_phone(v, 'ownerPhone')

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        return check_email(v)

    @field_validator('utilityType')
    @classmethod
    def validate_utility(cls, v):
        return check_utility(v)

    @field_validator('postcode')
    @classmethod
    def validate_postcode(cls, v):
        return check_postcode(v)

    @field_validator('accountNumber')
    @classmethod
    def validate_account(cls, v):
        return check_optional_str(v, 'accountNumber', max_len=100)

    @field_validator('mpan')
    @classmethod
    def validate_mpan(cls, v):
        return check_optional_str(v, 'mpan', max_len=100)

    @field_validator('mprn')
    @classmethod
    def validate_mprn(cls, v):
        return check_optional_str(v, 'mprn', max_len=100)

    @field_validator('msn')
    @classmethod
    def validate_msn(cls, v):
        return check_optional_str(v, 'msn', max_len=100)



# ─── Transfer ────────────────────────────────────────────

class TransferOut(BaseModel):
    id: int
    employeeId: int
    customerId: int
    callBackId: Optional[int] = None
    utilityType: str
    supplier: Optional[str] = None
    status: str
    outcome: Optional[str] = None
    notInterestedReason: Optional[str] = None
    scheduledDateTime: Optional[datetime] = None
    accountNumber: Optional[str] = None
    mpan: Optional[str] = None
    mprn: Optional[str] = None
    msn: Optional[str] = None
    notes: Optional[str] = None
    createdAt: datetime
    customer: Optional[CustomerOut] = None
    offeredElectricityRates: List[TransferOfferedElectricityRateOut] = []
    offeredGasRates: List[TransferOfferedGasRateOut] = []
    agentName: Optional[str] = None



class TransferCreate(BaseModel):
    employeeId: Optional[int] = Field(None, description="Employee ID (auto-set from JWT on server)")
    customerId: int = Field(..., description="Customer ID is required")
    callBackId: Optional[int] = Field(None, description="Linked callback ID if created from callback")
    utilityType: str = Field("electricity", description="Utility type (electricity or gas)")
    supplier: Optional[str] = Field(None, max_length=255, description="Supplier to transfer to")
    scheduledDateTime: Optional[datetime] = None
    accountNumber: Optional[str] = Field(None, max_length=100, description="Account number with current supplier")
    mpan: Optional[str] = Field(None, max_length=100, description="MPAN (electricity supply number)")
    mprn: Optional[str] = Field(None, max_length=100, description="MPRN (gas supply number)")
    msn: Optional[str] = Field(None, max_length=100, description="Meter serial number")
    notes: Optional[str] = Field(None, max_length=2000)
    offeredElectricityRates: Optional[List[TransferOfferedElectricityRateCreate]] = None
    offeredGasRates: Optional[List[TransferOfferedGasRateCreate]] = None

    @field_validator('utilityType')
    @classmethod
    def validate_utility(cls, v):
        return check_utility(v)

    @field_validator('supplier')
    @classmethod
    def validate_supplier(cls, v):
        return check_optional_str(v, 'supplier')

    @field_validator('accountNumber')
    @classmethod
    def validate_account(cls, v):
        return check_optional_str(v, 'accountNumber', max_len=100)

    @field_validator('mpan')
    @classmethod
    def validate_mpan(cls, v):
        return check_optional_str(v, 'mpan', max_len=100)

    @field_validator('mprn')
    @classmethod
    def validate_mprn(cls, v):
        return check_optional_str(v, 'mprn', max_len=100)

    @field_validator('msn')
    @classmethod
    def validate_msn(cls, v):
        return check_optional_str(v, 'msn', max_len=100)

    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v):
        return check_optional_str(v, 'notes', max_len=2000)


class TransferUpdate(BaseModel):
    utilityType: Optional[str] = Field(None, description="Utility type (electricity or gas)")
    callBackId: Optional[int] = None
    supplier: Optional[str] = Field(None, max_length=255)
    status: Optional[str] = Field(
        None, description="Status: pending, completed, failed, overdue, chasing, cotInProgress"
    )
    outcome: Optional[str] = Field(
        None, description="Outcome: interested, not_interested, no_answer, rescheduled, converted"
    )
    notInterestedReason: Optional[str] = Field(None, max_length=500, description="Reason for not interested")
    scheduledDateTime: Optional[datetime] = None
    accountNumber: Optional[str] = Field(None, max_length=100)
    mpan: Optional[str] = Field(None, max_length=100)
    mprn: Optional[str] = Field(None, max_length=100)
    msn: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=2000)
    offeredElectricityRates: Optional[List[TransferOfferedElectricityRateCreate]] = None
    offeredGasRates: Optional[List[TransferOfferedGasRateCreate]] = None

    @field_validator('utilityType')
    @classmethod
    def validate_utility(cls, v):
        return check_utility(v)

    @field_validator('supplier')
    @classmethod
    def validate_supplier(cls, v):
        return check_optional_str(v, 'supplier')

    @field_validator('accountNumber')
    @classmethod
    def validate_account(cls, v):
        return check_optional_str(v, 'accountNumber', max_len=100)

    @field_validator('mpan')
    @classmethod
    def validate_mpan(cls, v):
        return check_optional_str(v, 'mpan', max_len=100)

    @field_validator('mprn')
    @classmethod
    def validate_mprn(cls, v):
        return check_optional_str(v, 'mprn', max_len=100)

    @field_validator('msn')
    @classmethod
    def validate_msn(cls, v):
        return check_optional_str(v, 'msn', max_len=100)

    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v):
        return check_optional_str(v, 'notes', max_len=2000)


# ─── Sale ────────────────────────────────────────────────

class SaleOut(BaseModel):
    id: int
    transferId: Optional[int] = None
    employeeId: int
    agentName: Optional[str] = None
    customerId: int
    ownerFullName: Optional[str] = None
    homeAddress: Optional[str] = None
    dateOfBirth: Optional[date] = None
    businessType: Optional[str] = None
    billFrequency: Optional[str] = None
    paymentMethod: Optional[str] = None
    bankName: Optional[str] = None
    accountType: Optional[str] = None
    accountTitle: Optional[str] = None
    sortCode: Optional[str] = None
    bankAccountNumber: Optional[str] = None
    cotStatus: str
    cotDate: Optional[date] = None
    notes: Optional[str] = None
    createdAt: datetime
    customer: Optional[CustomerOut] = None



class SaleCreate(BaseModel):
    transferId: Optional[int] = None
    employeeId: Optional[int] = Field(None, description="Employee ID (auto-set from JWT on server)")
    customerId: int = Field(..., description="Customer ID is required")
    ownerFullName: Optional[str] = Field(None, max_length=255, description="Full name of business owner")
    homeAddress: Optional[str] = Field(None, max_length=500, description="Home address of owner")
    dateOfBirth: Optional[date] = Field(None, description="Date of birth (YYYY-MM-DD — must be at least 18 years ago)")
    businessType: Optional[str] = Field(None, max_length=100, description="Type of business")
    billFrequency: Optional[str] = Field(
        None, max_length=50,
        description="Bill frequency (Monthly, Quarterly, etc.)"
    )
    paymentMethod: Optional[str] = Field(
        None, max_length=50,
        description="Payment method (Direct Debit, BACS, etc.)"
    )
    bankName: Optional[str] = Field(None, max_length=255)
    accountType: Optional[str] = Field(None, max_length=50)
    accountTitle: Optional[str] = Field(None, max_length=255)
    sortCode: Optional[str] = Field(
        None, max_length=10,
        description="Sort code (format: XX-XX-XX)"
    )
    bankAccountNumber: Optional[str] = Field(
        None, max_length=20,
        description="Bank account number (6-10 digits)"
    )
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator('ownerFullName')
    @classmethod
    def validate_owner_name(cls, v):
        return check_optional_str(v, 'ownerFullName')

    @field_validator('homeAddress')
    @classmethod
    def validate_address(cls, v):
        return check_optional_str(v, 'homeAddress', max_len=500)

    @field_validator('businessType')
    @classmethod
    def validate_biz_type(cls, v):
        return check_optional_str(v, 'businessType', max_len=100)

    @field_validator('billFrequency')
    @classmethod
    def validate_bill_freq(cls, v):
        return check_optional_str(v, 'billFrequency', max_len=50)

    @field_validator('paymentMethod')
    @classmethod
    def validate_payment(cls, v):
        return check_optional_str(v, 'paymentMethod', max_len=50)

    @field_validator('bankName')
    @classmethod
    def validate_bank_name(cls, v):
        return check_optional_str(v, 'bankName')

    @field_validator('accountType')
    @classmethod
    def validate_acct_type(cls, v):
        return check_optional_str(v, 'accountType', max_len=50)

    @field_validator('accountTitle')
    @classmethod
    def validate_acct_title(cls, v):
        return check_optional_str(v, 'accountTitle')

    @field_validator('sortCode')
    @classmethod
    def validate_sort(cls, v):
        return check_sort_code(v)

    @field_validator('bankAccountNumber')
    @classmethod
    def validate_bank_acct(cls, v):
        return check_bank_account(v)

    @field_validator('dateOfBirth')
    @classmethod
    def validate_dob(cls, v):
        if v and v > date.today() - timedelta(days=365*18):
            raise ValueError('Date of birth must be at least 18 years ago')
        return v

    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v):
        return check_optional_str(v, 'notes', max_len=2000)


class SaleUpdate(BaseModel):
    ownerFullName: Optional[str] = Field(None, max_length=255)
    homeAddress: Optional[str] = Field(None, max_length=500)
    dateOfBirth: Optional[date] = Field(None, description="Date of birth (must be at least 18 years ago)")
    businessType: Optional[str] = Field(None, max_length=100)
    billFrequency: Optional[str] = Field(None, max_length=50)
    paymentMethod: Optional[str] = Field(None, max_length=50)
    bankName: Optional[str] = Field(None, max_length=255)
    accountType: Optional[str] = Field(None, max_length=50)
    accountTitle: Optional[str] = Field(None, max_length=255)
    sortCode: Optional[str] = Field(None, max_length=10)
    bankAccountNumber: Optional[str] = Field(None, max_length=20)
    cotStatus: Optional[str] = Field(
        None, description="COT status: cotInProgress, transferSubmitted, completed, hold"
    )
    cotDate: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator('ownerFullName')
    @classmethod
    def validate_owner_name(cls, v):
        return check_optional_str(v, 'ownerFullName')

    @field_validator('homeAddress')
    @classmethod
    def validate_address(cls, v):
        return check_optional_str(v, 'homeAddress', max_len=500)

    @field_validator('businessType')
    @classmethod
    def validate_biz_type(cls, v):
        return check_optional_str(v, 'businessType', max_len=100)

    @field_validator('billFrequency')
    @classmethod
    def validate_bill_freq(cls, v):
        return check_optional_str(v, 'billFrequency', max_len=50)

    @field_validator('paymentMethod')
    @classmethod
    def validate_payment(cls, v):
        return check_optional_str(v, 'paymentMethod', max_len=50)

    @field_validator('bankName')
    @classmethod
    def validate_bank_name(cls, v):
        return check_optional_str(v, 'bankName')

    @field_validator('accountType')
    @classmethod
    def validate_acct_type(cls, v):
        return check_optional_str(v, 'accountType', max_len=50)

    @field_validator('accountTitle')
    @classmethod
    def validate_acct_title(cls, v):
        return check_optional_str(v, 'accountTitle')

    @field_validator('sortCode')
    @classmethod
    def validate_sort(cls, v):
        return check_sort_code(v)

    @field_validator('bankAccountNumber')
    @classmethod
    def validate_bank_acct(cls, v):
        return check_bank_account(v)

    @field_validator('dateOfBirth')
    @classmethod
    def validate_dob(cls, v):
        if v and v > date.today() - timedelta(days=365*18):
            raise ValueError('Date of birth must be at least 18 years ago')
        return v

    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v):
        return check_optional_str(v, 'notes', max_len=2000)


# ─── Attendance ────────────────────────────────────────────

class AttendanceCheckIn(BaseModel):
    checkin_reason: Optional[str] = Field(None, max_length=500, description="Reason for check-in")


class AttendanceCheckOut(BaseModel):
    checkout_reason: Optional[str] = Field(None, max_length=500, description="Reason for check-out")


class LateArrivalReport(BaseModel):
    date: date
    expected_arrival_time: time
    reason: str = Field(..., min_length=1, max_length=1000, description="Reason for late arrival")


class AttendanceOut(BaseModel):
    id: int
    userId: int
    date: date
    checkIn: Optional[datetime] = None
    checkOut: Optional[datetime] = None
    status: str
    checkin_reason: Optional[str] = None
    checkout_reason: Optional[str] = None
    expected_arrival_time: Optional[str] = None
    late_arrival_reason: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime


class AttendanceSummary(BaseModel):
    presentCount: int
    lateCount: int
    absentCount: int
    totalDays: int


class UserAttendanceToday(BaseModel):
    userId: int
    userName: str
    userEmail: str
    attendance: Optional[AttendanceOut] = None


class LeaveRequestCreate(BaseModel):
    leave_type: str = Field(..., max_length=50, description="Leave type")
    from_date: date
    to_date: date
    reason: Optional[str] = Field(None, max_length=1000)


class LeaveRequestReview(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    admin_notes: Optional[str] = Field(None, max_length=500)


class LeaveRequestOut(BaseModel):
    id: int
    userId: int
    userName: Optional[str] = None
    leaveType: str
    fromDate: date
    toDate: date
    reason: Optional[str] = None
    status: str
    adminId: Optional[int] = None
    adminNotes: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = {"from_attributes": True}


class LoanCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Loan amount")
    reason: Optional[str] = Field(None, max_length=1000)


class LoanReview(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    admin_notes: Optional[str] = Field(None, max_length=500)


class LoanOut(BaseModel):
    id: int
    userId: int
    userName: Optional[str] = None
    amount: float
    reason: Optional[str] = None
    status: str
    adminId: Optional[int] = None
    adminNotes: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = {"from_attributes": True}
