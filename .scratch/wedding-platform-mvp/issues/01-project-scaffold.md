# 01 — Project scaffold

**What to build:** A user can reach the platform's home page (landing page with CTA), sign up with an email and password, log in, reset their password via email, and land on an empty authenticated dashboard. Every layer is wired end-to-end: database, auth, API, UI, i18n (French at launch with i18n-ready architecture), test infrastructure (HTTP API seam + E2E browser seam), and CI pipeline running on every push.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Home page is reachable and renders in French
- [ ] A user can sign up with email and password and land on an authenticated dashboard
- [ ] A user can log in with an existing email and password
- [ ] A user can request a password reset and receive an email with a reset link
- [ ] All user-facing strings go through the i18n translation layer — no hardcoded French strings in components
- [ ] HTTP API test infrastructure is set up with at least one passing example test (e.g., POST /auth/signup returns 201)
- [ ] E2E browser test infrastructure is set up with at least one passing example test (e.g., sign-up flow)
- [ ] CI pipeline runs all tests on every push and fails if any test fails
- [ ] Database migrations run automatically on deploy
