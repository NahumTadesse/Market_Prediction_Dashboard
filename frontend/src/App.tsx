import { HomePage } from './pages/HomePage'
import { StockPage } from './pages/StockPage'
import { Link } from './Link'
import { usePath } from './router'
import { SearchBox } from './SearchBox'

function App() {
  const path = usePath()
  const stockMatch = path.match(/^\/stock\/([^/]+)\/?$/)

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Stock Dashboard
          </Link>
          <SearchBox />
        </header>

        {stockMatch ? (
          // key: remount the page when the symbol changes, so no state leaks between stocks.
          <StockPage key={stockMatch[1]} symbol={decodeURIComponent(stockMatch[1]).toUpperCase()} />
        ) : (
          <HomePage />
        )}
      </div>
    </main>
  )
}

export default App
