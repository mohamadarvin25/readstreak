// Streak rules shared by the web app and the reminder Edge Function.
// No imports and no timezone logic: days are "yyyy-MM-dd" keys already in the reader's local time.

/** Every this many qualifying days in a row earns one streak freeze. */
export const FREEZE_EVERY = 7
/** Most freezes that can be banked at once. */
export const MAX_FREEZES = 2

export interface StreakResult {
  current: number
  longest: number
  readToday: boolean
  /** Yesterday was missed (not even frozen) and today isn't done yet: "never miss twice". */
  atRisk: boolean
  /** Freezes banked and ready to cover a missed day. */
  freezes: number
  /** Missed days that a freeze covered, so the streak survived. */
  frozenDays: string[]
  /** Yesterday was covered by a freeze; read today to keep going. */
  frozeYesterday: boolean
}

/** Shift a "yyyy-MM-dd" key by whole days, independent of any timezone. */
export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/**
 * Walks every day from the first qualifying day up to today.
 * A day qualifies when at least `minSeconds` were read. A missed day is covered by a
 * banked freeze when there is a streak to protect; otherwise the streak resets.
 * Today never breaks the streak, because it isn't over yet.
 */
export function streakFromDays(secondsByDay: Map<string, number>, todayKey: string, minSeconds: number): StreakResult {
  const qualifies = (k: string) => (secondsByDay.get(k) ?? 0) >= minSeconds
  const qualifying = [...secondsByDay.keys()].filter(qualifies).sort()
  const yesterday = addDaysToKey(todayKey, -1)

  let run = 0
  let longest = 0
  let progress = 0
  let freezes = 0
  const frozenDays: string[] = []

  const countDay = () => {
    run++
    progress++
    if (progress === FREEZE_EVERY) {
      freezes = Math.min(MAX_FREEZES, freezes + 1)
      progress = 0
    }
    longest = Math.max(longest, run)
  }

  const first = qualifying[0]
  if (first) {
    for (let k = first; k < todayKey; k = addDaysToKey(k, 1)) {
      if (qualifies(k)) countDay()
      else if (run > 0 && freezes > 0) {
        freezes--
        frozenDays.push(k)
      } else {
        run = 0
        progress = 0
      }
    }
  }

  const readToday = qualifies(todayKey)
  if (readToday) countDay()

  const frozeYesterday = run > 0 && frozenDays.includes(yesterday)
  return {
    current: run,
    longest,
    readToday,
    atRisk: qualifying.length > 0 && !readToday && !qualifies(yesterday) && !frozeYesterday,
    freezes,
    frozenDays,
    frozeYesterday,
  }
}

/** Local "yyyy-MM-dd" for an instant in an IANA timezone, e.g. "Asia/Jakarta". */
export function dayKeyInTimeZone(date: Date, timeZone: string): string {
  // en-CA formats dates as yyyy-mm-dd.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

/** Local minutes since midnight for an instant in an IANA timezone. */
export function minutesInTimeZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return get('hour') * 60 + get('minute')
}
