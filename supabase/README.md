# Supabase

Schema and setup for StyleSelf authentication.

## Migrations

- [`migrations/20260829120000_profiles_and_auth.sql`](migrations/20260829120000_profiles_and_auth.sql)
  — `profiles` table (role + identity), RLS policies, and the trigger that
  creates a profile automatically on signup.

Apply it one of two ways:

**Dashboard** — open the SQL Editor and run the file's contents.

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
   Cloud console.
3. **Authentication → URL Configuration** — set **Site URL** to your dev origin
   (`http://localhost:5173`) and add it (plus any deploy URL) to
   **Redirect URLs**. The app redirects OAuth and password-reset links to
   `<origin>/auth/callback` and `<origin>/reset-password`.

## App credentials

Copy [`../.env.example`](../.env.example) to `../.env.local` and fill in
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from **Project Settings → API**.
