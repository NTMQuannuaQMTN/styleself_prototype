import { useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { useStore } from '../../merchant/useStore'
import { useAsync } from '../../merchant/useAsync'
import {
  approveJoinRequest,
  listMembers,
  listPendingRequests,
  rejectJoinRequest,
  removeMember,
} from '../../merchant/api'
import {
  Card,
  InlineError,
  LoadingRow,
  PageHeader,
} from '../../components/merchant/ui'

export default function TeamPage() {
  const { user } = useAuth()
  const { activeStore, isManager, refreshStore } = useStore()
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const members = useAsync(
    () => listMembers(activeStore!.id),
    [activeStore?.id],
  )
  const requests = useAsync(
    () => (isManager ? listPendingRequests(activeStore!.id) : Promise.resolve([])),
    [activeStore?.id, isManager],
  )

  if (!activeStore) return null

  async function act(fn: () => Promise<void>, id: string) {
    setError(null)
    setBusyId(id)
    try {
      await fn()
      members.reload()
      requests.reload()
      await refreshStore()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Team"
        title="Team & access"
        description="Owners and admins can approve join requests and manage members."
      />

      {error ? <InlineError>{error}</InlineError> : null}

      {isManager && (
        <section className="space-y-3">
          <h2 className="font-display text-lg text-ink">Join requests</h2>
          {requests.loading ? (
            <LoadingRow />
          ) : !requests.data || requests.data.length === 0 ? (
            <p className="text-sm text-muted">No pending requests.</p>
          ) : (
            requests.data.map((req) => (
              <Card
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {req.requester_name || req.requester_email || 'A user'}
                  </p>
                  {req.requester_email && (
                    <p className="text-xs text-muted">{req.requester_email}</p>
                  )}
                  {req.requester_location && (
                    <p className="mt-1 text-xs text-ink-soft">
                      Location: {req.requester_location}
                    </p>
                  )}
                  {req.message && (
                    <p className="mt-1 max-w-md text-xs italic text-muted">
                      “{req.message}”
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-primary !px-3 !py-1.5 text-xs"
                    disabled={busyId === req.id}
                    onClick={() =>
                      act(() => approveJoinRequest(req.id), req.id)
                    }
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary !px-3 !py-1.5 text-xs"
                    disabled={busyId === req.id}
                    onClick={() => act(() => rejectJoinRequest(req.id), req.id)}
                  >
                    Reject
                  </button>
                </div>
              </Card>
            ))
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg text-ink">Members</h2>
        {members.loading ? (
          <LoadingRow />
        ) : members.error ? (
          <InlineError>{members.error}</InlineError>
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-line">
            {members.data?.map((m, i) => (
              <div
                key={m.user_id}
                className={`flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3 ${
                  i > 0 ? 'border-t border-line' : ''
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {m.profile?.full_name ||
                      m.profile?.email ||
                      'Invited teammate'}
                    {m.user_id === user?.id && (
                      <span className="ml-2 text-xs text-muted">(you)</span>
                    )}
                  </p>
                  {m.profile?.email && (
                    <p className="text-xs text-muted">{m.profile.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                    {m.role}
                  </span>
                  {isManager &&
                    m.user_id !== user?.id &&
                    m.role !== 'owner' && (
                      <button
                        type="button"
                        className="text-xs text-muted transition-colors hover:text-[#8f3a24]"
                        disabled={busyId === m.user_id}
                        onClick={() =>
                          act(
                            () => removeMember(activeStore.id, m.user_id),
                            m.user_id,
                          )
                        }
                      >
                        Remove
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
