import unittest
import requests
import time
import random
import string
from datetime import datetime, timedelta

BASE_URL = "http://localhost:7219"

# Helper to generate unique emails/names
def rand_string(length=8):
    return "".join(random.choices(string.ascii_lowercase, k=length))

def get_unique_email():
    return f"test_{rand_string()}@example.com"

def get_unique_postcode():
    # Format matching: ^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$
    digit = random.choice("123456789")
    letters = "".join(random.choices(string.ascii_uppercase, k=2))
    return f"EC1A {digit}{letters}"

class RTInternationalBackendTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.admin_email = "admin@test.com"
        cls.manager_email = "manager@test.com"
        cls.agent_email = "usman@test.com"
        cls.other_agent_email = "james@test.com"
        cls.password = "password"
        
        # Authenticate and obtain tokens with a timeout
        cls.admin_token = cls.get_token(cls.admin_email, cls.password)
        cls.manager_token = cls.get_token(cls.manager_email, cls.password)
        cls.agent_token = cls.get_token(cls.agent_email, cls.password)
        cls.other_agent_token = cls.get_token(cls.other_agent_email, cls.password)

    @classmethod
    def get_token(cls, email, password):
        try:
            r = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": email,
                "password": password
            }, timeout=5.0)
            if r.status_code == 200:
                return r.json().get("token")
        except Exception as e:
            print(f"Error getting token: {e}")
        return None

    def get_auth_header(self, token):
        return {"Authorization": f"Bearer {token}"}

    # ==========================================
    # AUTHENTICATION & REGISTRATION (BT001-BT004)
    # ==========================================
    
    def test_BT001_user_registration_valid_input(self):
        email = get_unique_email()
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": email,
            "password": "password123",
            "role": "agent"
        }, timeout=5.0)
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertIn("token", data)
        self.assertEqual(data.get("name"), "Test User")

    def test_BT002_user_registration_duplicate_email(self):
        email = get_unique_email()
        payload = {
            "name": "Test User",
            "email": email,
            "password": "password123",
            "role": "agent"
        }
        r1 = requests.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=5.0)
        self.assertEqual(r1.status_code, 200)
        
        r2 = requests.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=5.0)
        self.assertEqual(r2.status_code, 400)
        self.assertIn("Email already exists", r2.json().get("detail", ""))

    def test_BT003_user_login_valid_credentials(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.agent_email,
            "password": self.password
        }, timeout=5.0)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn("token", data)
        self.assertIn("refreshToken", data)
        self.assertEqual(data.get("role"), "agent")

    def test_BT004_user_login_invalid_credentials(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.agent_email,
            "password": "wrong_password"
        }, timeout=5.0)
        self.assertEqual(r.status_code, 401)
        self.assertIn("Invalid credentials", r.json().get("detail", ""))

    # ==========================================
    # CUSTOMER & METER MANAGEMENT (BT005-BT009)
    # ==========================================

    def test_BT005_create_customer_agent_authorization(self):
        headers = self.get_auth_header(self.agent_token)
        postcode = get_unique_postcode()
        payload = {
            "businessName": f"Agent Customer Ltd {rand_string()}",
            "ownerName": "John Doe",
            "businessPhone": "07123456789",
            "ownerPhone": "07987654321",
            "email": "john@agentcustomer.com",
            "businessAddress": "123 High Street, London",
            "postcode": postcode,
            "utilityType": "electricity"
        }
        r = requests.post(f"{BASE_URL}/api/customers", json=payload, headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertIn("id", data)
        self.assertTrue(data.get("businessName").startswith("Agent Customer Ltd"))

    def test_BT006_get_customers_agent_view(self):
        headers = self.get_auth_header(self.agent_token)
        r = requests.get(f"{BASE_URL}/api/customers", headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.json(), dict) # FastAPI returns {"items": [...], "total": ...}

    def test_BT007_update_customer_agent_authorization(self):
        headers = self.get_auth_header(self.agent_token)
        postcode = get_unique_postcode()
        c_payload = {
            "businessName": f"Update Target {rand_string()}",
            "ownerName": "John Update",
            "businessPhone": "07123456789",
            "businessAddress": "Update St",
            "postcode": postcode,
            "utilityType": "electricity"
        }
        rc = requests.post(f"{BASE_URL}/api/customers", json=c_payload, headers=headers, timeout=5.0)
        self.assertEqual(rc.status_code, 200, rc.text)
        c_id = rc.json().get("id")
        
        u_payload = {
            "businessName": "Updated Business Name Ltd",
            "ownerName": "John Updated"
        }
        ru = requests.put(f"{BASE_URL}/api/customers/{c_id}", json=u_payload, headers=headers, timeout=5.0)
        self.assertEqual(ru.status_code, 200, ru.text)
        self.assertEqual(ru.json().get("businessName"), "Updated Business Name Ltd")
        self.assertEqual(ru.json().get("ownerName"), "John Updated")

    def test_BT008_add_electricity_meter_customer_utility_details(self):
        headers = self.get_auth_header(self.agent_token)
        postcode = get_unique_postcode()
        c_payload = {
            "businessName": f"Customer Meter Test {rand_string()}",
            "ownerName": "John Meter",
            "businessPhone": "07123456789",
            "businessAddress": "Meter St",
            "postcode": postcode,
            "utilityType": "electricity"
        }
        rc = requests.post(f"{BASE_URL}/api/customers", json=c_payload, headers=headers, timeout=5.0)
        self.assertEqual(rc.status_code, 200, rc.text)
        c_id = rc.json().get("id")
        
        m_payload = {
            "meterNumber": 1,
            "currentSupplier": "British Gas",
            "supplyNumber": "04-111-222",
            "dayUnitRate": 25.5,
            "nightUnitRate": 18.2,
            "eveningUnitRate": 21.0,
            "standingRate": 45.0,
            "monthlyBill": 250.0,
            "contractEndDate": "2026-12-31"
        }
        rm = requests.post(f"{BASE_URL}/api/customers/{c_id}/electricity-meters", json=m_payload, headers=headers, timeout=5.0)
        self.assertEqual(rm.status_code, 200, rm.text)
        self.assertIn("id", rm.json())
        self.assertEqual(rm.json().get("currentSupplier"), "British Gas")

    def test_BT009_add_gas_meter_customer_utility_details(self):
        headers = self.get_auth_header(self.agent_token)
        postcode = get_unique_postcode()
        c_payload = {
            "businessName": f"Customer Gas Test {rand_string()}",
            "ownerName": "John Gas",
            "businessPhone": "07123456789",
            "businessAddress": "Gas St",
            "postcode": postcode,
            "utilityType": "gas"
        }
        rc = requests.post(f"{BASE_URL}/api/customers", json=c_payload, headers=headers, timeout=5.0)
        self.assertEqual(rc.status_code, 200, rc.text)
        c_id = rc.json().get("id")
        
        m_payload = {
            "meterNumber": 1,
            "currentSupplier": "E.ON",
            "unitRate": 12.5,
            "standingRate": 35.0,
            "monthlyBill": 120.0,
            "contractEndDate": "2026-11-30"
        }
        rm = requests.post(f"{BASE_URL}/api/customers/{c_id}/gas-meters", json=m_payload, headers=headers, timeout=5.0)
        self.assertEqual(rm.status_code, 200, rm.text)
        self.assertIn("id", rm.json())
        self.assertEqual(rm.json().get("currentSupplier"), "E.ON")

    # ==========================================
    # AI EXTRACTION & REGEX FALLBACK (BT010-BT011)
    # ==========================================

    def test_BT010_ai_extraction_parse_unstructured_notes(self):
        headers = self.get_auth_header(self.agent_token)
        notes_text = (
            "Spoke to director Usman at RT International Cafe (SW1A 1AA). Business phone is 02071234567. "
            "Email usman@test.com. Electricity meter supply number is 04-999-888 with MSN E1023948. "
            "Current supplier is BG. Day unit rate is UR 34.5p, standing rate SC 65p/day. CED is June 2026. "
            "Offered E.ON contract for 24 months. Offered rates: day unit rate 29.5p, standing rate 55p."
        )
        r = requests.post(f"{BASE_URL}/api/ai/extract", json={"text": notes_text}, headers=headers, timeout=10.0)
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertEqual(data.get("postcode"), "SW1A 1AA")
        self.assertTrue(len(data.get("electricityMeters", [])) > 0 or len(data.get("gasMeters", [])) > 0)

    def test_BT011_ai_extraction_fallback_to_regex(self):
        headers = self.get_auth_header(self.agent_token)
        notes_text = (
            "business name: Regex Bakery Ltd\n"
            "site address: 55 Pastry Lane\n"
            "postcode: EC1A 1BB\n"
            "owner name: Pierre Boulanger\n"
            "contact: 07999888777\n"
            "email: pierre@regexbakery.com\n"
            "MPAN: 1300009880970\n"
        )
        r = requests.post(f"{BASE_URL}/api/ai/extract", json={"text": notes_text}, headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertEqual(data.get("postcode"), "EC1A 1BB")
        self.assertEqual(data.get("email"), "pierre@regexbakery.com")
        self.assertEqual(data.get("businessName"), "Regex Bakery Ltd")
        self.assertEqual(data.get("ownerName"), "Pierre Boulanger")

    # ==========================================
    # CALLBACKS (BT012-BT014)
    # ==========================================

    def test_BT012_create_callback_schedule_pricing(self):
        headers = self.get_auth_header(self.agent_token)
        postcode = get_unique_postcode()
        c_payload = {
            "businessName": f"Callback Customer {rand_string()}",
            "ownerName": "Al Pacino",
            "businessPhone": "07123456789",
            "businessAddress": "Scarface Ave",
            "postcode": postcode,
            "utilityType": "electricity"
        }
        rc = requests.post(f"{BASE_URL}/api/customers", json=c_payload, headers=headers, timeout=5.0)
        self.assertEqual(rc.status_code, 200, rc.text)
        c_id = rc.json().get("id")
        
        # Use local now() + offset to avoid past scheduled date validation failure due to naive UTC representation
        cb_time = (datetime.now() + timedelta(days=2)).isoformat()
        cb_payload = {
            "customerId": c_id,
            "scheduledDateTime": cb_time,
            "notes": "Discuss rate reduction offers",
            "offeredElectricityRates": [{
                "contractLength": "24 months",
                "supplier": "British Gas Lite",
                "meterType": "Standard",
                "commissionType": "commission",
                "dayUnitRate": 28.5,
                "standingRate": 50.0,
                "brokerServiceCharge": 1.5
            }]
        }
        r = requests.post(f"{BASE_URL}/api/callbacks", json=cb_payload, headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertIn("id", data)
        self.assertEqual(data.get("status"), "pending")

    def test_BT013_update_callback_status_complete(self):
        headers = self.get_auth_header(self.agent_token)
        postcode = get_unique_postcode()
        c_payload = {
            "businessName": f"Callback Update Customer {rand_string()}",
            "ownerName": "De Niro",
            "businessPhone": "07123456789",
            "businessAddress": "Taxi Rd",
            "postcode": postcode,
            "utilityType": "electricity"
        }
        rc = requests.post(f"{BASE_URL}/api/customers", json=c_payload, headers=headers, timeout=5.0)
        self.assertEqual(rc.status_code, 200, rc.text)
        c_id = rc.json().get("id")
        
        cb_time = (datetime.now() + timedelta(days=1)).isoformat()
        rcb = requests.post(f"{BASE_URL}/api/callbacks", json={
            "customerId": c_id,
            "scheduledDateTime": cb_time,
            "notes": "Call soon"
        }, headers=headers, timeout=5.0)
        self.assertEqual(rcb.status_code, 200, rcb.text)
        cb_id = rcb.json().get("id")
        
        ru = requests.put(f"{BASE_URL}/api/callbacks/{cb_id}", json={
            "status": "done",
            "outcome": "interested"
        }, headers=headers, timeout=5.0)
        self.assertEqual(ru.status_code, 200, ru.text)
        self.assertEqual(ru.json().get("status"), "done")

    def test_BT014_get_callbacks_agent_filter(self):
        headers = self.get_auth_header(self.agent_token)
        r = requests.get(f"{BASE_URL}/api/callbacks", headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 200)
        items = r.json().get("items", [])
        self.assertIsInstance(items, list)
        for item in items:
            self.assertEqual(item.get("agentName"), "Usman")

    # ==========================================
    # TRANSFERS & SALES (BT015-BT018)
    # ==========================================

    def test_BT015_create_transfer_account_details(self):
        headers = self.get_auth_header(self.agent_token)
        postcode = get_unique_postcode()
        c_payload = {
            "businessName": f"Transfer Cust {rand_string()}",
            "ownerName": "Joe Pesci",
            "businessPhone": "07123456789",
            "businessAddress": "Casino Blvd",
            "postcode": postcode,
            "utilityType": "electricity"
        }
        rc = requests.post(f"{BASE_URL}/api/customers", json=c_payload, headers=headers, timeout=5.0)
        self.assertEqual(rc.status_code, 200, rc.text)
        c_id = rc.json().get("id")
        
        t_payload = {
            "customerId": c_id,
            "utilityType": "electricity",
            "supplier": "SSE",
            "accountNumber": "987654321",
            "mpan": "1300009880970",
            "msn": "E-999-MSN",
            "notes": "Initiate transfer offer",
            "offeredElectricityRates": [{
                "contractLength": "12 months",
                "supplier": "SSE",
                "dayUnitRate": 29.0,
                "standingRate": 60.0
            }]
        }
        r = requests.post(f"{BASE_URL}/api/transfers", json=t_payload, headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertIn("id", data)
        self.assertEqual(data.get("accountNumber"), "987654321")

    def test_BT016_get_transfers_agent_filter(self):
        headers = self.get_auth_header(self.agent_token)
        r = requests.get(f"{BASE_URL}/api/transfers", headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 200)
        items = r.json().get("items", [])
        self.assertIsInstance(items, list)
        for item in items:
            self.assertEqual(item.get("agentName"), "Usman")

    def test_BT017_create_sale_final_submission(self):
        headers = self.get_auth_header(self.agent_token)
        postcode = get_unique_postcode()
        c_payload = {
            "businessName": f"Sale Cust {rand_string()}",
            "ownerName": "Marlon Brando",
            "businessPhone": "07123456789",
            "businessAddress": "Godfather Mansion",
            "postcode": postcode,
            "utilityType": "electricity"
        }
        rc = requests.post(f"{BASE_URL}/api/customers", json=c_payload, headers=headers, timeout=5.0)
        self.assertEqual(rc.status_code, 200, rc.text)
        c_id = rc.json().get("id")
        
        t_payload = {
            "customerId": c_id,
            "utilityType": "electricity",
            "supplier": "E.ON Next",
            "accountNumber": "987654321"
        }
        rt = requests.post(f"{BASE_URL}/api/transfers", json=t_payload, headers=headers, timeout=5.0)
        self.assertEqual(rt.status_code, 200, rt.text)
        t_id = rt.json().get("id")
        
        s_payload = {
            "customerId": c_id,
            "transferId": t_id,
            "ownerFullName": "Marlon Brando",
            "homeAddress": "Godfather Mansion",
            "dateOfBirth": "1940-04-03",
            "businessType": "sole_trader",
            "billFrequency": "monthly",
            "paymentMethod": "direct_debit",
            "bankName": "Barclays",
            "accountType": "Business Direct",
            "accountTitle": "Marlon Brando Trading",
            "sortCode": "20-30-40",
            "bankAccountNumber": "12345678",
            "notes": "Completed sale registration"
        }
        r = requests.post(f"{BASE_URL}/api/sales", json=s_payload, headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertIn("id", data)
        self.assertEqual(data.get("sortCode"), "20-30-40")

    def test_BT018_get_sales_agent_filter(self):
        headers = self.get_auth_header(self.agent_token)
        r = requests.get(f"{BASE_URL}/api/sales", headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 200)
        items = r.json().get("items", [])
        self.assertIsInstance(items, list)
        for item in items:
            self.assertEqual(item.get("agentName"), "Usman")

    # ==========================================
    # MANAGER CONTROLS (BT019-BT020, BT031-BT032, BT035)
    # ==========================================

    def test_BT019_manager_dashboard_team_analytics(self):
        headers = self.get_auth_header(self.manager_token)
        r = requests.get(f"{BASE_URL}/api/manager/team-stats", headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertIn("totalCallbacks", data)
        self.assertIn("totalTransfers", data)

    def test_BT020_manager_callback_assignment_reassign(self):
        headers_agent = self.get_auth_header(self.agent_token)
        headers_mgr = self.get_auth_header(self.manager_token)
        postcode = get_unique_postcode()
        
        c_payload = {
            "businessName": f"Reassign Cust {rand_string()}",
            "ownerName": "Diane Keaton",
            "businessPhone": "07123456789",
            "businessAddress": "Annie Hall Lane",
            "postcode": postcode,
            "utilityType": "electricity"
        }
        rc = requests.post(f"{BASE_URL}/api/customers", json=c_payload, headers=headers_agent, timeout=5.0)
        self.assertEqual(rc.status_code, 200, rc.text)
        c_id = rc.json().get("id")
        
        t_payload = {
            "customerId": c_id,
            "utilityType": "electricity",
            "supplier": "Octopus"
        }
        rt = requests.post(f"{BASE_URL}/api/transfers", json=t_payload, headers=headers_agent, timeout=5.0)
        self.assertEqual(rt.status_code, 200, rt.text)
        t_id = rt.json().get("id")
        
        cb_time = (datetime.now() + timedelta(days=3)).isoformat()
        rcb = requests.post(f"{BASE_URL}/api/callbacks", json={
            "customerId": c_id,
            "scheduledDateTime": cb_time,
            "notes": "Need to reassign this"
        }, headers=headers_agent, timeout=5.0)
        self.assertEqual(rcb.status_code, 200, rcb.text)
        cb_id = rcb.json().get("id")
        
        r_agents = requests.get(f"{BASE_URL}/api/manager/agents", headers=headers_mgr, timeout=5.0)
        danny_id = None
        for a in r_agents.json():
            if a.get("name") == "Danny":
                danny_id = a.get("id")
                break
        
        self.assertIsNotNone(danny_id)
        
        ru = requests.put(f"{BASE_URL}/api/manager/callbacks/{cb_id}", json={
            "assignedAgentId": danny_id
        }, headers=headers_mgr, timeout=5.0)
        self.assertEqual(ru.status_code, 200, ru.text)
        self.assertEqual(ru.json().get("employeeId"), danny_id)

    def test_BT031_manager_delete_callback_agent_constraint(self):
        headers_mgr = self.get_auth_header(self.manager_token)
        headers_other = self.get_auth_header(self.other_agent_token)
        postcode = get_unique_postcode()
        
        c_payload = {
            "businessName": f"Other Cust {rand_string()}",
            "ownerName": "Robert Duvall",
            "businessPhone": "07123456789",
            "businessAddress": "Apocalypse Ave",
            "postcode": postcode,
            "utilityType": "electricity"
        }
        rc = requests.post(f"{BASE_URL}/api/customers", json=c_payload, headers=headers_other, timeout=5.0)
        self.assertEqual(rc.status_code, 200, rc.text)
        c_id = rc.json().get("id")
        
        t_payload = {
            "customerId": c_id,
            "utilityType": "electricity",
            "supplier": "Octopus"
        }
        rt = requests.post(f"{BASE_URL}/api/transfers", json=t_payload, headers=headers_other, timeout=5.0)
        self.assertEqual(rt.status_code, 200, rt.text)
        t_id = rt.json().get("id")
        
        cb_time = (datetime.now() + timedelta(days=3)).isoformat()
        rcb = requests.post(f"{BASE_URL}/api/callbacks", json={
            "customerId": c_id,
            "scheduledDateTime": cb_time,
            "notes": "Other team callback"
        }, headers=headers_other, timeout=5.0)
        self.assertEqual(rcb.status_code, 200, rcb.text)
        cb_id = rcb.json().get("id")
        
        rd = requests.delete(f"{BASE_URL}/api/manager/callbacks/{cb_id}", headers=headers_mgr, timeout=5.0)
        self.assertEqual(rd.status_code, 403)

    def test_BT032_manager_update_sale_agent_constraint(self):
        headers_mgr = self.get_auth_header(self.manager_token)
        headers_other = self.get_auth_header(self.other_agent_token)
        postcode = get_unique_postcode()
        
        c_payload = {
            "businessName": f"Other Sale Cust {rand_string()}",
            "ownerName": "James Caan",
            "businessPhone": "07123456789",
            "businessAddress": "Sonny St",
            "postcode": postcode,
            "utilityType": "electricity"
        }
        rc = requests.post(f"{BASE_URL}/api/customers", json=c_payload, headers=headers_other, timeout=5.0)
        self.assertEqual(rc.status_code, 200, rc.text)
        c_id = rc.json().get("id")
        
        t_payload = {
            "customerId": c_id,
            "utilityType": "electricity",
            "supplier": "Octopus"
        }
        rt = requests.post(f"{BASE_URL}/api/transfers", json=t_payload, headers=headers_other, timeout=5.0)
        self.assertEqual(rt.status_code, 200, rt.text)
        t_id = rt.json().get("id")
        
        s_payload = {
            "customerId": c_id,
            "transferId": t_id,
            "ownerFullName": "James Caan",
            "bankAccountNumber": "12345678",
            "sortCode": "20-30-40"
        }
        rs = requests.post(f"{BASE_URL}/api/sales", json=s_payload, headers=headers_other, timeout=5.0)
        self.assertEqual(rs.status_code, 200, rs.text)
        s_id = rs.json().get("id")
        
        ru = requests.put(f"{BASE_URL}/api/manager/sales/{s_id}", json={
            "notes": "Unauthorized manager update"
        }, headers=headers_mgr, timeout=5.0)
        self.assertEqual(ru.status_code, 403)

    def test_BT035_manager_notifications_feed(self):
        headers = self.get_auth_header(self.manager_token)
        r = requests.get(f"{BASE_URL}/api/manager/notifications", headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIsInstance(r.json(), list)

    # ==========================================
    # ADMIN ACTIONS (BT021-BT023, BT033-BT034)
    # ==========================================

    def test_BT021_admin_user_management_create_manager(self):
        headers = self.get_auth_header(self.admin_token)
        email = get_unique_email()
        r = requests.post(f"{BASE_URL}/api/admin/create-manager", json={
            "name": "New Manager Created By Admin",
            "email": email,
            "password": "password123"
        }, headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 201, r.text)
        self.assertEqual(r.json().get("role"), "manager")

    def test_BT022_admin_user_management_create_agent(self):
        headers = self.get_auth_header(self.admin_token)
        rm = requests.get(f"{BASE_URL}/api/admin/managers", headers=headers, timeout=5.0)
        self.assertEqual(rm.status_code, 200)
        mgr_id = rm.json()[0].get("id")
        
        email = get_unique_email()
        r = requests.post(f"{BASE_URL}/api/admin/create-agent", json={
            "name": "New Agent Created By Admin",
            "email": email,
            "password": "password123",
            "managerId": mgr_id
        }, headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 201, r.text)
        self.assertEqual(r.json().get("role"), "agent")

    def test_BT023_admin_audit_log_security_events(self):
        headers = self.get_auth_header(self.admin_token)
        r = requests.get(f"{BASE_URL}/api/admin/audit-log", headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIsInstance(r.json(), list)

    def test_BT033_admin_user_management_delete_user_cascade(self):
        headers = self.get_auth_header(self.admin_token)
        
        email = get_unique_email()
        rm = requests.get(f"{BASE_URL}/api/admin/managers", headers=headers, timeout=5.0)
        mgr_id = rm.json()[0].get("id")
        rc = requests.post(f"{BASE_URL}/api/admin/create-agent", json={
            "name": "Cascade Target Agent",
            "email": email,
            "password": "password123",
            "managerId": mgr_id
        }, headers=headers, timeout=5.0)
        agent_id = rc.json().get("id")
        agent_token = self.get_token(email, "password123")
        agent_headers = self.get_auth_header(agent_token)
        
        c_payload = {
            "businessName": "Cascade Customer",
            "ownerName": "John Cascade",
            "businessPhone": "07123456789",
            "businessAddress": "Cascade St",
            "postcode": get_unique_postcode(),
            "utilityType": "electricity"
        }
        rc_cust = requests.post(f"{BASE_URL}/api/customers", json=c_payload, headers=agent_headers, timeout=5.0)
        self.assertEqual(rc_cust.status_code, 200, rc_cust.text)
        c_id = rc_cust.json().get("id")
        
        cb_time = (datetime.now() + timedelta(days=2)).isoformat()
        requests.post(f"{BASE_URL}/api/callbacks", json={
            "customerId": c_id,
            "scheduledDateTime": cb_time,
            "notes": "Cascade callback"
        }, headers=agent_headers, timeout=5.0)
        
        rd = requests.delete(f"{BASE_URL}/api/admin/user/{agent_id}", headers=headers, timeout=5.0)
        self.assertEqual(rd.status_code, 200, rd.text)
        
        ru = requests.get(f"{BASE_URL}/api/admin/users", headers=headers, timeout=5.0)
        self.assertNotIn(agent_id, [u.get("id") for u in ru.json()])

    def test_BT034_admin_user_management_assign_agent_to_manager(self):
        headers = self.get_auth_header(self.admin_token)
        ru = requests.get(f"{BASE_URL}/api/admin/users", headers=headers, timeout=5.0)
        usman_id = None
        for u in ru.json():
            if u.get("name") == "Usman":
                usman_id = u.get("id")
                break
        self.assertIsNotNone(usman_id)
        
        mgrs = requests.get(f"{BASE_URL}/api/admin/managers", headers=headers, timeout=5.0)
        zara_id = None
        for m in mgrs.json():
            if m.get("name") == "Zara":
                zara_id = m.get("id")
                break
        self.assertIsNotNone(zara_id)
        
        ra = requests.patch(f"{BASE_URL}/api/admin/assign-agent", json={
            "agentId": usman_id,
            "managerId": zara_id
        }, headers=headers, timeout=5.0)
        self.assertEqual(ra.status_code, 200, ra.text)
        
        ru2 = requests.get(f"{BASE_URL}/api/admin/users", headers=headers, timeout=5.0)
        for u in ru2.json():
            if u.get("id") == usman_id:
                self.assertEqual(u.get("managerId"), zara_id)
                break

    # ==========================================
    # DATA VALIDATION (BT029-BT030)
    # ==========================================

    def test_BT029_callback_scheduling_date_validation(self):
        headers = self.get_auth_header(self.agent_token)
        c_payload = {
            "businessName": f"Past Date Cust {rand_string()}",
            "ownerName": "John Past",
            "businessPhone": "07123456789",
            "businessAddress": "Past St",
            "postcode": get_unique_postcode(),
            "utilityType": "electricity"
        }
        rc = requests.post(f"{BASE_URL}/api/customers", json=c_payload, headers=headers, timeout=5.0)
        c_id = rc.json().get("id")
        
        past_time = (datetime.now() - timedelta(days=2)).isoformat()
        r = requests.post(f"{BASE_URL}/api/callbacks", json={
            "customerId": c_id,
            "scheduledDateTime": past_time,
            "notes": "Past schedule"
        }, headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 400)

    def test_BT030_customer_email_validation_format_check(self):
        headers = self.get_auth_header(self.agent_token)
        c_payload = {
            "businessName": "Bad Email Cust",
            "ownerName": "John Bad",
            "businessPhone": "07123456789",
            "businessAddress": "Bad St",
            "postcode": get_unique_postcode(),
            "utilityType": "electricity",
            "email": "invalid-email-format"
        }
        r = requests.post(f"{BASE_URL}/api/customers", json=c_payload, headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 400)

    # ==========================================
    # SECURITY & ACCESS CONTROL (BT025-BT028)
    # ==========================================

    def test_BT025_sql_injection_protection_middleware(self):
        headers = self.get_auth_header(self.agent_token)
        payload = {
            "businessName": "SELECT * FROM users; --",
            "ownerName": "SQL Injector",
            "businessPhone": "07123456789",
            "businessAddress": "Inject Rd",
            "postcode": get_unique_postcode(),
            "utilityType": "electricity"
        }
        r = requests.post(f"{BASE_URL}/api/customers", json=payload, headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 400)

    def test_BT026_jwt_token_expiration_access_denied(self):
        headers = {"Authorization": "Bearer invalid_or_expired_token_123456"}
        r = requests.get(f"{BASE_URL}/api/customers", headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 401)

    def test_BT027_rbac_agent_cannot_access_admin_panel(self):
        headers = self.get_auth_header(self.agent_token)
        r = requests.get(f"{BASE_URL}/api/admin/users", headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 403)

    def test_BT028_cors_policy_cross_origin_requests(self):
        headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"
        }
        r = requests.options(f"{BASE_URL}/api/auth/login", headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 200)
        self.assertIn("Access-Control-Allow-Origin", r.headers)
        self.assertEqual(r.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173")

    def test_BT033_customer_duplication_prevented_by_postcode(self):
        headers_agent = self.get_auth_header(self.agent_token)
        headers_other = self.get_auth_header(self.other_agent_token)
        postcode = get_unique_postcode()
        
        # Agent A registers customer with postcode
        c_payload1 = {
            "businessName": f"Agent A Cust {rand_string()}",
            "ownerName": "Agent A Owner",
            "businessPhone": "07111111111",
            "businessAddress": "Agent A St",
            "postcode": postcode,
            "utilityType": "electricity"
        }
        r1 = requests.post(f"{BASE_URL}/api/customers", json=c_payload1, headers=headers_agent, timeout=5.0)
        self.assertEqual(r1.status_code, 200, r1.text)
        
        # Agent B (other agent) attempts to register customer with same postcode
        c_payload2 = {
            "businessName": f"Agent B Cust {rand_string()}",
            "ownerName": "Agent B Owner",
            "businessPhone": "07222222222",
            "businessAddress": "Agent B St",
            "postcode": postcode,
            "utilityType": "gas"
        }
        r2 = requests.post(f"{BASE_URL}/api/customers", json=c_payload2, headers=headers_other, timeout=5.0)
        self.assertEqual(r2.status_code, 400, r2.text)
        self.assertIn("belongs to agent", r2.json().get("detail", ""))

    def test_BT034_loan_payback_system(self):
        # 1. Agent requests a loan
        headers_agent = self.get_auth_header(self.agent_token)
        headers_admin = self.get_auth_header(self.admin_token)
        
        l_payload = {
            "amount": 10000.0,
            "reason": "Need money for home renovation"
        }
        r = requests.post(f"{BASE_URL}/api/loans", json=l_payload, headers=headers_agent, timeout=5.0)
        self.assertEqual(r.status_code, 200, r.text)
        loan = r.json()
        loan_id = loan.get("id")
        self.assertEqual(loan.get("amount"), 10000.0)
        self.assertEqual(loan.get("paidAmount"), 0.0)
        self.assertEqual(loan.get("status"), "pending")
        
        # 2. Admin approves the loan
        r_approve = requests.put(f"{BASE_URL}/api/loans/{loan_id}/review", json={
            "status": "approved",
            "admin_notes": "Approved by manager request"
        }, headers=headers_admin, timeout=5.0)
        self.assertEqual(r_approve.status_code, 200, r_approve.text)
        self.assertEqual(r_approve.json().get("status"), "approved")
        
        # 3. Admin records a payback
        r_payback = requests.put(f"{BASE_URL}/api/loans/{loan_id}/payback", json={
            "payback_amount": 4000.0,
            "admin_notes": "Cash payment received"
        }, headers=headers_admin, timeout=5.0)
        self.assertEqual(r_payback.status_code, 200, r_payback.text)
        updated_loan = r_payback.json()
        self.assertEqual(updated_loan.get("paidAmount"), 4000.0)
        
        # 4. Try paying back more than the remaining balance (remaining = 6000)
        r_fail = requests.put(f"{BASE_URL}/api/loans/{loan_id}/payback", json={
            "payback_amount": 7000.0
        }, headers=headers_admin, timeout=5.0)
        self.assertEqual(r_fail.status_code, 400)
        
        # 5. Admin records remaining payback
        r_payback2 = requests.put(f"{BASE_URL}/api/loans/{loan_id}/payback", json={
            "payback_amount": 6000.0
        }, headers=headers_admin, timeout=5.0)
        self.assertEqual(r_payback2.status_code, 200, r_payback2.text)
        self.assertEqual(r_payback2.json().get("paidAmount"), 10000.0)

    def test_BT036_admin_create_loan_for_agent(self):
        # 1. Admin login
        headers_admin = self.get_auth_header(self.admin_token)
        
        # 2. Get manager ID and Create agent
        rm = requests.get(f"{BASE_URL}/api/admin/managers", headers=headers_admin, timeout=5.0)
        self.assertEqual(rm.status_code, 200)
        mgr_id = rm.json()[0].get("id")
        
        agent_email = get_unique_email()
        r_agent = requests.post(f"{BASE_URL}/api/admin/create-agent", json={
            "name": "Loan Agent",
            "email": agent_email,
            "password": "Password123",
            "managerId": mgr_id
        }, headers=headers_admin, timeout=5.0)
        self.assertEqual(r_agent.status_code, 201, r_agent.text)
        agent_id = r_agent.json().get("id")
        
        # 3. Admin creates loan for the agent
        r_loan = requests.post(f"{BASE_URL}/api/loans", json={
            "amount": 15000.0,
            "reason": "Admin initiated advance",
            "userId": agent_id
        }, headers=headers_admin, timeout=5.0)
        self.assertEqual(r_loan.status_code, 200, r_loan.text)
        
        loan_data = r_loan.json()
        self.assertEqual(loan_data.get("userId"), agent_id)
        self.assertEqual(loan_data.get("amount"), 15000.0)
        self.assertEqual(loan_data.get("status"), "approved")
        self.assertEqual(loan_data.get("adminNotes"), "Created directly by admin")

    def test_BT037_mobile_checkin_blocked(self):
        headers = self.get_auth_header(self.agent_token)
        headers["User-Agent"] = "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        r = requests.post(f"{BASE_URL}/api/attendance/check-in", json={"checkin_reason": "Mobile test"}, headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 400)
        self.assertIn("Mobile devices are not allowed use office wifi/pc", r.json().get("detail", ""))

    def test_BT038_mobile_checkout_blocked(self):
        headers = self.get_auth_header(self.agent_token)
        headers["User-Agent"] = "Mozilla/5.0 (Linux; Android 10; SM-A505F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
        r = requests.post(f"{BASE_URL}/api/attendance/check-out", json={"checkout_reason": "Mobile test"}, headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 400)
        self.assertIn("Mobile devices are not allowed use office wifi/pc", r.json().get("detail", ""))

    def test_BT039_manager_mobile_checkin_blocked(self):
        headers = self.get_auth_header(self.manager_token)
        headers["User-Agent"] = "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        r = requests.post(f"{BASE_URL}/api/attendance/check-in", json={"checkin_reason": "Manager Mobile test"}, headers=headers, timeout=5.0)
        self.assertEqual(r.status_code, 400)
        self.assertIn("Mobile devices are not allowed use office wifi/pc", r.json().get("detail", ""))

    # ==========================================
    # RATE LIMITING (BT024) - Executed LAST to avoid blocking and limiting other tests!
    # ==========================================
    
    def test_zz_BT024_rate_limiting_api_throttling(self):
        headers = self.get_auth_header(self.agent_token)
        throttled = False
        for i in range(400):
            try:
                r = requests.get(f"{BASE_URL}/api/customers", headers=headers, timeout=1.0)
                if r.status_code == 429:
                    throttled = True
                    break
            except requests.exceptions.RequestException:
                pass
        self.assertTrue(throttled, "Rate limiter did not throttle the requests")

if __name__ == "__main__":
    unittest.main()
