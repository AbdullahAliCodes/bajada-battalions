# Bajada Auction Desk

Mobile-first live auction assistant for **Team Padel Premier**. Your team is **Bajada Batallions**.

- Budget: **R650,000**
- Roster: **11** (5 retained, **6** to buy)
- Base price: Playtomic level × **R10,000**
- Persistence: Supabase Postgres via `/api/state`
- Player pool: `players` table (seeded from `data/players.json`)

## Supabase (required for Vercel)

1. Create a project at [supabase.com](https://supabase.com).
2. Schema:
   - **Reset and start clean:** run `scripts/reset-and-create.sql`.
   - **Empty project (no old tables):** run `scripts/schema.sql`.
   - **Old tables with data to keep:** run `scripts/migrate-existing.sql`.
3. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server writes and seed; keep this off the client)
   - `OPENAI_API_KEY` (optional; fallback advice works without it)
4. Seed from the current Excel export and `data/state.json`:

```bash
npm run seed
```

## Run

```bash
cp .env.example .env.local
npm install
npm run seed
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
