# Supabase

Schema and setup for StyleSelf.

## Migrations

Run them **in order** in the SQL Editor (or `supabase db push`):

1. [`migrations/20260829120000_profiles_and_auth.sql`](migrations/20260829120000_profiles_and_auth.sql)
   — `profiles` table (identity only — every user is a merchant, there is no
   role), RLS, and the trigger that creates a profile automatically on signup.
2. [`migrations/20260829130000_stores_and_catalog.sql`](migrations/20260829130000_stores_and_catalog.sql)
   — merchant workspace: `stores`, `store_members`, `store_agents`,
   `store_locations`, `store_join_requests`, `products`, `product_variants`,
   `inventory`; RLS for all of them; `approve_join_request` / `reject_join_request`
   RPCs; triggers that seed a store's owner + agent + first location on creation.

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
3. **Authentication → URL Configuration** — set **Site URL** to your dev origin
   (`http://localhost:5173`) and add it (plus any deploy URL) to
   **Redirect URLs**. The app redirects OAuth and password-reset links to
   `<origin>/auth/callback` and `<origin>/reset-password`.

The public `/agent/:agentId` route needs no auth — end shoppers are anonymous.

## App credentials

Copy [`../.env.example`](../.env.example) to `../.env.local` and fill in
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from **Project Settings → API**.
