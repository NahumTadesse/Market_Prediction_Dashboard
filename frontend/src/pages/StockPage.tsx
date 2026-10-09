import { Link } from '../Link'

export function StockPage({ symbol }: { symbol: string }) {
  return (
    <>
      <Link to="/" className="text-sm text-slate-400 hover:text-white">
        ← Back to dashboard
      </Link>
      <h2 className="mt-4 text-2xl font-bold text-white">{symbol}</h2>
      <p className="mt-2 text-slate-400">Price chart and projections are coming in the next phases.</p>
    </>
  )
}
