import { Container, Reveal, SectionHeading } from './primitives'

const PROFILE = [
  { label: 'Size', value: 'M' },
  { label: 'Preferred fit', value: 'Relaxed' },
  { label: 'Colors', value: 'Black · Navy · White' },
  { label: 'Typical budget', value: '$50–150' },
  { label: 'Style', value: 'Smart Casual' },
]

export function Personalization() {
  return (
    <section className="border-t border-line py-20 md:py-28">
      <Container className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <SectionHeading
            eyebrow="Personalization"
            title={
              <>
                It remembers <span className="italic text-accent">your style.</span>
              </>
            }
            intro="Your preferences travel with you across every conversation — and you decide when they apply."
          />
          <div className="mt-8 rounded-[18px] border border-line-strong bg-surface p-6">
            <p className="eyebrow mb-4 text-[0.6rem]">Your style</p>
            <dl className="divide-y divide-line">
              {PROFILE.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <dt className="text-sm text-muted">{row.label}</dt>
                  <dd className="text-sm font-medium text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="rounded-[20px] border border-line-strong bg-surface p-6 shadow-[0_40px_80px_-45px_rgba(23,21,15,0.28)]">
            <span className="eyebrow text-[0.6rem]">StyleSelf</span>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
              I found your saved preferences. Would you like me to use them for
              this purchase?
            </p>
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                className="btn btn-primary w-full !justify-between"
              >
                Use Saved Preferences
                <span aria-hidden>→</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary w-full !justify-start"
              >
                Update Preferences
              </button>
              <button
                type="button"
                className="w-full rounded-full px-5 py-3 text-left text-sm text-muted transition-colors hover:text-ink"
              >
                Don't Use
              </button>
            </div>
            <p className="mt-5 border-t border-line pt-4 text-xs text-muted">
              Personalized, but always under your control.
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
