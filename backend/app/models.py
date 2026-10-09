from sqlalchemy import JSON, Float, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

# All timestamps are stored as Unix seconds (int): easy to compare and what the charts use directly.


class Quote(Base):
    """Latest quote for one symbol, plus its display name and today's sparkline."""

    __tablename__ = "quotes"

    symbol: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    price: Mapped[float] = mapped_column(Float)
    prev_close: Mapped[float] = mapped_column(Float)
    # Closes from the latest trading session, oldest first; only used for the small card chart.
    sparkline: Mapped[list[float]] = mapped_column(JSON)
    updated_at: Mapped[int]


class PriceBar(Base):
    """One OHLCV bar of price history. `interval` is the bar size, e.g. "5m", "1d" or "1wk"."""

    __tablename__ = "price_bars"

    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(16))
    interval: Mapped[str] = mapped_column(String(8))
    ts: Mapped[int]
    open: Mapped[float] = mapped_column(Float)
    high: Mapped[float] = mapped_column(Float)
    low: Mapped[float] = mapped_column(Float)
    close: Mapped[float] = mapped_column(Float)
    volume: Mapped[float] = mapped_column(Float)

    # Also serves as the index for "all bars of symbol X at bar size Y, in time order".
    __table_args__ = (UniqueConstraint("symbol", "interval", "ts"),)


class FetchLog(Base):
    """When each (symbol, bar size) was last downloaded; decides whether the cached bars are fresh."""

    __tablename__ = "fetch_log"

    symbol: Mapped[str] = mapped_column(String(16), primary_key=True)
    interval: Mapped[str] = mapped_column(String(8), primary_key=True)
    fetched_at: Mapped[int]
