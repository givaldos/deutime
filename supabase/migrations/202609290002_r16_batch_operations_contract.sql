-- R16 / WP-R16-06 / BAT-01 — prévias sem escrita e assinaturas fail-closed.

create or replace function private.require_batch_operations_access(
  requested_team_id uuid,
  required_feature public.feature_key
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null
    or not private.is_team_staff(requested_team_id)
    or not private.is_team_feature_enabled(requested_team_id, 'batch_operations')
    or not private.is_team_feature_enabled(requested_team_id, required_feature)
  then
    raise exception 'Operações em lote indisponíveis' using errcode = '42501';
  end if;
  return current_user_id;
end;
$$;

create or replace function public.preview_event_batch_operation(
  requested_team_id uuid,
  requested_event_ids uuid[],
  requested_action text,
  requested_payload jsonb default '{}'::jsonb,
  requested_scope text default 'selected'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '8s'
as $$
declare
  team_timezone text;
  target_series_id uuid;
  target_series_position integer;
  resolved_event_ids uuid[];
  selected_count integer;
  previewed_at timestamptz := now();
  preview_items jsonb;
  blocked_count integer;
  venue_exists boolean;
begin
  perform private.require_batch_operations_access(
    requested_team_id, 'professional_scheduling'
  );
  if not private.is_team_feature_enabled(requested_team_id, 'event_control') then
    raise exception 'Operações em lote indisponíveis' using errcode = '42501';
  end if;

  if requested_event_ids is null
    or cardinality(requested_event_ids) < 1
    or cardinality(requested_event_ids) > 50
    or requested_scope not in ('selected', 'this_and_future')
    or requested_action not in (
      'shift_time', 'set_local_time', 'set_venue', 'set_duration',
      'postpone', 'date_tbd', 'cancel'
    )
    or jsonb_typeof(coalesce(requested_payload, '{}'::jsonb)) <> 'object'
  then
    raise exception 'Seleção ou ação do lote inválida' using errcode = '22023';
  end if;

  select count(distinct item)::integer into selected_count
  from unnest(requested_event_ids) item;
  if selected_count <> cardinality(requested_event_ids) then
    raise exception 'A seleção contém registros repetidos' using errcode = '22023';
  end if;

  select team.timezone into team_timezone
  from public.teams team where team.id = requested_team_id;

  if requested_scope = 'this_and_future' then
    if cardinality(requested_event_ids) <> 1 then
      raise exception 'Este e os próximos exige uma ocorrência' using errcode = '22023';
    end if;
    select event.series_id, event.series_position
    into target_series_id, target_series_position
    from public.events event
    where event.id = requested_event_ids[1]
      and event.team_id = requested_team_id;
    if target_series_id is null then
      raise exception 'Ocorrência não pertence a uma série' using errcode = '55000';
    end if;
    select array_agg(event.id order by event.series_position, event.id)
    into resolved_event_ids
    from public.events event
    where event.team_id = requested_team_id
      and event.series_id = target_series_id
      and event.series_position >= target_series_position
      and event.status = 'scheduled'
      and event.starts_at > now()
      and (event.is_series_exception is false or event.id = requested_event_ids[1]);
  else
    select array_agg(item order by item) into resolved_event_ids
    from unnest(requested_event_ids) item;
  end if;

  if resolved_event_ids is null or cardinality(resolved_event_ids) > 50 then
    raise exception 'O lote deve conter entre 1 e 50 registros' using errcode = '22023';
  end if;
  if (select count(*) from public.events event
      where event.team_id = requested_team_id
        and event.id = any(resolved_event_ids)) <> cardinality(resolved_event_ids)
  then
    raise exception 'Seleção de eventos indisponível' using errcode = '42501';
  end if;

  if requested_action = 'shift_time' and (
      coalesce(requested_payload->>'offset_minutes', '') !~ '^-?[0-9]+$'
      or (requested_payload->>'offset_minutes')::integer = 0
      or abs((requested_payload->>'offset_minutes')::integer) > 10080
    ) then
    raise exception 'Deslocamento deve ficar entre -10080 e 10080 minutos' using errcode = '22023';
  elsif requested_action = 'set_local_time' and
    coalesce(requested_payload->>'local_time', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  then
    raise exception 'Horário civil inválido' using errcode = '22023';
  elsif requested_action = 'set_duration' and (
      coalesce(requested_payload->>'duration_minutes', '') !~ '^[0-9]+$'
      or (requested_payload->>'duration_minutes')::integer not between 15 and 480
    ) then
    raise exception 'Duração deve ficar entre 15 e 480 minutos' using errcode = '22023';
  elsif requested_action = 'set_venue' then
    if coalesce(requested_payload->>'venue_id', '') !~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then
      raise exception 'Local inválido' using errcode = '22023';
    end if;
    select exists(select 1 from public.venues venue
      where venue.id = (requested_payload->>'venue_id')::uuid
        and venue.team_id = requested_team_id) into venue_exists;
    if not venue_exists then
      raise exception 'Local inválido' using errcode = '22023';
    end if;
  end if;

  with current_rows as (
    select
      event.*,
      venue.name as venue_name,
      exists(select 1 from public.event_matches match
        where match.event_id = event.id and match.team_id = event.team_id
          and match.status = 'finalized') as has_finalized_match,
      exists(select 1 from public.event_matches match
        join public.championship_fixtures fixture
          on fixture.match_id = match.id and fixture.team_id = match.team_id
        where match.event_id = event.id and match.team_id = event.team_id) as has_championship,
      exists(select 1 from public.event_schedule_conflicts conflict
        where conflict.event_id = event.id and conflict.team_id = event.team_id
          and conflict.status = 'pending' and conflict.severity = 'hard'
          and conflict.detected_schedule_version = event.schedule_version) as has_hard_conflict,
      (select count(*)::integer from public.event_schedule_conflicts conflict
        where conflict.event_id = event.id and conflict.team_id = event.team_id
          and conflict.status = 'pending'
          and conflict.detected_schedule_version = event.schedule_version) as pending_conflicts
    from public.events event
    left join public.venues venue
      on venue.id = event.venue_id and venue.team_id = event.team_id
    where event.team_id = requested_team_id
      and event.id = any(resolved_event_ids)
  ), projected as (
    select current_rows.*,
      case requested_action
        when 'shift_time' then starts_at + make_interval(mins => (requested_payload->>'offset_minutes')::integer)
        when 'set_local_time' then (
          (starts_at at time zone team_timezone)::date
          + (requested_payload->>'local_time')::time
        ) at time zone team_timezone
        else starts_at
      end as next_starts_at,
      case requested_action
        when 'set_venue' then (requested_payload->>'venue_id')::uuid
        else venue_id
      end as next_venue_id
    from current_rows
  ), assessed as (
    select projected.*,
      case
        when status <> 'scheduled' or starts_at <= now() then 'not_upcoming'
        when has_finalized_match then 'finalized_match'
        when requested_action in ('shift_time','set_local_time') and next_starts_at <= now() then 'result_not_future'
        when has_hard_conflict then 'hard_conflict'
        when requested_action = 'cancel' and series_id is not null then 'series_requires_explicit_scope'
        when requested_action = 'cancel' and has_championship then 'championship_operation_required'
        else null
      end as blocker_code
    from projected
  )
  select
    jsonb_agg(jsonb_build_object(
      'id', assessed.id,
      'title', assessed.title,
      'eligible', assessed.blocker_code is null,
      'blocker_code', assessed.blocker_code,
      'conflict_count', assessed.pending_conflicts,
      'version', assessed.schedule_version,
      'before', jsonb_build_object(
        'starts_at', assessed.starts_at,
        'ends_at', assessed.ends_at,
        'venue_id', assessed.venue_id,
        'venue_name', assessed.venue_name,
        'schedule_state', assessed.professional_schedule_state,
        'status', assessed.status
      ),
      'after', jsonb_build_object(
        'starts_at', assessed.next_starts_at,
        'ends_at', case
          when requested_action = 'set_duration' then assessed.next_starts_at
            + make_interval(mins => (requested_payload->>'duration_minutes')::integer)
          else assessed.next_starts_at + (assessed.ends_at - assessed.starts_at)
        end,
        'venue_id', assessed.next_venue_id,
        'schedule_state', case requested_action
          when 'postpone' then 'postponed'
          when 'date_tbd' then 'date_tbd'
          else assessed.professional_schedule_state::text
        end,
        'status', case when requested_action = 'cancel' then 'cancelled'
          else assessed.status::text end
      )
    ) order by assessed.starts_at, assessed.id),
    count(*) filter (where assessed.blocker_code is not null)::integer
  into preview_items, blocked_count
  from assessed;

  return jsonb_build_object(
    'domain', 'events',
    'action', requested_action,
    'scope', requested_scope,
    'previewed_at', previewed_at,
    'expires_at', previewed_at + interval '15 minutes',
    'selection_hash', encode(extensions.digest(convert_to(jsonb_build_object(
      'team_id', requested_team_id,
      'action', requested_action,
      'scope', requested_scope,
      'payload', requested_payload,
      'items', preview_items,
      'previewed_at', previewed_at
    )::text, 'UTF8'), 'sha256'), 'hex'),
    'item_count', cardinality(resolved_event_ids),
    'blocked_count', blocked_count,
    'items', preview_items
  );
end;
$$;

create or replace function public.preview_athlete_review_batch(
  requested_team_id uuid,
  requested_athlete_ids uuid[],
  requested_decision text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '8s'
as $$
declare
  previewed_at timestamptz := now();
  preview_items jsonb;
  blocked_count integer;
  selected_count integer;
begin
  perform private.require_batch_operations_access(
    requested_team_id, 'recognizable_roster'
  );
  if requested_athlete_ids is null
    or cardinality(requested_athlete_ids) < 1
    or cardinality(requested_athlete_ids) > 50
    or requested_decision not in ('approve', 'reject')
  then
    raise exception 'Seleção ou decisão do lote inválida' using errcode = '22023';
  end if;
  select count(distinct item)::integer into selected_count
  from unnest(requested_athlete_ids) item;
  if selected_count <> cardinality(requested_athlete_ids) then
    raise exception 'A seleção contém registros repetidos' using errcode = '22023';
  end if;
  if (select count(*) from public.athletes athlete
      where athlete.team_id = requested_team_id
        and athlete.id = any(requested_athlete_ids)) <> cardinality(requested_athlete_ids)
  then
    raise exception 'Seleção de atletas indisponível' using errcode = '42501';
  end if;

  select jsonb_agg(jsonb_build_object(
      'id', athlete.id,
      'name', coalesce(nullif(athlete.preferred_name, ''), athlete.full_name),
      'eligible', athlete.status = 'pending',
      'blocker_code', case when athlete.status = 'pending' then null else 'not_pending' end,
      'version', athlete.updated_at,
      'before', jsonb_build_object('status', athlete.status),
      'after', jsonb_build_object('status', case requested_decision
        when 'approve' then 'active' else 'rejected' end)
    ) order by coalesce(nullif(athlete.preferred_name, ''), athlete.full_name), athlete.id),
    count(*) filter (where athlete.status <> 'pending')::integer
  into preview_items, blocked_count
  from public.athletes athlete
  where athlete.team_id = requested_team_id
    and athlete.id = any(requested_athlete_ids);

  return jsonb_build_object(
    'domain', 'athletes',
    'action', requested_decision,
    'scope', 'selected',
    'previewed_at', previewed_at,
    'expires_at', previewed_at + interval '15 minutes',
    'selection_hash', encode(extensions.digest(convert_to(jsonb_build_object(
      'team_id', requested_team_id,
      'decision', requested_decision,
      'items', preview_items,
      'previewed_at', previewed_at
    )::text, 'UTF8'), 'sha256'), 'hex'),
    'item_count', cardinality(requested_athlete_ids),
    'blocked_count', blocked_count,
    'items', preview_items
  );
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
set statement_timeout = '8s'
as $$
begin
  perform private.require_batch_operations_access(
    requested_team_id, 'professional_scheduling'
  );
  if not private.is_team_feature_enabled(requested_team_id, 'event_control') then
    raise exception 'Operações em lote indisponíveis' using errcode = '42501';
  end if;
  if requested_preview is null or requested_preview->>'domain' <> 'events'
    or coalesce(requested_preview->>'selection_hash', '') !~ '^[0-9a-f]{64}$'
    or request_id is null
  then
    raise exception 'Prévia do lote inválida' using errcode = '22023';
  end if;
  if (requested_preview->>'expires_at')::timestamptz <= now() then
    raise exception 'A prévia expirou' using errcode = '55000';
  end if;
  raise exception 'Confirmação de jogos ainda indisponível neste checkpoint'
    using errcode = 'P0001';
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
set statement_timeout = '8s'
as $$
begin
  perform private.require_batch_operations_access(
    requested_team_id, 'recognizable_roster'
  );
  if requested_preview is null or requested_preview->>'domain' <> 'athletes'
    or coalesce(requested_preview->>'selection_hash', '') !~ '^[0-9a-f]{64}$'
    or request_id is null
  then
    raise exception 'Prévia do lote inválida' using errcode = '22023';
  end if;
  if (requested_preview->>'expires_at')::timestamptz <= now() then
    raise exception 'A prévia expirou' using errcode = '55000';
  end if;
  raise exception 'Confirmação de atletas ainda indisponível neste checkpoint'
    using errcode = 'P0001';
end;
$$;

revoke all on function private.require_batch_operations_access(uuid,public.feature_key)
  from public;
revoke all on function public.preview_event_batch_operation(uuid,uuid[],text,jsonb,text)
  from public,anon,authenticated;
revoke all on function public.preview_athlete_review_batch(uuid,uuid[],text)
  from public,anon,authenticated;
revoke all on function public.apply_event_batch_operation(uuid,jsonb,uuid)
  from public,anon,authenticated;
revoke all on function public.apply_athlete_review_batch(uuid,jsonb,uuid)
  from public,anon,authenticated;

grant execute on function public.preview_event_batch_operation(uuid,uuid[],text,jsonb,text)
  to authenticated;
grant execute on function public.preview_athlete_review_batch(uuid,uuid[],text)
  to authenticated;
grant execute on function public.apply_event_batch_operation(uuid,jsonb,uuid)
  to authenticated;
grant execute on function public.apply_athlete_review_batch(uuid,jsonb,uuid)
  to authenticated;

comment on function public.preview_event_batch_operation(uuid,uuid[],text,jsonb,text) is
  'Prévia read-only de até 50 jogos, com versões, antes/depois e impedimentos; não executa alteração nem comunicação.';
comment on function public.preview_athlete_review_batch(uuid,uuid[],text) is
  'Prévia read-only de até 50 análises de cadastro, sem alterar atleta, presença ou comunicação.';
comment on function public.apply_event_batch_operation(uuid,jsonb,uuid) is
  'Assinatura fail-closed reservada para BAT-02; nenhuma escrita é aceita no CP1.';
comment on function public.apply_athlete_review_batch(uuid,jsonb,uuid) is
  'Assinatura fail-closed reservada para BAT-03; nenhuma escrita é aceita no CP1.';
