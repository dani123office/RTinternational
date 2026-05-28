# AGENTS.md — RT International Call Center API

## Goal
Fix 500 errors (local and Vercel) in the RT International call center FastAPI application.

## Constraints & Preferences
- Fix both local backend errors and Vercel serverless deployment errors.
- Mirror changes across `CallCenterAPI_FastAPI/` and `backend-api/CallCenterAPI_FastAPI/` when needed.

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
16. **Fixed SSL connection to Neon database** — since we stripped `sslmode=require` query parameters from the connection URL (due to pg8000 connect parameter incompatibility), pg8000 was defaulting to insecure connections. Remote postgres databases like Neon reject unencrypted connections, crashing the app at startup with `FUNCTION_INVOCATION_FAILED`. Added auto-detection for remote postgres URLs to pass `ssl: True` in `connect_args` instead.
17. **Fixed `NameError: name 'CallbackOfferedElectricityRateCreate' is not defined`** — moved `CallbackOfferedElectricityRateCreate` and `CallbackOfferedGasRateCreate` schema declarations above `ManagerCallbackCreate` in both copies of `schemas.py` and removed the quotes from their usage in `ManagerCallbackCreate`.

18. **Re-fixed NameError — Pydantic v2 doesn't respect string forward references** — Commit `080ad10` used string forward references (`Optional[List['ClassName']]`), but Pydantic v2 on Vercel still tries to resolve them eagerly. Reordered the class definitions so the rate classes physically appear before `ManagerCallbackCreate` in both `schemas.py` copies. String quotes removed.

## Root Causes (continued)
- **400 on PUT /api/callbacks/{id}**: `CallBackUpdate` schema (used for `update_callback` PUT endpoint) was missing `accountNumber`, `mpan`, `mprn`, `msn` fields that the PUT handler accessed via `dto.accountNumber` etc. Pydantic v2 raises `AttributeError` on undeclared field access, caught by `except Exception` and returned as 400. `CallBackCreate` (used for POST) already had these fields — `CallBackUpdate` was simply incomplete. → Fixed by adding the four fields to `CallBackUpdate`.
- **Generic 500 / uninformative delete error**: When customer deletion failed due to database constraints (foreign keys like linked callbacks/transfers/sales), the raw Exception bubbled up to the generic exception handler, returning a generic 500 "Something went wrong" message. Additionally, frontend try-catch blocks discarded the caught error objects and displayed generic "Failed to delete" alerts. → Fixed by catching exceptions on delete_customer in python to return detailed 400 errors, and extracting error details on frontend hooks to show in toasts.
- **Additional meter details not saving on callback creation**: When creating a callback with meter details for a business whose postcode already exists in the database, the backend `create_customer` router method returned the existing customer profile directly without updating its fields or inserting the newly supplied meter details. → Fixed by updating the customer details and deleting/recreating their meters in-place when a postcode match is found.
- **Additional meter details (MPAN, MPRN, MSN, Account Number) not saving on callback creation**: The frontend sent `accountNumber`, `mpan`, `mprn`, and `msn` in the payload on callback creation, but the `CallBackCreate` and `ManagerCallbackCreate` schemas did not define these fields (so Pydantic dropped them). Furthermore, the backend POST endpoints did not read or save them. → Fixed by updating the schemas and backend creation routes.
- **Vercel 500 (FUNCTION_INVOCATION_FAILED) after parameter stripping**: Stripping URL query parameters (like `sslmode=require`) caused pg8000 to attempt an unencrypted connection to Neon. Neon immediately rejected it, causing a startup crash. → Fixed by auto-detecting remote postgres hosts and adding `ssl: True` via `connect_args`.
- **NameError: name 'CallbackOfferedElectricityRateCreate' is not defined**: When importing `api/index.py` (which imports `CallCenterAPI_FastAPI.main`), Python loaded `schemas.py` and encountered `CallbackOfferedElectricityRateCreate` reference in class annotations of `ManagerCallbackCreate` before that type was defined in the module. While string annotations can postpone type reference lookup under certain conditions, in standard python execution it caused immediate NameError. → Fixed by reordering the class definitions so that all referenced classes are declared beforehand.

## Verification
1. Push to GitHub → Vercel auto-deploys
2. Check `https://rt-international.vercel.app/` for frontend (should load SPA)
3. Check `https://rt-international.vercel.app/api/auth/users` (should 401 with JSON body, not 500)


