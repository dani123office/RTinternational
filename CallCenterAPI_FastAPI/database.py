import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool
from urllib.parse import urlparse

DATABASE_URL = os.environ.get(
    "POSTGRES_URL",
    os.environ.get("DATABASE_URL", "sqlite:///CallCenterAPI_FastAPI/callcenter.db")
)

# Handle postgres:// URLs (old format)
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Add pg8000 driver for PostgreSQL (pure Python, works in Vercel serverless)
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    if "+psycopg2" not in DATABASE_URL and "+psycopg" not in DATABASE_URL and "+pg8000" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

# Check if SSL is required before we strip query parameters
ssl_required = False
if DATABASE_URL:
    if "sslmode=require" in DATABASE_URL or "sslmode=prefer" in DATABASE_URL:
        ssl_required = True
    elif "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL and "sqlite" not in DATABASE_URL:
        ssl_required = True

# Strip all query params — pg8000 doesn't accept URL query params as connect() kwargs
if DATABASE_URL and "?" in DATABASE_URL:
    parsed = urlparse(DATABASE_URL)
    DATABASE_URL = parsed._replace(query="").geturl()


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
    connect_args = {}
    if "sqlite" in DATABASE_URL:
        connect_args = {
            "timeout": 10,
            "check_same_thread": False
        }
    elif ssl_required and "+pg8000" in DATABASE_URL:
        connect_args = {
            "ssl_context": True
        }
    elif ssl_required:
        connect_args = {
            "ssl": True
        }

    engine = create_engine(
        DATABASE_URL, 
        echo=False, 
        pool_pre_ping=True, 
        poolclass=NullPool,
        connect_args=connect_args
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


_db_initialized = False


def _ensure_tables():
    global _db_initialized
    if _db_initialized or engine is None:
        return
    try:
        Base.metadata.create_all(bind=engine)
        from sqlalchemy import text, func, inspect as sa_inspect
        inspector = sa_inspect(engine)
        for table_name, table in Base.metadata.tables.items():
            existing_columns = {c["name"] for c in inspector.get_columns(table_name)}
            for col in table.columns:
                if col.name not in existing_columns:
                    col_type = col.type.compile(engine.dialect)
                    nullable = "NULL" if col.nullable else "NOT NULL"
                    with engine.connect() as conn:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type} {nullable}"))
                        conn.commit()
                    print(f"Added missing column '{col.name}' to '{table_name}'")
    except Exception as e:
        print(f"Warning: Failed to ensure database tables: {e}")

    # Seed default users if they don't exist
    try:
        import bcrypt
        from .models import User
        db = SessionLocal()
        try:
            def _hash(pw: str = "password"):
                return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

            def _ensure_user(email, defaults):
                existing = db.query(User).filter(func.lower(User.email) == email.lower()).first()
                if not existing:
                    u = User(email=email, **defaults)
                    db.add(u)
                    db.flush()
                    return u
                return existing

            _ensure_user("admin@test.com", dict(name="Admin User", password_hash=_hash(), role="admin", is_active=1, is_email_verified=1))
            _ensure_user("sunny@rt.com", dict(name="Sunny", password_hash=_hash("123456"), role="manager", is_active=1, is_email_verified=1))

            db.commit()
        finally:
            db.close()
    except Exception as e:
        print(f"Warning: Failed to seed default users: {e}")

    _db_initialized = True


def get_db():
    if engine is None:
        raise RuntimeError(
            "Database engine is not initialized. "
            "Please ensure DATABASE_URL or POSTGRES_URL environment variable is set."
        )
    _ensure_tables()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
