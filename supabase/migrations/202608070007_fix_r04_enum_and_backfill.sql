-- Fix forward-only para 001 — enum sem IF NOT EXISTS direto (PG do teste abortava) e garante tabelas R04 mesmo se 001 falhou
do $$ begin
  perform 1 from pg_enum where enumlabel='event_matches' and enumtypid='public.feature_key'::regtype;
  if not found then alter type public.feature_key add value 'event_matches'; end if;
exception when duplicate_object then null; end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'match_status') then create type public.match_status as enum ('scheduled','live','finalized','void'); end if;
  if not exists (select 1 from pg_type where typname = 'match_public_mode') then create type public.match_public_mode as enum ('private','final_result','live'); end if;
  if not exists (select 1 from pg_type where typname = 'match_event_kind') then create type public.match_event_kind as enum ('goal','own_goal','yellow_card','red_card','substitution','score_adjustment','note'); end if;
end $$;

-- garante tabelas mesmo se 001 abortou (IF NOT EXISTS torna idempotente)
create table if not exists public.event_matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  team_id uuid not null,
  ordinal smallint not null check (ordinal between 1 and 32),
  status public.match_status not null default 'scheduled',
  public_mode public.match_public_mode not null default 'private',
  video_provider text check (video_provider is null or video_provider in ('youtube','vimeo')),
  video_id text check (video_id is null or (char_length(video_id) between 1 and 128 and video_id ~ '^[A-Za-z0-9_-]+$')),
  external_opponent_name text check (external_opponent_name is null or char_length(external_opponent_name) between 1 and 80),
  finalized_at timestamptz,
  finalized_by uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, ordinal),
  unique (event_id, team_id, ordinal),
  foreign key (event_id, team_id) references public.events(id, team_id) on delete cascade,
  check ((finalized_at is null and finalized_by is null) or (finalized_at is not null and finalized_by is not null)),
  check ((video_provider is null and video_id is null) or (video_provider is not null and video_id is not null))
);
create table if not exists public.match_sides (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.event_matches(id) on delete cascade,
  event_id uuid not null,
  team_id uuid not null,
  side_index smallint not null check (side_index in (1,2)),
  label text not null check (char_length(label) between 1 and 60),
  squad_id uuid references public.event_squads(id) on delete set null,
  external_snapshot jsonb,
  created_at timestamptz not null default now(),
  unique (match_id, side_index),
  unique (match_id, team_id, side_index)
);
create table if not exists public.match_participations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.event_matches(id) on delete cascade,
  event_id uuid not null,
  team_id uuid not null,
  athlete_id uuid not null,
  side_id uuid not null references public.match_sides(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (match_id, athlete_id),
  foreign key (athlete_id, team_id) references public.athletes(id, team_id) on delete restrict
);
create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.event_matches(id) on delete cascade,
  event_id uuid not null,
  team_id uuid not null,
  kind public.match_event_kind not null,
  side_id uuid references public.match_sides(id) on delete restrict,
  athlete_id uuid,
  assist_athlete_id uuid,
  minute smallint check (minute is null or minute between 0 and 300),
  delta smallint check (delta is null or delta between -99 and 99),
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (athlete_id, team_id) references public.athletes(id, team_id) on delete restrict,
  foreign key (assist_athlete_id, team_id) references public.athletes(id, team_id) on delete restrict,
  check (assist_athlete_id is null or assist_athlete_id <> athlete_id),
  check ((kind in ('goal','own_goal') and side_id is not null) or (kind not in ('goal','own_goal'))),
  check ((kind = 'score_adjustment' and delta is not null) or (kind <> 'score_adjustment' and delta is null))
);
