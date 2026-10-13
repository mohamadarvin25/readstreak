import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Book, Profile, ReadingSession } from '../lib/types'
import { useUserId } from './useAuth'

const unwrap = <T,>({ data, error }: { data: T | null; error: { message: string } | null }): T => {
  if (error) throw new Error(error.message)
  return data as T
}

// Profile -------------------------------------------------------------------

export function useProfile() {
  const userId = useUserId()
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => unwrap(await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()) as Profile | null,
  })
}

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

export function useBooks() {
  const userId = useUserId()
  return useQuery({
    queryKey: ['books', userId],
    queryFn: async () =>
      unwrap(await supabase.from('books').select('*').order('created_at', { ascending: false })) as Book[],
  })
}

export type BookInput = Partial<Omit<Book, 'id' | 'user_id' | 'created_at'>> & { title?: string }

export function useSaveBook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...fields }: BookInput & { id?: string }) => {
      const query = id
        ? supabase.from('books').update(fields).eq('id', id)
        : supabase.from('books').insert({ started_at: new Date().toISOString(), ...fields })
      return unwrap(await query.select().single()) as Book
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['books'] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}

export function useDeleteBook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('books').delete().eq('id', id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['books'] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}

// Reading sessions -----------------------------------------------------------

export function useSessions() {
  const userId = useUserId()
  return useQuery({
    queryKey: ['sessions', userId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from('reading_sessions')
          .select('*, book:books(id, title, author, cover_url, total_pages)')
          .order('started_at', { ascending: false }),
      ) as ReadingSession[],
  })
}

export type SessionInput = Pick<
  ReadingSession,
  'book_id' | 'started_at' | 'ended_at' | 'duration_seconds' | 'start_page' | 'end_page' | 'note' | 'rating'
>

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SessionInput) =>
      unwrap(await supabase.from('reading_sessions').insert(input).select().single()) as ReadingSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('reading_sessions').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

/** Furthest page reached in each book, taken from the sessions. */
export function lastPageByBook(sessions: ReadingSession[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const s of sessions) {
    if (!s.book_id || s.end_page == null) continue
    map.set(s.book_id, Math.max(map.get(s.book_id) ?? 0, s.end_page))
  }
  return map
}
