from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Keep the DB file in backend/ no matter which directory the app is started from.
DB_PATH = Path(__file__).resolve().parent.parent / "stocks.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False lets FastAPI use the connection from different threads.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: one session per request, always closed afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
