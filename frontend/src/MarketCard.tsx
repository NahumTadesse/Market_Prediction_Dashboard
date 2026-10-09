import type { Market } from './types'

const volumeFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

// Prices are 0-1; show them the way prediction markets usually do, in cents.
function cents(price: number) {
  return `${Math.round(price * 100)}¢`
}

export function MarketCard({ market }: { market: Market }) {
  return (
    <article className="flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div>
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{market.category}</p>
        <h2 className="mt-1 leading-snug font-semibold text-white">{market.question}</h2>
      </div>
      <div className="flex gap-3">
        <div className="flex-1 rounded-lg bg-emerald-500/10 px-3 py-2">
          <p className="text-xs text-emerald-400">Yes</p>
          <p className="text-xl font-semibold text-emerald-300 tabular-nums">{cents(market.yes_price)}</p>
        </div>
        <div className="flex-1 rounded-lg bg-rose-500/10 px-3 py-2">
          <p className="text-xs text-rose-400">No</p>
          <p className="text-xl font-semibold text-rose-300 tabular-nums">{cents(market.no_price)}</p>
        </div>
      </div>
      <p className="text-sm text-slate-400 tabular-nums">{volumeFormat.format(market.volume)} volume</p>
    </article>
  )
}
