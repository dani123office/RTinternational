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

## Verification
1. Push to GitHub → Vercel auto-deploys
2. Check `https://rt-international.vercel.app/` for frontend (should load SPA)
3. Check `https://rt-international.vercel.app/api/auth/users` (should 401 with JSON body, not 500)
