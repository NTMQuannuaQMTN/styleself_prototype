import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Container, Reveal, SectionHeading } from './primitives'
import { ROUTES } from './routes'
import { DEMO_PRODUCTS } from './products'

/* ------------------------------------------------------------------ helpers */

/** A mock of what the embedded agent shows a shopper — real catalog imagery. */
function AgentPreview() {
  return (
    <div className="overflow-hidden rounded-[18px] border border-line-strong bg-surface shadow-[0_40px_90px_-45px_rgba(23,21,15,0.35)]">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="font-display text-sm text-ink">Stylist</span>
        <span className="ml-auto rounded-full border border-line-strong px-2 py-0.5 text-[0.6rem] text-muted">
          Cart 1
        </span>
      </div>

      <div className="space-y-3 px-4 py-4">
        <p className="ml-auto w-fit rounded-2xl rounded-br-sm bg-ink px-3 py-2 text-[0.8rem] text-paper">
          Something smart casual under $150
        </p>
        <p className="w-fit rounded-2xl rounded-bl-sm bg-paper px-3 py-2 text-[0.8rem] text-ink-soft">
          Three that work — all in stock in your size.
        </p>

        <div className="grid grid-cols-3 gap-2.5">
          {DEMO_PRODUCTS.map((p) => (
            <figure
              key={p.name}
              className="overflow-hidden rounded-xl border border-line bg-paper"
            >
              <img
                src={p.image}
                alt={p.alt}
                loading="lazy"
                decoding="async"
                className="aspect-[3/4] w-full object-cover"
              />
              <figcaption className="px-2 py-1.5">
                <p className="truncate text-[0.7rem] text-ink">{p.name}</p>
                <p className="font-display text-[0.72rem] text-accent">
                  {p.price}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent px-3 py-1 text-[0.7rem] font-semibold text-paper">
            Checkout $94
          </span>
          <span className="text-[0.72rem] text-muted">
            Linen Blazer · Size M
          </span>
        </div>
      </div>
    </div>
  )
}

/** Inherits the surrounding text colour, so it reads on both light and dark. */
function Mono({ children }: { children: ReactNode }) {
  return (
    <code
      className="rounded px-1.5 py-0.5 font-mono text-[0.82em]"
      style={{
        backgroundColor: 'color-mix(in srgb, currentColor 12%, transparent)',
      }}
    >
      {children}
    </code>
  )
}

function Tick() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-[0.7rem] text-success">
      ✓
    </span>
  )
}

/* --------------------------------------------------------------------- hero */

export function StoryHero() {
  return (
    <section className="relative scroll-mt-20 pt-14 pb-20 sm:pt-20 md:pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(55% 50% at 82% 4%, rgba(154,91,63,0.10) 0%, rgba(247,245,241,0) 60%)',
        }}
      />
      <Container className="grid items-center gap-14 lg:grid-cols-[1fr_0.92fr] lg:gap-16">
        <div className="reveal is-visible min-w-0">
          <p className="eyebrow">AI + Payments for Fashion Commerce</p>
          <h1 className="mt-5 text-[2.5rem] leading-[1.06] sm:text-5xl lg:text-[3.4rem] lg:leading-[1.04]">
            An agent that advises.{' '}
            <span className="italic text-accent">
              A checkout that never guesses.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            StyleSelf gives fashion merchants a configurable AI shopping agent and
            a deterministic, Visa-shaped payment flow — two separate paths, so no
            model output can ever move money. Configure it, embed one line, go
            live.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to={ROUTES.signup} className="btn btn-primary">
              Deploy Your Agent
            </Link>
            <Link to={ROUTES.demoAgent} className="btn btn-secondary">
              See the live demo
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
            {[
              'API key never reaches the browser',
              'Prices & stock computed server-side',
              'Every order audited',
            ].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="reveal is-visible min-w-0 [transition-delay:120ms]">
          <AgentPreview />
        </div>
      </Container>
    </section>
  )
}

/* ------------------------------------------------------------ architecture */

export function SplitArchitecture() {
  return (
    <section
      id="architecture"
      className="scroll-mt-20 border-t border-line bg-surface py-20 md:py-28"
    >
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Architecture"
            title={
              <>
                Two separated paths.{' '}
                <span className="italic text-accent">
                  The separation is the safety property.
                </span>
              </>
            }
            intro="The AI advises; a deterministic endpoint pays. They never share a code path — so a persuaded or prompt-injected model still can't authorize a charge."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <Reveal className="flex flex-col rounded-[18px] border border-line-strong bg-paper p-6 sm:p-7">
            <p className="eyebrow text-[0.6rem]">The AI path</p>
            <p className="mt-3 font-mono text-sm text-ink">
              POST /api/agent/chat
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Runs server-side on OpenAI <Mono>gpt-4o-mini</Mono> — the key never
              reaches the browser. Each turn is a bounded tool loop: the model
              picks a tool, the server runs it on real data and feeds the result
              back, until it replies.
            </p>
            <ul className="mt-5 space-y-2 border-t border-line pt-5 text-sm text-ink-soft">
              {[
                <>
                  The model never invents numbers — prices, stock, sizes and
                  totals all come from the backend.
                </>,
                <>
                  5 deterministic tools: <Mono>search_products</Mono>,{' '}
                  <Mono>get_product_details</Mono>, <Mono>check_inventory</Mono>,{' '}
                  <Mono>add_to_cart</Mono>, <Mono>create_order_preview</Mono>.
                </>,
              ].map((node, i) => (
                <li key={i} className="flex gap-2.5">
                  <Tick />
                  <span>{node}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal
            delay={90}
            className="flex flex-col rounded-[18px] border border-line-strong bg-paper p-6 sm:p-7"
          >
            <p className="eyebrow text-[0.6rem]">The payment path</p>
            <p className="mt-3 font-mono text-sm text-ink">
              POST /api/agent/checkout
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              No AI — no model output can trigger a charge. State moves through
              HMAC-signed stateless tokens, each pinning the exact items, total
              and buyer.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5 text-xs">
              {['draft', 'authorized', 'paid'].map((s, i) => (
                <span key={s} className="flex items-center gap-2">
                  {i > 0 && <span className="text-line-strong">→</span>}
                  <span className="rounded-full border border-line-strong bg-surface px-2.5 py-1 font-mono text-ink-soft">
                    {s}
                  </span>
                </span>
              ))}
            </div>
            <ul className="mt-5 space-y-2 text-sm text-ink-soft">
              {[
                'A tampered or inflated total fails signature or mandate checks.',
                'Idempotent on (conversation_id, draft_hash) — a replay returns the same order.',
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <Tick />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <p className="mx-auto mt-8 max-w-2xl text-center font-display text-lg text-ink">
            The chat can recommend. Only the checkout endpoint, with two valid
            signed tokens, can charge.
          </p>
        </Reveal>
      </Container>
    </section>
  )
}

/* --------------------------------------------------------------- visa stack */

const VISA_STAGES = [
  {
    name: 'Tokenize',
    sub: 'Visa Token Service',
    body: 'PAN → network token. The browser only ever sends the last-4, so the real card number never reaches the server.',
  },
  {
    name: 'Authorize',
    sub: '3-D Secure + spend mandate',
    body: 'A 6-digit OTP simulates the issuer step-up. An amount over the mandate ceiling is declined here — at the network layer.',
  },
  {
    name: 'Capture',
    sub: 'Clearing',
    body: 'Moves the authorization hold into clearing.',
  },
  {
    name: 'Settle',
    sub: 'Visa Direct',
    body: 'Pushes funds to the merchant’s payout account, with interchange applied.',
  },
]

export function VisaStack() {
  return (
    <section className="scroll-mt-20 border-t border-line bg-paper py-20 md:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="The payment path, in detail"
            title={
              <>
                A simulated{' '}
                <span className="italic text-accent">Visa Payments Stack</span>
              </>
            }
            intro={
              <>
                Four stages, real in API shape, no network calls (
                <Mono>server/agent/visa.ts</Mono>). To go live, drop a real
                third-party into each part — nothing else moves.
              </>
            }
          />
        </Reveal>

        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VISA_STAGES.map((stage, i) => (
            <Reveal
              key={stage.name}
              as="li"
              delay={i * 70}
              className="rounded-[16px] border border-line-strong bg-surface p-5"
            >
              <span className="font-display text-sm text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="mt-2 text-[0.95rem] font-medium text-ink">
                {stage.name}
              </p>
              <p className="text-xs text-muted">{stage.sub}</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {stage.body}
              </p>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  )
}

/* ------------------------------------------------------------------- trust */

const SAFEGUARDS = [
  {
    title: 'Transaction preview',
    body: 'Line items, delivery and total — shown before any card details.',
  },
  {
    title: 'Identity step',
    body: 'Name + card, then a simulated 3-D Secure code. The number is Luhn-checked in the browser; only the last-4 and network are sent.',
  },
  {
    title: 'Spend mandate',
    body: 'The order total is signed into the tokens as a ceiling. An inflated total is declined at authorize() — at the network layer, not just the UI.',
    strong: true,
  },
]

const UNDERNEATH = [
  {
    title: 'Access control',
    body: (
      <>
        The iframe carries an <Mono>embed_key</Mono> — wrong or missing,
        rejected. Row-level security keeps each merchant to its own data; the
        anon role is read-only, and only when <Mono>agent_live = true</Mono>.{' '}
        <Mono>agent_checkout</Mono> is the only writer of orders and inventory.
      </>
    ),
  },
  {
    title: 'Audit log',
    body: (
      <>
        Every order lands in <Mono>agent_orders</Mono> /{' '}
        <Mono>agent_order_items</Mono> and shows at{' '}
        <Mono>/merchant/orders</Mono> — items, buyer, total, auth result.
      </>
    ),
  },
]

export function TrustSecurity() {
  return (
    <section
      id="security"
      className="scroll-mt-20 border-t border-line bg-ink py-20 text-paper md:py-28"
    >
      <Container>
        <Reveal className="max-w-2xl">
          <p className="eyebrow mb-4 !text-paper/55">Trust &amp; security</p>
          <h2 className="text-3xl leading-[1.12] text-paper sm:text-4xl">
            The agent does the work.{' '}
            <span className="italic text-accent-soft">
              The shopper authorizes every step.
            </span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-paper/70">
            Three checkpoints, in order — preview, identity, then a signed spend
            ceiling the network itself enforces.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_360px] lg:gap-16">
          {/* the flow */}
          <ol>
            {SAFEGUARDS.map((s, i) => (
              <Reveal
                key={s.title}
                as="li"
                delay={i * 90}
                className="relative flex gap-5 pb-9 last:pb-0"
              >
                {i < SAFEGUARDS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-[19px] top-11 bottom-1 w-px bg-paper/15"
                  />
                )}
                <span
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-display text-sm ${
                    s.strong
                      ? 'border-accent-soft/40 bg-accent text-paper'
                      : 'border-paper/20 bg-ink text-paper/70'
                  }`}
                >
                  {i + 1}
                </span>
                <div
                  className={`min-w-0 flex-1 rounded-2xl border p-5 ${
                    s.strong
                      ? 'border-accent-soft/25 bg-accent-soft/[0.08]'
                      : 'border-paper/10 bg-paper/[0.035]'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg text-paper">{s.title}</p>
                    {s.strong && (
                      <span className="rounded-full border border-accent-soft/40 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-accent-soft">
                        Network-enforced
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-paper/70">
                    {s.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>

          {/* the artifact */}
          <Reveal delay={120} className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[20px] border border-paper/12 bg-surface p-6 text-ink shadow-[0_50px_90px_-40px_rgba(0,0,0,0.55)]">
              <p className="eyebrow text-[0.6rem]">Purchase review</p>
              <div className="mt-4 flex items-center gap-3 border-b border-line pb-4">
                <img
                  src={DEMO_PRODUCTS[0].image}
                  alt={DEMO_PRODUCTS[0].alt}
                  loading="lazy"
                  decoding="async"
                  className="h-14 w-11 shrink-0 rounded-md object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-ink">Linen Blazer</p>
                  <p className="text-xs text-muted">Size M × 1</p>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Product</dt>
                  <dd className="text-ink">$89</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Delivery</dt>
                  <dd className="text-ink">$5</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-2 font-medium">
                  <dt className="text-ink">Total</dt>
                  <dd className="font-display text-base text-ink">$94</dd>
                </div>
              </dl>
              <div className="mt-4 rounded-lg bg-paper px-3 py-2.5 text-xs text-muted">
                <span className="font-medium text-ink">Signed ceiling: $94</span>{' '}
                — any <Mono>authorize()</Mono> over this is declined.
              </div>
              <button type="button" className="btn btn-primary mt-4 w-full">
                Confirm &amp; Pay $94
              </button>
            </div>
          </Reveal>
        </div>

        {/* underneath */}
        <Reveal delay={80} className="mt-14">
          <p className="eyebrow mb-4 !text-paper/45">Underneath</p>
          <div className="grid gap-5 sm:grid-cols-2">
            {UNDERNEATH.map((u) => (
              <div
                key={u.title}
                className="rounded-2xl border border-paper/12 bg-paper/[0.03] p-6"
              >
                <p className="font-display text-base text-paper">{u.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-paper/70">
                  {u.body}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  )
}

/* -------------------------------------------------------------- onboarding */

const ONBOARDING = [
  {
    title: 'Sign up',
    body: 'Email and password, or Google. Every authenticated user is a merchant.',
  },
  {
    title: 'Create a store',
    body: 'Or search for an existing one and request to join it.',
  },
  {
    title: 'Add a catalog',
    body: 'One product at a time, or import a CSV — download the template, fill in products and stock, upload it back.',
  },
  {
    title: 'Configure the agent',
    body: 'Name, greeting, brand voice, category focus, currency, recommendation limit, confirmation rule.',
  },
  {
    title: 'Set a payout account',
    body: 'Where settled funds land.',
  },
  {
    title: 'Deploy',
    body: 'Copy a one-line <iframe>, run the go-live checklist, flip the publish toggle.',
  },
]

export function Onboarding() {
  return (
    <section
      id="for-merchants"
      className="scroll-mt-20 border-t border-line bg-surface py-20 md:py-28"
    >
      <Container className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <Reveal>
            <SectionHeading
              eyebrow="Merchant onboarding"
              title={
                <>
                  The whole process is{' '}
                  <span className="italic text-accent">no-code.</span>
                </>
              }
              intro="Six steps from sign-up to a live agent embedded on your site."
            />
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-8 rounded-[16px] border border-line-strong bg-paper p-6">
              <p className="font-display text-base text-ink">
                Scales from an SME to a chain
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">
                A brand is one <Mono>stores</Mono> row. An SME has one location; a
                chain adds branches as managers join, each RLS-scoped to its own.
                The public agent searches the whole catalogue and says which
                branch has an item.
              </p>
            </div>
          </Reveal>
        </div>

        <ol className="border-t border-line">
          {ONBOARDING.map((step, i) => (
            <Reveal
              key={step.title}
              as="li"
              delay={i * 55}
              className="flex gap-5 border-b border-line py-4"
            >
              <span className="font-display text-sm text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="text-[0.95rem] font-medium text-ink">
                  {step.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  )
}

/* ------------------------------------------------------------------- final */

export function StoryCTA() {
  return (
    <section className="border-t border-line bg-paper py-20 md:py-28">
      <Container className="text-center">
        <Reveal>
          <h2 className="mx-auto max-w-2xl text-3xl leading-[1.12] sm:text-4xl">
            Deploy an agent that can sell —{' '}
            <span className="italic text-accent">
              and a checkout that can&rsquo;t be tricked.
            </span>
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={ROUTES.signup} className="btn btn-primary">
              Deploy Your Agent
            </Link>
            <Link to={ROUTES.demoAgent} className="btn btn-secondary">
              Try the demo
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
