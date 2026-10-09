import { useEffect, useState } from 'react'
import type { Market, PriceUpdateMessage } from './types'

export type ConnectionStatus = 'connecting' | 'live' | 'disconnected'

/** Loads markets over REST once, then keeps them up to date from the WebSocket. */
export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')

  useEffect(() => {
    const controller = new AbortController()
    let socket: WebSocket | null = null

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      socket = new WebSocket(`${protocol}://${window.location.host}/ws/markets`)
      socket.onopen = () => setStatus('live')
      socket.onclose = () => setStatus('disconnected')
      socket.onmessage = (event) => {
        const message: PriceUpdateMessage = JSON.parse(event.data)
        if (message.type !== 'price_update') return
        const updates = new Map(message.markets.map((m) => [m.id, m]))
        // Functional update: React passes in the latest state, so we never patch a stale copy.
        setMarkets((current) => current.map((m) => updates.get(m.id) ?? m))
      }
    }

    async function load() {
      try {
        const response = await fetch('/api/markets', { signal: controller.signal })
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
        setMarkets(await response.json())
        setLoading(false)
        // Connect only after the initial list is in state, so updates have cards to land on.
        connect()
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load markets')
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

  return { markets, loading, error, status }
}
