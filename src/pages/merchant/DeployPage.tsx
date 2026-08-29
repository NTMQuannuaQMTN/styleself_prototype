import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../merchant/useStore'
import { useAsync } from '../../merchant/useAsync'
import { getDashboardCounts, rotateEmbedKey, setStoreLive } from '../../merchant/api'
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

  const counts = useAsync(
    () => getDashboardCounts(activeStore!.id),
    [activeStore?.id],
  )

  if (!activeStore) return null
  const store = activeStore

  const agentUrl = `${window.location.origin}/agent/${store.slug}?k=${store.embed_key}`
  const snippet = `<iframe
  src="${agentUrl}"
  title="${store.name} — Shopping assistant"
  width="100%"
  height="640"
  style="border:0;border-radius:16px;max-width:480px"
></iframe>`

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
    if (!window.confirm('Generate a new embed key? Any embed already on your site will stop working until you paste the new code.')) {
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
            </div>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-paper p-3.5 font-mono text-[0.72rem] leading-relaxed text-ink-soft">
              <code>{snippet}</code>
            </pre>
            <button
              type="button"
              onClick={copy}
              className="btn btn-primary mt-3 w-full !py-2.5 text-sm"
            >
              {copied ? 'Copied to clipboard' : 'Copy embed code'}
            </button>
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
            <p className="eyebrow text-[0.6rem]">Embed key</p>
            <p className="mt-1 text-xs text-muted">
              Ties the embed to this store. It's part of the code above — regenerate it to
              revoke an old embed.
            </p>
            <p className="mt-2 break-all rounded-lg border border-line bg-paper px-3 py-2 font-mono text-[0.72rem] text-ink-soft">
              {store.embed_key}
            </p>
            {isOwner ? (
              <button
                type="button"
                onClick={regenerateKey}
                disabled={busy}
                className="btn btn-secondary mt-2 !py-2 text-sm"
              >
                Regenerate key
              </button>
            ) : (
              <p className="mt-2 text-xs text-muted">Only the owner can regenerate it.</p>
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
