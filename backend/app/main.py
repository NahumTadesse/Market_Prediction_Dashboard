import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI

from app import models  # noqa: F401  (registers the tables on Base before create_all)
from app.database import Base, engine
from app.quote_poller import run_quote_poller
from app.routers import stocks, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create any missing tables on startup, so a fresh clone works without extra steps.
    Base.metadata.create_all(bind=engine)
    poller = asyncio.create_task(run_quote_poller())
    yield
    poller.cancel()
    with suppress(asyncio.CancelledError):
        await poller


app = FastAPI(title="Stock Dashboard API", lifespan=lifespan)
app.include_router(stocks.router)
app.include_router(ws.router)
