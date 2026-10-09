import { MarketCard } from './MarketCard'
import { useMarkets, type ConnectionStatus } from './useMarkets'

const statusStyles: Record<ConnectionStatus, { label: string; dot: string }> = {
  connecting: { label: 'Connecting', dot: 'bg-amber-400' },
  live: { label: 'Live', dot: 'bg-emerald-400' },
  disconnected: { label: 'Disconnected', dot: 'bg-rose-500' },
}

function App() {
  const { markets, loading, error, status } = useMarkets()
  const { label, dot } = statusStyles[status]

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Prediction Market Dashboard
          </h1>
          {!loading && !error && (
            <span className="flex items-center gap-2 text-sm text-slate-400">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              {label}
            </span>
          )}
        </header>

        {loading && <p className="text-slate-400">Loading markets…</p>}
        {error && (
          <p className="rounded-lg border border-rose-900 bg-rose-950 p-4 text-rose-300">
            Couldn't load markets: {error}. Is the backend running on port 8000?
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      </div>
    </main>
  )
}

export default App
