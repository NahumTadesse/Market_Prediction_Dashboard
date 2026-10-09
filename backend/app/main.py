import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI

from app.routers import markets, ws
from app.seed import seed
from app.simulator import run_simulator


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and sample data on startup, so a fresh clone works without extra steps.
    seed()
    simulator = asyncio.create_task(run_simulator())
    yield
    simulator.cancel()
    with suppress(asyncio.CancelledError):
        await simulator


app = FastAPI(title="Prediction Market Dashboard API", lifespan=lifespan)
app.include_router(markets.router)
app.include_router(ws.router)
