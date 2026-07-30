# SkinStation

Your one-stop for CS2 inventory tracking, the skin catalog, and trade-up odds.

Track a public Steam inventory, browse the live skin catalog, and run trade-up odds — all in one place. No Steam login; only **public** inventories work. Data is stored in **PostgreSQL** (Supabase for hosted / Vercel).

Not affiliated with Valve or Steam. CS2 trademarks and assets belong to Valve Corporation.

## What you get

### Inventory

- Look up a public Steam profile from the home page or `/inventory`
- Buff163 (via CSGOTrader) + Steam Market prices, with a Buff/Steam display toggle and USD/EUR
- Search, filters (StatTrak, Souvenir, knives/gloves, stickers), sort, grid/list views
- Portfolio total and sync-snapshot chart (7D / 30D / 90D / 1Y / All)
- Optional FACEIT level and Leetify rating badges
- CSV / JSON export
- **SkinStation Wrapped** share cards at `/share/[id]` (theme + price source; PNG export)

### Skin Database

- Browse the live CS2 item catalog at `/database` (skins, cases, stickers, agents, and more)
- Item detail pages with wear bands, phases, and Buff/Steam market links
- Collection pages at `/collections/[id]`

### Trade-up Calculator

- Build contracts from a linked inventory or a sandbox at `/tradeup`
- Outcome odds, predicted floats, and expected value
- Supports standard 10-slot contracts and 5-Covert knife / glove contracts

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- Prisma 6 + PostgreSQL (Supabase for production)
- Local CS2 inspect decode (`@vlydev/cs2-masked-inspect` + `@csfloat/cs2-inspect-serializer`) for masked/hybrid inspect links
- Optional self-hosted inspect API (`INSPECT_API_URL`) for classic / unresolved links
- Buff163 prices via CSGOTrader + Steam Market `priceoverview` gap-fill
- Optional Upstash Redis for distributed rate limits on Vercel

Internals: see [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Setup

1. Create a [Supabase](https://supabase.com) project (Postgres).
2. Copy `.env.example` → `.env` and set:
   - `DATABASE_URL` — **Transaction pooler** URI (port `6543`, often with `?pgbouncer=true`)
   - `DIRECT_URL` — **Direct** URI (port `5432`) for migrations
3. Install and migrate:

```bash
npm install
npm run db:deploy
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

### Vercel (when you deploy)

See [`docs/DEPLOY.md`](docs/DEPLOY.md) for the full checklist (Upstash, `db:harden`, post-deploy smoke).

Build command:

```bash
npm run build:vercel
```

Omit `INSPECT_API_*` and `STEAMWEBAPI_KEY` for v1 — floats degrade gracefully; inventory + prices still work.

## Usage

1. Set your CS2 inventory to **Public** on Steam.
2. Paste a Steam profile URL or SteamID64 on the home page or `/inventory`.
3. Wait for the first sync (Steam Market gap-fill can take a bit on large inventories).
4. Use **Refresh** to re-scan. Cooldown is `SYNC_COOLDOWN_MS` (`.env.example` uses `180000` / 3 minutes; if unset, the app defaults to 15 minutes). Public UI has no Force button — admin override needs `SYNC_FORCE_SECRET` (see deploy docs).
5. Use the nav for **Skin Database** and **Trade-up**.

## Floats without Steamwebapi

Steam's public inventory JSON usually returns `%propid:N%` placeholders, which cannot be decoded locally. SkinStation uses this cascade:

1. **Local decode** of masked/hex and hybrid `S…A…D<hex>` inspect links (`@vlydev/cs2-masked-inspect`, with `@csfloat/cs2-inspect-serializer` fallback)
2. **`INSPECT_API_URL`** — CSGOFloat-compatible self-hosted inspect service (`GET ?url=…`)
3. **Optional `STEAMWEBAPI_KEY`** — last-resort fallback only
4. **Previous DB floats** preserved across syncs when enrichment fails

Without remote float providers (typical Vercel v1 setup), many weapon floats stay empty. Stickers are still parsed from Steam description HTML when present.

Point `INSPECT_API_URL` at a self-hosted [CSGOFloat](https://github.com/Step7750/CSGOFloat)-style bot (or any compatible GC inspect service) when you want better float coverage.

## Known limitations

### Steam Market prices

Steam rate-limits `priceoverview`. The sync fetches unique item names missing from the CSGOTrader catalog, with retries and backoff. If Steam throttles mid-sync, the next Refresh continues filling gaps from cache. Missing prices show as `—` and never hard-fail the sync.

### Floats & stickers

Without `INSPECT_API_URL` (or optional Steamwebapi), only masked/hybrid inspect links get floats (Steam public inventory usually only has `%propid` placeholders). Stickers are still parsed from Steam description HTML when present.

### Portfolio chart

The chart shows **your portfolio snapshots** from each successful sync (7D / 30D / 90D / 1Y / All). It does **not** backfill market history from before you started tracking.

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Supabase **pooled** Postgres URL (runtime) |
| `DIRECT_URL` | Yes | Supabase **direct** Postgres URL (migrations) |
| `SYNC_COOLDOWN_MS` | No | Minimum ms between refreshes per profile (`.env.example`: `180000`; code default if unset: 15 minutes) |
| `SYNC_FORCE_SECRET` | No | Enables admin force-sync via `x-sync-force-secret` header (not exposed in UI) |
| `UPSTASH_REDIS_REST_URL` | No | Recommended on Vercel for shared rate limits |
| `UPSTASH_REDIS_REST_TOKEN` | No | Pair with Upstash REST URL |
| `INSPECT_API_URL` | No | Preferred self-hosted inspect/float API base URL |
| `INSPECT_API_KEY` | No | Optional API key / bearer for the inspect service |
| `INSPECT_API_MAX_FETCHES` | No | Max remote inspect calls per sync (default `120`) |
| `INSPECT_API_DELAY_MS` | No | Delay between inspect calls (default `1100`) |
| `STEAMWEBAPI_KEY` | No | Optional last-resort float fallback |
| `FACEIT_API_KEY` | No | Optional official FACEIT ranks (otherwise Leetify public data may fill in) |
| `STEAM_PROXY_URL` | No | Cloudflare Worker URL for Steam Community fetches (recommended on Vercel) |
| `STEAM_PROXY_SECRET` | No | Bearer secret shared with the Worker |

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js on port 3001 |
| `npm run build` | Production build |
| `npm run build:vercel` | `prisma migrate deploy && next build` |
| `npm run db:deploy` | `prisma migrate deploy` (CI / Vercel / shared DBs) |
| `npm run db:migrate` | `prisma migrate dev` (local schema changes) |
| `npm run smoke:db` | Connectivity + schema smoke check against configured Postgres |
| `npm run smoke:steam-proxy` | Unit checks for Steam proxy config / error mapping |
| `npm run db:harden` | Revoke Data API grants / `rls_auto_enable` EXECUTE (Supabase) |
| `npm run test:inspect-decode` | Probe local masked/hybrid float decode |
