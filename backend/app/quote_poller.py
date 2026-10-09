"""Background task: refreshes the home page quotes every minute while the market is open and
broadcasts them over the WebSocket."""

import asyncio

from app.connections import manager
from app.database import SessionLocal
from app.market_data import HOME_SYMBOLS, get_quotes, is_market_open
from app.schemas import QuoteOut

POLL_SECONDS = 60


def market_status_message() -> dict:
    return {"type": "market_status", "market_open": is_market_open()}


def refresh_home_quotes() -> list[dict]:
    """Download fresh quotes, save them, and return them as JSON-ready dicts."""
    with SessionLocal() as db:
        quotes = get_quotes(db, HOME_SYMBOLS, force=True)
        return [QuoteOut.model_validate(q).model_dump(mode="json") for q in quotes]


async def run_quote_poller() -> None:
    """Runs forever as a background task; cancelled when the app shuts down."""
    was_open = is_market_open()
    while True:
        await asyncio.sleep(POLL_SECONDS)
        try:
            is_open = is_market_open()
            if is_open != was_open:
                # Tell clients the market just opened or closed, so they can update the status pill.
                await manager.broadcast(market_status_message())
                was_open = is_open
            if is_open and manager.active:
                # yfinance is blocking, so run it in a thread to keep the event loop free.
                quotes = await asyncio.to_thread(refresh_home_quotes)
                await manager.broadcast({"type": "quotes", "quotes": quotes})
        except Exception as exc:
            # One bad tick (e.g. a yfinance hiccup) shouldn't stop the updates for good.
            print(f"Quote poller tick failed: {exc!r}")
