import { useState } from 'react'
import { Disclaimer } from '../Disclaimer'
import { formatChange, formatPercent, formatPrice } from '../format'
import { Link } from '../Link'
import { PriceChart } from '../PriceChart'
import { TimeframeButtons } from '../TimeframeButtons'
import type { History, Projection, Quote, Timeframe } from '../types'
import { ApiError, useApi } from '../useApi'

const backLink = (
  <Link to="/" className="text-sm text-slate-400 hover:text-white">
    ← Back to dashboard
  </Link>
)

export function StockPage({ symbol }: { symbol: string }) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1Y')
  const base = `/api/stocks/${encodeURIComponent(symbol)}`
  const quote = useApi<Quote>(base)
  const history = useApi<History>(`${base}/history?timeframe=${timeframe}`)
  const projection = useApi<Projection>(`${base}/projection?timeframe=${timeframe}`)

  if (quote.error) {
    const notFound = quote.error instanceof ApiError && quote.error.status === 404
    return (
      <>
        {backLink}
        <p className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4 text-slate-300">
          {notFound
            ? `Couldn't find any data for "${symbol}". Check the ticker and try again.`
            : `Couldn't load ${symbol}: ${quote.error.message}`}
        </p>
      </>
    )
  }

  if (!quote.data) {
    return (
      <>
        {backLink}
        <p className="mt-6 text-slate-400">Loading {symbol}…</p>
      </>
    )
  }

  const q = quote.data
  const up = q.change >= 0
  const points = history.data?.points ?? []
  // How much the price moved over the selected timeframe (first to last point on the chart).
  const periodChange = points.length > 1 ? (points[points.length - 1].close / points[0].close - 1) * 100 : null

  return (
    <>
      {backLink}

      <header className="mt-4 mb-6">
        <h2 className="text-2xl font-bold text-white">
          {q.symbol} <span className="font-normal text-slate-400">{q.name}</span>
        </h2>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
          <span className="text-4xl font-semibold tabular-nums text-white">{formatPrice(q.price, q.kind)}</span>
          <span className={`tabular-nums ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
            {up ? '▲' : '▼'} {formatChange(q.change, q.change_pct)} today
          </span>
        </div>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TimeframeButtons value={timeframe} onChange={setTimeframe} />
          {periodChange !== null && !history.loading && (
            <span className={`text-sm tabular-nums ${periodChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {periodChange >= 0 ? '+' : '−'}
              {Math.abs(periodChange).toFixed(2)}% over {timeframe}
            </span>
          )}
        </div>

        {/* Keep the old chart visible but dimmed while a new timeframe loads. */}
        <div className={`h-96 transition-opacity ${history.loading || projection.loading ? 'opacity-50' : ''}`}>
          {history.error ? (
            <p className="text-slate-400">Couldn't load price history: {history.error.message}</p>
          ) : points.length > 0 ? (
            <PriceChart
              points={points}
              interval={history.data!.interval}
              timeframe={history.data!.timeframe}
              kind={q.kind}
              // Only draw a projection that belongs to the history on screen.
              projection={projection.data?.timeframe === history.data!.timeframe ? projection.data : undefined}
            />
          ) : (
            <p className="text-slate-400">Loading chart…</p>
          )}
        </div>

        {projection.data && (
          <p className="mt-4 text-sm text-slate-400">
            Projection for the next {timeframe}, based on {projection.data.history_years} years of daily prices: average
            return {formatPercent(projection.data.annual_return)} per year, volatility{' '}
            {formatPercent(projection.data.annual_volatility)} per year.
          </p>
        )}
        {projection.error && <p className="mt-4 text-sm text-slate-400">No projection: {projection.error.message}.</p>}
        <Disclaimer />
      </section>
    </>
  )
}
