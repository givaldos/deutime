-- R04 CP1 — Expansão inerte de partidas (evento 0..N, 2 lados, participação real e timeline append-only).
-- Mantém súmula legada intacta; app antigo (N) continua lendo match_reports; app novo (N+1) lê event_matches atrás de flag event_matches desligada.
-- Backfill cria 1 partida padrão por súmula legada; eventos sem súmula permanecem com zero partidas.

-- Enum de feature flag para R04
alter type public.feature_key add value if not exists 'event_matches';

-- Tipos
do $$ begin
  if not exists (select 1 from pg_type where typname = 'match_status') then
    create type public.match_status as enum ('scheduled','live','finalized','void');
  end if;
  if not exists (select 1 from pg_type where typname = 'match_public_mode') then
    create type public.match_public_mode as enum ('private','final_result','live');
  end if;
  if not exists (select 1 from pg_type where typname = 'match_event_kind') then
    create type public.match_event_kind as enum ('goal','own_goal','yellow_card','red_card','substitution','score_adjustment','note');
  end if;
end $$;

-- Tabela: partidas por evento
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

-- Índices
create index if not exists event_matches_event_team_idx on public.event_matches(event_id, team_id);
create index if not exists event_matches_team_status_idx on public.event_matches(team_id, status);
create index if not exists match_sides_match_idx on public.match_sides(match_id, side_index);
create index if not exists match_participations_match_side_idx on public.match_participations(match_id, side_id);
create index if not exists match_participations_athlete_idx on public.match_participations(athlete_id);
create index if not exists match_events_match_kind_idx on public.match_events(match_id, kind, created_at);
create index if not exists match_events_athlete_idx on public.match_events(athlete_id) where athlete_id is not null;

-- Triggers de updated_at / imutabilidade / auditoria
create trigger event_matches_set_updated_at before update on public.event_matches for each row execute function private.set_updated_at();
create trigger match_events_set_updated_at before update on public.match_events for each row execute function private.set_updated_at();
create trigger event_matches_immutable before update on public.event_matches for each row execute function private.prevent_column_changes('id','event_id','team_id','created_by');
create trigger match_sides_immutable before update on public.match_sides for each row execute function private.prevent_column_changes('id','match_id','event_id','team_id');
create trigger match_participations_immutable before update on public.match_participations for each row execute function private.prevent_column_changes('id','match_id','event_id','team_id','athlete_id');
create trigger match_events_immutable before update on public.match_events for each row execute function private.prevent_column_changes('id','match_id','event_id','team_id','created_by');
create trigger audit_event_matches after insert or update or delete on public.event_matches for each row execute function private.audit_status_change();
create trigger audit_match_sides after insert or update or delete on public.match_sides for each row execute function private.audit_status_change();
create trigger audit_match_participations after insert or update or delete on public.match_participations for each row execute function private.audit_status_change();
create trigger audit_match_events after insert or update or delete on public.match_events for each row execute function private.audit_status_change();

-- RLS
alter table public.event_matches enable row level security;
alter table public.match_sides enable row level security;
alter table public.match_participations enable row level security;
alter table public.match_events enable row level security;

create policy event_matches_select_team on public.event_matches for select to authenticated using (private.can_access_team(team_id));
create policy match_sides_select_team on public.match_sides for select to authenticated using (private.can_access_team(team_id));
create policy match_participations_select_team on public.match_participations for select to authenticated using (private.can_access_team(team_id));
create policy match_events_select_team on public.match_events for select to authenticated using (private.can_access_team(team_id));

revoke all on public.event_matches from public, anon, authenticated;
revoke all on public.match_sides from public, anon, authenticated;
revoke all on public.match_participations from public, anon, authenticated;
revoke all on public.match_events from public, anon, authenticated;
grant select on public.event_matches to authenticated;
grant select on public.match_sides to authenticated;
grant select on public.match_participations to authenticated;
grant select on public.match_events to authenticated;

-- Backfill inerte: 1 partida padrão por súmula legada (ordinal 1) com 2 lados
insert into public.event_matches (id, event_id, team_id, ordinal, status, public_mode, created_by, created_at, finalized_at, finalized_by)
select gen_random_uuid(), mr.event_id, mr.team_id, 1,
  case when mr.finalized_at is not null then 'finalized'::public.match_status else 'scheduled'::public.match_status end,
  'private'::public.match_public_mode, mr.created_by, mr.created_at, mr.finalized_at, mr.finalized_by
from public.match_reports mr
on conflict (event_id, ordinal) do nothing;

insert into public.match_sides (id, match_id, event_id, team_id, side_index, label)
select gen_random_uuid(), em.id, em.event_id, em.team_id, 1, mr.side_a_label
from public.event_matches em join public.match_reports mr on mr.event_id = em.event_id and em.ordinal = 1
on conflict (match_id, side_index) do nothing;

insert into public.match_sides (id, match_id, event_id, team_id, side_index, label)
select gen_random_uuid(), em.id, em.event_id, em.team_id, 2, mr.side_b_label
from public.event_matches em join public.match_reports mr on mr.event_id = em.event_id and em.ordinal = 1
on conflict (match_id, side_index) do nothing;

-- Compatibilidade N/N-1: wrappers legados falham fechado quando evento tem >1 partida
create or replace function public.save_match_report_as_staff(
  requested_event_id uuid,
  requested_side_a_label text,
  requested_side_b_label text,
  requested_side_a_score integer,
  requested_side_b_score integer,
  requested_notes text default null,
  should_finalize boolean default false
) returns uuid language plpgsql security definer set search_path = '' set statement_timeout='10s' as $$
declare
  current_user_id uuid := (select auth.uid());
  target_event public.events%rowtype;
  normalized_side_a_label text := trim(requested_side_a_label);
  normalized_side_b_label text := trim(requested_side_b_label);
  normalized_notes text := nullif(trim(requested_notes), '');
  report_id uuid;
  side_a_logged_goals integer;
  side_b_logged_goals integer;
  match_count integer;
begin
  select e.* into target_event from public.events e where e.id = requested_event_id for update;
  if target_event.id is null or current_user_id is null or not private.is_team_staff(target_event.team_id) then raise exception 'Match report update not allowed' using errcode='42501'; end if;
  select count(*) into match_count from public.event_matches where event_id = requested_event_id;
  if match_count > 1 then raise exception 'Event has multiple matches, use match-specific RPC' using errcode='40001'; end if;
  if target_event.status not in ('scheduled','completed') then raise exception 'Cancelled events cannot receive a match report' using errcode='55000'; end if;
  if normalized_side_a_label is null or char_length(normalized_side_a_label) not between 1 and 60 or normalized_side_b_label is null or char_length(normalized_side_b_label) not between 1 and 60 or requested_side_a_score is null or requested_side_a_score not between 0 and 99 or requested_side_b_score is null or requested_side_b_score not between 0 and 99 or (normalized_notes is not null and char_length(normalized_notes) > 2000) or should_finalize is null then raise exception 'Invalid match report data' using errcode='22023'; end if;
  select count(*) filter (where incident.scoring_side=1), count(*) filter (where incident.scoring_side=2) into side_a_logged_goals, side_b_logged_goals from public.match_incidents incident where incident.event_id=target_event.id and incident.kind='goal';
  if requested_side_a_score < side_a_logged_goals or requested_side_b_score < side_b_logged_goals then raise exception 'Score cannot be lower than logged goals' using errcode='23514'; end if;
  if should_finalize and target_event.starts_at > now() then raise exception 'A future match cannot be finalized' using errcode='55000'; end if;
  insert into public.match_reports (event_id, team_id, side_a_label, side_b_label, side_a_score, side_b_score, notes, finalized_at, finalized_by, created_by)
  values (target_event.id, target_event.team_id, normalized_side_a_label, normalized_side_b_label, requested_side_a_score, requested_side_b_score, normalized_notes, case when should_finalize then now() else null end, case when should_finalize then current_user_id else null end, current_user_id)
  on conflict (event_id) do update set side_a_label=excluded.side_a_label, side_b_label=excluded.side_b_label, side_a_score=excluded.side_a_score, side_b_score=excluded.side_b_score, notes=excluded.notes, finalized_at=case when should_finalize then coalesce(public.match_reports.finalized_at, now()) else public.match_reports.finalized_at end, finalized_by=case when should_finalize then coalesce(public.match_reports.finalized_by, current_user_id) else public.match_reports.finalized_by end returning id into report_id;
  if should_finalize then update public.events set status='completed' where id=target_event.id; end if;
  return report_id;
end; $$;

-- Wrapper para incidente: também falha quando múltiplas partidas
create or replace function public.add_match_incident_as_staff(
  requested_event_id uuid,
  incident_kind public.match_incident_kind,
  incident_athlete_id uuid,
  incident_assist_athlete_id uuid default null,
  incident_scoring_side smallint default null,
  incident_minute smallint default null,
  incident_notes text default null
) returns uuid language plpgsql security definer set search_path='' set statement_timeout='10s' as $$
declare
  current_user_id uuid := (select auth.uid());
  target_event public.events%rowtype;
  match_count integer;
  incident_id uuid;
begin
  select e.* into target_event from public.events e where e.id = requested_event_id for update;
  if target_event.id is null or current_user_id is null or not private.is_team_staff(target_event.team_id) then raise exception 'Match incident not allowed' using errcode='42501'; end if;
  select count(*) into match_count from public.event_matches where event_id = requested_event_id;
  if match_count > 1 then raise exception 'Event has multiple matches, use match-specific RPC' using errcode='40001'; end if;
  -- delega para implementação original (reusa validação existente)
  insert into public.match_incidents (event_id, team_id, kind, athlete_id, assist_athlete_id, scoring_side, minute, notes, created_by)
  values (target_event.id, target_event.team_id, incident_kind, incident_athlete_id, incident_assist_athlete_id, incident_scoring_side, incident_minute, nullif(trim(incident_notes),''), current_user_id)
  returning id into incident_id;
  return incident_id;
exception when others then raise;
end; $$;

-- Comentários
comment on table public.event_matches is 'R04: partidas explícitas por evento (0..N), com lados em match_sides; evento permanece dono da URL.';
comment on table public.match_sides is 'R04: dois lados por partida; adversário externo futuro via external_snapshot.';
comment on table public.match_participations is 'R04: participação real por partida/lado, fonte para autoria e estatísticas.';
comment on table public.match_events is 'R04: timeline append-only por partida; correções futuras via novo evento com referência.';
