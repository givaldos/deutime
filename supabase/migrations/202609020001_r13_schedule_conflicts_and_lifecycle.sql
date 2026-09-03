-- R13 / WP-R13-04 — conflitos privados, decisão manual e ciclo da agenda.
-- Toda expansão permanece inerte enquanto professional_scheduling estiver desligada.

create type public.professional_schedule_state as enum (
  'scheduled', 'pending_review', 'date_tbd', 'postponed'
);

create type public.event_schedule_conflict_kind as enum (
  'internal_team_overlap',
  'exclusive_venue_overlap',
  'short_interval',
  'travel_buffer',
  'athlete_overlap'
);

create type public.event_schedule_conflict_severity as enum ('hard', 'warning');
create type public.event_schedule_conflict_status as enum (
  'pending', 'accepted', 'resolved'
);

alter table public.venues
  add column is_exclusive boolean not null default false;

alter table public.event_squads
  add column source_internal_team_id uuid,
  add constraint event_squads_source_internal_team_fk
    foreign key (source_internal_team_id, team_id)
    references public.team_squad_presets(id, team_id) on delete restrict;

with unique_matches as (
  select squad.id, min(preset.id::text)::uuid as preset_id
  from public.event_squads squad
  join public.team_squad_presets preset
    on preset.team_id = squad.team_id
    and lower(btrim(preset.name)) = lower(btrim(squad.name))
    and coalesce(lower(preset.color), '') = coalesce(lower(squad.color), '')
  group by squad.id
  having count(*) = 1
)
update public.event_squads squad
set source_internal_team_id = unique_matches.preset_id
from unique_matches
where unique_matches.id = squad.id;

alter table public.events
  add column professional_schedule_state public.professional_schedule_state
    not null default 'scheduled',
  add column schedule_confirmed_version bigint not null default 1;

update public.events
set schedule_confirmed_version = schedule_version;

alter table public.events
  add constraint events_schedule_confirmed_version_check check (
    schedule_confirmed_version > 0
    and schedule_confirmed_version <= schedule_version
  );

create table public.event_schedule_conflicts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null,
  other_event_id uuid not null,
  kind public.event_schedule_conflict_kind not null,
  severity public.event_schedule_conflict_severity not null,
  status public.event_schedule_conflict_status not null default 'pending',
  detected_schedule_version bigint not null check (detected_schedule_version > 0),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  accepted_by uuid references auth.users(id) on delete restrict,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, other_event_id, kind, detected_schedule_version),
  foreign key (event_id, team_id)
    references public.events(id, team_id) on delete cascade,
  foreign key (other_event_id, team_id)
    references public.events(id, team_id) on delete cascade,
  check (event_id <> other_event_id),
  check (
    (status = 'accepted' and accepted_by is not null and accepted_at is not null)
    or (status <> 'accepted' and accepted_by is null and accepted_at is null)
  )
);

create index event_schedule_conflicts_pending_idx
  on public.event_schedule_conflicts(team_id, status, severity, created_at)
  where status = 'pending';

create table private.event_schedule_commands (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  request_id uuid not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  kind text not null check (kind in ('resolve_conflict', 'transition_schedule')),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  result jsonb,
  created_at timestamptz not null default now(),
  unique (team_id, request_id)
);

create table public.event_schedule_decisions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  command_id uuid not null references private.event_schedule_commands(id)
    on delete restrict,
  event_id uuid not null,
  conflict_id uuid references public.event_schedule_conflicts(id)
    on delete restrict,
  decision text not null check (decision in (
    'confirm_warning', 'accept_exception', 'date_tbd', 'postpone', 'cancel'
  )),
  scope text not null default 'single_event' check (
    scope in ('single_event', 'this_and_future')
  ),
  schedule_version bigint not null check (schedule_version > 0),
  justification text check (
    justification is null
    or char_length(btrim(justification)) between 3 and 500
  ),
  actor_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (event_id, team_id)
    references public.events(id, team_id) on delete restrict,
  unique (event_id, schedule_version, decision, conflict_id)
);

alter table public.event_schedule_conflicts enable row level security;
alter table public.event_schedule_decisions enable row level security;

create policy event_schedule_conflicts_select_staff
  on public.event_schedule_conflicts for select to authenticated
  using (private.is_team_staff(team_id));

create policy event_schedule_decisions_select_staff
  on public.event_schedule_decisions for select to authenticated
  using (private.is_team_staff(team_id));

revoke all on public.event_schedule_conflicts from anon, authenticated;
revoke all on public.event_schedule_decisions from anon, authenticated;
revoke all on private.event_schedule_commands from public, anon, authenticated;
grant select on public.event_schedule_conflicts to authenticated;
grant select on public.event_schedule_decisions to authenticated;

create trigger event_schedule_conflicts_set_updated_at
  before update on public.event_schedule_conflicts
  for each row execute function private.set_updated_at();

create trigger event_schedule_conflicts_immutable
  before update on public.event_schedule_conflicts
  for each row execute function private.prevent_column_changes(
    'id', 'team_id', 'event_id', 'other_event_id', 'kind',
    'severity', 'detected_schedule_version', 'details', 'created_at'
  );

create trigger event_schedule_decisions_immutable
  before update on public.event_schedule_decisions
  for each row execute function private.prevent_column_changes(
    'id', 'team_id', 'command_id', 'event_id', 'conflict_id', 'decision',
    'scope', 'schedule_version', 'justification', 'actor_id', 'created_at'
  );

create or replace function private.events_share_internal_team(
  requested_event_id uuid,
  other_event_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_squads requested_squad
    join public.event_squads other_squad
      on other_squad.source_internal_team_id = requested_squad.source_internal_team_id
      and other_squad.team_id = requested_squad.team_id
    where requested_squad.event_id = requested_event_id
      and other_squad.event_id = other_event_id
      and requested_squad.source_internal_team_id is not null
  );
$$;

create or replace function private.refresh_event_schedule_conflicts(
  requested_team_id uuid,
  requested_event_id uuid
)
returns table (pending_count integer, hard_count integer, warning_count integer)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '8s'
as $$
declare
  target_event public.events%rowtype;
begin
  select event.* into target_event
  from public.events event
  where event.id = requested_event_id and event.team_id = requested_team_id
  for update;

  if target_event.id is null then
    raise exception 'Evento não encontrado' using errcode = 'P0002';
  end if;

  update public.event_schedule_conflicts conflict
  set status = 'resolved', accepted_by = null, accepted_at = null
  where conflict.event_id = target_event.id
    and conflict.status = 'pending';

  if target_event.status <> 'scheduled'
    or target_event.professional_schedule_state in ('date_tbd', 'postponed')
  then
    return query select 0, 0, 0;
    return;
  end if;

  insert into public.event_schedule_conflicts (
    team_id, event_id, other_event_id, kind, severity,
    detected_schedule_version, details
  )
  select target_event.team_id, target_event.id, other_event.id,
    'internal_team_overlap', 'hard', target_event.schedule_version,
    jsonb_build_object('other_schedule_version', other_event.schedule_version)
  from public.events other_event
  where other_event.team_id = target_event.team_id
    and other_event.id <> target_event.id
    and other_event.status = 'scheduled'
    and other_event.professional_schedule_state in ('scheduled', 'pending_review')
    and target_event.starts_at < other_event.ends_at
    and other_event.starts_at < target_event.ends_at
    and private.events_share_internal_team(target_event.id, other_event.id)
  on conflict (event_id, other_event_id, kind, detected_schedule_version)
  do update set status = case
      when event_schedule_conflicts.status = 'accepted' then 'accepted'::public.event_schedule_conflict_status
      else 'pending'::public.event_schedule_conflict_status
    end,
    accepted_by = case
      when event_schedule_conflicts.status = 'accepted'
        then event_schedule_conflicts.accepted_by else null end,
    accepted_at = case
      when event_schedule_conflicts.status = 'accepted'
        then event_schedule_conflicts.accepted_at else null end;

  insert into public.event_schedule_conflicts (
    team_id, event_id, other_event_id, kind, severity,
    detected_schedule_version, details
  )
  select target_event.team_id, target_event.id, other_event.id,
    'exclusive_venue_overlap', 'hard', target_event.schedule_version,
    jsonb_build_object('venue_id', target_event.venue_id)
  from public.events other_event
  join public.venues venue
    on venue.id = target_event.venue_id
    and venue.team_id = target_event.team_id
    and venue.is_exclusive
  where other_event.team_id = target_event.team_id
    and other_event.id <> target_event.id
    and other_event.venue_id = target_event.venue_id
    and other_event.status = 'scheduled'
    and other_event.professional_schedule_state in ('scheduled', 'pending_review')
    and target_event.starts_at < other_event.ends_at
    and other_event.starts_at < target_event.ends_at
  on conflict (event_id, other_event_id, kind, detected_schedule_version)
  do update set status = case
      when event_schedule_conflicts.status = 'accepted' then 'accepted'::public.event_schedule_conflict_status
      else 'pending'::public.event_schedule_conflict_status
    end,
    accepted_by = case
      when event_schedule_conflicts.status = 'accepted'
        then event_schedule_conflicts.accepted_by else null end,
    accepted_at = case
      when event_schedule_conflicts.status = 'accepted'
        then event_schedule_conflicts.accepted_at else null end;

  insert into public.event_schedule_conflicts (
    team_id, event_id, other_event_id, kind, severity,
    detected_schedule_version, details
  )
  select target_event.team_id, target_event.id, other_event.id,
    'short_interval', 'warning', target_event.schedule_version,
    jsonb_build_object(
      'gap_minutes', case
        when other_event.ends_at <= target_event.starts_at then
          floor(extract(epoch from target_event.starts_at - other_event.ends_at) / 60)
        else floor(extract(epoch from other_event.starts_at - target_event.ends_at) / 60)
      end
    )
  from public.events other_event
  where other_event.team_id = target_event.team_id
    and other_event.id <> target_event.id
    and other_event.status = 'scheduled'
    and other_event.professional_schedule_state in ('scheduled', 'pending_review')
    and (
      (other_event.ends_at <= target_event.starts_at
        and target_event.starts_at - other_event.ends_at < interval '60 minutes')
      or (target_event.ends_at <= other_event.starts_at
        and other_event.starts_at - target_event.ends_at < interval '60 minutes')
    )
    and private.events_share_internal_team(target_event.id, other_event.id)
  on conflict (event_id, other_event_id, kind, detected_schedule_version)
  do update set status = case
      when event_schedule_conflicts.status = 'accepted' then 'accepted'::public.event_schedule_conflict_status
      else 'pending'::public.event_schedule_conflict_status
    end,
    accepted_by = case when event_schedule_conflicts.status = 'accepted'
      then event_schedule_conflicts.accepted_by else null end,
    accepted_at = case when event_schedule_conflicts.status = 'accepted'
      then event_schedule_conflicts.accepted_at else null end;

  insert into public.event_schedule_conflicts (
    team_id, event_id, other_event_id, kind, severity,
    detected_schedule_version, details
  )
  select target_event.team_id, target_event.id, other_event.id,
    'travel_buffer', 'warning', target_event.schedule_version,
    jsonb_build_object(
      'gap_minutes', case
        when other_event.ends_at <= target_event.starts_at then
          floor(extract(epoch from target_event.starts_at - other_event.ends_at) / 60)
        else floor(extract(epoch from other_event.starts_at - target_event.ends_at) / 60)
      end
    )
  from public.events other_event
  where other_event.team_id = target_event.team_id
    and other_event.id <> target_event.id
    and target_event.venue_id is not null
    and other_event.venue_id is not null
    and other_event.venue_id <> target_event.venue_id
    and other_event.status = 'scheduled'
    and other_event.professional_schedule_state in ('scheduled', 'pending_review')
    and (
      (other_event.ends_at <= target_event.starts_at
        and target_event.starts_at - other_event.ends_at < interval '90 minutes')
      or (target_event.ends_at <= other_event.starts_at
        and other_event.starts_at - target_event.ends_at < interval '90 minutes')
    )
    and private.events_share_internal_team(target_event.id, other_event.id)
  on conflict (event_id, other_event_id, kind, detected_schedule_version)
  do update set status = case
      when event_schedule_conflicts.status = 'accepted' then 'accepted'::public.event_schedule_conflict_status
      else 'pending'::public.event_schedule_conflict_status
    end,
    accepted_by = case when event_schedule_conflicts.status = 'accepted'
      then event_schedule_conflicts.accepted_by else null end,
    accepted_at = case when event_schedule_conflicts.status = 'accepted'
      then event_schedule_conflicts.accepted_at else null end;

  insert into public.event_schedule_conflicts (
    team_id, event_id, other_event_id, kind, severity,
    detected_schedule_version, details
  )
  select target_event.team_id, target_event.id, other_event.id,
    'athlete_overlap', 'warning', target_event.schedule_version,
    jsonb_build_object('athlete_count', count(distinct target_attendance.athlete_id))
  from public.events other_event
  join public.event_attendance target_attendance
    on target_attendance.event_id = target_event.id
    and target_attendance.team_id = target_event.team_id
    and target_attendance.status = 'confirmed'
  join public.event_attendance other_attendance
    on other_attendance.event_id = other_event.id
    and other_attendance.team_id = target_attendance.team_id
    and other_attendance.athlete_id = target_attendance.athlete_id
    and other_attendance.status = 'confirmed'
  where other_event.team_id = target_event.team_id
    and other_event.id <> target_event.id
    and other_event.status = 'scheduled'
    and other_event.professional_schedule_state in ('scheduled', 'pending_review')
    and target_event.starts_at < other_event.ends_at
    and other_event.starts_at < target_event.ends_at
  group by other_event.id
  on conflict (event_id, other_event_id, kind, detected_schedule_version)
  do update set status = case
      when event_schedule_conflicts.status = 'accepted' then 'accepted'::public.event_schedule_conflict_status
      else 'pending'::public.event_schedule_conflict_status
    end,
    accepted_by = case when event_schedule_conflicts.status = 'accepted'
      then event_schedule_conflicts.accepted_by else null end,
    accepted_at = case when event_schedule_conflicts.status = 'accepted'
      then event_schedule_conflicts.accepted_at else null end;

  select count(*)::integer,
    count(*) filter (where conflict.severity = 'hard')::integer,
    count(*) filter (where conflict.severity = 'warning')::integer
  into pending_count, hard_count, warning_count
  from public.event_schedule_conflicts conflict
  where conflict.event_id = target_event.id
    and conflict.detected_schedule_version = target_event.schedule_version
    and conflict.status = 'pending';

  update public.events event
  set professional_schedule_state = case
        when pending_count > 0 then 'pending_review'::public.professional_schedule_state
        else 'scheduled'::public.professional_schedule_state
      end,
      schedule_confirmed_version = case
        when pending_count = 0 then event.schedule_version
        else event.schedule_confirmed_version
      end
  where event.id = target_event.id and event.team_id = target_event.team_id;

  if pending_count = 0 then
    update public.championship_fixtures fixture
    set status = 'scheduled', updated_at = now()
    from public.event_matches match
    where match.event_id = target_event.id
      and match.team_id = target_event.team_id
      and fixture.match_id = match.id
      and fixture.team_id = match.team_id
      and fixture.status = 'draft';
  end if;

  return query select pending_count, hard_count, warning_count;
end;
$$;

create or replace function private.enqueue_event_schedule_change(
  requested_event_id uuid,
  requested_by uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event public.events%rowtype;
  inserted_count integer := 0;
begin
  select event.* into target_event
  from public.events event
  where event.id = requested_event_id;

  if target_event.id is null
    or target_event.status not in ('scheduled', 'cancelled')
    or target_event.professional_schedule_state = 'pending_review'
    or not private.is_team_feature_enabled(
      target_event.team_id, 'professional_scheduling'
    )
    or not private.is_team_feature_enabled(
      target_event.team_id, 'whatsapp_delivery'
    )
    or not public.is_runtime_control_enabled('integration_produce')
  then
    return 0;
  end if;

  insert into public.notification_outbox (
    team_id, event_id, athlete_id, channel, template_key, template_version,
    intent_version, requested_by, recipient, payload, dedupe_key
  )
  select target_event.team_id, target_event.id, athlete.id, 'whatsapp',
    'event_schedule_change', 'v1', target_event.schedule_version,
    requested_by, athlete_private.phone_e164,
    jsonb_build_object(
      'event_public_id', target_event.public_id,
      'event_title', target_event.title,
      'event_starts_at', target_event.starts_at,
      'schedule_state', case when target_event.status = 'cancelled'
        then 'cancelled' else target_event.professional_schedule_state::text end,
      'schedule_version', target_event.schedule_version
    ),
    concat_ws(':', 'whatsapp', 'schedule-change', target_event.team_id,
      target_event.id, athlete.id, target_event.schedule_version)
  from public.event_attendance attendance
  join public.athletes athlete
    on athlete.id = attendance.athlete_id
    and athlete.team_id = attendance.team_id
    and athlete.status = 'active'
  join public.athlete_private athlete_private
    on athlete_private.athlete_id = athlete.id
    and athlete_private.team_id = athlete.team_id
    and athlete_private.phone_e164 is not null
    and athlete_private.privacy_terms_accepted_at is not null
  join public.communication_consents consent
    on consent.athlete_id = athlete.id
    and consent.team_id = athlete.team_id
    and consent.channel = 'whatsapp'
    and consent.status = 'granted'
  where attendance.event_id = target_event.id
    and attendance.team_id = target_event.team_id
    and attendance.status = 'confirmed'
  on conflict (dedupe_key) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.create_event_as_staff_v5(
  requested_team_id uuid,
  request_id uuid,
  starts_at_local timestamp without time zone,
  event_title text,
  event_kind public.event_kind,
  event_organization_mode public.organization_mode,
  event_sport_format public.sport_format,
  event_duration_minutes integer,
  attendance_deadline_minutes integer,
  repeat_weeks integer default 1,
  event_opponent_name text default null,
  event_venue_name text default null,
  event_venue_address text default null,
  requested_home_internal_team_id uuid default null,
  requested_away_internal_team_id uuid default null,
  requested_venue_exclusive boolean default null
)
returns public.event_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  created_result public.event_command_result;
  affected_event record;
  venue_is_exclusive boolean;
begin
  created_result := public.create_event_as_staff_v4(
    requested_team_id, request_id, starts_at_local, event_title,
    event_kind, event_organization_mode, event_sport_format,
    event_duration_minutes, attendance_deadline_minutes, repeat_weeks,
    event_opponent_name, event_venue_name, event_venue_address,
    requested_home_internal_team_id, requested_away_internal_team_id
  );

  for affected_event in
    select event.id, event.venue_id
    from public.events event
    where event.team_id = requested_team_id
      and (event.id = created_result.event_id
        or (created_result.series_id is not null
          and event.series_id = created_result.series_id))
    for update
  loop
    update public.event_squads squad
    set source_internal_team_id = case squad.sort_order
      when 1 then requested_home_internal_team_id
      when 2 then requested_away_internal_team_id
      else squad.source_internal_team_id
    end
    where squad.event_id = affected_event.id
      and squad.team_id = requested_team_id
      and squad.sort_order in (1, 2);

    if affected_event.venue_id is not null then
      select venue.is_exclusive into venue_is_exclusive
      from public.venues venue
      where venue.id = affected_event.venue_id
        and venue.team_id = requested_team_id
      for update;

      if requested_venue_exclusive is not null
        and venue_is_exclusive is distinct from requested_venue_exclusive
        and not private.is_team_staff(
          requested_team_id, array['owner', 'admin']::public.team_role[]
        )
      then
        raise exception 'Somente owner/admin configura local exclusivo'
          using errcode = '42501';
      end if;

      if requested_venue_exclusive is not null then
        update public.venues venue set is_exclusive = requested_venue_exclusive
        where venue.id = affected_event.venue_id
          and venue.team_id = requested_team_id;
      end if;
    end if;

    perform * from private.refresh_event_schedule_conflicts(
      requested_team_id, affected_event.id
    );
  end loop;

  return created_result;
end;
$$;

create or replace function public.update_event_as_staff_v4(
  requested_team_id uuid,
  requested_event_id uuid,
  request_id uuid,
  edit_scope text,
  starts_at_local timestamp without time zone,
  event_title text,
  event_kind public.event_kind,
  event_organization_mode public.organization_mode,
  event_sport_format public.sport_format,
  event_duration_minutes integer,
  attendance_deadline_minutes integer,
  event_opponent_name text default null,
  event_venue_name text default null,
  event_venue_address text default null,
  requested_venue_exclusive boolean default null
)
returns public.event_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  updated_result public.event_command_result;
  affected_event record;
  conflict_state record;
  venue_is_exclusive boolean;
begin
  if not private.is_team_feature_enabled(
    requested_team_id, 'professional_scheduling'
  ) then
    raise exception 'Agenda profissional desativada para o time'
      using errcode = '55000';
  end if;

  updated_result := public.update_event_as_staff_v3(
    requested_team_id, requested_event_id, request_id, edit_scope,
    starts_at_local, event_title, event_kind, event_organization_mode,
    event_sport_format, event_duration_minutes, attendance_deadline_minutes,
    event_opponent_name, event_venue_name, event_venue_address
  );

  for affected_event in
    select event.id, event.venue_id
    from public.event_changes change
    join public.event_commands command on command.id = change.command_id
    join public.events event on event.id = change.event_id
    where command.team_id = requested_team_id
      and command.request_id = update_event_as_staff_v4.request_id
    order by event.starts_at, event.id
    for update of event
  loop
    if affected_event.venue_id is not null then
      select venue.is_exclusive into venue_is_exclusive
      from public.venues venue
      where venue.id = affected_event.venue_id
        and venue.team_id = requested_team_id
      for update;

      if requested_venue_exclusive is not null
        and venue_is_exclusive is distinct from requested_venue_exclusive
        and not private.is_team_staff(
          requested_team_id, array['owner', 'admin']::public.team_role[]
        )
      then
        raise exception 'Somente owner/admin configura local exclusivo'
          using errcode = '42501';
      end if;

      if requested_venue_exclusive is not null then
        update public.venues venue set is_exclusive = requested_venue_exclusive
        where venue.id = affected_event.venue_id
          and venue.team_id = requested_team_id;
      end if;
    end if;

    select * into conflict_state
    from private.refresh_event_schedule_conflicts(
      requested_team_id, affected_event.id
    );

    if conflict_state.pending_count = 0 then
      perform private.enqueue_event_schedule_change(
        affected_event.id, auth.uid()
      );
    end if;
  end loop;

  return updated_result;
end;
$$;

create or replace function public.resolve_event_schedule_conflict(
  requested_team_id uuid,
  requested_event_id uuid,
  request_id uuid,
  requested_conflict_id uuid,
  requested_decision text,
  requested_justification text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '8s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_event public.events%rowtype;
  target_conflict public.event_schedule_conflicts%rowtype;
  normalized_justification text := nullif(btrim(requested_justification), '');
  payload_hash text;
  command_id uuid;
  existing_hash text;
  command_result jsonb;
  pending_left integer;
  next_state public.professional_schedule_state;
begin
  if current_user_id is null
    or not private.is_team_staff(requested_team_id)
    or not private.is_team_feature_enabled(
      requested_team_id, 'professional_scheduling'
    )
  then
    raise exception 'Pendência da agenda indisponível' using errcode = '42501';
  end if;

  select event.* into target_event from public.events event
  where event.id = requested_event_id and event.team_id = requested_team_id
  for update;
  select conflict.* into target_conflict
  from public.event_schedule_conflicts conflict
  where conflict.id = requested_conflict_id
    and conflict.event_id = requested_event_id
    and conflict.team_id = requested_team_id
  for update;

  payload_hash := encode(extensions.digest(convert_to(jsonb_build_object(
    'kind', 'resolve_conflict', 'event_id', requested_event_id,
    'conflict_id', requested_conflict_id, 'decision', requested_decision,
    'justification', normalized_justification
  )::text, 'UTF8'), 'sha256'), 'hex');

  insert into private.event_schedule_commands (
    team_id, request_id, actor_id, kind, payload_hash
  ) values (
    requested_team_id, request_id, current_user_id,
    'resolve_conflict', payload_hash
  ) on conflict on constraint event_schedule_commands_team_id_request_id_key
    do nothing returning id into command_id;

  if command_id is null then
    select command.payload_hash, command.result
    into existing_hash, command_result
    from private.event_schedule_commands command
    where command.team_id = requested_team_id
      and command.request_id = resolve_event_schedule_conflict.request_id
    for update;
    if existing_hash <> payload_hash or command_result is null then
      raise exception 'Request ID já utilizado com outro conteúdo'
        using errcode = '22023';
    end if;
    return command_result || jsonb_build_object('replayed', true);
  end if;

  if target_event.id is null or target_conflict.id is null
    or target_conflict.status <> 'pending'
    or target_conflict.detected_schedule_version <> target_event.schedule_version
  then
    raise exception 'Pendência não está mais disponível' using errcode = '55000';
  end if;

  if target_conflict.severity = 'hard' then
    if requested_decision <> 'accept_exception'
      or normalized_justification is null
      or char_length(normalized_justification) < 10
      or not private.is_team_staff(
        requested_team_id, array['owner', 'admin']::public.team_role[]
      )
    then
      raise exception 'Exceção dura exige owner/admin e justificativa'
        using errcode = '42501';
    end if;
  elsif requested_decision <> 'confirm_warning' then
    raise exception 'Decisão incompatível com o alerta' using errcode = '22023';
  end if;

  update public.event_schedule_conflicts conflict
  set status = 'accepted', accepted_by = current_user_id, accepted_at = now()
  where conflict.id = target_conflict.id;

  insert into public.event_schedule_decisions (
    team_id, command_id, event_id, conflict_id, decision, scope,
    schedule_version, justification, actor_id
  ) values (
    requested_team_id, command_id, target_event.id, target_conflict.id,
    requested_decision, 'single_event', target_event.schedule_version,
    normalized_justification, current_user_id
  );

  select count(*)::integer into pending_left
  from public.event_schedule_conflicts conflict
  where conflict.event_id = target_event.id
    and conflict.detected_schedule_version = target_event.schedule_version
    and conflict.status = 'pending';

  next_state := case when pending_left = 0
    then 'scheduled'::public.professional_schedule_state
    else 'pending_review'::public.professional_schedule_state end;
  update public.events event
  set professional_schedule_state = next_state,
      schedule_confirmed_version = case when pending_left = 0
        then event.schedule_version else event.schedule_confirmed_version end
  where event.id = target_event.id;

  if pending_left = 0 then
    perform private.enqueue_event_schedule_change(target_event.id, current_user_id);
  end if;

  command_result := jsonb_build_object(
    'event_id', target_event.id,
    'conflict_id', target_conflict.id,
    'pending_count', pending_left,
    'schedule_state', next_state,
    'replayed', false
  );
  update private.event_schedule_commands command set result = command_result
  where command.id = command_id;

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata, request_id
  ) values (
    requested_team_id, current_user_id, 'professional.schedule.conflict_resolved',
    'event_schedule_conflict', target_conflict.id::text,
    jsonb_build_object('severity', target_conflict.severity,
      'decision', requested_decision, 'pending_count', pending_left),
    request_id::text
  );
  return command_result;
end;
$$;

create or replace function public.transition_event_schedule(
  requested_team_id uuid,
  requested_event_id uuid,
  request_id uuid,
  requested_transition text,
  requested_scope text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_event public.events%rowtype;
  affected_event record;
  payload_hash text;
  command_id uuid;
  existing_hash text;
  command_result jsonb;
  affected_count integer := 0;
  next_state public.professional_schedule_state;
begin
  if current_user_id is null
    or not private.is_team_staff(requested_team_id)
    or not private.is_team_feature_enabled(
      requested_team_id, 'professional_scheduling'
    )
  then
    raise exception 'Ciclo da agenda indisponível' using errcode = '42501';
  end if;
  if requested_transition not in ('date_tbd', 'postpone', 'cancel')
    or requested_scope not in ('single_event', 'this_and_future')
  then
    raise exception 'Transição ou alcance inválido' using errcode = '22023';
  end if;

  payload_hash := encode(extensions.digest(convert_to(jsonb_build_object(
    'kind', 'transition_schedule', 'event_id', requested_event_id,
    'transition', requested_transition, 'scope', requested_scope
  )::text, 'UTF8'), 'sha256'), 'hex');
  insert into private.event_schedule_commands (
    team_id, request_id, actor_id, kind, payload_hash
  ) values (
    requested_team_id, request_id, current_user_id,
    'transition_schedule', payload_hash
  ) on conflict on constraint event_schedule_commands_team_id_request_id_key
    do nothing returning id into command_id;
  if command_id is null then
    select command.payload_hash, command.result into existing_hash, command_result
    from private.event_schedule_commands command
    where command.team_id = requested_team_id
      and command.request_id = transition_event_schedule.request_id
    for update;
    if existing_hash <> payload_hash or command_result is null then
      raise exception 'Request ID já utilizado com outro conteúdo'
        using errcode = '22023';
    end if;
    return command_result || jsonb_build_object('replayed', true);
  end if;

  select event.* into target_event from public.events event
  where event.id = requested_event_id and event.team_id = requested_team_id
  for update;
  if target_event.id is null or target_event.status <> 'scheduled'
    or target_event.starts_at <= now()
    or (requested_scope = 'this_and_future' and target_event.series_id is null)
  then
    raise exception 'Evento não pode mudar de estado' using errcode = '55000';
  end if;

  next_state := case requested_transition
    when 'date_tbd' then 'date_tbd'
    when 'postpone' then 'postponed'
    else target_event.professional_schedule_state
  end;

  for affected_event in
    select event.id, event.schedule_version, event.series_id
    from public.events event
    where event.team_id = requested_team_id
      and event.status = 'scheduled'
      and event.starts_at > now()
      and (
        (requested_scope = 'single_event' and event.id = target_event.id)
        or (requested_scope = 'this_and_future'
          and event.series_id = target_event.series_id
          and event.series_position >= target_event.series_position
          and (event.is_series_exception is false or event.id = target_event.id))
      )
    order by event.series_position nulls first, event.id
    for update
  loop
    if exists (
      select 1 from public.event_matches match
      where match.event_id = affected_event.id
        and match.team_id = requested_team_id
        and match.status = 'finalized'
    ) then
      raise exception 'Partida finalizada não pode mudar de estado'
        using errcode = '55000';
    end if;

    update public.events event set
      professional_schedule_state = next_state,
      status = case when requested_transition = 'cancel'
        then 'cancelled' else event.status end,
      cancelled_at = case when requested_transition = 'cancel'
        then now() else event.cancelled_at end,
      cancelled_by = case when requested_transition = 'cancel'
        then current_user_id else event.cancelled_by end,
      schedule_version = event.schedule_version + 1,
      is_series_exception = case
        when requested_scope = 'single_event' and event.series_id is not null
          then true else event.is_series_exception end
    where event.id = affected_event.id;

    update public.event_schedule_conflicts conflict
    set status = 'resolved', accepted_by = null, accepted_at = null
    where conflict.event_id = affected_event.id and conflict.status = 'pending';

    update public.championship_fixtures fixture
    set status = 'draft', updated_at = now()
    from public.event_matches match
    where match.event_id = affected_event.id
      and match.team_id = requested_team_id
      and fixture.match_id = match.id
      and fixture.team_id = match.team_id
      and fixture.status = 'scheduled';

    update public.notification_outbox outbox
    set status = 'cancelled', processed_at = now(),
      last_error = 'Agenda alterada; intenção invalidada pela nova revisão.'
    where outbox.event_id = affected_event.id
      and outbox.status = 'pending';

    insert into public.event_schedule_decisions (
      team_id, command_id, event_id, decision, scope,
      schedule_version, actor_id
    ) values (
      requested_team_id, command_id, affected_event.id,
      requested_transition, requested_scope,
      affected_event.schedule_version + 1, current_user_id
    );
    begin
      perform private.enqueue_event_schedule_change(
        affected_event.id, current_user_id
      );
    exception when others then
      raise warning 'schedule change notification enqueue failed';
    end;
    affected_count := affected_count + 1;
  end loop;

  if affected_count = 0 then
    raise exception 'Nenhuma ocorrência futura pode mudar de estado'
      using errcode = '55000';
  end if;
  if requested_transition = 'cancel' and requested_scope = 'this_and_future' then
    update public.event_series series set is_active = false
    where series.id = target_event.series_id
      and series.team_id = requested_team_id;
  end if;

  command_result := jsonb_build_object(
    'event_id', target_event.id, 'transition', requested_transition,
    'scope', requested_scope, 'affected_count', affected_count,
    'replayed', false
  );
  update private.event_schedule_commands command set result = command_result
  where command.id = command_id;
  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata, request_id
  ) values (
    requested_team_id, current_user_id, 'professional.schedule.transitioned',
    'event', target_event.id::text,
    jsonb_build_object('transition', requested_transition,
      'scope', requested_scope, 'affected_count', affected_count),
    request_id::text
  );
  return command_result;
end;
$$;

create or replace function private.refresh_conflicts_after_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_event_id uuid := coalesce(new.event_id, old.event_id);
  changed_team_id uuid := coalesce(new.team_id, old.team_id);
begin
  if private.is_team_feature_enabled(changed_team_id, 'professional_scheduling') then
    perform * from private.refresh_event_schedule_conflicts(
      changed_team_id, changed_event_id
    );
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger event_attendance_refresh_schedule_conflicts
  after insert or update of status or delete on public.event_attendance
  for each row execute function private.refresh_conflicts_after_attendance();

revoke all on function private.events_share_internal_team(uuid, uuid)
  from public;
revoke all on function private.refresh_event_schedule_conflicts(uuid, uuid)
  from public;
revoke all on function private.enqueue_event_schedule_change(uuid, uuid)
  from public;
revoke all on function private.refresh_conflicts_after_attendance()
  from public;

revoke all on function public.create_event_as_staff_v5(
  uuid, uuid, timestamp without time zone, text, public.event_kind,
  public.organization_mode, public.sport_format, integer, integer, integer,
  text, text, text, uuid, uuid, boolean
) from public, anon;
grant execute on function public.create_event_as_staff_v5(
  uuid, uuid, timestamp without time zone, text, public.event_kind,
  public.organization_mode, public.sport_format, integer, integer, integer,
  text, text, text, uuid, uuid, boolean
) to authenticated;

revoke all on function public.update_event_as_staff_v4(
  uuid, uuid, uuid, text, timestamp without time zone, text,
  public.event_kind, public.organization_mode, public.sport_format,
  integer, integer, text, text, text, boolean
) from public, anon;
grant execute on function public.update_event_as_staff_v4(
  uuid, uuid, uuid, text, timestamp without time zone, text,
  public.event_kind, public.organization_mode, public.sport_format,
  integer, integer, text, text, text, boolean
) to authenticated;

revoke all on function public.resolve_event_schedule_conflict(
  uuid, uuid, uuid, uuid, text, text
) from public, anon;
grant execute on function public.resolve_event_schedule_conflict(
  uuid, uuid, uuid, uuid, text, text
) to authenticated;

revoke all on function public.transition_event_schedule(
  uuid, uuid, uuid, text, text
) from public, anon;
grant execute on function public.transition_event_schedule(
  uuid, uuid, uuid, text, text
) to authenticated;

comment on column public.venues.is_exclusive is
  'Identidade persistente: sobreposição neste local é conflito duro.';
comment on column public.event_squads.source_internal_team_id is
  'Origem persistente opcional do snapshot; dado legado continua válido sem ela.';
comment on table public.event_schedule_conflicts is
  'Projeção privada recalculável. Decisões ficam na tabela imutável separada.';
comment on table public.event_schedule_decisions is
  'Trilha imutável de alertas, exceções e transições manuais da agenda.';
