"""Simulated price generator: nudges market prices, saves them, and broadcasts them."""

import asyncio
import random

from sqlalchemy import select

from app.connections import manager
from app.database import SessionLocal
from app.models import Market, PriceHistory
from app.schemas import MarketOut

TICK_SECONDS = 3
MAX_MARKETS_PER_TICK = 4
# Standard deviation of each price move. 0.015 means most moves are within about 1-3 cents.
PRICE_STEP = 0.015
MIN_PRICE, MAX_PRICE = 0.01, 0.99


def nudge_prices() -> list[dict]:
    """Move a few random markets' prices and save them. Returns the updated markets as JSON-ready dicts."""
    with SessionLocal() as db:
        markets = db.scalars(select(Market)).all()
        chosen = random.sample(markets, k=random.randint(1, min(MAX_MARKETS_PER_TICK, len(markets))))

        updated = []
        for market in chosen:
            new_yes = round(market.yes_price + random.gauss(0, PRICE_STEP), 2)
            new_yes = min(MAX_PRICE, max(MIN_PRICE, new_yes))
            if new_yes == market.yes_price:
                continue  # Rounded to no change; nothing to save or send.

            market.yes_price = new_yes
            market.no_price = round(1 - new_yes, 2)
            market.volume += random.randint(100, 5_000)
            market.history.append(PriceHistory(yes_price=market.yes_price, no_price=market.no_price))
            updated.append(market)

        db.commit()
        return [MarketOut.model_validate(m).model_dump(mode="json") for m in updated]


async def run_simulator() -> None:
    """Runs forever as a background task; cancelled when the app shuts down."""
    while True:
        await asyncio.sleep(TICK_SECONDS)
        try:
            # SQLAlchemy here is synchronous, so run it in a thread to keep the event loop free.
            updated = await asyncio.to_thread(nudge_prices)
            if updated:
                await manager.broadcast({"type": "price_update", "markets": updated})
        except Exception as exc:
            # One bad tick shouldn't kill the generator for the rest of the server's life.
            print(f"Simulator tick failed: {exc!r}")
