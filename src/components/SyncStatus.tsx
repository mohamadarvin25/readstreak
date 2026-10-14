import { useEffect, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CloudOff, RefreshCw } from 'lucide-react'
import { useUserId } from '../hooks/useAuth'
import { getOutbox, syncNow, useOutbox } from '../hooks/useData'

const subscribeOnline = (fn: () => void) => {
  window.addEventListener('online', fn)
  window.addEventListener('offline', fn)
  return () => {
    window.removeEventListener('online', fn)
    window.removeEventListener('offline', fn)
  }
}
const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine)

const plural = (n: number) => `${n} change${n === 1 ? '' : 's'}`

/** Keeps queued changes syncing in the background, and shows a small status bar when it matters. */
export function SyncStatus() {
  const userId = useUserId()
  const qc = useQueryClient()
  const online = useOnline()
  const { ops, lastError, syncing } = useOutbox(userId)

  useEffect(() => {
    const kick = () => void syncNow(userId, qc)
    const onVisible = () => document.visibilityState === 'visible' && kick()
    kick()
    window.addEventListener('online', kick)
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => {
      if (getOutbox(userId).getSnapshot().ops.length > 0) kick()
    }, 30_000)
    return () => {
      window.removeEventListener('online', kick)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [userId, qc])

  const pending = ops.length
  if (online && pending === 0 && !lastError) return null

  let content
  if (lastError) {
    content = (
      <>
        <AlertTriangle size={14} className="shrink-0 text-red-300" />
        <span className="min-w-0 flex-1 truncate">Couldn’t sync: {lastError}</span>
        <button className="font-semibold text-brand" onClick={() => void syncNow(userId, qc)}>
          Retry
        </button>
        <button
          className="text-ink-400"
          onClick={() => confirm('Discard the change that keeps failing? It will be lost.') && getOutbox(userId).discardFirst()}
        >
          Discard
        </button>
      </>
    )
  } else if (!online) {
    content = (
      <>
        <CloudOff size={14} className="shrink-0" />
        <span>Offline · {pending > 0 ? `${plural(pending)} will sync when you’re back online` : 'showing your saved data'}</span>
      </>
    )
  } else {
    content = (
      <>
        <RefreshCw size={14} className={`shrink-0 ${syncing ? 'animate-spin' : ''}`} />
        <span>
          {syncing ? 'Syncing' : 'Waiting to sync'} {plural(pending)}…
        </span>
      </>
    )
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[84px] z-20 flex justify-center px-4 pb-safe">
      <div
        role="status"
        className={`pointer-events-auto flex max-w-md items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-lg backdrop-blur ${
          lastError ? 'border-red-500/40 bg-ink-800/95 text-red-200' : 'border-ink-600 bg-ink-800/95 text-zinc-300'
        }`}
      >
        {content}
      </div>
    </div>
  )
}
