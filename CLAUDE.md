# Stock Dashboard

Portfolio project: a stock dashboard where someone can look up a stock, see its price history,
see a projected range of future prices, and estimate whether an investment would gain or lose
money. Market data comes from **yfinance** (Yahoo Finance) and is cached in SQLite.

## Stack

- **Frontend** (`/frontend`): React + TypeScript, built with Vite, styled with Tailwind CSS v4,
  charts with **Recharts**. Routing is a tiny hand-rolled router (`router.ts`), not react-router.
- **Backend** (`/backend`): Python FastAPI (Python 3.10, `fastapi[standard]`), SQLAlchemy ORM,
  **yfinance** for stock and index data.
- **Database**: SQLite cache (the `*.db` file is gitignored and should not be committed).

## How data flows

- **yfinance is only called from `backend/app/market_data.py`.** Everything else goes through
  its functions, which read from the SQLite cache and only download when the data is stale:
  - Price bars are cached per (symbol, bar size). Each bar size is downloaded once at its
    longest period (5m/15m/30m: 5 days, 1d: 5 years, 1wk: 10 years) and each timeframe button
    slices what it needs.
  - Freshness while the market is open: quotes 60s, intraday bars 2 min, daily/weekly 6 hours.
    While closed, data fetched after the last close (plus a 20 min grace period) stays fresh.
  - Market hours are Mon-Fri 9:30-16:00 New York time; holidays are not handled.
- **REST endpoints** (`routers/stocks.py`) serve quotes, history, projection and backtest.
- **WebSocket** `/ws/quotes`: on connect the server sends `market_status`; the **quote poller**
  then pushes fresh home page quotes every 60s while the market is open (it skips the download
  when no client is connected). The frontend subscribes instead of polling.
- **Projection math** lives in `backend/app/projection.py` (its docstring explains it): mean and
  standard deviation of 5 years of daily log returns, scaled by n and sqrt(n) for an n-day
  horizon; 10th/50th/90th percentiles and the chance of a loss. The chart and the investment
  calculator both use the same `/projection` endpoint, so they always agree.

### API

| Endpoint | Returns |
|---|---|
| `GET /api/quotes` | home page quotes (3 indexes + 10 big stocks) with sparklines |
| `GET /api/stocks/{symbol}` | name and latest quote; 404 for unknown tickers |
| `GET /api/stocks/{symbol}/history?timeframe=1Y` | price points for one timeframe |
| `GET /api/stocks/{symbol}/projection?timeframe=1Y` | projected path + calculator multipliers |
| `GET /api/stocks/{symbol}/backtest?timeframe=1Y` | first/last price of that timeframe's chart |
| `WS /ws/quotes` | `market_status` and `quotes` messages |

Timeframes: `1D, 3D, 1W` (intraday bars), `1M, 1Y` (daily), `5Y, 10Y` (weekly). The projection
reaches as far forward as the chart reaches back (1, 3, 5, 21, 252, 1260, 2520 trading days).

## Folder layout

```
/
├── CLAUDE.md
├── .gitignore
├── backend/
│   ├── .venv/                  # Python virtualenv (gitignored)
│   ├── stocks.db               # SQLite cache, created on startup (gitignored)
│   ├── requirements.txt        # pinned Python dependencies
│   └── app/
│       ├── main.py             # FastAPI app entry point; creates tables, starts the quote poller
│       ├── database.py         # engine, session factory, Base, get_db() dependency
│       ├── models.py           # SQLAlchemy models: Quote, PriceBar, FetchLog
│       ├── schemas.py          # Pydantic response models (QuoteOut, HistoryOut, ProjectionOut, ...)
│       ├── market_data.py      # the only yfinance user: cache, freshness, market hours, home symbols
│       ├── projection.py       # projection math (returns, volatility, percentiles, chance of loss)
│       ├── quote_poller.py     # background task: refresh home quotes every 60s, broadcast
│       ├── connections.py      # ConnectionManager: tracks open WebSockets, broadcast()
│       └── routers/
│           ├── stocks.py       # /api/quotes and /api/stocks/{symbol}[/history|/projection|/backtest]
│           └── ws.py           # WebSocket /ws/quotes
└── frontend/                   # Vite React + TS app
    ├── index.html              # HTML shell, page title
    ├── vite.config.ts          # React + Tailwind plugins; dev proxy /api and /ws → backend :8000
    ├── package.json
    └── src/
        ├── main.tsx            # React entry point
        ├── App.tsx             # header + search; picks HomePage or StockPage from the URL
        ├── router.ts           # navigate(), usePath(), stockPath()
        ├── Link.tsx            # <a> that navigates without a reload
        ├── pages/
        │   ├── HomePage.tsx    # status pill, index row, stock grid
        │   └── StockPage.tsx   # quote header, chart + timeframes, projection summary, calculator
        ├── useQuotes.ts        # hook: GET /api/quotes once, then live updates from /ws/quotes
        ├── useApi.ts           # hook: GET JSON, refetch on URL change, keep old data while loading
        ├── QuoteCard.tsx       # home card: price, daily change, sparkline
        ├── Sparkline.tsx       # tiny Recharts line with a previous-close reference line
        ├── SearchBox.tsx       # ticker search → /stock/XYZ
        ├── PriceChart.tsx      # price history + projection band (x-axis counts bars, not time)
        ├── TimeframeButtons.tsx
        ├── InvestmentCalculator.tsx  # outcomes, chance of loss, backtest
        ├── Disclaimer.tsx      # "not financial advice" note
        ├── format.ts           # price/percent/date formatting (dates in New York time)
        ├── types.ts            # types that mirror the backend schemas
        └── index.css           # `@import "tailwindcss";` (Tailwind v4, no config file)
```

Update this tree when new top-level folders or key entry points are added.

## Running the project

### Backend

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt   # only needed after dependencies change
fastapi dev app/main.py           # dev server with auto-reload on http://127.0.0.1:8000
```

API docs are served at `http://127.0.0.1:8000/docs`. Tables are created automatically on
startup; the cache fills on first request (needs internet access for yfinance). To reset the
cache, stop the server and delete `backend/stocks.db`.
After installing a new (approved) package, refresh the pin file with `pip freeze > requirements.txt`.

### Frontend

```bash
cd frontend
npm install
npm run dev     # Vite dev server, usually http://localhost:5173
npm run build   # type-check and production build into dist/
npm run lint    # oxlint
```

Run the backend and frontend in separate terminals during development.

## Rules for working in this repo

1. **Keep changes small.** Do one focused task at a time. Don't refactor or touch
   unrelated code unless asked.
2. **Explain after each task.** When a task is done, summarize what changed (which files)
   and why.
3. **No new libraries without asking.** Before adding any npm package or Python package
   (including dev tools), ask first and say why it's needed. Use what is already installed
   when possible.
4. **NEVER credit Claude in git history.** Do not add `Co-Authored-By: Claude ...` or any
   other Claude/Anthropic attribution to commit messages or PR descriptions. All commits
   are authored by Nahum Tadesse only.
