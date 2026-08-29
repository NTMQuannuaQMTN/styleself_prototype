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
3. `20260829140000` … `20260829160000` — small idempotent follow-ups
   (member↔profile FK, product / variant attribute columns).
4. [`migrations/20260829170000_agent_orders.sql`](migrations/20260829170000_agent_orders.sql)
   — agent checkout: `store_agents` gains `brand_description` / `category_focus` /
   `require_confirmation` (and its insert/update RLS narrows to owner-only); new
   `agent_orders` + `agent_order_items` (members-only read); the
   `agent_checkout(...)` **SECURITY DEFINER** RPC — the only writer: it
   re-validates price and stock from live rows, writes the order, and decrements
   `inventory` in one transaction. Idempotent on `(conversation_id, draft_hash)`.
   `/agent/demo` never hits the database.
5. [`migrations/20260829180000_store_payout_and_deploy.sql`](migrations/20260829180000_store_payout_and_deploy.sql)
   — `stores` gains `payout_bank_name` / `payout_account_name` /
   `payout_account_last4` (settlement destination, last-4 only); the
   `set_store_live(store, bool)` **SECURITY DEFINER** RPC restricts going
   live/offline to the store **owner**.
6. `20260829200000_product_merchant_sku.sql` — `products.merchant_sku` + a
   partial unique index `(store_id, merchant_sku)` — the CSV import's match key.
7. [`migrations/20260829220000_variant_color_hex.sql`](migrations/20260829220000_variant_color_hex.sql)
   — `product_variants.color_hex` (optional `#RRGGBB`, `CHECK`ed) for an accurate
   storefront swatch. Display-only; the colour NAME in `product_variants.color` is
   still what the agent matches on. RLS unchanged.

The catalog migration file is fully idempotent — **re-run it** to pick up every
column / policy added since your last run. The follow-up files use
`add column if not exists` and `create ... if not exists`, so they are safe to
re-run too.

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
- `AGENT_SIGNING_SECRET` — **required in production**; HMAC secret for the
  checkout order-draft / payment-authorization tokens (any long random string)
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — for production (falls back to the
  `VITE_` / `NEXT_PUBLIC_` names)

On **Vercel**, add these under Project Settings → Environment Variables. The
[`../vercel.json`](../vercel.json) rewrite serves client routes from
`index.html` while leaving `/api/*` to the functions.
