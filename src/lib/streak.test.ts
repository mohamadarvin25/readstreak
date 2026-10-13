import { describe, expect, it } from 'vitest'
import { computeStreak, secondsByDay } from './streak'
import type { SessionLike } from './types'

// Local-time dates, so the tests hold in any machine timezone.
const at = (y: number, m: number, d: number, h = 20, min = 0) => new Date(y, m - 1, d, h, min)
const session = (date: Date, minutes = 15, pages = 10): SessionLike => ({
  started_at: date.toISOString(),
  duration_seconds: minutes * 60,
  pages_read: pages,
})
const TODAY = at(2026, 10, 13, 9)

describe('computeStreak', () => {
  it('is zero with no sessions and not at risk', () => {
    expect(computeStreak([], 2, TODAY)).toEqual({
      current: 0,
      longest: 0,
      readToday: false,
      atRisk: false,
      freezes: 0,
      frozenDays: [],
      frozeYesterday: false,
    })
  })

  it('counts consecutive days ending today', () => {
    const s = [session(at(2026, 10, 11)), session(at(2026, 10, 12)), session(at(2026, 10, 13, 8))]
    const r = computeStreak(s, 2, TODAY)
    expect(r.current).toBe(3)
    expect(r.readToday).toBe(true)
  })

  it('stays alive through yesterday when today has not been read yet', () => {
    const s = [session(at(2026, 10, 11)), session(at(2026, 10, 12))]
    const r = computeStreak(s, 2, TODAY)
    expect(r.current).toBe(2)
    expect(r.readToday).toBe(false)
    expect(r.atRisk).toBe(false)
  })

  it('breaks on a gap and flags "never miss twice"', () => {
    const s = [session(at(2026, 10, 9)), session(at(2026, 10, 10)), session(at(2026, 10, 11))]
    const r = computeStreak(s, 2, TODAY)
    expect(r.current).toBe(0)
    expect(r.longest).toBe(3)
    expect(r.atRisk).toBe(true)
  })

  it('does not count days below the minimum', () => {
    const s = [session(at(2026, 10, 12), 1), session(at(2026, 10, 13, 8), 5)]
    expect(computeStreak(s, 2, TODAY).current).toBe(1)
  })

  it('adds several short sessions on the same day together', () => {
    const s = [session(at(2026, 10, 13, 7), 1), session(at(2026, 10, 13, 8), 1)]
    expect(computeStreak(s, 2, TODAY).readToday).toBe(true)
  })

  it('assigns a late-night session to its local day', () => {
    const late = session(at(2026, 10, 12, 23, 59))
    expect([...secondsByDay([late]).keys()]).toEqual(['2026-10-12'])
    const early = session(at(2026, 10, 13, 0, 1))
    expect([...secondsByDay([early]).keys()]).toEqual(['2026-10-13'])
  })

  it('finds the longest streak across history', () => {
    const s = [
      ...[1, 2, 3, 4, 5].map((d) => session(at(2026, 9, d))),
      ...[20, 21].map((d) => session(at(2026, 9, d))),
      session(at(2026, 10, 12)),
    ]
    const r = computeStreak(s, 2, TODAY)
    expect(r.longest).toBe(5)
    expect(r.current).toBe(1)
  })

  it('handles streaks across a month boundary', () => {
    const s = [session(at(2026, 9, 30)), session(at(2026, 10, 1)), session(at(2026, 10, 2))]
    expect(computeStreak(s, 2, at(2026, 10, 2, 22)).current).toBe(3)
  })
})

describe('streak freezes', () => {
  const days = (from: number, to: number, month = 10) =>
    Array.from({ length: to - from + 1 }, (_, i) => session(at(2026, month, from + i)))

  it('earns a freeze after 7 days in a row', () => {
    const r = computeStreak(days(6, 12), 2, TODAY)
    expect(r.current).toBe(7)
    expect(r.freezes).toBe(1)
  })

  it('does not earn a freeze before day 7', () => {
    expect(computeStreak(days(7, 12), 2, TODAY).freezes).toBe(0)
  })

  it('spends a freeze on a single missed day and keeps the streak', () => {
    // Read 1–7 Oct, missed 8 Oct, read 9–12 Oct.
    const r = computeStreak([...days(1, 7), ...days(9, 12)], 2, TODAY)
    expect(r.current).toBe(11)
    expect(r.freezes).toBe(0)
    expect(r.frozenDays).toEqual(['2026-10-08'])
  })

  it('covers yesterday and tells you so instead of warning', () => {
    // Read 5–11 Oct, missed 12 Oct (yesterday), today not read yet.
    const r = computeStreak(days(5, 11), 2, TODAY)
    expect(r.current).toBe(7)
    expect(r.frozeYesterday).toBe(true)
    expect(r.atRisk).toBe(false)
  })

  it('banks at most 2 freezes and breaks when the gap is longer', () => {
    // 21 days in a row (3 freezes earned, capped at 2), then 3 missed days.
    const s = days(1, 21, 9)
    const r = computeStreak(s, 2, at(2026, 9, 25, 9))
    expect(r.frozenDays).toEqual(['2026-09-22', '2026-09-23'])
    expect(r.current).toBe(0)
    expect(r.longest).toBe(21)
    expect(r.atRisk).toBe(true)
  })

  it('does not spend a freeze when there is no streak to protect', () => {
    // 7-day streak, then 2 missed days that use one freeze and break the streak.
    // Reading again later starts a new streak with 0 freezes left.
    const r = computeStreak([...days(1, 7), ...days(11, 12)], 2, TODAY)
    expect(r.frozenDays).toEqual(['2026-10-08'])
    expect(r.current).toBe(2)
    expect(r.freezes).toBe(0)
  })
})
