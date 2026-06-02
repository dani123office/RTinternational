from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, Attendance
from routers.auth import get_current_user
from datetime import datetime, date
from calendar import monthrange
from fpdf import FPDF
from fastapi.responses import Response
import io

router = APIRouter(prefix="/api/salary", tags=["salary"])


def _employee_id(user: User) -> str:
    return f"CAEL{user.id:04d}"


def _month_name(m: int) -> str:
    names = ["", "January", "February", "March", "April", "May", "June",
             "July", "August", "September", "October", "November", "December"]
    return names[m]


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
    net_salary = gross - total_deductions

    pdf = SalaryPDF()
    pdf.add_page()
    pdf.generate(
        employee_name=current_user.name,
        employee_id=_employee_id(current_user),
        designation=current_user.designation or "-",
        department=current_user.department or "-",
        cnic=current_user.cnic or "-",
        doj=current_user.date_of_joining,
        month_name=_month_name(m),
        year=str(y),
        working_days=working_days,
        present_days=present_days,
        absent_days=absent_days,
        basic=basic,
        hra=hra,
        utility=utility,
        conveyance=conveyance,
        gross=gross,
        absent_deduction=absent_deduction,
        total_deductions=total_deductions,
        net_salary=net_salary,
    )

    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)

    filename = f"Salary_Slip_{_month_name(m)}_{y}_{current_user.name}.pdf"

    return Response(
        content=buf.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
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


class SalaryPDF(FPDF):
    def generate(
        self,
        employee_name, employee_id, designation, department, cnic, doj,
        month_name, year,
        working_days, present_days, absent_days,
        basic, hra, utility, conveyance, gross,
        absent_deduction, total_deductions, net_salary,
    ):
        self.set_auto_page_break(auto=False)
        margin = 10
        page_w = 210
        col_w = 90

        self.set_font("Helvetica", "B", 18)
        self.cell(0, 10, "RT International", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 10)
        self.cell(0, 6, "Salary Slip", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 6, f"for the month of {month_name} {year}", align="C", new_x="LMARGIN", new_y="NEXT")
        self.line(margin, self.get_y() + 2, page_w - margin, self.get_y() + 2)
        self.ln(6)

        self.set_font("Helvetica", "B", 10)
        self.set_xy(margin, self.get_y())
        self.cell(col_w, 7, "Employee Information")
        self.set_xy(margin + col_w, self.get_y())
        self.cell(col_w, 7, "Attendance Summary", new_x="LMARGIN", new_y="NEXT")
        y_after_headers = self.get_y()

        left_lines = [
            ("Name", employee_name),
            ("Employee ID", employee_id),
            ("Designation", designation),
            ("Department", department),
            ("CNIC", cnic),
        ]
        if doj:
            left_lines.append(("Date of Joining", doj.strftime("%d/%m/%Y") if hasattr(doj, "strftime") else str(doj)))

        right_lines = [
            ("Working Days", str(working_days)),
            ("Present Days", str(present_days)),
            ("Absent Days", str(absent_days)),
        ]

        max_rows = max(len(left_lines), len(right_lines))

        for i in range(max_rows):
            y = y_after_headers + 2 + i * 6
            if i < len(left_lines):
                label, val = left_lines[i]
                self.set_xy(margin, y)
                self.set_font("Helvetica", "B", 9)
                self.cell(35, 6, label + ":")
                self.set_font("Helvetica", "", 9)
                self.cell(55, 6, val)
            if i < len(right_lines):
                label, val = right_lines[i]
                self.set_xy(margin + col_w, y)
                self.set_font("Helvetica", "B", 9)
                self.cell(35, 6, label + ":")
                self.set_font("Helvetica", "", 9)
                self.cell(55, 6, val)

        sep_y = y_after_headers + max_rows * 6 + 4
        self.set_y(sep_y)
        self.line(margin, self.get_y(), page_w - margin, self.get_y())
        self.ln(4)

        y_top = self.get_y()
        self.set_font("Helvetica", "B", 10)
        self.set_xy(margin, y_top)
        self.cell(col_w, 7, "Earnings")
        self.set_xy(margin + col_w, y_top)
        self.cell(col_w, 7, "Deductions", new_x="LMARGIN", new_y="NEXT")
        self.line(margin, self.get_y(), page_w - margin, self.get_y())
        y_after_fin_headers = self.get_y()
        self.ln(2)

        earnings = [
            ("Basic Salary", basic),
            ("House Rent Allowance", hra),
            ("Utility Allowance", utility),
            ("Conveyance Allowance", conveyance),
        ]
        deductions = [
            ("Absent Days Deduction", absent_deduction),
        ]

        max_rows = max(len(earnings), len(deductions))
        for i in range(max_rows):
            y = y_after_fin_headers + 2 + i * 6
            if i < len(earnings):
                label, val = earnings[i]
                self.set_xy(margin, y)
                self.set_font("Helvetica", "", 9)
                self.cell(55, 6, label)
                self.cell(25, 6, "Rs. " + str(int(val)))
            if i < len(deductions):
                label, val = deductions[i]
                self.set_xy(margin + col_w, y)
                self.set_font("Helvetica", "", 9)
                self.cell(55, 6, label)
                self.cell(25, 6, "Rs. " + str(int(val)))

        gross_y = y_after_fin_headers + max_rows * 6 + 2
        self.set_y(gross_y)
        self.set_font("Helvetica", "B", 10)
        self.set_xy(margin, gross_y)
        self.cell(55, 7, "Gross Salary")
        self.cell(25, 7, "Rs. " + str(int(gross)))
        self.set_xy(margin + col_w, gross_y)
        self.cell(55, 7, "Total Deductions")
        self.cell(25, 7, "Rs. " + str(int(total_deductions)), new_x="LMARGIN", new_y="NEXT")

        self.line(margin, self.get_y() + 1, page_w - margin, self.get_y() + 1)
        self.ln(6)

        self.set_draw_color(100, 149, 237)
        self.set_fill_color(230, 240, 255)
        self.set_line_width(0.8)
        box_x = 50
        box_w = 110
        box_h = 14
        self.rect(box_x, self.get_y(), box_w, box_h, style="DF")
        self.set_xy(box_x, self.get_y() + 1)
        self.set_font("Helvetica", "B", 9)
        self.cell(box_w, 6, "Net Salary", new_x="LMARGIN", new_y="NEXT", align="C")
        self.set_xy(box_x, self.get_y() + 1)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(0, 0, 0)
        self.cell(box_w, 6, "Rs. " + str(int(net_salary)), new_x="LMARGIN", new_y="NEXT", align="C")

        self.set_text_color(0, 0, 0)
        self.ln(box_h + 6)

        self.line(margin, self.get_y(), page_w - margin, self.get_y())
        self.ln(3)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 5, "This is a computer-generated document and does not require a physical signature.", new_x="LMARGIN", new_y="NEXT", align="C")
        self.cell(0, 5, f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", new_x="LMARGIN", new_y="NEXT", align="C")
