import { useMemo } from 'react'
import { format } from 'date-fns'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useBooks, useProfile, useSessions } from '../hooks/useData'
import { evaluateBadges } from '../lib/badges'
import { formatDuration, monthSummary, totals, weeklyMinutes } from '../lib/stats'
import { computeRecords } from '../lib/records'
import { computeStreak } from '../lib/streak'
import { Medal } from 'lucide-react'
import { BadgeGrid } from '../components/BadgeGrid'
import { Heatmap } from '../components/Heatmap'
import { ErrorBox, Page, Spinner, Stat } from '../components/ui'

export default function Stats() {
  const sessions = useSessions()
  const books = useBooks()
  const profile = useProfile()

  const list = useMemo(() => sessions.data ?? [], [sessions.data])
  const bookList = useMemo(() => books.data ?? [], [books.data])
  const min = profile.data?.min_minutes ?? 2
  const goal = profile.data?.daily_goal_minutes ?? 10

  const streak = useMemo(() => computeStreak(list, min), [list, min])
  const month = useMemo(() => monthSummary(list, bookList), [list, bookList])
  const weeks = useMemo(() => weeklyMinutes(list, 12), [list])
  const all = useMemo(() => totals(list), [list])
  const records = useMemo(() => computeRecords(list, streak.longest), [list, streak.longest])
  const badges = useMemo(() => evaluateBadges({ sessions: list, books: bookList, longestStreak: streak.longest }), [list, bookList, streak.longest])

  if (sessions.isLoading || books.isLoading || profile.isLoading) return <Spinner />

  return (
    <Page title="Stats">
      <ErrorBox error={sessions.error ?? books.error} />

      <section className="card mb-4 p-4">
        <h2 className="mb-3 font-semibold">{format(new Date(), 'MMMM yyyy')}</h2>
        <div className="grid grid-cols-3 gap-y-4">
          <Stat label="Time" value={formatDuration(month.minutes * 60)} />
          <Stat label="Pages" value={month.pages} />
          <Stat label="Days read" value={month.daysRead} />
          <Stat label="Sessions" value={month.sessions} />
          <Stat label="Books done" value={month.booksFinished} />
          <Stat label="Streak" value={`${streak.current}d`} sub={`best ${streak.longest}d`} />
        </div>
      </section>

      <section className="card mb-4 p-4">
        <h2 className="mb-3 font-semibold">Don't break the chain</h2>
        <Heatmap sessions={list} minMinutes={min} goalMinutes={goal} frozenDays={streak.frozenDays} />
      </section>

      <section className="card mb-4 p-4">
        <h2 className="font-semibold">Minutes per week</h2>
        <p className="mb-3 text-xs text-ink-400">Last 12 weeks</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ top: 4, right: 0, left: -24, bottom: 0 }} barCategoryGap={3}>
              <CartesianGrid vertical={false} stroke="#2e2e33" />
              <XAxis dataKey="label" tick={{ fill: '#8a8a93', fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fill: '#8a8a93', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ background: '#18181b', border: '1px solid #2e2e33', borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: '#8a8a93' }}
                itemStyle={{ color: '#f4f4f5' }}
                labelFormatter={(l) => `Week of ${l}`}
                formatter={(v) => [`${v} min`, 'Read']}
              />
              <Bar dataKey="minutes" fill="#fc5200" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card mb-4 p-4">
        <h2 className="mb-3 font-semibold">All time</h2>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Time" value={formatDuration(all.seconds)} />
          <Stat label="Pages" value={all.pages} />
          <Stat label="Books done" value={bookList.filter((b) => b.status === 'finished').length} />
        </div>
      </section>

      <section className="card mb-4 p-4">
        <h2 className="mb-3 font-semibold">Personal records</h2>
        <div className="grid grid-cols-2 gap-2">
          {records.map((r) => (
            <div key={r.id} className="rounded-xl bg-ink-700/60 p-3">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ink-400">
                <Medal size={12} className={r.value > 0 ? 'text-amber-300' : ''} />
                {r.label}
              </div>
              <div className="mt-1 text-lg font-semibold leading-tight">{r.value > 0 ? r.display : '–'}</div>
              {r.value > 0 && r.when && <div className="text-xs text-ink-400">{r.when}</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-4 font-semibold">
          Badges <span className="text-sm font-normal text-ink-400">{badges.filter((b) => b.isEarned).length}/{badges.length}</span>
        </h2>
        <BadgeGrid badges={badges} />
      </section>
    </Page>
  )
}
