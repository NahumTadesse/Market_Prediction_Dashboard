import { formatChange, formatPrice } from './format'
import { Link } from './Link'
import { stockPath } from './router'
import { Sparkline } from './Sparkline'
import type { Quote } from './types'

export function QuoteCard({ quote }: { quote: Quote }) {
  const up = quote.change >= 0

  return (
    <Link
      to={stockPath(quote.symbol)}
      className="block rounded-xl border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-600 focus-visible:border-slate-400 focus-visible:outline-none"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-white">{quote.symbol}</span>
        <span className="truncate text-sm text-slate-400">{quote.name}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-white">{formatPrice(quote.price, quote.kind)}</div>
      <div className={`text-sm tabular-nums ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
        {up ? '▲' : '▼'} {formatChange(quote.change, quote.change_pct)}
      </div>
      <div className="mt-3">
        <Sparkline values={quote.sparkline} prevClose={quote.prev_close} />
      </div>
    </Link>
  )
}
