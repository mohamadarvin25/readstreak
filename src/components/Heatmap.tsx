import { useEffect, useMemo, useRef, useState } from 'react'
import { format, startOfWeek, subWeeks } from 'date-fns'
import { dayKey, eachDay, secondsByDay } from '../lib/streak'
import { formatDuration } from '../lib/stats'
import type { SessionLike } from '../lib/types'

const WEEKS = 53
const CELL = 13
const GAP = 3

/** GitHub-style "don't break the chain" calendar for the last year. */
export function Heatmap({
  sessions,
  minMinutes,
  goalMinutes,
  frozenDays = [],
}: {
  sessions: SessionLike[]
  minMinutes: number
  goalMinutes: number
  /** Missed days a streak freeze covered. */
  frozenDays?: string[]
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const byDay = useMemo(() => secondsByDay(sessions), [sessions])
  const frozen = useMemo(() => new Set(frozenDays), [frozenDays])

  const today = new Date()
  const start = startOfWeek(subWeeks(today, WEEKS - 1), { weekStartsOn: 1 })
  const days = eachDay(start, today)

  useEffect(() => {
    scroller.current?.scrollTo({ left: scroller.current.scrollWidth })
  }, [])

  const level = (k: string, secs: number) => {
    if (frozen.has(k)) return 'fill-sky-400/70'
    if (secs <= 0) return 'fill-ink-700'
    if (secs < minMinutes * 60) return 'fill-brand/25'
    if (secs < goalMinutes * 60) return 'fill-brand/60'
    return 'fill-brand'
  }

  const width = WEEKS * (CELL + GAP)
  const height = 7 * (CELL + GAP) + 16
  const months: { x: number; label: string }[] = []
  days.forEach((d, i) => {
    if (d.getDate() === 1) months.push({ x: Math.floor(i / 7) * (CELL + GAP), label: format(d, 'MMM') })
  })

  const describe = (k: string) => {
    const secs = byDay.get(k) ?? 0
    if (secs) return formatDuration(secs)
    return frozen.has(k) ? 'covered by a streak freeze' : 'no reading'
  }

  return (
    <div>
      <div ref={scroller} className="overflow-x-auto pb-1">
        <svg width={width} height={height} role="img" aria-label="Reading calendar for the last year">
          {months.map((m) => (
            <text key={m.x} x={m.x} y={10} className="fill-ink-400 text-[10px]">
              {m.label}
            </text>
          ))}
          {days.map((d, i) => {
            const k = dayKey(d)
            const secs = byDay.get(k) ?? 0
            return (
              <rect
                key={k}
                x={Math.floor(i / 7) * (CELL + GAP)}
                y={16 + (i % 7) * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={3}
                className={`${level(k, secs)} cursor-pointer ${selected === k ? 'stroke-white' : ''}`}
                onClick={() => setSelected(selected === k ? null : k)}
              >
                <title>{`${format(d, 'd MMM yyyy')}: ${describe(k)}`}</title>
              </rect>
            )
          })}
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-ink-400">
        <span>
          {selected
            ? `${format(new Date(selected + 'T00:00'), 'EEE d MMM')}: ${describe(selected)}`
            : 'Tap a day for details'}
        </span>
        <span className="flex items-center gap-1">
          Less
          {['fill-ink-700', 'fill-brand/25', 'fill-brand/60', 'fill-brand'].map((c) => (
            <svg key={c} width={10} height={10}>
              <rect width={10} height={10} rx={2} className={c} />
            </svg>
          ))}
          Goal
          <svg width={10} height={10} className="ml-2">
            <rect width={10} height={10} rx={2} className="fill-sky-400/70" />
          </svg>
          Freeze
        </span>
      </div>
    </div>
  )
}
