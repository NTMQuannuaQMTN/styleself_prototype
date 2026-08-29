import { useMemo, useState } from 'react'
import { formatMoney } from '../../merchant/money'

export type AgentProduct = {
  id: string
  name: string
  category: string | null
  description: string | null
  /** brand / style / gender / material / care — folded into the search text */
  attributes: string
  priceCents: number
  imageUrl: string | null
  /** locationId -> units in stock */
  stockByLocation: Record<string, number>
}

export type AgentLocation = { id: string; name: string }

type Turn =
  | { from: 'user'; text: string }
  | {
      from: 'agent'
      text: string
      products?: AgentProduct[]
      pick?: AgentProduct
    }

const STOP_WORDS = new Set([
  'under',
  'below',
  'max',
  'the',
  'for',
  'and',
  'something',
  'need',
  'want',
  'show',
  'what',
  'have',
  'you',
  'got',
  'looking',
])

function totalStock(p: AgentProduct) {
  return Object.values(p.stockByLocation).reduce((a, b) => a + b, 0)
}

function priceCap(q: string): number | null {
  const m = q.match(/(?:under|below|less than|<|max)\s*\$?\s*(\d+(?:\.\d+)?)/i)
  if (m) return Math.round(Number.parseFloat(m[1]) * 100)
  const dollar = q.match(/\$\s*(\d+(?:\.\d+)?)/)
  if (dollar) return Math.round(Number.parseFloat(dollar[1]) * 100)
  return null
}

function search(products: AgentProduct[], query: string) {
  const cap = priceCap(query)
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t))

  const scored = products
    .filter((p) => totalStock(p) > 0)
    .map((p) => {
      const haystack = `${p.name} ${p.category ?? ''} ${
        p.description ?? ''
      } ${p.attributes}`.toLowerCase()
      let score = terms.reduce((s, t) => s + (haystack.includes(t) ? 1 : 0), 0)
      if (terms.length === 0) score = 1
      if (cap !== null && p.priceCents <= cap) score += 1
      if (cap !== null && p.priceCents > cap) score = -1
      return { p, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.priceCents - b.p.priceCents)

  const matches = scored.slice(0, 4).map((x) => x.p)
  return { matches, pick: matches[0] as AgentProduct | undefined }
}

function availability(
  product: AgentProduct,
  locations: AgentLocation[],
): string {
  const byLoc = locations
    .map((loc) => ({
      name: loc.name,
      qty: product.stockByLocation[loc.id] ?? 0,
    }))
    .filter((l) => l.qty > 0)

  if (byLoc.length === 0) return ''
  if (byLoc.length === 1) return `In stock at ${byLoc[0].name}.`
  const top = [...byLoc].sort((a, b) => b.qty - a.qty)
  return `Available at ${top.map((l) => l.name).join(' and ')} — ${top[0].name} has the most.`
}

function AgentSays({ text }: { text: string }) {
  return (
    <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-line bg-paper px-3.5 py-2 text-sm leading-relaxed text-ink-soft">
      {text}
    </div>
  )
}

/**
 * The conversational shopping widget. Non-AI for now: keyword + price search
 * over a product list with per-location availability. Used both in the merchant
 * Preview and on the public /agent/:agentId route.
 */
export function AgentWidget({
  agentName,
  greeting,
  currency,
  products,
  locations,
  storeName,
  className = '',
}: {
  agentName: string
  greeting: string
  currency: string
  products: AgentProduct[]
  locations: AgentLocation[]
  storeName?: string
  className?: string
}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')

  const suggestions = useMemo(() => {
    const first = products[0]
    return [
      'Something smart casual under $150',
      first
        ? `Show me ${first.category || first.name.split(' ').pop()}`
        : 'What do you have in stock?',
    ]
  }, [products])

  function ask(text: string) {
    const q = text.trim()
    if (!q) return
    const { matches, pick } = search(products, q)
    const reply: Turn =
      matches.length === 0
        ? {
            from: 'agent',
            text:
              products.length === 0
                ? "There's nothing in the catalog yet."
                : "I couldn't find an in-stock match. Try an occasion or a budget.",
          }
        : {
            from: 'agent',
            text: `I found ${matches.length} option${matches.length === 1 ? '' : 's'} that fit${matches.length === 1 ? 's' : ''}.`,
            products: matches,
            pick,
          }
    setTurns((t) => [...t, { from: 'user', text: q }, reply])
    setInput('')
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[18px] border border-line-strong bg-surface shadow-[0_30px_70px_-45px_rgba(23,21,15,0.3)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="font-display text-sm text-ink">{agentName}</span>
        {storeName ? (
          <span className="ml-auto text-[0.7rem] text-muted">{storeName}</span>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <AgentSays text={greeting} />
        {turns.map((turn, i) =>
          turn.from === 'user' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-sm text-paper">
                {turn.text}
              </p>
            </div>
          ) : (
            <div key={i} className="space-y-2">
              <AgentSays text={turn.text} />
              {turn.products && (
                <div className="grid grid-cols-3 gap-2">
                  {turn.products.map((p) => (
                    <div
                      key={p.id}
                      className={`rounded-lg border p-1.5 ${
                        p.id === turn.pick?.id ? 'border-ink' : 'border-line'
                      }`}
                    >
                      <div className="mb-1 flex aspect-[4/5] items-center justify-center overflow-hidden rounded bg-accent-soft/60">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-display text-sm text-accent/70">
                            {p.name.slice(0, 1)}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[0.7rem] font-medium text-ink">
                        {p.name}
                      </p>
                      <p className="text-[0.7rem] text-muted">
                        {formatMoney(p.priceCents, currency)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {turn.pick && (
                <AgentSays
                  text={`My pick: the ${turn.pick.name} at ${formatMoney(
                    turn.pick.priceCents,
                    currency,
                  )}. ${availability(turn.pick, locations)}`.trim()}
                />
              )}
            </div>
          ),
        )}
      </div>

      <div className="border-t border-line p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="rounded-full border border-line-strong px-2.5 py-1 text-[0.7rem] text-muted transition-colors hover:border-ink hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(input)
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you're looking for…"
            className="field-input !py-2 !text-sm"
          />
          <button
            type="submit"
            className="btn btn-primary shrink-0 !px-4 !py-2 text-sm"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
