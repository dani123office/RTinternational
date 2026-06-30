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
    """Zero-dependency manual PDF builder matching the clean two-column UI design."""

    PAGE_W = 595
    PAGE_H = 842
    LM = 45       # left/right margin
    COL_MID = 310 # x where right column starts

    # ── colour palette (matching the image) ──────────────────────────────────
    # text dark navy
    C_DARK   = (26,  32,  55)
    # section label grey
    C_LABEL  = (120, 120, 130)
    # divider light grey
    C_DIV    = (220, 222, 228)
    # net-salary card blue tint bg
    C_CARD_BG  = (240, 245, 255)
    C_CARD_BOR = (190, 210, 250)
    # net salary value blue
    C_BLUE   = (30,  90, 210)
    # white
    C_WHITE  = (255, 255, 255)

    def _esc(self, s: str) -> str:
        res = []
        for ch in s:
            o = ord(ch)
            if o in (40, 41, 92):
                res.append("\\" + ch)
            elif o < 32 or o > 126:
                res.append(f"\\{o:03o}")
            else:
                res.append(ch)
        return "".join(res)

    # ── low-level drawing helpers ─────────────────────────────────────────────
    def _t(self, x, y, text, font="Helvetica", sz=10):
        fmap = {"Helvetica": "F1", "Helvetica-Bold": "F2", "Helvetica-Oblique": "F3"}
        f = fmap.get(font, "F1")
        return f"BT /{f} {sz} Tf {x:.1f} {y:.1f} Td ({self._esc(str(text))}) Tj ET\n"

    def _tc(self, y, text, font="Helvetica", sz=10):
        approx = len(text) * sz * 0.52
        x = (self.PAGE_W - approx) / 2
        return self._t(x, y, text, font, sz)

    def _tr(self, x_right, y, text, font="Helvetica", sz=10):
        approx = len(text) * sz * 0.52
        return self._t(x_right - approx, y, text, font, sz)

    def _line(self, x1, y1, x2, y2):
        return f"{x1:.1f} {y1:.1f} m {x2:.1f} {y2:.1f} l S\n"

    def _rect(self, x, y, w, h, fill=True, stroke=True):
        op = "B" if fill and stroke else ("f" if fill else "S")
        return f"{x:.1f} {y:.1f} {w:.1f} {h:.1f} re {op}\n"

    def _rrect(self, x, y, w, h, r=8, fill=True, stroke=True):
        """Rounded rectangle via Bézier curves (PDF has no native rrect)."""
        k = r * 0.552284749831
        cmds = (
            f"{x+r:.1f} {y:.1f} m "
            f"{x+w-r:.1f} {y:.1f} l "
            f"{x+w-r+k:.1f} {y:.1f} {x+w:.1f} {y+r-k:.1f} {x+w:.1f} {y+r:.1f} c "
            f"{x+w:.1f} {y+h-r:.1f} l "
            f"{x+w:.1f} {y+h-r+k:.1f} {x+w-r+k:.1f} {y+h:.1f} {x+w-r:.1f} {y+h:.1f} c "
            f"{x+r:.1f} {y+h:.1f} l "
            f"{x+r-k:.1f} {y+h:.1f} {x:.1f} {y+h-r+k:.1f} {x:.1f} {y+h-r:.1f} c "
            f"{x:.1f} {y+r:.1f} l "
            f"{x:.1f} {y+r-k:.1f} {x+r-k:.1f} {y:.1f} {x+r:.1f} {y:.1f} c "
        )
        op = "B" if fill and stroke else ("f" if fill else "S")
        return cmds + op + "\n"

    def _fg(self, r, g, b): return f"{r/255:.3f} {g/255:.3f} {b/255:.3f} rg\n"
    def _sg(self, r, g, b): return f"{r/255:.3f} {g/255:.3f} {b/255:.3f} RG\n"
    def _lw(self, w):       return f"{w:.2f} w\n"

    # ── section header (small caps label + thin rule below) ──────────────────
    def _section_header(self, title, y, full_width=False):
        b = []
        b.append(self._fg(*self.C_LABEL))
        b.append(self._t(self.LM, y, title.upper(), "Helvetica-Bold", 7))
        y -= 10
        b.append(self._sg(*self.C_DIV))
        b.append(self._lw(0.5))
        right_x = self.PAGE_W - self.LM if full_width else self.PAGE_W - self.LM
        b.append(self._line(self.LM, y, right_x, y))
        return "".join(b), y - 14

    # ── a single label: value row ─────────────────────────────────────────────
    def _row(self, x_label, x_value_right, y, label, value, bold_value=False):
        vfont = "Helvetica-Bold" if bold_value else "Helvetica"
        out = (
            self._fg(*self.C_LABEL) +
            self._t(x_label, y, label, "Helvetica", 8.5) +
            self._fg(*self.C_DARK) +
            self._tr(x_value_right, y, value, vfont, 8.5)
        )
        return out

    # ── main build ────────────────────────────────────────────────────────────
    def build_slip(self, **kw):
        buf = []
        PW, PH = self.PAGE_W, self.PAGE_H
        LM, CM = self.LM, self.COL_MID
        RM = PW - LM   # right margin x

        # Y helper: PDF origin is bottom-left; we work top-down
        def Y(pt): return PH - pt

        # ── outer border ─────────────────────────────────────────────────────
        buf.append(self._sg(*self.C_DIV))
        buf.append(self._lw(0.7))
        buf.append(self._rect(10, 10, PW - 20, PH - 20, fill=False, stroke=True))

        # ── header block ─────────────────────────────────────────────────────
        logo_text = "RT International"
        text_sz = 20
        text_w = len(logo_text) * text_sz * 0.52
        icon_w = 26
        gap = 8
        total_w = icon_w + gap + text_w
        logo_x = (PW - total_w) / 2

        # Draw icon
        icon_y = Y(58)
        buf.append(self._fg(*self.C_BLUE))
        buf.append(self._rrect(logo_x, icon_y, icon_w, icon_w, r=6, fill=True, stroke=False))
        # Draw "RT" text inside icon
        buf.append(self._fg(*self.C_WHITE))
        buf.append(self._t(logo_x + 6, icon_y + 8, "RT", "Helvetica-Bold", 11))

        # Draw "RT International" brand name next to the icon
        buf.append(self._fg(*self.C_DARK))
        buf.append(self._t(logo_x + icon_w + gap, icon_y + 5, logo_text, "Helvetica-Bold", text_sz))

        y = icon_y - 20
        buf.append(self._fg(*self.C_DARK))
        buf.append(self._tc(y, "SALARY SLIP", "Helvetica-Bold", 11))
        y -= 16
        month_text = kw["period"].replace("for the month of ", "")
        buf.append(self._fg(*self.C_LABEL))
        buf.append(self._tc(y, month_text, "Helvetica", 9))
        y -= 18
        buf.append(self._sg(*self.C_DIV))
        buf.append(self._lw(0.5))
        buf.append(self._line(LM, y, RM, y))
        y -= 22

        # ── SECTION 1: Employee Info (left) + Attendance Summary (right) ─────
        hdr, y_after = self._section_header("Employee Information", y, full_width=False)
        buf.append(hdr)

        # Right column header at same vertical position
        buf.append(self._fg(*self.C_LABEL))
        buf.append(self._t(CM, y, "Attendance Summary".upper(), "Helvetica-Bold", 7))
        buf.append(self._sg(*self.C_DIV))
        buf.append(self._line(CM, y - 7, RM, y - 7))

        y = y_after
        row_h = 17

        left_info = [
            ("Name",           kw["employee_name"]),
            ("Employee ID",    kw["employee_id"]),
            ("Designation",    kw["designation"]),
            ("Department",     kw["department"]),
            ("CNIC",           kw["cnic"]),
            ("Date of Joining",kw["doj"]),
        ]
        right_info = [
            ("Working Days",   kw["working_days"]),
            ("Present Days",   kw["present_days"]),
            ("Absent Days",    kw["absent_days"]),
        ]

        left_col_right  = CM - 20   # value aligns right before midpoint gap
        right_col_right = RM - 5

        ly = y
        for lbl, val in left_info:
            is_bold = lbl in ("Name", "Employee ID")
            buf.append(self._fg(*self.C_LABEL))
            buf.append(self._t(LM, ly, lbl, "Helvetica", 8.5))
            buf.append(self._fg(*self.C_DARK))
            vfont = "Helvetica-Bold" if is_bold else "Helvetica"
            buf.append(self._tr(left_col_right, ly, val, vfont, 8.5))
            ly -= row_h

        ry = y
        for lbl, val in right_info:
            buf.append(self._fg(*self.C_LABEL))
            buf.append(self._t(CM, ry, lbl, "Helvetica", 8.5))
            buf.append(self._fg(*self.C_DARK))
            buf.append(self._tr(right_col_right, ry, val, "Helvetica", 8.5))
            ry -= row_h

        y = min(ly, ry) - 22

        # ── SECTION 2: Earnings (left) + Deductions (right) ──────────────────
        earn_hdr, _ = self._section_header("Earnings", y, full_width=False)
        buf.append(earn_hdr)
        buf.append(self._fg(*self.C_LABEL))
        buf.append(self._t(CM, y, "Deductions".upper(), "Helvetica-Bold", 7))
        buf.append(self._sg(*self.C_DIV))
        buf.append(self._line(CM, y - 10, RM, y - 10))

        y -= 30
        row_h = 18

        earnings = kw["earnings"]        # list of (label, amount, bold)
        deductions = kw["deductions"]    # list of (label, amount, bold)

        # left earnings column
        ey = y
        for lbl, amt, bold in earnings:
            if bold:  # draw divider ABOVE the bold row, before rendering text
                buf.append(self._sg(*self.C_DIV))
                buf.append(self._lw(0.4))
                buf.append(self._line(LM, ey + row_h - 2, left_col_right, ey + row_h - 2))
            buf.append(self._fg(*self.C_DARK))
            buf.append(self._t(LM, ey, lbl, "Helvetica-Bold" if bold else "Helvetica", 8.5))
            buf.append(self._tr(left_col_right, ey, amt, "Helvetica-Bold" if bold else "Helvetica", 8.5))
            ey -= row_h

        # right deductions column
        dy = y
        for lbl, amt, bold in deductions:
            if bold:  # draw divider ABOVE the bold row, before rendering text
                buf.append(self._sg(*self.C_DIV))
                buf.append(self._lw(0.4))
                buf.append(self._line(CM, dy + row_h - 2, right_col_right, dy + row_h - 2))
            buf.append(self._fg(*self.C_DARK))
            buf.append(self._t(CM, dy, lbl, "Helvetica-Bold" if bold else "Helvetica", 8.5))
            buf.append(self._tr(right_col_right, dy, amt, "Helvetica-Bold" if bold else "Helvetica", 8.5))
            dy -= row_h

        y = min(ey, dy) - 25

        # ── NET SALARY CARD ───────────────────────────────────────────────────
        card_h = 58
        card_y = y - card_h
        # keep card above footer
        if card_y < 95:
            card_y = 95

        buf.append(self._fg(*self.C_CARD_BG))
        buf.append(self._sg(*self.C_CARD_BOR))
        buf.append(self._lw(1.0))
        buf.append(self._rrect(LM, card_y, RM - LM, card_h, r=8))

        mid_card = card_y + card_h / 2 - 5
        buf.append(self._fg(*self.C_DARK))
        buf.append(self._t(LM + 18, mid_card, "NET SALARY", "Helvetica-Bold", 11))
        net_str = f"Rs. {kw['net_salary']:,}"
        buf.append(self._fg(*self.C_BLUE))
        buf.append(self._tr(RM - 18, mid_card - 4, net_str, "Helvetica-Bold", 18))

        # ── FOOTER ───────────────────────────────────────────────────────────
        fy = card_y - 22
        buf.append(self._sg(*self.C_DIV))
        buf.append(self._lw(0.4))
        buf.append(self._line(LM, fy, RM, fy))
        fy -= 13
        buf.append(self._fg(*self.C_LABEL))
        buf.append(self._tc(fy, "This is a computer-generated document and does not require a physical signature.", "Helvetica-Oblique", 7))
        fy -= 11
        buf.append(self._tc(fy, "Generated on " + kw["generated_at"], "Helvetica-Oblique", 7))

        content = "".join(buf)
        self._build_pdf(content)

    def _build_pdf(self, content: str):
        import io
        objects = []

        def o(body):
            objects.append(body)
            return len(objects)

        con_obj = o(f"<< /Length {len(content.encode('latin-1'))} >>\nstream\n{content}\nendstream")
        f1 = o("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
        f2 = o("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
        f3 = o("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>")
        res = o(f"<< /Font << /F1 {f1} 0 R /F2 {f2} 0 R /F3 {f3} 0 R >> >>")

        pages_ref = len(objects) + 3
        page  = o(f"<< /Type /Page /Parent {pages_ref} 0 R /MediaBox [0 0 {self.PAGE_W} {self.PAGE_H}] /Contents {con_obj} 0 R /Resources {res} 0 R >>")
        pages = o(f"<< /Type /Pages /Kids [{page} 0 R] /Count 1 >>")
        cat   = o(f"<< /Type /Catalog /Pages {pages} 0 R >>")

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
        buf.write(f"trailer\n<< /Size {len(offsets)} /Root {cat} 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
        self._data = buf.getvalue()

    def output(self) -> bytes:
        return self._data


# ── route ─────────────────────────────────────────────────────────────────────

@router.get("/slip")
def download_salary_slip(
    month:      int   = Query(None, ge=1, le=12),
    year:       int   = Query(None, ge=2020, le=2100),
    commission: float = Query(0.0,  ge=0),
    current_user: User    = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    now = datetime.now()
    m = month or now.month
    y = year  or now.year

    working_days, present_days, absent_days = _attendance_summary(db, current_user.id, m, y)
    base = current_user.monthly_salary or 0

    # ── earnings breakdown ────────────────────────────────────────────────────
    basic      = int(round(base * 0.50))
    hra        = int(round(base * 0.15))
    utility    = int(round(base * 0.30))
    conveyance = int(round(base * 0.05))
    comm       = int(commission)
    gross      = basic + hra + utility + conveyance + comm

    # ── deductions ────────────────────────────────────────────────────────────
    daily_rate        = (basic + hra + utility + conveyance) / working_days if working_days > 0 else 0
    absent_deduction  = int(round(daily_rate * absent_days))
    total_deductions  = absent_deduction
    net_salary        = gross

    # ── PDF data structures ───────────────────────────────────────────────────
    # (label, formatted_amount, is_bold_total_row)
    earnings_rows = [
        ("Basic Salary",           _fmt(basic),      False),
        ("House Rent Allowance",   _fmt(hra),        False),
        ("Utility Allowance",      _fmt(utility),    False),
        ("Conveyance Allowance",   _fmt(conveyance), False),
    ]
    if comm:
        earnings_rows.append(("Commission", _fmt(comm), False))
    earnings_rows.append(("Gross Salary", _fmt(gross), True))   # bold total

    deductions_rows = [
        ("Absent Days Deduction", _fmt(absent_deduction), False),
        ("Total Deductions",      _fmt(total_deductions), True),
    ]

    pdf = _SalaryPDF()
    pdf.build_slip(
        period        = f"for the month of {_month_name(m)} {y}",
        employee_name = current_user.name,
        employee_id   = _employee_id(current_user),
        designation   = current_user.designation   or "—",
        department    = current_user.department    or "—",
        cnic          = current_user.cnic          or "—",
        doj           = current_user.date_of_joining.strftime("%d/%m/%Y") if current_user.date_of_joining else "—",
        working_days  = str(working_days),
        present_days  = str(present_days),
        absent_days   = str(absent_days),
        earnings      = earnings_rows,
        deductions    = deductions_rows,
        net_salary    = net_salary,
        generated_at  = datetime.now().strftime("%B %d, %Y at %I:%M %p"),
    )

    fname = f"Salary_Slip_{_month_name(m)}_{y}_{current_user.name}.pdf"
    return Response(
        content     = pdf.output(),
        media_type  = "application/pdf",
        headers     = {"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# ── helper ────────────────────────────────────────────────────────────────────

def _attendance_summary(db: Session, user_id: int, month: int, year: int):
    import datetime as _dt
    _, last_day = monthrange(year, month)
    start = date(year, month, 1)
    end   = date(year, month, last_day)

    total_working = sum(
        1 for d in range((end - start).days + 1)
        if (start + _dt.timedelta(days=d)).weekday() < 5
    )

    present = db.query(func.count(Attendance.id)).filter(
        Attendance.user_id == user_id,
        Attendance.date    >= start,
        Attendance.date    <= end,
        Attendance.status.in_(["present", "late"]),
    ).scalar() or 0

    absent = total_working - present
    return total_working, present, absent