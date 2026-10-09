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
