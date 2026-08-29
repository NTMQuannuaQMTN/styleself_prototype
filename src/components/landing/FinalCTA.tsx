import { Link } from 'react-router-dom'
import { Container, Reveal } from './primitives'
import { ROUTES } from './routes'

export function FinalCTA() {
  return (
    <section className="border-t border-line py-24 md:py-32">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl leading-[1.1] sm:text-4xl md:text-[2.75rem]">
            Give your fashion store an{' '}
            <span className="italic text-accent">AI sales agent.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
            Upload your catalog. Configure your agent. Start selling through
            conversation.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={ROUTES.merchantSignup} className="btn btn-primary">
              Create Your AI Store
            </Link>
            <Link to={ROUTES.customerSignup} className="btn btn-secondary">
              Start Shopping
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
