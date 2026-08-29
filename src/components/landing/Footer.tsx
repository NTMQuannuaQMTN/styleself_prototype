import { Link } from 'react-router-dom'
import { Container } from './primitives'
import { ROUTES } from './routes'

const LINKS: { label: string; to: string; external?: boolean }[] = [
  { label: 'Architecture', to: '#architecture', external: true },
  { label: 'Trust & Security', to: '#security', external: true },
  { label: 'For Merchants', to: '#for-merchants', external: true },
  { label: 'Log In', to: ROUTES.login },
  { label: 'Get Started', to: ROUTES.signup },
]

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface py-14">
      <Container className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-lg tracking-tight text-ink">
            Style<span className="italic">Self</span>
          </p>
          <p className="mt-2 text-sm text-muted">AI commerce for fashion.</p>
        </div>

        <nav className="flex flex-wrap gap-x-8 gap-y-3">
          {LINKS.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.to}
                className="text-sm text-ink-soft transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.to}
                className="text-sm text-ink-soft transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </Container>
      <Container className="mt-10 border-t border-line pt-6">
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} StyleSelf. A prototype for conversational
          fashion commerce.
        </p>
      </Container>
    </footer>
  )
}
