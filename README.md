# StyleSelf

AI commerce for fashion. StyleSelf gives fashion merchants a ready-to-deploy AI
commerce agent that helps customers discover, compare, and buy — all without
leaving the conversation.

## Stack

- **Vite** + **React 19** + **TypeScript** (SPA, deployed on Vercel)
- **Tailwind CSS v4** (`@tailwindcss/vite`), tokens in [src/index.css](src/index.css)
- **react-router-dom** for routing
- **Supabase** (`@supabase/supabase-js`) for auth + data
- **OpenAI** (`gpt-4o-mini`) for the agent runtime — server-side only

## Setup

```bash
npm install
cp .env.example .env.local   # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (browser)
# put OPENAI_API_KEY (+ SUPABASE_URL / SUPABASE_ANON_KEY) in .env  (server-only, gitignored)
npm run dev
```

`npm run dev` also serves `POST /api/agent/chat` from the Vite dev server (see
[server/vite-agent-plugin.ts](server/vite-agent-plugin.ts)) so the agent runs in
Node — the OpenAI key never reaches the browser. In production the same
`handleAgentChat` runs as a serverless function ([api/agent/chat.ts](api/agent/chat.ts)).

Apply the database schema and configure auth — see
[supabase/README.md](supabase/README.md). Without credentials the landing page
still runs; the auth and agent screens show a setup notice.

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
  main.tsx / routes.tsx     # <AuthProvider> + code-split routes
  lib/                      # supabase client, hand-written DB types
  auth/                     # AuthProvider, guards, errors
  agent/                    # types.ts + client.ts  (browser-safe wire layer)
  components/
    landing/  auth/  merchant/  app/
    agent/                  # AgentChat, ChatMessage, ProductCards, ComparisonCard, OrderPreview
  merchant/                 # store data layer: api, StoreProvider, useAsync, money
  pages/
    LandingPage.tsx  auth/  merchant/
    agent/AgentPage.tsx     # public deployed agent (/agent/:agentId)

server/
  vite-agent-plugin.ts      # dev: mounts /api/agent/chat on the Vite server
  agent/                    # handler, runtime (OpenAI loop), tools, catalog, prompt, env
api/agent/chat.ts           # prod: serverless entry → server/agent/handler
```

## Routes

| Path | Notes |
| --- | --- |
| `/` | Landing page |
| `/login`, `/signup` | Merchant auth (email+password / Google). Authed users → `/merchant`. `/create-account` redirects to `/signup`. |
| `/forgot-password`, `/reset-password` | Password recovery |
| `/auth/callback` | OAuth + email-confirmation redirect target |
| `/merchant` | `RequireAuth` → onboarding or Agent Studio (`agent`, `catalog`, `locations`, `team`, `deploy`, `preview`, `settings`); `/merchant/account` for profile |
| `/agent/:agentId` | **Public, no auth** — the deployed Fashion Commerce Agent, embeddable via `<iframe>`. `agentId` = the store's slug; `/agent/demo` runs on a built-in sample catalog. |
| `POST /api/agent/chat` | Agent runtime (not a page). Node/serverless. |

## Merchant workspace (`/merchant`)

After signing in as a merchant you either onboard (create a store, or search for
one and request to join — an owner approves) or land in the Agent Studio:

- **Overview** — live store metrics
- **Agent Studio** — name, greeting, tone, currency, commerce rules (persisted)
- **Catalog** — products with variants and per-location inventory
- **Locations** — single store or many
- **Team** — members + join-request approvals
- **Deploy** — per-store `<iframe>` embed snippet + go-live checklist/toggle
- **Preview** — the real AI agent over this store's catalog (uses OpenAI credits)

All of it is backed by Supabase with row-level security. See
[src/merchant/](src/merchant/) and [src/pages/merchant/](src/pages/merchant/).

## Agent architecture

```
iframe /agent/:slug  ──POST /api/agent/chat──▶  handleAgentChat  (server/agent/)
                                                    │  resolve store + config (Supabase, RLS-scoped)
                                                    │  runTurn: OpenAI (gpt-4o-mini) + tool loop
                                                    ▼
                    search_products · check_inventory · compare_products · create_order_preview
                                     (deterministic, backed by the merchant's data)
                                                    ▼
              structured AgentReply { message, products?, comparison?, orderPreview?, action, context }
```

- The model handles conversation + tool choice; **prices, stock, and totals are
  always computed by the tools**, never the model.
- The catalog is never sent whole — `search_products` returns ≤8 ranked
  candidates; the merchant's `recommendation_limit` caps what's shown.
- Conversation state (recent turns + shown-product ids + preferences) is kept
  client-side and echoed each turn, so "the first two" resolves without a call.
- Types shared client/server: [src/agent/types.ts](src/agent/types.ts). Server
  code: [server/agent/](server/agent/). Public UI: [src/components/agent/](src/components/agent/).

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
- **`/agent/:agentId`** — the deployed AI agent. Real OpenAI tool-calling over the
  merchant's live catalog: discovery, recommendations, comparison, inventory,
  order preview, explicit Confirm & Pay. Payment execution is a later phase.

Conversational AI reasoning and payments are later phases. The two SQL
migrations in [supabase/](supabase/) must be applied for auth + the workspace to
function; `/agent/demo` works without them.
