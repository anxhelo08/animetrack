-- New feature data is separate from anime_libraries: existing private payloads are untouched.
create table public.anime_feature_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 50),
  kind text not null check (kind in ('smart','saved')),
  rules jsonb not null default '{}' check (jsonb_typeof(rules)='object' and octet_length(rules::text)<2000),
  revision integer not null default 1,
  created_at timestamptz not null default now()
);
create index anime_feature_records_owner_idx on public.anime_feature_records(owner_id);
create table public.anime_calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  options jsonb not null default '{}' check (jsonb_typeof(options)='object' and octet_length(options::text)<2000),
  created_at timestamptz not null default now()
);
create index anime_calendar_feeds_owner_idx on public.anime_calendar_feeds(owner_id);
create table public.anime_shared_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 50),
  items jsonb not null default '[]' check (jsonb_typeof(items)='array' and jsonb_array_length(items)<=150 and octet_length(items::text)<100000),
  revision integer not null default 1,
  created_at timestamptz not null default now()
);
create index anime_shared_lists_owner_idx on public.anime_shared_lists(owner_id);
create table public.anime_list_members (
  list_id uuid not null references public.anime_shared_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  handle text not null check (char_length(handle) between 1 and 40),
  primary key(list_id,user_id)
);
create index anime_list_members_user_idx on public.anime_list_members(user_id);
alter table public.anime_feature_records enable row level security;
alter table public.anime_calendar_feeds enable row level security;
alter table public.anime_shared_lists enable row level security;
alter table public.anime_list_members enable row level security;
-- All access is through the authenticated Edge handler, which checks active sessions and
-- explicit owners/members. Subscription GET exposes only events via an unguessable hash.
revoke all on public.anime_feature_records,public.anime_calendar_feeds,public.anime_shared_lists,public.anime_list_members from public,anon,authenticated;
grant all on public.anime_feature_records,public.anime_calendar_feeds,public.anime_shared_lists,public.anime_list_members to service_role;
