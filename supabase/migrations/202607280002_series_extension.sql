create or replace function public.extend_event_series_as_staff(
  requested_team_id uuid,
  requested_series_id uuid,
  request_id uuid,
  additional_occurrences integer
)
returns public.event_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_series public.event_series%rowtype;
  source_event public.events%rowtype;
  command_id uuid;
  existing_hash text;
  command_result jsonb;
  payload_hash text;
  current_occurrences integer;
  current_max_position integer;
  occurrence_position integer;
  occurrence_local timestamp without time zone;
  occurrence_starts_at timestamptz;
  new_event_id uuid;
  first_event_id uuid;
  last_occurrence_date date;
  affected_count integer := 0;
  result_row public.event_command_result;
begin
  select series.*
  into target_series
  from public.event_series series
  where series.id = requested_series_id
    and series.team_id = requested_team_id
  for update;

  if target_series.id is null
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
          'kind', 'extend_series',
          'series_id', requested_series_id,
          'additional_occurrences', additional_occurrences
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.event_commands (
    team_id,
    request_id,
    actor_id,
    kind,
    payload_hash,
    series_id
  )
  values (
    requested_team_id,
    request_id,
    current_user_id,
    'extend_series',
    payload_hash,
    requested_series_id
  )
  on conflict on constraint event_commands_team_id_request_id_key do nothing
  returning id into command_id;

  if command_id is null then
    select command.id, command.payload_hash, command.result
    into command_id, existing_hash, command_result
    from public.event_commands command
    where command.team_id = requested_team_id
      and command.request_id = extend_event_series_as_staff.request_id
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

  select count(*), max(e.series_position)
  into current_occurrences, current_max_position
  from public.events e
  where e.series_id = requested_series_id
    and e.team_id = requested_team_id;

  select e.*
  into source_event
  from public.events e
  where e.series_id = requested_series_id
    and e.team_id = requested_team_id
    and not e.is_series_exception
  order by e.series_position desc
  limit 1;

  if not target_series.is_active
    or additional_occurrences not between 1 and 52
    or current_occurrences < 2
    or current_occurrences + additional_occurrences > 52
    or current_max_position is null
    or target_series.ends_on is null
    or source_event.id is null
    or not exists (
      select 1
      from public.events e
      where e.series_id = requested_series_id
        and e.team_id = requested_team_id
        and e.status = 'scheduled'
        and e.starts_at > now()
    )
  then
    raise exception 'Series cannot be extended' using errcode = '55000';
  end if;

  for occurrence_offset in 1..additional_occurrences loop
    occurrence_position := current_max_position + occurrence_offset;
    last_occurrence_date :=
      target_series.ends_on + (occurrence_offset * 7);
    occurrence_local :=
      last_occurrence_date + target_series.local_start_time;
    occurrence_starts_at := private.resolve_team_local_datetime(
      requested_team_id,
      occurrence_local
    );

    if occurrence_starts_at <= now() then
      raise exception 'Series extension must remain in the future'
        using errcode = '55000';
    end if;

    insert into public.events (
      team_id,
      series_id,
      series_position,
      title,
      kind,
      organization_mode,
      sport_format,
      starts_at,
      ends_at,
      attendance_deadline,
      venue_id,
      opponent_name,
      created_by
    )
    values (
      requested_team_id,
      requested_series_id,
      occurrence_position,
      target_series.title,
      target_series.kind,
      target_series.organization_mode,
      target_series.sport_format,
      occurrence_starts_at,
      occurrence_starts_at
        + pg_catalog.make_interval(mins => target_series.duration_minutes),
      occurrence_starts_at - target_series.attendance_deadline_offset,
      target_series.venue_id,
      source_event.opponent_name,
      current_user_id
    )
    returning id into new_event_id;

    first_event_id := coalesce(first_event_id, new_event_id);
    affected_count := affected_count + 1;

    insert into public.event_attendance (event_id, team_id, athlete_id)
    select new_event_id, requested_team_id, athlete.id
    from public.athletes athlete
    where athlete.team_id = requested_team_id
      and athlete.status = 'active'
      and athlete.removed_at is null;

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
    values (
      requested_team_id,
      command_id,
      new_event_id,
      requested_series_id,
      'series_extended',
      'this_and_future',
      1,
      null,
      'scheduled',
      null,
      occurrence_starts_at
    );
  end loop;

  update public.event_series series
  set
    ends_on = last_occurrence_date,
    recurrence_rule =
      'FREQ=WEEKLY;COUNT='
      || (current_occurrences + additional_occurrences)::text
  where series.id = requested_series_id;

  command_result := jsonb_build_object(
    'event_id', first_event_id,
    'series_id', requested_series_id,
    'affected_count', affected_count,
    'max_schedule_version', 1
  );

  update public.event_commands command
  set
    event_id = first_event_id,
    result = command_result
  where command.id = command_id;

  insert into public.audit_logs (
    team_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata,
    request_id
  )
  values (
    requested_team_id,
    current_user_id,
    'event.series_extended',
    'event_series',
    requested_series_id::text,
    jsonb_build_object(
      'additional_occurrences', additional_occurrences,
      'affected_count', affected_count
    ),
    request_id::text
  );

  result_row := (
    request_id,
    first_event_id,
    requested_series_id,
    affected_count,
    1,
    false
  );
  return result_row;
end;
$$;

revoke all on function public.extend_event_series_as_staff(uuid, uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.extend_event_series_as_staff(uuid, uuid, uuid, integer)
  to authenticated;

comment on function public.extend_event_series_as_staff(uuid, uuid, uuid, integer) is
  'Idempotently appends weekly civil-time occurrences to an active event series.';
