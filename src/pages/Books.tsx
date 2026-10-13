import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { lastPageByBook, useBooks, useSaveBook, useSessions } from '../hooks/useData'
import type { BookStatus } from '../lib/types'
import { BookForm } from '../components/BookForm'
import { BookCover, ErrorBox, Page, ProgressBar, Spinner } from '../components/ui'

const TABS: { value: BookStatus; label: string }[] = [
  { value: 'reading', label: 'Reading' },
  { value: 'want', label: 'Want to read' },
  { value: 'finished', label: 'Finished' },
]

export default function Books() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<BookStatus>('reading')
  const adding = params.get('add') === '1'
  const books = useBooks()
  const sessions = useSessions()
  const save = useSaveBook()
  const lastPages = useMemo(() => lastPageByBook(sessions.data ?? []), [sessions.data])

  if (books.isLoading) return <Spinner />

  const shown = (books.data ?? []).filter((b) => b.status === tab)
  const setAdding = (on: boolean) => setParams(on ? { add: '1' } : {}, { replace: true })

  return (
    <Page
      title="Library"
      action={
        !adding && (
          <button onClick={() => setAdding(true)} className="btn-primary px-3 py-1.5 text-sm">
            <Plus size={16} /> Add book
          </button>
        )
      }
    >
      <ErrorBox error={books.error ?? save.error} />

      {adding && (
        <div className="card mb-4 p-4">
          <h2 className="mb-3 font-semibold">Add a book</h2>
          <BookForm
            submitLabel="Add book"
            busy={save.isPending}
            onCancel={() => setAdding(false)}
            onSubmit={async (input) => {
              const book = await save.mutateAsync(input)
              setTab(book.status)
              setAdding(false)
            }}
          />
        </div>
      )}

      <div className="mb-4 flex gap-1 rounded-xl bg-ink-800 p-1">
        {TABS.map((t) => {
          const count = (books.data ?? []).filter((b) => b.status === t.value).length
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${tab === t.value ? 'bg-ink-600 text-zinc-50' : 'text-ink-400'}`}
            >
              {t.label} <span className="text-xs opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {shown.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-400">Nothing here yet.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((b) => {
            const last = lastPages.get(b.id)
            const pct = b.status === 'finished' ? 100 : b.total_pages && last ? (last / b.total_pages) * 100 : 0
            return (
              <Link key={b.id} to={`/books/${b.id}`} className="card flex items-center gap-3 p-3 hover:border-ink-600">
                <BookCover title={b.title} url={b.cover_url} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{b.title}</div>
                  <div className="mb-2 truncate text-sm text-ink-400">{b.author ?? 'Unknown author'}</div>
                  {b.status !== 'want' && (
                    <>
                      <ProgressBar value={pct} />
                      <div className="mt-1 text-xs text-ink-400">
                        {b.status === 'finished'
                          ? 'Finished'
                          : b.total_pages
                            ? `p. ${last ?? 0} of ${b.total_pages} · ${Math.round(pct)}%`
                            : last
                              ? `p. ${last}`
                              : 'Not started'}
                      </div>
                    </>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </Page>
  )
}
