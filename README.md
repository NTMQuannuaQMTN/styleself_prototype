# StyleSelf

AI commerce for fashion. StyleSelf gives fashion merchants a ready-to-deploy AI
commerce agent that helps customers discover, compare, and buy — all without
leaving the conversation.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (`@tailwindcss/vite`) for styling, tokens defined in
  [src/index.css](src/index.css)
- **react-router-dom** for routing
- **Supabase** (`@supabase/supabase-js`) for auth

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

Apply the database schema and configure the auth providers — see
[supabase/README.md](supabase/README.md). Without credentials the landing page
still runs; the auth screens show a setup notice.

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run lint     # oxlint
npm run preview  # preview the production build
```

## Structure

```
src/
  main.tsx                  # router + <AuthProvider>
  lib/
    supabase.ts             # Supabase client (tolerates missing env)
    database.types.ts       # hand-written DB types (regenerate later)
  auth/
    AuthProvider.tsx        # session + profile + auth actions
    useAuth.ts              # useAuth() hook
    guards.tsx              # RequireAuth / RequireRole / RoleRedirect / RedirectIfAuthed
    roles.ts, errors.ts
  components/
    landing/                # landing sections + Studio/Site mocks (mocks.tsx)
    auth/                   # AuthShell + form primitives
    app/AppHeader.tsx       # signed-in top bar
  pages/
    LandingPage.tsx
    auth/                   # Login, SignUp, Forgot/Reset password, OAuth callback
    merchant/, shop/        # role dashboards (placeholders for now)
    NotFound.tsx
  hooks/useReveal.ts
```

## Routes

| Path | Notes |
| --- | --- |
| `/` | Landing page |
| `/login` | Email+password / Google; redirects authed users to `/app` |
| `/create-account` | Role chooser, then signup; `?role=merchant\|customer` skips the chooser |
| `/forgot-password`, `/reset-password` | Password recovery |
| `/auth/callback` | OAuth + email-confirmation redirect target |
| `/app` | Neutral post-login target — forwards to the role's home |
| `/merchant` | `RequireRole="merchant"` — placeholder dashboard |
| `/shop` | `RequireRole="customer"` — placeholder |

## Status

**Landing page + authentication (phases 1–2) are in.**

The landing page sells the merchant deployment story: configure a pre-built
Fashion Commerce Agent in the Studio → embed it on your site → customers shop
through conversation. Sections: hero (Studio + deployed-site mock), the
Upload/Configure/Deploy/Sell path, "no AI team required", the pre-built category
agent, single- vs multi-location, the customer conversation, the 6-step
deployment + embed code, agentic-payment trust, final CTA.

Auth: real Supabase email/password + Google OAuth, session context, role-gated
routes (`/merchant`, `/shop`), sign-out. Dashboards behind auth are minimal
placeholders — the Agent Studio, customer agent, and payments are later phases.
All landing-page data is static/mock.
