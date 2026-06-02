from xhtml2pdf import pisa
import io

html = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body{font-family:Arial,sans-serif;padding:30px 40px;color:#333;}
.header{text-align:center;}
.company{font-size:34px;font-weight:bold;color:#1a1a2e;}
.title{font-size:22px;font-weight:700;letter-spacing:2px;color:#2144b3;}
.period{color:#777;margin-top:4px;font-size:14px;}
hr{border:none;border-top:1.5px solid #dcdcdc;margin:22px 0;}
.row{display:flex;gap:50px;}
.col{flex:1;}
.section-title{font-size:11px;color:#8a8a8a;font-weight:bold;letter-spacing:1.5px;margin-bottom:14px;text-transform:uppercase;}
.item{display:flex;justify-content:space-between;margin-bottom:10px;font-size:13px;}
.bold{font-weight:bold;border-top:1px solid #e0e0e0;padding-top:8px;margin-top:8px;}
.net-salary{margin-top:28px;border:1.5px solid #bcd0ff;background:#eef4ff;padding:18px 25px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;}
.net-label{color:#2144b3;font-weight:700;letter-spacing:2px;font-size:14px;}
.net-amount{color:#2144b3;font-size:36px;font-weight:bold;}
.footer{text-align:center;color:#999;margin-top:36px;font-size:11px;line-height:1.6;}
</style>
</head>
<body>
<div class="header">
    <div class="company">RT International</div>
    <div class="title">SALARY SLIP</div>
    <div class="period">for the month of May 2026</div>
</div>
<hr>
<div class="row">
<div class="col">
    <div class="section-title">Employee Information</div>
    <div class="item"><span>Name</span><span>Test User</span></div>
    <div class="item"><span>Employee ID</span><span>CAEL0001</span></div>
    <div class="item"><span>Designation</span><span>CSR</span></div>
    <div class="item"><span>Department</span><span>Sales</span></div>
    <div class="item"><span>CNIC</span><span>00000-0000000-0</span></div>
    <div class="item"><span>Date of Joining</span><span>01/01/2024</span></div>
</div>
<div class="col">
    <div class="section-title">Attendance Summary</div>
    <div class="item"><span>Working Days</span><span>30</span></div>
    <div class="item"><span>Present Days</span><span>28</span></div>
    <div class="item"><span>Absent Days</span><span>2</span></div>
</div>
</div>
<hr>
<div class="row">
<div class="col">
    <div class="section-title">Earnings</div>
    <div class="item"><span>Basic Salary</span><span>Rs. 17,500</span></div>
    <div class="item"><span>House Rent Allowance</span><span>Rs. 5,250</span></div>
    <div class="item"><span>Utility Allowance</span><span>Rs. 10,500</span></div>
    <div class="item"><span>Conveyance Allowance</span><span>Rs. 1,750</span></div>
    <div class="item bold"><span>Gross Salary</span><span>Rs. 35,000</span></div>
</div>
<div class="col">
    <div class="section-title">Deductions</div>
    <div class="item"><span>Absent Days Deduction</span><span>Rs. 2,333</span></div>
    <div class="item bold"><span>Total Deductions</span><span>Rs. 2,333</span></div>
</div>
</div>
<div class="net-salary">
    <div class="net-label">Net Salary</div>
    <div class="net-amount">Rs. 32,667</div>
</div>
<div class="footer">
    This is a computer-generated document and does not require a physical signature.<br>
    Generated on June 01, 2026 at 04:06 PM
</div>
</body>
</html>"""

result = io.BytesIO()
pdf = pisa.CreatePDF(html, dest=result)
print('err:', pdf.err)
print('bytes:', result.tell())
pdf_bytes = result.getvalue()
print('starts with PDF:', pdf_bytes[:8] == b'%PDF-1.4')
