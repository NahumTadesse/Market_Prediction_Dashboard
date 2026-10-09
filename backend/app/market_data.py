"""Everything that talks to yfinance lives here, together with the SQLite cache in front of it."""

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

import yfinance as yf
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import FetchLog, PriceBar, Quote

NY = ZoneInfo("America/New_York")

INDEXES = {
    "^IXIC": "NASDAQ Composite",
    "^GSPC": "S&P 500",
    "^DJI": "Dow Jones Industrial Average",
}
STOCKS = {
    "AAPL": "Apple",
    "MSFT": "Microsoft",
    "NVDA": "NVIDIA",
    "AMZN": "Amazon",
    "GOOGL": "Alphabet",
    "META": "Meta Platforms",
    "TSLA": "Tesla",
    "AVGO": "Broadcom",
    "JPM": "JPMorgan Chase",
    "BRK-B": "Berkshire Hathaway",
}
HOME_SYMBOLS = [*INDEXES, *STOCKS]
KNOWN_NAMES = {**INDEXES, **STOCKS}

TimeframeKey = Literal["1D", "3D", "1W", "1M", "1Y", "5Y", "10Y"]


@dataclass(frozen=True)
class Timeframe:
    interval: str  # bar size to show
    trading_days: int  # how far forward the projection goes (used from Phase 6)
    sessions: int | None = None  # intraday: keep the last N trading sessions
    days: int | None = None  # daily/weekly: keep the last N calendar days


TIMEFRAMES: dict[TimeframeKey, Timeframe] = {
    "1D": Timeframe("5m", 1, sessions=1),
    "3D": Timeframe("15m", 3, sessions=3),
    "1W": Timeframe("30m", 5, sessions=5),
    "1M": Timeframe("1d", 21, days=31),
    "1Y": Timeframe("1d", 252, days=366),
    "5Y": Timeframe("1wk", 1260, days=5 * 366),
    "10Y": Timeframe("1wk", 2520, days=10 * 366),
}

# Each bar size is cached once, downloaded at its longest period, and every timeframe slices
# what it needs from it. Daily goes back 5 years because the projection math needs that much.
DOWNLOAD_PERIOD = {"5m": "5d", "15m": "5d", "30m": "5d", "1d": "5y", "1wk": "10y"}
INTRADAY = {"5m", "15m", "30m"}
# Bars in one trading day (6.5 hours) for each bar size.
BARS_PER_DAY = {"5m": 78, "15m": 26, "30m": 13, "1d": 1, "1wk": 1 / 5}

# How long cached data stays fresh while the market is open (seconds).
QUOTE_MAX_AGE = 60
INTRADAY_MAX_AGE = 2 * 60
DAILY_MAX_AGE = 6 * 60 * 60
# After the close, yfinance can take a few minutes to settle the session's final prices.
CLOSE_GRACE = timedelta(minutes=20)


class UnknownSymbolError(Exception):
    """yfinance has no data for this symbol (typo, delisted, or not on Yahoo)."""


# --- Market hours -------------------------------------------------------------------------


def is_market_open(now: datetime | None = None) -> bool:
    """Regular NYSE/NASDAQ hours: Mon-Fri, 9:30-16:00 New York time. Holidays are not handled."""
    now = now or datetime.now(NY)
    if now.weekday() >= 5:
        return False
    opens = now.replace(hour=9, minute=30, second=0, microsecond=0)
    closes = now.replace(hour=16, minute=0, second=0, microsecond=0)
    return opens <= now < closes


def last_market_close(now: datetime) -> datetime:
    """The most recent weekday 16:00 New York time at or before `now`."""
    day = now if now.hour >= 16 else now - timedelta(days=1)
    while day.weekday() >= 5:
        day -= timedelta(days=1)
    return day.replace(hour=16, minute=0, second=0, microsecond=0)


def is_fresh(fetched_at: int, max_age: int) -> bool:
    now = datetime.now(NY)
    age = now.timestamp() - fetched_at
    if is_market_open(now):
        return age < max_age
    # Market closed: prices can't change until the next open, so anything fetched after the
    # last close settled stays fresh. Short re-checks still happen during the grace period.
    settled = last_market_close(now) + CLOSE_GRACE
    return fetched_at >= settled.timestamp() or age < INTRADAY_MAX_AGE


def _now_ts() -> int:
    return int(datetime.now(NY).timestamp())


def _ny_date(ts: int) -> date:
    return datetime.fromtimestamp(ts, NY).date()


# --- Price history ------------------------------------------------------------------------


def _download_bars(symbol: str, interval: str) -> list[PriceBar]:
    print(f"yfinance: downloading {symbol} {interval} bars")
    try:
        df = yf.Ticker(symbol).history(period=DOWNLOAD_PERIOD[interval], interval=interval, auto_adjust=True)
    except Exception as exc:
        print(f"yfinance: history download failed for {symbol}: {exc!r}")
        return []
    # yfinance includes a row with empty prices for sessions that haven't finished yet.
    df = df.dropna(subset=["Open", "High", "Low", "Close"]).fillna({"Volume": 0})
    return [
        PriceBar(
            symbol=symbol,
            interval=interval,
            ts=int(row.Index.timestamp()),
            open=float(row.Open),
            high=float(row.High),
            low=float(row.Low),
            close=float(row.Close),
            volume=float(row.Volume),
        )
        for row in df.itertuples()
    ]


def _cached_bars(db: Session, symbol: str, interval: str) -> list[PriceBar]:
    """All cached bars for (symbol, interval), oldest first; downloads them first if stale."""
    log = db.get(FetchLog, (symbol, interval))
    max_age = INTRADAY_MAX_AGE if interval in INTRADAY else DAILY_MAX_AGE
    if log is None or not is_fresh(log.fetched_at, max_age):
        bars = _download_bars(symbol, interval)
        if bars:
            # Replace the whole set: simpler than merging, and the download covers the full period.
            db.execute(delete(PriceBar).where(PriceBar.symbol == symbol, PriceBar.interval == interval))
            db.add_all(bars)
            db.merge(FetchLog(symbol=symbol, interval=interval, fetched_at=_now_ts()))
            db.commit()
        elif log is None:
            raise UnknownSymbolError(symbol)
        # Otherwise yfinance failed this time; keep serving the older cached bars.

    return list(
        db.scalars(
            select(PriceBar).where(PriceBar.symbol == symbol, PriceBar.interval == interval).order_by(PriceBar.ts)
        )
    )


def get_history(db: Session, symbol: str, timeframe: TimeframeKey) -> list[PriceBar]:
    """Price bars for one timeframe button, oldest first."""
    tf = TIMEFRAMES[timeframe]
    bars = _cached_bars(db, symbol, tf.interval)
    if tf.sessions:
        session_days = sorted({_ny_date(b.ts) for b in bars})
        first_day = session_days[-tf.sessions:][0]  # also works when fewer sessions are cached
        return [b for b in bars if _ny_date(b.ts) >= first_day]
    cutoff = bars[-1].ts - tf.days * 24 * 60 * 60
    return [b for b in bars if b.ts >= cutoff]


def get_daily_closes(db: Session, symbol: str) -> list[float]:
    """Up to 5 years of daily closes, oldest first; the input for the projection math."""
    return [b.close for b in _cached_bars(db, symbol, "1d")]


# --- Quotes -------------------------------------------------------------------------------


def _lookup_name(symbol: str) -> str:
    if symbol in KNOWN_NAMES:
        return KNOWN_NAMES[symbol]
    try:
        info = yf.Ticker(symbol).info
        return info.get("shortName") or info.get("longName") or symbol
    except Exception:
        return symbol


def _download_quotes(symbols: list[str]) -> dict[str, dict]:
    """Two batched downloads for all symbols: daily bars for the previous close, 5-minute bars
    for the current price and the sparkline."""
    print(f"yfinance: downloading quotes for {len(symbols)} symbols")
    options = dict(period="5d", group_by="ticker", auto_adjust=True, progress=False)
    try:
        daily = yf.download(symbols, interval="1d", **options)
        intraday = yf.download(symbols, interval="5m", **options)
    except Exception as exc:
        print(f"yfinance: quote download failed: {exc!r}")
        return {}

    quotes = {}
    for symbol in symbols:
        if symbol not in intraday.columns.get_level_values(0):
            continue
        bars = intraday[symbol]["Close"].dropna()
        closes = daily[symbol]["Close"].dropna()
        if bars.empty:
            continue  # Unknown symbol: yfinance returns an all-empty column.
        # Use the latest session from the 5-minute bars: yfinance's daily row for today can be
        # empty even after the close, so the daily data alone can lag a day behind.
        session_day = bars.index[-1].date()
        session = bars[bars.index.date == session_day]
        earlier = closes[closes.index.date < session_day]
        if earlier.empty:
            continue
        quotes[symbol] = {
            "price": float(session.iloc[-1]),
            "prev_close": float(earlier.iloc[-1]),
            "sparkline": [round(float(c), 4) for c in session],
        }
    return quotes


def get_quotes(db: Session, symbols: list[str], force: bool = False) -> list[Quote]:
    """Latest quotes in the order asked for. Only stale or missing symbols are downloaded,
    unless `force` is set (the poller uses it). Symbols yfinance doesn't know are left out."""
    cached = {q.symbol: q for q in db.scalars(select(Quote).where(Quote.symbol.in_(symbols)))}
    stale = [s for s in symbols if force or s not in cached or not is_fresh(cached[s].updated_at, QUOTE_MAX_AGE)]
    if stale:
        for symbol, fields in _download_quotes(stale).items():
            quote = cached.get(symbol) or Quote(symbol=symbol, name=_lookup_name(symbol))
            quote.price = fields["price"]
            quote.prev_close = fields["prev_close"]
            quote.sparkline = fields["sparkline"]
            quote.updated_at = _now_ts()
            db.add(quote)
            cached[symbol] = quote
        db.commit()
    return [cached[s] for s in symbols if s in cached]


def get_quote(db: Session, symbol: str) -> Quote:
    quotes = get_quotes(db, [symbol])
    if not quotes:
        raise UnknownSymbolError(symbol)
    return quotes[0]
