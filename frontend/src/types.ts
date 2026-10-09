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
