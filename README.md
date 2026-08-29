# StyleSelf

**A pre-built, category-trained AI commerce agent that any fashion merchant embeds
with one line of HTML.** Shoppers discover, compare, decide, and pay — Visa
checkout included — without ever leaving the conversation.

Built for **NUS LifeHack 2026 — Visa track, "Conversational Commerce Agents"**.

- **Live demo:** https://styleself.vercel.app/ → open `/agent/demo`
- **Demo video:** _add your link here_

---

## Try it in 2 minutes

The fastest path needs **only an OpenAI API key** — `/agent/demo` runs the full
`discover → decide → cart → authenticate → pay` flow on a built-in sample catalog
with **no database**.

```bash
git clone <this-repo> && cd <this-repo>
npm install

# one file, one key:
printf 'OPENAI_API_KEY=sk-your-key-here\n' > .env

npm run dev
```

Open **http://localhost:5173/agent/demo** and talk to the agent. That's it.

> No OpenAI key? The **landing page** (`http://localhost:5173/`) still runs and
> walks through the whole product story with static data.

To run the **merchant workspace** (sign-up, catalog, deploy, live-store
checkout), you also need a free Supabase project — see
[Full setup](#full-setup) below.

---

## The demo flow (what to show a judge)

Open `/agent/demo` and follow the five steps the brief asks for. Try this script:

| Step | Say this | What happens |
| --- | --- | --- |
| **1. Discover** | *"I need something for a summer wedding, budget around $150"* | The agent calls `search_products`, returns ranked cards, leads with one top pick and says why it fits. |
| **2. Decide** | *"Compare the first two"* | A side-by-side comparison table (price, material, colours, sizes, stock) renders automatically. |
| **3. Build cart** | Pick a size + colour on a card → **"Add 1 to bag"** | The agent runs `add_to_cart`; the "Current cart" panel updates. Add a second item if you like. |
| **4. Authenticate** | *"I'm ready to check out"* → **Confirm & Pay** → enter card | Order preview shows the total. You explicitly **authorize the agent to spend up to that amount**. Card number is Luhn-checked in the browser; only the last-4 + brand are sent. A signed authorization token is returned. |
| **5. Pay** | **Pay $…** | The amount runs through the simulated **Visa Payments Stack**: tokenize (VTS) → 3-D Secure authorize *checked against your spend mandate* → capture → Visa Direct settlement. You get an order ID, auth code, and settlement line — all inside the chat, no redirect. |

**Test cards** (any Luhn-valid number works; these trigger specific paths):

| Number | Result |
| --- | --- |
| `4111 1111 1111 1111` | Visa, approved |
| `4000 0000 0000 0002` | Issuer decline (the canonical Visa test decline) |

Nothing is ever charged — the Visa step is a clearly isolated simulation
([`server/agent/visa.ts`](server/agent/visa.ts)).

### Trust & consent, on screen

- **Transaction preview** before any card entry — line items, delivery, total.
- **Identity step** — cardholder name + card details gate a signed authorization
  token; payment can't proceed without it.
- **Spend mandate** — "you authorize the agent to charge up to $X"; the Visa
  authorizer *rejects* a charge above that ceiling.
- **The agent never learns the payment result** and never claims an order is
  placed — the shopper drives the checkout card and sees the confirmation there.
  AI text can never trigger a charge; payment is a separate deterministic
  endpoint, not a tool.
- **Audit** — every completed sale is written to `agent_orders` and shown at
  `/merchant/orders`.

---

## Merchant onboarding flow

Every authenticated user is a **merchant**. End shoppers are anonymous and only
ever touch the embedded agent.

1. **Sign up** (`/signup`) — email/password or Google.
2. **Create a store** (`/merchant`) or search for one and request to join.
3. **Add your catalog** (`/merchant/catalog`):
   - one product at a time, **or**
   - **bulk-import a CSV** (`Catalog → Import CSV`): download the template, fill
     in products + stock, upload it back. Rows match existing products by `sku`,
     stock and details update in place, new products are created, missing columns
     are tolerated, and **nothing is ever deleted** — you review every change
     before applying.
4. **Add locations** (`/merchant/locations`) — one for an SME, many for a
   multi-location retailer. Stock and products are tracked per location.
5. **Configure the agent** (`/merchant/agent`) — name, greeting, brand
   description, fashion focus, tone, currency, recommendation limit, confirmation
   rule, commerce rules. No-code.
6. **Set a payout account** (`/merchant/settings`) — settlement destination
   (last-4 only), echoed on the shopper's confirmation.
7. **Deploy** (`/merchant/deploy`) — copy the one-line `<iframe>` snippet, run the
   go-live checklist, flip the publish toggle.

```html
<iframe
  src="https://your-styleself-host/agent/your-store-slug?k=your-embed-key"
  title="Your Store — Shopping assistant"
  width="100%" height="640"
  style="border:0;border-radius:16px;max-width:480px"
></iframe>
```

**SME vs large retailer:** a brand is one `stores` row. A single-location SME just
has its primary location. A multi-location retailer's branch managers request to
join; approval creates a branch location and scopes that manager (via row-level
security) to only their branch's products and stock. Owners/admins see the whole
brand. The public agent always searches the full brand catalogue and tells the
shopper which branch has an item.

---

## Architecture (AI + payments integration)

```
                 merchant's site
                       │
          <iframe src="/agent/:slug?k=…">
                       │
   ┌───────────────────┴────────────────────────────────────────┐
   │  React SPA (Vite + TS, Tailwind v4) — chat UI only          │
   │  keeps conversation state client-side, echoes it each turn  │
   └───────┬───────────────────────────────┬────────────────────┘
           │                               │
  POST /api/agent/chat            POST /api/agent/checkout
  handleAgentChat (server)        handleCheckout (server) — NO AI
  ─ OpenAI gpt-4o-mini            ─ action 'authorize': name + card
    + tool loop (≤3 rounds)         → signed authorization token
  ─ 5 tools, all deterministic    ─ action 'pay': verifies draft +
    over the merchant's data:       auth tokens, then:
      search_products                · demo → in-memory decrement
      get_product_details            · live → agent_checkout() RPC
      check_inventory                  (only writer; re-validates
      add_to_cart                      price + stock; idempotent on
      create_order_preview            (conversation_id, draft_hash))
  ─ signs a 15-min order-draft    ─ runs the amount through the
    token (HMAC) with a spend       simulated Visa Payments Stack:
    mandate on any order draft      VTS → 3-DS auth (mandate check)
                                    → capture → Visa Direct settle
           │                               │
           └───────────────┬───────────────┘
                           │
                  Supabase (Postgres + RLS)
        stores · store_agents · store_locations · store_members
        products · product_variants · inventory
        agent_orders · agent_order_items   (audit; members-only read)
        anon role: read-only, and ONLY when stores.agent_live = true
```

**Key invariants**

- **Prices, stock, sizes, colours, totals are always computed by the backend**,
  never by the model. The catalog is never sent whole — `search_products`
  returns ≤8 ranked candidates.
- **Payment is an endpoint, not a tool.** No AI output can trigger a charge.
- Payment state is carried in **HMAC-signed stateless tokens**
  (`draft → authorized → paid`), each pinning the exact items + total + buyer.
- The `agent_checkout` RPC is the **only** writer of orders/inventory and is
  idempotent on `(conversation_id, draft_hash)`.
- `/agent/demo` exercises the entire flow (real AI, simulated payment) with no
  database.

---

## Stack

| Piece | Choice |
| --- | --- |
| Frontend | Vite + React 19 + TypeScript (SPA), Tailwind v4, react-router-dom v7 |
| Auth + DB | Supabase (`@supabase/supabase-js`) — Postgres + row-level security, email/password + Google OAuth |
| Agent runtime | OpenAI (`gpt-4o-mini`, env `AI_MODEL`) — **server-side only**, the key never reaches the browser |
| Payments | Simulated Visa Payments Stack ([`server/agent/visa.ts`](server/agent/visa.ts)) — four real stages, real API-shaped responses, no network |
| Hosting | Vercel — SPA + two serverless functions (`api/agent/chat.js`, `api/agent/checkout.js`), esbuild-bundled from `server/agent/*-entry.ts` |
| Node | 22.x |

## Scripts

```bash
npm run dev      # Vite + the /api/agent/* middleware (agent runs in Node)
npm run build    # build:fn (esbuild the functions) → tsc -b → vite build
npm run build:fn # regenerate api/agent/*.js after editing server/agent/*
npm run lint     # oxlint
npm run preview  # preview the production build
```

---

## Full setup

For the merchant workspace and live-store checkout you need a free Supabase
project.

### 1. Environment

Copy [`.env.example`](.env.example):

```bash
cp .env.example .env.local   # browser vars
cp .env.example .env         # server vars (gitignored)
```

- **`.env.local`** (browser): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **`.env`** (server only, never bundled): `OPENAI_API_KEY`, optional `AI_MODEL`,
  `AGENT_SIGNING_SECRET` (any long random string — **required in production**),
  and `SUPABASE_URL` / `SUPABASE_ANON_KEY`

### 2. Database

Apply the migrations in [`supabase/migrations/`](supabase/migrations/) **in
filename order** — SQL Editor, or `supabase db push`. Details and the auth
provider setup (Site URL / redirect allow-list for OAuth) are in
[`supabase/README.md`](supabase/README.md).

### 3. Production (Vercel)

Set the same server env vars under **Project Settings → Environment Variables**.
[`vercel.json`](vercel.json) rewrites every non-`/api/*` path to `index.html`.
After editing anything under `server/agent/`, run `npm run build:fn` and commit
the regenerated `api/agent/*.js`.

---

## Routes

| Path | Auth | Notes |
| --- | --- | --- |
| `/` | public | Landing page (static demo data) |
| `/login` `/signup` `/forgot-password` `/reset-password` `/auth/callback` | public | Merchant auth |
| `/merchant/*` | required | Workspace: `agent` `catalog` `catalog/import` `orders` `locations` `team` `deploy` `preview` `settings` |
| `/agent/demo` | **public, no key** | The agent on a built-in sample catalog — the quickest end-to-end demo |
| `/agent/:slug?k=<embed_key>` | **public** | The deployed agent for a live store, embeddable via `<iframe>` |
| `POST /api/agent/chat` | — | Agent runtime (Node / serverless) |
| `POST /api/agent/checkout` | — | Deterministic payment — `authorize` + `pay`, no AI |

## Repository layout

```
src/
  agent/                     browser-safe wire layer (types + fetch)
  components/agent/          the chat widget (AgentChat, ProductCards, OrderPreview, …)
  components/landing/        marketing page (static)
  merchant/                  store data layer (Supabase under RLS) + providers
  pages/                     LandingPage, auth/, merchant/, agent/AgentPage
server/agent/
  handler.ts                 resolves merchant context, short-circuits the opening turn
  runtime.ts                 OpenAI chat + tool loop, response assembly, token signing
  tools.ts                   the 5 tools + cart logic (deterministic)
  checkout.ts                the no-AI payment endpoint (authorize / pay)
  orders.ts                  simulateCheckout (demo) + runCheckout (live → RPC)
  visa.ts                    isolated Visa Payments Stack simulator (4 stages)
  signing.ts                 HMAC-signed stateless tokens
  catalog.ts prompt.ts env.ts
api/agent/chat.js  checkout.js   generated by `npm run build:fn`, committed
supabase/migrations/             apply in filename order
```
