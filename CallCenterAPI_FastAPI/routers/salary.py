from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import User, Attendance
from .auth import get_current_user
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


class _SalaryPDF:
    """Zero-dependency manual PDF builder — no external imports needed."""

    PAGE_W = 595
    PAGE_H = 842
    LM = 28

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
        fmap = {"Helvetica": "F1", "Helvetica-Bold": "F2", "Helvetica-Oblique": "F3"}
        f = fmap.get(font, "F1")
        return f"BT /{f} {size} Tf {x:.0f} {y:.0f} Td ({self._escape(text)}) Tj ET\n"

    def _text_center(self, y: float, text: str, font: str = "Helvetica", size: int = 10) -> str:
        approx = len(text) * size * 0.5
        x = (self.PAGE_W - approx) / 2
        return self._text(x, y, text, font, size)

    def _text_right(self, x_end: float, y: float, text: str, font: str = "Helvetica", size: int = 10) -> str:
        approx = len(text) * size * 0.5
        return self._text(x_end - approx, y, text, font, size)

    def _line(self, x1: float, y1: float, x2: float, y2: float) -> str:
        return f"{x1:.0f} {y1:.0f} m {x2:.0f} {y2:.0f} l S\n"

    def _rect(self, x: float, y: float, w: float, h: float, fill: bool = True, stroke: bool = True) -> str:
        return f"{x:.0f} {y:.0f} {w:.0f} {h:.0f} re {'B' if fill and stroke else ('f' if fill else 'S')}\n"

    def _color(self, r: int, g: int, b: int) -> str:
        return f"{r/255:.3f} {g/255:.3f} {b/255:.3f} rg\n"

    def _dcolor(self, r: int, g: int, b: int) -> str:
        return f"{r/255:.3f} {g/255:.3f} {b/255:.3f} RG\n"

    def _linew(self, w: float) -> str:
        return f"{w:.2f} w\n"

    def build_slip(self, **kw):
        self._buf = []
        PW, PH = self.PAGE_W, self.PAGE_H
        LM = self.LM
        CX = PW / 2
        Y = lambda pt: PH - pt

        # Page border
        self._buf.append(self._dcolor(220, 220, 220))
        self._buf.append(self._linew(0.5))
        self._buf.append(self._rect(6, 6, PW - 12, PH - 12, fill=False, stroke=True))

        # Title block — centered
        y = Y(45)
        self._buf.append(self._text_center(y, "RT International", "Helvetica-Bold", 24))
        y -= 20
        self._buf.append(self._text_center(y, "SALARY SLIP", "Helvetica-Bold", 14))
        y -= 16
        month_text = kw["period"].replace("for the month of ", "")
        self._buf.append(self._text_center(y, month_text, "Helvetica", 10))
        y -= 20
        self._buf.append(self._dcolor(220, 220, 220))
        self._buf.append(self._line(LM, y, PW - LM, y))
        y -= 20

        def section_caption(title, _y):
            self._buf.append(self._color(100, 100, 100))
            self._buf.append(self._text(LM, _y, title.upper(), "Helvetica-Bold", 9))
            _y -= 6
            self._buf.append(self._dcolor(200, 200, 200))
            self._buf.append(self._line(LM, _y, PW - LM, _y))
            return _y - 14

        def col_items(items, left_x, _y):
            for lbl, val in items:
                lf = "Helvetica-Bold" if lbl in ["Gross Salary", "Total Deductions"] else "Helvetica"
                self._buf.append(self._text(left_x, _y, lbl + ":", lf, 9))
                self._buf.append(self._text_right(left_x + 230, _y, val, "Helvetica", 9))
                _y -= 16
            return _y

        # Section 1: Employee Info + Attendance
        y = section_caption("Employee Information", y)
        left = [
            ("Name", kw["employee_name"]),
            ("Employee ID", kw["employee_id"]),
            ("Designation", kw["designation"]),
            ("Department", kw["department"]),
            ("CNIC", kw["cnic"]),
            ("Date of Joining", kw["doj"]),
        ]
        right = [
            ("Working Days", kw["working_days"]),
            ("Present Days", kw["present_days"]),
            ("Absent Days", kw["absent_days"]),
        ]

        ly = col_items(left, LM, y)
        ry = col_items(right, CX, y)
        y = min(ly, ry) - 25

        # Section 2: Earnings + Deductions
        y = section_caption("Earnings & Deductions", y)
        left2 = [(lbl, _fmt(val)) for lbl, val in kw["earnings"]]
        left2.append(("Gross Salary", _fmt(kw["gross"])))
        right2 = [(lbl, _fmt(val)) for lbl, val in kw["deductions"]]
        right2.append(("Total Deductions", _fmt(kw["total_deductions"])))

        col_items(left2, LM, y)
        col_items(right2, CX, y)

        # Net Salary card — fixed position near bottom
        box_x = LM
        box_w = PW - LM * 2
        box_h = 50
        box_y = 140

        self._buf.append(self._color(243, 247, 255))
        self._buf.append(self._dcolor(190, 210, 255))
        self._buf.append(self._linew(1.0))
        self._buf.append(self._rect(box_x, box_y, box_w, box_h, fill=True, stroke=True))

        y_text = box_y + 18
        self._buf.append(self._color(0, 0, 0))
        self._buf.append(self._text(box_x + 20, y_text, "NET SALARY", "Helvetica-Bold", 12))
        self._buf.append(self._text_right(box_x + box_w - 20, y_text, f"Rs. {kw['net_salary']:,}", "Helvetica-Bold", 20))

        # Footer
        y_footer = box_y - 30
        self._buf.append(self._dcolor(220, 220, 220))
        self._buf.append(self._line(LM, y_footer, PW - LM, y_footer))
        y_footer -= 15
        self._buf.append(self._text_center(y_footer, "This is a computer-generated document and does not require a physical signature.", "Helvetica-Oblique", 8))
        y_footer -= 12
        self._buf.append(self._text_center(y_footer, "Generated on " + kw["generated_at"], "Helvetica-Oblique", 8))

        content = "".join(self._buf)
        self._build_pdf(content, PW, PH, LM)

    def _build_pdf(self, content: str, PW: int, PH: int, LM: int):
        import io
        objects = []

        def o(body):
            n = len(objects) + 1
            objects.append(body)
            return n

        content_obj = o(
            f"<< /Length {len(content.encode('latin-1'))} >>\nstream\n{content}\nendstream"
        )
        f1 = o("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
        f2 = o("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
        f3 = o("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>")
        resources = o(f"<< /Font << /F1 {f1} 0 R /F2 {f2} 0 R /F3 {f3} 0 R >> >>")

        pages_obj = len(objects) + 3
        page = o(
            f"<< /Type /Page /Parent {pages_obj} 0 R /MediaBox [0 0 {PW} {PH}]"
            f" /Contents {content_obj} 0 R /Resources {resources} 0 R >>"
        )
        pages = o(f"<< /Type /Pages /Kids [{page} 0 R] /Count 1 >>")
        catalog = o(f"<< /Type /Catalog /Pages {pages} 0 R >>")

        buf = io.BytesIO()
        buf.write(b"%PDF-1.4\n")
        offsets = [0]
        for i, obj in enumerate(objects, 1):
            offsets.append(buf.tell())
            buf.write(f"{i} 0 obj\n{obj}\nendobj\n".encode("latin-1"))

        xref = buf.tell()
        buf.write(f"xref\n0 {len(offsets)}\n".encode())
        buf.write(b"0000000000 65535 f \n")
        for off in offsets[1:]:
            buf.write(f"{off:010d} 00000 n \n".encode())
        buf.write(f"trailer\n<< /Size {len(offsets)} /Root {catalog} 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
        self._data = buf.getvalue()

    def output(self) -> bytes:
        return self._data


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
        Attendance.status.in_(["present", "late"]),
    ).scalar() or 0

    absent = total_working - present
    return total_working, present, absent
