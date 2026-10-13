import { BookOpen, Clock, Flame, Sparkles, Trophy } from 'lucide-react'
import type { BadgeIcon } from '../lib/badges'
import { evaluateBadges } from '../lib/badges'

const ICONS: Record<BadgeIcon, typeof Flame> = { spark: Sparkles, flame: Flame, book: BookOpen, clock: Clock, trophy: Trophy }

export function BadgeGrid({ badges }: { badges: ReturnType<typeof evaluateBadges> }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {badges.map((b) => {
        const Icon = ICONS[b.icon]
        return (
          <div key={b.id} className={`flex flex-col items-center text-center ${b.isEarned ? '' : 'opacity-35 grayscale'}`}>
            <div
              className={`mb-1.5 flex h-14 w-14 items-center justify-center rounded-full ${
                b.isEarned ? 'bg-gradient-to-br from-brand-light to-brand-dark text-white shadow-lg shadow-brand/20' : 'bg-ink-700 text-ink-400'
              }`}
            >
              <Icon size={24} />
            </div>
            <div className="text-xs font-semibold leading-tight">{b.title}</div>
            <div className="text-[10px] leading-tight text-ink-400">{b.description}</div>
          </div>
        )
      })}
    </div>
  )
}
