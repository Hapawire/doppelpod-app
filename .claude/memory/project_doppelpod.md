---
name: DoppelPod Project Overview
description: Tech stack, DB schema, tier system, API integrations, key file locations, current model config, known issues
type: project
---

DoppelPod is a Next.js SaaS platform for content creators to clone their voice, generate AI posts, talking-head videos, and chat with Claude AI.

**Live URL**: https://www.doppelpod.io
**Repo**: https://github.com/Hapawire/doppelpod-app
**Local clone**: C:\Users\Adobo1\doppelpod-app

## Tech Stack
- Next.js 16.1.6 (App Router), React 19, TypeScript 5
- Tailwind CSS 4, Framer Motion, shadcn/ui
- Supabase (PostgreSQL + Auth + Storage)
- Anthropic Claude Sonnet 4 (`claude-sonnet-4-20250514`) — both generate-twin and cowork
- ElevenLabs TTS (Jessica voice, ID: cgSgspJ2msm6clMCkdW9)
- HeyGen API (photo avatar + lip-synced video)
- Stripe (LIVE mode — real charges)
- Vercel (hosting), Resend (email from noreply@doppelpod.io), Dynadot (DNS)

## Tier System
| Feature | Trial (10 days) | Expired | Pro $29/mo | Elite $69/mo |
|---------|-----------------|---------|------------|--------------|
| Voice Generation | Unlimited | None | Unlimited | Unlimited |
| Video Avatars | Unlimited | None | 10/month | Unlimited |
| Claude Cowork | Unlimited | None | 10/day text-only | Unlimited + voice |

- **No free tier.** New signups get 10-day Elite trial (no CC required), then move to `expired` state (fully locked out)
- Expired users can still log in and see the dashboard, but all feature cards (Generate, Voice Clone, Past Generations) are overlaid with an upgrade prompt
- Account Settings still works for expired users, but Export Data is blocked
- Tier checks: `<FeatureGate>` (client) + `checkFeatureAccess()` in `api-gate.ts` (server)
- Defined in `src/lib/tiers.ts` → `TIER_LIMITS`
- `getEffectiveTier()` checks if trial_end passed; returns 'free' if expired

## Key File Locations
- `src/lib/tiers.ts` — tier definitions and limits
- `src/lib/api-gate.ts` — server-side feature access checks
- `src/components/auth-provider.tsx` — global auth context (user, profile, tier, usage, updatePassword, deleteAccount)
- `src/components/auth-modal.tsx` — login/signup modal with forgot password
- `src/components/dashboard-client.tsx` — dashboard with generate widget + account settings
- `src/components/feature-gate.tsx` — tier-based UI gating
- `src/app/api/generate-twin/route.ts` — Claude post generation (Sonnet, enhance mode)
- `src/app/api/cowork/route.ts` — Claude Cowork chat (Sonnet)
- `src/app/api/text-to-speech/route.ts` — ElevenLabs TTS
- `src/app/api/generate-video/route.ts` — HeyGen video (async, returns videoId)
- `src/app/api/stripe/webhook/route.ts` — Stripe webhook (updates tier on checkout)
- `src/app/api/account/delete/route.ts` — Account deletion (requires SUPABASE_SERVICE_ROLE_KEY)
- `src/app/api/account/export/route.ts` — Data export (JSON download)
- `src/app/api/account/billing-portal/route.ts` — Stripe customer portal
- `src/app/reset-password/page.tsx` — Password reset page

## Database Schema (Supabase)
- **profiles**: id, email, tier (free|trial|pro|elite), trial_start, trial_end, voice_id, stripe_customer_id, stripe_subscription_id
- **usage_tracking**: user_id, period (YYYY-MM), video_count, cowork_sessions, cowork_sessions_today, last_cowork_date
- **generations**: user_id, input_text, output_text
- Trigger: `on_auth_user_created` → auto-creates profile with tier='trial' + 10-day trial_end
- RLS enabled on all tables

## Stripe
- LIVE mode (sk_live_ keys) — switch to sk_test_ for development
- Pro price ID: `price_1TD1hFAolEmD4SE8lv9GCwiO`
- Elite price ID: `price_1TD1j4AolEmD4SE8rcCOJ7LI`
- Webhook: `checkout.session.completed` → updates tier by matching customer email

## Infrastructure Notes
- GitHub auth: user `am-i-coder` added as collaborator on Hapawire org repo
- Vercel auto-deploys from main branch (~30-60s)
- Supabase redirect URLs: need `https://www.doppelpod.io/reset-password` in Auth → URL Configuration
- SUPABASE_SERVICE_ROLE_KEY set in both .env.local and Vercel

## ElevenLabs Status (2026-03-27)
- **BLOCKED**: Free tier credits exhausted (9,997/10,000 chars used). Resets April 11.
- Partner needs to upgrade ElevenLabs plan ($5/mo Starter) to restore TTS.
- Correct API key: ending `7b54` (doppelpod-v2, unrestricted). ✅ Updated in Vercel.
- Correct voice ID: `cgSgspJ2msm6clMCkdW9` (Jessica, female). ✅ Updated in Vercel.
- Old Vercel values were wrong: different API key (ending `f5c0`) and wrong voice ID (`TX3LPaxmHKxFdv7VOQHJ`). Fixed.
- My Voices library is empty — Jessica works via API as pre-built voice, no need to add.

## Session Log (2026-03-28)
- **Removed free tier entirely** — renamed to `expired` across 8 files
- Expired users see gated dashboard: blur overlay on Generate, Voice Clone, Past Generations with "Upgrade to Continue" CTA
- Account Settings still functional for expired (change password, delete account), but Export Data is blocked
- Tier badge: red for expired, green for trial
- Show/hide password toggle, Start Trial → signup modal, welcome email, feedback system, trial UX (all done in earlier session today)
- Stripe test keys switched to test mode in env + Vercel
- Handoff doc on Google Drive updated with completed items + today's plan

## Session Log (2026-03-27)
- Added text generation widget to dashboard (with enter-to-send, Shift+Enter for newline)
- Added Account Settings (collapsible): change password, manage subscription, export data, delete account
- Added API routes: /api/account/delete, /api/account/export, /api/account/billing-portal
- Fixed generate-twin to stay on topic unless asked to change
- Fixed dashboard reading wrong response field (`text` not `twinPost`)
- Added enter-to-send on homepage generate textarea
- Installed stripe npm package
- Shared GenerateWidget extracted for homepage + dashboard
- Font switched to Montserrat

## Session Log (2026-03-26)
- Improved generate-twin prompt for faithful voice matching
- Added forgot password flow + /reset-password page
- Login now redirects to /dashboard
- Switched both generate-twin and cowork from Haiku to Sonnet (partner approved)

## Known Issues / Next Steps
- **ElevenLabs credits exhausted** — needs partner to upgrade plan ($5/mo) or wait until April 11 reset
- Supabase redirect URL for password reset still needs to be added in Auth dashboard
- No automated tests (Jest/Vitest + Playwright needed)
- No social auth (Google/GitHub)
- No rate limiting beyond tier gating
- Email templates in Supabase not fully branded
- Video generation costs real HeyGen credits per render

## Today's Plan (2026-03-28)
- [ ] Test all 3 Stripe test cards (success / decline / 3D Secure) end-to-end
- [ ] Verify welcome email on success
- [ ] Build payment-failed email with retry prompt for declines
- [ ] Handle auth-required pending state + email on resolution
- [ ] Pre-expiry reminder email (2 days before trial ends, 25% off, needs Stripe coupon + scheduled trigger)
- [ ] Yearly pricing (monthly/yearly toggle, ~17% discount, create yearly Stripe price IDs)

**Why:** Primary context for understanding the project structure, constraints, and integrations.
**How to apply:** Reference when working on any DoppelPod feature, bug, or integration. Always remember Stripe is LIVE.
