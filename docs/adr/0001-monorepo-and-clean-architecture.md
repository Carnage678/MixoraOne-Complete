# ADR 0001: Monorepo with Clean Architecture Boundaries

- Status: Accepted
- Date: 2026-07-11

## Context

MixoraOne spans a Next.js frontend, a NestJS backend, shared API contracts, and
infrastructure definitions. These pieces must evolve together without
duplicating types or leaking business logic into the UI.

## Decision

1. Use a pnpm workspace monorepo with `apps/` (deployable units) and
   `packages/` (shared code).
2. `apps/api` follows clean architecture layering:
   - `core/`: config, cross-cutting HTTP concerns (envelope, errors, request ids).
   - `modules/`: feature modules exposing controllers plus application services.
   - `infrastructure/`: Prisma, Redis, and future external adapters.
     Dependencies point inward; controllers never touch Prisma directly.
3. `packages/contracts` holds API response types shared by web and API. The
   frontend never re-declares backend shapes.
4. All API responses use one envelope (`success`, `data`/`error`, `requestId`)
   so client error handling is uniform and requests are traceable.
5. Prisma schema lives at the repo root (`prisma/`) because the database is a
   platform asset, not an implementation detail of one app.

## Consequences

- New domains (auth, products, payments) are added as feature modules plus
  contracts, without restructuring.
- Shared config (`packages/config/tsconfig.base.json`) keeps strict TypeScript
  settings consistent.
- CI runs lint, typecheck, tests, and builds for every package from the root.
