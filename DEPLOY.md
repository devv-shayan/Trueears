# Deploying the Trueears backends (Docker)

The two backend services are standard long-running **axum + Postgres** servers, so
they run as containers on any Docker host (Render, Railway, Fly.io, a VPS, etc.).
This is the supported deployment path — Vercel's serverless runtime cannot host a
process that binds its own port and holds a database connection pool, which is why
`trueears-backend.vercel.app` was returning `500 FUNCTION_INVOCATION_FAILED`.

| Service           | Dir               | Port | Image builds from        |
| ----------------- | ----------------- | ---- | ------------------------ |
| `auth-server`     | `auth-server/`    | 3001 | `auth-server/Dockerfile` |
| `payment-service` | `payment-service/`| 3002 | `payment-service/Dockerfile` |

Both Dockerfiles are multi-stage (build on `rust:1-bookworm`, run on
`debian:bookworm-slim` with `ca-certificates` + `libssl3` for TLS), run as a
non-root user, and bind `0.0.0.0` so the platform can route traffic in.

## Build & run locally

```bash
# auth-server
docker build -t trueears-auth-server ./auth-server
docker run --rm -p 3001:3001 --env-file ./auth-server/.env trueears-auth-server

# payment-service
docker build -t trueears-payment-service ./payment-service
docker run --rm -p 3002:3002 --env-file ./payment-service/.env trueears-payment-service
```

Health checks: `GET http://localhost:3001/health` and `GET http://localhost:3002/health`.

## Required environment variables (set in the host's dashboard, not in the image)

**auth-server**
- `DATABASE_URL` — Postgres (Neon) connection string
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET` — must match payment-service
- `OAUTH_REDIRECT_URI` — keep `http://localhost:8585/callback` (the desktop app's
  loopback callback; Google allows loopback redirect URIs)
- `RUST_ENV=production` (set by the image; override if needed)
- `API_HOST`/`API_PORT` default to `0.0.0.0:3001` in the image

**payment-service**
- `PAYMENT_DATABASE_URL` — Neon pooled URL ending in `.neon.tech`
- `JWT_SECRET` — **must match auth-server** (tokens are validated here)
- `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`
- `LEMONSQUEEZY_VARIANT_ID_BASIC`, `LEMONSQUEEZY_VARIANT_ID_PRO`
- `PAYMENT_ALLOWED_ORIGINS` — include the desktop app origin (`tauri://localhost`)
- `PAYMENT_API_HOST`/`PAYMENT_API_PORT` default to `0.0.0.0:3002` in the image

> ⚠️ A mismatched `JWT_SECRET` between the two services makes the payment service
> reject every token with `invalidsignature`. Keep them identical.

## Pointing the desktop app at the deployed backends

The packaged desktop app has no `.env`, so these URLs are resolved at **build time**:

- **Auth backend** (`API_URL`): the Tauri build reads `API_URL` and bakes it in
  (`backend/src/auth.rs::resolve_api_url`). Build the desktop app with your deployed
  auth-server URL:

  ```bash
  API_URL=https://auth.yourdomain.com npm run build
  ```

  If unset it falls back to the old `https://trueears-backend.vercel.app`.

- **Payment service** (`VITE_PAYMENT_SERVICE_URL`): baked by Vite from the workspace
  `.env` (`frontend/vite.config.ts`). Set it before building, otherwise a production
  build points at `http://127.0.0.1:3002` and every license/account call fails with a
  reachability error:

  ```dotenv
  VITE_PAYMENT_SERVICE_URL=https://payments.yourdomain.com
  ```

## Render example (`render.yaml`-style)

Each service: "New Web Service" → Docker → root directory `auth-server/` (or
`payment-service/`) → add the env vars above → deploy. Render auto-detects the
`Dockerfile` and exposes the container port.
