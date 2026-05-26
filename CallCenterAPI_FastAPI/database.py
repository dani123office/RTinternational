import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool
from urllib.parse import urlparse, urlencode, parse_qs

DATABASE_URL = os.environ.get(
    "POSTGRES_URL",
    os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/callcenter")
)

# Handle postgres:// URLs (old format)
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Add pg8000 driver for PostgreSQL (pure Python, works in Vercel serverless)
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    if "+psycopg2" not in DATABASE_URL and "+psycopg" not in DATABASE_URL and "+pg8000" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

# Strip unrecognized query params that pg8000 may not support (e.g. channel_binding)
if DATABASE_URL and "?" in DATABASE_URL:
    parsed = urlparse(DATABASE_URL)
    query_params = parse_qs(parsed.query)
    supported_params = {"sslmode", "ssl", "timeout", "connect_timeout", "application_name", "keepalives", "keepalives_idle", "keepalives_interval", "keepalives_count", "options"}
    filtered = {k: v for k, v in query_params.items() if k in supported_params}
    flat = {k: v[0] if len(v) == 1 else v for k, v in filtered.items()}
    new_query = urlencode(flat, doseq=True)
    DATABASE_URL = parsed._replace(query=new_query).geturl()


def _mask_database_url(url):
    """Parse DATABASE_URL and return a masked version with password replaced."""
    try:
        parsed = urlparse(url)
        if parsed.password:
            # Reconstruct the URL with masked password
            masked_netloc = f"{parsed.username}:***@{parsed.hostname}"
            if parsed.port:
                masked_netloc += f":{parsed.port}"
            return f"{parsed.scheme}://{masked_netloc}{parsed.path}{f'?{parsed.query}' if parsed.query else ''}"
        return url
    except Exception:
        # If parsing fails, return a generic message instead of raw URL
        return "[DATABASE_URL configured but could not be parsed]"


# Create engine with proper configuration for serverless
try:
    engine = create_engine(
        DATABASE_URL, 
        echo=False, 
        pool_pre_ping=True, 
        poolclass=NullPool,
        connect_args={
            "timeout": 10,
            "check_same_thread": False
        } if "sqlite" in DATABASE_URL else {}
    )
except Exception as e:
    print(f"Warning: Database engine creation failed: {e}")
    print(f"DATABASE_URL: {_mask_database_url(DATABASE_URL)}")
    # Create a dummy engine for testing - remove in production
    engine = None

# Always create SessionLocal, even if engine is None (will raise error at runtime if used)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    if engine is None:
        raise RuntimeError(
            "Database engine is not initialized. "
            "Please ensure DATABASE_URL or POSTGRES_URL environment variable is set."
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
