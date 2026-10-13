import { createECDH, randomBytes } from 'node:crypto'
// @ts-expect-error untyped CommonJS module (dependency of web-push), used here as an independent reference
import ece from 'http_ece'
// @ts-expect-error untyped CommonJS module
import webpush from 'web-push'
import { describe, expect, it } from 'vitest'
import { b64urlDecode, b64urlEncode, encryptPayload, vapidAuthorization } from '../../supabase/functions/_shared/webpush.ts'
import { isDue, reminderMessage } from '../../supabase/functions/_shared/reminder.ts'
import { dayKeyInTimeZone, minutesInTimeZone, streakFromDays } from '../../supabase/functions/_shared/streak-core.ts'

describe('web push encryption', () => {
  it('produces a message the reference implementation can decrypt', async () => {
    const subscriber = createECDH('prime256v1')
    subscriber.generateKeys()
    const authSecret = randomBytes(16)
    const message = JSON.stringify({ title: "🔥 Don't break your 9-day streak", body: 'After dinner, I read on the sofa.' })

    const body = await encryptPayload(new TextEncoder().encode(message), {
      p256dh: b64urlEncode(subscriber.getPublicKey()),
      auth: b64urlEncode(authSecret),
    })
    const decrypted = ece.decrypt(Buffer.from(body), { version: 'aes128gcm', privateKey: subscriber, authSecret })
    expect(decrypted.toString('utf8')).toBe(message)
  })

  it('signs a valid VAPID token for the push service origin', async () => {
    const keys = webpush.generateVAPIDKeys()
    const header = await vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', {
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      subject: 'mailto:test@example.com',
    })
    const [, token, k] = header.match(/^vapid t=([^,]+), k=(.+)$/)!
    expect(k).toBe(keys.publicKey)

    const [h, c, sig] = token.split('.')
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(c)))
    expect(claims.aud).toBe('https://fcm.googleapis.com')
    expect(claims.sub).toBe('mailto:test@example.com')

    const pub = await crypto.subtle.importKey('raw', b64urlDecode(keys.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, b64urlDecode(sig), new TextEncoder().encode(`${h}.${c}`))
    expect(ok).toBe(true)
  })
})

describe('reminder scheduling', () => {
  it('is due inside the window after the chosen time, once per day', () => {
    const base = { reminderTime: '20:00:00', todayKey: '2026-10-13', lastRemindedOn: '2026-10-12' }
    expect(isDue({ ...base, localMinutes: 19 * 60 + 59 })).toBe(false)
    expect(isDue({ ...base, localMinutes: 20 * 60 })).toBe(true)
    expect(isDue({ ...base, localMinutes: 21 * 60 + 30 })).toBe(true)
    expect(isDue({ ...base, localMinutes: 22 * 60 })).toBe(false)
    expect(isDue({ ...base, localMinutes: 20 * 60 + 15, lastRemindedOn: '2026-10-13' })).toBe(false)
  })

  it('uses the reader timezone for local day and time', () => {
    const instant = new Date('2026-10-13T13:30:00Z') // 20:30 in Jakarta (UTC+7)
    expect(dayKeyInTimeZone(instant, 'Asia/Jakarta')).toBe('2026-10-13')
    expect(minutesInTimeZone(instant, 'Asia/Jakarta')).toBe(20 * 60 + 30)
    expect(dayKeyInTimeZone(new Date('2026-10-13T18:00:00Z'), 'Asia/Jakarta')).toBe('2026-10-14')
  })

  it('mentions the streak when there is one to protect', () => {
    const days = new Map([
      ['2026-10-11', 600],
      ['2026-10-12', 600],
    ])
    const msg = reminderMessage(streakFromDays(days, '2026-10-13', 120), { min_minutes: 2, intention: null })
    expect(msg.title).toContain('2-day streak')
    expect(msg.url).toBe('/record')
  })

  it('encourages a fresh start when there is no streak', () => {
    const msg = reminderMessage(streakFromDays(new Map(), '2026-10-13', 120), { min_minutes: 2, intention: null })
    expect(msg.body).toContain('starts a new streak')
  })
})
