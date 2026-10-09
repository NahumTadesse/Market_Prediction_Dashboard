import { useEffect, useState } from 'react'
import type { Quote } from './types'

/** Loads the home page quotes (indexes and big stocks) once over REST. */
export function useQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch('/api/quotes', { signal: controller.signal })
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
        setQuotes(await response.json())
        setLoading(false)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load quotes')
        setLoading(false)
      }
    }

    load()

    // Runs on unmount (and on React StrictMode's dev-only remount): stop the fetch.
    return () => controller.abort()
  }, [])

  return { quotes, loading, error }
}
