from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Market, PriceHistory
from app.schemas import MarketOut, PricePointOut

router = APIRouter(prefix="/api/markets", tags=["markets"])


def get_market_or_404(market_id: int, db: Session) -> Market:
    market = db.get(Market, market_id)
    if market is None:
        raise HTTPException(status_code=404, detail=f"Market {market_id} not found")
    return market


@router.get("", response_model=list[MarketOut])
def list_markets(db: Session = Depends(get_db)):
    return db.scalars(select(Market).order_by(Market.id)).all()


@router.get("/{market_id}", response_model=MarketOut)
def get_market(market_id: int, db: Session = Depends(get_db)):
    return get_market_or_404(market_id, db)


@router.get("/{market_id}/history", response_model=list[PricePointOut])
def get_market_history(
    market_id: int,
    limit: int = Query(100, ge=1, le=1000, description="How many of the most recent points to return"),
    db: Session = Depends(get_db),
):
    get_market_or_404(market_id, db)
    # Take the newest `limit` points, then flip them so the response is oldest first (chart order).
    newest_first = db.scalars(
        select(PriceHistory)
        .where(PriceHistory.market_id == market_id)
        .order_by(PriceHistory.recorded_at.desc(), PriceHistory.id.desc())
        .limit(limit)
    ).all()
    return list(reversed(newest_first))
