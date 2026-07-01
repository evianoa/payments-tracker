# Payments Tracker

Personal invoice and payment tracking dashboard.

## Stack

- **Next.js 14** App Router + Tailwind CSS
- **Prisma** ORM with **SQLite** (dev); swap `datasource.provider` to `"postgresql"` + `DATABASE_URL` for production
- **decimal.js** for all monetary math (never native floats)

## Data Model

```
Client ───1:N─── Invoice ───1:N─── Payment
```

| Model | Key fields |
|---|---|
| `Client` | name, email, vaultLink (vault [[wikilink]]) |
| `Invoice` | clientId, amount, currency, dueDate, status (pending/paid/overdue), pdfPath, notes |
| `Payment` | invoiceId, amount, date, method |

## Setup

```bash
pnpm install
pnpm db:generate   # generate Prisma client
pnpm db:push       # create/re-sync SQLite schema
pnpm db:seed       # optional seed data
pnpm dev           # http://localhost:3000
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm db:push` | Push schema changes to SQLite |
| `pnpm db:seed` | Run seed (see `prisma/seed.ts`) |
| `pnpm db:studio` | Open Prisma Studio |

## Production Deploy (Coolify)

1. Set `DATABASE_URL` env var to your Coolify-managed SQLite volume path (e.g. `file:/app/data/prod.db`) or a managed Postgres URL
2. Point subdomain at the container port 3000
3. The `Dockerfile` uses multi-stage build → standalone output; Coolify GHCR build picks it up automatically
4. For Postgres in production, update `prisma/schema.prisma` `datasource.provider = "postgresql"` and set `DATABASE_URL` accordingly

## Coolify Notes

- `docker-compose.yml` is not used — Coolify manages the container directly via Dockerfile
- Standalone output keeps image small; no Node.js runtime needed in final stage
