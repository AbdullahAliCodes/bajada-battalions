-- Correction script for the tables already created in Supabase.
-- Run this in the SQL editor, then: npm run seed
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
alter table public.teams
  add column if not exists is_user boolean not null default false,
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

update public.teams
set is_user = true
where id = 'bajada-batallions'
   or lower(name) like '%bajada%';

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------
alter table public.players
  alter column level drop not null,
  alter column base_value drop not null,
  alter column base_value set default 0,
  add column if not exists price integer,
  add column if not exists retained boolean not null default false,
  add column if not exists target_list text,
  add column if not exists target_sort integer,
  add column if not exists updated_at timestamptz not null default now();

alter table public.players
  alter column status set default 'available';

update public.players
set status = 'available'
where status is null or lower(status) = 'available';

update public.players
set base_value = round(level * 10000)
where base_value is null and level is not null;

update public.players
set target_list = case lower(trim(target_tier))
  when 'must buy' then 'must_buy'
  when 'must_buy' then 'must_buy'
  when 'wishlist' then 'wishlist'
  else target_list
end
where target_tier is not null
  and target_list is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'players_target_list_check'
  ) then
    alter table public.players
      add constraint players_target_list_check
      check (target_list in ('must_buy', 'wishlist') or target_list is null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'players_side_check'
  ) then
    alter table public.players
      add constraint players_side_check
      check (side in ('Right', 'Left', 'Unknown') or side is null);
  end if;
end $$;

-- Needed for seed/upsert onConflict: 'name'
create unique index if not exists players_name_key on public.players (name);

create index if not exists players_team_id_idx on public.players (team_id);
create index if not exists players_status_idx on public.players (status);

-- ---------------------------------------------------------------------------
-- formations
-- ---------------------------------------------------------------------------
alter table public.formations
  add column if not exists team_id text references public.teams (id) on delete cascade,
  add column if not exists pair_key text,
  add column if not exists updated_at timestamptz not null default now();

update public.formations
set team_id = 'bajada-batallions'
where team_id is null;

update public.formations
set pair_key = case pair_number
  when 1 then 'pair1'
  when 2 then 'pair2'
  when 3 then 'pair3'
  when 4 then 'pair4'
  when 5 then 'pair5'
  when 6 then 'pair6'
  else pair_key
end
where pair_key is null and pair_number is not null;

update public.formations
set bracket = case lower(bracket)
  when 'upper' then 'upper'
  when 'lower' then 'lower'
  when 'bench' then 'bench'
  else bracket
end
where bracket is not null;

-- If the table is still empty, insert the six Bajada slots so upserts have a target.
insert into public.formations (team_id, pair_number, pair_key, bracket)
select v.team_id, v.pair_number, v.pair_key, v.bracket
from (
  values
    ('bajada-batallions', 1, 'pair1', 'upper'),
    ('bajada-batallions', 2, 'pair2', 'upper'),
    ('bajada-batallions', 3, 'pair3', 'lower'),
    ('bajada-batallions', 4, 'pair4', 'lower'),
    ('bajada-batallions', 5, 'pair5', 'bench'),
    ('bajada-batallions', 6, 'pair6', 'bench')
) as v(team_id, pair_number, pair_key, bracket)
where not exists (
  select 1 from public.formations f
  where f.team_id = v.team_id and f.pair_key = v.pair_key
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'formations_pair_key_check'
  ) then
    alter table public.formations
      add constraint formations_pair_key_check
      check (pair_key in ('pair1', 'pair2', 'pair3', 'pair4', 'pair5', 'pair6'));
  end if;
end $$;

create unique index if not exists formations_team_id_pair_key_key
  on public.formations (team_id, pair_key);

create index if not exists formations_team_id_idx on public.formations (team_id);
