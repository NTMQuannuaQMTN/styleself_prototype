import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DEMO_PRODUCTS } from '../landing/products'
import { isSupabaseConfigured } from '../../lib/supabase'
import { FormAlert } from './form'

/**
 * Split layout for the auth screens: an editorial brand panel on the left
 * (desktop only) and the form on the right.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-ink px-12 py-14 text-paper lg:flex lg:flex-col">
        <Link to="/" className="font-display text-xl tracking-tight">
          Style<span className="italic">Self</span>
        </Link>

        <div className="my-auto max-w-md">
          <p className="eyebrow !text-paper/50">AI commerce for fashion</p>
          <p className="mt-5 font-display text-[2rem] leading-[1.15]">
            Deploy an AI fashion agent.{' '}
            <span className="italic text-accent-soft">
              Sell through conversation.
            </span>
          </p>
          <div className="mt-10 flex gap-3">
            {DEMO_PRODUCTS.map((p) => (
              <figure key={p.name} className="w-1/3">
                <img
                  src={p.image}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/5] w-full rounded-lg object-cover"
                />
                <figcaption className="mt-2 text-[0.7rem] text-paper/60">
                  {p.name} · {p.price}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <p className="text-xs text-paper/40">
          Discover, compare, and buy — all without leaving the conversation.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Link
          to="/"
          className="font-display text-lg tracking-tight text-ink lg:hidden"
        >
          Style<span className="italic">Self</span>
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-[1.75rem] leading-tight text-ink">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
          ) : null}

          <div className="mt-8 space-y-4">
            {!isSupabaseConfigured ? (
              <FormAlert>
                Supabase isn’t configured yet. Add <code>VITE_SUPABASE_URL</code>{' '}
                and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code>{' '}
                and restart the dev server.
              </FormAlert>
            ) : null}
            {children}
          </div>

          {footer ? (
            <p className="mt-8 text-center text-sm text-muted">{footer}</p>
          ) : null}
        </div>
      </main>
    </div>
  )
}
