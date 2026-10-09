# Prediction Market Dashboard

Portfolio project: a dashboard that shows prediction markets and their prices updating live.
For now, market data comes from a **simulated price generator** in the backend, not a real API.

## Stack

- **Frontend** (`/frontend`): React + TypeScript, built with Vite, styled with Tailwind CSS.
- **Backend** (`/backend`): Python FastAPI (Python 3.10, `fastapi[standard]`), SQLAlchemy ORM.
- **Database**: SQLite (the `*.db` file is gitignored and should not be committed).

## How data flows

- **REST endpoints** serve market data (market list, market details, price history).
- **WebSocket channel** pushes live price updates to the client. The frontend subscribes
  to the socket instead of polling REST endpoints for new prices.
- The **simulated price generator** runs in the backend, produces price changes, saves
  them to SQLite and broadcasts them over the WebSocket.

## Folder layout

```
/
├── CLAUDE.md
├── .gitignore
├── backend/
│   ├── .venv/              # Python virtualenv (gitignored)
│   ├── markets.db          # SQLite database, created by the seed script (gitignored)
│   ├── requirements.txt    # pinned Python dependencies
│   └── app/
│       ├── main.py         # FastAPI app entry point; seeds the DB and starts the simulator
│       ├── database.py     # engine, session factory, Base, get_db() dependency
│       ├── models.py       # SQLAlchemy models: Market, PriceHistory
│       ├── schemas.py      # Pydantic response models: MarketOut, PricePointOut
│       ├── seed.py         # creates tables + sample markets: `python -m app.seed`
│       ├── simulator.py    # background task: nudges prices every 3s, saves, broadcasts
│       ├── connections.py  # ConnectionManager: tracks open WebSockets, broadcast()
│       └── routers/
│           ├── markets.py  # GET /api/markets, /api/markets/{id}, /api/markets/{id}/history
│           └── ws.py       # WebSocket /ws/markets (live price updates)
└── frontend/               # Vite React + TS app (not created yet)
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

API docs are served at `http://127.0.0.1:8000/docs`. Tables and sample data are created
automatically on startup (same as `python -m app.seed`).
After installing a new (approved) package, refresh the pin file with `pip freeze > requirements.txt`.

### Frontend

```bash
cd frontend
npm install
npm run dev     # Vite dev server, usually http://localhost:5173
npm run build   # type-check and production build into dist/
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
