import { QuoteCard } from '../QuoteCard'
import { useQuotes, type ConnectionStatus } from '../useQuotes'

const statusStyles: Record<ConnectionStatus, { label: string; dot: string }> = {
  connecting: { label: 'Connecting', dot: 'bg-amber-400' },
  live: { label: 'Live', dot: 'bg-emerald-400' },
  closed: { label: 'Market closed', dot: 'bg-slate-500' },
  disconnected: { label: 'Disconnected', dot: 'bg-rose-500' },
}

export function HomePage() {
  const { quotes, loading, error, status, lastUpdated } = useQuotes()
  const { label, dot } = statusStyles[status]
  const indexes = quotes.filter((q) => q.kind === 'index')
  const stocks = quotes.filter((q) => q.kind === 'stock')

  if (loading) return <p className="text-slate-400">Loading quotes…</p>
  if (error) {
    return (
      <p className="rounded-lg border border-rose-900 bg-rose-950 p-4 text-rose-300">
        Couldn't load quotes: {error}. Is the backend running on port 8000?
      </p>
    )
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          {label}
        </span>
        {lastUpdated && <span>Updated {new Date(lastUpdated * 1000).toLocaleTimeString()}</span>}
      </div>
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-200">Indexes</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {indexes.map((quote) => (
            <QuoteCard key={quote.symbol} quote={quote} />
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-200">Stocks</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {stocks.map((quote) => (
            <QuoteCard key={quote.symbol} quote={quote} />
          ))}
        </div>
      </section>
    </>
  )
}
