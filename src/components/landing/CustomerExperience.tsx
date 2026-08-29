import { Container, Reveal, SectionHeading } from './primitives'
import { ConversationDemo } from './ConversationDemo'

const BEATS = [
  { label: 'Discovery', body: 'The shopper describes the occasion and budget in plain words.' },
  { label: 'Recommendation', body: 'The agent narrows the catalog and explains its top pick.' },
  { label: 'Comparison', body: 'Follow-up questions get specific, product-aware answers.' },
  { label: 'Decision', body: 'The shopper chooses with confidence — still inside the chat.' },
]

export function CustomerExperience() {
  return (
    <section
      id="for-shoppers"
      className="scroll-mt-20 border-t border-line py-20 md:py-28"
    >
      <Container className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <Reveal>
          <SectionHeading
            eyebrow="For Shoppers"
            title={
              <>
                Your customers just need to{' '}
                <span className="italic text-accent">ask.</span>
              </>
            }
            intro="The deployed agent turns a vague request into a confident purchase — without a single filter or search box."
          />

          <ul className="mt-8 space-y-0">
            {BEATS.map((beat, i) => (
              <Reveal
                key={beat.label}
                as="li"
                delay={i * 60}
                className="flex gap-4 border-t border-line py-4 last:border-b"
              >
                <span className="font-display text-sm text-accent">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="text-[0.95rem] font-medium text-ink">
                    {beat.label}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {beat.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={100}>
          <ConversationDemo />
        </Reveal>
      </Container>
    </section>
  )
}
