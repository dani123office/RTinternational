# AGENTS.md — RT International Call Center API

## Goal
Fix 500 errors (local and Vercel) in the RT International call center FastAPI application.

## Constraints & Preferences
- Fix both local backend errors and Vercel serverless deployment errors.

## Key Context
- **GitHub repo**: `github.com/dani123office/RTinternational` (master branch)
- **Frontend URL**: `https://rt-international.vercel.app`
- **API URL**: `https://rt-international.vercel.app/api/...` (unified deployment — frontend makes relative `/api/...` requests with `baseURL: ''`)
- **Old separate API URL**: `https://rt-international-api.vercel.app` (no longer used)

## Completed Changes

### ← PREVIOUS SESSION (590a4d8)

1. **Removed `from_attributes = True`** from all 14 Pydantic schemas (schemas.py + routers/profile.py) in both `CallCenterAPI_FastAPI/` and `backend-api/CallCenterAPI_FastAPI/`. Root cause of `PydanticSerializationError` — `_sa_instance_state` leaked into serialization.

2. **Tightened SQL injection regex** in `middleware/security.py` (both copies): hex literal minimum 8→16 chars; added `;\s*|'\s*` prefix to ISNULL/COALESCE/CASE/DECLARE pattern to stop false-positive 400 blocks.

3. **Removed `slowapi==0.1.9`** from all `requirements.txt` files. The code uses a custom in-memory rate limiter instead.

### ← THIS SESSION (1a8d498)

4. **Unified deployment** — created `api/index.py` as Vercel serverless entry point (`from CallCenterAPI_FastAPI.main import app`). Updated `vercel.json` to route `/api/(.*)` → Python serverless function, `/(.*)` → SPA. Removed `[tool.vercel]` from `pyproject.toml`. Now API and frontend live on the same domain.

5. **pg8000 everywhere** — replaced `psycopg2-binary` with `pg8000` in `pyproject.toml` and `requirements.txt`. Updated both `database.py` files to always use `postgresql+pg8000://` driver on any `postgresql://` URL (no more Vercel conditional). pg8000 is pure Python and works in Vercel's serverless environment.

6. **Removed `slowapi` from pyproject.toml** — now only in requirements.txt deps.

## Root Causes

- **Vercel 500 (FUNCTION_INVOCATION_FAILED)**: `database.py` defaulted to `+psycopg2` driver, but `pg8000` was in requirements. psycopg2-binary native extensions fail in Vercel's serverless environment. → Fixed by always using `+pg8000`.

- **Local 500 (PydanticSerializationError)**: `from_attributes = True` on all schemas allowed Pydantic to interpret SQLAlchemy ORM instances as attribute sources, exposing `_sa_instance_state` (`InstanceState` object) during serialization. → Fixed by removing `from_attributes = True`.

- **400 false positives from security middleware**: Overly broad SQL injection patterns matched legitimate business text (e.g., "CASE WHEN" in notes, short hex strings in data). → Fixed by tightening regex patterns.

## Completed (this session)
7. **Verified `POSTGRES_URL`** — already configured on `rt-international` Vercel project via Neon integration (same database as old `rt-international-api`).
8. **Deleted old `rt-international-api`** Vercel project (no longer needed after unified deployment).
9. **Fixed `TypeError: connect() got an unexpected keyword argument 'channel_binding'`** — two-part fix:
   - Loosened pg8000 pin from `==1.31.2` to `>=1.31.2,<2.0` so Vercel can resolve a compatible version.
   - Added URL query-param filtering in `database.py` to strip unrecognized params (`channel_binding`, etc.) that pg8000 may not support, preventing them from being passed as kwargs to `connect()`.
10. **Fixed 405 on `/api/auth/login`** — Added `rewrites` to `vercel.json` to route all traffic through Python function.
11. **Fixed `sslmode` TypeError** — Stripped all URL query params from DATABASE_URL, since pg8000 doesn't accept any as `connect()` kwargs.
12. **Fixed 400 on `PUT /api/callbacks/{id}`** — `CallBackUpdate` schema was missing `accountNumber`, `mpan`, `mprn`, `msn` fields that the PUT handler accesses on the DTO object. Pydantic v2 raises `AttributeError` when accessing undeclared fields, caught by the generic `except Exception` and returned as 400. Added the missing fields to `CallBackUpdate` in both `schemas.py` copies.
13. **Fixed delete error reporting** — caught database exceptions on backend deletion of customers to return a clear 400 Bad Request error detail (e.g. for foreign key constraints) rather than a generic 500 error. Updated frontend hooks (`useCustomerDetail`, `useCallbackDetail`, `useSaleDetail`, `useTransferDetail`, `useManagerCallbackDetail`) to capture and display the actual backend error details in toast notifications instead of a generic failure message.
14. **Fixed saving additional meter details on callback creation** — updated backend `create_customer` route to update the existing customer's basic info and replace/add their meter details if a customer with the same postcode already exists, instead of returning the existing record unchanged and discarding the new details.
15. **Fixed additional meter details (MPAN, MPRN, MSN, Account Number) not saving on callback creation** — added the missing `accountNumber`, `mpan`, `mprn`, and `msn` fields (and offered rates for managers) to `CallBackCreate` and `ManagerCallbackCreate` schemas, and updated backend `create_callback` and `create_manager_callback` routers to save these fields into the callback record on creation. Used string forward references in `ManagerCallbackCreate` to prevent `NameError` due to declaration order.
16. **Fixed SSL connection to Neon database** — since we stripped `sslmode=require` query parameters from the connection URL (due to pg8000 connect parameter incompatibility), pg8000 was defaulting to insecure connections. Remote postgres databases like Neon reject unencrypted connections, crashing the app with `InterfaceError`. Added auto-detection for remote postgres URLs to pass `ssl_context` (configured to bypass hostname check/validation for serverless endpoints) in `connect_args` instead.
17. **Fixed `NameError: name 'CallbackOfferedElectricityRateCreate' is not defined`** — moved `CallbackOfferedElectricityRateCreate` and `CallbackOfferedGasRateCreate` schema declarations above `ManagerCallbackCreate` in both copies of `schemas.py` and removed the quotes from their usage in `ManagerCallbackCreate`.
18. **Fixed local 500 database connection errors** — updated `database.py` in both `CallCenterAPI_FastAPI/` and `backend-api/CallCenterAPI_FastAPI/` directories to default to the local SQLite database (`sqlite:///CallCenterAPI_FastAPI/callcenter.db`) instead of postgresql if no database environment variable (`POSTGRES_URL` or `DATABASE_URL`) is defined in the environment. This resolves local startup and execution crashes.
19. **Loosened strict dependency pins for Python 3.14 compatibility** — replaced strict `==` pins with `>=` minimum constraints in `requirements.txt`, `CallCenterAPI_FastAPI/requirements.txt`, and `pyproject.toml`. This avoids compile-from-source build errors for Pydantic/FastAPI on environments running Python 3.14.
20. **Added Edit Sale support** — configured `/sales/:id/edit` routing, added the "Edit Sale" button to the `/sales/:id` detail page footer, and updated `SaleApplication.jsx` to support loading a sale's details and sending updates on submission.
21. **Fixed manager-side additional meter details visibility** — corrected `accountDetails` extraction in `ManagerCallbackDetail.jsx` to read `accountNumber`, `mpan`, `mprn`, and `msn` fields directly from the callback object before falling back to linked transfer references.
22. **Added Reschedule Callback support on Sale details** — enabled a "Reschedule Callback" action button in the actions section of `SaleDetail.jsx` when there is a linked callback. A user-friendly date and time dialog lets agents or managers modify the callback's scheduled date/time and updates the database instantly.

## Root Causes (continued)
- **Lack of sale editing interface**: Previously, sales could only be deleted or their progression status modified, but there was no way to edit customer, transfer, or sale info fields once submitted. → Fixed by updating routing, details view, and modifying the form component to support full edit cycles.
- **400 on PUT /api/callbacks/{id}**: `CallBackUpdate` schema (used for `update_callback` PUT endpoint) was missing `accountNumber`, `mpan`, `mprn`, `msn` fields that the PUT handler accessed via `dto.accountNumber` etc. Pydantic v2 raises `AttributeError` on undeclared field access, caught by `except Exception` and returned as 400. `CallBackCreate` (used for POST) already had these fields — `CallBackUpdate` was simply incomplete. → Fixed by adding the four fields to `CallBackUpdate`.
- **Generic 500 / uninformative delete error**: When customer deletion failed due to database constraints (foreign keys like linked callbacks/transfers/sales), the raw Exception bubbled up to the generic exception handler, returning a generic 500 "Something went wrong" message. Additionally, frontend try-catch blocks discarded the caught error objects and displayed generic "Failed to delete" alerts. → Fixed by catching exceptions on delete_customer in python to return detailed 400 errors, and extracting error details on frontend hooks to show in toasts.
- **Additional meter details not saving on callback creation**: When creating a callback with meter details for a business whose postcode already exists in the database, the backend `create_customer` router method returned the existing customer profile directly without updating its fields or inserting the newly supplied meter details. → Fixed by updating the customer details and deleting/recreating their meters in-place when a postcode match is found.
- **Additional meter details (MPAN, MPRN, MSN, Account Number) not saving on callback creation**: The frontend sent `accountNumber`, `mpan`, `mprn`, and `msn` in the payload on callback creation, but the `CallBackCreate` and `ManagerCallbackCreate` schemas did not define these fields (so Pydantic dropped them). Furthermore, the backend POST endpoints did not read or save them. → Fixed by updating the schemas and backend creation routes.
- **Vercel 500 (FUNCTION_INVOCATION_FAILED) after parameter stripping / pg8000 SSL issues**: Stripping URL query parameters (like `sslmode=require`) caused pg8000 to attempt an unencrypted connection to Neon. Neon immediately rejected it, causing a startup crash. Furthermore, passing `ssl: True` in `connect_args` threw `TypeError: connect() got an unexpected keyword argument 'ssl'` because `pg8000` requires `ssl_context` in its connect parameters. → Fixed by auto-detecting remote postgres hosts and passing a configured `ssl_context` via `connect_args`.
- **NameError: name 'CallbackOfferedElectricityRateCreate' is not defined**: When importing `api/index.py` (which imports `CallCenterAPI_FastAPI.main`), Python loaded `schemas.py` and encountered `CallbackOfferedElectricityRateCreate` reference in class annotations of `ManagerCallbackCreate` before that type was defined in the module. While string annotations can postpone type reference lookup under certain conditions, in standard python execution it caused immediate NameError. → Fixed by reordering the class definitions so that all referenced classes are declared beforehand.
- **Local 500 errors on API requests**:
  1. Missing dependencies (`pg8000`, `openai`) in the local python setup caused uvicorn startup failure.
  2. The local database default was configured to connect to PostgreSQL at `localhost:5432` by default. When uvicorn ran and tried to initialize the default admin/manager users, it failed with a connection error because no postgres instance was running at localhost, causing the application to crash at startup.
  → Fixed by installing dependencies and changing default local database configuration to fall back to the existing SQLite `callcenter.db`.

### ← THIS SESSION (project audit & fixes)

23. **Added activity logging across all routers** — `log_activity()` in `utils/logger.py` was defined but never called. Added `log_activity` calls after every create/update/delete operation in all 10 router files (auth, callbacks, customers, transfers, sales, manager, admin, attendance, leaves, profile) in both `CallCenterAPI_FastAPI/` and `backend-api/CallCenterAPI_FastAPI/`. The `activity_logs` table is now populated in real-time.

24. **Updated README.md** — replaced outdated Flutter template with actual project description covering tech stack, features, quick start, and deployment.

25. **Removed dead `psycopg2-binary` dependency** from `CallCenterAPI_FastAPI/requirements.txt` (pg8000 is the active driver).

26. **Loosened strict `==` pins to `>=`** in `backend-api/requirements.txt` and `backend-api/CallCenterAPI_FastAPI/requirements.txt` to match the main copy and avoid resolution failures.

27. **Added Docker support** — `Dockerfile` (Python 3.12-slim) and `docker-compose.yml` (api + frontend services).

28. **Added CI/CD pipeline** — `.github/workflows/ci.yml` runs backend lint (Python compile check), backend tests (testsprite), and frontend lint on push/PR to master.

29. **Cleaned up useless files** — removed 23 debug/parse scripts from root, 19 test/utility scripts from `CallCenterAPI_FastAPI/`, abandoned `frontend/my-crm/` directory, `callcenter.db` from git tracking, `__pycache__/` dirs, and the stale `backend-api/` mirror. Project is now lean.

30. **Fixed salary slip PDF generator** — rewrote `_SalaryPDF.build_slip()` to a 3-column Salary Component table format (Salary Component | Amount/Value | Percentage Notes, right column unbordered). Commission now shows actual value (Rs. 0 when none) instead of "If any". Commission excluded from `daily_rate` deduction calculation (base = basic+hra+utility+conveyance only). NET SALARY card shows full gross without deductions. Fixed divider line position above bold rows (`ey/dy + row_h - 2`) with 20pt gap (`y -= 30`) between divider and first row. Added missing `_fmt` import in `admin.py` to fix 500 on `/api/admin/salary/slip/{user_id}`.

31. **Simplified admin dashboard** — AdminDashboard now shows only top 3 agents via `.slice(0, 3)`.

32. **Simplified ManagerAttendance.jsx** — replaced complex multi-view layout with clean single-table team attendance view. Added stats bar (Present/Late/Absent), status column, check-in/check-out reason columns.

33. **Added agent attendance history modal** — clicking any row in ManagerAttendance opens a modal showing the agent's name/email and paginated attendance history table with date, check-in, check-out, status, and reason columns. Fetched via `endpoints.attendance.agentHistory(id)`. Modal includes close button, backdrop blur, and pagination controls.

34. **Merged Staff Management page** — `/admin/managers` and `/admin/agents` merged into single `/admin/staff` with Managers + Agents tabs. Sidebar updated to single "Staff Management" entry with redirects from old routes.

35. **Prevented duplicate customer registrations by postcode** — added a postcode duplicate validation check to `create_customer` inside `routers/customers.py`. If a customer with the same postcode already exists, it verifies that the current user owns it (or is their manager/admin); otherwise, it raises an HTTP 400 Bad Request error `This customer belongs to agent: {creator_name}`. Added corresponding automated tests in `testsprite_tests/run_backend_tests.py`.

36. **Whitelisted custom duplicate error prefix** — added `'This customer belongs to'` to the `safe_prefixes` list in the exception details sanitizer in `main.py`. This prevents the middleware from rewriting the duplicate customer message to a generic error message due to the presence of a colon.

37. **Fixed SQLite activity_logs autoincrement issue** — changed `ActivityLog.id` type from `BigInteger` to `Integer` in `models.py` and recreated the table in the git-tracked `callcenter.db`. Also populated email verification records for the default test users to allow login on clean checkouts.

38. **Added Agent Auto-Dialer** — Created a dedicated 'Auto Dialer' page for agents to upload and run call campaigns from CSV/TXT lists. Integrated dial triggering via `tel:` protocol (initiating calls in Vonage Business Communications desktop app), added queue and history tabs, persisted state in `localStorage` across refreshes, and integrated pre-fill redirects to Callback, Transfer, and Sale forms.

39. **Multi-Campaign Support in Auto-Dialer** — Redesigned the `AutoDialer.jsx` campaign flow from a single active campaign to a multi-campaign dashboard model. Agents can now upload multiple CSV/TXT files, each creating a campaign card showing creation time, live progress bar, remaining leads count, and delete actions. Clicking a campaign card switches the active dialer to that campaign, with a 'Back to Dashboard' button allowing agents to switch between different campaigns on the fly. Progress and campaigns are fully persisted in `localStorage`.

## Root Causes (continued)
- **Activity logging never worked**: `log_activity()` function was defined in `utils/logger.py` but never imported or called from any router. Activity logs table was always empty. No audit trail existed despite the schema being fully set up. → Fixed by adding `log_activity()` calls after all create/update/delete endpoints across all 10 routers.
- **No containerized development**: No Dockerfile or docker-compose.yml existed, making it harder for new developers to set up a consistent local environment. → Fixed by adding Dockerfile (Python 3.12-slim) and docker-compose.yml (API + frontend).
- **No CI/CD automation**: Tests were never run automatically on push, allowing regressions to go undetected until manual testing. → Fixed by adding a GitHub Actions workflow that runs lint + tests on push/PR.
- **Salary slip PDF had incorrect layout**: Commission showed "If any" instead of actual value, daily deduction rate incorrectly included commission, NET SALARY showed gross minus deductions instead of full gross, divider lines were positioned below bold rows instead of above them, and there was no gap between section divider and first data row. → Fixed by rewriting `build_slip()` with proper 3-column table, correct commission handling, and proper divider positioning.
- **No agent attendance history view**: Managers/admin could see today's attendance but had no way to view an agent's historical attendance records. → Fixed by adding a clickable row that opens a modal with paginated attendance history via `endpoints.attendance.agentHistory(id)`.
- **Customer duplication by postcode allowed**: Previously, if two different agents entered a customer with the same postcode, the backend would simply update the existing customer profile and return it without warning, causing agent conflict and data leakage. → Fixed by raising a 400 Bad Request if the existing postcode customer belongs to another agent.
- **Duplicate postcode error sanitized**: The exception details sanitizer rewrote the validation error `This customer belongs to agent: name` to a generic error `We could not complete your request` because it contained a colon and was not in the `safe_prefixes` whitelist. → Fixed by adding it to `safe_prefixes`.
- **IntegrityError on activity logging (SQLite)**: SQLite does not auto-increment columns defined as `BIGINT PRIMARY KEY`, causing `NOT NULL constraint failed: activity_logs.id` on server database insertions. → Fixed by changing datatype to `Integer` and dropping the old table so uvicorn can recreate it with standard autoincrement.
- **Lack of auto-dialer for notepad/excel sheets**: Previously, agents had to manually type phone numbers from spreadsheets or notepad into Vonage to dial them. → Fixed by building a client-side Auto-Dialer campaign queue workspace with Vonage 'tel:' protocol execution and pre-fill redirects.

## Verification
1. Push to GitHub → Vercel auto-deploys
2. Check `https://rt-international.vercel.app/` for frontend (should load SPA)
3. Check `https://rt-international.vercel.app/api/auth/users` (should 401 with JSON body, not 500)
4. Check `https://rt-international.vercel.app/api/admin/audit-log` (should show activity entries, not empty array)
5. GitHub Actions CI should run on push (`.github/workflows/ci.yml`) and verify `test_BT033_customer_duplication_prevented_by_postcode` passes.
