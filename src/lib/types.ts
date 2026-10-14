export type BookStatus = 'want' | 'reading' | 'finished'

export interface Profile {
  id: string
  display_name: string | null
  daily_goal_minutes: number
  min_minutes: number
  identity_statement: string | null
  intention: string | null
  timezone: string | null
  reminder_enabled: boolean
  /** "HH:MM:SS" local time. */
  reminder_time: string
}

export interface Book {
  id: string
  user_id: string
  title: string
  author: string | null
  total_pages: number | null
  cover_url: string | null
  status: BookStatus
  started_at: string | null
  finished_at: string | null
  created_at: string
  /** Created on this device and not synced yet. */
  pending?: boolean
}

export interface ReadingSession {
  id: string
  user_id: string
  book_id: string | null
  started_at: string
  ended_at: string
  duration_seconds: number
  start_page: number | null
  end_page: number | null
  pages_read: number
  note: string | null
  rating: number | null
  created_at: string
  book?: Pick<Book, 'id' | 'title' | 'author' | 'cover_url' | 'total_pages'> | null
  /** Saved on this device and not synced yet. */
  pending?: boolean
}

/** Minimal shape the pure stats/streak helpers need, so they are easy to test. */
export type SessionLike = Pick<ReadingSession, 'started_at' | 'duration_seconds' | 'pages_read'>
