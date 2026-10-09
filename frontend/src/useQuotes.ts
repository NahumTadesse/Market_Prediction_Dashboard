import { useEffect, useState } from 'react'
import type { Quote, QuotesSocketMessage } from './types'

export type ConnectionStatus = 'connecting' | 'live' | 'closed' | 'disconnected'

/** Loads the home page quotes over REST once, then keeps them up to date from the WebSocket. */
export function useQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')

  useEffect(() => {
    const controller = new AbortController()
    let socket: WebSocket | null = null

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      socket = new WebSocket(`${protocol}://${window.location.host}/ws/quotes`)
      socket.onclose = () => setStatus('disconnected')
      socket.onmessage = (event) => {
        const message: QuotesSocketMessage = JSON.parse(event.data)
        if (message.type === 'market_status') {
          setStatus(message.market_open ? 'live' : 'closed')
        } else if (message.type === 'quotes') {
          const updates = new Map(message.quotes.map((q) => [q.symbol, q]))
          // Functional update: React passes in the latest state, so we never patch a stale copy.
          setQuotes((current) => current.map((q) => updates.get(q.symbol) ?? q))
        }
      }
    }

    async function load() {
      try {
        const response = await fetch('/api/quotes', { signal: controller.signal })
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
        setQuotes(await response.json())
        setLoading(false)
        // Connect only after the initial list is in state, so updates have cards to land on.
        connect()
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load quotes')
        setLoading(false)
      }
    }

    load()

    // Runs on unmount (and on React StrictMode's dev-only remount): stop the fetch and close the socket.
    return () => {
      controller.abort()
      if (socket) {
        socket.onclose = null
        socket.close()
      }
    }
  }, [])

  // The newest quote time is when the data was last refreshed.
  const lastUpdated = quotes.length ? Math.max(...quotes.map((q) => q.updated_at)) : null

  return { quotes, loading, error, status, lastUpdated }
}
