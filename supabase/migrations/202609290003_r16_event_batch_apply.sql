-- R16 / WP-R16-06 / BAT-02 — aplicação atômica e idempotente do lote de jogos.

create or replace function public.apply_event_batch_operation(
  requested_team_id uuid,
  requested_preview jsonb,
  request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid;
  requested_action text;
  requested_payload jsonb;
  requested_event_ids uuid[];
  preview_expires_at timestamptz;
  payload_hash text;
  command_id uuid;
  existing_hash text;
  command_result jsonb;
  current_preview jsonb;
  preview_item jsonb;
  target_event public.events%rowtype;
  previous_starts_at timestamptz;
  next_starts_at timestamptz;
  next_ends_at timestamptz;
  team_timezone text;
  conflict_state record;
  affected_count integer := 0;
  max_version bigint := 0;
begin
  current_user_id := private.require_batch_operations_access(
    requested_team_id, 'professional_scheduling'
  );
  if not private.is_team_feature_enabled(requested_team_id, 'event_control') then
    raise exception 'Operações em lote indisponíveis' using errcode = '42501';
  end if;

  if requested_preview is null
    or requested_preview->>'domain' <> 'events'
    or requested_preview->>'scope' <> 'selected'
    or coalesce(requested_preview->>'selection_hash', '') !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(requested_preview->'payload') <> 'object'
    or jsonb_typeof(requested_preview->'items') <> 'array'
    or coalesce(requested_preview->>'item_count', '') !~ '^[0-9]+$'
    or (requested_preview->>'item_count')::integer not between 1 and 50
    or jsonb_array_length(requested_preview->'items')
      <> (requested_preview->>'item_count')::integer
    or coalesce(requested_preview->>'blocked_count', '-1') <> '0'
    or request_id is null
  then
    raise exception 'Prévia do lote inválida' using errcode = '22023';
  end if;

  requested_action := requested_preview->>'action';
  requested_payload := requested_preview->'payload';
  if requested_action not in ('shift_time', 'set_local_time', 'set_duration') then
    raise exception 'Ação ainda indisponível neste checkpoint' using errcode = '22023';
  end if;

  begin
    preview_expires_at := (requested_preview->>'expires_at')::timestamptz;
  exception when others then
    raise exception 'Prévia do lote inválida' using errcode = '22023';
  end;
  if preview_expires_at <= now() then
    raise exception 'A prévia expirou' using errcode = '55000';
  end if;

  if exists (
    select 1 from jsonb_array_elements(requested_preview->'items') item
    where coalesce(item->>'id', '') !~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      or coalesce(item->>'version', '') !~ '^[0-9]+$'
  ) then
    raise exception 'Itens da prévia são inválidos' using errcode = '22023';
  end if;

  select array_agg((item->>'id')::uuid order by item->>'id')
  into requested_event_ids
  from jsonb_array_elements(requested_preview->'items') item;
  if cardinality(requested_event_ids) <> (
    select count(distinct item->>'id')
    from jsonb_array_elements(requested_preview->'items') item
  ) then
    raise exception 'A seleção contém registros repetidos' using errcode = '22023';
  end if;

  payload_hash := encode(extensions.digest(convert_to(jsonb_build_object(
    'domain', 'events',
    'team_id', requested_team_id,
    'action', requested_action,
    'payload', requested_payload,
    'items', (
      select jsonb_agg(jsonb_build_object(
        'id', item->>'id', 'version', (item->>'version')::bigint
      ) order by item->>'id')
      from jsonb_array_elements(requested_preview->'items') item
    )
  )::text, 'UTF8'), 'sha256'), 'hex');

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(request_id::text, 0)
  );
  insert into public.event_commands(
    team_id, request_id, actor_id, kind, payload_hash
  ) values (
    requested_team_id, request_id, current_user_id, 'update', payload_hash
  )
  on conflict on constraint event_commands_team_id_request_id_key do nothing
  returning id into command_id;

  if command_id is null then
    select command.payload_hash, command.result
    into existing_hash, command_result
    from public.event_commands command
    where command.team_id = requested_team_id
      and command.request_id = apply_event_batch_operation.request_id
    for update;
    if existing_hash <> payload_hash or command_result is null then
      raise exception 'Request id já usado com outro conteúdo'
        using errcode = '22023';
    end if;
    return command_result || jsonb_build_object('replayed', true);
  end if;

  perform event.id
  from public.events event
  where event.team_id = requested_team_id
    and event.id = any(requested_event_ids)
  order by event.id
  for update;

  if (select count(*) from public.events event
      where event.team_id = requested_team_id
        and event.id = any(requested_event_ids)) <> cardinality(requested_event_ids)
  then
    raise exception 'Seleção de eventos indisponível' using errcode = '42501';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(requested_preview->'items') item
    join public.events event
      on event.id = (item->>'id')::uuid
      and event.team_id = requested_team_id
    where event.schedule_version <> (item->>'version')::bigint
  ) then
    raise exception 'A agenda mudou; confira uma nova prévia' using errcode = '55000';
  end if;

  current_preview := public.preview_event_batch_operation(
    requested_team_id,
    requested_event_ids,
    requested_action,
    requested_payload,
    'selected'
  );
  if (current_preview->>'blocked_count')::integer <> 0 then
    raise exception 'Um jogo deixou de aceitar esta alteração' using errcode = '55000';
  end if;

  select team.timezone into team_timezone
  from public.teams team where team.id = requested_team_id;

  for preview_item in
    select item from jsonb_array_elements(requested_preview->'items') item
    order by item->>'id'
  loop
    select event.* into target_event
    from public.events event
    where event.id = (preview_item->>'id')::uuid
      and event.team_id = requested_team_id;

    previous_starts_at := target_event.starts_at;
    next_starts_at := case requested_action
      when 'shift_time' then target_event.starts_at
        + make_interval(mins => (requested_payload->>'offset_minutes')::integer)
      when 'set_local_time' then (
        (target_event.starts_at at time zone team_timezone)::date
        + (requested_payload->>'local_time')::time
      ) at time zone team_timezone
      else target_event.starts_at
    end;
    next_ends_at := case requested_action
      when 'set_duration' then next_starts_at
        + make_interval(mins => (requested_payload->>'duration_minutes')::integer)
      else next_starts_at + (target_event.ends_at - target_event.starts_at)
    end;
    update public.events event set
      starts_at = next_starts_at,
      ends_at = next_ends_at,
      attendance_deadline = case
        when next_starts_at <> target_event.starts_at
          then target_event.attendance_deadline + (next_starts_at - target_event.starts_at)
        else target_event.attendance_deadline
      end,
      schedule_version = event.schedule_version + 1
    where event.id = target_event.id and event.team_id = requested_team_id;

    if next_starts_at <> previous_starts_at then
      update public.notification_outbox outbox set
        status = 'cancelled', processed_at = now(),
        last_error = 'Evento remarcado por lote; comando invalidado pela versão da agenda.'
      where outbox.event_id = target_event.id
        and outbox.status in ('pending', 'failed');
    end if;

    select * into conflict_state
    from private.refresh_event_schedule_conflicts(requested_team_id, target_event.id);
    if conflict_state.hard_count > 0 then
      raise exception 'A alteração cria conflito bloqueante; revise a agenda'
        using errcode = '55000';
    end if;
    insert into public.event_changes(
      team_id, command_id, event_id, series_id, kind, scope,
      schedule_version, previous_status, next_status,
      previous_starts_at, next_starts_at
    )
    select event.team_id, command_id, event.id, event.series_id,
      case when event.starts_at <> previous_starts_at
        then 'rescheduled'::public.event_change_kind
        else 'details_updated'::public.event_change_kind end,
      'single_event', event.schedule_version, target_event.status, event.status,
      previous_starts_at, event.starts_at
    from public.events event where event.id = target_event.id;

    affected_count := affected_count + 1;
    max_version := greatest(max_version, target_event.schedule_version + 1);
  end loop;

  command_result := jsonb_build_object(
    'request_id', request_id,
    'applied_count', affected_count,
    'max_schedule_version', max_version,
    'replayed', false,
    'communication', 'not_requested'
  );
  update public.event_commands command set result = command_result
  where command.id = command_id;

  insert into public.audit_logs(
    team_id, actor_id, action, entity_type, entity_id, metadata, request_id
  ) values (
    requested_team_id, current_user_id, 'event.batch_updated',
    'event_batch', request_id::text,
    jsonb_build_object('action', requested_action, 'affected_count', affected_count),
    request_id::text
  );

  return command_result;
end;
$$;

revoke all on function public.apply_event_batch_operation(uuid,jsonb,uuid)
  from public,anon,authenticated;
grant execute on function public.apply_event_batch_operation(uuid,jsonb,uuid)
  to authenticated;

comment on function public.apply_event_batch_operation(uuid,jsonb,uuid) is
  'Aplica atomicamente alterações uniformes de horário ou duração a até 50 jogos selecionados, com revalidação e replay idempotente.';
