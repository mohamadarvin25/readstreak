import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import { lastPageByBook, useBooks, useDeleteBook, useDeleteSession, useSaveBook, useSessions } from '../hooks/useData'
import { formatDuration, pace, totals } from '../lib/stats'
import { BookForm } from '../components/BookForm'
import { SessionCard } from '../components/SessionCard'
import { BookCover, ErrorBox, Page, ProgressBar, Spinner, Stat } from '../components/ui'

export default function BookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const books = useBooks()
  const sessions = useSessions()
  const save = useSaveBook()
  const del = useDeleteBook()
  const delSession = useDeleteSession()
  const [editing, setEditing] = useState(false)

  const book = books.data?.find((b) => b.id === id)
  const bookSessions = useMemo(() => (sessions.data ?? []).filter((s) => s.book_id === id), [sessions.data, id])

  if (books.isLoading || sessions.isLoading) return <Spinner />
  if (!book) {
    return (
      <Page title="Book" back>
        <p className="text-ink-400">Book not found.</p>
      </Page>
    )
  }

  const t = totals(bookSessions)
  const last = lastPageByBook(bookSessions).get(book.id)
  const pct = book.status === 'finished' ? 100 : book.total_pages && last ? (last / book.total_pages) * 100 : 0
  const p = pace(t.pages, t.seconds)
  const pagesLeft = book.total_pages && last != null ? Math.max(0, book.total_pages - last) : null
  const etaHours = pagesLeft && p ? pagesLeft / p : null

  const remove = async () => {
    if (!confirm(`Delete "${book.title}"? Its sessions stay in your history, without a book.`)) return
    await del.mutateAsync(book.id)
    navigate('/books', { replace: true })
  }

  return (
    <Page
      title={book.title}
      back
      action={
        !editing && (
          <button onClick={() => setEditing(true)} className="rounded-lg p-2 hover:bg-ink-700" aria-label="Edit book">
            <Pencil size={18} />
          </button>
        )
      }
    >
      <ErrorBox error={save.error ?? del.error} />

      {editing ? (
        <div className="card mb-4 p-4">
          <BookForm
            initial={book}
            submitLabel="Save"
            busy={save.isPending}
            onCancel={() => setEditing(false)}
            onSubmit={async (input) => {
              await save.mutateAsync({ id: book.id, ...input })
              setEditing(false)
            }}
          />
          <button onClick={remove} className="btn-danger mt-4 w-full">
            <Trash2 size={16} /> Delete book
          </button>
        </div>
      ) : (
        <section className="card mb-4 p-4">
          <div className="flex gap-4">
            <BookCover title={book.title} url={book.cover_url} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold leading-tight">{book.title}</h2>
              <p className="text-sm text-ink-400">{book.author ?? 'Unknown author'}</p>
              <p className="mt-2 text-xs text-ink-400">
                {book.status === 'finished' && book.finished_at
                  ? `Finished ${format(new Date(book.finished_at), 'd MMM yyyy')}`
                  : book.status === 'want'
                    ? 'Want to read'
                    : 'Currently reading'}
              </p>
              <div className="mt-3">
                <ProgressBar value={pct} />
                <div className="mt-1 text-xs text-ink-400">
                  {book.total_pages ? `p. ${last ?? 0} of ${book.total_pages} · ${Math.round(pct)}%` : last ? `p. ${last}` : ''}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-ink-700 pt-4">
            <Stat label="Time" value={formatDuration(t.seconds)} sub={`${t.count} sessions`} />
            <Stat label="Pages" value={t.pages} />
            <Stat label="Pace" value={p ?? '–'} sub={p ? 'pages/hr' : undefined} />
          </div>
          {etaHours != null && book.status === 'reading' && (
            <p className="mt-3 text-xs text-ink-400">About {formatDuration(etaHours * 3600)} of reading left at your pace.</p>
          )}
          {book.status !== 'finished' && (
            <button
              onClick={() => save.mutate({ id: book.id, status: 'finished', finished_at: new Date().toISOString() })}
              className="btn-ghost mt-4 w-full"
            >
              Mark as finished
            </button>
          )}
        </section>
      )}

      <h2 className="mb-2 font-semibold">Sessions</h2>
      {bookSessions.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-400">No sessions for this book yet.</p>
      ) : (
        <div className="space-y-3">
          {bookSessions.map((s) => (
            <SessionCard key={s.id} session={s} onDelete={() => delSession.mutate(s.id)} />
          ))}
        </div>
      )}
    </Page>
  )
}
