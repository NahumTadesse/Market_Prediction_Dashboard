"""Projection math, shared by the chart and the investment calculator.

The idea in one sentence: assume daily returns keep behaving like they did over the last
5 years; scale the average by time and the spread by the square root of time.

1. Daily log return: r = ln(P_today / P_yesterday). Log returns add up over time, so the
   return over n days is just the sum of n daily returns.
2. mu = average daily log return, sigma = standard deviation of daily log returns (volatility).
3. Over n trading days, the total log return is about normal with mean mu*n and standard
   deviation sigma*sqrt(n) (independent days: variances add, so the spread grows with sqrt(n)).
4. Turning that back into prices:
     middle estimate = P0 * exp(mu*n)                    (50/50 chance above or below)
     likely range    = P0 * exp(mu*n +/- 1.28*sigma*sqrt(n))  (10th to 90th percentile)
5. Chance of a loss = chance the total log return is below 0 = Phi(-mu*n / (sigma*sqrt(n))),
   where Phi is the standard normal CDF.
6. Monte Carlo paths (for the chart only): instead of the formula, actually roll the dice.
   Start at P0 and repeatedly multiply by exp(random move), each move drawn from a normal
   distribution with the same mu and sigma, scaled to the step length. Each path is one
   possible future; many of them would fill the shaded range, with half above the middle line.
"""

import math
import random
import statistics
from datetime import datetime, timedelta

from app.market_data import NY

TRADING_DAYS_PER_YEAR = 252
# 80% of a normal distribution lies within +/-1.2816 standard deviations, leaving 10% in each tail.
Z_10_90 = 1.2816
# Fewer daily returns than this (about 3 months) is too little to estimate mu and sigma.
MIN_RETURNS = 60


def daily_log_returns(closes: list[float]) -> list[float]:
    return [math.log(today / yesterday) for yesterday, today in zip(closes, closes[1:])]


def estimate_params(closes: list[float]) -> tuple[float, float]:
    """(mu, sigma) of daily log returns from a list of daily closes, oldest first."""
    returns = daily_log_returns(closes)
    if len(returns) < MIN_RETURNS:
        raise ValueError(f"Need at least {MIN_RETURNS} daily returns, got {len(returns)}")
    return statistics.mean(returns), statistics.stdev(returns)


def price_range(p0: float, mu: float, sigma: float, days: float) -> tuple[float, float, float]:
    """(low, middle, high) price after `days` trading days: 10th, 50th and 90th percentile."""
    center = mu * days
    spread = Z_10_90 * sigma * math.sqrt(days)
    return p0 * math.exp(center - spread), p0 * math.exp(center), p0 * math.exp(center + spread)


def normal_cdf(z: float) -> float:
    """Chance that a standard normal value is below z."""
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def prob_loss(mu: float, sigma: float, days: float) -> float:
    """Chance of ending below the starting price after `days` trading days."""
    return normal_cdf(-mu * days / (sigma * math.sqrt(days)))


def simulate_paths(
    p0: float, mu: float, sigma: float, step_days: float, steps: int, count: int, seed: str
) -> list[list[float]]:
    """`count` random price paths of `steps` moves each, starting at p0 (included as point 0).
    One step lasts `step_days` trading days, so its log return is normal with mean mu*step_days
    and standard deviation sigma*sqrt(step_days): the same scaling rule as price_range().
    A fixed seed gives the same paths on every reload instead of a new picture each time."""
    rng = random.Random(seed)
    drift = mu * step_days
    volatility = sigma * math.sqrt(step_days)
    paths = []
    for _ in range(count):
        price = p0
        path = [price]
        for _ in range(steps):
            price *= math.exp(rng.gauss(drift, volatility))
            path.append(price)
        paths.append(path)
    return paths


def future_ts(start_ts: int, days: float, intraday: bool) -> int:
    """Rough timestamp `days` trading days after start_ts, only used to label the chart.
    Daily/weekly charts spread trading days over the calendar (252 per 365 days). Intraday
    charts walk forward through 9:30-16:00 sessions, skipping weekends (not holidays)."""
    if not intraday:
        return int(start_ts + days * 365 / TRADING_DAYS_PER_YEAR * 24 * 60 * 60)
    session = datetime.fromtimestamp(start_ts, NY)
    whole_days = max(1, math.ceil(days))  # which upcoming session this point falls in
    for _ in range(whole_days):
        session += timedelta(days=1)
        while session.weekday() >= 5:
            session += timedelta(days=1)
    fraction = days - (whole_days - 1)  # how far into that session, 0..1
    opens = session.replace(hour=9, minute=30, second=0, microsecond=0)
    return int((opens + timedelta(hours=6.5) * fraction).timestamp())
