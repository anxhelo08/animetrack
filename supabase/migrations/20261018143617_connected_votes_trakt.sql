create table public.anime_list_votes (
 list_id uuid not null references public.anime_shared_lists(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 item_key text not null check(char_length(item_key) between 1 and 150),
 primary key(list_id,user_id)
);
create index anime_list_votes_user_idx on public.anime_list_votes(user_id);
create table public.anime_trakt_connections (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 encrypted text not null check(octet_length(encrypted)<20000),
 revision integer not null default 1,
 updated_at timestamptz not null default now()
);
create table public.anime_trakt_plans (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<100000),
 status text not null default 'pending' check(status in ('pending','running','done')),
 expires_at timestamptz not null
);
create index anime_trakt_plans_owner_idx on public.anime_trakt_plans(owner_id);
alter table public.anime_list_votes enable row level security;
alter table public.anime_trakt_connections enable row level security;
alter table public.anime_trakt_plans enable row level security;
revoke all on public.anime_list_votes,public.anime_trakt_connections,public.anime_trakt_plans from public,anon,authenticated;
grant all on public.anime_list_votes,public.anime_trakt_connections,public.anime_trakt_plans to service_role;
