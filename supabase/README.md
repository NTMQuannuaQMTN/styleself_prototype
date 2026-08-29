# Supabase

Schema and setup for StyleSelf.

## Migrations

Run them **in order** in the SQL Editor (or `supabase db push`):

1. [`migrations/20260829120000_profiles_and_auth.sql`](migrations/20260829120000_profiles_and_auth.sql)
   — `profiles` table (identity only — every user is a merchant, there is no
   role), RLS, and the trigger that creates a profile automatically on signup.
2. [`migrations/20260829130000_stores_and_catalog.sql`](migrations/20260829130000_stores_and_catalog.sql)
   — merchant workspace: `stores` (+ `branch_name` / `city`), `store_members`,
   `store_agents` (+ `recommendation_limit`), `store_locations`,
   `store_join_requests` (+ `requester_location`), `products`,
   `product_variants`, `inventory`; RLS for all of them, **including anon read
   policies so the public `/agent/:slug` iframe can see a live store's catalog**;
   `approve_join_request` / `reject_join_request` RPCs; seed triggers.

This file is fully idempotent — **re-run it** to pick up every column / policy
added since your last run.

**Dashboard** — open the SQL Editor and run each file's contents in order.

**CLI** — with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## Auth provider setup (dashboard)

1. **Authentication → Providers → Email** — enabled by default. For a smoother
   demo you can turn **"Confirm email"** off (Authentication → Sign In / Providers
   → Email). The app handles both cases: with confirmation on, signup shows a
   "check your inbox" screen; with it off, the user lands in the app immediately.
2. **Authentication → Providers → Google** — enable it and paste your Google
   OAuth client ID/secret. Add the callback URL Supabase shows you to the Google
   Cloud console. (Optional — email/password works without it.)
3. **Authentication → URL Configuration** — this is what fixes OAuth landing on
   `localhost:3000` after Google sign-in:
   - **Site URL**: your **production** URL, e.g. `https://styleself.vercel.app`
     (Supabase falls back to this when a `redirectTo` isn't allow-listed).
   - **Redirect URLs** (allow-list) — add both:
     - `https://styleself.vercel.app/**`
     - `http://localhost:5173/**`

   The app always redirects OAuth / reset links to `<origin>/auth/callback` and
   `<origin>/reset-password`, so both origins must be listed.

The public `/agent/:agentId` route needs no auth — end shoppers are anonymous.

## App credentials

Copy [`../.env.example`](../.env.example) to `../.env.local` and fill in
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from **Project Settings → API**.

## Agent runtime (server-side)

The agent endpoint (`/api/agent/chat`) needs, in `.env` locally and in the host's
environment for production:

- `OPENAI_API_KEY` — required for the assistant to respond
- `AI_MODEL` — optional, defaults to `gpt-4o-mini`
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — for production (falls back to the
  `VITE_` / `NEXT_PUBLIC_` names)

On **Vercel**, add these under Project Settings → Environment Variables. The
[`../vercel.json`](../vercel.json) rewrite serves client routes from
`index.html` while leaving `/api/*` to the functions.
