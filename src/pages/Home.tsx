import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Flame, Play, Plus, Snowflake } from 'lucide-react'
import { useDeleteSession, useProfile, useSessions } from '../hooks/useData'
import { computeStreak, dayKey, FREEZE_EVERY, MAX_FREEZES, secondsByDay } from '../lib/streak'
import type { Celebration } from '../lib/celebrate'
import { CelebrationOverlay } from '../components/CelebrationOverlay'
import { GoalRing } from '../components/GoalRing'
import { SessionCard } from '../components/SessionCard'
import { ErrorBox, Page, Spinner } from '../components/ui'

export default function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const celebration = (location.state as { celebration?: Celebration } | null)?.celebration
  const profile = useProfile()
  const sessions = useSessions()
  const del = useDeleteSession()

  const goal = profile.data?.daily_goal_minutes ?? 10
  const min = profile.data?.min_minutes ?? 2
  const list = sessions.data ?? []
  const streak = useMemo(() => computeStreak(list, min), [list, min])
  const todayMinutes = (secondsByDay(list).get(dayKey(new Date())) ?? 0) / 60

  if (sessions.isLoading || profile.isLoading) return <Spinner />

  return (
    <Page title="ReadStreak">
      <ErrorBox error={sessions.error ?? profile.error} />

      {celebration && (
        <CelebrationOverlay celebration={celebration} onClose={() => navigate('.', { replace: true, state: null })} />
      )}

      {streak.frozeYesterday && !streak.readToday && (
        <div className="card mb-4 flex items-center gap-3 border-sky-400/40 bg-sky-400/10 p-3">
          <Snowflake className="shrink-0 text-sky-300" />
          <div className="text-sm">
            <b>A streak freeze saved you yesterday.</b> Read today to keep your {streak.current}-day streak going.
          </div>
        </div>
      )}

      {streak.atRisk && (
        <div className="card mb-4 flex items-center gap-3 border-amber-500/40 bg-amber-500/10 p-3">
          <AlertTriangle className="shrink-0 text-amber-400" />
          <div className="text-sm">
            <b>Never miss twice.</b> You missed yesterday. Just {min} minutes today gets you back on track.
          </div>
        </div>
      )}

      <section className="card mb-4 p-5">
        {profile.data?.identity_statement && (
          <p className="mb-4 text-center text-sm italic text-ink-400">“{profile.data.identity_statement}”</p>
        )}
        <div className="flex items-center justify-around">
          <GoalRing minutes={todayMinutes} goal={goal} />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Flame size={36} className={streak.current > 0 ? 'fill-brand text-brand' : 'text-ink-600'} />
              <span className="text-5xl font-extrabold tabular-nums">{streak.current}</span>
            </div>
            <div className="text-sm text-ink-400">day streak</div>
            <div className="mt-1 text-xs text-ink-400">Best: {streak.longest}</div>
            <div
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                streak.freezes > 0 ? 'bg-sky-400/15 text-sky-300' : 'bg-ink-700 text-ink-400'
              }`}
              title={`Every ${FREEZE_EVERY} days in a row earns a freeze (max ${MAX_FREEZES}). It covers a day you miss.`}
            >
              <Snowflake size={12} />
              {streak.freezes > 0
                ? `${streak.freezes} freeze${streak.freezes > 1 ? 's' : ''}`
                : `Freeze in ${FREEZE_EVERY - (streak.current % FREEZE_EVERY)}d`}
            </div>
          </div>
        </div>
        {profile.data?.intention && <p className="mt-4 text-center text-xs text-ink-400">Plan: {profile.data.intention}</p>}
        <Link to="/record" className="btn-primary mt-5 w-full py-3 text-base">
          <Play size={18} className="fill-white" />
          {streak.readToday ? 'Read some more' : 'Start reading'}
        </Link>
      </section>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Your activity</h2>
        <Link to="/log/new" className="flex items-center gap-1 text-sm text-brand">
          <Plus size={16} /> Log past session
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink-400">
          No sessions yet. Add a book in your Library, then tap <b className="text-brand">Read</b> to start your first session.
        </div>
      ) : (
        <div className="space-y-3">
          {list.slice(0, 30).map((s) => (
            <SessionCard key={s.id} session={s} onDelete={() => del.mutate(s.id)} />
          ))}
        </div>
      )}
    </Page>
  )
}
