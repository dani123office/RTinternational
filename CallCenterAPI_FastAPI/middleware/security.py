import re
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

SQL_INJECTION_PATTERNS = [
    re.compile(r"(?:;\s*|'\s*)(?:OR|AND|UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE)\s", re.IGNORECASE),
    re.compile(r"(?:--|\/\*|' --)", re.IGNORECASE),
    re.compile(r"(?:xp_cmdshell|sp_executesql|sp_prepare|waifor|pg_sleep)\s*\(", re.IGNORECASE),
    re.compile(r"(?:0x[0-9a-fA-F]{16,})\s", re.IGNORECASE),
    re.compile(r"(?:;\s*|'\s*)(?:ISNULL|COALESCE|CASE\s+WHEN|DECLARE\s+@)\s", re.IGNORECASE),
]


class SQLInjectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Exclude AI endpoints from SQL injection checks as they process free-form notes
        if request.url.path.startswith("/api/ai"):
            return await call_next(request)

        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            body = await request.body()
            if body:
                decoded = body.decode("utf-8", errors="ignore")
                for pattern in SQL_INJECTION_PATTERNS:
                    if pattern.search(decoded):
                        return JSONResponse(
                            status_code=400,
                            content={"detail": "Request blocked: suspicious content detected"}
                        )
        response = await call_next(request)
        return response

