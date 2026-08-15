# Deployment

Cloud-agnostic containers. Do not rely on a single vendor’s proprietary config.

## Images

- `apps/api/Dockerfile`
- `apps/agent-portal/Dockerfile`
- `apps/admin-portal/Dockerfile`

Build from repo root:

```bash
docker compose -f docker-compose.prod.yml build
```

## Required environment

See `.env.example`. Minimum production secrets:

- `DATABASE_URL`
- `JWT_SECRET` (≥32 chars)
- `POSTGRES_PASSWORD`

Optional: `REDIS_URL`, S3/MinIO, SMTP, live vendor keys.

## Health

`GET /health` on the API. Compose healthcheck uses this endpoint.

## Migrations

Run `pnpm --filter @thr/db exec prisma migrate deploy` (or `db push` in early environments) before traffic.

## Observability

Pino JSON logs on the API. Pricing and vendor adapter calls are the high-risk paths — log cache hits and adapter name on reprice. OpenTelemetry can be attached to `pricePackage` and `VendorAdapter` later without changing call sites.
