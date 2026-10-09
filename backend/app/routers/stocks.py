import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app.database import get_db
from app import projection
from app.market_data import (
    BARS_PER_DAY,
    HOME_SYMBOLS,
    INTRADAY,
    TIMEFRAMES,
    TimeframeKey,
    UnknownSymbolError,
    get_daily_closes,
    get_history,
    get_quote,
    get_quotes,
)
from app.schemas import BacktestOut, HistoryOut, PricePointOut, ProjectionOut, ProjectionPointOut, QuoteOut

router = APIRouter(prefix="/api", tags=["stocks"])

# Letters, digits and the few symbols Yahoo uses: BRK-B, ^GSPC, BTC-USD, EURUSD=X, RY.TO.
Symbol = Annotated[str, Path(pattern=r"^[A-Za-z0-9.^=-]{1,15}$")]


def not_found(symbol: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"No data found for ticker {symbol}")


@router.get("/quotes", response_model=list[QuoteOut])
def list_quotes(db: Session = Depends(get_db)):
    """Quotes for the indexes and stocks on the home page."""
    return get_quotes(db, HOME_SYMBOLS)


@router.get("/stocks/{symbol}", response_model=QuoteOut)
def get_stock(symbol: Symbol, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    try:
        return get_quote(db, symbol)
    except UnknownSymbolError:
        raise not_found(symbol)


@router.get("/stocks/{symbol}/history", response_model=HistoryOut)
def get_stock_history(symbol: Symbol, timeframe: TimeframeKey = "1Y", db: Session = Depends(get_db)):
    symbol = symbol.upper()
    try:
        bars = get_history(db, symbol, timeframe)
    except UnknownSymbolError:
        raise not_found(symbol)
    return HistoryOut(
        symbol=symbol,
        timeframe=timeframe,
        interval=TIMEFRAMES[timeframe].interval,
        points=[PricePointOut(ts=b.ts, close=b.close) for b in bars],
    )


MONTE_CARLO_PATHS = 8


@router.get("/stocks/{symbol}/projection", response_model=ProjectionOut)
def get_stock_projection(symbol: Symbol, timeframe: TimeframeKey = "1Y", db: Session = Depends(get_db)):
    """Projected price range, starting at the last point of the same timeframe's chart and
    reaching as far forward as that chart reaches back. See app/projection.py for the math."""
    symbol = symbol.upper()
    try:
        bars = get_history(db, symbol, timeframe)
        closes = get_daily_closes(db, symbol)
    except UnknownSymbolError:
        raise not_found(symbol)
    try:
        mu, sigma = projection.estimate_params(closes)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"{symbol} has too little price history for a projection")

    tf = TIMEFRAMES[timeframe]
    n = tf.trading_days
    start = bars[-1]
    # One projection point per chart bar, so the simulated paths are as jagged as the real price
    # history next to them (e.g. 5-minute moves on 1D, weekly moves on 10Y).
    steps = round(n * BARS_PER_DAY[tf.interval])
    step_days = n / steps
    paths = projection.simulate_paths(
        start.close, mu, sigma, step_days, steps, MONTE_CARLO_PATHS, seed=f"{symbol}:{timeframe}:{start.ts}"
    )
    points = []
    for step in range(steps + 1):
        days = step * step_days
        low, expected, high = projection.price_range(start.close, mu, sigma, days)
        ts = start.ts if step == 0 else projection.future_ts(start.ts, days, tf.interval in INTRADAY)
        points.append(
            ProjectionPointOut(
                days_ahead=days,
                ts=ts,
                low=low,
                expected=expected,
                high=high,
                paths=[path[step] for path in paths],
            )
        )

    low, expected, high = projection.price_range(1.0, mu, sigma, n)
    return ProjectionOut(
        symbol=symbol,
        timeframe=timeframe,
        horizon_days=n,
        start_price=start.close,
        start_ts=start.ts,
        history_years=round(len(closes) / projection.TRADING_DAYS_PER_YEAR, 1),
        mu=mu,
        sigma=sigma,
        annual_return=math.exp(mu * projection.TRADING_DAYS_PER_YEAR) - 1,
        annual_volatility=sigma * math.sqrt(projection.TRADING_DAYS_PER_YEAR),
        points=points,
        pessimistic=low,
        likely=expected,
        optimistic=high,
        prob_loss=projection.prob_loss(mu, sigma, n),
    )


@router.get("/stocks/{symbol}/backtest", response_model=BacktestOut)
def get_stock_backtest(symbol: Symbol, timeframe: TimeframeKey = "1Y", db: Session = Depends(get_db)):
    """Real past performance over the timeframe: first and last price of the same chart.
    Prices are split- and dividend-adjusted, so this roughly includes reinvested dividends."""
    symbol = symbol.upper()
    try:
        bars = get_history(db, symbol, timeframe)
    except UnknownSymbolError:
        raise not_found(symbol)
    start, end = bars[0], bars[-1]
    return BacktestOut(
        symbol=symbol,
        timeframe=timeframe,
        start_ts=start.ts,
        start_price=start.close,
        end_ts=end.ts,
        end_price=end.close,
        multiplier=end.close / start.close,
    )
