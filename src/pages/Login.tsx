import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { BookOpen, Mail } from 'lucide-react'
import { isConfigured, supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ErrorBox } from '../components/ui'

export default function Login() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand shadow-lg shadow-brand/30">
          <BookOpen size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">ReadStreak</h1>
        <p className="mt-2 text-ink-400">Every page you read is a vote for the person you want to become.</p>
      </div>

      {!isConfigured ? (
        <div className="card p-4 text-sm text-zinc-300">
          <p className="mb-2 font-semibold text-brand">Supabase isn't configured yet</p>
          <p>
            Copy <code className="text-brand-light">.env.example</code> to <code className="text-brand-light">.env</code>, fill in your
            Supabase URL and anon key, then restart <code>npm run dev</code>. See README.md for the steps.
          </p>
        </div>
      ) : sent ? (
        <div className="card p-5 text-center">
          <Mail className="mx-auto mb-2 text-brand" />
          <p className="font-semibold">Check your email</p>
          <p className="mt-1 text-sm text-ink-400">We sent a sign-in link to {email}. Open it on this device.</p>
          <button className="mt-4 text-sm text-brand" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {error && <ErrorBox error={error} />}
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}
    </div>
  )
}
