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
