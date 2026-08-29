import { Link } from 'react-router-dom'
import { ConversationDemo } from './ConversationDemo'
import { Container } from './primitives'
import { ROUTES } from './routes'

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-14 pb-20 sm:pt-20 md:pb-28">
      {/* soft editorial background wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 55% at 82% 8%, rgba(154,91,63,0.10) 0%, rgba(247,245,241,0) 60%)',
        }}
      />
      <Container className="grid items-start gap-14 md:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="reveal is-visible">
          <p className="eyebrow">AI Commerce for Fashion</p>
          <h1 className="mt-5 text-[2.6rem] leading-[1.05] sm:text-5xl md:text-[3.6rem] md:leading-[1.03]">
            Your style. Your conversation.{' '}
            <span className="italic text-accent">Your checkout.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            StyleSelf gives fashion merchants a ready-to-deploy AI commerce agent
            that helps customers discover, compare, and buy — all without leaving
            the conversation.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to={ROUTES.merchantSignup} className="btn btn-primary">
              Create Your AI Store
            </Link>
            <Link to={ROUTES.customerSignup} className="btn btn-secondary">
              Start Shopping
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              No code to deploy
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Pre-trained for fashion
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Checkout in chat
            </span>
          </div>
        </div>

        <div className="reveal is-visible [transition-delay:120ms]">
          <ConversationDemo />
        </div>
      </Container>
    </section>
  )
}
