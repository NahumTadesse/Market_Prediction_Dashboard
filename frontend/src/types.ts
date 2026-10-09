// Mirrors the backend's MarketOut schema (backend/app/schemas.py).
export type Market = {
  id: number
  question: string
  category: string
  yes_price: number
  no_price: number
  volume: number
  updated_at: string
}

// Sent by the backend over /ws/markets; contains only the markets that changed.
export type PriceUpdateMessage = {
  type: 'price_update'
  markets: Market[]
}
