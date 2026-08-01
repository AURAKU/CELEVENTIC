# TransformStream race — `controller[kState].transformAlgorithm is not a function`

## Exact root cause

| Field | Value |
| --- | --- |
| Error | `TypeError: controller[kState].transformAlgorithm is not a function` |
| Example digest | `3225108298` (Next.js `string-hash(message + stack)` — stack-path dependent) |
| Origin file | `node:internal/webstreams/transformstream` |
| Origin function | `transformStreamDefaultControllerPerformTransform` (~line 527 on Node 20.20.2 / 22.22.1) |
| Upstream issue | [nodejs/node#62036](https://github.com/nodejs/node/issues/62036) |
| Upstream fix | [nodejs/node#62040](https://github.com/nodejs/node/pull/62040) in **Node ≥ 24.15.0** and **≥ 25.8.1** |
| Next.js trigger | App Router RSC HTML streaming via `next/dist/server/stream-utils/node-web-streams-helper.js` (`createBufferedTransformStream` and related `TransformStream` pipes) when a client/proxy aborts mid-response |

### Why the controller becomes invalid

1. Next.js pipes the RSC/HTML response through native Web `TransformStream`s.
2. A client disconnect / navigation abort / proxy timeout cancels the readable side.
3. Cancel clears `controller[kState].transformAlgorithm`.
4. A write already scheduled on the writable side still runs and invokes the cleared algorithm → TypeError.
5. Next.js catches it, assigns a digest, and logs it. This is **not** an application `try/catch` bug and must not be swallowed.

### Verified reproduction (this repo)

```text
Node v20.20.2  → 200/200 race hits
Node v22.22.1  → 200/200 race hits
Node v24.15.0  →   0/200 race hits
Node v18.20.8  →   0/200 race hits (different interleaving; not production)
```

Probe locally:

```bash
npm run test:transformstream-race
```

## What is NOT the cause (anymore)

- App code constructing `TransformStream` / `Readable.toWeb` for media (removed).
- `web-streams-polyfill` (not a dependency).
- Global `TransformStream` monkey-patches (none).
- Mixing undici vs polyfill stream controllers in Celeventic source.

Historical contributor: proxying large media through `/api/uploads` with streamed bodies. That path now redirects to Nginx `/uploads/` and only returns `Uint8Array` when forced.

## Permanent fix

**Upgrade the Celeventic Node runtime to ≥ 24.15.0** (verified). Do not upgrade Spark & Drive or other PM2 apps.

```bash
# On the VPS (Hostinger), as root or deploy user:
cd /var/www/CELEVENTIC
bash scripts/upgrade-node-transformstream-fix.sh
```

Or manually:

```bash
# Install Node 24.15.0 via nvm (example)
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm install 24.15.0
nvm alias default 24.15.0
hash -r
node -v   # expect v24.15.0

cd /var/www/CELEVENTIC
npm ci
npx prisma generate
npm run build
pm2 restart celeventic --update-env
pm2 restart celeventic-video-worker --update-env || true
pm2 save

# Verify race is gone:
node -e "require('./scripts/probe-transformstream-race.cjs')"
```

**Node 22 is not a fix** — it is equally vulnerable. Node 20.20.2 (current production) is vulnerable.

## App hardening already shipped

- `next.config.ts` → `compress: false` (removes Next gzip TransformStream layer; Nginx can compress).
- `/api/uploads/[...path]` → `runtime = "nodejs"`, redirect to `/uploads/`, `Uint8Array` bodies only, `Content-Encoding: identity`.
- Media URL resolver rewrites `/api/uploads` → `/uploads` for Nginx.
- `instrumentation.ts` → startup warning on vulnerable Node + `onRequestError` diagnostics (route/path/method/runtime/stream names/digest) — **does not suppress**.

## Nginx (recommended alongside Node upgrade)

In the HTTPS server block that proxies to Next (port 3001), ensure upload media bypasses Node and proxy buffers are sized for RSC headers:

```nginx
# Direct media (already required)
location ^~ /uploads/ {
    alias /var/www/CELEVENTIC/public/uploads/;
    # see docs/ops/nginx-uploads.conf
}

# Next upstream (RSC streaming)
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
}
```

Then: `sudo nginx -t && sudo systemctl reload nginx`.

## Rollback

```bash
# Revert Node only (example with nvm)
nvm install 20.20.2
nvm alias default 20.20.2
cd /var/www/CELEVENTIC
npm ci && npx prisma generate && npm run build
pm2 restart celeventic --update-env
pm2 save
```

App code rollback: redeploy previous git commit via `scripts/deploy-production-sqlite.sh` backup restore.
