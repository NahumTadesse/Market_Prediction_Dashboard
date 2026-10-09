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
