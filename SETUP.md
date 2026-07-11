# Aware OS — go-live checklist

Everything is built, the database is migrated and seeded, and the code lives at
`Aware-AI-Labs/aware-platform`. Three founder-only steps remain (they need
secrets only you hold).

## 1. Deploy on Vercel (~3 minutes)

1. [vercel.com/new](https://vercel.com/new) → Import `Aware-AI-Labs/aware-platform`
   (connect the Aware-AI-Labs org if GitHub asks).
2. Before hitting Deploy, add Environment Variables (all from `.env.local` —
   the file already contains the Supabase URL, anon key, founder email, and a
   generated `CRON_SECRET`; you fill in the four secrets):
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase dashboard → Project Settings → API keys
   - `ANTHROPIC_API_KEY` — a **fresh rotated** key from console.anthropic.com
   - `GITHUB_TOKEN` — fine-grained PAT: Contents + Pull requests read/write on
     `Aware-AI-Labs/*` and `dimitri-sky/awareailabs-v3`
   - `GITHUB_WEBHOOK_SECRET` — any long random string
3. Deploy. Git-connected means every merged PR (including AWARE's own) ships
   automatically.
4. Optional: add a custom domain, e.g. `os.awareailabs.com`.

## 2. Start AWARE's heartbeat (~2 minutes)

Open the Supabase SQL editor, paste `supabase/cron.sql`, replace
`PLATFORM_URL` with the deployed URL and `CRON_SECRET_VALUE` with your
`CRON_SECRET`, run it. AWARE now ticks hourly, briefs daily, reviews weekly.

Test immediately:
`https://YOUR-URL/api/cron/daily?secret=YOUR_CRON_SECRET&force=1`
→ the morning brief appears on Home and Mind.

## 3. Wire the GitHub webhook (~2 minutes)

GitHub → org `Aware-AI-Labs` → Settings → Webhooks → Add:
- Payload URL: `https://YOUR-URL/api/webhooks/github`
- Content type: `application/json`
- Secret: your `GITHUB_WEBHOOK_SECRET`
- Events: Pushes, Pull requests, Repositories

Repeat on `dimitri-sky/awareailabs-v3` (repo → Settings → Webhooks) so website
work flows in until it moves to the org.

## First sign-in

Visit the deployed URL, enter `dimitars1337@gmail.com` — the first sign-in
bootstraps your founder account and emails you the magic link. Invite everyone
else from People.

## Try these first

- Ask AWARE: “What is this company? What matters most right now?”
- “Change HR 1's weight on the site from 60 kg to 40 kg” → it reads the website
  repo, drafts the change, files a proposal → you approve → PR opens.
- Give it your real numbers: “Balance is $X, burn is $Y/month” → it proposes
  the ledger entries → runway computes on Capital.
