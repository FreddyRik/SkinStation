# Deploy checklist (SkinStation — Vercel + Supabase)

Do this before the first production deploy. Do **not** commit `.env`.

## 1. Supabase

1. Confirm `DATABASE_URL` (pooler `:6543`, `?pgbouncer=true`) and `DIRECT_URL` (`:5432`) work locally:
   ```bash
   npm run db:deploy
   npm run smoke:db
   ```
2. Harden Data API surface (RLS is already on with no policies):
   ```bash
   npm run db:harden
   ```
   Or paste [`scripts/supabase-harden.sql`](scripts/supabase-harden.sql) into the Supabase SQL Editor.
3. Omit `STEAMWEBAPI_KEY` / `INSPECT_API_*` on Vercel for v1 (degraded floats).

## 2. Steam fetch proxy (recommended on Vercel)

Steam rate-limits shared Vercel egress. Deploy the Worker in [`workers/steam-proxy`](../workers/steam-proxy/README.md):

```bash
cd workers/steam-proxy
npm install
npx wrangler secret put STEAM_PROXY_SECRET
npx wrangler deploy
```

Set on Vercel (Production + Preview):

- `STEAM_PROXY_URL` — Worker URL (no trailing slash)
- `STEAM_PROXY_SECRET` — same value as the Worker secret

When both are set, inventory / vanity / profile XML / `priceoverview` go through Cloudflare. When unset, the app calls Steam directly (fine for local dev). Do **not** rely on silent direct fallback in production if the proxy is misconfigured — fix the secret instead.

## 3. Upstash (recommended for production rate limits)

1. Create a Redis database at [Upstash](https://upstash.com).
2. Copy REST URL + token into Vercel env:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Without these, the app falls back to **per-instance** in-memory limits (weaker on serverless).

## 4. Vercel project

Set **server** environment variables (Production + Preview as needed):

| Variable | Required |
| --- | --- |
| `DATABASE_URL` | Yes (pooler) |
| `DIRECT_URL` | Yes (migrations at build) |
| `UPSTASH_REDIS_REST_URL` | Recommended |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended |
| `SYNC_COOLDOWN_MS` | Optional (default 15m in code if unset) |
| `SYNC_FORCE_SECRET` | Optional; required only if you need admin force-sync via `x-sync-force-secret` header |
| `FACEIT_API_KEY` | Optional |
| `STEAM_PROXY_URL` | Recommended on Vercel — Cloudflare Worker base URL (see `workers/steam-proxy`) |
| `STEAM_PROXY_SECRET` | Recommended with URL — shared Bearer secret (Worker + Vercel) |

Build command (also in `vercel.json`):

```bash
npm run build:vercel
```

(`prisma migrate deploy && next build`)

## 5. Post-deploy smoke

1. Open the production URL over HTTPS.
2. Paste a **public** Steam profile → Load inventory.
3. Confirm inventory page, Refresh cooldown, share card, trade-up catalog.
4. Confirm `/privacy` and `/terms` reflect hosted Postgres language.

## 6. Admin force sync (optional)

Public UI no longer exposes Force. To bypass cooldown with a secret:

```bash
curl -X POST https://YOUR_DOMAIN/api/sync \
  -H "Content-Type: application/json" \
  -H "x-sync-force-secret: YOUR_SYNC_FORCE_SECRET" \
  -d '{"profileId":"…","force":true}'
```
