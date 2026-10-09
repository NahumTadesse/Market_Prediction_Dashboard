import { useState } from 'react'
import { Disclaimer } from './Disclaimer'
import { formatPercent, formatPrice, formatTooltipTime, isIntraday } from './format'
import { TimeframeButtons } from './TimeframeButtons'
import type { Backtest, Projection, Timeframe } from './types'
import { useApi } from './useApi'

const MAX_AMOUNT = 1_000_000_000_000

type Props = {
  symbol: string
  initialTimeframe: Timeframe
}

/** "+$123.45 (+12.3%)" relative to the amount put in. */
function gainText(amount: number, value: number) {
  const gain = value - amount
  const sign = gain >= 0 ? '+' : '−'
  return `${sign}${formatPrice(Math.abs(gain))} (${sign}${formatPercent(Math.abs(gain / amount))})`
}

function Outcome({ label, note, amount, value }: { label: string; note: string; amount: number; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
      <div className="text-sm text-slate-400">
        {label} <span className="text-slate-500">· {note}</span>
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-white">{formatPrice(value)}</div>
      <div className={`text-sm tabular-nums ${value >= amount ? 'text-emerald-400' : 'text-rose-400'}`}>
        {gainText(amount, value)}
      </div>
    </div>
  )
}

export function InvestmentCalculator({ symbol, initialTimeframe }: Props) {
  const [amountText, setAmountText] = useState('1000')
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe)
  const base = `/api/stocks/${encodeURIComponent(symbol)}`
  // Same endpoint the chart uses, so the calculator and the chart always agree.
  const projection = useApi<Projection>(`${base}/projection?timeframe=${timeframe}`)
  const backtest = useApi<Backtest>(`${base}/backtest?timeframe=${timeframe}`)

  const amount = Number(amountText.replace(/[$,\s]/g, ''))
  const amountValid = amountText.trim() !== '' && Number.isFinite(amount) && amount > 0 && amount <= MAX_AMOUNT
  const p = projection.data?.timeframe === timeframe ? projection.data : undefined
  const b = backtest.data?.timeframe === timeframe ? backtest.data : undefined
  const intraday = isIntraday(timeframe)

  return (
    <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-lg font-semibold text-white">Investment calculator</h3>

      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Amount
          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950 px-3 focus-within:border-slate-400">
            <span className="text-slate-500">$</span>
            <input
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
              inputMode="decimal"
              className="w-36 bg-transparent px-1 py-2 text-white tabular-nums focus:outline-none"
            />
          </div>
        </label>
        <div className="flex flex-col gap-1 text-sm text-slate-400">
          Time horizon
          <TimeframeButtons value={timeframe} onChange={setTimeframe} label="Time horizon" />
        </div>
      </div>

      {!amountValid ? (
        <p className="mt-4 text-sm text-slate-400">Enter an amount greater than $0 to see projections.</p>
      ) : (
        <div className={`mt-4 transition-opacity ${projection.loading || backtest.loading ? 'opacity-50' : ''}`}>
          {projection.error && <p className="text-sm text-slate-400">No projection: {projection.error.message}.</p>}
          {p && (
            <>
              <p className="text-sm text-slate-400">
                If you invest {formatPrice(amount)} now, after {timeframe} it could be worth:
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <Outcome label="Pessimistic" note="1 in 10 chance of worse" amount={amount} value={amount * p.pessimistic} />
                <Outcome label="Likely" note="middle estimate" amount={amount} value={amount * p.likely} />
                <Outcome label="Optimistic" note="1 in 10 chance of better" amount={amount} value={amount * p.optimistic} />
              </div>
              <p className="mt-3 text-sm text-slate-300">
                Chance of ending with less than you put in:{' '}
                <span className="font-semibold tabular-nums text-white">{formatPercent(p.prob_loss)}</span>
              </p>
            </>
          )}

          {backtest.error && <p className="mt-4 text-sm text-slate-400">No backtest: {backtest.error.message}.</p>}
          {b && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <h4 className="text-sm font-medium text-slate-300">Backtest with real past prices</h4>
              <p className="mt-1 text-slate-300">
                {formatPrice(amount)} invested on {formatTooltipTime(b.start_ts, intraday)} (at{' '}
                {formatPrice(b.start_price)}) would be worth{' '}
                <span className="font-semibold tabular-nums text-white">{formatPrice(amount * b.multiplier)}</span> on{' '}
                {formatTooltipTime(b.end_ts, intraday)}{' '}
                <span className={b.multiplier >= 1 ? 'text-emerald-400' : 'text-rose-400'}>
                  {gainText(amount, amount * b.multiplier)}
                </span>
                .
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Uses split- and dividend-adjusted prices, so it roughly includes reinvested dividends.
              </p>
            </div>
          )}
        </div>
      )}

      <Disclaimer />
    </section>
  )
}
