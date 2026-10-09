import type { Timeframe } from './types'

const TIMEFRAMES: Timeframe[] = ['1D', '3D', '1W', '1M', '1Y', '5Y', '10Y']

type Props = {
  value: Timeframe
  onChange: (timeframe: Timeframe) => void
}

export function TimeframeButtons({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Timeframe" className="flex flex-wrap gap-1">
      {TIMEFRAMES.map((timeframe) => (
        <button
          key={timeframe}
          type="button"
          aria-pressed={timeframe === value}
          onClick={() => onChange(timeframe)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            timeframe === value ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          {timeframe}
        </button>
      ))}
    </div>
  )
}
