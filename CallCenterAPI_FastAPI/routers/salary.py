from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import User, Attendance
from .auth import get_current_user
from datetime import datetime, date
from calendar import monthrange
from fastapi.responses import Response
from xhtml2pdf import pisa
import io

router = APIRouter(prefix="/api/salary", tags=["salary"])


def _employee_id(user: User) -> str:
    return f"CAEL{user.id:04d}"


def _month_name(m: int) -> str:
    names = ["", "January", "February", "March", "April", "May", "June",
             "July", "August", "September", "October", "November", "December"]
    return names[m]


def _fmt(n: int) -> str:
    return f"Rs. {n:,}"


def _salary_slip_html(
    employee_name: str,
    employee_id: str,
    designation: str,
    department: str,
    cnic: str,
    doj: str,
    period_label: str,
    working_days: str,
    present_days: str,
    absent_days: str,
    earnings: list,
    deductions: list,
    gross: int,
    total_deductions: int,
    net_salary: int,
    generated_at: str,
) -> str:
    earn_rows = "".join(
        f'<div class="item"><span>{lbl}</span><span>{_fmt(val)}</span></div>'
        for lbl, val in earnings
    )
    deduct_rows = "".join(
        f'<div class="item"><span>{lbl}</span><span>{_fmt(val)}</span></div>'
        for lbl, val in deductions
    )
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body{{font-family:Arial,sans-serif;padding:30px 40px;color:#333;}}
.header{{text-align:center;}}
.company{{font-size:34px;font-weight:bold;color:#1a1a2e;}}
.title{{font-size:22px;font-weight:700;letter-spacing:2px;color:#2144b3;}}
.period{{color:#777;margin-top:4px;font-size:14px;}}
hr{{border:none;border-top:1.5px solid #dcdcdc;margin:22px 0;}}
.row{{display:flex;gap:50px;}}
.col{{flex:1;}}
.section-title{{font-size:11px;color:#8a8a8a;font-weight:bold;letter-spacing:1.5px;margin-bottom:14px;text-transform:uppercase;}}
.item{{display:flex;justify-content:space-between;margin-bottom:10px;font-size:13px;}}
.bold{{font-weight:bold;border-top:1px solid #e0e0e0;padding-top:8px;margin-top:8px;}}
.net-salary{{margin-top:28px;border:1.5px solid #bcd0ff;background:#eef4ff;padding:18px 25px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;}}
.net-label{{color:#2144b3;font-weight:700;letter-spacing:2px;font-size:14px;}}
.net-amount{{color:#2144b3;font-size:36px;font-weight:bold;}}
.footer{{text-align:center;color:#999;margin-top:36px;font-size:11px;line-height:1.6;}}
</style>
</head>
<body>
<div class="header">
    <div class="company">RT International</div>
    <div class="title">SALARY SLIP</div>
    <div class="period">{period_label}</div>
</div>
<hr>
<div class="row">
<div class="col">
    <div class="section-title">Employee Information</div>
    <div class="item"><span>Name</span><span>{employee_name}</span></div>
    <div class="item"><span>Employee ID</span><span>{employee_id}</span></div>
    <div class="item"><span>Designation</span><span>{designation}</span></div>
    <div class="item"><span>Department</span><span>{department}</span></div>
    <div class="item"><span>CNIC</span><span>{cnic}</span></div>
    <div class="item"><span>Date of Joining</span><span>{doj}</span></div>
</div>
<div class="col">
    <div class="section-title">Attendance Summary</div>
    <div class="item"><span>Working Days</span><span>{working_days}</span></div>
    <div class="item"><span>Present Days</span><span>{present_days}</span></div>
    <div class="item"><span>Absent Days</span><span>{absent_days}</span></div>
</div>
</div>
<hr>
<div class="row">
<div class="col">
    <div class="section-title">Earnings</div>
    {earn_rows}
    <div class="item bold"><span>Gross Salary</span><span>{_fmt(gross)}</span></div>
</div>
<div class="col">
    <div class="section-title">Deductions</div>
    {deduct_rows}
    <div class="item bold"><span>Total Deductions</span><span>{_fmt(total_deductions)}</span></div>
</div>
</div>
<div class="net-salary">
    <div class="net-label">Net Salary</div>
    <div class="net-amount">{_fmt(net_salary)}</div>
</div>
<div class="footer">
    This is a computer-generated document and does not require a physical signature.<br>
    Generated on {generated_at}
</div>
</body>
</html>"""


def _html_to_pdf(html: str) -> bytes:
    result = io.BytesIO()
    pisa.CreatePDF(html, dest=result)
    return result.getvalue()


@router.get("/slip")
def download_salary_slip(
    month: int = Query(None, ge=1, le=12),
    year: int = Query(None, ge=2020, le=2100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now()
    m = month or now.month
    y = year or now.year

    working_days, present_days, absent_days = _attendance_summary(db, current_user.id, m, y)
    gross = current_user.monthly_salary or 0

    basic = round(gross * 0.50, 0)
    hra = round(gross * 0.15, 0)
    utility = round(gross * 0.30, 0)
    conveyance = round(gross * 0.05, 0)

    daily_rate = gross / working_days if working_days > 0 else 0
    absent_deduction = round(daily_rate * absent_days, 0)
    total_deductions = absent_deduction
    net_salary = int(gross - total_deductions)

    html = _salary_slip_html(
        employee_name=current_user.name,
        employee_id=_employee_id(current_user),
        designation=current_user.designation or "-",
        department=current_user.department or "-",
        cnic=current_user.cnic or "-",
        doj=current_user.date_of_joining.strftime("%d/%m/%Y") if current_user.date_of_joining else "-",
        period_label=f"for the month of {_month_name(m)} {y}",
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
        net_salary=net_salary,
        generated_at=datetime.now().strftime("%B %d, %Y at %I:%M %p"),
    )

    pdf_bytes = _html_to_pdf(html)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Salary_Slip_{_month_name(m)}_{y}_{current_user.name}.pdf"'},
    )


def _attendance_summary(db: Session, user_id: int, month: int, year: int):
    _, last_day = monthrange(year, month)
    start = date(year, month, 1)
    end = date(year, month, last_day)

    total_working = sum(
        1 for d in range((end - start).days + 1)
        if (start + __import__("datetime").timedelta(days=d)).weekday() < 5
    )

    present = db.query(func.count(Attendance.id)).filter(
        Attendance.user_id == user_id,
        Attendance.date >= start,
        Attendance.date <= end,
        Attendance.status == "present",
    ).scalar() or 0

    absent = total_working - present
    return total_working, present, absent
