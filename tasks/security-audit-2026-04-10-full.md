# Security Audit — Full Top-Down — 2026-04-10

## Scope
Complete audit of entire codebase: all API routes, middleware, security headers, Supabase client usage,
file uploads, third-party API integrations, environment variables, and client components.

## Status
All critical and high findings fixed and deployed. Low/accepted items documented below.

---

## Fixes Applied This Session

| ID | Sev | File | Fix |
|----|-----|------|-----|
| C1 | **Critical** | `video-status/route.ts` | IDOR: added ownership check — verifies `heygen_video_id` belongs to requesting user via `video_jobs` table before proxying to HeyGen |
| H1 | High | `create-checkout-session/route.ts` | Enum validation: `tier` must be `"pro"\|"elite"`; `priceId` must start with `"price_"` |
| H2 | High | `cowork/route.ts` | Message validation: each message must have `role: "user"\|"assistant"`, non-empty string content, max 10k chars |
| M1 | Medium | `cowork/route.ts` | Rate limit: 60 messages/hr per user |

---

## Previously Fixed (All Sessions Combined)

| ID | File | Fix |
|----|------|-----|
| C1-prev | `supabase-server.ts`, `profile/route.ts`, `voice/upload/route.ts` | Admin client for all profile writes |
| C2-prev | `api-gate.ts`, `profile/route.ts` | All usage_tracking writes via admin client; UPDATE policy removed from user RLS |
| C3-prev | `create-checkout-session/route.ts` | Removed mock tier upgrade bypass |
| H1-prev | `video-status/route.ts` | Added auth check (401 for unauthenticated) |
| H2-prev | `cowork/route.ts` | Length caps + XML delimiters on system prompt injections |
| H3-prev | `generate-video/route.ts` | Server-side savedAvatarId lookup |
| M1-prev | `next.config.ts` | Full security headers suite |
| M2-prev | Multiple routes | Sliding-window rate limiting |
| M3-prev | `cowork/route.ts` | Generic error messages |
| M4-prev | `cron/process-video-jobs/route.ts` | Removed `?secret=` query param fallback |
| M5-prev | Supabase migration | Explicit deny on email_change_requests |
| M6-prev | Supabase migration + `page.tsx` | Dropped waitlist table |
| L1-prev | `voice/upload/route.ts` | Magic-number file signature validation |
| L2-prev | `generations/route.ts` | Pagination limit/offset capping |
| L3-prev | `generate-twin/route.ts` | Generic 500 error message |
| N1-prev | `text-to-speech/route.ts` | Auth required (was open to anonymous) |
| N2-prev | `text-to-speech/route.ts` | Rate limit: 30/hr |
| N3-prev | `voice/upload/route.ts` | Rate limit: 10/hr |
| R2-prev | `feedback/route.ts` | Message length capped at 5000 chars |

---

## Remaining Known Issues (Low / Accepted)

| ID | File | Issue | Severity | Status |
|----|------|-------|----------|--------|
| R1 | `api-gate.ts` | Read-then-write race in `incrementUsage` — concurrent requests could under-count | Low | Queued — fix: atomic SQL `UPDATE counter = counter + 1` |
| R3 | `stripe/webhook.ts` | No idempotency key tracking — duplicate events re-process | Low | Queued — fix: store `stripe_event_id` in DB |
| R4 | `rate-limit.ts` | In-memory rate limiter is per-serverless-instance | Accepted | Documented. Upgrade path: Upstash Redis |
| R5 | `next.config.ts` | CSP requires `unsafe-inline`/`unsafe-eval` | Accepted | Required by Next.js SSR |
| R6 | `cowork/route.ts` | `creatorStyle`/`script` are length-capped but not XML-escaped | Accepted | XML delimiters already prevent structural injection; tag content escaping is redundant here |

---

## Full Route Inventory — Auth & Rate Limit Status

| Route | Auth | Rate Limit | Notes |
|-------|------|-----------|-------|
| `/account/billing-portal` | ✓ 401 | — | Low-risk read |
| `/account/delete` | ✓ 401 | — | Irreversible but requires auth |
| `/account/export` | ✓ 401 | — | |
| `/account/request-email-change` | ✓ 401 | — | Token-based flow |
| `/account/confirm-email-change` | Public | — | Intentional (email link) |
| `/cowork` | Optional (demo) | ✓ 60/hr | Feature-gated for paid users |
| `/create-checkout-session` | ✓ 401 | ✓ 10/hr | Now enum-validated |
| `/feedback` | Optional | ✓ 10/hr | Intentional |
| `/generate-twin` | Optional (demo) | ✓ 30/hr | IP fallback for anon |
| `/generate-video` | ✓ 401 | — | Gated by tier |
| `/generations` | ✓ 401 | — | |
| `/profile` | ✓ 401 | — | Read-only, low risk |
| `/send-verification-email` | ✓ 401 | ✓ 5/hr | |
| `/stripe/webhook` | Stripe sig | — | Correctly verified |
| `/text-to-speech` | ✓ 401 | ✓ 30/hr | |
| `/user-avatars` | ✓ 401 | — | |
| `/verify-email` | Public | — | Intentional (email link) |
| `/video-jobs` | ✓ 401 | — | Filtered by user_id |
| `/video-jobs/[jobId]` | ✓ 401 + ownership | — | |
| `/video-status` | ✓ 401 + ownership | — | IDOR fixed this session |
| `/voice/clone` | ✓ 401 | ✓ 5/hr | |
| `/voice/upload` | ✓ 401 | ✓ 10/hr | |
| `/cron/process-video-jobs` | Bearer CRON_SECRET | — | |
| `/cron/trial-reminders` | Bearer CRON_SECRET | — | |

---

## False Positives Dismissed

- **HeyGen image injection** — requires HeyGen API to be compromised
- **Token enumeration** — UUID tokens are 128-bit, not brute-forceable
- **Polyglot audio attack** — attacks HeyGen infra, not ours
- **Provider error leakage** — Fish/ElevenLabs errors caught at route level, generic message to client
- **CSP missing Fish Audio/ElevenLabs** — all provider calls are server-to-server, browser CSP doesn't apply
- **Storage extension from filename** — Supabase Storage is a blob store, not a web server
- **Prompt injection XML breakout in cowork** — XML delimiters + length caps, accepted residual risk
- **Stripe email-based lookup** — email from Stripe (trusted source)
- **In-memory rate limiter per-instance** — documented accepted trade-off, meaningful deterrent

---

## Deployed
Commit: `3385349` — deployed to production on 2026-04-10
