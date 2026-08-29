import type { ReactNode } from 'react'

/** A restrained chat window frame used across the page's demos. */
export function ChatShell({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`overflow-hidden rounded-[20px] border border-line-strong bg-surface shadow-[0_40px_80px_-40px_rgba(23,21,15,0.28)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="ml-2 font-display text-sm tracking-tight text-ink">
          Style<span className="italic">Self</span>
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[0.7rem] font-medium text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Live
        </span>
      </div>
      <div className="space-y-3 px-4 py-5 sm:px-5">{children}</div>
    </div>
  )
}

export function UserBubble({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex justify-end ${className}`}>
      <div className="max-w-[82%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm leading-relaxed text-paper">
        {children}
      </div>
    </div>
  )
}

export function AgentBubble({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="eyebrow text-[0.6rem] tracking-[0.2em]">StyleSelf</span>
      <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-line bg-paper px-4 py-2.5 text-sm leading-relaxed text-ink-soft">
        {children}
      </div>
    </div>
  )
}

export function ProductCard({
  name,
  price,
  image,
  alt,
  highlight = false,
}: {
  name: string
  price: string
  image: string
  alt?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border p-2.5 transition-colors ${
        highlight
          ? 'border-ink bg-surface'
          : 'border-line bg-surface hover:border-line-strong'
      }`}
    >
      <div className="mb-2 aspect-[4/5] w-full overflow-hidden rounded-lg bg-paper">
        <img
          src={image}
          alt={alt ?? name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
      <span className="text-xs font-medium leading-tight text-ink">{name}</span>
      <span className="mt-0.5 text-xs text-muted">{price}</span>
    </div>
  )
}
