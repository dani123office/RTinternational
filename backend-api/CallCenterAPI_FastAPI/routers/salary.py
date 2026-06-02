from fpdf import FPDF
from datetime import datetime, date
from calendar import monthrange
from fastapi.responses import Response

router = APIRouter(prefix="/api/salary", tags=["salary"])


def _employee_id(user: User) -> str:
    return f"CAEL{user.id:04d}"


def _month_name(m: int) -> str:
    names = ["", "January", "February", "March", "April", "May", "June",
             "July", "August", "September", "October", "November", "December"]
    return names[m]


def _fmt(n: int) -> str:
    return f"Rs. {n:,}"


class _SalaryPDF(FPDF):
    def _section_title(self, title: str):
        self.set_text_color(138, 138, 138)
        self.set_font("Helvetica", "B", 11)
        self.cell(0, 6, title.upper(), new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(220, 220, 220)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(2)

    def _info_row(self, label: str, value: str):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(51, 51, 51)
        self.cell(50, 5, label + ":", new_x="END", new_y="LAST")
        self.set_font("Helvetica", "", 9)
        self.cell(0, 5, value, new_x="LMARGIN", new_y="NEXT")

    def _finance_row(self, label: str, value: str, bold: bool = False):
        style = "B" if bold else ""
        self.set_font("Helvetica", style, 9)
        self.set_text_color(51, 51, 51)
        self.cell(90, 5, label, new_x="END", new_y="LAST")
        self.cell(0, 5, value, new_x="LMARGIN", new_y="NEXT", align="R")

    def _separator(self):
        self.set_draw_color(220, 220, 220)
        self.line(self.l_margin, self.get_y() + 1, self.w - self.r_margin, self.get_y() + 1)
        self.ln(4)

    def build_slip(self, **kw):
        self.add_page()

        # Header
        self.set_font("Helvetica", "B", 24)
        self.set_text_color(26, 26, 46)
        self.cell(0, 10, "RT International", new_x="LMARGIN", new_y="NEXT", align="C")
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(33, 68, 179)
        self.cell(0, 7, "SALARY SLIP", new_x="LMARGIN", new_y="NEXT", align="C")
        self.set_font("Helvetica", "", 10)
        self.set_text_color(119, 119, 119)
        self.cell(0, 6, kw["period_label"], new_x="LMARGIN", new_y="NEXT", align="C")
        self._separator()

        # Employee Info & Attendance Summary
        left_x = self.l_margin
        right_x = self.w / 2
        col_w = self.w / 2 - self.l_margin - 5

        # Save position
        start_y = self.get_y()

        # Left column: Employee Information
        self._section_title("Employee Information")
        left_items = [
            ("Name", kw["employee_name"]),
            ("Employee ID", kw["employee_id"]),
            ("Designation", kw["designation"]),
            ("Department", kw["department"]),
            ("CNIC", kw["cnic"]),
            ("Date of Joining", kw["doj"]),
        ]
        for lbl, val in left_items:
            self._info_row(lbl, val)

        # Right column: Attendance Summary
        right_start_y = start_y
        self.y = right_start_y
        self.x = right_x
        self._section_title("Attendance Summary")
        right_items = [
            ("Working Days", kw["working_days"]),
            ("Present Days", kw["present_days"]),
            ("Absent Days", kw["absent_days"]),
        ]
        for lbl, val in right_items:
            self.set_font("Helvetica", "B", 9)
            self.set_text_color(51, 51, 51)
            self.cell(50, 5, lbl + ":", new_x="END", new_y="LAST")
            self.set_font("Helvetica", "", 9)
            self.cell(0, 5, val, new_x="END", new_y="LAST")

        # Move past both columns
        self.y = max(self.y, self.get_y())
        self.x = left_x
        self.ln(2)
        self._separator()

        # Earnings & Deductions
        start_y = self.get_y()

        # Left: Earnings
        self._section_title("Earnings")
        for lbl, val in kw["earnings"]:
            self._finance_row(lbl, _fmt(val))
        self._finance_row("Gross Salary", _fmt(kw["gross"]), bold=True)

        # Right: Deductions
        right_start_y = start_y
        self.y = right_start_y
        self.x = right_x
        self._section_title("Deductions")
        for lbl, val in kw["deductions"]:
            self._finance_row(lbl, _fmt(val))
        self._finance_row("Total Deductions", _fmt(kw["total_deductions"]), bold=True)

        self.y = max(self.y, self.get_y())
        self.x = left_x
        self.ln(2)
        self._separator()

        # Net Salary box
        self.ln(3)
        box_w = 160
        box_x = (self.w - box_w) / 2
        self.set_fill_color(238, 244, 255)
        self.set_draw_color(188, 208, 255)
        self.set_line_width(0.5)
        self.rect(box_x, self.get_y(), box_w, 18, style="DF")
        self.set_y(self.get_y() + 2)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(33, 68, 179)
        self.cell(40, 7, "Net Salary", new_x="END", new_y="LAST")
        self.set_font("Helvetica", "B", 18)
        self.cell(0, 7, _fmt(kw["net_salary"]), new_x="LMARGIN", new_y="NEXT", align="R")
        self.set_text_color(51, 51, 51)

        # Footer
        self.ln(8)
        self._separator()
        self.set_font("Helvetica", "", 8)
        self.set_text_color(136, 136, 136)
        self.cell(0, 4, "This is a computer-generated document and does not require a physical signature.", new_x="LMARGIN", new_y="NEXT", align="C")
        self.cell(0, 4, "Generated on " + kw["generated_at"], new_x="LMARGIN", new_y="NEXT", align="C")


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

    pdf = _SalaryPDF()
    pdf.build_slip(
        period_label=f"for the month of {_month_name(m)} {y}",
        employee_name=current_user.name,
        employee_id=_employee_id(current_user),
        designation=current_user.designation or "-",
        department=current_user.department or "-",
        cnic=current_user.cnic or "-",
        doj=current_user.date_of_joining.strftime("%d/%m/%Y") if current_user.date_of_joining else "-",
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

    return Response(
        content=pdf.output(),
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
