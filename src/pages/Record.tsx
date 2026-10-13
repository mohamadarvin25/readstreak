import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Pause, Play, X } from 'lucide-react'
import { lastPageByBook, useBooks, useCreateSession, useProfile, useSaveBook, useSessions } from '../hooks/useData'
import { useReadingTimer } from '../lib/timer'
import { buildCelebration } from '../lib/celebrate'
import { formatClock } from '../lib/stats'
import { BookCover, ErrorBox, Page, RatingInput, Spinner } from '../components/ui'

const toInt = (v: string) => (v.trim() === '' ? null : Number.parseInt(v, 10))

export default function Record() {
  const navigate = useNavigate()
  const books = useBooks()
  const sessions = useSessions()
  const profile = useProfile()
  const createSession = useCreateSession()
  const saveBook = useSaveBook()
  const { timer, elapsed, running, start, pause, resume, clear } = useReadingTimer()

  const active = useMemo(() => (books.data ?? []).filter((b) => b.status !== 'finished'), [books.data])
  const lastPages = useMemo(() => lastPageByBook(sessions.data ?? []), [sessions.data])

  const [bookId, setBookId] = useState<string>('')
  const [startPage, setStartPage] = useState('')
  const [finishing, setFinishing] = useState(false)
  const [endPage, setEndPage] = useState('')
  const [note, setNote] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [markFinished, setMarkFinished] = useState(false)

  // Preselect the book read most recently.
  useEffect(() => {
    if (bookId || active.length === 0) return
    const recent = sessions.data?.find((s) => s.book_id && active.some((b) => b.id === s.book_id))
    setBookId(recent?.book_id ?? active[0].id)
  }, [active, sessions.data, bookId])

  useEffect(() => {
    if (!bookId) return
    const last = lastPages.get(bookId)
    setStartPage(last != null ? String(last) : '')
  }, [bookId, lastPages])

  const currentBook = books.data?.find((b) => b.id === (timer?.bookId ?? bookId))

  useEffect(() => {
    const end = toInt(endPage)
    setMarkFinished(Boolean(currentBook?.total_pages && end != null && end >= currentBook.total_pages))
  }, [endPage, currentBook])

  if (books.isLoading || sessions.isLoading) return <Spinner />

  const begin = () => {
    start(bookId || null, toInt(startPage))
    if (currentBook?.status === 'want') saveBook.mutate({ id: currentBook.id, status: 'reading', started_at: new Date().toISOString() })
  }

  const openFinish = () => {
    pause()
    setEndPage(timer?.startPage != null ? String(timer.startPage) : '')
    setFinishing(true)
  }

  const save = async () => {
    if (!timer) return
    const now = new Date()
    const saved = await createSession.mutateAsync({
      book_id: timer.bookId,
      started_at: new Date(timer.startedAt).toISOString(),
      ended_at: now.toISOString(),
      duration_seconds: Math.round(elapsed / 1000),
      start_page: timer.startPage,
      end_page: toInt(endPage),
      note: note.trim() || null,
      rating,
    })
    const finished = markFinished && currentBook ? currentBook : null
    if (finished) {
      await saveBook.mutateAsync({ id: finished.id, status: 'finished', finished_at: now.toISOString() })
    }
    const booksBefore = books.data ?? []
    const celebration = buildCelebration({
      sessionsBefore: sessions.data ?? [],
      session: saved,
      booksBefore,
      booksAfter: booksBefore.map((b) => (b.id === finished?.id ? { ...b, status: 'finished' as const } : b)),
      bookFinished: finished?.title ?? null,
      minMinutes: profile.data?.min_minutes ?? 2,
      goalMinutes: profile.data?.daily_goal_minutes ?? 10,
    })
    clear()
    navigate('/', { state: { celebration } })
  }

  const discard = () => {
    if (confirm('Discard this reading session?')) {
      clear()
      setFinishing(false)
    }
  }

  // ---- Not recording: pick a book and start --------------------------------
  if (!timer) {
    return (
      <Page title="Start reading">
        <div className="space-y-4">
          {active.length === 0 ? (
            <div className="card p-5 text-center text-sm text-ink-400">
              You have no books on the go.{' '}
              <Link to="/books?add=1" className="font-semibold text-brand">
                Add a book
              </Link>{' '}
              first, or read without one.
            </div>
          ) : (
            <div>
              <label className="label">Book</label>
              <div className="space-y-2">
                {active.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBookId(b.id)}
                    className={`card flex w-full items-center gap-3 p-3 text-left ${bookId === b.id ? 'border-brand ring-1 ring-brand' : ''}`}
                  >
                    <BookCover title={b.title} url={b.cover_url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{b.title}</div>
                      <div className="truncate text-xs text-ink-400">
                        {b.author ?? 'Unknown author'}
                        {lastPages.has(b.id) && ` · p. ${lastPages.get(b.id)}${b.total_pages ? ` / ${b.total_pages}` : ''}`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label" htmlFor="start-page">
              Starting page
            </label>
            <input
              id="start-page"
              type="number"
              inputMode="numeric"
              min={0}
              className="input"
              placeholder="Optional"
              value={startPage}
              onChange={(e) => setStartPage(e.target.value)}
            />
          </div>

          <button onClick={begin} className="btn-primary w-full py-4 text-lg">
            <Play className="fill-white" /> Start timer
          </button>
          <Link to="/log/new" className="block text-center text-sm text-ink-400 underline">
            Already read? Log a past session
          </Link>
        </div>
      </Page>
    )
  }

  // ---- Recording ------------------------------------------------------------
  return (
    <Page title={running ? 'Reading…' : finishing ? 'Save session' : 'Paused'}>
      <ErrorBox error={createSession.error ?? saveBook.error} />
      <div className="card mb-4 flex flex-col items-center p-6">
        {currentBook && (
          <div className="mb-4 flex items-center gap-3">
            <BookCover title={currentBook.title} url={currentBook.cover_url} size="sm" />
            <div className="min-w-0">
              <div className="truncate font-semibold">{currentBook.title}</div>
              {timer.startPage != null && <div className="text-xs text-ink-400">from page {timer.startPage}</div>}
            </div>
          </div>
        )}
        <div className={`font-mono text-6xl font-bold tabular-nums ${running ? 'text-zinc-50' : 'text-ink-400'}`}>
          {formatClock(elapsed)}
        </div>
        <div className="mt-1 text-xs uppercase tracking-widest text-ink-400">{running ? 'reading time' : 'paused'}</div>
      </div>

      {!finishing ? (
        <div className="grid grid-cols-2 gap-3">
          {running ? (
            <button onClick={pause} className="btn-ghost py-4">
              <Pause /> Pause
            </button>
          ) : (
            <button onClick={resume} className="btn-ghost py-4">
              <Play /> Resume
            </button>
          )}
          <button onClick={openFinish} className="btn-primary py-4">
            <Check /> Finish
          </button>
          <button onClick={discard} className="col-span-2 py-2 text-sm text-ink-400">
            Discard
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="end-page">
              Stopped at page
            </label>
            <input
              id="end-page"
              type="number"
              inputMode="numeric"
              min={0}
              className="input"
              value={endPage}
              onChange={(e) => setEndPage(e.target.value)}
              autoFocus
            />
            {timer.startPage != null && toInt(endPage) != null && (
              <p className="mt-1 text-xs text-ink-400">{Math.max(0, (toInt(endPage) ?? 0) - timer.startPage)} pages this session</p>
            )}
          </div>
          {currentBook && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={markFinished} onChange={(e) => setMarkFinished(e.target.checked)} className="accent-brand" />
              I finished this book 🎉
            </label>
          )}
          <div>
            <label className="label">How did it feel?</label>
            <RatingInput value={rating} onChange={setRating} />
          </div>
          <div>
            <label className="label" htmlFor="note">
              Note or takeaway
            </label>
            <textarea
              id="note"
              rows={3}
              className="input"
              placeholder="An idea worth remembering…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setFinishing(false)
                resume()
              }}
              className="btn-ghost"
            >
              Keep reading
            </button>
            <button onClick={save} className="btn-primary" disabled={createSession.isPending}>
              {createSession.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
          <button onClick={discard} className="w-full py-2 text-sm text-ink-400">
            <X size={14} className="mr-1 inline" />
            Discard
          </button>
        </div>
      )}
    </Page>
  )
}
