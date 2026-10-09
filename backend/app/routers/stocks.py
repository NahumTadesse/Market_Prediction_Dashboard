from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app.database import get_db
from app.market_data import HOME_SYMBOLS, TIMEFRAMES, TimeframeKey, UnknownSymbolError, get_history, get_quote, get_quotes
from app.schemas import HistoryOut, PricePointOut, QuoteOut

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
