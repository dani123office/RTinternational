import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool

DATABASE_URL = os.environ.get(
    "POSTGRES_URL",
    os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/callcenter")
)

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    if "+psycopg2" not in DATABASE_URL and "+psycopg" not in DATABASE_URL and "+pg8000" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True, poolclass=NullPool)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
