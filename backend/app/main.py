from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers import markets
from app.seed import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and sample data on startup, so a fresh clone works without extra steps.
    seed()
    yield


app = FastAPI(title="Prediction Market Dashboard API", lifespan=lifespan)
app.include_router(markets.router)
