# Bajada Auction Desk

Mobile-first live auction assistant for **Team Padel Premier**. Your team is **Bajada Batallions**.

- Budget: **R650,000**
- Roster: **12** (5 retained, **7** to buy)
- Base price: Playtomic level × **R10,000**
- Persistence: `data/state.json` via `/api/state` (no database)
- Player pool: `data/players.json`

## Run

```bash
cp .env.example .env.local
# add your OpenAI key to .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone (same Wi-Fi) via your machine’s local IP.

Without `OPENAI_API_KEY`, the app still works and uses a local fallback bid ceiling.

## Convert Excel → `players.json`

The converter reads `Team Padel Auction WIP.xlsx` and writes `data/players.json`.

Expected columns on the first sheet:

| Column | Header |
| --- | --- |
| Name | `Full name (Playtomic name)` |
| Level | `Playtomic Level` |

Each output object is:

```json
{ "name": "Liam Day", "level": 4.5 }
```

```bash
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python scripts/convert_players.py
```

Or pass another workbook:

```bash
.venv/bin/python scripts/convert_players.py "/path/to/export.xlsx"
```

Rules the script applies:

- Skips blank names / missing levels
- Dedupes by name (keeps the first row)
- Sorts by level descending
