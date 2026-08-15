# THR.com Holidays — Dynamic Package Engine

Itinerary-based holiday packages for travel agents: search, swap hotel/vehicle/activities inside a **fixed day-wise skeleton**, reprice instantly, share a rate-locked quote, convert to booking.

## Apps

| App | Port | Purpose |
| --- | --- | --- |
| `apps/agent-portal` | 3000 | Agent search / customize / quote |
| `apps/admin-portal` | 3001 | Contracting masters, markup, audit |
| `apps/api` | 4000 | REST API, pricing, RBAC |

## Quick start

```bash
cp .env.example .env
docker compose up -d postgres redis minio
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm --filter @thr/api dev
pnpm --filter @thr/agent-portal dev
pnpm --filter @thr/admin-portal dev
```

Demo logins (password `Password123!`):

- `agent@thr.com` — Agent
- `contracting@thr.com` — Contracting Admin
- `revenue@thr.com` — Revenue Admin
- `support@thr.com` — Support
- `finance@thr.com` — Finance readonly

Search **Goa, 3 nights** or **Dubai, 4 nights** (templates are fixed length).

## Tests

```bash
pnpm test
pnpm --filter @thr/e2e test   # Playwright (API + agent journey; needs services)
```

## Production

See `docs/DEPLOYMENT.md`. Use `docker-compose.prod.yml` on any container host.

Open business questions and stacking rules: `ASSUMPTIONS.md`.
