import { Link } from 'react-router-dom'
import { Container, Reveal, SectionHeading } from './primitives'
import { ROUTES } from './routes'

const WITHOUT = [
  'Build AI infrastructure',
  'Build a recommendation engine',
  'Build a chat interface',
  'Integrate product search',
  'Handle agent orchestration',
  'Build a checkout experience',
]

const WITH = ['Upload catalog', 'Configure agent', 'Embed', 'Go live']

export function NoAITeam() {
  return (
    <section
      id="for-merchants"
      className="scroll-mt-20 border-t border-line bg-surface py-20 md:py-28"
    >
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="For Merchants"
            title={
              <>
                Your store already has the products.{' '}
                <span className="italic text-accent">
                  We give them an agent.
                </span>
              </>
            }
            intro="Small and mid-sized fashion merchants shouldn't need an AI engineering team to offer intelligent commerce."
          />
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <Reveal className="rounded-[18px] border border-line bg-paper p-6 sm:p-7">
            <p className="eyebrow text-[0.62rem]">Without StyleSelf</p>
            <ul className="mt-5 space-y-3">
              {WITHOUT.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm text-muted"
                >
                  <span
                    aria-hidden
                    className="text-base leading-none text-line-strong"
                  >
                    ×
                  </span>
                  <span className="line-through decoration-line-strong">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal
            delay={100}
            className="rounded-[18px] border border-ink bg-surface p-6 shadow-[0_40px_80px_-50px_rgba(23,21,15,0.4)] sm:p-7"
          >
            <p className="eyebrow text-[0.62rem]">With StyleSelf</p>
            <ul className="mt-5 space-y-3">
              {WITH.map((item, i) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm font-medium text-ink"
                >
                  <span className="font-display text-xs text-accent">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-7 border-t border-line pt-5 font-display text-lg leading-snug text-ink">
              No prompts. No models. No AI infrastructure.
            </p>
            <p className="mt-2 text-sm text-muted">
              You configure the business — not the AI.
            </p>
          </Reveal>
        </div>

        <Reveal className="mt-10">
          <Link to={ROUTES.merchantSignup} className="btn btn-primary">
            Deploy Your Agent
          </Link>
        </Reveal>
      </Container>
    </section>
  )
}
