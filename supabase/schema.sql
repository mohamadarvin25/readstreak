-- ReadStreak schema. Run this in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again after pulling updates: it only adds what is missing.

-- Profiles ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  daily_goal_minutes int not null default 10 check (daily_goal_minutes > 0),
  min_minutes int not null default 2 check (min_minutes > 0),
  identity_statement text default 'I am a reader.',
  intention text,
  timezone text default 'UTC',
  created_at timestamptz not null default now()
);

-- Books ---------------------------------------------------------------------
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  author text,
  total_pages int check (total_pages is null or total_pages > 0),
  cover_url text,
  status text not null default 'reading' check (status in ('want', 'reading', 'finished')),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists books_user_idx on public.books (user_id);

-- Reading sessions ----------------------------------------------------------
create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  book_id uuid references public.books (id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds int not null check (duration_seconds >= 0),
  start_page int,
  end_page int,
  pages_read int generated always as (
    case when start_page is not null and end_page is not null and end_page >= start_page
      then end_page - start_page else 0 end
  ) stored,
  note text,
  rating int check (rating is null or rating between 1 and 5),
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_started_idx on public.reading_sessions (user_id, started_at desc);
create index if not exists sessions_book_idx on public.reading_sessions (book_id);

-- Daily reminders -------------------------------------------------------------
alter table public.profiles add column if not exists reminder_enabled boolean not null default false;
alter table public.profiles add column if not exists reminder_time time not null default '20:00';
-- Local date of the last reminder, so each reader gets at most one per day.
alter table public.profiles add column if not exists last_reminded_on date;

-- One row per device that allowed notifications.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Row level security: each user only sees their own rows ---------------------
alter table public.push_subscriptions enable row level security;
drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.reading_sessions enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own books" on public.books;
create policy "own books" on public.books
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own sessions" on public.reading_sessions;
create policy "own sessions" on public.reading_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Auto-create a profile when someone signs up --------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
