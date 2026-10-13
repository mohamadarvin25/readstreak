import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, BookOpen, Home, Play, Settings } from 'lucide-react'
import { hasActiveTimer } from '../lib/timer'

const item = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-brand' : 'text-ink-400'}`

export function BottomNav() {
  useLocation() // re-render on navigation so the "Reading…" indicator stays current
  const recording = hasActiveTimer()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-700 bg-ink-900/95 pb-safe backdrop-blur">
      <div className="mx-auto flex max-w-lg items-end">
        <NavLink to="/" end className={item}>
          <Home size={22} />
          Home
        </NavLink>
        <NavLink to="/books" className={item}>
          <BookOpen size={22} />
          Library
        </NavLink>
        <NavLink to="/record" className="flex flex-1 flex-col items-center pb-1.5">
          <span className="relative -mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30">
            <Play size={24} className="ml-0.5 fill-white" />
            {recording && <span className="absolute right-0.5 top-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-ink-900 bg-red-500" />}
          </span>
          <span className="mt-0.5 text-[11px] text-ink-400">{recording ? 'Reading…' : 'Read'}</span>
        </NavLink>
        <NavLink to="/stats" className={item}>
          <BarChart3 size={22} />
          Stats
        </NavLink>
        <NavLink to="/settings" className={item}>
          <Settings size={22} />
          You
        </NavLink>
      </div>
    </nav>
  )
}
