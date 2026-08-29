import type { ReactNode } from 'react'
import { Container, Reveal, SectionHeading } from './primitives'
import { AgentBubble } from './chat'

function StoreCard({ children, meta }: { children: ReactNode; meta: string }) {
  return (
    <div className="rounded-[18px] border border-line-strong bg-surface p-6 shadow-[0_30px_60px_-45px_rgba(23,21,15,0.28)]">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-lg tracking-tight text-ink">
          Urban Thread
        </p>
        <span className="text-xs uppercase tracking-[0.12em] text-muted">
          {meta}
        </span>
      </div>
      <div className="my-5 h-px bg-line" />
      <p className="text-sm font-medium text-ink">Black Linen Shirt</p>
      <p className="text-xs text-muted">Size M</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}

export function LocationInventory() {
  return (
    <section className="border-t border-line bg-surface py-20 md:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Any merchant size"
            title={
              <>
                Built for one store or{' '}
                <span className="italic text-accent">one hundred.</span>
              </>
            }
            intro="The agent answers real inventory questions — whether the merchant runs a single shop or a national chain."
          />
        </Reveal>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <Reveal className="flex flex-col gap-4">
            <p className="eyebrow">Single-location SME</p>
            <StoreCard meta="Singapore">
              <div className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <span className="font-medium text-ink">3 in stock</span>
              </div>
            </StoreCard>
            <AgentBubble>
              Yes — the black linen shirt in M is available.
            </AgentBubble>
          </Reveal>

          <Reveal delay={100} className="flex flex-col gap-4">
            <p className="eyebrow">Multi-location retailer</p>
            <StoreCard meta="3 locations">
              <ul className="overflow-hidden rounded-lg border border-line text-sm">
                {[
                  { loc: 'Orchard', qty: 4 },
                  { loc: 'VivoCity', qty: 2 },
                  { loc: 'Jurong East', qty: 0 },
                ].map((row, i) => (
                  <li
                    key={row.loc}
                    className={`flex items-center justify-between px-3 py-2 ${
                      i > 0 ? 'border-t border-line' : ''
                    } ${row.qty === 0 ? 'text-muted' : 'text-ink'}`}
                  >
                    <span>{row.loc}</span>
                    <span className="font-display">{row.qty}</span>
                  </li>
                ))}
              </ul>
            </StoreCard>
            <AgentBubble>
              It's available at Orchard and VivoCity. Orchard currently has the
              most stock.
            </AgentBubble>
          </Reveal>
        </div>

        <Reveal className="mt-12">
          <p className="font-display text-xl text-ink">
            One agent architecture.{' '}
            <span className="italic text-accent">Any merchant size.</span>
          </p>
        </Reveal>
      </Container>
    </section>
  )
}
