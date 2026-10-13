import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Loader2, Star } from 'lucide-react'

export function Page({ title, back, action, children }: { title: string; back?: boolean; action?: ReactNode; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-lg px-4 pt-safe pb-28">
      <header className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-2 bg-ink-900/90 px-4 py-3 backdrop-blur">
        {back && (
          <button onClick={() => navigate(-1)} className="-ml-2 rounded-lg p-1.5 hover:bg-ink-700" aria-label="Back">
            <ChevronLeft size={22} />
          </button>
        )}
        <h1 className="flex-1 truncate text-xl font-bold">{title}</h1>
        {action}
      </header>
      {children}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16 text-ink-400">
      <Loader2 className="animate-spin" />
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <div className="card mb-4 border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
      {error instanceof Error ? error.message : String(error)}
    </div>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className="text-lg font-semibold leading-tight">{value}</div>
      {sub && <div className="text-xs text-ink-400">{sub}</div>}
    </div>
  )
}

export function RatingInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className="p-1"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star size={26} className={value && n <= value ? 'fill-brand text-brand' : 'text-ink-600'} />
        </button>
      ))}
    </div>
  )
}

export function BookCover({ title, url, size = 'md' }: { title: string; url?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'h-12 w-9 text-xs', md: 'h-20 w-14 text-sm', lg: 'h-36 w-24 text-lg' }[size]
  if (url) return <img src={url} alt="" className={`${dims} shrink-0 rounded-md object-cover shadow`} />
  // Pick a stable color per title so each book's placeholder cover looks different.
  const hue = [...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
  const initials = title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return (
    <div
      className={`${dims} flex shrink-0 items-center justify-center rounded-md font-bold text-white/90 shadow`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 60% 28%))` }}
    >
      {initials}
    </div>
  )
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-600">
      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}
