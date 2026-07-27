create type public.event_command_kind as enum (
  'create',
  'update',
  'cancel',
  'extend_series'
);

create type public.event_change_kind as enum (
  'created',
  'details_updated',
  'rescheduled',
  'cancelled',
  'series_extended'
);

create type public.event_command_result as (
  request_id uuid,
  event_id uuid,
  series_id uuid,
  affected_count integer,
  max_schedule_version bigint,
  replayed boolean
);

alter table public.events
  add column schedule_version bigint not null default 1,
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references auth.users (id) on delete set null;

update public.events
set
  cancelled_at = updated_at,
  cancelled_by = created_by
where status = 'cancelled';

alter table public.events
  add constraint events_cancellation_consistency check (
    (
      status = 'cancelled'
      and cancelled_at is not null
      and cancelled_by is not null
    )
    or (
      status <> 'cancelled'
      and cancelled_at is null
      and cancelled_by is null
    )
  );

create table public.event_commands (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  request_id uuid not null,
  actor_id uuid not null references auth.users (id) on delete restrict,
  kind public.event_command_kind not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  event_id uuid,
  series_id uuid,
  result jsonb,
  created_at timestamptz not null default now(),
  unique (team_id, request_id),
  foreign key (event_id, team_id)
    references public.events (id, team_id) on delete restrict,
  foreign key (series_id, team_id)
    references public.event_series (id, team_id) on delete restrict
);

create table public.event_changes (
  id bigint primary key generated always as identity,
  team_id uuid not null references public.teams (id) on delete cascade,
  command_id uuid not null references public.event_commands (id) on delete restrict,
  event_id uuid not null,
  series_id uuid,
  kind public.event_change_kind not null,
  scope text not null check (scope in ('single_event', 'this_and_future')),
  schedule_version bigint not null,
  previous_status public.event_status,
  next_status public.event_status not null,
  previous_starts_at timestamptz,
  next_starts_at timestamptz,
  occurred_at timestamptz not null default now(),
  unique (event_id, schedule_version),
  foreign key (event_id, team_id)
    references public.events (id, team_id) on delete restrict,
  foreign key (series_id, team_id)
    references public.event_series (id, team_id) on delete restrict
);

create index event_changes_team_occurred_idx
  on public.event_changes (team_id, occurred_at desc);

alter table public.event_commands enable row level security;
alter table public.event_changes enable row level security;

create policy event_changes_select_staff
  on public.event_changes
  for select
  to authenticated
  using (private.is_team_staff(team_id));

revoke all on public.event_commands from anon, authenticated;
revoke all on public.event_changes from anon, authenticated;
grant select on public.event_changes to authenticated;

create or replace function private.resolve_team_local_datetime(
  requested_team_id uuid,
  starts_at_local timestamp without time zone
)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  team_timezone text;
  resolved_starts_at timestamptz;
begin
  select t.timezone
  into team_timezone
  from public.teams t
  where t.id = requested_team_id;

  if team_timezone is null or starts_at_local is null then
    raise exception 'Invalid local event date' using errcode = '22023';
  end if;

  resolved_starts_at := starts_at_local at time zone team_timezone;

  if resolved_starts_at at time zone team_timezone <> starts_at_local then
    raise exception 'Local event date does not exist in team timezone'
      using errcode = '22023';
  end if;

  return resolved_starts_at;
end;
$$;

create or replace function public.create_event_as_staff_v2(
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
  event_venue_address text default null
)
returns public.event_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  command_id uuid;
  existing_hash text;
  command_result jsonb;
  payload_hash text;
  resolved_starts_at timestamptz;
  first_event_id uuid;
  created_series_id uuid;
  team_timezone text;
  affected_count integer;
  max_version bigint;
  result_row public.event_command_result;
begin
  if current_user_id is null
    or not private.is_team_staff(requested_team_id)
    or not private.is_team_feature_enabled(requested_team_id, 'event_control')
  then
    raise exception 'Event control access required' using errcode = '42501';
  end if;

  payload_hash := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'kind', 'create',
          'starts_at_local', starts_at_local,
          'title', event_title,
          'event_kind', event_kind,
          'organization_mode', event_organization_mode,
          'sport_format', event_sport_format,
          'duration_minutes', event_duration_minutes,
          'deadline_minutes', attendance_deadline_minutes,
          'repeat_weeks', repeat_weeks,
          'opponent_name', event_opponent_name,
          'venue_name', event_venue_name,
          'venue_address', event_venue_address
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.event_commands (
    team_id, request_id, actor_id, kind, payload_hash
  )
  values (
    requested_team_id, request_id, current_user_id, 'create', payload_hash
  )
  on conflict on constraint event_commands_team_id_request_id_key do nothing
  returning id into command_id;

  if command_id is null then
    select command.id, command.payload_hash, command.result
    into command_id, existing_hash, command_result
    from public.event_commands command
    where command.team_id = requested_team_id
      and command.request_id = create_event_as_staff_v2.request_id
    for update;

    if existing_hash <> payload_hash or command_result is null then
      raise exception 'Request id already used with different payload'
        using errcode = '22023';
    end if;

    return (
      request_id,
      (command_result ->> 'event_id')::uuid,
      (command_result ->> 'series_id')::uuid,
      (command_result ->> 'affected_count')::integer,
      (command_result ->> 'max_schedule_version')::bigint,
      true
    )::public.event_command_result;
  end if;

  resolved_starts_at :=
    private.resolve_team_local_datetime(requested_team_id, starts_at_local);

  first_event_id := public.create_event_as_staff(
    requested_team_id,
    event_title,
    event_kind,
    event_organization_mode,
    event_sport_format,
    resolved_starts_at,
    event_duration_minutes,
    attendance_deadline_minutes,
    repeat_weeks,
    event_opponent_name,
    event_venue_name,
    event_venue_address
  );

  select e.series_id
  into created_series_id
  from public.events e
  where e.id = first_event_id;

  if created_series_id is not null then
    select series.timezone
    into team_timezone
    from public.event_series series
    where series.id = created_series_id;

    update public.events e
    set
      starts_at = (
        starts_at_local
        + pg_catalog.make_interval(weeks => e.series_position - 1)
      ) at time zone team_timezone,
      ends_at = (
        starts_at_local
        + pg_catalog.make_interval(weeks => e.series_position - 1)
      ) at time zone team_timezone
        + pg_catalog.make_interval(mins => event_duration_minutes),
      attendance_deadline = (
        starts_at_local
        + pg_catalog.make_interval(weeks => e.series_position - 1)
      ) at time zone team_timezone
        - pg_catalog.make_interval(mins => attendance_deadline_minutes)
    where e.series_id = created_series_id;
  end if;

  insert into public.event_changes (
    team_id,
    command_id,
    event_id,
    series_id,
    kind,
    scope,
    schedule_version,
    previous_status,
    next_status,
    previous_starts_at,
    next_starts_at
  )
  select
    e.team_id,
    command_id,
    e.id,
    e.series_id,
    'created',
    case when e.series_id is null then 'single_event' else 'this_and_future' end,
    e.schedule_version,
    null,
    e.status,
    null,
    e.starts_at
  from public.events e
  where e.id = first_event_id
    or e.series_id = created_series_id;

  get diagnostics affected_count = row_count;

  select max(e.schedule_version)
  into max_version
  from public.events e
  where e.id = first_event_id
    or e.series_id = created_series_id;

  command_result := jsonb_build_object(
    'event_id', first_event_id,
    'series_id', created_series_id,
    'affected_count', affected_count,
    'max_schedule_version', max_version
  );

  update public.event_commands command
  set
    event_id = first_event_id,
    series_id = created_series_id,
    result = command_result
  where command.id = command_id;

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata, request_id
  )
  values (
    requested_team_id,
    current_user_id,
    'event.created_v2',
    'event',
    first_event_id::text,
    jsonb_build_object('affected_count', affected_count),
    request_id::text
  );

  result_row := (
    request_id,
    first_event_id,
    created_series_id,
    affected_count,
    max_version,
    false
  );
  return result_row;
end;
$$;

create or replace function public.update_event_as_staff_v2(
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
  event_venue_address text default null
)
returns public.event_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  command_id uuid;
  existing_hash text;
  command_result jsonb;
  payload_hash text;
  resolved_starts_at timestamptz;
  target_event public.events%rowtype;
  target_timezone text;
  previous_rows jsonb;
  affected_count integer;
  max_version bigint;
  result_row public.event_command_result;
begin
  select e.*
  into target_event
  from public.events e
  where e.id = requested_event_id
    and e.team_id = requested_team_id
  for update;

  if target_event.id is null
    or current_user_id is null
    or not private.is_team_staff(requested_team_id)
    or not private.is_team_feature_enabled(requested_team_id, 'event_control')
  then
    raise exception 'Event control access required' using errcode = '42501';
  end if;

  payload_hash := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'kind', 'update',
          'event_id', requested_event_id,
          'scope', edit_scope,
          'starts_at_local', starts_at_local,
          'title', event_title,
          'event_kind', event_kind,
          'organization_mode', event_organization_mode,
          'sport_format', event_sport_format,
          'duration_minutes', event_duration_minutes,
          'deadline_minutes', attendance_deadline_minutes,
          'opponent_name', event_opponent_name,
          'venue_name', event_venue_name,
          'venue_address', event_venue_address
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.event_commands (
    team_id, request_id, actor_id, kind, payload_hash, event_id, series_id
  )
  values (
    requested_team_id,
    request_id,
    current_user_id,
    'update',
    payload_hash,
    requested_event_id,
    target_event.series_id
  )
  on conflict on constraint event_commands_team_id_request_id_key do nothing
  returning id into command_id;

  if command_id is null then
    select command.id, command.payload_hash, command.result
    into command_id, existing_hash, command_result
    from public.event_commands command
    where command.team_id = requested_team_id
      and command.request_id = update_event_as_staff_v2.request_id
    for update;

    if existing_hash <> payload_hash or command_result is null then
      raise exception 'Request id already used with different payload'
        using errcode = '22023';
    end if;

    return (
      request_id,
      (command_result ->> 'event_id')::uuid,
      (command_result ->> 'series_id')::uuid,
      (command_result ->> 'affected_count')::integer,
      (command_result ->> 'max_schedule_version')::bigint,
      true
    )::public.event_command_result;
  end if;

  resolved_starts_at :=
    private.resolve_team_local_datetime(requested_team_id, starts_at_local);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'starts_at', e.starts_at,
        'status', e.status,
        'version', e.schedule_version
      )
    ),
    '[]'::jsonb
  )
  into previous_rows
  from public.events e
  where
    (
      edit_scope = 'this_and_future'
      and target_event.series_id is not null
      and e.series_id = target_event.series_id
      and e.series_position >= target_event.series_position
      and e.status = 'scheduled'
      and (e.is_series_exception is false or e.id = target_event.id)
    )
    or (
      (edit_scope = 'single_event' or target_event.series_id is null)
      and e.id = target_event.id
    );

  affected_count := public.update_event_as_staff(
    requested_team_id,
    requested_event_id,
    edit_scope,
    event_title,
    event_kind,
    event_organization_mode,
    event_sport_format,
    resolved_starts_at,
    event_duration_minutes,
    attendance_deadline_minutes,
    event_opponent_name,
    event_venue_name,
    event_venue_address
  );

  if edit_scope = 'this_and_future' and target_event.series_id is not null then
    select series.timezone
    into target_timezone
    from public.event_series series
    where series.id = target_event.series_id;

    update public.events e
    set
      starts_at = (
        starts_at_local
        + pg_catalog.make_interval(
          weeks => e.series_position - target_event.series_position
        )
      ) at time zone target_timezone,
      ends_at = (
        starts_at_local
        + pg_catalog.make_interval(
          weeks => e.series_position - target_event.series_position
        )
      ) at time zone target_timezone
        + pg_catalog.make_interval(mins => event_duration_minutes),
      attendance_deadline = (
        starts_at_local
        + pg_catalog.make_interval(
          weeks => e.series_position - target_event.series_position
        )
      ) at time zone target_timezone
        - pg_catalog.make_interval(mins => attendance_deadline_minutes)
    where e.series_id = target_event.series_id
      and e.series_position >= target_event.series_position
      and e.status = 'scheduled'
      and (e.is_series_exception is false or e.id = target_event.id);
  end if;

  update public.events e
  set schedule_version = e.schedule_version + 1
  where e.id in (
    select (item ->> 'id')::uuid
    from jsonb_array_elements(previous_rows) item
  );

  update public.notification_outbox outbox
  set
    status = 'cancelled',
    processed_at = now(),
    last_error = 'Evento remarcado; comando invalidado pela versão da agenda.'
  where outbox.event_id in (
      select (item ->> 'id')::uuid
      from jsonb_array_elements(previous_rows) item
    )
    and outbox.status in ('pending', 'failed')
    and exists (
      select 1
      from jsonb_array_elements(previous_rows) item
      join public.events e on e.id = (item ->> 'id')::uuid
      where e.id = outbox.event_id
        and e.starts_at <> (item ->> 'starts_at')::timestamptz
    );

  insert into public.event_changes (
    team_id,
    command_id,
    event_id,
    series_id,
    kind,
    scope,
    schedule_version,
    previous_status,
    next_status,
    previous_starts_at,
    next_starts_at
  )
  select
    e.team_id,
    command_id,
    e.id,
    e.series_id,
    case
      when e.starts_at <> (item ->> 'starts_at')::timestamptz
        then 'rescheduled'::public.event_change_kind
      else 'details_updated'::public.event_change_kind
    end,
    edit_scope,
    e.schedule_version,
    (item ->> 'status')::public.event_status,
    e.status,
    (item ->> 'starts_at')::timestamptz,
    e.starts_at
  from jsonb_array_elements(previous_rows) item
  join public.events e on e.id = (item ->> 'id')::uuid;

  select max(e.schedule_version)
  into max_version
  from jsonb_array_elements(previous_rows) item
  join public.events e on e.id = (item ->> 'id')::uuid;

  command_result := jsonb_build_object(
    'event_id', requested_event_id,
    'series_id', target_event.series_id,
    'affected_count', affected_count,
    'max_schedule_version', max_version
  );

  update public.event_commands command
  set result = command_result
  where command.id = command_id;

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata, request_id
  )
  values (
    requested_team_id,
    current_user_id,
    'event.updated_v2',
    'event',
    requested_event_id::text,
    jsonb_build_object(
      'scope', edit_scope,
      'affected_count', affected_count
    ),
    request_id::text
  );

  result_row := (
    request_id,
    requested_event_id,
    target_event.series_id,
    affected_count,
    max_version,
    false
  );
  return result_row;
end;
$$;

revoke all on function private.resolve_team_local_datetime(uuid, timestamp without time zone)
  from public, anon, authenticated;
revoke all on function public.create_event_as_staff_v2(uuid, uuid, timestamp without time zone, text, public.event_kind, public.organization_mode, public.sport_format, integer, integer, integer, text, text, text)
  from public, anon, authenticated;
revoke all on function public.update_event_as_staff_v2(uuid, uuid, uuid, text, timestamp without time zone, text, public.event_kind, public.organization_mode, public.sport_format, integer, integer, text, text, text)
  from public, anon, authenticated;

grant execute on function public.create_event_as_staff_v2(uuid, uuid, timestamp without time zone, text, public.event_kind, public.organization_mode, public.sport_format, integer, integer, integer, text, text, text)
  to authenticated;
grant execute on function public.update_event_as_staff_v2(uuid, uuid, uuid, text, timestamp without time zone, text, public.event_kind, public.organization_mode, public.sport_format, integer, integer, text, text, text)
  to authenticated;

comment on table public.event_commands is
  'Idempotency ledger for event-control commands. Not directly readable by clients.';
comment on table public.event_changes is
  'PII-free versioned event schedule changes for future notification consumers.';
