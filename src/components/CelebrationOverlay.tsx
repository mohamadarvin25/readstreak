import { useMemo } from 'react'
import { BookOpen, Clock, Flame, Medal, Snowflake, Sparkles, Target, Trophy } from 'lucide-react'
import type { BadgeIcon } from '../lib/badges'
import type { Celebration } from '../lib/celebrate'

const BADGE_ICONS: Record<BadgeIcon, typeof Flame> = { spark: Sparkles, flame: Flame, book: BookOpen, clock: Clock, trophy: Trophy }
const CONFETTI_COLORS = ['#fc5200', '#ff7a3d', '#fbbf24', '#f4f4f5', '#38bdf8']

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.4,
        rotate: Math.random() * 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        wide: i % 3 === 0,
      })),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.wide ? 10 : 6,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}

function Row({ icon: Icon, tone = 'brand', title, sub }: { icon: typeof Flame; tone?: 'brand' | 'sky' | 'emerald' | 'amber'; title: string; sub?: string }) {
  const tones = {
    brand: 'bg-brand/15 text-brand',
    sky: 'bg-sky-400/15 text-sky-300',
    emerald: 'bg-emerald-400/15 text-emerald-300',
    amber: 'bg-amber-400/15 text-amber-300',
  }
  return (
    <li className="celebrate-pop flex items-center gap-3 rounded-xl bg-ink-700/60 p-3 text-left">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        {sub && <span className="block text-xs text-ink-400">{sub}</span>}
      </span>
    </li>
  )
}

export function CelebrationOverlay({ celebration: c, onClose }: { celebration: Celebration; onClose: () => void }) {
  const headline = c.streakExtended ? `Day ${c.streak}` : `+${c.minutes} min`
  const subline = c.streakExtended
    ? c.streak === 1
      ? 'A new streak starts today.'
      : `${c.streak} days in a row. Keep the chain going.`
    : `${c.minutes} minutes${c.pages ? ` · ${c.pages} pages` : ''} logged.`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm" role="dialog" aria-modal aria-label="Session saved">
      <Confetti />
      <div className="celebrate-pop relative w-full max-w-sm rounded-3xl border border-ink-600 bg-ink-800 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-light to-brand-dark shadow-lg shadow-brand/40">
          <Flame size={44} className="fill-white text-white" />
        </div>
        <h2 className="text-4xl font-extrabold tracking-tight">{headline}</h2>
        <p className="mt-1 text-sm text-ink-400">{subline}</p>

        <ul className="mt-5 space-y-2">
          {c.streakExtended && (
            <Row icon={Clock} title={`${c.minutes} min${c.pages ? ` · ${c.pages} pages` : ''}`} sub="This session" />
          )}
          {c.goalMet && <Row icon={Target} tone="emerald" title="Daily goal reached" sub="Your ring is full today" />}
          {c.bookFinished && <Row icon={Trophy} tone="amber" title="Book finished!" sub={c.bookFinished} />}
          {c.newRecords.map((r) => (
            <Row key={r.label} icon={Medal} tone="amber" title={`New record: ${r.label}`} sub={r.display} />
          ))}
          {c.newBadges.map((b) => (
            <Row key={b.title} icon={BADGE_ICONS[b.icon]} title={`Badge unlocked: ${b.title}`} />
          ))}
          {c.freezeEarned && <Row icon={Snowflake} tone="sky" title="Streak freeze earned" sub="It covers you on a day you miss" />}
        </ul>

        <p className="mt-5 text-xs italic text-ink-400">Every page is a vote for the reader you're becoming.</p>
        <button onClick={onClose} className="btn-primary mt-4 w-full py-3" autoFocus>
          Keep it up
        </button>
      </div>
    </div>
  )
}
