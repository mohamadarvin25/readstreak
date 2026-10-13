import { supabase } from './supabase'

export const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushSupport = 'supported' | 'unsupported' | 'needs-install' | 'not-configured'

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export function pushSupport(): PushSupport {
  if (!vapidPublicKey) return 'not-configured'
  // iPhone only allows web push for apps added to the home screen.
  if (isIOS() && !isStandalone()) return 'needs-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'supported'
}

function urlBase64ToUint8Array(base64: string) {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((base64.length + 3) % 4)
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('The app’s service worker isn’t running. Reminders work in the deployed app, not in dev mode.')), 5000),
  )
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

/** Asks for permission and saves this device's push subscription. */
export async function enablePush(): Promise<void> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them for this site in your browser settings.')
  const reg = await registration()
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!) }))
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    { endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, user_agent: navigator.userAgent },
    { onConflict: 'endpoint' },
  )
  if (error) throw new Error(error.message)
}

/** Removes this device's push subscription. */
export async function disablePush(): Promise<void> {
  const reg = await registration().catch(() => null)
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

/** Shows a notification right away from this device, to check permissions work. */
export async function testNotification(): Promise<void> {
  const reg = await registration()
  await reg.showNotification('🔥 ReadStreak reminders are on', {
    body: 'You’ll get a nudge at your reading time on days you haven’t read yet.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: '/' },
  })
}
