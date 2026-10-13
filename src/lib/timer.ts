import { useCallback, useEffect, useState } from 'react'

const KEY = 'readstreak.activeSession'

export interface ActiveTimer {
  bookId: string | null
  startPage: number | null
  startedAt: number
  /** Total ms spent paused so far, not counting a pause in progress. */
  pausedMs: number
  /** Set while paused. */
  pausedAt: number | null
}

/** Reading time so far, derived from timestamps so it survives refreshes and a locked phone. */
export function elapsedMs(t: ActiveTimer, now = Date.now()): number {
  const end = t.pausedAt ?? now
  return Math.max(0, end - t.startedAt - t.pausedMs)
}

function load(): ActiveTimer | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ActiveTimer) : null
  } catch {
    return null
  }
}

function save(t: ActiveTimer | null) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t))
    else localStorage.removeItem(KEY)
  } catch {
    // Storage unavailable: the timer still works for this page view.
  }
}

export function hasActiveTimer() {
  return load() !== null
}

export function useReadingTimer() {
  const [timer, setTimer] = useState<ActiveTimer | null>(load)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!timer || timer.pausedAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [timer])

  const update = useCallback((t: ActiveTimer | null) => {
    save(t)
    setTimer(t)
    setNow(Date.now())
  }, [])

  const start = (bookId: string | null, startPage: number | null) =>
    update({ bookId, startPage, startedAt: Date.now(), pausedMs: 0, pausedAt: null })
  const pause = () => {
    if (timer && !timer.pausedAt) update({ ...timer, pausedAt: Date.now() })
  }
  const resume = () => {
    if (timer?.pausedAt) update({ ...timer, pausedMs: timer.pausedMs + (Date.now() - timer.pausedAt), pausedAt: null })
  }
  const clear = () => update(null)

  return {
    timer,
    elapsed: timer ? elapsedMs(timer, now) : 0,
    running: Boolean(timer && !timer.pausedAt),
    start,
    pause,
    resume,
    clear,
  }
}
