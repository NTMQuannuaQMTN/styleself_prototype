import { createContext } from 'react'
import type {
  Store,
  StoreAgent,
  StoreJoinRequest,
  StoreLocation,
  StoreMemberRole,
} from '../lib/database.types'
import type { Membership } from './api'

export type PendingRequest = StoreJoinRequest & { store: Store | null }

export interface StoreContextValue {
  /** True until memberships have been resolved for the first time. */
  loading: boolean
  memberships: Membership[]
  pendingRequests: PendingRequest[]
  activeStore: Store | null
  activeRole: StoreMemberRole | null
  isManager: boolean
  /** Active store's agent config + locations (loaded alongside the store). */
  agent: StoreAgent | null
  locations: StoreLocation[]
  /** Count of pending requests to join the active store (managers only). */
  incomingRequestCount: number
  storeDataLoading: boolean
  setActiveStore: (storeId: string) => void
  /** Reload memberships + pending requests. */
  refreshMemberships: () => Promise<void>
  /** Reload the active store, its agent, and its locations. */
  refreshStore: () => Promise<void>
}

export const StoreContext = createContext<StoreContextValue | null>(null)

export const ACTIVE_STORE_KEY = 'styleself:active-store'
