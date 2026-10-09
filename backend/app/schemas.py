from typing import Literal

from pydantic import BaseModel, ConfigDict, computed_field


class QuoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    symbol: str
    name: str
    price: float
    prev_close: float
    sparkline: list[float]
    updated_at: int

    @computed_field
    @property
    def change(self) -> float:
        return round(self.price - self.prev_close, 4)

    @computed_field
    @property
    def change_pct(self) -> float:
        return round((self.price / self.prev_close - 1) * 100, 4)

    @computed_field
    @property
    def kind(self) -> Literal["index", "stock"]:
        # Yahoo prefixes index symbols with "^", e.g. ^GSPC for the S&P 500.
        return "index" if self.symbol.startswith("^") else "stock"


class PricePointOut(BaseModel):
    ts: int  # Unix seconds
    close: float


class HistoryOut(BaseModel):
    symbol: str
    timeframe: str
    interval: str
    points: list[PricePointOut]


class ProjectionPointOut(BaseModel):
    days_ahead: float  # trading days after the last chart point
    ts: int  # rough Unix timestamp for that day, for labels only
    low: float  # 10th percentile
    expected: float  # middle estimate (50th percentile)
    high: float  # 90th percentile


class ProjectionOut(BaseModel):
    symbol: str
    timeframe: str
    horizon_days: int  # trading days the projection covers
    start_price: float
    start_ts: int
    # Estimated from daily closes over `history_years` years.
    history_years: float
    mu: float  # average daily log return
    sigma: float  # standard deviation of daily log returns
    annual_return: float  # exp(mu * 252) - 1, for display
    annual_volatility: float  # sigma * sqrt(252), for display
    points: list[ProjectionPointOut]
    # Value multipliers at the horizon: final value = amount * multiplier.
    pessimistic: float
    likely: float
    optimistic: float
    prob_loss: float  # 0..1
