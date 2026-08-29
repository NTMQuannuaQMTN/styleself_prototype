import { useState } from 'react'
import type { ReactNode } from 'react'

const EMBED_SNIPPET = `<script
  src="https://cdn.styleself.ai/agent.js"
  data-store="urban-thread"
  data-agent="fashion-commerce"
></script>`

function LivePill({ label = 'Live' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[0.7rem] font-medium text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      {label}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-3.5 py-3">
      <p className="text-[0.6rem] uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-lg text-ink">{value}</p>
    </div>
  )
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked in some contexts — fine for a demo */
    }
  }
  return { copied, copy }
}

/** Full multi-line embed snippet with a real clipboard action. */
export function EmbedCode({ className = '' }: { className?: string }) {
  const { copied, copy } = useCopy(EMBED_SNIPPET)
  return (
    <div className={className}>
      <pre className="overflow-x-auto rounded-lg border border-line bg-paper p-3.5 font-mono text-[0.72rem] leading-relaxed text-ink-soft">
        <code>{EMBED_SNIPPET}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="btn btn-primary mt-3 w-full !py-2.5 text-sm"
      >
        {copied ? 'Copied to clipboard' : 'Copy embed code'}
      </button>
    </div>
  )
}

/** The merchant-facing Agent Studio panel (compact — used in the hero). */
export function StudioPanel({ className = '' }: { className?: string }) {
  const { copied, copy } = useCopy(EMBED_SNIPPET)
  return (
    <div
      className={`overflow-hidden rounded-[18px] border border-line-strong bg-surface shadow-[0_40px_90px_-45px_rgba(23,21,15,0.32)] ${className}`}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <span className="eyebrow text-[0.6rem]">StyleSelf Agent Studio</span>
        <LivePill />
      </div>

      <div className="p-5">
        <p className="font-display text-lg text-ink">Fashion Commerce Agent</p>
        <p className="mt-0.5 text-xs text-muted">
          Pre-built · configured with your catalog
        </p>

        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
          <Stat label="Products" value="248" />
          <Stat label="Locations" value="3" />
          <Stat label="Inventory" value="Synced" />
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <p className="eyebrow text-[0.56rem]">Deploy</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-line bg-paper px-2.5 py-2 font-mono text-[0.7rem] text-ink-soft">
              &lt;script src="…styleself.ai/agent.js"&gt;
            </code>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-md bg-ink px-3 py-2 text-xs font-medium text-paper"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** A merchant's storefront with the deployed StyleSelf widget docked in it. */
export function SitePreview({
  children,
  className = '',
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={`overflow-hidden rounded-[16px] border border-line-strong bg-surface shadow-[0_30px_70px_-40px_rgba(23,21,15,0.3)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-line bg-paper px-3.5 py-2.5">
        <span className="h-2 w-2 rounded-full bg-line-strong" />
        <span className="h-2 w-2 rounded-full bg-line-strong" />
        <span className="h-2 w-2 rounded-full bg-line-strong" />
        <span className="ml-2 rounded bg-surface px-2 py-0.5 font-mono text-[0.62rem] text-muted">
          urban-thread.com
        </span>
      </div>

      <div className="px-5 pt-5 pb-5">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-sm tracking-[0.16em] text-ink">
            URBAN THREAD
          </p>
          <div className="flex gap-1.5" aria-hidden>
            {['#e5dcc9', '#cfd6cc', '#d8ccc4'].map((tone) => (
              <span
                key={tone}
                className="h-6 w-6 rounded"
                style={{ backgroundColor: tone }}
              />
            ))}
          </div>
        </div>
        <p className="mt-3 font-display text-xl leading-tight text-ink">
          Find your next look.
        </p>

        <div className="mt-4 rounded-xl border border-line-strong bg-paper p-3.5">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            <span className="eyebrow text-[0.55rem]">StyleSelf</span>
          </div>
          {children ?? (
            <>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                What are you looking for today?
              </p>
              <div className="mt-2 flex justify-end">
                <p className="max-w-[85%] rounded-lg rounded-br-sm bg-ink px-2.5 py-1.5 text-[0.72rem] leading-snug text-paper">
                  Something for a formal dinner under $150
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
