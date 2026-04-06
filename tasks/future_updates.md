# Future Updates

This file tracks planned improvements and architectural decisions for future implementation.
Accessible to any team member from any session.

---

## Voice Cloning

- **Current**: ElevenLabs Starter plan (30k chars/month), using default "Jessica" voice
- **Next step**: Upgrade to 100k character plan before opening to more users
- **Feature**: Allow users to upload a voice sample → clone via ElevenLabs → store voice ID on profile → use for all their videos
- **Multilingual is a dealbreaker feature** — must support open/global languages, not English-only
- **ElevenLabs multilingual**: 29 languages, cross-lingual cloning (clone in English, speak in any language) — best in class
- **Alternative providers evaluated**:
  - Play.ht — 140+ languages but quality varies, site was down during evaluation
  - Fish Audio — strong multilingual, cheaper, worth watching as cost fallback
  - Cartesia — excellent quality, real-time latency focus, currently English-primary
  - Resemble AI — good cloning realism, multilingual not a primary focus
- **Decision**: Stay on ElevenLabs, upgrade to 100k chars/month, validate which languages users actually need before switching
- **Pricing consideration**: Voice cloning costs money per clone — factor into tier pricing

---

## Job Queue Architecture

- **Current system**: QStash cron every 2 minutes, sequential processing, max 20 jobs per tick
- **Problem**: Doesn't scale beyond ~50 concurrent users without queue buildup
- **Short-term fixes** (beta only, not recommended long-term):
  - Option 1: Increase QStash frequency (every 30s) — reduces wait time but not throughput, wastes API calls on polling ticks
  - Option 2: Parallel processing within cron tick — risks HeyGen rate limits, Vercel 60s timeout becomes a constraint
- **Proper solution (pre-Kevin launch)**: Migrate to Trigger.dev or Inngest
  - Jobs start instantly on submission instead of waiting for next cron tick
  - Long-running functions with built-in sleep between polling steps (no wasted invocations)
  - Independent concurrent job execution
  - Built-in retries, timeouts, observability dashboard
  - Both are Next.js/Vercel native with generous free tiers
  - **Recommendation**: Trigger.dev

---

## Other Items (from tomorrow.md)

- HeyGen alternatives evaluation (first-time vs repeat cost, TalkingPhoto v1, D-ID/Tavus/Synthesia)
- Custom email verification system
- FAQ / Help Center page
- About / Origin Story page
- Beta audience rollout
- Feature card interactivity signifier (bottom-right arrow may not be strong enough)

---

## Launch Sequence (as planned)

1. Get voice cloning working
2. Discuss ElevenLabs plan upgrade with Tyler
3. Closed beta: 10-50 trusted users (mixed: content creators, devs, everyday users)
4. Function/stress test
5. Migrate job queue to Trigger.dev before Kevin's blast
6. Wait for monthly limits to reset
7. Kevin endorsement blast + ProductHunt/Reddit push
