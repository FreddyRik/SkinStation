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

## 2. Upstash (recommended for production rate limits)

1. Create a Redis database at [Upstash](https://upstash.com).
2. Copy REST URL + token into Vercel env:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Without these, the app falls back to **per-instance** in-memory limits (weaker on serverless).

## 3. Vercel project

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

Build command (also in `vercel.json`):

```bash
npm run build:vercel
```

(`prisma migrate deploy && next build`)

## 4. Post-deploy smoke

1. Open the production URL over HTTPS.
2. Paste a **public** Steam profile → Load inventory.
3. Confirm inventory page, Refresh cooldown, share card, trade-up catalog.
4. Confirm `/privacy` and `/terms` reflect hosted Postgres language.

## 5. Admin force sync (optional)

Public UI no longer exposes Force. To bypass cooldown with a secret:

```bash
curl -X POST https://YOUR_DOMAIN/api/sync \
  -H "Content-Type: application/json" \
  -H "x-sync-force-secret: YOUR_SYNC_FORCE_SECRET" \
  -d '{"profileId":"…","force":true}'
```
