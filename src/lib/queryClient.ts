import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

// How long saved data stays usable offline. Must stay under ~24.8 days: browser timers
// overflow past 2^31 ms and fire immediately, which would discard restored data at once.
const KEEP_OFFLINE = 14 * 24 * 60 * 60 * 1000

export const queryClient = new QueryClient({
  // Keep data around long enough to be restored from storage when offline.
  defaultOptions: { queries: { staleTime: 30_000, gcTime: KEEP_OFFLINE, retry: 1 } },
})

/** Saves fetched data to localStorage so the app shows your last data when offline. */
export const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'readstreak.cache',
})

export const persistOptions = { persister, maxAge: KEEP_OFFLINE, buster: 'v1' }
