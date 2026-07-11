# ADR 0002: Authentication and RBAC Design (Epic 2)

- Status: Accepted (founder approved defaults with Google + GitHub OAuth, 2026-07-11)
- Date: 2026-07-11

## Context

Epic 2 needs concrete choices for identity, token handling, OAuth, and the
role model before any code is written. This ADR records the recommended
defaults; open decisions are listed at the end.

## Decisions (proposed)

### Identity and passwords

- Email + password registration with mandatory email verification before the
  account can publish products or purchase.
- Password hashing with argon2id (memory-hard, current OWASP recommendation).
  bcrypt is the fallback only if argon2 native builds become a problem in CI.
- Password policy: minimum 10 characters, checked against a breached-password
  list (k-anonymity range API) instead of complexity rules that hurt UX.
- Account lockout via Redis-backed rate limiting on login and OTP endpoints
  (per-account and per-IP), not permanent locks.

### Tokens and sessions

- Short-lived JWT access tokens (15 minutes) signed with an asymmetric key
  (RS256/EdDSA) so future services can verify without sharing secrets.
- Opaque refresh tokens (random 256-bit), stored hashed (SHA-256) in the
  `refresh_tokens` table with rotation on every use and reuse detection
  (reuse of a rotated token revokes the whole session family).
- Refresh token delivered as an httpOnly, Secure, SameSite=Lax cookie to the
  web app; access token kept in memory on the client, never in localStorage.
- Explicit logout revokes the refresh token server-side; `audit_logs` records
  login, logout, refresh reuse, and password/email changes.

### OAuth

- Providers at launch: Google and GitHub (buyers skew Google; developers skew
  GitHub). Others (Microsoft, GitLab) can be added later behind the same
  `accounts` table (provider, providerAccountId, userId).
- Account linking: an OAuth sign-in with an email that matches an existing
  verified local account links to it only after the user re-authenticates;
  unverified email matches create a separate account to prevent takeover.

### Role model

- Start with a static enum role system: `USER`, `DEVELOPER`, `ADMIN` stored
  on the user, plus organization-scoped roles (`OWNER`, `MEMBER`) on
  `organization_members`.
- The dynamic `roles`/`permissions`/`role_permissions` tables from the plan
  are deferred until a real need appears (custom enterprise roles); guards
  and policies are written against an interface so the swap is contained.

## Open decisions for the founder

1. OAuth providers at launch: Google + GitHub as proposed, or a different set?
2. Should buyers be allowed to purchase without verifying email (verification
   required only for developers/publishing)?
3. Any compliance target (SOC 2, GDPR-first market) that changes session
   retention and audit-log requirements now?

## Consequences

- Auth tables in the Prisma schema for Epic 2: `users`, `accounts`,
  `refresh_tokens`, `audit_logs` (dynamic role tables deferred).
- New API dependencies: `@nestjs/jwt`, `@nestjs/passport` or hand-rolled
  guards, `argon2`, OAuth client library.
- Redis becomes a hard dependency for rate limiting in production.
