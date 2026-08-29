import { Container, Reveal, SectionHeading } from './primitives'
import { EmbedCode } from './mocks'

const STEPS = [
  { title: 'Select the Fashion Agent', body: 'Start from the pre-built category agent.' },
  { title: 'Upload your catalog', body: 'Products, variants, prices, inventory.' },
  { title: 'Configure', body: 'Brand voice, commerce rules, store locations.' },
  { title: 'Preview', body: 'Talk to your agent before anyone else can.' },
  { title: 'Deploy', body: 'One click publishes the agent to the edge.' },
  { title: 'Copy the embed code', body: 'Drop one line into your site. Done.' },
]

export function MerchantDeployment() {
  return (
    <section
      id="deploy"
      className="scroll-mt-20 border-t border-line bg-surface py-20 md:py-28"
    >
      <Container className="grid gap-14 lg:grid-cols-[1fr_0.92fr] lg:gap-16">
        <div>
          <Reveal>
            <SectionHeading
              eyebrow="How it works"
              title={
                <>
                  Live on your website in{' '}
                  <span className="italic text-accent">minutes.</span>
                </>
              }
            />
          </Reveal>

          <ol className="mt-10 border-t border-line">
            {STEPS.map((step, i) => (
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
                  <p className="mt-1 text-sm text-muted">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal delay={120} className="lg:pt-16">
          <div className="rounded-[18px] border border-line-strong bg-paper p-6 shadow-[0_40px_80px_-50px_rgba(23,21,15,0.32)]">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              <p className="eyebrow text-[0.6rem]">Your agent is ready</p>
            </div>
            <p className="mt-3 font-display text-lg text-ink">
              Embed the StyleSelf Agent
            </p>
            <p className="mt-1 text-sm text-muted">
              One hosted embed. It stays in sync with your catalog and inventory
              automatically — no rebuilds.
            </p>
            <EmbedCode className="mt-5" />
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
