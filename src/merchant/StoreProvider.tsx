import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import type { Store, StoreAgent, StoreLocation } from '../lib/database.types'
import { useAuth } from '../auth/useAuth'
import { FullPageSpinner } from '../auth/guards'
import {
  getAgent,
  getStore,
  listLocations,
  listMyJoinRequests,
  listMyMemberships,
  listPendingRequests,
  type Membership,
} from './api'
import {
  ACTIVE_STORE_KEY,
  StoreContext,
  type PendingRequest,
  type StoreContextValue,
} from './storeContext'

function readActiveStore(): string | null {
  try {
    return localStorage.getItem(ACTIVE_STORE_KEY)
  } catch {
    return null
  }
}

function writeActiveStore(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_STORE_KEY, id)
    else localStorage.removeItem(ACTIVE_STORE_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function StoreProvider() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const mounted = useRef(true)

  const [loading, setLoading] = useState(!!userId)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [activeStoreId, setActiveStoreId] = useState<string | null>(
    readActiveStore(),
  )

  const [storeDataLoading, setStoreDataLoading] = useState(false)
  const [activeStore, setActiveStoreRow] = useState<Store | null>(null)
  const [agent, setAgent] = useState<StoreAgent | null>(null)
  const [locations, setLocations] = useState<StoreLocation[]>([])
  const [incomingRequestCount, setIncomingRequestCount] = useState(0)

  const refreshMemberships = useCallback(async () => {
    const [mems, reqs] = await Promise.all([
      listMyMemberships(userId as string),
      listMyJoinRequests(),
    ])
    if (!mounted.current) return
    setMemberships(mems)
    setPendingRequests(
      reqs.filter((r) => r.status === 'pending') as PendingRequest[],
    )
    setActiveStoreId((current) => {
      if (current && mems.some((m) => m.store.id === current)) return current
      return mems[0]?.store.id ?? null
    })
  }, [userId])

  useEffect(() => {
    mounted.current = true
    if (!userId) {
      return () => {
        mounted.current = false
      }
    }
    setLoading(true)
    refreshMemberships().finally(() => {
      if (mounted.current) setLoading(false)
    })
    return () => {
      mounted.current = false
    }
  }, [userId, refreshMemberships])

  useEffect(() => {
    writeActiveStore(activeStoreId)
  }, [activeStoreId])

  const activeRoleForId =
    memberships.find((m) => m.store.id === activeStoreId)?.role ?? null
  const activeMemberLocationId =
    memberships.find((m) => m.store.id === activeStoreId)?.location_id ?? null
  const activeIsManager =
    activeRoleForId === 'owner' || activeRoleForId === 'admin'

  const refreshStore = useCallback(async () => {
    if (!activeStoreId) {
      setActiveStoreRow(null)
      setAgent(null)
      setLocations([])
      setIncomingRequestCount(0)
      return
    }
    setStoreDataLoading(true)
    try {
      const [store, agentRow, locs, pending] = await Promise.all([
        getStore(activeStoreId),
        getAgent(activeStoreId),
        listLocations(activeStoreId),
        activeIsManager
          ? listPendingRequests(activeStoreId)
          : Promise.resolve([]),
      ])
      if (!mounted.current) return
      setActiveStoreRow(store)
      setAgent(agentRow)
      setLocations(activeIsManager || !activeMemberLocationId ? locs : locs.filter((location) => location.id === activeMemberLocationId))
      setIncomingRequestCount(pending.length)
    } catch (err) {
      console.error('Failed to load store data:', err)
    } finally {
      if (mounted.current) setStoreDataLoading(false)
    }
  }, [activeStoreId, activeIsManager, activeMemberLocationId])

  useEffect(() => {
    void refreshStore()
  }, [refreshStore])

  const setActiveStore = useCallback((storeId: string) => {
    setActiveStoreId(storeId)
  }, [])

  const value = useMemo<StoreContextValue>(
    () => ({
      loading,
      memberships,
      pendingRequests,
      activeStore,
      activeRole: activeRoleForId,
      isManager: activeIsManager,
      agent,
      locations,
      memberLocationId: activeMemberLocationId,
      incomingRequestCount,
      storeDataLoading,
      setActiveStore,
      refreshMemberships,
      refreshStore,
    }),
    [
      loading,
      memberships,
      pendingRequests,
      activeStore,
      activeRoleForId,
      activeIsManager,
      agent,
      locations,
      activeMemberLocationId,
      incomingRequestCount,
      storeDataLoading,
      setActiveStore,
      refreshMemberships,
      refreshStore,
    ],
  )

  if (loading) return <FullPageSpinner label="Loading your workspace…" />

  return (
    <StoreContext.Provider value={value}>
      <Outlet />
    </StoreContext.Provider>
  )
}
