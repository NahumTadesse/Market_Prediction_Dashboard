"""Create the tables and insert sample markets.

Run from backend/:  python -m app.seed
Safe to run more than once: it skips seeding if markets already exist.
"""

from sqlalchemy import func, select

from app.database import Base, SessionLocal, engine
from app.models import Market, PriceHistory

# (question, category, yes_price, volume)
SAMPLE_MARKETS = [
    ("Will the Fed cut interest rates at its next meeting?", "Economics", 0.62, 1_250_000),
    ("Will US CPI inflation come in above 3% this month?", "Economics", 0.35, 480_000),
    ("Will Bitcoin close above $150k by year end?", "Crypto", 0.28, 2_100_000),
    ("Will Ethereum outperform Bitcoin this quarter?", "Crypto", 0.44, 730_000),
    ("Will a new frontier AI model top the main benchmark leaderboard this month?", "Tech", 0.57, 390_000),
    ("Will a major tech company announce a stock split this year?", "Tech", 0.21, 150_000),
    ("Will the home team win the championship final?", "Sports", 0.53, 960_000),
    ("Will the world record in the men's 100m be broken this year?", "Sports", 0.06, 85_000),
    ("Will the incumbent party win the upcoming national election?", "Politics", 0.48, 3_400_000),
    ("Will global average temperature set a new monthly record?", "Science", 0.71, 210_000),
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        existing = db.scalar(select(func.count()).select_from(Market))
        if existing:
            print(f"Database already has {existing} markets, skipping seed.")
            return

        for question, category, yes_price, volume in SAMPLE_MARKETS:
            no_price = round(1 - yes_price, 2)
            market = Market(
                question=question,
                category=category,
                yes_price=yes_price,
                no_price=no_price,
                volume=volume,
            )
            # Starting point for the price chart.
            market.history.append(PriceHistory(yes_price=yes_price, no_price=no_price))
            db.add(market)

        db.commit()
        print(f"Seeded {len(SAMPLE_MARKETS)} markets.")


if __name__ == "__main__":
    seed()
