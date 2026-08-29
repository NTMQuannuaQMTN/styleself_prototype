import type { ReactNode } from 'react'
import { Container, Reveal, SectionHeading } from './primitives'

const MERCHANT_STEPS = [
  {
    n: '01',
    title: 'Upload your catalog',
    body: 'Add products, descriptions, prices, variants, and inventory.',
  },
  {
    n: '02',
    title: 'Configure your agent',
    body: 'StyleSelf provides a pre-built AI fashion commerce agent.',
  },
  {
    n: '03',
    title: 'Connect your stores',
    body: 'Support both single-location SMEs and multi-location retailers.',
  },
  {
    n: '04',
    title: 'Connect payments',
    body: 'Prepare your store for conversational checkout.',
  },
  {
    n: '05',
    title: 'Go live',
    body: 'Your AI agent is ready to help customers shop.',
  },
]

const SHOPPER_STEPS = [
  {
    n: '01',
    title: 'Tell StyleSelf what you need',
    body: '“I need a smart-casual outfit under $150.”',
  },
  {
    n: '02',
    title: 'Get personalized options',
    body: 'The agent considers style, size, color, occasion, budget, and availability.',
  },
  {
    n: '03',
    title: 'Compare and decide',
    body: 'StyleSelf narrows the catalog to 3–5 strong matches and explains the tradeoffs.',
  },
  {
    n: '04',
    title: 'Buy in the conversation',
    body: 'Review the transaction and authorize the purchase.',
  },
]

function Journey({
  id,
  label,
  title,
  steps,
}: {
  id: string
  label: string
  title: ReactNode
  steps: { n: string; title: string; body: string }[]
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <Reveal>
        <p className="eyebrow mb-3">{label}</p>
        <h3 className="max-w-md text-2xl leading-tight text-ink sm:text-[1.75rem]">
          {title}
        </h3>
      </Reveal>
      <ol className="mt-8 space-y-0">
        {steps.map((s, i) => (
          <Reveal
            key={s.n}
            delay={i * 60}
            as="li"
            className="flex gap-5 border-t border-line py-5 last:border-b"
          >
            <span className="font-display text-sm text-accent">{s.n}</span>
            <div>
              <p className="text-[0.95rem] font-medium text-ink">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </div>
  )
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-t border-line bg-surface py-20 md:py-28"
    >
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="Two sides. One conversation."
            intro="StyleSelf connects a merchant's catalog to a shopper's questions — and turns the gap between them into a checkout."
          />
        </Reveal>

        <div className="mt-16 grid gap-14 lg:grid-cols-2 lg:gap-20">
          <Journey
            id="hiw-merchants"
            label="For Merchants"
            title="Turn your catalog into an AI fashion agent."
            steps={MERCHANT_STEPS}
          />
          <Journey
            id="for-shoppers"
            label="For Shoppers"
            title="Shopping becomes a conversation."
            steps={SHOPPER_STEPS}
          />
        </div>
      </Container>
    </section>
  )
}
