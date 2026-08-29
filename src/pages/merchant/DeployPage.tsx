import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../merchant/useStore'
import { useAsync } from '../../merchant/useAsync'
import {
  getDashboardCounts,
  rotateEmbedKey,
  setStoreLive,
  updateStore,
} from '../../merchant/api'
import {
  Card,
  InlineError,
  PageHeader,
} from '../../components/merchant/ui'

export default function DeployPage() {
  const { activeStore, agent, activeRole, refreshStore } = useStore()
  const isOwner = activeRole === 'owner'
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [keyShown, setKeyShown] = useState(false)
  const [format, setFormat] = useState<'html' | 'react'>('html')

  const counts = useAsync(
    () => getDashboardCounts(activeStore!.id),
    [activeStore?.id],
  )

  if (!activeStore) return null
  const store = activeStore

  // The real key is always used for copy / open; only the on-screen text is masked.
  const maskedKey = `${store.embed_key.slice(0, 3)}${'•'.repeat(24)}`
  const shownKey = keyShown ? store.embed_key : maskedKey
  const agentUrl = `${window.location.origin}/agent/${store.slug}?k=${store.embed_key}`
  const shownUrl = `${window.location.origin}/agent/${store.slug}?k=${shownKey}`
  const title = `${store.name} — Shopping assistant`

  // A full-viewport, transparent overlay iframe. The launcher button and the
  // (centered) chat panel are drawn by the page inside; everything else is
  // click-through-looking but the frame still sits on top, so keep z-index high.
  const frameStyle =
    'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:9999'
  const htmlSnippet = `<iframe
  src="${agentUrl}"
  title="${title}"
  style="${frameStyle}"
></iframe>`

  const reactSnippet = `export default function StylistWidget() {
  return (
    <iframe
      src="${agentUrl}"
      title="${title}"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 0,
        zIndex: 9999,
      }}
    />
  )
}`

  const snippet = format === 'react' ? reactSnippet : htmlSnippet
  const shownSnippet = snippet.replace(agentUrl, shownUrl)

  const checklist = [
    { label: 'Agent configured', done: !!agent },
    {
      label: 'At least one location',
      done: (counts.data?.locations ?? 0) > 0,
    },
    {
      label: 'At least one active product',
      done: (counts.data?.activeProducts ?? 0) > 0,
    },
  ]
  const ready = checklist.every((c) => c.done)

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked */
    }
  }

  async function toggleLive() {
    setError(null)
    setBusy(true)
    try {
      await setStoreLive(store.id, !store.agent_live)
      await refreshStore()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update.')
    } finally {
      setBusy(false)
    }
  }

  async function regenerateKey() {
    if (
      !window.confirm(
        'Generate a new embed key? Any embed already on your site stops working until you paste the new code.',
      )
    ) {
      return
    }
    setError(null)
    setBusy(true)
    try {
      await rotateEmbedKey(store.id)
      await refreshStore()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not regenerate.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleKeyRequired() {
    setError(null)
    setBusy(true)
    try {
      await updateStore(store.id, { embed_key_required: !store.embed_key_required })
      await refreshStore()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Deploy"
        title="Embed the StyleSelf Agent"
        description="Add one line to your site. The widget stays in sync with this store's catalog and inventory automatically."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  activeStore.agent_live ? 'bg-success' : 'bg-line-strong'
                }`}
              />
              <p className="eyebrow text-[0.6rem]">
                {activeStore.agent_live ? 'Live' : 'Not deployed'}
              </p>
              <div className="ml-auto flex overflow-hidden rounded-full border border-line-strong text-[0.58rem]">
                {(['html', 'react'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={format === f}
                    onClick={() => setFormat(f)}
                    className={`px-2.5 py-0.5 transition-colors ${
                      format === f ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {f === 'html' ? 'HTML' : 'React'}
                  </button>
                ))}
              </div>
            </div>
            <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-line bg-paper p-3.5 font-mono text-[0.72rem] leading-relaxed text-ink-soft">
              <code className="block whitespace-pre">{shownSnippet}</code>
            </pre>
            <button
              type="button"
              onClick={copy}
              className="btn btn-primary mt-3 w-full !py-2.5 text-sm"
            >
              {copied
                ? 'Copied to clipboard'
                : `Copy ${format === 'react' ? 'React' : 'HTML'} code`}
            </button>
            <p className="mt-1.5 text-center text-[0.66rem] text-muted">
              {format === 'react'
                ? 'Save as a .jsx / .tsx file and render it once. '
                : 'Paste before </body>. '}
              Full-screen overlay — a launcher button, then the chat centered on
              screen. The key is hidden above; Copy still copies the working code.
            </p>
            <a
              href={agentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-center text-xs text-accent"
            >
              Open the agent in a new tab →
            </a>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <p className="eyebrow text-[0.6rem]">Embed key</p>
              <button
                type="button"
                onClick={() => setKeyShown((s) => !s)}
                className="text-[0.66rem] text-accent hover:underline"
              >
                {keyShown ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted">
              The <code>?k=</code> in the snippet ties the embed to this store.
            </p>
            <p className="mt-2 break-all rounded-lg border border-line bg-paper px-3 py-2 font-mono text-[0.72rem] text-ink-soft">
              {shownKey}
            </p>
            {isOwner ? (
              <div className="mt-3 space-y-2.5">
                <button
                  type="button"
                  onClick={regenerateKey}
                  disabled={busy}
                  className="btn btn-secondary !py-2 text-sm"
                >
                  Regenerate key
                </button>
                <label className="flex items-start gap-2 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={store.embed_key_required}
                    onChange={toggleKeyRequired}
                    disabled={busy}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-ink">Require this key</span> — also
                    reject embeds that load with <em>no</em> <code>?k=</code> at all. (A
                    wrong key is always rejected.) Turn on once your site uses the snippet
                    above.
                  </span>
                </label>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted">
                Only the owner can regenerate the key or change enforcement.
              </p>
            )}
          </Card>

          {error ? <InlineError>{error}</InlineError> : null}

          {isOwner ? (
            <Card className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">
                  {activeStore.agent_live ? 'Agent is live' : 'Go live'}
                </p>
                <p className="text-xs text-muted">
                  {activeStore.agent_live
                    ? 'Customers on your site can talk to the agent.'
                    : ready
                      ? 'Everything checks out — you can publish.'
                      : 'Finish the checklist first.'}
                </p>
              </div>
              <button
                type="button"
                className={
                  activeStore.agent_live
                    ? 'btn btn-secondary'
                    : 'btn btn-primary'
                }
                disabled={busy || (!activeStore.agent_live && !ready)}
                onClick={toggleLive}
              >
                {busy
                  ? '…'
                  : activeStore.agent_live
                    ? 'Take offline'
                    : 'Publish'}
              </button>
            </Card>
          ) : (
            <p className="text-sm text-muted">
              {activeStore.agent_live
                ? 'The agent is live. Only the store owner can take it offline.'
                : 'Only the store owner can publish the agent.'}
            </p>
          )}
        </div>

        <Card>
          <p className="text-sm font-medium text-ink">Before you publish</p>
          <ul className="mt-3 space-y-2.5">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2.5 text-sm">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    item.done
                      ? 'bg-success/15 text-success'
                      : 'bg-line text-muted'
                  }`}
                >
                  {item.done ? '✓' : '•'}
                </span>
                <span className={item.done ? 'text-ink' : 'text-muted'}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
            <Link to="/merchant/catalog" className="block text-accent">
              Manage catalog →
            </Link>
            <Link to="/merchant/locations" className="block text-accent">
              Manage locations →
            </Link>
            <Link to="/merchant/preview" className="block text-accent">
              Preview the agent →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
