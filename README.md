# ReadStreak

Strava for reading. Log every reading session, keep your daily streak alive, and watch the chain grow. Built around ideas from *Atomic Habits*:

| Atomic Habits idea | In the app |
|---|---|
| Make it obvious | Your plan ("After dinner, I read on the sofa") is shown on the home screen, and a daily reminder arrives at your reading time |
| Make it easy (2-minute rule) | A day counts for your streak once you reach a small **minimum** (default 2 min) |
| Make it satisfying | Live timer, daily goal ring, streak flame, a celebration after every session, personal records, badges, and a heatmap to fill in |
| Identity-based habits | "I am a reader." sits above your stats |
| Never miss twice | Streak freezes cover a missed day, and a warning appears when you missed yesterday |
| Track the habit | Strava-style activity feed: time, pages, and pace for each session |

Stack: Vite + React + TypeScript + Tailwind, Supabase (login and Postgres), and PWA support so you can install it on your phone.

## 1. Set up Supabase (one time, about 5 minutes)

1. Create a free account at <https://supabase.com> and click **New project**.
2. In the project, open **SQL Editor → New query**. Paste in all of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
3. Open **Project Settings → API** and copy the **Project URL** and the **publishable** key (`sb_publishable_...`). The older **anon public** key also works; put it in `VITE_SUPABASE_ANON_KEY` instead.
4. In this folder, copy `.env.example` to `.env` and fill in both values:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
5. Open **Authentication → URL Configuration**. Set **Site URL** to `http://localhost:5173` for now. Add your deployed URL later (step 3).

6. Open **Authentication → Sign In / Providers → Email** and turn off **Confirm email**, then Save. Otherwise every new account must click a confirmation link in an email before it can sign in.

The publishable key is safe to ship in the frontend. Row-level security in `schema.sql` makes sure each user can only read and write their own rows.

## 2. Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for streaks, freezes, records, badges, reminders, push encryption
npm run build      # production build in dist/
```

Tap **Create account** and sign up with your email and a password, then sign in with them. You can change your password later under **You → Password**.

## 3. Put it on your phone

Installing a PWA needs HTTPS, so deploy the app (free):

1. Push this folder to a GitHub repo, e.g. `readstreak`.
2. On <https://vercel.com>, go to **Add New → Project** and import the repo. `vercel.json` already sets the build, so leave the defaults.
3. Before clicking **Deploy**, open **Environment Variables** and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Vite builds these into the bundle. If you add or change them later, you must **Redeploy**.
4. In Supabase, open **Authentication → URL Configuration**. Set **Site URL** to the deployed URL (e.g. `https://readstreak.vercel.app`) and add it under **Redirect URLs**. Without this, the magic link sends you to localhost.
5. Open the URL on your phone and add it to your home screen:
   - **Android (Chrome):** menu → **Install app**
   - **iPhone (Safari):** Share → **Add to Home Screen**

`vercel.json` and `public/_redirects` are already included. They let a page refresh on a link like `/books` work on Vercel and Netlify instead of returning 404.

## 4. Turn on daily reminders (optional, about 10 minutes)

Reminders are sent by a small Supabase Edge Function that runs every 15 minutes. It only messages you on days you haven't read yet. You only need to do this once, from this folder on your computer.

1. Create the keys that sign your notifications:
   ```bash
   npx web-push generate-vapid-keys
   ```
   Keep the **Public Key** and **Private Key** it prints. Also make up a long random password for the scheduler, e.g. from <https://1password.com/password-generator>. This is your **cron secret**.
2. Add the public key to the app. Put `VITE_VAPID_PUBLIC_KEY=<Public Key>` in `.env`, and also in Vercel's **Environment Variables**, then **Redeploy**.
3. Deploy the function. The project ref is the `xxxx` in `https://xxxx.supabase.co`:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase secrets set VAPID_PUBLIC_KEY=<Public Key> VAPID_PRIVATE_KEY=<Private Key> VAPID_SUBJECT=mailto:<your email> CRON_SECRET=<cron secret>
   npx supabase functions deploy send-reminders --no-verify-jwt
   ```
   `--no-verify-jwt` is fine: the function rejects any call that doesn't carry your cron secret. If the deploy complains about Docker, add `--use-api` to the deploy command.
4. Schedule it. Open [`supabase/reminders-cron.sql`](supabase/reminders-cron.sql), replace `YOUR-PROJECT-REF` and `YOUR-CRON-SECRET`, then run it in the **SQL Editor**.
5. If you set up Supabase before reminders existed, run [`supabase/schema.sql`](supabase/schema.sql) again. It only adds what's missing.
6. In the deployed app, open **You → Daily reminder**, turn it on, pick a time, and tap **Test**.

Notes:
- **iPhone:** reminders only work once ReadStreak is added to the Home Screen and opened from there (iOS 16.4 or later).
- **Each device:** turn reminders on separately on each device that should get them.
- **Checking it ran:** in Supabase, **Edge Functions → send-reminders → Logs** shows each run.

## How it works

- **Timer:** the timer stores its start and pause timestamps in `localStorage` and works out elapsed time from them. Locking your phone, switching apps, or refreshing doesn't lose a session.
- **Streak:** a day counts when you've read at least your minimum that day, in your local time. Today never breaks your streak before it's over.
- **Streak freeze:** every 7 days in a row earns a freeze, and you can bank up to 2. A freeze automatically covers a missed day so the streak survives. Frozen days show in blue on the heatmap.
- **Personal records:** longest session, most pages in a session, and best day, week and month, like Strava PRs. Beating one shows on the celebration screen.
- **Heatmap:** shades each day by minutes read. Gray means no reading, light orange means some reading but under the minimum, medium orange means the minimum was met, and full orange means the daily goal was met.
- **Your data:** stored in your Supabase project. Use **You → Export my data** to download a JSON backup.

## Project layout

```
supabase/schema.sql      tables, row-level security, profile trigger (safe to re-run)
supabase/functions/      send-reminders Edge Function, plus _shared/ code also used by the app
supabase/reminders-cron.sql  schedules the reminder function every 15 minutes
src/lib/                 streak, stats, badges, timer logic (pure and unit-tested)
src/hooks/               auth context and React Query data hooks
src/pages/               Home, Record, LogSession, Books, BookDetail, Stats, Settings, Login
src/components/          GoalRing, Heatmap, SessionCard, BadgeGrid, BookForm, BottomNav, ui
```

## Ideas for later

- Book search with covers (Open Library API)
- Share a session as an image card
