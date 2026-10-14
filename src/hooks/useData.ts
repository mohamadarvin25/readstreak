import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { applyOps, Outbox, type ExecResult, type Op } from '../lib/outbox'
import type { Book, Profile, ReadingSession } from '../lib/types'
import { useUserId } from './useAuth'

type DbError = { message: string; code?: string }

/** supabase-js reports a failed fetch (no connection) as an error without a code. */
export function isNetworkError(e: unknown): boolean {
  if (!e) return false
  const err = e as DbError
  return !err.code && /fetch|network|load failed|offline/i.test(err.message ?? String(e))
}

const OFFLINE_MESSAGE = 'You’re offline. Try again when you’re connected.'

const unwrap = <T,>({ data, error }: { data: T | null; error: DbError | null }): T => {
  if (error) throw new Error(isNetworkError(error) ? OFFLINE_MESSAGE : error.message)
  return data as T
}

/** Query errors caused by being offline aren't shown: cached data is shown instead. */
const visibleError = (e: Error | null) => (e && e.message !== OFFLINE_MESSAGE && !isNetworkError(e) ? e : null)

// Offline queue ---------------------------------------------------------------

async function execute(op: Op): Promise<ExecResult> {
  const table = supabase.from(op.table)
  const { error } =
    op.kind === 'insert'
      ? // Upsert with ignoreDuplicates makes a retried insert harmless.
        await table.upsert(op.row, { onConflict: 'id', ignoreDuplicates: true })
      : op.kind === 'update'
        ? await table.update(op.fields).eq('id', op.id)
        : await table.delete().eq('id', op.id)
  if (!error) return { ok: true }
  return { ok: false, network: isNetworkError(error), message: error.message }
}

const outboxes = new Map<string, Outbox>()

export function getOutbox(userId: string): Outbox {
  let box = outboxes.get(userId)
  if (!box) {
    box = new Outbox(`readstreak.outbox.${userId}`, execute, typeof window !== 'undefined' ? window.localStorage : null)
    outboxes.set(userId, box)
  }
  return box
}

export function useOutbox(userId: string) {
  const box = getOutbox(userId)
  return useSyncExternalStore(box.subscribe, box.getSnapshot)
}

/** Sends queued changes now. Synced changes go straight into the cache, so nothing flickers. */
export async function syncNow(userId: string, qc: QueryClient) {
  const synced = await getOutbox(userId).flush((op) => {
    qc.setQueryData<{ id: string }[]>([op.table === 'books' ? 'books' : 'sessions', userId], (old) =>
      old ? applyOps(old, [op], op.table, false) : old,
    )
  })
  if (synced > 0) {
    qc.invalidateQueries({ queryKey: ['books', userId] })
    qc.invalidateQueries({ queryKey: ['sessions', userId] })
  }
}

const newId = () => crypto.randomUUID()

/** A write that is queued instead of sent, so it works offline and resolves instantly. */
function useQueuedWrite<A, R>(write: (box: Outbox, args: A, userId: string) => R) {
  const userId = useUserId()
  const qc = useQueryClient()
  const run = useCallback(
    (args: A) => {
      const result = write(getOutbox(userId), args, userId)
      void syncNow(userId, qc)
      return result
    },
    [write, userId, qc],
  )
  return {
    mutate: (args: A) => void run(args),
    mutateAsync: async (args: A) => run(args),
    // Queued writes never wait on the network; sync problems show in the sync banner.
    isPending: false,
    error: null as Error | null,
  }
}

// Profile -------------------------------------------------------------------

export function useProfile() {
  const userId = useUserId()
  const query = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => unwrap(await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()) as Profile | null,
  })
  return { data: query.data, isLoading: query.isLoading, error: visibleError(query.error) }
}

/** Profile changes are rare, so they need a connection rather than going through the queue. */
export function useUpdateProfile() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Omit<Profile, 'id'>>) =>
      unwrap(await supabase.from('profiles').upsert({ id: userId, ...patch }).select().single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}

// Books ---------------------------------------------------------------------

const byNewest = (a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at)

export function useBooks() {
  const userId = useUserId()
  const query = useQuery({
    queryKey: ['books', userId],
    queryFn: async () => unwrap(await supabase.from('books').select('*').order('created_at', { ascending: false })) as Book[],
  })
  const { ops } = useOutbox(userId)
  const data = useMemo(() => applyOps(query.data ?? [], ops, 'books', true).sort(byNewest), [query.data, ops])
  return { data, isLoading: query.isLoading, error: visibleError(query.error) }
}

export type BookInput = Partial<Omit<Book, 'id' | 'user_id' | 'created_at' | 'pending'>> & { title?: string }

function saveBook(box: Outbox, { id, ...fields }: BookInput & { id?: string }, userId: string): Book {
  if (id) {
    box.add({ opId: newId(), kind: 'update', table: 'books', id, fields })
    return { id, ...fields } as Book
  }
  const now = new Date().toISOString()
  const row: Book = {
    id: newId(),
    user_id: userId,
    title: '',
    author: null,
    total_pages: null,
    cover_url: null,
    status: 'reading',
    started_at: now,
    finished_at: null,
    created_at: now,
    ...fields,
  }
  box.add({ opId: newId(), kind: 'insert', table: 'books', row: { ...row } })
  return row
}

/** Creates a book, or updates one when `id` is given. Resolves with the new book on create. */
export const useSaveBook = () => useQueuedWrite(saveBook)

const deleteRow = (table: Op['table']) => (box: Outbox, id: string) => box.add({ opId: newId(), kind: 'delete', table, id })
const deleteBook = deleteRow('books')
export const useDeleteBook = () => useQueuedWrite(deleteBook)

// Reading sessions -----------------------------------------------------------

const pagesRead = (s: Pick<ReadingSession, 'start_page' | 'end_page'>) =>
  s.start_page != null && s.end_page != null && s.end_page >= s.start_page ? s.end_page - s.start_page : 0

export function useSessions() {
  const userId = useUserId()
  const books = useBooks()
  const query = useQuery({
    queryKey: ['sessions', userId],
    queryFn: async () =>
      unwrap(await supabase.from('reading_sessions').select('*').order('started_at', { ascending: false })) as ReadingSession[],
  })
  const { ops } = useOutbox(userId)
  const data = useMemo(() => {
    const bookById = new Map(books.data.map((b) => [b.id, b]))
    return applyOps(query.data ?? [], ops, 'reading_sessions', true)
      .map((s) => {
        const book = s.book_id ? bookById.get(s.book_id) : undefined
        return {
          ...s,
          // Generated by Postgres; worked out locally for sessions that haven't synced yet.
          pages_read: s.pages_read ?? pagesRead(s),
          book: book ? { id: book.id, title: book.title, author: book.author, cover_url: book.cover_url, total_pages: book.total_pages } : null,
        }
      })
      .sort((a, b) => b.started_at.localeCompare(a.started_at))
  }, [query.data, ops, books.data])
  return { data, isLoading: query.isLoading || books.isLoading, error: visibleError(query.error) }
}

export type SessionInput = Pick<
  ReadingSession,
  'book_id' | 'started_at' | 'ended_at' | 'duration_seconds' | 'start_page' | 'end_page' | 'note' | 'rating'
>

function createSession(box: Outbox, input: SessionInput, userId: string): ReadingSession {
  const row = { id: newId(), user_id: userId, created_at: new Date().toISOString(), ...input }
  box.add({ opId: newId(), kind: 'insert', table: 'reading_sessions', row })
  return { ...row, pages_read: pagesRead(row), pending: true }
}

/** Saves a session instantly, online or offline. */
export const useCreateSession = () => useQueuedWrite(createSession)

const deleteSession = deleteRow('reading_sessions')
export const useDeleteSession = () => useQueuedWrite(deleteSession)

/** Furthest page reached in each book, taken from the sessions. */
export function lastPageByBook(sessions: ReadingSession[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const s of sessions) {
    if (!s.book_id || s.end_page == null) continue
    map.set(s.book_id, Math.max(map.get(s.book_id) ?? 0, s.end_page))
  }
  return map
}
