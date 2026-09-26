-- AnimeTrack 10.9 Web Push: apply only with the coordinated Production release.
-- No subscription is created without a user gesture and authenticated RLS.
create table if not exists public.anime_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  endpoint text not null check (char_length(endpoint) between 25 and 1024 and endpoint ~ '^https://'),
  p256dh text not null check (char_length(p256dh) between 32 and 200),
  auth_key text not null check (char_length(auth_key) between 8 and 120),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id,endpoint)
);
create index if not exists anime_push_subscriptions_user_idx on public.anime_push_subscriptions(user_id);
alter table public.anime_push_subscriptions enable row level security;
revoke all on public.anime_push_subscriptions from anon, public;
grant select,insert,update,delete on public.anime_push_subscriptions to authenticated;
create policy "push subscriptions: own read" on public.anime_push_subscriptions for select to authenticated using (user_id=(select auth.uid()));
create policy "push subscriptions: own insert" on public.anime_push_subscriptions for insert to authenticated with check (user_id=(select auth.uid()));
create policy "push subscriptions: own update" on public.anime_push_subscriptions for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "push subscriptions: own delete" on public.anime_push_subscriptions for delete to authenticated using (user_id=(select auth.uid()));

create table if not exists public.anime_push_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  event_key text not null check (char_length(event_key) between 3 and 180),
  anime_id text not null check (char_length(anime_id) between 1 and 90),
  season_id text not null check (char_length(season_id) <= 90),
  episode integer not null check (episode between 1 and 10000),
  title text not null check (char_length(title) between 1 and 140),
  air_at timestamptz not null,
  notify_at timestamptz not null,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id,event_key),
  check (notify_at<=air_at),
  check (notify_at>=air_at-interval '1 day')
);
create index if not exists anime_push_reminders_due_idx on public.anime_push_reminders(notify_at) where sent_at is null;
create index if not exists anime_push_reminders_user_idx on public.anime_push_reminders(user_id);
alter table public.anime_push_reminders enable row level security;
revoke all on public.anime_push_reminders from anon,public;
grant select,insert,update,delete on public.anime_push_reminders to authenticated;
create policy "push reminders: own read" on public.anime_push_reminders for select to authenticated using (user_id=(select auth.uid()));
create policy "push reminders: own insert" on public.anime_push_reminders for insert to authenticated with check (user_id=(select auth.uid()));
create policy "push reminders: own update" on public.anime_push_reminders for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "push reminders: own delete" on public.anime_push_reminders for delete to authenticated using (user_id=(select auth.uid()));
