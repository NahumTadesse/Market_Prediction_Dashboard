import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatAxisTime, formatPrice, formatTooltipTime } from './format'
import type { PricePoint, Projection, Timeframe } from './types'

type Props = {
  points: PricePoint[]
  interval: string
  timeframe: Timeframe
  kind: 'index' | 'stock'
  projection?: Projection
}

// One row per x position. History rows have `close`; projection rows have `expected` and
// `band` ([low, high], which Recharts draws as a shaded range). The last history row has both,
// so the projection starts exactly where the price line ends.
type Row = { x: number; ts: number; close?: number; expected?: number; band?: [number, number] }

const INTRADAY: Timeframe[] = ['1D', '3D', '1W']
// How many bars make up one trading day, to place projection points on the bar-count x-axis.
const BARS_PER_DAY: Record<string, number> = { '5m': 78, '15m': 26, '30m': 13, '1d': 1, '1wk': 1 / 5 }

const AXIS_COLOR = '#64748b' // slate-500
const GRID_COLOR = '#1e293b' // slate-800
const UP_COLOR = '#34d399' // emerald-400
const DOWN_COLOR = '#fb7185' // rose-400
const PROJECTION_COLOR = '#38bdf8' // sky-400

function buildRows(points: PricePoint[], interval: string, projection?: Projection): Row[] {
  const rows: Row[] = points.map((point, i) => ({ x: i, ts: point.ts, close: point.close }))
  if (!projection || rows.length === 0) return rows

  const last = rows[rows.length - 1]
  const barsPerDay = BARS_PER_DAY[interval] ?? 1
  for (const p of projection.points) {
    if (p.days_ahead === 0) {
      Object.assign(last, { expected: p.expected, band: [p.low, p.high] })
    } else {
      rows.push({ x: last.x + p.days_ahead * barsPerDay, ts: p.ts, expected: p.expected, band: [p.low, p.high] })
    }
  }
  return rows
}

/** Where to put x-axis labels: at each new trading day for multi-day intraday charts,
 * otherwise about seven evenly spaced positions across the whole chart. */
function pickTicks(rows: Row[], timeframe: Timeframe): number[] {
  if (rows.length === 0) return []
  if (timeframe === '3D' || timeframe === '1W') {
    const day = (ts: number) => formatAxisTime(ts, timeframe)
    return rows.filter((row, i) => i === 0 || day(row.ts) !== day(rows[i - 1].ts)).map((row) => row.x)
  }
  const maxX = rows[rows.length - 1].x
  const ticks = new Set<number>()
  for (let i = 0; i <= 6; i++) {
    const target = (i * maxX) / 6
    // Snap to the nearest real row, so every label has a timestamp to show.
    const nearest = rows.reduce((best, row) => (Math.abs(row.x - target) < Math.abs(best.x - target) ? row : best))
    ticks.add(nearest.x)
  }
  return [...ticks]
}

export function PriceChart({ points, interval, timeframe, kind, projection }: Props) {
  // The x-axis counts bars instead of clock time, so nights and weekends don't show up as long
  // flat gaps. Each row keeps its real timestamp for labels and the tooltip.
  const rows = buildRows(points, interval, projection)
  const tsByX = new Map(rows.map((row) => [row.x, row.ts]))
  const up = points.length > 1 && points[points.length - 1].close >= points[0].close
  const intraday = INTRADAY.includes(timeframe)
  const todayX = points.length - 1

  // Only the fields we read from what Recharts passes to a custom tooltip.
  function renderTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Row }> }) {
    const row = payload?.[0]?.payload
    if (!active || !row) return null
    const isFuture = row.close === undefined
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm shadow-lg">
        <div className="text-slate-400">
          {isFuture ? `≈ ${formatTooltipTime(row.ts, intraday)} (projected)` : formatTooltipTime(row.ts, intraday)}
        </div>
        {row.close !== undefined && <div className="font-semibold tabular-nums text-white">{formatPrice(row.close, kind)}</div>}
        {isFuture && row.expected !== undefined && row.band && (
          <>
            <div className="tabular-nums text-white">Expected {formatPrice(row.expected, kind)}</div>
            <div className="tabular-nums text-slate-400">
              Likely {formatPrice(row.band[0], kind)} – {formatPrice(row.band[1], kind)}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Legend, so the projection lines aren't identified by color alone. */}
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: up ? UP_COLOR : DOWN_COLOR }} />
          Price
        </li>
        {projection && (
          <>
            <li className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed" style={{ borderColor: PROJECTION_COLOR }} />
              Expected
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm" style={{ background: PROJECTION_COLOR, opacity: 0.3 }} />
              Likely range (80% of outcomes)
            </li>
          </>
        )}
      </ul>
      <div className="min-h-0 flex-1">
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
            {projection && (
              <>
                <Area
                  dataKey="band"
                  stroke="none"
                  fill={PROJECTION_COLOR}
                  fillOpacity={0.15}
                  activeDot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="expected"
                  stroke={PROJECTION_COLOR}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                <ReferenceLine
                  x={todayX}
                  stroke={AXIS_COLOR}
                  label={{ value: 'Now', position: 'insideTopLeft', fill: AXIS_COLOR, fontSize: 12 }}
                />
              </>
            )}
            <Line
              type="linear"
              dataKey="close"
              stroke={up ? UP_COLOR : DOWN_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#0f172a' }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
