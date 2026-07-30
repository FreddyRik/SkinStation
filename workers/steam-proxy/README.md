# SkinStation Steam Proxy (Cloudflare Worker)

Authenticated server-to-server proxy so Vercel does not call Steam Community from shared Vercel egress IPs.

```
Next.js (Vercel) ──Bearer──> this Worker ──> steamcommunity.com
```

Not a browser CORS proxy. Do **not** add `Access-Control-Allow-Origin: *`.

## Endpoints

| Path | Auth | Steam target |
| --- | --- | --- |
| `GET /health` | No | None (smoke only) |
| `GET /inventory?steamId=&count=&start_assetid=` | Bearer | `/inventory/{id}/730/2` |
| `GET /vanity?vanity=` | Bearer | `/id/{vanity}/?xml=1` |
| `GET /profile?steamId=` | Bearer | `/profiles/{id}/?xml=1` |
| `GET /priceoverview?appid=730&currency=&market_hash_name=` | Bearer | `/market/priceoverview/` |

Steam responses are returned **verbatim** (status + body) with `X-Steam-Proxy: 1`.
Proxy failures use JSON + `X-Steam-Proxy-Error` (`unauthorized`, `misconfigured`, `bad_request`, `upstream`, `proxy_rate_limited`).

## Deploy

```bash
cd workers/steam-proxy
npm install
npx wrangler secret put STEAM_PROXY_SECRET
npx wrangler deploy
```

Copy the `*.workers.dev` URL into Vercel:

- `STEAM_PROXY_URL=https://skinstation-steam-proxy.<account>.workers.dev`
- `STEAM_PROXY_SECRET=` (same value as the Worker secret)

When both are set, SkinStation routes inventory / vanity / profile XML / priceoverview through the Worker. When unset, the app calls Steam directly (local dev).

## Limits

- Cloudflare Free: 100k Worker requests/day; 50 external subrequests per invocation (this Worker uses 1 Steam fetch per request).
- Steam still sees **Cloudflare shared egress**, not a private dedicated IP. If CF ranges get throttled, move to a sticky-IP VPS behind the same API shape.
