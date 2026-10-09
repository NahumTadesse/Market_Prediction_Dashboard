import { Line, LineChart, ReferenceLine, ResponsiveContainer, YAxis } from 'recharts'

type Props = {
  values: number[]
  prevClose: number
}

/** Tiny chart of the latest session. The dashed line is the previous close, so the line ends
 * above it on an up day and below it on a down day. */
export function Sparkline({ values, prevClose }: Props) {
  const data = values.map((value, i) => ({ i, value }))
  const up = values.length > 0 && values[values.length - 1] >= prevClose
  // Keep the previous close inside the visible range, otherwise its line could fall off the chart.
  const domain = [Math.min(prevClose, ...values), Math.max(prevClose, ...values)]

  return (
    <div className="h-12 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <YAxis hide domain={domain} />
          <ReferenceLine y={prevClose} stroke="#475569" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="value"
            stroke={up ? '#34d399' : '#fb7185'}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
