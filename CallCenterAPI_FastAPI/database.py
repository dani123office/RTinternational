import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool

DATABASE_URL = os.environ.get(
    "POSTGRES_URL",
    os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/callcenter")
)

# Handle postgres:// URLs (old format)
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Add driver for PostgreSQL - prefer psycopg2 on Vercel, pg8000 otherwise
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    if "+psycopg2" not in DATABASE_URL and "+psycopg" not in DATABASE_URL and "+pg8000" not in DATABASE_URL:
        # On Vercel, try psycopg2-binary first (more reliable), fallback to pg8000
        if os.environ.get("VERCEL"):
            try:
                import psycopg2
                DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
            except ImportError:
                DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)
        else:
            # Local development: prefer psycopg2 if available, otherwise pg8000
            try:
                import psycopg2
                DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
            except ImportError:
                try:
                    import pg8000
                    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)
                except ImportError:
                    pass  # Will try to connect with default driver

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
    print(f"DATABASE_URL: {DATABASE_URL if 'password' not in DATABASE_URL else '***'}")
    # Create a dummy engine for testing - remove in production
    engine = None

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None


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
