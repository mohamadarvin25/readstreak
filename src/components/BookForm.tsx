import { useState, type FormEvent } from 'react'
import type { Book, BookStatus } from '../lib/types'
import type { BookInput } from '../hooks/useData'

const STATUSES: { value: BookStatus; label: string }[] = [
  { value: 'reading', label: 'Reading' },
  { value: 'want', label: 'Want to read' },
  { value: 'finished', label: 'Finished' },
]

export function BookForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<Book>
  submitLabel: string
  busy?: boolean
  onSubmit: (input: BookInput) => void
  onCancel?: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [author, setAuthor] = useState(initial?.author ?? '')
  const [pages, setPages] = useState(initial?.total_pages ? String(initial.total_pages) : '')
  const [cover, setCover] = useState(initial?.cover_url ?? '')
  const [status, setStatus] = useState<BookStatus>(initial?.status ?? 'reading')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const changedToFinished = status === 'finished' && initial?.status !== 'finished'
    onSubmit({
      title: title.trim(),
      author: author.trim() || null,
      total_pages: pages ? Number.parseInt(pages, 10) : null,
      cover_url: cover.trim() || null,
      status,
      ...(changedToFinished ? { finished_at: new Date().toISOString() } : {}),
      ...(status !== 'finished' ? { finished_at: null } : {}),
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label" htmlFor="title">
          Title
        </label>
        <input id="title" required className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Atomic Habits" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label" htmlFor="author">
            Author
          </label>
          <input id="author" className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="James Clear" />
        </div>
        <div>
          <label className="label" htmlFor="pages">
            Pages
          </label>
          <input id="pages" type="number" inputMode="numeric" min={1} className="input" value={pages} onChange={(e) => setPages(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="cover">
          Cover image URL (optional)
        </label>
        <input id="cover" type="url" className="input" value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://…" />
      </div>
      <div className="flex gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatus(s.value)}
            className={`flex-1 rounded-xl border px-2 py-2 text-xs font-medium ${
              status === s.value ? 'border-brand bg-brand/15 text-brand' : 'border-ink-600 text-ink-400'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex gap-3 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost flex-1">
            Cancel
          </button>
        )}
        <button className="btn-primary flex-1" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
