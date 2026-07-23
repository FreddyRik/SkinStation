# CS2 Inventory Tracker

Local-first Counter-Strike 2 inventory tracker. Paste a public Steam profile, sync skins, floats, and market prices, and track portfolio value over time.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- SQLite via Prisma
- Steam Community inventory
- Local CS2 inspect decode (`@csfloat/cs2-inspect-serializer`) for masked inspect links
- Optional self-hosted inspect API (`INSPECT_API_URL`) for classic / unresolved links
- Buff163 prices via CSGOTrader + Steam Market priceoverview

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

## Floats without Steamwebapi

Steam's public inventory JSON usually returns `%propid:N%` placeholders, which cannot be decoded locally. The tracker uses this cascade:

1. **Local decode** of masked/hex inspect links (`@csfloat/cs2-inspect-serializer`)
2. **`INSPECT_API_URL`** — CSGOFloat-compatible self-hosted inspect service (`GET ?url=…`)
3. **Optional `STEAMWEBAPI_KEY`** — last-resort fallback only
4. **Previous DB floats** preserved across syncs when enrichment fails

Point `INSPECT_API_URL` at a self-hosted [CSGOFloat](https://github.com/Step7750/CSGOFloat)-style bot (or any compatible GC inspect service). Public CSFloat/CSGOFloat cloud endpoints are currently rate-limited by Valve.

## Known limitations

### Steam Market prices
Steam rate-limits `priceoverview`. The sync fetches unique item names (prioritized by Buff163 value), with retries and backoff. If Steam throttles mid-sync, the next Refresh continues filling gaps from cache.

### Floats & stickers
Without `INSPECT_API_URL` (or optional Steamwebapi), only masked inspect links get floats. Stickers are still parsed from Steam description HTML when present.

### Historical prices (last 6 months)
The chart shows **your portfolio snapshots** from each successful sync (filtered to the last 6 months). It does **not** backfill market history before you started tracking.

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | SQLite path (relative to `prisma/`) |
| `SYNC_COOLDOWN_MS` | `180000` | Minimum ms between refreshes per profile |
| `INSPECT_API_URL` | — | Preferred self-hosted inspect/float API base URL |
| `INSPECT_API_KEY` | — | Optional API key / bearer for the inspect service |
| `INSPECT_API_MAX_FETCHES` | `120` | Max remote inspect calls per sync |
| `INSPECT_API_DELAY_MS` | `1100` | Delay between inspect calls |
| `STEAMWEBAPI_KEY` | — | Optional last-resort float fallback |
| `FACEIT_API_KEY` | — | Optional official FACEIT ranks |
