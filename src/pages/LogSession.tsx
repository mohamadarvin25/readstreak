import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { lastPageByBook, useBooks, useCreateSession, useProfile, useSessions } from '../hooks/useData'
import { buildCelebration } from '../lib/celebrate'
import { ErrorBox, Page, RatingInput, Spinner } from '../components/ui'

const toInt = (v: string) => (v.trim() === '' ? null : Number.parseInt(v, 10))

export default function LogSession() {
  const navigate = useNavigate()
  const books = useBooks()
  const sessions = useSessions()
  const profile = useProfile()
  const create = useCreateSession()
  const lastPages = useMemo(() => lastPageByBook(sessions.data ?? []), [sessions.data])

  const [bookId, setBookId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState(format(new Date(), 'HH:mm'))
  const [minutes, setMinutes] = useState('20')
  const [startPage, setStartPage] = useState('')
  const [endPage, setEndPage] = useState('')
  const [note, setNote] = useState('')
  const [rating, setRating] = useState<number | null>(null)

  useEffect(() => {
    if (!bookId) return
    const last = lastPages.get(bookId)
    setStartPage(last != null ? String(last) : '')
  }, [bookId, lastPages])

  if (books.isLoading) return <Spinner />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const mins = Number(minutes)
    const startedAt = new Date(`${date}T${time}`)
    const endedAt = new Date(startedAt.getTime() + mins * 60_000)
    const saved = await create.mutateAsync({
      book_id: bookId || null,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_seconds: Math.round(mins * 60),
      start_page: toInt(startPage),
      end_page: toInt(endPage),
      note: note.trim() || null,
      rating,
    })
    const celebration = buildCelebration({
      sessionsBefore: sessions.data ?? [],
      session: saved,
      booksBefore: books.data ?? [],
      booksAfter: books.data ?? [],
      minMinutes: profile.data?.min_minutes ?? 2,
      goalMinutes: profile.data?.daily_goal_minutes ?? 10,
    })
    navigate('/', { state: { celebration } })
  }

  return (
    <Page title="Log a session" back>
      <ErrorBox error={create.error} />
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="book">
            Book
          </label>
          <select id="book" className="input" value={bookId} onChange={(e) => setBookId(e.target.value)}>
            <option value="">No book</option>
            {books.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="date">
              Date
            </label>
            <input id="date" type="date" required className="input" max={format(new Date(), 'yyyy-MM-dd')} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="time">
              Start time
            </label>
            <input id="time" type="time" required className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="minutes">
            Minutes read
          </label>
          <input
            id="minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            required
            className="input"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="sp">
              From page
            </label>
            <input id="sp" type="number" inputMode="numeric" min={0} className="input" value={startPage} onChange={(e) => setStartPage(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ep">
              To page
            </label>
            <input id="ep" type="number" inputMode="numeric" min={0} className="input" value={endPage} onChange={(e) => setEndPage(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">How did it feel?</label>
          <RatingInput value={rating} onChange={setRating} />
        </div>
        <div>
          <label className="label" htmlFor="note">
            Note or takeaway
          </label>
          <textarea id="note" rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button className="btn-primary w-full py-3" disabled={create.isPending}>
          {create.isPending ? 'Saving…' : 'Save session'}
        </button>
      </form>
    </Page>
  )
}
