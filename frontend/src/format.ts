const twoDecimals = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Stocks get a dollar sign; index levels are points, so they don't. */
export function formatPrice(value: number, kind: 'index' | 'stock' = 'stock') {
  return kind === 'stock' ? `$${twoDecimals.format(value)}` : twoDecimals.format(value)
}

/** e.g. "+1.23 (+0.45%)" */
export function formatChange(change: number, changePct: number) {
  const sign = change >= 0 ? '+' : '−'
  return `${sign}${twoDecimals.format(Math.abs(change))} (${sign}${twoDecimals.format(Math.abs(changePct))}%)`
}

// Market data is in New York time; showing it that way keeps daily bars on the right date
// for viewers in any time zone.
const NY = 'America/New_York'
const timeOnly = new Intl.DateTimeFormat('en-US', { timeZone: NY, hour: 'numeric', minute: '2-digit' })
const dayAndTime = new Intl.DateTimeFormat('en-US', { timeZone: NY, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const dayOnly = new Intl.DateTimeFormat('en-US', { timeZone: NY, month: 'short', day: 'numeric' })
const fullDate = new Intl.DateTimeFormat('en-US', { timeZone: NY, month: 'short', day: 'numeric', year: 'numeric' })
const monthYear = new Intl.DateTimeFormat('en-US', { timeZone: NY, month: 'short', year: 'numeric' })

/** Short axis label: the finer the bars, the finer the label. */
export function formatAxisTime(ts: number, timeframe: string) {
  const date = new Date(ts * 1000)
  if (timeframe === '1D') return timeOnly.format(date)
  if (timeframe === '5Y' || timeframe === '10Y') return monthYear.format(date)
  return dayOnly.format(date)
}

/** Tooltip label: full date, plus the time for intraday bars. */
export function formatTooltipTime(ts: number, intraday: boolean) {
  const date = new Date(ts * 1000)
  return intraday ? `${dayAndTime.format(date)} ET` : fullDate.format(date)
}
