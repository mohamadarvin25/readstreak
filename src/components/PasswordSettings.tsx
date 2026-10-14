import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export function PasswordSettings() {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setMessage({ ok: false, text: error.message })
    else {
      setPassword('')
      setMessage({ ok: true, text: 'Password updated.' })
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <h2 className="font-semibold">Password</h2>
      <div className="flex gap-3">
        <input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="New password (6+ characters)"
          className="input flex-1"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="New password"
        />
        <button className="btn-ghost shrink-0" disabled={busy}>
          {busy ? 'Saving…' : 'Change'}
        </button>
      </div>
      {message && <p className={`text-xs ${message.ok ? 'text-emerald-300' : 'text-red-300'}`}>{message.text}</p>}
    </form>
  )
}
