import { Container, Reveal, SectionHeading } from './primitives'

const UNDERSTANDS = [
  'Style',
  'Occasion',
  'Size',
  'Fit',
  'Color',
  'Budget',
  'Product attributes',
  'Inventory',
]

export function CategoryAgent() {
  return (
    <section className="border-t border-line py-20 md:py-28">
      <Container className="grid items-center gap-14 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <Reveal>
          <SectionHeading
            eyebrow="Pre-built category agent"
            title={
              <>
                Start with an agent that already{' '}
                <span className="italic text-accent">understands fashion.</span>
              </>
            }
            intro="Merchants don't build their agent from scratch. StyleSelf provides the category intelligence; merchants provide their catalog and business context."
          />
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
            No fine-tuning, no model training, no prompt engineering. The Fashion
            Commerce Agent ships ready — you point it at your products.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="rounded-[18px] border border-line-strong bg-surface p-6 shadow-[0_40px_80px_-50px_rgba(23,21,15,0.32)]">
            <p className="eyebrow text-[0.6rem]">StyleSelf Agent Library</p>

            <div className="mt-4 rounded-xl border border-ink bg-paper p-4">
              <div className="flex items-center justify-between">
                <p className="font-display text-base text-ink">
                  Fashion Commerce Agent
                </p>
                <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Ready to deploy
                </span>
              </div>

              <p className="mt-4 text-[0.7rem] uppercase tracking-[0.14em] text-muted">
                Understands
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {UNDERSTANDS.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-line-strong bg-surface px-2.5 py-1 text-xs text-ink-soft"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted">
              More category agents coming. Today, fashion is fully supported.
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
