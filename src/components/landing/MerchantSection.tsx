import { Link } from 'react-router-dom'
import { Container, Reveal } from './primitives'
import { ROUTES } from './routes'

const NOT_BUILD = [
  'AI recommendation systems',
  'Conversational shopping interfaces',
  'Complex product search',
  'Custom AI infrastructure',
]

const STATS = [
  { label: 'Products', value: '248' },
  { label: 'Locations', value: '3' },
  { label: 'Inventory', value: 'Synced' },
  { label: 'Conversations', value: '1,284' },
  { label: 'Orders', value: '126' },
  { label: 'Status', value: 'Live', live: true },
]

export function MerchantSection() {
  return (
    <section
      id="for-merchants"
      className="scroll-mt-20 border-t border-line py-20 md:py-28"
    >
      <Container className="grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <Reveal>
          <p className="eyebrow mb-4">For Merchants</p>
          <h2 className="text-3xl leading-[1.12] sm:text-4xl">
            Enterprise-level AI commerce.{' '}
            <span className="italic text-accent">
              Without the enterprise team.
            </span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted">
            Small and mid-sized fashion merchants shouldn't need to build their
            own AI stack. StyleSelf provides the agent layer — you bring the
            catalog.
          </p>
          <ul className="mt-7 space-y-2.5">
            {NOT_BUILD.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-ink-soft">
                <span className="font-display text-xs text-muted line-through decoration-accent/70">
                  build
                </span>
                {item}
              </li>
            ))}
          </ul>
          <Link to={ROUTES.merchantSignup} className="btn btn-primary mt-9">
            Create Your AI Store
          </Link>
        </Reveal>

        <Reveal delay={100}>
          <div className="rounded-[20px] border border-line-strong bg-surface p-5 shadow-[0_40px_80px_-45px_rgba(23,21,15,0.3)] sm:p-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <p className="eyebrow text-[0.6rem]">StyleSelf Agent</p>
                <p className="mt-1 font-display text-lg text-ink">Fashion Agent</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[0.7rem] font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Live
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
              {STATS.map((s) => (
                <div key={s.label} className="bg-surface p-4">
                  <p className="text-[0.7rem] uppercase tracking-[0.12em] text-muted">
                    {s.label}
                  </p>
                  <p
                    className={`mt-1.5 font-display text-xl ${
                      s.live ? 'text-success' : 'text-ink'
                    }`}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-line bg-paper px-4 py-3 text-sm text-muted">
              Ready to help customers discover and purchase products.
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
