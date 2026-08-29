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

Every authenticated user is a **merchant**. End shoppers are anonymous — they
talk to the deployed agent embedded on the merchant's own site.

```
src/
  main.tsx                  # <AuthProvider> + <AppRoutes>
  routes.tsx                # all routes, code-split with React.lazy
  lib/
    supabase.ts             # Supabase client (tolerates missing env)
    database.types.ts       # hand-written DB types (regenerate later)
  auth/
    AuthProvider.tsx        # session + profile + auth actions
    useAuth.ts, guards.tsx  # RequireAuth / RedirectIfAuthed / FullPageSpinner
    errors.ts
  components/
    landing/                # landing sections + Studio/Site mocks (mocks.tsx)
    auth/                   # AuthShell + form primitives
    agent/                  # AgentWidget (shared) + demoData
    merchant/               # MerchantLayout + ui primitives
    app/AppHeader.tsx       # signed-in top bar
  merchant/                 # store data layer: api, StoreProvider, useAsync, money
  pages/
    LandingPage.tsx
    auth/                   # Login, SignUp, Forgot/Reset password, OAuth callback
    merchant/               # Onboarding + Agent Studio pages
    agent/AgentPage.tsx     # public deployed agent (/agent/:agentId)
    NotFound.tsx
  hooks/useReveal.ts
```

## Routes

| Path | Notes |
| --- | --- |
| `/` | Landing page |
| `/login`, `/signup` | Merchant auth (email+password / Google). Authed users → `/merchant`. `/create-account` redirects to `/signup`. |
| `/forgot-password`, `/reset-password` | Password recovery |
| `/auth/callback` | OAuth + email-confirmation redirect target |
| `/merchant` | `RequireAuth` → onboarding or Agent Studio (`agent`, `catalog`, `locations`, `team`, `deploy`, `preview`) |
| `/agent/:agentId` | **Public, no auth** — the deployed Fashion Commerce Agent, embeddable via `<iframe>`. MVP renders a demo store; `/agent/demo` is linked from the landing page. |

## Merchant workspace (`/merchant`)

After signing in as a merchant you either onboard (create a store, or search for
one and request to join — an owner approves) or land in the Agent Studio:

- **Overview** — live store metrics
- **Agent Studio** — name, greeting, tone, currency, commerce rules (persisted)
- **Catalog** — products with variants and per-location inventory
- **Locations** — single store or many
- **Team** — members + join-request approvals
- **Deploy** — per-store embed snippet + go-live checklist/toggle
- **Preview** — a working (non-AI) agent over the store's real catalog

All of it is backed by Supabase with row-level security. See
[src/merchant/](src/merchant/) and [src/pages/merchant/](src/pages/merchant/).

## Status

**Merchant SaaS → agent deployment → embedded customer experience.**

- **Landing page** — sells the merchant deployment story (Studio + deployed-site
  mock, Upload/Configure/Deploy/Sell, "no AI team", pre-built fashion agent,
  single- vs multi-location, the customer conversation, 6-step deployment,
  agentic-payment trust). All demo data is static.
- **Auth** — real Supabase email/password + Google OAuth, session context,
  password recovery. One user type: merchant.
- **Merchant workspace** — onboarding, dashboard, Agent Studio, catalog,
  locations, team, deploy, preview. Backed by Supabase + RLS.
- **`/agent/:agentId`** — the deployed agent. Non-AI keyword/price search over a
  catalog with per-location availability; runs standalone with no backend.

Conversational AI reasoning and payments are later phases. The two SQL
migrations in [supabase/](supabase/) must be applied for auth + the workspace to
function; `/agent/demo` works without them.
