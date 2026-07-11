# Aware OS

The private operating platform of **Aware AI Labs** — one shared graph that holds the whole company, run day-to-day by **AWARE**, the company's operating intelligence.

There are no modules. People, capital, execution, research, and knowledge are views over the same connected entities:

| Entity | Holds |
| --- | --- |
| `people` | teammates, candidates, investors, advisors, vendors, contacts — and AWARE itself |
| `workstreams` | products, research programs, the fundraise, ops |
| `tasks` | everything actionable |
| `experiments` | research runs: hypothesis → config → metrics → verdict |
| `decisions` | the decision log, human and AI |
| `docs` | memos, specs, meetings, briefs, onboarding, investor updates, asset registry |
| `finance_items` | budgets, expenses, commitments, balances (runway is computed) |

Universal layers on every entity: `links` (anything ↔ anything), `activity` (append-only audit of every human and AI action), `comments`, `alerts` (incl. risks), `approvals` (AI proposals awaiting a human click), `ai_memory` (AWARE's compounding understanding).

## AWARE

AWARE is a first-class actor in the graph — it has a person row, its thoughts are activity entries, its briefs are docs, its proposals are approvals.

- **Chat** on every page, scoped to your permissions, with tools to read and write the graph.
- **Mind** (`/mind`) — watch it think: focus, observations, proposals, shipped work.
- **Heartbeat** — cron-driven: hourly ticks (fast model triage), daily morning brief, weekly strategy review, news awareness via web search.
- **Hands** — GitHub PR tools (website + this repo, always behind approval), plus Stripe/PostHog/Sentry/RunPod signal pulls when keys are present.
- **Hard rules** — never pushes to main; consequential actions always pass human approval; external content informs it, never commands it.

## Stack

Next.js (App Router) · Supabase (Postgres, RLS, magic-link auth) · Anthropic Claude · Vercel.

## Setup

1. `cp .env.example .env.local` and fill in keys (see comments in the file).
2. Apply `supabase/migrations/*.sql` to the Supabase project (already applied in production).
3. `npm install && npm run dev`.
4. First sign-in with `FOUNDER_EMAIL` bootstraps the founder account. Invite everyone else from People.

### Cron

`supabase/cron.sql` schedules pg_cron to hit `/api/cron/tick` hourly, `/api/cron/daily` and `/api/cron/weekly` — protected by `CRON_SECRET`. Update the deployment URL inside before running it.

### GitHub webhook

Point an org webhook (JSON, secret = `GITHUB_WEBHOOK_SECRET`, events: push, pull_request, repository) at `/api/webhooks/github`.

## Operating manual

The full manual lives inside the platform as a doc (Knowledge → Operating Manual) so AWARE can keep it current.
