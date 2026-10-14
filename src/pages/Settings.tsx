import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useBooks, useProfile, useSessions, useUpdateProfile } from '../hooks/useData'
import { ErrorBox, Page, Spinner } from '../components/ui'
import { ReminderSettings } from '../components/ReminderSettings'
import { PasswordSettings } from '../components/PasswordSettings'

export default function Settings() {
  const { session } = useAuth()
  const qc = useQueryClient()
  const profile = useProfile()
  const books = useBooks()
  const sessions = useSessions()
  const update = useUpdateProfile()

  const [name, setName] = useState('')
  const [goal, setGoal] = useState('10')
  const [min, setMin] = useState('2')
  const [identity, setIdentity] = useState('')
  const [intention, setIntention] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const p = profile.data
    if (!p) return
    setName(p.display_name ?? '')
    setGoal(String(p.daily_goal_minutes))
    setMin(String(p.min_minutes))
    setIdentity(p.identity_statement ?? '')
    setIntention(p.intention ?? '')
  }, [profile.data])

  if (profile.isLoading) return <Spinner />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await update.mutateAsync({
      display_name: name.trim() || null,
      daily_goal_minutes: Math.max(1, Number(goal)),
      min_minutes: Math.max(1, Number(min)),
      identity_statement: identity.trim() || null,
      intention: intention.trim() || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const exportData = () => {
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), profile: profile.data, books: books.data, sessions: sessions.data }, null, 2)],
      { type: 'application/json' },
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `readstreak-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    qc.clear()
  }

  return (
    <Page title="You">
      <ErrorBox error={profile.error ?? update.error} />
      <p className="mb-4 text-sm text-ink-400">Signed in as {session?.user.email}</p>

      <form onSubmit={submit} className="space-y-4">
        <section className="card space-y-4 p-4">
          <h2 className="font-semibold">Goals</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="goal">
                Daily goal (min)
              </label>
              <input id="goal" type="number" min={1} inputMode="numeric" className="input" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="min">
                Minimum (min)
              </label>
              <input id="min" type="number" min={1} inputMode="numeric" className="input" value={min} onChange={(e) => setMin(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-ink-400">
            The <b>minimum</b> is the "2-minute rule": read at least this much and the day counts for your streak. The goal is what fills your
            daily ring.
          </p>
        </section>

        <section className="card space-y-4 p-4">
          <h2 className="font-semibold">Habit design</h2>
          <div>
            <label className="label" htmlFor="identity">
              Who you are becoming
            </label>
            <input id="identity" className="input" value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="I am a reader." />
            <p className="mt-1 text-xs text-ink-400">Identity-based habit: shown on your home screen.</p>
          </div>
          <div>
            <label className="label" htmlFor="intention">
              When and where you'll read
            </label>
            <input
              id="intention"
              className="input"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder="After I pour my morning coffee, I read 10 pages at the kitchen table."
            />
            <p className="mt-1 text-xs text-ink-400">Implementation intention / habit stacking: "After I [habit], I will read [where]."</p>
          </div>
          <div>
            <label className="label" htmlFor="name">
              Display name
            </label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </section>

        <button className="btn-primary w-full" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save settings'}
        </button>
      </form>

      <div className="mt-4">
        <ReminderSettings />
      </div>

      <div className="mt-4">
        <PasswordSettings />
      </div>

      <div className="mt-6 space-y-3">
        <button onClick={exportData} className="btn-ghost w-full">
          <Download size={16} /> Export my data (JSON)
        </button>
        <button onClick={signOut} className="btn-danger w-full">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </Page>
  )
}
