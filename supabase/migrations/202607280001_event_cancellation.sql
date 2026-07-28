-- Soft cancellation preserves the occurrence and every historical relation
-- while making the state transition explicit for future delivery consumers.

create or replace function public.cancel_event_as_staff(
  requested_team_id uuid,
  requested_event_id uuid,
  request_id uuid,
  cancel_scope text
)
returns public.event_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_event public.events%rowtype;
  command_id uuid;
  existing_hash text;
  command_result jsonb;
  payload_hash text;
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
    raise exception 'Event cancellation access required'
      using errcode = '42501';
  end if;

  payload_hash := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'kind', 'cancel',
          'event_id', requested_event_id,
          'scope', cancel_scope
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
    event_id,
    series_id
  )
  values (
    requested_team_id,
    request_id,
    current_user_id,
    'cancel',
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
      and command.request_id = cancel_event_as_staff.request_id
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

  if cancel_scope is null
    or cancel_scope not in ('single_event', 'this_and_future')
    or (
      cancel_scope = 'this_and_future'
      and target_event.series_id is null
    )
  then
    raise exception 'Invalid event cancellation scope'
      using errcode = '22023';
  end if;

  if target_event.status <> 'scheduled'
    or target_event.starts_at <= now()
  then
    raise exception 'Only upcoming scheduled events can be cancelled'
      using errcode = '55000';
  end if;

  if target_event.series_id is not null then
    perform 1
    from public.event_series series
    where series.id = target_event.series_id
      and series.team_id = requested_team_id
    for update;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'starts_at', e.starts_at,
        'status', e.status
      )
      order by e.series_position nulls first, e.id
    ),
    '[]'::jsonb
  )
  into previous_rows
  from public.events e
  where
    (
      cancel_scope = 'this_and_future'
      and e.series_id = target_event.series_id
      and e.series_position >= target_event.series_position
      and e.status = 'scheduled'
      and e.starts_at > now()
    )
    or (
      cancel_scope = 'single_event'
      and e.id = target_event.id
    );

  update public.events e
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = current_user_id,
    schedule_version = e.schedule_version + 1,
    is_series_exception = case
      when cancel_scope = 'single_event' and e.series_id is not null then true
      else e.is_series_exception
    end
  where e.id in (
    select (item ->> 'id')::uuid
    from jsonb_array_elements(previous_rows) item
  );

  get diagnostics affected_count = row_count;

  if affected_count = 0 then
    raise exception 'No upcoming event occurrence can be cancelled'
      using errcode = '55000';
  end if;

  if cancel_scope = 'this_and_future' then
    update public.event_series series
    set is_active = false
    where series.id = target_event.series_id
      and series.team_id = requested_team_id;
  end if;

  update public.notification_outbox outbox
  set
    status = 'cancelled',
    processed_at = now(),
    last_error = 'Evento cancelado; comando invalidado pela versão da agenda.'
  where outbox.event_id in (
      select (item ->> 'id')::uuid
      from jsonb_array_elements(previous_rows) item
    )
    and outbox.status in ('pending', 'failed');

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
    'cancelled',
    cancel_scope,
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
    'event.cancelled',
    'event',
    requested_event_id::text,
    jsonb_build_object(
      'scope', cancel_scope,
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

revoke all on function public.cancel_event_as_staff(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.cancel_event_as_staff(uuid, uuid, uuid, text)
  to authenticated;

comment on function public.cancel_event_as_staff(uuid, uuid, uuid, text) is
  'Soft-cancels one upcoming occurrence or it and every future scheduled occurrence, preserving historical relations and recording an idempotent versioned change.';
