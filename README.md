# CS2 Inventory Tracker

Local-first Counter-Strike 2 inventory tracker. Paste a public Steam profile, sync skins, floats, and market prices, and track portfolio value over time.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- SQLite via Prisma
- Steam Community inventory
- Local CS2 inspect decode (`@csfloat/cs2-inspect-serializer`) for masked inspect links
- Skinport catalog prices + Steam Market priceoverview

## Setup

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Set your CS2 inventory to **Public** on Steam.
2. Paste a Steam profile URL or SteamID64 on the home page.
3. Wait for the first sync (Steam Market prices are fetched one-by-one and can take several minutes).
4. Use **Refresh** to re-scan (3-minute cooldown by default; **Force** bypasses it).

## Known limitations

### Steam Market prices
Steam rate-limits `priceoverview`. The sync now fetches **all unique** item names in your inventory (prioritized by Skinport value), with retries and backoff. If Steam throttles mid-sync, the next Refresh continues filling gaps from cache.

### Floats & stickers
Float/pattern come from **masked** CS2 inspect links decoded locally (no remote float API). Steam often returns broken `%propid:N%` placeholders on public inventory JSON, so floats may be missing for many weapons. Stickers are still parsed from Steam description HTML when present.

Remote CSFloat/CSGOFloat inspect bots are currently blocked/rate-limited by Valve.

### Historical prices (last 6 months)
The chart shows **your portfolio snapshots** from each successful sync (filtered to the last 6 months). It does **not** backfill market history before you started tracking.

True 6-month **market** history for each skin needs either:
- A Steam session cookie (`pricehistory` endpoint), or
- A paid price API (Steamwebapi, SteamApis, cs2.sh, etc.)

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | SQLite path (relative to `prisma/`) |
| `SYNC_COOLDOWN_MS` | `180000` | Minimum ms between refreshes per profile |
