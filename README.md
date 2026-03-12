# DoppelPod

AI digital twin for social media — clone your voice, autopilot posts, and predict virality.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **Tailwind CSS 4** + **shadcn/ui**
- **Framer Motion** for animations
- **Supabase** for waitlist storage

## Getting Started

```bash
npm install
```

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## Supabase Setup

Create a `waitlist` table:

```sql
create table waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamptz default now()
);
```
