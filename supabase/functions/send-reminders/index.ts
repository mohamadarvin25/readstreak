// Supabase Edge Function: sends each reader a push reminder at their chosen time,
// only on days they haven't read yet. Called every 15 minutes by pg_cron (see supabase/reminders-cron.sql).
//
// Secrets (supabase secrets set ...): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { dayKeyInTimeZone, minutesInTimeZone, streakFromDays } from '../_shared/streak-core.ts'
import { isDue, reminderMessage } from '../_shared/reminder.ts'
import { sendWebPush, type VapidKeys } from '../_shared/webpush.ts'

const env = (name: string) => {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing secret ${name}`)
  return v
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== env('CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
  const vapid: VapidKeys = { publicKey: env('VAPID_PUBLIC_KEY'), privateKey: env('VAPID_PRIVATE_KEY'), subject: env('VAPID_SUBJECT') }
  const now = new Date()
  const log: Record<string, string> = {}

  const { data: profiles, error } = await db
    .from('profiles')
    .select('id, timezone, reminder_time, last_reminded_on, min_minutes, intention')
    .eq('reminder_enabled', true)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  for (const p of profiles ?? []) {
    let tz = p.timezone || 'UTC'
    try {
      dayKeyInTimeZone(now, tz)
    } catch {
      tz = 'UTC' // unknown timezone name
    }
    const todayKey = dayKeyInTimeZone(now, tz)
    if (!isDue({ reminderTime: p.reminder_time, localMinutes: minutesInTimeZone(now, tz), todayKey, lastRemindedOn: p.last_reminded_on })) {
      continue
    }
    // Claim today's reminder first so an overlapping run can't send it twice.
    await db.from('profiles').update({ last_reminded_on: todayKey }).eq('id', p.id)

    const since = new Date(now.getTime() - 400 * 86_400_000).toISOString()
    const { data: sessions } = await db
      .from('reading_sessions')
      .select('started_at, duration_seconds')
      .eq('user_id', p.id)
      .gte('started_at', since)
    const byDay = new Map<string, number>()
    for (const s of sessions ?? []) {
      const k = dayKeyInTimeZone(new Date(s.started_at), tz)
      byDay.set(k, (byDay.get(k) ?? 0) + s.duration_seconds)
    }
    const streak = streakFromDays(byDay, todayKey, Math.max(60, p.min_minutes * 60))
    if (streak.readToday) {
      log[p.id] = 'already read today'
      continue
    }

    const payload = JSON.stringify(reminderMessage(streak, p))
    const { data: subs } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', p.id)
    let sent = 0
    for (const sub of subs ?? []) {
      const res = await sendWebPush(sub, payload, vapid)
      if (res.status === 404 || res.status === 410) {
        await db.from('push_subscriptions').delete().eq('id', sub.id)
      } else if (res.ok) {
        sent++
      } else {
        console.error('push failed', res.status, await res.text())
      }
    }
    log[p.id] = `sent to ${sent} device(s)`
  }

  return Response.json({ ok: true, at: now.toISOString(), results: log })
})
