import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { BookOpen, Eye, EyeOff } from 'lucide-react'
import { isConfigured, supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ErrorBox } from '../components/ui'

type Mode = 'signin' | 'signup'

/** Turns Supabase auth errors into plain sentences. */
function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.'
  if (/already registered|already exists/i.test(message)) return 'That email already has an account. Sign in instead.'
  if (/email not confirmed/i.test(message)) return 'Confirm your email first: check your inbox for the confirmation link.'
  if (/rate limit/i.test(message)) return 'Too many attempts. Wait a few minutes and try again.'
  return message
}

export default function Login() {
  const { session } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  if (session) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(friendly(error.message))
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) setError(friendly(error.message))
      // No session means the project still requires email confirmation.
      else if (!data.session) setInfo(`Account created. Check ${email} for a confirmation link, then sign in.`)
    }
    setBusy(false)
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setInfo(null)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="mb-8 text-center">
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
            Supabase URL and publishable key, then restart <code>npm run dev</code>. See README.md for the steps.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex gap-1 rounded-xl bg-ink-800 p-1">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium ${mode === m ? 'bg-ink-600 text-zinc-50' : 'text-ink-400'}`}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {error && <ErrorBox error={error} />}
            {info && <div className="card border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{info}</div>}
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="input pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-400"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode === 'signup' && <p className="mt-1 text-xs text-ink-400">At least 6 characters.</p>}
            </div>
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
