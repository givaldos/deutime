-- R16 / WP-R16-06 / BAT-03 — séries, transições e análise de atletas em lote.

alter function public.apply_event_batch_operation(uuid, jsonb, uuid)
  set schema private;
alter function private.apply_event_batch_operation(uuid, jsonb, uuid)
  rename to apply_event_batch_basic;
revoke all on function private.apply_event_batch_basic(uuid, jsonb, uuid)
  from public, anon, authenticated;

do $migration$
declare
  function_source text;
begin
  select procedure.prosrc into function_source
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'private'
    and procedure.proname = 'apply_event_batch_basic'
    and pg_get_function_identity_arguments(procedure.oid) = 'requested_team_id uuid, requested_preview jsonb, request_id uuid';
  execute format(
    'create or replace function private.apply_event_batch_basic(requested_team_id uuid, requested_preview jsonb, request_id uuid) returns jsonb language plpgsql security definer set search_path='''' set statement_timeout=''10s'' as %L',
    replace(function_source, 'apply_event_batch_operation.request_id', 'apply_event_batch_basic.request_id')
  );
end;
$migration$;

create table private.athlete_batch_commands (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  request_id uuid not null,
  actor_id uuid not null references auth.users (id) on delete restrict,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  result jsonb,
  created_at timestamptz not null default now(),
  unique (team_id, request_id)
);
revoke all on private.athlete_batch_commands from public, anon, authenticated;

create or replace function private.apply_event_batch_extended(
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
  current_user_id uuid := (select auth.uid());
  requested_action text := requested_preview->>'action';
  requested_scope text := requested_preview->>'scope';
  requested_payload jsonb := requested_preview->'payload';
  requested_event_ids uuid[];
  payload_hash text;
  command_id uuid;
  existing_hash text;
  command_result jsonb;
  preview_item jsonb;
  target_event public.events%rowtype;
  current_preview jsonb;
  resolved_series_id uuid;
  expected_series_ids uuid[];
  first_series_position integer;
  affected_count integer := 0;
  max_version bigint := 0;
begin
  if requested_preview is null
    or requested_preview->>'domain' <> 'events'
    or requested_scope not in ('selected', 'this_and_future')
    or requested_action not in ('set_venue', 'postpone', 'date_tbd', 'cancel')
    or jsonb_typeof(requested_payload) <> 'object'
    or jsonb_typeof(requested_preview->'items') <> 'array'
    or coalesce(requested_preview->>'item_count', '') !~ '^[0-9]+$'
    or (requested_preview->>'item_count')::integer not between 1 and 50
    or jsonb_array_length(requested_preview->'items') <> (requested_preview->>'item_count')::integer
    or coalesce(requested_preview->>'blocked_count', '-1') <> '0'
    or coalesce(requested_preview->>'selection_hash', '') !~ '^[0-9a-f]{64}$'
    or request_id is null
  then
    raise exception 'Prévia do lote inválida' using errcode = '22023';
  end if;
  if (requested_preview->>'expires_at')::timestamptz <= now() then
    raise exception 'A prévia expirou' using errcode = '55000';
  end if;
  if requested_action = 'cancel' and requested_scope <> 'selected' then
    raise exception 'Cancelamento em lote aceita somente eventos avulsos selecionados' using errcode = '22023';
  end if;

  select array_agg((item->>'id')::uuid order by item->>'id')
  into requested_event_ids
  from jsonb_array_elements(requested_preview->'items') item;
  if cardinality(requested_event_ids) <> cardinality(array(select distinct unnest(requested_event_ids))) then
    raise exception 'A seleção contém registros repetidos' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(requested_team_id::text), hashtext(request_id::text));
  payload_hash := encode(extensions.digest(convert_to(jsonb_build_object(
    'domain', 'events', 'action', requested_action, 'scope', requested_scope,
    'payload', requested_payload, 'selection_hash', requested_preview->>'selection_hash'
  )::text, 'UTF8'), 'sha256'), 'hex');
  insert into public.event_commands(team_id, request_id, actor_id, kind, payload_hash, event_id)
  values (requested_team_id, request_id, current_user_id,
    case when requested_action = 'cancel' then 'cancel'::public.event_command_kind else 'update'::public.event_command_kind end,
    payload_hash, requested_event_ids[1])
  on conflict on constraint event_commands_team_id_request_id_key do nothing
  returning id into command_id;
  if command_id is null then
    select command.id, command.payload_hash, command.result
    into command_id, existing_hash, command_result
    from public.event_commands command
    where command.team_id = requested_team_id and command.request_id = apply_event_batch_extended.request_id
    for update;
    if existing_hash <> payload_hash or command_result is null then
      raise exception 'Request ID já utilizado com outro conteúdo' using errcode = '22023';
    end if;
    return command_result || jsonb_build_object('replayed', true);
  end if;

  perform 1 from public.events event
  where event.team_id = requested_team_id and event.id = any(requested_event_ids)
  order by event.id for update;
  if (select count(*) from public.events event
      where event.team_id = requested_team_id and event.id = any(requested_event_ids))
      <> cardinality(requested_event_ids)
  then
    raise exception 'Seleção de eventos indisponível' using errcode = '42501';
  end if;

  for preview_item in select item from jsonb_array_elements(requested_preview->'items') item loop
    select event.* into target_event from public.events event
    where event.team_id = requested_team_id and event.id = (preview_item->>'id')::uuid;
    if target_event.schedule_version <> (preview_item->>'version')::bigint then
      raise exception 'A agenda mudou desde a prévia' using errcode = '55000';
    end if;
  end loop;

  if requested_scope = 'this_and_future' then
    select requested_event.series_id, min(event.series_position)
    into resolved_series_id, first_series_position
    from public.events requested_event
    join public.events event on event.id = any(requested_event_ids)
      and event.team_id = requested_team_id
    where requested_event.id = requested_event_ids[1]
      and requested_event.team_id = requested_team_id
    group by requested_event.series_id;
    if resolved_series_id is null or exists (
      select 1 from public.events event where event.id = any(requested_event_ids)
        and event.team_id = requested_team_id and event.series_id is distinct from resolved_series_id
    ) then
      raise exception 'O alcance exige uma única série' using errcode = '55000';
    end if;
    select array_agg(event.id order by event.id) into expected_series_ids
    from public.events event where event.team_id = requested_team_id
      and event.series_id = resolved_series_id and event.series_position >= first_series_position
      and event.status = 'scheduled' and event.starts_at > now()
      and (event.is_series_exception is false or event.series_position = first_series_position);
    if expected_series_ids is distinct from requested_event_ids then
      raise exception 'As ocorrências da série mudaram desde a prévia' using errcode = '55000';
    end if;
  end if;

  current_preview := public.preview_event_batch_operation(
    requested_team_id, requested_event_ids, requested_action, requested_payload, 'selected'
  );
  if (current_preview->>'blocked_count')::integer <> 0 then
    raise exception 'Um ou mais jogos não podem ser alterados' using errcode = '55000';
  end if;

  for target_event in select event.* from public.events event
    where event.team_id = requested_team_id and event.id = any(requested_event_ids)
    order by event.id
  loop
    update public.events event set
      venue_id = case when requested_action = 'set_venue'
        then (requested_payload->>'venue_id')::uuid else event.venue_id end,
      professional_schedule_state = case requested_action
        when 'postpone' then 'postponed'::public.professional_schedule_state
        when 'date_tbd' then 'date_tbd'::public.professional_schedule_state
        else event.professional_schedule_state end,
      status = case when requested_action = 'cancel'
        then 'cancelled'::public.event_status else event.status end,
      cancelled_at = case when requested_action = 'cancel' then now() else event.cancelled_at end,
      cancelled_by = case when requested_action = 'cancel' then current_user_id else event.cancelled_by end,
      schedule_version = event.schedule_version + 1,
      is_series_exception = case when requested_scope = 'selected' and event.series_id is not null
        then true else event.is_series_exception end
    where event.id = target_event.id and event.team_id = requested_team_id;

    update public.notification_outbox outbox set status = 'cancelled', processed_at = now(),
      last_error = 'Agenda alterada; intenção invalidada pela nova revisão.'
    where outbox.event_id = target_event.id and outbox.status = 'pending';
    update public.event_schedule_conflicts conflict set status = 'resolved', accepted_by = null, accepted_at = null
    where conflict.event_id = target_event.id and conflict.status = 'pending';
    if requested_action = 'set_venue' then
      perform * from private.refresh_event_schedule_conflicts(requested_team_id, target_event.id);
      if exists(select 1 from public.event_schedule_conflicts conflict
        where conflict.event_id = target_event.id and conflict.team_id = requested_team_id
          and conflict.status = 'pending' and conflict.severity = 'hard')
      then
        raise exception 'A alteração cria um conflito bloqueante' using errcode = '55000';
      end if;
    end if;
    insert into public.event_changes(team_id, command_id, event_id, series_id, kind, scope,
      schedule_version, previous_status, next_status, previous_starts_at, next_starts_at)
    values (requested_team_id, command_id, target_event.id, target_event.series_id,
      case when requested_action = 'cancel' then 'cancelled'::public.event_change_kind
        else 'details_updated'::public.event_change_kind end,
      case when requested_scope = 'this_and_future' then 'this_and_future' else 'single_event' end,
      target_event.schedule_version + 1, target_event.status,
      case when requested_action = 'cancel' then 'cancelled'::public.event_status else target_event.status end,
      target_event.starts_at, target_event.starts_at);
    affected_count := affected_count + 1;
    max_version := greatest(max_version, target_event.schedule_version + 1);
  end loop;

  command_result := jsonb_build_object('request_id', request_id, 'applied_count', affected_count,
    'max_schedule_version', max_version, 'replayed', false, 'communication', 'not_requested');
  update public.event_commands command set result = command_result where command.id = command_id;
  insert into public.audit_logs(team_id, actor_id, action, entity_type, entity_id, metadata, request_id)
  values (requested_team_id, current_user_id, 'batch.events.applied', 'team', requested_team_id::text,
    jsonb_build_object('batch_action', requested_action, 'scope', requested_scope,
      'item_count', affected_count, 'communication', 'not_requested'), request_id::text);
  return command_result;
end;
$$;

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
  requested_action text := requested_preview->>'action';
begin
  perform private.require_batch_operations_access(requested_team_id, 'professional_scheduling');
  if not private.is_team_feature_enabled(requested_team_id, 'event_control') then
    raise exception 'Operações em lote indisponíveis' using errcode = '42501';
  end if;
  if requested_action in ('shift_time', 'set_local_time', 'set_duration') then
    return private.apply_event_batch_basic(requested_team_id, requested_preview, request_id);
  end if;
  return private.apply_event_batch_extended(requested_team_id, requested_preview, request_id);
end;
$$;

create or replace function public.apply_athlete_review_batch(
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
  requested_decision text := requested_preview->>'action';
  requested_athlete_ids uuid[];
  payload_hash text;
  command_id uuid;
  existing_hash text;
  command_result jsonb;
  preview_item jsonb;
  target_athlete public.athletes%rowtype;
  current_preview jsonb;
  affected_count integer := 0;
begin
  current_user_id := private.require_batch_operations_access(requested_team_id, 'recognizable_roster');
  if requested_preview is null or requested_preview->>'domain' <> 'athletes'
    or requested_preview->>'scope' <> 'selected'
    or requested_decision not in ('approve', 'reject')
    or jsonb_typeof(requested_preview->'items') <> 'array'
    or coalesce(requested_preview->>'item_count', '') !~ '^[0-9]+$'
    or (requested_preview->>'item_count')::integer not between 1 and 50
    or jsonb_array_length(requested_preview->'items') <> (requested_preview->>'item_count')::integer
    or coalesce(requested_preview->>'blocked_count', '-1') <> '0'
    or coalesce(requested_preview->>'selection_hash', '') !~ '^[0-9a-f]{64}$'
    or request_id is null
  then
    raise exception 'Prévia do lote inválida' using errcode = '22023';
  end if;
  if (requested_preview->>'expires_at')::timestamptz <= now() then
    raise exception 'A prévia expirou' using errcode = '55000';
  end if;
  select array_agg((item->>'id')::uuid order by item->>'id') into requested_athlete_ids
  from jsonb_array_elements(requested_preview->'items') item;
  if cardinality(requested_athlete_ids) <> cardinality(array(select distinct unnest(requested_athlete_ids))) then
    raise exception 'A seleção contém registros repetidos' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(requested_team_id::text), hashtext(request_id::text));
  payload_hash := encode(extensions.digest(convert_to(jsonb_build_object(
    'domain', 'athletes', 'decision', requested_decision,
    'selection_hash', requested_preview->>'selection_hash'
  )::text, 'UTF8'), 'sha256'), 'hex');
  insert into private.athlete_batch_commands(team_id, request_id, actor_id, payload_hash)
  values (requested_team_id, request_id, current_user_id, payload_hash)
  on conflict on constraint athlete_batch_commands_team_id_request_id_key
  do nothing returning id into command_id;
  if command_id is null then
    select command.id, command.payload_hash, command.result into command_id, existing_hash, command_result
    from private.athlete_batch_commands command
    where command.team_id = requested_team_id and command.request_id = apply_athlete_review_batch.request_id
    for update;
    if existing_hash <> payload_hash or command_result is null then
      raise exception 'Request ID já utilizado com outro conteúdo' using errcode = '22023';
    end if;
    return command_result || jsonb_build_object('replayed', true);
  end if;

  perform 1 from public.athletes athlete
  where athlete.team_id = requested_team_id and athlete.id = any(requested_athlete_ids)
  order by athlete.id for update;
  if (select count(*) from public.athletes athlete
      where athlete.team_id = requested_team_id and athlete.id = any(requested_athlete_ids))
      <> cardinality(requested_athlete_ids)
  then
    raise exception 'Seleção de atletas indisponível' using errcode = '42501';
  end if;
  for preview_item in select item from jsonb_array_elements(requested_preview->'items') item loop
    select athlete.* into target_athlete from public.athletes athlete
    where athlete.team_id = requested_team_id and athlete.id = (preview_item->>'id')::uuid;
    if target_athlete.updated_at <> (preview_item->>'version')::timestamptz then
      raise exception 'O cadastro mudou desde a prévia' using errcode = '55000';
    end if;
  end loop;
  current_preview := public.preview_athlete_review_batch(
    requested_team_id, requested_athlete_ids, requested_decision
  );
  if (current_preview->>'blocked_count')::integer <> 0 then
    raise exception 'Um ou mais cadastros não podem ser analisados' using errcode = '55000';
  end if;

  update public.athletes athlete set
    status = case requested_decision when 'approve' then 'active'::public.athlete_status else 'rejected'::public.athlete_status end,
    joined_on = case when requested_decision = 'approve' then coalesce(athlete.joined_on, current_date) else athlete.joined_on end,
    approved_at = case when requested_decision = 'approve' then now() else null end,
    approved_by = case when requested_decision = 'approve' then current_user_id else null end
  where athlete.team_id = requested_team_id and athlete.id = any(requested_athlete_ids)
    and athlete.status = 'pending';
  get diagnostics affected_count = row_count;
  if affected_count <> cardinality(requested_athlete_ids) then
    raise exception 'Um cadastro mudou durante a confirmação' using errcode = '55000';
  end if;
  if requested_decision = 'approve' then
    insert into public.event_attendance(event_id, team_id, athlete_id)
    select event.id, event.team_id, athlete.id
    from public.events event cross join public.athletes athlete
    where event.team_id = requested_team_id and event.status = 'scheduled' and event.starts_at > now()
      and athlete.team_id = requested_team_id and athlete.id = any(requested_athlete_ids)
    on conflict (event_id, athlete_id) do nothing;
  end if;
  command_result := jsonb_build_object('request_id', request_id, 'applied_count', affected_count,
    'replayed', false, 'communication', 'not_requested');
  update private.athlete_batch_commands command set result = command_result where command.id = command_id;
  insert into public.audit_logs(team_id, actor_id, action, entity_type, entity_id, metadata, request_id)
  values (requested_team_id, current_user_id, 'batch.athletes.reviewed', 'team', requested_team_id::text,
    jsonb_build_object('decision', requested_decision, 'item_count', affected_count,
      'communication', 'not_requested'), request_id::text);
  return command_result;
end;
$$;

revoke all on function private.apply_event_batch_extended(uuid, jsonb, uuid) from public;
revoke all on function private.apply_event_batch_basic(uuid, jsonb, uuid) from public;
revoke all on function public.apply_event_batch_operation(uuid, jsonb, uuid)
  from public, anon, authenticated;
revoke all on function public.apply_athlete_review_batch(uuid, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.apply_event_batch_operation(uuid, jsonb, uuid) to authenticated;
grant execute on function public.apply_athlete_review_batch(uuid, jsonb, uuid) to authenticated;

comment on function public.apply_event_batch_operation(uuid, jsonb, uuid) is
  'Aplica alterações uniformes, séries e transições elegíveis em até 50 jogos, de forma atômica e idempotente, sem comunicação implícita.';
comment on function public.apply_athlete_review_batch(uuid, jsonb, uuid) is
  'Aprova ou rejeita até 50 cadastros pendentes do mesmo time, de forma atômica e idempotente, sem comunicação implícita.';
