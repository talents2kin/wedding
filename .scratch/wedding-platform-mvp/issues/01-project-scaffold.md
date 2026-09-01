# 01 — Project scaffold

**What to build:** A user can reach the platform's home page, sign up with an email and password, log in, reset their password via email, and land on an empty authenticated dashboard. Every layer is wired end-to-end: Next.js App Router, PostgreSQL + Prisma (schema + migrations), auth (email/password), shadcn/ui component base, i18n (French at launch, i18n-ready architecture), test infrastructure (HTTP API seam via Route Handlers + E2E browser seam), and CI pipeline running on every push.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Stack:**
- Framework: Next.js (App Router)
- UI: shadcn/ui
- Database: PostgreSQL + Prisma (migrations via `prisma migrate`)
- Auth: email/password (session-based or JWT — implementer's choice, must support GDPR deletion)
- i18n: all strings through a translation layer (e.g., `next-intl`); no hardcoded French strings in components
- Tests: HTTP API seam (Route Handlers) + E2E browser seam (e.g., Playwright)
- CI: runs `prisma migrate deploy`, builds, and runs all tests on every push

**Acceptance criteria:**
- [ ] Home page is reachable and renders in French
- [ ] A user can sign up with email and password and land on an authenticated dashboard
- [ ] A user can log in with an existing email and password
- [ ] A user can request a password reset and receive an email with a reset link
- [ ] Prisma schema is initialised with a `User` model and migrations run cleanly
- [ ] All user-facing strings go through the i18n translation layer — no hardcoded French strings in components
- [ ] HTTP API test infrastructure is set up with at least one passing example test (e.g., POST /api/auth/signup returns 201)
- [ ] E2E browser test infrastructure is set up with at least one passing example test (e.g., sign-up flow completes and lands on dashboard)
- [ ] CI pipeline runs migrations, build, and all tests on every push and fails if any step fails
