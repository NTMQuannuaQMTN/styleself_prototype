import { Container, Reveal, SectionHeading } from './primitives'

const ITEMS = [
  {
    step: 'Discover',
    body: 'Find products by simply describing what you want.',
  },
  {
    step: 'Personalize',
    body: 'Use your saved size, style, color, and budget preferences.',
  },
  {
    step: 'Decide',
    body: 'Compare options and understand why a product fits you.',
  },
  {
    step: 'Pay',
    body: 'Review and authorize your purchase without leaving the conversation.',
  },
]

export function ValueProposition() {
  return (
    <section className="border-t border-line py-20 md:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="The experience"
            title={
              <>
                From “What should I wear?” to{' '}
                <span className="italic text-accent">“It’s on the way.”</span>
              </>
            }
          />
        </Reveal>

        <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item, i) => (
            <Reveal key={item.step} delay={i * 80} className="border-t border-ink pt-5">
              <span className="font-display text-sm text-muted">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-2 text-xl text-ink">{item.step}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {item.body}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
