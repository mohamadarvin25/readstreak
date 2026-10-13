import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { useProfile, useUpdateProfile } from '../hooks/useData'
import { disablePush, enablePush, pushSupport, testNotification } from '../lib/push'

const SUPPORT_MESSAGE = {
  'not-configured': 'Reminders aren’t set up yet. Add VITE_VAPID_PUBLIC_KEY and deploy the reminder function (see README).',
  'needs-install': 'On iPhone, first add ReadStreak to your Home Screen (Share → Add to Home Screen), then open it from there.',
  unsupported: 'This browser doesn’t support notifications.',
} as const

export function ReminderSettings() {
  const profile = useProfile()
  const update = useUpdateProfile()
  const support = pushSupport()
  const enabled = profile.data?.reminder_enabled ?? false
  const [time, setTime] = useState('20:00')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (profile.data?.reminder_time) setTime(profile.data.reminder_time.slice(0, 5))
  }, [profile.data?.reminder_time])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const toggle = () =>
    run(async () => {
      if (enabled) {
        await disablePush()
        await update.mutateAsync({ reminder_enabled: false })
      } else {
        await enablePush()
        await update.mutateAsync({ reminder_enabled: true, reminder_time: time, timezone })
        setNote('Reminders on. You’ll get one at your reading time on days you haven’t read.')
      }
    })

  return (
    <section className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Daily reminder</h2>
          <p className="text-xs text-ink-400">Only sent on days you haven’t read yet.</p>
        </div>
        {support === 'supported' && (
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Daily reminder"
            disabled={busy}
            onClick={toggle}
            className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${enabled ? 'bg-brand' : 'bg-ink-600'}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${enabled ? 'left-6' : 'left-1'}`} />
          </button>
        )}
      </div>

      {support !== 'supported' ? (
        <p className="flex gap-2 rounded-xl bg-ink-700/60 p-3 text-xs text-ink-400">
          <BellOff size={16} className="shrink-0" />
          {SUPPORT_MESSAGE[support]}
        </p>
      ) : (
        <>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="label" htmlFor="reminder-time">
                Remind me at
              </label>
              <input
                id="reminder-time"
                type="time"
                className="input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                onBlur={() => enabled && time && update.mutate({ reminder_time: time, timezone })}
              />
            </div>
            {enabled && (
              <button type="button" className="btn-ghost" disabled={busy} onClick={() => run(testNotification)}>
                <Bell size={16} /> Test
              </button>
            )}
          </div>
          <p className="text-xs text-ink-400">Uses your timezone: {timezone}. Turn it on separately on each device you want reminders on.</p>
        </>
      )}
      {note && <p className="text-xs text-emerald-300">{note}</p>}
      {error && <p className="text-xs text-red-300">{error}</p>}
    </section>
  )
}
