from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict


def as_utc(value: datetime) -> datetime:
    # SQLite drops the timezone, so stored UTC times come back naive. Mark them as UTC
    # so the JSON has an explicit offset, e.g. "2026-10-08T20:50:52Z".
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


UTCDateTime = Annotated[datetime, AfterValidator(as_utc)]


class MarketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question: str
    category: str
    yes_price: float
    no_price: float
    volume: float
    updated_at: UTCDateTime


class PricePointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    yes_price: float
    no_price: float
    recorded_at: UTCDateTime
