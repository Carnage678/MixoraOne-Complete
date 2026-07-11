# MixoraOne

AI-powered software commerce platform. Businesses discover, evaluate, purchase,
and manage software; developers showcase, market, and monetize their products.

## Repository layout

```text
apps/
  api/        NestJS backend API (clean architecture: core / modules / infrastructure)
  web/        Next.js frontend (App Router, Tailwind CSS)
packages/
  contracts/  Shared API contracts and domain types
  config/     Shared TypeScript configuration
prisma/       Database schema and migrations (PostgreSQL)
docs/adr/     Architecture Decision Records
.github/      CI workflows
```

## Prerequisites

- Node.js 22+
- pnpm 11+ (`npm install -g pnpm`)
- Docker Desktop (for PostgreSQL and Redis)

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment template
copy .env.example .env     # Windows
# cp .env.example .env     # macOS/Linux

# 3. Start PostgreSQL and Redis
pnpm services:up

# 4. Generate the Prisma client
pnpm db:generate

# 5. Start API (http://localhost:4000) and web (http://localhost:3000)
pnpm dev
```

- API docs (Swagger): http://localhost:4000/api/docs
- Health endpoint: http://localhost:4000/api/v1/health
- Web status page: http://localhost:3000/status
- Sign in / sign up: http://localhost:3000/sign-in

To create the database tables, apply migrations once PostgreSQL is running:

```bash
pnpm --filter @mixoraone/api run db:migrate:deploy
```

## Scripts

| Command            | Description                           |
| ------------------ | ------------------------------------- |
| `pnpm dev`         | Run API and web in watch mode         |
| `pnpm build`       | Build all packages                    |
| `pnpm lint`        | ESLint across the repo                |
| `pnpm typecheck`   | TypeScript checks for every package   |
| `pnpm test`        | Run test suites                       |
| `pnpm services:up` | Start PostgreSQL and Redis via Docker |
| `pnpm db:generate` | Generate the Prisma client            |
| `pnpm db:migrate`  | Create/apply a development migration  |

## Architecture

See [docs/adr](docs/adr) for architectural decisions. Summary:

- **Monorepo** with pnpm workspaces; shared types live in `packages/contracts`.
- **API** uses NestJS with clean architecture layering and a uniform response
  envelope carrying a request id.
- **Web** uses the Next.js App Router with route groups (`(public)`, `(auth)`,
  `(dashboard)`, later `admin`) and keeps all server communication in
  `src/lib/api-client`.
- **Database** is PostgreSQL through Prisma; **Redis** backs rate limits now
  and caching/queues as those features land.
- **Authentication** (ADR 0002): argon2id passwords, 15-minute JWTs, rotating
  hashed refresh tokens in an httpOnly cookie with reuse detection, Google and
  GitHub OAuth behind a provider port, role-based guards (`USER`, `DEVELOPER`,
  `ADMIN`), and an append-only audit log. All routes require auth by default;
  public ones are explicitly marked `@Public()`.
