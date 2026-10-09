import { useState, type FormEvent } from 'react'
import { navigate, stockPath } from './router'

export function SearchBox() {
  const [value, setValue] = useState('')

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const symbol = value.trim().toUpperCase()
    if (!symbol) return
    navigate(stockPath(symbol))
    setValue('')
  }

  return (
    <form role="search" onSubmit={onSubmit} className="flex gap-2">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ticker, e.g. NFLX"
        aria-label="Ticker symbol"
        maxLength={15}
        className="w-44 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500 focus:border-slate-400 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-lg bg-slate-200 px-4 py-2 font-medium text-slate-900 transition hover:bg-white"
      >
        Search
      </button>
    </form>
  )
}
