import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../merchant/useStore'
import { updateAgent } from '../../merchant/api'
import type { StoreAgent } from '../../lib/database.types'
import {
  Card,
  InlineError,
  PageHeader,
  SelectField,
  TextArea,
  TextField,
} from '../../components/merchant/ui'

const TONES = [
  'Warm, concise, style-aware',
  'Polished and editorial',
  'Playful and casual',
  'Minimal and direct',
]

const CURRENCIES = ['USD', 'SGD', 'EUR', 'GBP', 'AUD', 'JPY']

export default function AgentStudioPage() {
  const { activeStore, agent, activeRole } = useStore()
  if (!activeStore || !agent) return null
  // Only the store owner can change the agent configuration.
  const canEdit = activeRole === 'owner'
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Agent Studio"
        title="Fashion Commerce Agent"
        description="A pre-built agent trained on fashion. You give it your brand voice and rules — not prompts or models."
      />
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {canEdit ? (
          <AgentForm key={activeStore.id} storeId={activeStore.id} agent={agent} />
        ) : (
          <AgentReadOnly agent={agent} />
        )}
        <SideCards displayName={agent.display_name} greeting={agent.greeting}
          tone={agent.tone} currency={agent.currency} />
      </div>
    </div>
  )
}

function AgentForm({ storeId, agent }: { storeId: string; agent: StoreAgent }) {
  const { refreshStore } = useStore()
  const [displayName, setDisplayName] = useState(agent.display_name)
  const [greeting, setGreeting] = useState(agent.greeting)
  const [tone, setTone] = useState(
    TONES.includes(agent.tone) ? agent.tone : TONES[0],
  )
  const [currency, setCurrency] = useState(agent.currency)
  const [recLimit, setRecLimit] = useState(String(agent.recommendation_limit ?? 5))
  const [brandDescription, setBrandDescription] = useState(
    agent.brand_description ?? '',
  )
  const [categoryFocus, setCategoryFocus] = useState(agent.category_focus ?? '')
  const [requireConfirmation, setRequireConfirmation] = useState(
    agent.require_confirmation ?? true,
  )
  const [rules, setRules] = useState(agent.rules ?? '')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    setSaved(false)
    try {
      await updateAgent(storeId, {
        display_name: displayName.trim() || 'StyleSelf',
        greeting: greeting.trim(),
        tone,
        currency,
        recommendation_limit: Math.min(
          8,
          Math.max(1, Math.round(Number(recLimit) || 5)),
        ),
        brand_description: brandDescription.trim() || null,
        category_focus: categoryFocus.trim() || null,
        require_confirmation: requireConfirmation,
        rules: rules.trim() || null,
      })
      await refreshStore()
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <TextField
        label="Agent name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="StyleSelf"
      />
      <TextField
        label="Opening line"
        value={greeting}
        onChange={(e) => setGreeting(e.target.value)}
        placeholder="What are you looking for today?"
      />
      <TextArea
        label="Brand description"
        value={brandDescription}
        onChange={(e) => setBrandDescription(e.target.value)}
        rows={2}
        placeholder="e.g. Modern casual and smart-casual menswear — clean lines, natural fabrics."
        hint="One or two lines. The agent uses this to frame recommendations."
      />
      <TextField
        label="Fashion focus"
        value={categoryFocus}
        onChange={(e) => setCategoryFocus(e.target.value)}
        placeholder="e.g. Everyday tailoring, shirting and trousers"
      />
      <SelectField
        label="Tone"
        value={tone}
        onChange={(e) => setTone(e.target.value)}
      >
        {TONES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </SelectField>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </SelectField>
        <TextField
          label="Recommendation limit"
          type="number"
          min={1}
          max={8}
          value={recLimit}
          onChange={(e) => setRecLimit(e.target.value)}
          hint="Max products the agent shows at once (1–8)."
        />
      </div>
      <SelectField
        label="Purchase confirmation"
        value={requireConfirmation ? 'required' : 'optional'}
        onChange={(e) => setRequireConfirmation(e.target.value === 'required')}
        hint="The shopper always presses Confirm & Pay; this sets how firmly the agent asks first."
      >
        <option value="required">Always require explicit confirmation</option>
        <option value="optional">Lightweight — proceed to the preview quickly</option>
      </SelectField>
      <TextArea
        label="Commerce rules"
        value={rules}
        onChange={(e) => setRules(e.target.value)}
        rows={4}
        placeholder="e.g. Never recommend out-of-stock items. Suggest a size up for relaxed fits. Free delivery over $120."
        hint="Plain-language guidance the agent follows during a conversation."
      />

      {error ? <InlineError>{error}</InlineError> : null}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved ? <span className="text-sm text-success">Saved</span> : null}
      </div>
    </form>
  )
}

function AgentReadOnly({ agent }: { agent: StoreAgent }) {
  const rows: [string, string][] = [
    ['Agent name', agent.display_name],
    ['Opening line', agent.greeting],
    ['Brand description', agent.brand_description || '—'],
    ['Fashion focus', agent.category_focus || '—'],
    ['Tone', agent.tone],
    ['Currency', agent.currency],
    ['Recommendation limit', String(agent.recommendation_limit ?? 5)],
    [
      'Purchase confirmation',
      agent.require_confirmation ? 'Always require explicit confirmation' : 'Lightweight',
    ],
    ['Commerce rules', agent.rules || '—'],
  ]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Only the store owner can change the agent configuration.
      </p>
      <dl className="divide-y divide-line rounded-xl border border-line">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[10rem_1fr] gap-3 px-4 py-3">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="text-sm whitespace-pre-wrap text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function SideCards({
  displayName,
  greeting,
  tone,
  currency,
}: {
  displayName: string
  greeting: string
  tone: string
  currency: string
}) {
  return (
    <div className="space-y-4">
      <Card>
        <p className="eyebrow text-[0.6rem]">Live preview</p>
        <div className="mt-3 rounded-xl border border-line bg-paper p-4">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            <span className="eyebrow text-[0.55rem]">{displayName || 'StyleSelf'}</span>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            {greeting || 'What are you looking for today?'}
          </p>
        </div>
        <p className="mt-3 text-xs text-muted">
          Tone: {tone} · Prices in {currency}
        </p>
      </Card>

      <Card>
        <p className="text-sm font-medium text-ink">Next</p>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          <li>
            <Link to="/merchant/catalog" className="text-accent">
              Add products →
            </Link>
          </li>
          <li>
            <Link to="/merchant/preview" className="text-accent">
              Preview the agent →
            </Link>
          </li>
          <li>
            <Link to="/merchant/deploy" className="text-accent">
              Deploy to your site →
            </Link>
          </li>
        </ul>
      </Card>
    </div>
  )
}
