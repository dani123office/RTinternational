from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import User, Attendance
from .auth import get_current_user
from datetime import datetime, date
from calendar import monthrange
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

    pdf = _SalarySlipPDF()
    pdf.build(
        title="RT International",
        subtitle="Salary Slip",
        period=f"for the month of {_month_name(m)} {y}",
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
        net_salary=int(net_salary),
        generated_at=datetime.now().strftime("%B %d, %Y at %I:%M %p"),
    )

    return Response(
        content=pdf.bytes(),
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


class _SalarySlipPDF:
    """Minimal PDF generator — zero external dependencies."""

    LM = 28
    COL_W = 255
    PAGE_W = 595
    PAGE_H = 842

    def __init__(self):
        self._objects = []
        self._font_map = {
            "Helvetica": "F1",
            "Helvetica-Bold": "F2",
            "Helvetica-Oblique": "F3",
        }

    def _o(self, body: str) -> int:
        n = len(self._objects) + 1
        self._objects.append(body)
        return n

    def _escape(self, s: str) -> str:
        res = []
        for ch in s:
            o = ord(ch)
            if o == 40 or o == 41 or o == 92:
                res.append("\\" + ch)
            elif o < 32 or o > 126:
                res.append(f"\\{o:03o}")
            else:
                res.append(ch)
        return "".join(res)

    def _text(self, x: float, y: float, text: str, font: str = "Helvetica", size: int = 10) -> str:
        f = self._font_map.get(font, "F1")
        return f"BT /{f} {size} Tf {x:.0f} {y:.0f} Td ({self._escape(text)}) Tj ET\n"

    def _line(self, x1: float, y1: float, x2: float, y2: float) -> str:
        return f"{x1:.0f} {y1:.0f} m {x2:.0f} {y2:.0f} l S\n"

    def _rect(self, x: float, y: float, w: float, h: float, fill: bool = True, stroke: bool = True) -> str:
        op = "B" if fill and stroke else ("f" if fill else "S")
        return f"{x:.0f} {y:.0f} {w:.0f} {h:.0f} re {op}\n"

    def _set_stroke(self, r: int, g: int, b: int) -> str:
        return f"{r/255:.3f} {g/255:.3f} {b/255:.3f} RG\n"

    def _set_fill(self, r: int, g: int, b: int) -> str:
        return f"{r/255:.3f} {g/255:.3f} {b/255:.3f} rg\n"

    def _set_line_width(self, w: float) -> str:
        return f"{w:.1f} w\n"

    def build(self, **kw):
        Y = lambda pt: self.PAGE_H - pt
        content_parts = []

        y = Y(50)
        # Title
        content_parts.append(self._text(self.LM, y, kw["title"], "Helvetica-Bold", 24))
        y -= 14
        content_parts.append(self._text(self.LM, y, kw["subtitle"], "Helvetica", 14))
        y -= 12
        content_parts.append(self._text(self.LM, y, kw["period"], "Helvetica", 12))
        y -= 8
        content_parts.append(self._line(self.LM, y, self.PAGE_W - self.LM, y))

        # Section headers
        y -= 18
        content_parts.append(self._text(self.LM, y, "Employee Information", "Helvetica-Bold", 12))
        content_parts.append(self._text(self.LM + self.COL_W, y, "Attendance Summary", "Helvetica-Bold", 12))
        y -= 4
        content_parts.append(self._line(self.LM, y, self.PAGE_W - self.LM, y))

        # Employee info (left column)
        y -= 8
        left_items = [
            ("Name", kw["employee_name"]),
            ("Employee ID", kw["employee_id"]),
            ("Designation", kw["designation"]),
            ("Department", kw["department"]),
            ("CNIC", kw["cnic"]),
            ("Date of Joining", kw["doj"]),
        ]
        right_items = [
            ("Working Days", kw["working_days"]),
            ("Present Days", kw["present_days"]),
            ("Absent Days", kw["absent_days"]),
        ]

        row_h = 7
        max_r = max(len(left_items), len(right_items))
        for i in range(max_r):
            if i < len(left_items):
                lbl, val = left_items[i]
                content_parts.append(self._text(self.LM, y, lbl + ":", "Helvetica-Bold", 9))
                content_parts.append(self._text(self.LM + 70, y, val, "Helvetica", 9))
            if i < len(right_items):
                lbl, val = right_items[i]
                content_parts.append(self._text(self.LM + self.COL_W, y, lbl + ":", "Helvetica-Bold", 9))
                content_parts.append(self._text(self.LM + self.COL_W + 70, y, val, "Helvetica", 9))
            y -= row_h

        y -= 6
        content_parts.append(self._line(self.LM, y, self.PAGE_W - self.LM, y))

        # Financial section headers
        y -= 14
        content_parts.append(self._text(self.LM, y, "Earnings", "Helvetica-Bold", 12))
        content_parts.append(self._text(self.LM + self.COL_W, y, "Deductions", "Helvetica-Bold", 12))
        y -= 4
        content_parts.append(self._line(self.LM, y, self.PAGE_W - self.LM, y))

        # Earnings & Deductions rows
        y -= 8
        earnings = kw["earnings"]
        deductions = kw["deductions"]
        max_r = max(len(earnings), len(deductions))
        for i in range(max_r):
            if i < len(earnings):
                lbl, val = earnings[i]
                content_parts.append(self._text(self.LM, y, lbl, "Helvetica", 9))
                content_parts.append(self._text(self.LM + 140, y, "Rs. " + str(val), "Helvetica", 9))
            if i < len(deductions):
                lbl, val = deductions[i]
                content_parts.append(self._text(self.LM + self.COL_W, y, lbl, "Helvetica", 9))
                content_parts.append(self._text(self.LM + self.COL_W + 140, y, "Rs. " + str(val), "Helvetica", 9))
            y -= row_h

        y -= 4
        content_parts.append(self._text(self.LM, y, "Gross Salary", "Helvetica-Bold", 10))
        content_parts.append(self._text(self.LM + 140, y, "Rs. " + str(kw["gross"]), "Helvetica-Bold", 10))
        content_parts.append(self._text(self.LM + self.COL_W, y, "Total Deductions", "Helvetica-Bold", 10))
        content_parts.append(self._text(self.LM + self.COL_W + 140, y, "Rs. " + str(kw["total_deductions"]), "Helvetica-Bold", 10))

        y -= 8
        content_parts.append(self._line(self.LM, y, self.PAGE_W - self.LM, y))

        # Net Salary box
        y -= 20
        box_x = int((self.PAGE_W - 160) / 2)
        box_w = 160
        box_h = 24
        content_parts.append(self._set_stroke(100, 149, 237))
        content_parts.append(self._set_fill(230, 240, 255))
        content_parts.append(self._set_line_width(0.8))
        content_parts.append(self._rect(box_x, y - box_h, box_w, box_h))
        content_parts.append(self._text(box_x + 55, y - 5, "Net Salary", "Helvetica-Bold", 10))
        content_parts.append(self._text(box_x + 40, y - 16, "Rs. " + str(kw["net_salary"]), "Helvetica-Bold", 16))

        # Reset colors
        content_parts.append(self._set_stroke(0, 0, 0))
        content_parts.append(self._set_fill(0, 0, 0))

        # Footer
        y -= 24
        content_parts.append(self._line(self.LM, y, self.PAGE_W - self.LM, y))
        y -= 8
        content_parts.append(self._text(self.LM, y, "This is a computer-generated document and does not require a physical signature.", "Helvetica-Oblique", 8))
        y -= 6
        content_parts.append(self._text(self.LM, y, "Generated on " + kw["generated_at"], "Helvetica-Oblique", 8))

        content = "".join(content_parts)
        self._build_pdf(content)

    def _build_pdf(self, content: str):
        content_obj = self._o(
            f"<< /Length {len(content.encode('latin-1'))} >>\nstream\n{content}\nendstream"
        )

        font_f1 = self._o("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
        font_f2 = self._o("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
        font_f3 = self._o("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>")

        resources = self._o(
            f"<< /Font << /F1 {font_f1} 0 R /F2 {font_f2} 0 R /F3 {font_f3} 0 R >> >>"
        )

        pages_obj_num = len(self._objects) + 3

        page = self._o(
            f"<< /Type /Page "
            f"/Parent {pages_obj_num} 0 R "
            f"/MediaBox [0 0 {self.PAGE_W} {self.PAGE_H}] "
            f"/Contents {content_obj} 0 R "
            f"/Resources {resources} 0 R >>"
        )

        pages = self._o(
            f"<< /Type /Pages /Kids [{page} 0 R] /Count 1 >>"
        )

        catalog = self._o(
            f"<< /Type /Catalog /Pages {pages} 0 R >>"
        )

        pdf = io.BytesIO()
        pdf.write(b"%PDF-1.4\n")

        offsets = [0]

        for i, obj in enumerate(self._objects, start=1):
            offsets.append(pdf.tell())
            pdf.write(f"{i} 0 obj\n{obj}\nendobj\n".encode("latin-1"))

        xref_pos = pdf.tell()

        pdf.write(f"xref\n0 {len(offsets)}\n".encode())
        pdf.write(b"0000000000 65535 f \n")

        for off in offsets[1:]:
            pdf.write(f"{off:010d} 00000 n \n".encode())

        pdf.write(
            (
                f"trailer\n"
                f"<< /Size {len(offsets)} "
                f"/Root {catalog} 0 R >>\n"
                f"startxref\n"
                f"{xref_pos}\n"
                f"%%EOF"
            ).encode()
        )

        self._data = pdf.getvalue()

    def bytes(self) -> bytes:
        return self._data
