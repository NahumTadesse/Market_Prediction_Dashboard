// Mirrors the backend's QuoteOut schema (backend/app/schemas.py).
export type Quote = {
  symbol: string
  name: string
  price: number
  prev_close: number
  change: number
  change_pct: number
  kind: 'index' | 'stock'
  // Closes from the latest trading session, oldest first.
  sparkline: number[]
  updated_at: number // Unix seconds
}

// Mirrors PricePointOut.
export type PricePoint = {
  ts: number // Unix seconds
  close: number
}

// Messages the backend sends over /ws/quotes.
export type QuotesSocketMessage =
  | { type: 'market_status'; market_open: boolean } // on connect, and when the market opens or closes
  | { type: 'quotes'; quotes: Quote[] } // about once a minute while the market is open

export type Timeframe = '1D' | '3D' | '1W' | '1M' | '1Y' | '5Y' | '10Y'

// Mirrors HistoryOut.
export type History = {
  symbol: string
  timeframe: Timeframe
  interval: string // bar size, e.g. "5m", "1d", "1wk"
  points: PricePoint[]
}

// Mirrors ProjectionPointOut.
export type ProjectionPoint = {
  days_ahead: number // trading days after the last chart point
  ts: number // rough Unix timestamp, for labels only
  low: number // 10th percentile
  expected: number // middle estimate (50th percentile)
  high: number // 90th percentile
  paths: number[] // each Monte Carlo path's simulated price at this point
}

// Mirrors ProjectionOut. See backend/app/projection.py for the math.
export type Projection = {
  symbol: string
  timeframe: Timeframe
  horizon_days: number
  start_price: number
  start_ts: number
  history_years: number
  mu: number
  sigma: number
  annual_return: number
  annual_volatility: number
  points: ProjectionPoint[]
  // Final value = amount * multiplier.
  pessimistic: number
  likely: number
  optimistic: number
  prob_loss: number // 0..1
}

// Mirrors BacktestOut.
export type Backtest = {
  symbol: string
  timeframe: Timeframe
  start_ts: number
  start_price: number
  end_ts: number
  end_price: number
  multiplier: number // final value = amount * multiplier
}
