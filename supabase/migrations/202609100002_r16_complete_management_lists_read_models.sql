-- R16 / WP-R16-02 / LIST-01 — read models paginados para Jogos e Campeonatos.
-- Expansão compatível com app N: nenhuma leitura antiga é removida e as RPCs
-- falham fechado enquanto complete_management_lists estiver desligada.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists btree_gin with schema extensions;

create type public.management_event_view as enum (
  'upcoming', 'reschedule', 'completed', 'cancelled'
);

create or replace function private.normalize_management_search(requested_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary,
      regexp_replace(coalesce(requested_text, ''), '[[:cntrl:]]+', ' ', 'g')
    )),
    '[[:space:]]+', ' ', 'g'
  ));
$$;

create or replace function private.escape_management_like(requested_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select replace(replace(replace(requested_text, '\', '\\'), '%', '\%'), '_', '\_');
$$;

create index events_management_upcoming_idx
  on public.events(team_id, starts_at, id)
  where status = 'scheduled'
    and professional_schedule_state in ('scheduled', 'pending_review');

create index events_management_reschedule_idx
  on public.events(team_id, updated_at desc, id desc)
  where status = 'scheduled';

create index events_management_history_idx
  on public.events(team_id, status, starts_at desc, id desc)
  where status in ('completed', 'cancelled');

create index events_management_search_idx
  on public.events using gin (
    team_id extensions.uuid_ops,
    private.normalize_management_search(title || ' ' || coalesce(opponent_name, ''))
    extensions.gin_trgm_ops
  );

create index event_squads_management_internal_team_idx
  on public.event_squads(team_id, source_internal_team_id, event_id)
  where source_internal_team_id is not null;

create index championship_fixtures_management_match_idx
  on public.championship_fixtures(team_id, match_id, championship_id)
  where match_id is not null;

create index championships_management_list_idx
  on public.championships(team_id, status, updated_at desc, id desc);

create index championships_management_format_created_idx
  on public.championships(team_id, format, created_at desc, id desc);

create index championships_management_search_idx
  on public.championships using gin (
    team_id extensions.uuid_ops,
    private.normalize_management_search(name) extensions.gin_trgm_ops
  );

create or replace function public.list_management_events(
  requested_team_id uuid,
  requested_view public.management_event_view,
  requested_search text default null,
  requested_period_start date default null,
  requested_period_end date default null,
  requested_kind public.event_kind default null,
  requested_internal_team_id uuid default null,
  requested_championship_id uuid default null,
  requested_limit integer default 24,
  requested_cursor jsonb default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  normalized_search text;
  team_timezone text;
  period_start_at timestamptz;
  period_end_at timestamptz;
  cursor_rank integer;
  cursor_at timestamptz;
  cursor_id uuid;
  effective_now timestamptz := statement_timestamp();
  result jsonb;
begin
  if (select auth.uid()) is null
    or not private.is_team_staff(requested_team_id)
  then
    raise exception 'Lista de jogos indisponível' using errcode = '42501';
  end if;

  if not private.is_team_feature_enabled(
    requested_team_id, 'complete_management_lists'::public.feature_key
  ) then
    raise exception 'Listas completas indisponíveis' using errcode = 'P0001';
  end if;

  if requested_view is null
    or requested_limit is null
    or requested_limit not between 1 and 50
  then
    raise exception 'Filtros de jogos inválidos' using errcode = '22023';
  end if;

  normalized_search := private.normalize_management_search(requested_search);
  if requested_search is not null
    and char_length(normalized_search) not between 2 and 80
  then
    raise exception 'Busca deve ter entre 2 e 80 caracteres' using errcode = '22023';
  end if;

  if (requested_period_start is null) <> (requested_period_end is null)
    or requested_period_end < requested_period_start
  then
    raise exception 'Período de jogos inválido' using errcode = '22023';
  end if;

  select team.timezone into team_timezone
  from public.teams team
  where team.id = requested_team_id;

  if requested_period_start is not null then
    period_start_at := requested_period_start::timestamp at time zone team_timezone;
    period_end_at := (requested_period_end + 1)::timestamp at time zone team_timezone;
  end if;

  if requested_cursor is not null then
    if jsonb_typeof(requested_cursor) <> 'object'
      or requested_cursor - array['rank', 'sort_at', 'id'] <> '{}'::jsonb
      or not requested_cursor ?& array['rank', 'sort_at', 'id']
    then
      raise exception 'Cursor de jogos inválido' using errcode = '22023';
    end if;
    begin
      cursor_rank := (requested_cursor ->> 'rank')::integer;
      cursor_at := (requested_cursor ->> 'sort_at')::timestamptz;
      cursor_id := (requested_cursor ->> 'id')::uuid;
    exception when others then
      raise exception 'Cursor de jogos inválido' using errcode = '22023';
    end;
    if cursor_rank not between 0 and 1
      or (requested_view <> 'reschedule' and cursor_rank <> 0)
    then
      raise exception 'Cursor de jogos inválido' using errcode = '22023';
    end if;
  end if;

  with filtered as materialized (
    select
      event.id,
      event.title,
      event.kind,
      event.sport_format,
      event.starts_at,
      event.ends_at,
      event.status,
      event.professional_schedule_state,
      venue.name as venue_name,
      coalesce(attendance.confirmed_count, 0) as confirmed_count,
      coalesce(attendance.total_count, 0) as attendance_count,
      coalesce(links.match_count, 0) as match_count,
      coalesce(links.championships, '[]'::jsonb) as championships,
      coalesce(squads.internal_teams, '[]'::jsonb) as internal_teams,
      case
        when requested_view = 'reschedule'
          and event.professional_schedule_state in ('scheduled', 'pending_review')
          and event.starts_at < effective_now then 0
        when requested_view = 'reschedule' then 1
        else 0
      end as sort_rank,
      case
        when requested_view = 'reschedule'
          and event.professional_schedule_state in ('scheduled', 'pending_review')
          and event.starts_at < effective_now
          then 'Horário passou sem encerramento'
        when event.professional_schedule_state = 'postponed' then 'Jogo adiado'
        when event.professional_schedule_state = 'date_tbd' then 'Data a definir'
        else null
      end as reschedule_reason,
      case
        when requested_view = 'reschedule' then 'Reagendar'
        when requested_view = 'upcoming' then 'Abrir jogo'
        else 'Ver resumo'
      end as next_action,
      event.updated_at
    from public.events event
    left join public.venues venue
      on venue.id = event.venue_id and venue.team_id = event.team_id
    left join lateral (
      select
        count(*) filter (where item.status = 'confirmed')::integer as confirmed_count,
        count(*)::integer as total_count
      from public.event_attendance item
      where item.team_id = event.team_id and item.event_id = event.id
    ) attendance on true
    left join lateral (
      select
        count(distinct match.id)::integer as match_count,
        coalesce(jsonb_agg(distinct jsonb_build_object(
          'id', championship.id, 'name', championship.name
        )) filter (where championship.id is not null), '[]'::jsonb) as championships
      from public.event_matches match
      left join public.championship_fixtures fixture
        on fixture.team_id = match.team_id and fixture.match_id = match.id
      left join public.championships championship
        on championship.team_id = fixture.team_id
        and championship.id = fixture.championship_id
      where match.team_id = event.team_id and match.event_id = event.id
    ) links on true
    left join lateral (
      select coalesce(jsonb_agg(distinct jsonb_build_object(
        'id', preset.id, 'name', preset.name, 'color', preset.color
      )) filter (where preset.id is not null), '[]'::jsonb) as internal_teams
      from public.event_squads squad
      join public.team_squad_presets preset
        on preset.team_id = squad.team_id
        and preset.id = squad.source_internal_team_id
      where squad.team_id = event.team_id and squad.event_id = event.id
    ) squads on true
    where event.team_id = requested_team_id
      and (
        (requested_view = 'upcoming'
          and event.status = 'scheduled'
          and event.professional_schedule_state in ('scheduled', 'pending_review')
          and event.starts_at >= effective_now)
        or (requested_view = 'reschedule'
          and event.status = 'scheduled'
          and (event.professional_schedule_state in ('date_tbd', 'postponed')
            or (event.professional_schedule_state in ('scheduled', 'pending_review')
              and event.starts_at < effective_now)))
        or (requested_view = 'completed' and event.status = 'completed')
        or (requested_view = 'cancelled' and event.status = 'cancelled')
      )
      and (normalized_search = '' or private.normalize_management_search(
        event.title || ' ' || coalesce(event.opponent_name, '')
      ) like '%' || private.escape_management_like(normalized_search) || '%' escape '\')
      and (period_start_at is null
        or (event.starts_at >= period_start_at and event.starts_at < period_end_at))
      and (requested_kind is null or event.kind = requested_kind)
      and (requested_internal_team_id is null or exists (
        select 1 from public.event_squads filter_squad
        where filter_squad.team_id = event.team_id
          and filter_squad.event_id = event.id
          and filter_squad.source_internal_team_id = requested_internal_team_id
      ))
      and (requested_championship_id is null or exists (
        select 1
        from public.event_matches filter_match
        join public.championship_fixtures filter_fixture
          on filter_fixture.team_id = filter_match.team_id
          and filter_fixture.match_id = filter_match.id
        where filter_match.team_id = event.team_id
          and filter_match.event_id = event.id
          and filter_fixture.championship_id = requested_championship_id
      ))
  ), after_cursor as (
    select * from filtered item
    where requested_cursor is null
      or (requested_view = 'upcoming'
        and (item.starts_at, item.id) > (cursor_at, cursor_id))
      or (requested_view = 'reschedule' and (
        item.sort_rank > cursor_rank
        or (item.sort_rank = cursor_rank
          and (item.updated_at, item.id) < (cursor_at, cursor_id))
      ))
      or (requested_view in ('completed', 'cancelled')
        and (item.starts_at, item.id) < (cursor_at, cursor_id))
  ), numbered as (
    select item.*, row_number() over (order by
      case when requested_view = 'upcoming' then item.starts_at end asc,
      case when requested_view = 'reschedule' then item.sort_rank end asc,
      case when requested_view = 'reschedule' then item.updated_at end desc,
      case when requested_view in ('completed', 'cancelled') then item.starts_at end desc,
      case when requested_view = 'upcoming' then item.id end asc,
      case when requested_view <> 'upcoming' then item.id end desc
    ) as page_number
    from after_cursor item
  ), page_plus_one as (
    select * from numbered where page_number <= requested_limit + 1
  ), page_items as (
    select * from page_plus_one where page_number <= requested_limit
  ), page_meta as (
    select count(*) > requested_limit as has_more from page_plus_one
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(
      to_jsonb(item) - array['sort_rank', 'updated_at', 'page_number']
      order by item.page_number
    ) from page_items item), '[]'::jsonb),
    'filtered_count', (select count(*) from filtered),
    'next_cursor', case when (select has_more from page_meta) then (
      select jsonb_build_object(
        'rank', item.sort_rank,
        'sort_at', case when requested_view = 'reschedule'
          then item.updated_at else item.starts_at end,
        'id', item.id
      ) from page_items item order by item.page_number desc limit 1
    ) else null end,
    'effective_filters', jsonb_strip_nulls(jsonb_build_object(
      'view', requested_view,
      'search', nullif(normalized_search, ''),
      'period_start', requested_period_start,
      'period_end', requested_period_end,
      'kind', requested_kind,
      'internal_team_id', requested_internal_team_id,
      'championship_id', requested_championship_id,
      'limit', requested_limit
    ))
  ) into result;

  return result;
end;
$$;

create or replace function public.list_management_championships(
  requested_team_id uuid,
  requested_status public.championship_status default null,
  requested_search text default null,
  requested_format public.championship_format default null,
  requested_created_start date default null,
  requested_created_end date default null,
  requested_limit integer default 24,
  requested_cursor jsonb default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  normalized_search text;
  team_timezone text;
  created_start_at timestamptz;
  created_end_at timestamptz;
  cursor_at timestamptz;
  cursor_id uuid;
  result jsonb;
begin
  if (select auth.uid()) is null
    or not private.is_team_staff(requested_team_id)
  then
    raise exception 'Lista de campeonatos indisponível' using errcode = '42501';
  end if;

  if not private.is_team_feature_enabled(
    requested_team_id, 'complete_management_lists'::public.feature_key
  ) then
    raise exception 'Listas completas indisponíveis' using errcode = 'P0001';
  end if;

  if requested_limit is null or requested_limit not between 1 and 50 then
    raise exception 'Filtros de campeonatos inválidos' using errcode = '22023';
  end if;

  normalized_search := private.normalize_management_search(requested_search);
  if requested_search is not null
    and char_length(normalized_search) not between 2 and 80
  then
    raise exception 'Busca deve ter entre 2 e 80 caracteres' using errcode = '22023';
  end if;

  if (requested_created_start is null) <> (requested_created_end is null)
    or requested_created_end < requested_created_start
  then
    raise exception 'Período de campeonatos inválido' using errcode = '22023';
  end if;

  select team.timezone into team_timezone
  from public.teams team where team.id = requested_team_id;
  if requested_created_start is not null then
    created_start_at := requested_created_start::timestamp at time zone team_timezone;
    created_end_at := (requested_created_end + 1)::timestamp at time zone team_timezone;
  end if;

  if requested_cursor is not null then
    if jsonb_typeof(requested_cursor) <> 'object'
      or requested_cursor - array['sort_at', 'id'] <> '{}'::jsonb
      or not requested_cursor ?& array['sort_at', 'id']
    then
      raise exception 'Cursor de campeonatos inválido' using errcode = '22023';
    end if;
    begin
      cursor_at := (requested_cursor ->> 'sort_at')::timestamptz;
      cursor_id := (requested_cursor ->> 'id')::uuid;
    exception when others then
      raise exception 'Cursor de campeonatos inválido' using errcode = '22023';
    end;
  end if;

  with filtered as materialized (
    select
      championship.id,
      championship.name,
      championship.format,
      championship.status,
      case championship.status
        when 'draft' then 'Configuração em andamento'
        when 'published' then 'A começar'
        when 'active' then 'Em andamento'
        when 'completed' then 'Encerrado'
        when 'archived' then 'Arquivado'
      end as status_label,
      coalesce(counts.active_participants, 0) as active_participants,
      coalesce(counts.completed_fixtures, 0) as completed_fixtures,
      coalesce(counts.total_fixtures, 0) as total_fixtures,
      case when championship.status = 'draft'
        then 'Continuar configuração' else 'Abrir campeonato' end as next_action,
      championship.created_at,
      championship.updated_at
    from public.championships championship
    left join lateral (
      select
        (select count(*)::integer
          from public.championship_participants participant
          where participant.team_id = championship.team_id
            and participant.championship_id = championship.id
            and participant.status = 'active') as active_participants,
        (select count(*) filter (where fixture.status = 'finalized')::integer
          from public.championship_fixtures fixture
          where fixture.team_id = championship.team_id
            and fixture.championship_id = championship.id) as completed_fixtures,
        (select count(*)::integer
          from public.championship_fixtures fixture
          where fixture.team_id = championship.team_id
            and fixture.championship_id = championship.id
            and fixture.status <> 'void') as total_fixtures
    ) counts on true
    where championship.team_id = requested_team_id
      and (requested_status is null or championship.status = requested_status)
      and (normalized_search = '' or private.normalize_management_search(championship.name)
        like '%' || private.escape_management_like(normalized_search) || '%' escape '\')
      and (requested_format is null or championship.format = requested_format)
      and (created_start_at is null or (championship.created_at >= created_start_at
        and championship.created_at < created_end_at))
  ), after_cursor as (
    select * from filtered item
    where requested_cursor is null
      or (item.updated_at, item.id) < (cursor_at, cursor_id)
  ), numbered as (
    select item.*, row_number() over (order by item.updated_at desc, item.id desc)
      as page_number
    from after_cursor item
  ), page_plus_one as (
    select * from numbered where page_number <= requested_limit + 1
  ), page_items as (
    select * from page_plus_one where page_number <= requested_limit
  ), page_meta as (
    select count(*) > requested_limit as has_more from page_plus_one
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(
      to_jsonb(item) - array['updated_at', 'page_number'] order by item.page_number
    ) from page_items item), '[]'::jsonb),
    'filtered_count', (select count(*) from filtered),
    'next_cursor', case when (select has_more from page_meta) then (
      select jsonb_build_object('sort_at', item.updated_at, 'id', item.id)
      from page_items item order by item.page_number desc limit 1
    ) else null end,
    'effective_filters', jsonb_strip_nulls(jsonb_build_object(
      'status', requested_status,
      'search', nullif(normalized_search, ''),
      'format', requested_format,
      'created_start', requested_created_start,
      'created_end', requested_created_end,
      'limit', requested_limit
    ))
  ) into result;

  return result;
end;
$$;

revoke all on function private.normalize_management_search(text) from public;
revoke all on function private.escape_management_like(text) from public;
revoke all on function public.list_management_events(
  uuid, public.management_event_view, text, date, date, public.event_kind,
  uuid, uuid, integer, jsonb
) from public, anon, authenticated;
revoke all on function public.list_management_championships(
  uuid, public.championship_status, text, public.championship_format,
  date, date, integer, jsonb
) from public, anon, authenticated;

grant execute on function public.list_management_events(
  uuid, public.management_event_view, text, date, date, public.event_kind,
  uuid, uuid, integer, jsonb
) to authenticated;
grant execute on function public.list_management_championships(
  uuid, public.championship_status, text, public.championship_format,
  date, date, integer, jsonb
) to authenticated;

comment on function public.list_management_events(
  uuid, public.management_event_view, text, date, date, public.event_kind,
  uuid, uuid, integer, jsonb
) is 'R16: lista administrativa de jogos com filtros, total e cursor; exige staff ativo e flag do time.';
comment on function public.list_management_championships(
  uuid, public.championship_status, text, public.championship_format,
  date, date, integer, jsonb
) is 'R16: lista administrativa de campeonatos com filtros, total e cursor; exige staff ativo e flag do time.';
