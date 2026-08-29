import { Link } from 'react-router-dom'
import { Container } from './primitives'
import { ROUTES } from './routes'
import { SitePreview, StudioPanel } from './mocks'

export function Hero() {
  return (
    <section className="relative pt-14 pb-20 sm:pt-20 md:pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(55% 50% at 85% 6%, rgba(154,91,63,0.10) 0%, rgba(247,245,241,0) 62%)',
        }}
      />
      <Container className="flex flex-col gap-14 lg:grid lg:grid-cols-[1fr_1.04fr] lg:items-center lg:gap-14">
        <div className="reveal is-visible min-w-0">
          <p className="eyebrow">AI Commerce for Fashion</p>
          <h1 className="mt-5 text-[2.5rem] leading-[1.06] sm:text-5xl lg:text-[3.4rem] lg:leading-[1.04]">
            Deploy an AI fashion agent.{' '}
            <span className="italic text-accent">Sell through conversation.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            StyleSelf gives fashion merchants a pre-built AI commerce agent they
            can configure and embed directly into their website — helping
            customers discover, compare, and buy without leaving the
            conversation.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to={ROUTES.merchantSignup} className="btn btn-primary">
              Deploy Your Agent
            </Link>
            <a href="#how-it-works" className="btn btn-secondary">
              See How It Works
            </a>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Pre-trained for fashion
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              No AI engineering
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Embed in one line
            </span>
          </div>
        </div>

        <div className="reveal is-visible min-w-0 [transition-delay:120ms]">
          <StudioPanel />
          <div className="flex items-center gap-2.5 py-3 pl-6">
            <span className="h-5 w-px bg-line-strong" aria-hidden />
            <span className="text-xs text-muted">
              ↓ Deployed to the merchant’s site
            </span>
          </div>
          <SitePreview className="ml-auto w-full sm:w-[80%] lg:w-[72%]" />
        </div>
      </Container>
    </section>
  )
}
