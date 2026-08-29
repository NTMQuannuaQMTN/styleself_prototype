import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

function initials(name: string | null, email: string | null) {
  const source = name?.trim() || email?.split('@')[0] || '?'
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase()
}

export function AppHeader() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const name = profile?.full_name ?? null
  const email = profile?.email ?? user?.email ?? null

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          to="/merchant"
          className="font-display text-lg tracking-tight text-ink"
        >
          Style<span className="italic">Self</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper"
            >
              {initials(name, email)}
            </button>

            {open ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-[0_20px_50px_-20px_rgba(23,21,15,0.35)]"
              >
                <div className="border-b border-line px-3.5 py-2.5">
                  <p className="truncate text-sm font-medium text-ink">
                    {name ?? 'Your account'}
                  </p>
                  {email ? (
                    <p className="truncate text-xs text-muted">{email}</p>
                  ) : null}
                </div>
                <Link
                  to="/merchant/account"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="block w-full px-3.5 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-black/[0.03]"
                >
                  Account
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  className="w-full border-t border-line px-3.5 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-black/[0.03]"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
