import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useProfile, useUpdateProfile } from './hooks/useData'
import { BottomNav } from './components/BottomNav'
import { SyncStatus } from './components/SyncStatus'
import { Spinner } from './components/ui'
import Login from './pages/Login'
import Home from './pages/Home'
import Record from './pages/Record'
import LogSession from './pages/LogSession'
import Books from './pages/Books'
import BookDetail from './pages/BookDetail'
import Settings from './pages/Settings'

// Stats pulls in the charting library, so load it only when opened.
const Stats = lazy(() => import('./pages/Stats'))

/** Keeps the profile timezone matching this device, so reminders arrive at local time. */
function TimezoneSync() {
  const profile = useProfile()
  const update = useUpdateProfile()
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const current = profile.data?.timezone
  useEffect(() => {
    if (profile.data && current !== tz && !update.isPending) update.mutate({ timezone: tz })
  }, [profile.data, current, tz])
  return null
}

function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  return (
    <>
      <TimezoneSync />
      <SyncStatus />
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
      <BottomNav />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Home />} />
        <Route path="/record" element={<Record />} />
        <Route path="/log/new" element={<LogSession />} />
        <Route path="/books" element={<Books />} />
        <Route path="/books/:id" element={<BookDetail />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
