import { useEffect, useState } from 'react'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Result<T> = { url: string; data?: T; error?: ApiError | Error }

/** GETs a JSON endpoint and re-fetches whenever the URL changes. While a new URL is loading,
 * the previous data stays available, so charts don't flash empty when switching timeframes. */
export function useApi<T>(url: string) {
  const [result, setResult] = useState<Result<T> | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          const body = await response.json().catch(() => null)
          throw new ApiError(response.status, body?.detail ?? `Request failed with status ${response.status}`)
        }
        setResult({ url, data: await response.json() })
      } catch (err) {
        if (controller.signal.aborted) return
        setResult({ url, error: err instanceof Error ? err : new Error('Request failed') })
      }
    }

    load()
    return () => controller.abort()
  }, [url])

  const current = result?.url === url
  return {
    data: result?.data,
    error: current ? result?.error : undefined,
    loading: !current,
  }
}
