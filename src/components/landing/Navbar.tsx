import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { NAV_LINKS, ROUTES } from './routes'

export function Navbar() {
  const { session, loading } = useAuth()
  const authed = !loading && !!session
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? 'border-b border-line bg-paper/85 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          to="/"
          className="font-display text-lg tracking-tight text-ink"
          onClick={() => setMenuOpen(false)}
        >
          Style<span className="italic">Self</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {authed ? (
            <Link
              to={ROUTES.dashboard}
              className="btn btn-primary !px-4 !py-2.5 text-sm"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                to={ROUTES.login}
                className="text-sm text-ink-soft transition-colors hover:text-ink"
              >
                Log In
              </Link>
              <Link
                to={ROUTES.signup}
                className="btn btn-primary !px-4 !py-2.5 text-sm"
              >
                Deploy Your Agent
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center md:hidden"
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 block h-px w-5 bg-ink transition-transform duration-300 ${
                menuOpen ? 'top-2 rotate-45' : 'top-0'
              }`}
            />
            <span
              className={`absolute left-0 top-2 block h-px w-5 bg-ink transition-opacity duration-200 ${
                menuOpen ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`absolute left-0 block h-px w-5 bg-ink transition-transform duration-300 ${
                menuOpen ? 'top-2 -rotate-45' : 'top-4'
              }`}
            />
          </span>
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={`fixed inset-x-0 top-16 bottom-0 z-40 origin-top border-t border-line bg-paper px-5 transition-all duration-300 md:hidden ${
          menuOpen
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        <div className="flex flex-col gap-1 py-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-base text-ink-soft hover:bg-black/[0.03]"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-3 border-t border-line pt-4">
            {authed ? (
              <Link
                to={ROUTES.dashboard}
                onClick={() => setMenuOpen(false)}
                className="btn btn-primary w-full"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  to={ROUTES.login}
                  onClick={() => setMenuOpen(false)}
                  className="btn btn-secondary w-full"
                >
                  Log In
                </Link>
                <Link
                  to={ROUTES.signup}
                  onClick={() => setMenuOpen(false)}
                  className="btn btn-primary w-full"
                >
                  Deploy Your Agent
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
