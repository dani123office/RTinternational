import os
import socket
import re
from datetime import datetime
import bcrypt
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from collections import defaultdict
import time
from starlette.middleware.base import BaseHTTPMiddleware
from .database import engine, SessionLocal, Base
from .models import User, Customer, CallBack, Transfer, Sale, ElectricityMeter, GasMeter
from .routers import auth, customers, callbacks, transfers, sales, manager, admin, ai_router, profile
from .middleware.security import SQLInjectionMiddleware

app = FastAPI(title="RT International API")

# ─── Custom rate limiter (avoids slowapi/Starlette 1.0 incompatibility) ────────

class InMemoryRateLimiter:
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._buckets: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        bucket = self._buckets[key]
        while bucket and bucket[0] < cutoff:
            bucket.pop(0)
        if len(bucket) >= self.max_requests:
            return False
        bucket.append(now)
        return True


_rate_limiter = InMemoryRateLimiter(max_requests=300, window_seconds=60)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        if not _rate_limiter.check(client_ip):
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again later."}
            )
        return await call_next(request)


def _humanize_field(loc):
    if not loc:
        return 'Field'
    field = loc[-1]
    field = re.sub(r'(?<!^)(?=[A-Z])', ' ', str(field)).replace('_', ' ').strip()
    return field.title()


def _translate_validation_error(err):
    loc = err.get('loc', [])
    field_name = _humanize_field(loc[1:] if len(loc) > 1 and loc[0] in ('body', 'query', 'path') else loc)
    msg = err.get('msg', '')
    err_type = err.get('type', '')

    if err_type == 'value_error.missing' or msg == 'field required':
        return f'{field_name} is required.'
    if 'ensure this value has at most' in msg:
        match = re.search(r'ensure this value has at most (\d+) characters', msg)
        if match:
            return f'{field_name} can be at most {match.group(1)} characters long.'
    if 'ensure this value has at least' in msg:
        match = re.search(r'ensure this value has at least (\d+) characters', msg)
        if match:
            return f'{field_name} must be at least {match.group(1)} characters long.'
    if err_type.startswith('type_error'):
        if 'integer' in err_type:
            return f'{field_name} must be a whole number.'
        if 'float' in err_type or 'number' in err_type:
            return f'{field_name} must be a number.'
    if err_type == 'value_error.date' or 'datetime' in msg:
        return f'{field_name} must be a valid date or time.'
    if msg == 'none is not an allowed value':
        return f'{field_name} cannot be empty.'
    return msg or 'Validation error.'


def _clean_http_exception_detail(detail, status_code):
    if isinstance(detail, str):
        normalized = detail.strip().replace('\n', ' ')
        if not normalized:
            return 'An error occurred.'

        safe_prefixes = [
            'Not authorized',
            'Not authenticated',
            'Invalid auth scheme',
            'Invalid token',
            'Invalid token type',
            'Token expired',
            'Account is inactive',
            'Email already exists',
            'User not found',
            'Customer not found',
            'Callback not found',
            'Transfer not found',
            'Sale not found',
            'Agent not found',
            'Manager not found',
            'Only agents can be assigned',
            'Cannot delete admin account',
            'Cannot assign callback',
            'Cannot modify this',
            'A transfer already exists',
            'A sale already exists',
            'Current password is required',
            'Current password is incorrect',
            'New password must be at least',
            'Email already in use',
            'Invalid credentials',
            'Account is inactive',
        ]
        for prefix in safe_prefixes:
            if normalized.startswith(prefix):
                return normalized

        if len(normalized) < 80 and ':' not in normalized:
            return normalized

        if normalized.startswith('Failed to ') or normalized.startswith('Callback error:') or normalized.startswith('Database error') or normalized.startswith('IntegrityError'):
            if 'create' in normalized:
                return 'Unable to save this record. Please review the information and try again.'
            if 'update' in normalized:
                return 'Unable to save your changes. Please review the information and try again.'
            if 'delete' in normalized:
                return 'Unable to remove this item. Please try again.'
            if normalized.startswith('Callback error:'):
                return 'Unable to save callback details. Please check the form and try again.'
            return 'We could not complete your request. Please try again.'

        if ':' in normalized or len(normalized) > 120:
            return 'We could not complete your request. Please check the information and try again.'

        return normalized
    return detail


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    errors = exc.errors()
    if errors:
        error_msg = _translate_validation_error(errors[0])
    else:
        error_msg = 'Validation error.'
    return JSONResponse(
        status_code=400,
        content={"detail": error_msg}
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": _clean_http_exception_detail(exc.detail, exc.status_code)}
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    import traceback, sys
    traceback.print_exc(file=sys.stderr)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong. Please try again later."}
    )


RT_CORS = os.environ.get("RT_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
if os.environ.get("VERCEL"):
    RT_CORS.append("https://rt-international.vercel.app")
    RT_CORS.append("https://rt-international-*.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=RT_CORS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(SQLInjectionMiddleware)

app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(callbacks.router)
app.include_router(transfers.router)
app.include_router(sales.router)
app.include_router(manager.router)
app.include_router(admin.router)
app.include_router(ai_router.router)
app.include_router(profile.router)

import pathlib
from fastapi.responses import FileResponse

_STATIC_DIR = pathlib.Path(__file__).resolve().parent / "static"
_INDEX_HTML = _STATIC_DIR / "index.html"


@app.exception_handler(404)
async def spa_fallback(request, exc):
    path = request.url.path
    if path.startswith("/api/"):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    # Serve static asset files (JS, CSS, images, etc.)
    asset_path = _STATIC_DIR / path.lstrip("/")
    if asset_path.is_file():
        return FileResponse(str(asset_path))

    # SPA fallback: all non-API, non-asset routes go to index.html
    if _INDEX_HTML.is_file():
        return FileResponse(str(_INDEX_HTML))

    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=404, content={"detail": "Not found"})


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(User).first():
            def make_hash():
                return bcrypt.hashpw(b"password", bcrypt.gensalt()).decode("utf-8")

            admin_user = User(
                name="Admin User",
                email="admin@test.com",
                password_hash=make_hash(),
                role="admin",
                is_active=1,
            )
            db.add(admin_user)
            db.flush()

            manager = User(
                name="Sarah",
                email="manager@test.com",
                password_hash=make_hash(),
                role="manager",
                is_active=1,
            )
            db.add(manager)
            db.flush()

            manager2 = User(
                name="Zara",
                email="zara@test.com",
                password_hash=make_hash(),
                role="manager",
                is_active=1,
            )
            db.add(manager2)
            db.flush()

            agents = [
                User(name="Usman", email="usman@test.com", password_hash=make_hash(), role="agent", manager_id=manager.id, is_active=1),
                User(name="Danny", email="danny@test.com", password_hash=make_hash(), role="agent", manager_id=manager.id, is_active=1),
                User(name="Emily", email="emily@test.com", password_hash=make_hash(), role="agent", manager_id=manager.id, is_active=1),
                User(name="James", email="james@test.com", password_hash=make_hash(), role="agent", manager_id=manager2.id, is_active=1),
                User(name="Sophie", email="sophie@test.com", password_hash=make_hash(), role="agent", manager_id=manager2.id, is_active=1),
                User(name="Oliver", email="oliver@test.com", password_hash=make_hash(), role="agent", manager_id=manager2.id, is_active=1),
            ]
            db.add_all(agents)
            db.flush()

            now = datetime.now()
            for i, agent in enumerate(agents):
                for j in range(3 + (i % 3)):
                    unique_id = 1000 + i * 10 + j
                    customer = Customer(
                        created_by=agent.id,
                        business_name=f"Business {unique_id}",
                        owner_name=f"Owner {unique_id}",
                        business_phone="0123456789",
                        utility_type="electricity",
                        postcode="SW1A 1AA",
                    )
                    db.add(customer)
                    db.flush()
                    db.add(CallBack(
                        employee_id=agent.id,
                        customer_id=customer.id,
                        scheduled_datetime=now,
                        notes=f"Sample callback {j+1} for {agent.name}",
                        status="pending" if j < 2 else "done",
                    ))
                for j in range(2 + (i % 2)):
                    unique_id = 2000 + i * 10 + j
                    customer = Customer(
                        created_by=agent.id,
                        business_name=f"Business {unique_id}",
                        owner_name=f"Owner {unique_id}",
                        business_phone="0123456789",
                        utility_type="electricity",
                        postcode="SW1A 1AA",
                    )
                    db.add(customer)
                    db.flush()
                    db.add(Transfer(
                        employee_id=agent.id,
                        customer_id=customer.id,
                        utility_type="electricity",
                        elec_offer_supplier="British Gas",
                        status="pending" if j == 0 else "completed",
                        scheduled_datetime=now,
                        notes=f"Sample transfer {j+1}",
                    ))
                unique_id = 3000 + i
                customer = Customer(
                    created_by=agent.id,
                    business_name=f"Business {unique_id}",
                    owner_name=f"Owner {unique_id}",
                    business_phone="0123456789",
                    utility_type="electricity",
                    postcode="SW1A 1AA",
                )
                db.add(customer)
                db.flush()
                db.add(Sale(
                    employee_id=agent.id,
                    customer_id=customer.id,
                    owner_full_name=f"{agent.name}'s Client",
                    cot_status="chasing" if i % 2 == 0 else "done",
                    notes=f"Sample sale for {agent.name}",
                ))

            db.commit()
    finally:
        db.close()


def _port_available(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("0.0.0.0", port))
            return True
        except OSError:
            return False


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("RT_PORT", 7219))
    if not _port_available(port):
        print(f"Warning: Port {port} is in use, trying {port + 1}")
        port = port + 1
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
