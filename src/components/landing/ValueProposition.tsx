import { Container, Reveal, SectionHeading } from './primitives'

const STEPS = [
  {
    n: '01',
    title: 'Upload',
    body: 'Import your products, variants, prices, and inventory.',
  },
  {
    n: '02',
    title: 'Configure',
    body: "Customize your agent's behavior, brand, and commerce rules.",
  },
  {
    n: '03',
    title: 'Deploy',
    body: 'Get an embeddable widget for your existing website.',
  },
  {
    n: '04',
    title: 'Sell',
    body: 'Customers discover, decide, and purchase through conversation.',
  },
]

export function ValueProposition() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-t border-line py-20 md:py-28"
    >
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="The path"
            title={
              <>
                From product catalog to{' '}
                <span className="italic text-accent">AI commerce agent.</span>
              </>
            }
          />
        </Reveal>

        <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal
              key={step.n}
              delay={i * 80}
              className="border-t border-ink pt-5"
            >
              <span className="font-display text-sm text-accent">{step.n}</span>
              <h3 className="mt-2 text-xl text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {step.body}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
