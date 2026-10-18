-- Run this in the Supabase SQL editor before `npm run seed`.
-- Open tables for this private auction desk. Lock RLS down if you add auth later.

create table if not exists public.teams (
  id text primary key,
  name text not null,
  is_user boolean not null default false,
  spent integer not null default 0,
  remaining_budget integer not null,
  spots_left integer not null,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  level numeric,
  side text not null default 'Unknown' check (side in ('Right', 'Left', 'Unknown')),
  status text not null default 'available' check (status in ('available', 'Acquired', 'Lost')),
  team_id text references public.teams (id) on delete set null,
  price integer,
  retained boolean not null default false,
  target_list text check (target_list in ('must_buy', 'wishlist') or target_list is null),
  target_sort integer,
  updated_at timestamptz not null default now()
);

create table if not exists public.formations (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams (id) on delete cascade,
  pair_key text not null check (pair_key in ('pair1', 'pair2', 'pair3', 'pair4', 'pair5', 'pair6')),
  bracket text not null check (bracket in ('upper', 'lower', 'bench')),
  right_player_id uuid references public.players (id) on delete set null,
  left_player_id uuid references public.players (id) on delete set null,
  unique (team_id, pair_key)
);

create index if not exists players_team_id_idx on public.players (team_id);
create index if not exists players_status_idx on public.players (status);
create index if not exists formations_team_id_idx on public.formations (team_id);

alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.formations enable row level security;

drop policy if exists "teams_all" on public.teams;
drop policy if exists "players_all" on public.players;
drop policy if exists "formations_all" on public.formations;

create policy "teams_all" on public.teams for all using (true) with check (true);
create policy "players_all" on public.players for all using (true) with check (true);
create policy "formations_all" on public.formations for all using (true) with check (true);
