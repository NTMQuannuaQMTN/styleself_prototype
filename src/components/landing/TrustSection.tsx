import { Container, Reveal } from './primitives'
import { DEMO_PRODUCTS } from './products'

const BLAZER = DEMO_PRODUCTS[0]

const GUARANTEES = [
  'Transaction preview',
  'User confirmation',
  'Identity verification',
  'Payment authorization',
]

export function TrustSection() {
  return (
    <section className="border-t border-line bg-ink py-20 text-paper md:py-28">
      <Container className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <p className="eyebrow mb-4 !text-paper/55">Trust &amp; consent</p>
          <h2 className="text-3xl leading-[1.12] text-paper sm:text-4xl">
            The agent does the work.{' '}
            <span className="italic text-accent-soft">
              The customer stays in control.
            </span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-paper/70">
            Every agent-driven transaction is transparent and explicitly
            authorized — no unrestricted autonomous payments.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {GUARANTEES.map((g) => (
              <li
                key={g}
                className="flex items-center gap-3 rounded-xl border border-paper/12 bg-paper/[0.04] px-4 py-3 text-sm text-paper/85"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/25 text-xs text-success">
                  ✓
                </span>
                {g}
              </li>
            ))}
          </ul>

          <p className="mt-8 font-display text-lg text-paper">
            Preview, confirm, verify, authorize — in that order, every time.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="rounded-[20px] border border-paper/12 bg-surface p-6 text-ink shadow-[0_50px_90px_-40px_rgba(0,0,0,0.55)]">
            <p className="eyebrow text-[0.6rem]">Purchase review</p>

            <div className="mt-4 flex items-center gap-3 border-b border-line pb-4">
              <img
                src={BLAZER.image}
                alt={BLAZER.alt}
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
              <span className="font-medium text-ink">Agent action:</span>{' '}
              Purchase on your behalf
            </div>

            <button type="button" className="btn btn-primary mt-4 w-full">
              Confirm &amp; Pay $94
            </button>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
