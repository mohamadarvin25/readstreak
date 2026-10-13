import { format, isToday, isYesterday } from 'date-fns'
import { Star, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDuration, pace } from '../lib/stats'
import type { ReadingSession } from '../lib/types'
import { BookCover, Stat } from './ui'

/** Strava-style automatic activity name from the time of day. */
function sessionName(d: Date) {
  const h = d.getHours()
  if (h < 5) return 'Late Night Read'
  if (h < 12) return 'Morning Read'
  if (h < 17) return 'Afternoon Read'
  if (h < 21) return 'Evening Read'
  return 'Night Read'
}

function when(d: Date) {
  const time = format(d, 'HH:mm')
  if (isToday(d)) return `Today at ${time}`
  if (isYesterday(d)) return `Yesterday at ${time}`
  return format(d, "EEE, d MMM yyyy 'at' HH:mm")
}

export function SessionCard({ session, onDelete }: { session: ReadingSession; onDelete?: () => void }) {
  const started = new Date(session.started_at)
  const p = pace(session.pages_read, session.duration_seconds)
  return (
    <article className="card p-4">
      <div className="mb-3 flex items-start gap-3">
        {session.book ? (
          <Link to={`/books/${session.book.id}`}>
            <BookCover title={session.book.title} url={session.book.cover_url} size="sm" />
          </Link>
        ) : (
          <BookCover title="?" size="sm" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs text-ink-400">{when(started)}</div>
          <h3 className="truncate font-semibold">{sessionName(started)}</h3>
          <div className="truncate text-sm text-ink-400">{session.book?.title ?? 'No book'}</div>
        </div>
        {onDelete && (
          <button
            onClick={() => confirm('Delete this session?') && onDelete()}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-700 hover:text-red-400"
            aria-label="Delete session"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Time" value={formatDuration(session.duration_seconds)} />
        <Stat
          label="Pages"
          value={session.pages_read || '–'}
          sub={session.end_page != null ? `→ p. ${session.end_page}` : undefined}
        />
        <Stat label="Pace" value={p ? `${p}` : '–'} sub={p ? 'pages/hr' : undefined} />
      </div>
      {(session.note || session.rating) && (
        <div className="mt-3 border-t border-ink-700 pt-3">
          {session.rating && (
            <div className="mb-1 flex gap-0.5">
              {Array.from({ length: session.rating }, (_, i) => (
                <Star key={i} size={14} className="fill-brand text-brand" />
              ))}
            </div>
          )}
          {session.note && <p className="whitespace-pre-wrap text-sm text-zinc-300">{session.note}</p>}
        </div>
      )}
    </article>
  )
}
