from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import models  # noqa: F401  (registers the tables on Base before create_all)
from app.database import Base, engine
from app.routers import stocks, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create any missing tables on startup, so a fresh clone works without extra steps.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Stock Dashboard API", lifespan=lifespan)
app.include_router(stocks.router)
app.include_router(ws.router)
