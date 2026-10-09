import { QuoteCard } from '../QuoteCard'
import { useQuotes } from '../useQuotes'

export function HomePage() {
  const { quotes, loading, error } = useQuotes()
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
