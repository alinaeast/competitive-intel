# Competitive Intel

A full-stack competitive intelligence agent — React dashboard + Claude-powered research agent + n8n orchestration + Supabase.

## Project Structure

```
competitive-intel/
├── frontend/          # React + Tailwind dashboard (deploy to Vercel)
├── agent/             # Express server — Claude /api/research endpoint
├── .env               # Root env (copied to agent/.env automatically)
├── supabase_schema.sql
├── n8n_workflow.json
└── README.md
```

## Setup

### 1. Supabase

Run `supabase_schema.sql` in the Supabase SQL Editor to ensure the `config` table exists and realtime is enabled on all tables.

Your schema should have:
- `competitors` — id, name, website, category, is_known, created_at
- `research_jobs` — id, competitor_id, status, triggered_by, created_at, completed_at
- `research_outputs` — id, competitor_id, job_id, battle_card, competitive_triggers, head_to_head, related_competitors, raw_sources, version, created_at
- `config` — key (PK), value

### 2. Agent (Express + Claude)

```bash
cd agent
npm install
npm start          # runs on port 3001
# or for dev:
npm run dev
```

The agent reads from `agent/.env` (or the root `.env` via `dotenv`).

**Endpoint:** `POST /api/research`
```json
{ "competitor_name": "Salesforce", "job_id": "uuid" }
```

Returns `{ status: "accepted" }` immediately and runs research asynchronously.

**Config endpoints:**
- `GET  /api/config/product-description` — fetch stored product description
- `POST /api/config/product-description` — save product description `{ description: "..." }`

### 3. n8n

Import `n8n_workflow.json` into your n8n instance.

Set these environment variables in n8n:
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_ANON_KEY` — your Supabase anon key
- `AGENT_URL` — public URL of your agent server (e.g. via ngrok or Railway)

The webhook path is `/competitive-research` — matches the URL in your `.env`.

### 4. Frontend

```bash
cd frontend
npm install
npm start          # local dev on port 3000
```

**Deploy to Vercel:**
```bash
cd frontend
npx vercel
```

Set these environment variables in Vercel:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_N8N_WEBHOOK_URL`
- `REACT_APP_AGENT_URL` — your deployed agent URL

## Full Flow

1. User clicks **+ New Research** → enters competitor name
2. Frontend upserts `competitors`, inserts `research_jobs` (status: `pending`), POSTs to n8n webhook
3. n8n sets job → `running`, calls `POST /api/research` on the agent
4. Agent calls Claude (claude-sonnet-4-20250514) with `web_search` tool enabled
5. Claude crawls: homepage, pricing, changelog, G2/Capterra, Google News, LinkedIn, Reddit/HN, SEC filings
6. Claude returns strict JSON → agent writes to `research_outputs`, sets job → `complete`
7. Dashboard auto-refreshes via Supabase Realtime

## Product Description

Click **⚙ Settings** in the header to save a one-paragraph description of your product. Claude uses this for accurate head-to-head feature comparisons.
