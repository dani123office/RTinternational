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


def _num_to_words(n: int) -> str:
    """Convert an integer to English words (e.g. 243958 -> 'Two Hundred Forty Three Thousand Nine Hundred Fifty Eight')."""
    if n == 0:
        return "Zero"
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
            "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def _below_1000(num):
        if num == 0:
            return ""
        elif num < 20:
            return ones[num]
        elif num < 100:
            return tens[num // 10] + (" " + ones[num % 10] if num % 10 else "")
        else:
            rest = _below_1000(num % 100)
            return ones[num // 100] + " Hundred" + (" " + rest if rest else "")

    parts = []
    if n < 0:
        parts.append("Minus")
        n = abs(n)

    billions = n // 1_000_000_000
    millions = (n % 1_000_000_000) // 1_000_000
    thousands = (n % 1_000_000) // 1_000
    remainder = n % 1_000

    if billions:
        parts.append(_below_1000(billions) + " Billion")
    if millions:
        parts.append(_below_1000(millions) + " Million")
    if thousands:
        parts.append(_below_1000(thousands) + " Thousand")
    if remainder:
        parts.append(_below_1000(remainder))
    return " ".join(parts)


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

    def _load_image_resource(self, path: str = None):
        """Loads PNG/JPG from base64 data, converts to RGB JPEG bytes, cleans gray background to white and returns (bytes, width, height) or None."""
        import base64
        from PIL import Image
        import io
        try:
            from CallCenterAPI_FastAPI.utils.logo_data import LOGO_BASE64
            img_data = base64.b64decode(LOGO_BASE64)
            with Image.open(io.BytesIO(img_data)) as im:
                w, h = im.size
                # Convert to RGBA so we can safely edit pixel data
                im = im.convert('RGBA')
                
                # Replace the solid light gray background (230, 230, 230) with pure white
                datas = im.getdata()
                new_data = []
                for item in datas:
                    r, g, b, a = item
                    # If pixel is light gray / near-white background, convert to pure white
                    if r > 220 and g > 220 and b > 220:
                        new_data.append((255, 255, 255, 255))
                    else:
                        new_data.append(item)
                im.putdata(new_data)
                
                # Convert to RGB mode with a white background for final JPEG saving
                bg = Image.new('RGB', im.size, (255, 255, 255))
                bg.paste(im, mask=im.split()[3])
                im = bg
                
                buf = io.BytesIO()
                im.save(buf, format='JPEG', quality=95)
                return buf.getvalue(), w, h
        except Exception as e:
            print(f"Error loading image resource: {e}")
            return None

    # ── main build ────────────────────────────────────────────────────────────
    def build_slip(self, **kw):
        buf = []
        PW, PH = self.PAGE_W, self.PAGE_H
        LM = self.LM
        RM = PW - LM

        def Y(pt): return PH - pt

        # ── colour constants for new design ──────────────────────────────────
        C_TEAL   = (0, 102, 128)      # dark teal for decorations
        C_TEAL_L = (0, 140, 170)      # lighter teal accent
        C_GOLD   = (180, 160, 60)     # gold/olive for highlights
        C_BLACK  = (0, 0, 0)
        C_GREY   = (100, 100, 100)
        C_LGREY  = (200, 200, 200)
        C_WHITE  = (255, 255, 255)
        C_YELLOW = (255, 255, 0)      # highlight yellow

        # ── page background: white ───────────────────────────────────────────
        buf.append(self._fg(*C_WHITE))
        buf.append(self._rect(0, 0, PW, PH, fill=True, stroke=False))

        # ── LEFT SIDE BLUE CURVED DECORATION ─────────────────────────────────
        # Top-left blue curved shape
        buf.append(self._fg(*C_TEAL))
        buf.append(f"0 {PH} m 0 {PH - 180} l 35 {PH - 160} 45 {PH - 100} 30 {PH - 40} c 20 {PH} l h f\n")
        # Bottom-left blue curved shape
        buf.append(f"0 180 m 0 0 l 40 0 l 45 60 35 140 0 180 c h f\n")

        # ── HEADER AREA ──────────────────────────────────────────────────────
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        logo_path = os.path.join(base_dir, "logort.png")
        img_data = self._load_image_resource(logo_path)

        if img_data:
            img_bytes, img_w, img_h = img_data
            aspect = img_w / img_h
            h = 60
            w = h * aspect
            logo_x = 50
            icon_y = Y(30 + h)
            buf.append(f"q {w:.2f} 0 0 {h:.2f} {logo_x:.2f} {icon_y:.2f} cm /Im1 Do Q\n")

            # Company name below logo
            brand_y = icon_y - 10
            buf.append(self._fg(*C_TEAL))
            buf.append(self._t(50, brand_y, "RINDH TECH INTERNATIONAL", "Helvetica-Bold", 7))
            buf.append(self._t(50, brand_y - 10, "SMC Pvt.Ltd", "Helvetica-Bold", 6))
        else:
            # Fallback: draw text logo
            buf.append(self._fg(*C_TEAL))
            buf.append(self._t(50, Y(50), "RT International", "Helvetica-Bold", 18))

        # ── Date and Reference on top right ──────────────────────────────────
        now_str = kw.get("generated_at", "")
        buf.append(self._fg(*C_BLACK))
        buf.append(self._tr(RM, Y(60), now_str.split(" at ")[0] if " at " in now_str else now_str, "Helvetica", 9))
        # Reference number
        ref = f"HRG/RTL/{kw.get('slip_year', '')}"
        buf.append(self._tr(RM, Y(72), ref, "Helvetica", 8))

        # ── decorative triangles row ─────────────────────────────────────────
        tri_y = Y(42)
        tri_x = 280
        buf.append(self._fg(*C_LGREY))
        for i in range(8):
            x = tri_x + i * 30
            buf.append(f"{x} {tri_y} m {x+8} {tri_y+10} l {x+16} {tri_y} l h f\n")

        # ── TITLE BAR ────────────────────────────────────────────────────────
        title_y = Y(130)
        bar_h = 20
        buf.append(self._fg(*C_TEAL))
        buf.append(self._rect(LM, title_y, RM - LM, bar_h, fill=True, stroke=False))
        buf.append(self._fg(*C_WHITE))
        period_text = f"Pay slip {kw['period']}"
        buf.append(self._tc(title_y + 5, period_text, "Helvetica-Bold", 9))

        # ── EMPLOYEE INFORMATION TABLE ────────────────────────────────────────
        table_top = title_y - 5
        row_h = 16
        label_w = 100
        value_w = 160
        col2_x = LM + label_w + value_w + 10

        # Table border
        buf.append(self._sg(*C_BLACK))
        buf.append(self._lw(0.5))

        info_rows = [
            ("Employee Name", kw["employee_name"], None, None),
            ("Employee CNIC", kw["cnic"], None, None),
            ("Designation", kw["designation"], None, None),
            ("Pay Period", kw.get("pay_period", "-"), "Employee Net Pay=", f"Rs.{kw['net_salary']:,}.00"),
            ("Payment Date", kw.get("payment_date", "-"), f"Paid Days:{kw['present_days']} | LOP Days: {kw['absent_days']}", None),
            ("Salary A/C Number", kw.get("account_number", "-"), None, None),
            ("Bank Name", kw.get("bank_name", "-"), None, None),
            ("Job Cadre", kw.get("job_cadre", "Full time"), None, None),
            ("Currency Type", "Pak Rupee", None, None),
        ]

        y = table_top
        for i, (label, value, right_label, right_value) in enumerate(info_rows):
            ry = y - row_h
            # Left label cell
            buf.append(self._sg(*C_BLACK))
            buf.append(self._lw(0.3))
            buf.append(self._rect(LM, ry, label_w, row_h, fill=False, stroke=True))
            # Left value cell
            buf.append(self._rect(LM + label_w, ry, value_w, row_h, fill=False, stroke=True))

            # Label text
            buf.append(self._fg(*C_BLACK))
            buf.append(self._t(LM + 3, ry + 4, label, "Helvetica-Bold", 7))
            # Value text
            buf.append(self._fg(*C_BLACK))
            buf.append(self._t(LM + label_w + 3, ry + 4, str(value), "Helvetica", 7))

            # Right side content
            if right_label and right_value:
                # Net Pay highlighted box
                right_w = RM - col2_x
                buf.append(self._rect(col2_x, ry, right_w, row_h, fill=False, stroke=True))
                buf.append(self._fg(*C_BLACK))
                buf.append(self._t(col2_x + 3, ry + 4, f"{right_label} {right_value}", "Helvetica-Bold", 7))
            elif right_label:
                right_w = RM - col2_x
                buf.append(self._rect(col2_x, ry, right_w, row_h, fill=False, stroke=True))
                buf.append(self._fg(*C_BLACK))
                buf.append(self._t(col2_x + 3, ry + 4, right_label, "Helvetica", 7))

            y = ry

        # ── EARNINGS & DEDUCTIONS TABLE ──────────────────────────────────────
        y -= 8
        earn_top = y
        # Column widths for 6-column table
        e_label_w = 120
        e_amt_w = 70
        e_ytd_w = 70
        d_label_w = 80
        d_amt_w = 60
        d_ytd_w = 50

        total_w = e_label_w + e_amt_w + e_ytd_w + d_label_w + d_amt_w + d_ytd_w
        # Scale to fit
        scale = (RM - LM) / total_w
        e_label_w = int(e_label_w * scale)
        e_amt_w = int(e_amt_w * scale)
        e_ytd_w = int(e_ytd_w * scale)
        d_label_w = int(d_label_w * scale)
        d_amt_w = int(d_amt_w * scale)
        d_ytd_w = RM - LM - e_label_w - e_amt_w - e_ytd_w - d_label_w - d_amt_w

        # Header row
        hdr_h = 16
        hdr_y = y - hdr_h
        # Yellow highlighted header cells
        buf.append(self._fg(*C_YELLOW))
        buf.append(self._rect(LM, hdr_y, e_label_w, hdr_h, fill=True, stroke=False))
        buf.append(self._rect(LM + e_label_w, hdr_y, e_amt_w, hdr_h, fill=True, stroke=False))
        buf.append(self._rect(LM + e_label_w + e_amt_w, hdr_y, e_ytd_w, hdr_h, fill=True, stroke=False))
        buf.append(self._rect(LM + e_label_w + e_amt_w + e_ytd_w, hdr_y, d_label_w, hdr_h, fill=True, stroke=False))
        buf.append(self._rect(LM + e_label_w + e_amt_w + e_ytd_w + d_label_w, hdr_y, d_amt_w, hdr_h, fill=True, stroke=False))
        buf.append(self._rect(LM + e_label_w + e_amt_w + e_ytd_w + d_label_w + d_amt_w, hdr_y, d_ytd_w, hdr_h, fill=True, stroke=False))

        # Header borders
        buf.append(self._sg(*C_BLACK))
        buf.append(self._lw(0.3))
        buf.append(self._rect(LM, hdr_y, RM - LM, hdr_h, fill=False, stroke=True))
        # Vertical lines in header
        cx = LM + e_label_w
        buf.append(self._line(cx, hdr_y, cx, hdr_y + hdr_h))
        cx += e_amt_w
        buf.append(self._line(cx, hdr_y, cx, hdr_y + hdr_h))
        cx += e_ytd_w
        buf.append(self._line(cx, hdr_y, cx, hdr_y + hdr_h))
        cx += d_label_w
        buf.append(self._line(cx, hdr_y, cx, hdr_y + hdr_h))
        cx += d_amt_w
        buf.append(self._line(cx, hdr_y, cx, hdr_y + hdr_h))

        # Header text
        buf.append(self._fg(*C_BLACK))
        buf.append(self._t(LM + 3, hdr_y + 4, "EARNINGS", "Helvetica-Bold", 7))
        buf.append(self._t(LM + e_label_w + 3, hdr_y + 4, "AMOUNT", "Helvetica-Bold", 7))
        buf.append(self._t(LM + e_label_w + e_amt_w + 3, hdr_y + 4, "YTD", "Helvetica-Bold", 7))
        dx = LM + e_label_w + e_amt_w + e_ytd_w
        buf.append(self._t(dx + 3, hdr_y + 4, "DEDUCTIONS", "Helvetica-Bold", 7))
        buf.append(self._t(dx + d_label_w + 3, hdr_y + 4, "AMOUNT", "Helvetica-Bold", 7))
        buf.append(self._t(dx + d_label_w + d_amt_w + 3, hdr_y + 4, "YTD", "Helvetica-Bold", 7))

        # Data rows
        earnings = kw["earnings"]
        deductions = kw["deductions"]
        max_rows = max(len(earnings), len(deductions))
        data_row_h = 15

        y = hdr_y
        for i in range(max_rows):
            ry = y - data_row_h
            # Row background (alternate white)
            buf.append(self._sg(*C_BLACK))
            buf.append(self._lw(0.2))

            # Earnings cells
            if i < len(earnings):
                lbl, amt, bold = earnings[i]
                fnt = "Helvetica-Bold" if bold else "Helvetica"
                buf.append(self._rect(LM, ry, e_label_w, data_row_h, fill=False, stroke=True))
                buf.append(self._rect(LM + e_label_w, ry, e_amt_w, data_row_h, fill=False, stroke=True))
                buf.append(self._rect(LM + e_label_w + e_amt_w, ry, e_ytd_w, data_row_h, fill=False, stroke=True))
                buf.append(self._fg(*C_BLACK))
                buf.append(self._t(LM + 3, ry + 4, lbl, fnt, 7))
                # Amount - right align
                amt_str = amt.replace("Rs. ", "")
                buf.append(self._tr(LM + e_label_w + e_amt_w - 3, ry + 4, amt_str, fnt, 7))
                # YTD
                ytd_val = kw.get("ytd_earnings", {}).get(lbl, "")
                if ytd_val:
                    buf.append(self._tr(LM + e_label_w + e_amt_w + e_ytd_w - 3, ry + 4, str(ytd_val), "Helvetica", 7))
            else:
                buf.append(self._rect(LM, ry, e_label_w + e_amt_w + e_ytd_w, data_row_h, fill=False, stroke=True))

            # Deductions cells
            ddx = LM + e_label_w + e_amt_w + e_ytd_w
            if i < len(deductions):
                lbl, amt, bold = deductions[i]
                fnt = "Helvetica-Bold" if bold else "Helvetica"
                buf.append(self._rect(ddx, ry, d_label_w, data_row_h, fill=False, stroke=True))
                buf.append(self._rect(ddx + d_label_w, ry, d_amt_w, data_row_h, fill=False, stroke=True))
                buf.append(self._rect(ddx + d_label_w + d_amt_w, ry, d_ytd_w, data_row_h, fill=False, stroke=True))
                buf.append(self._fg(*C_BLACK))
                buf.append(self._t(ddx + 3, ry + 4, lbl, fnt, 7))
                amt_str = amt.replace("Rs. ", "")
                buf.append(self._tr(ddx + d_label_w + d_amt_w - 3, ry + 4, amt_str, fnt, 7))
            else:
                buf.append(self._rect(ddx, ry, d_label_w + d_amt_w + d_ytd_w, data_row_h, fill=False, stroke=True))

            y = ry

        # ── SUMMARY ROWS ────────────────────────────────────────────────────
        gross = kw.get("gross_salary", kw["net_salary"])
        total_ded = 0
        for _, amt, _ in kw["deductions"]:
            val = amt.replace("Rs. ", "").replace(",", "")
            try:
                total_ded = int(val)
            except ValueError:
                pass

        summary_rows = [
            ("Gross Earnings", "", f"{gross:,}.00"),
            ("Total Deductions", "", f"{total_ded:,}.00"),
            ("Total Net Payable", "", f"Rs {kw['net_salary']:,}.00"),
        ]
        for lbl, _, val in summary_rows:
            ry = y - data_row_h
            buf.append(self._sg(*C_BLACK))
            buf.append(self._lw(0.3))
            buf.append(self._rect(LM, ry, e_label_w + e_amt_w + e_ytd_w, data_row_h, fill=False, stroke=True))
            buf.append(self._rect(LM + e_label_w + e_amt_w + e_ytd_w, ry, d_label_w + d_amt_w + d_ytd_w, data_row_h, fill=False, stroke=True))
            buf.append(self._fg(*C_BLACK))
            buf.append(self._t(LM + 3, ry + 4, lbl, "Helvetica-Bold", 7))
            buf.append(self._tr(RM - 3, ry + 4, val, "Helvetica-Bold", 7))
            y = ry

        # ── NET PAYABLE IN WORDS ─────────────────────────────────────────────
        ry = y - data_row_h - 2
        buf.append(self._sg(*C_BLACK))
        buf.append(self._lw(0.3))
        buf.append(self._rect(LM, ry, RM - LM, data_row_h, fill=False, stroke=True))
        buf.append(self._fg(*C_BLACK))
        words = kw.get("net_in_words", "")
        buf.append(self._t(LM + 3, ry + 4, f"Total Net Payable {kw['net_salary']:,}.00 ( {words} Rupees).", "Helvetica-Bold", 6.5))
        y = ry

        # ── ISSUED ON DATE ───────────────────────────────────────────────────
        y -= 12
        buf.append(self._fg(*C_GREY))
        buf.append(self._tr(RM, y, f"Issued on {kw.get('issued_date', '')}", "Helvetica-Oblique", 7))

        # ── REGARDS SECTION ──────────────────────────────────────────────────
        y -= 40
        buf.append(self._fg(*C_GREY))
        buf.append(self._tr(RM - 40, y, "Regards,", "Helvetica-Oblique", 9))
        y -= 14
        buf.append(self._tr(RM - 40, y, "Qalab Abbas", "Helvetica-Bold", 9))
        y -= 12
        buf.append(self._tr(RM - 40, y, "Director", "Helvetica-Oblique", 9))

        # ── SIGNATURE LINE ───────────────────────────────────────────────────
        y -= 30
        buf.append(self._sg(*C_TEAL))
        buf.append(self._lw(0.5))
        buf.append(self._line(RM - 140, y, RM - 20, y))
        y -= 12
        buf.append(self._fg(*C_TEAL))
        buf.append(self._tr(RM - 50, y, "Signature", "Helvetica-Oblique", 8))

        # ── FOOTER ───────────────────────────────────────────────────────────
        # Bottom blue curved decoration is already drawn at top
        # Footer contact info
        fy = 75
        buf.append(self._fg(*C_TEAL))
        # Phone icon + number
        buf.append(self._t(50, fy, "0314-5195056", "Helvetica", 8))
        fy -= 14
        # Email
        buf.append(self._t(50, fy, "rtinternational566@gmail.com", "Helvetica", 8))
        fy -= 14
        # Address
        buf.append(self._t(50, fy, "Office#3, Plot#15 Near JS Bank, Bank Road, Saddar Rawalpindi", "Helvetica", 7))

        content = "".join(buf)
        self._build_pdf(content, img_data=img_data)

    def _build_pdf(self, content: str, img_data=None):
        import io
        objects = []

        def o(body):
            objects.append(body)
            return len(objects)

        con_obj = o(f"<< /Length {len(content.encode('latin-1'))} >>\nstream\n{content}\nendstream")
        f1 = o("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
        f2 = o("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
        f3 = o("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>")

        if img_data:
            img_bytes, w, h = img_data
            img_head = (
                f"<< /Type /XObject /Subtype /Image /Width {w} /Height {h} "
                f"/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode "
                f"/Length {len(img_bytes)} >>\nstream\n"
            )
            img_body = img_head.encode("latin-1") + img_bytes + b"\nendstream"
            im_ref = o(img_body.decode("latin-1"))
            res = o(f"<< /Font << /F1 {f1} 0 R /F2 {f2} 0 R /F3 {f3} 0 R >> /XObject << /Im1 {im_ref} 0 R >> >>")
        else:
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
    loan_deduction: float = Query(0.0, ge=0, alias="loan_deduction"),
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
    loan_ded   = int(loan_deduction)
    gross      = basic + hra + utility + conveyance + comm

    # ── deductions ────────────────────────────────────────────────────────────
    daily_rate        = (basic + hra + utility + conveyance) / working_days if working_days > 0 else 0
    absent_deduction  = int(round(daily_rate * absent_days))
    total_deductions  = absent_deduction + loan_ded
    net_salary        = gross - total_deductions

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
    ]
    if loan_ded:
        deductions_rows.append(("Loan Deduction", _fmt(loan_ded), False))
    deductions_rows.append(("Total Deductions", _fmt(total_deductions), True))

    pdf = _SalaryPDF()
    gen_now = datetime.now()
    pdf.build_slip(
        period        = f"for the month of {_month_name(m)} {y}",
        employee_name = current_user.name,
        employee_id   = _employee_id(current_user),
        designation   = current_user.designation   or "-",
        department    = current_user.department    or "-",
        cnic          = current_user.cnic          or "-",
        doj           = current_user.date_of_joining.strftime("%d/%m/%Y") if current_user.date_of_joining else "-",
        working_days  = str(working_days),
        present_days  = str(present_days),
        absent_days   = str(absent_days),
        earnings      = earnings_rows,
        deductions    = deductions_rows,
        net_salary    = net_salary,
        gross_salary  = gross,
        generated_at  = gen_now.strftime("%B %d, %Y at %I:%M %p"),
        pay_period    = f"{_month_name(m)[:3]}-{y}",
        payment_date  = gen_now.strftime("%d %B %Y"),
        account_number= current_user.bank_account_number or "-",
        bank_name     = current_user.bank_name or "-",
        job_cadre     = current_user.job_cadre or "Full time",
        net_in_words  = _num_to_words(max(net_salary, 0)),
        issued_date   = gen_now.strftime("%d %B %Y"),
        slip_year     = str(y),
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