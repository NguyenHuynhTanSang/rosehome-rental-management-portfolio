import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker


# ==============================
# ENV
# ==============================

# Đường dẫn tới folder backend
BACKEND_DIR = Path(__file__).resolve().parent.parent

# Đọc backend/.env khi chạy local.
# Nếu biến môi trường đã được set từ Render/PowerShell,
# load_dotenv sẽ không ghi đè lên giá trị đó.
load_dotenv(BACKEND_DIR / ".env")


# ==============================
# DATABASE URL
# ==============================

# Production / Neon:
#   DATABASE_URL=postgresql://...
#
# Local:
#   DB_USER=...
#   DB_PASSWORD=...
#   DB_HOST=...
#   DB_PORT=5432
#   DB_NAME=...
raw_database_url = os.getenv("DATABASE_URL")


if raw_database_url:

    # Neon thường cung cấp URL bắt đầu bằng postgresql://
    # Project đang dùng psycopg 3, nên chỉ rõ driver cho SQLAlchemy.
    if raw_database_url.startswith("postgresql://"):
        DATABASE_URL = raw_database_url.replace(
            "postgresql://",
            "postgresql+psycopg://",
            1,
        )
    else:
        DATABASE_URL = raw_database_url

else:

    # Fallback về PostgreSQL local hiện tại
    DATABASE_URL = URL.create(
        drivername="postgresql+psycopg",
        username=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("DB_NAME"),
    )


# ==============================
# ENGINE
# ==============================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


# ==============================
# SESSION
# ==============================

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


# ==============================
# BASE
# ==============================

class Base(DeclarativeBase):
    pass


# ==============================
# TEST DATABASE
# ==============================

def test_database_connection():

    with engine.connect() as connection:

        result = connection.execute(
            text("SELECT 1")
        )

        return result.scalar_one()