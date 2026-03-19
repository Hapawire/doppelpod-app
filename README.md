# DoppelPod

AI digital twin for social media — clone your voice, autopilot posts, and predict virality.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **Tailwind CSS 4** + **shadcn/ui**
- **Framer Motion** for animations
- **Supabase** for waitlist storage
- **Anthropic Claude** for AI twin voice cloning
- **ElevenLabs** for text-to-speech
- **HeyGen** for talking video avatars
- **Stripe** for subscription payments

## Getting Started

```bash
npm install
```

Copy the env template and fill in your keys:

```bash
cp .env.example .env.local
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `ANTHROPIC_API_KEY` | No | Claude API key — console.anthropic.com |
| `ELEVENLABS_API_KEY` | No | ElevenLabs TTS — elevenlabs.io |
| `ELEVENLABS_VOICE_ID` | No | ElevenLabs voice ID (default: Liam) |
| `HEYGEN_API_KEY` | No | HeyGen video avatars — heygen.com > Settings > API |
| `STRIPE_SECRET_KEY` | No | Stripe secret key — dashboard.stripe.com/apikeys |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | No | Stripe Price ID for Pro plan |
| `NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID` | No | Stripe Price ID for Elite plan |

All optional keys have graceful mock fallbacks — the app works without them.

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/generate-twin` | POST | Claude AI twin post generation |
| `/api/text-to-speech` | POST | ElevenLabs TTS audio |
| `/api/generate-video` | POST | HeyGen talking avatar video |
| `/api/video-status` | GET | Poll HeyGen video progress |
| `/api/cowork` | POST | Claude Cowork chat session |
| `/api/create-checkout-session` | POST | Stripe checkout (mock or real) |

## Deploy to Vercel

1. Push to GitHub
2. Import the repo at vercel.com/new
3. Add environment variables from `.env.example`
4. Deploy

### Custom Domain (doppelpod.io)

In Vercel project settings > Domains, add `doppelpod.io` and `www.doppelpod.io`.

At your domain registrar, add these DNS records:

| Type | Name | Value |
|------|------|-------|
| A | @ | `76.76.21.21` |
| CNAME | www | `cname.vercel-dns.com` |

Vercel auto-provisions SSL after DNS propagates (usually 1-10 minutes).

## Supabase Setup

Create a `waitlist` table:

```sql
create table waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamptz default now()
);
```

## Stripe Setup

1. Create products in Stripe Dashboard > Products
   - **Pro** — $29/mo recurring
   - **Elite** — $69/mo recurring
2. Copy each product's Price ID into env vars
3. Add `STRIPE_SECRET_KEY` from API keys page
