import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatAxisTime, formatPrice, formatTooltipTime } from './format'
import type { PricePoint, Timeframe } from './types'

type Props = {
  points: PricePoint[]
  timeframe: Timeframe
  kind: 'index' | 'stock'
}

type Row = { x: number; ts: number; close: number }

const INTRADAY: Timeframe[] = ['1D', '3D', '1W']
const AXIS_COLOR = '#64748b' // slate-500
const GRID_COLOR = '#1e293b' // slate-800

/** Where to put x-axis labels: at each new trading day for multi-day intraday charts,
 * otherwise about six evenly spaced bars. */
function pickTicks(rows: Row[], timeframe: Timeframe): number[] {
  if (rows.length === 0) return []
  if (timeframe === '3D' || timeframe === '1W') {
    const day = (ts: number) => formatAxisTime(ts, timeframe)
    return rows.filter((row, i) => i === 0 || day(row.ts) !== day(rows[i - 1].ts)).map((row) => row.x)
  }
  const count = Math.min(6, rows.length)
  return Array.from({ length: count }, (_, i) => Math.round((i * (rows.length - 1)) / Math.max(1, count - 1)))
}

export function PriceChart({ points, timeframe, kind }: Props) {
  // The x-axis counts bars instead of clock time, so nights and weekends don't show up as long
  // flat gaps. Each row keeps its real timestamp for labels and the tooltip.
  const rows: Row[] = points.map((point, i) => ({ x: i, ts: point.ts, close: point.close }))
  const tsByX = new Map(rows.map((row) => [row.x, row.ts]))
  const up = rows.length > 1 && rows[rows.length - 1].close >= rows[0].close
  const intraday = INTRADAY.includes(timeframe)

  // Only the fields we read from what Recharts passes to a custom tooltip.
  function renderTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Row }> }) {
    const row = payload?.[0]?.payload
    if (!active || !row) return null
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm shadow-lg">
        <div className="text-slate-400">{formatTooltipTime(row.ts, intraday)}</div>
        <div className="font-semibold tabular-nums text-white">{formatPrice(row.close, kind)}</div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <XAxis
          dataKey="x"
          type="number"
          domain={['dataMin', 'dataMax']}
          ticks={pickTicks(rows, timeframe)}
          tickFormatter={(x: number) => {
            const ts = tsByX.get(x)
            return ts === undefined ? '' : formatAxisTime(ts, timeframe)
          }}
          stroke={AXIS_COLOR}
          tickLine={false}
          axisLine={false}
          fontSize={12}
          minTickGap={24}
        />
        <YAxis
          orientation="right"
          domain={['auto', 'auto']}
          tickFormatter={(value: number) => formatPrice(value, kind)}
          stroke={AXIS_COLOR}
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={80}
        />
        <Tooltip content={renderTooltip} cursor={{ stroke: AXIS_COLOR, strokeDasharray: '3 3' }} isAnimationActive={false} />
        <Line
          type="linear"
          dataKey="close"
          stroke={up ? '#34d399' : '#fb7185'}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: '#0f172a' }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
