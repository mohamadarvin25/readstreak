import { describe, expect, it } from 'vitest'
import { buildCelebration } from './celebrate'
import { computeRecords, newRecords } from './records'
import type { SessionLike } from './types'

const at = (m: number, d: number, h = 20) => new Date(2026, m - 1, d, h).toISOString()
const s = (started_at: string, minutes: number, pages = 0): SessionLike => ({ started_at, duration_seconds: minutes * 60, pages_read: pages })
const TODAY = new Date(2026, 9, 13, 21)

describe('records', () => {
  it('finds personal bests', () => {
    const r = computeRecords([s(at(10, 1), 30, 20), s(at(10, 1, 22), 15, 40), s(at(10, 5), 50, 10)], 3)
    const byId = Object.fromEntries(r.map((x) => [x.id, x.value]))
    expect(byId['longest-session']).toBe(50 * 60)
    expect(byId['most-pages-session']).toBe(40)
    expect(byId['best-day']).toBe(50 * 60)
    expect(byId['longest-streak']).toBe(3)
  })

  it('reports nothing new on the very first session', () => {
    expect(newRecords(computeRecords([], 0), computeRecords([s(at(10, 1), 30)], 1))).toEqual([])
  })
})

describe('buildCelebration', () => {
  it('celebrates extending the streak and hitting the goal', () => {
    const before = [s(at(10, 11), 10), s(at(10, 12), 10)]
    const c = buildCelebration({
      sessionsBefore: before,
      session: s(at(10, 13, 20), 20),
      booksBefore: [],
      booksAfter: [],
      minMinutes: 2,
      goalMinutes: 15,
      today: TODAY,
    })
    expect(c.streak).toBe(3)
    expect(c.streakExtended).toBe(true)
    expect(c.goalMet).toBe(true)
    expect(c.newBadges.map((b) => b.title)).toContain('Warming Up')
    expect(c.newRecords.map((r) => r.label)).toContain('Longest session')
  })

  it('does not re-celebrate the streak on a second session the same day', () => {
    const before = [s(at(10, 12), 10), s(at(10, 13, 8), 20)]
    const c = buildCelebration({
      sessionsBefore: before,
      session: s(at(10, 13, 20), 5),
      booksBefore: [],
      booksAfter: [],
      minMinutes: 2,
      goalMinutes: 15,
      today: TODAY,
    })
    expect(c.streakExtended).toBe(false)
    expect(c.goalMet).toBe(false)
  })

  it('celebrates earning a streak freeze on day 7', () => {
    const before = [7, 8, 9, 10, 11, 12].map((d) => s(at(10, d), 10))
    const c = buildCelebration({
      sessionsBefore: before,
      session: s(at(10, 13, 20), 10),
      booksBefore: [],
      booksAfter: [],
      minMinutes: 2,
      goalMinutes: 15,
      today: TODAY,
    })
    expect(c.freezeEarned).toBe(true)
    expect(c.streak).toBe(7)
  })
})
