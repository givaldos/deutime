-- R16 / WP-R16-05 / CAL-02 e CAL-03 — projeção estreita do calendário.
-- A agenda existente segue autoritativa e a lista atual permanece como fallback.

create index if not exists events_calendar_workspace_idx
  on public.events(team_id, starts_at, id)
  where status = 'scheduled'
    and professional_schedule_state in ('scheduled', 'pending_review');

create or replace function public.get_management_calendar(
  requested_team_id uuid,
  requested_start date,
  requested_end date,
  requested_search text default null,
  requested_kind public.event_kind default null,
  requested_internal_team_id uuid default null,
  requested_championship_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  team_timezone text;
  normalized_search text;
  period_start_at timestamptz;
  period_end_at timestamptz;
  result jsonb;
begin
  if (select auth.uid()) is null
    or not private.is_team_staff(requested_team_id)
  then
    raise exception 'Calendário indisponível' using errcode = '42501';
  end if;

  if not private.is_team_feature_enabled(
    requested_team_id, 'calendar_workspace'::public.feature_key
  ) then
    raise exception 'Calendário indisponível' using errcode = 'P0001';
  end if;

  if requested_start is null
    or requested_end is null
    or requested_end < requested_start
    or requested_end - requested_start not between 0 and 41
  then
    raise exception 'Período do calendário inválido' using errcode = '22023';
  end if;

  normalized_search := private.normalize_management_search(requested_search);
  if requested_search is not null
    and char_length(normalized_search) not between 2 and 80
  then
    raise exception 'Busca do calendário inválida' using errcode = '22023';
  end if;

  if requested_internal_team_id is not null and not exists (
    select 1 from public.team_squad_presets preset
    where preset.team_id = requested_team_id
      and preset.id = requested_internal_team_id
  ) then
    raise exception 'Equipe interna inválida' using errcode = '22023';
  end if;

  if requested_championship_id is not null and not exists (
    select 1 from public.championships championship
    where championship.team_id = requested_team_id
      and championship.id = requested_championship_id
  ) then
    raise exception 'Campeonato inválido' using errcode = '22023';
  end if;

  select team.timezone into team_timezone
  from public.teams team
  where team.id = requested_team_id;

  if team_timezone is null then
    raise exception 'Time indisponível' using errcode = 'P0002';
  end if;

  period_start_at := requested_start::timestamp at time zone team_timezone;
  period_end_at := (requested_end + 1)::timestamp at time zone team_timezone;

  with scheduled as materialized (
    select
      event.id,
      event.title,
      event.kind,
      event.sport_format,
      event.starts_at,
      event.ends_at,
      event.professional_schedule_state,
      venue.name as venue_name,
      coalesce(links.championships, '[]'::jsonb) as championships,
      coalesce(squads.internal_teams, '[]'::jsonb) as internal_teams,
      coalesce(conflicts.pending_count, 0) as pending_conflict_count,
      conflicts.highest_severity
    from public.events event
    left join public.venues venue
      on venue.team_id = event.team_id and venue.id = event.venue_id
    left join lateral (
      select coalesce(jsonb_agg(distinct jsonb_build_object(
        'id', championship.id, 'name', championship.name
      )) filter (where championship.id is not null), '[]'::jsonb) as championships
      from public.event_matches match
      join public.championship_fixtures fixture
        on fixture.team_id = match.team_id and fixture.match_id = match.id
      join public.championships championship
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
    left join lateral (
      select
        count(*)::integer as pending_count,
        case when bool_or(conflict.severity = 'hard') then 'hard'
          when count(*) > 0 then 'warning' else null end as highest_severity
      from public.event_schedule_conflicts conflict
      where conflict.team_id = event.team_id
        and (conflict.event_id = event.id or conflict.other_event_id = event.id)
        and conflict.status = 'pending'
    ) conflicts on true
    where event.team_id = requested_team_id
      and event.status = 'scheduled'
      and event.professional_schedule_state in ('scheduled', 'pending_review')
      and event.starts_at < period_end_at
      and event.ends_at > period_start_at
      and (normalized_search = '' or private.normalize_management_search(
        event.title || ' ' || coalesce(event.opponent_name, '')
      ) like '%' || private.escape_management_like(normalized_search) || '%' escape '\')
      and (requested_kind is null or event.kind = requested_kind)
      and (requested_internal_team_id is null or exists (
        select 1 from public.event_squads filter_squad
        where filter_squad.team_id = event.team_id
          and filter_squad.event_id = event.id
          and filter_squad.source_internal_team_id = requested_internal_team_id
      ))
      and (requested_championship_id is null or exists (
        select 1 from public.event_matches filter_match
        join public.championship_fixtures filter_fixture
          on filter_fixture.team_id = filter_match.team_id
          and filter_fixture.match_id = filter_match.id
        where filter_match.team_id = event.team_id
          and filter_match.event_id = event.id
          and filter_fixture.championship_id = requested_championship_id
      ))
    order by event.starts_at, event.id
    limit 201
  ), reschedule as materialized (
    select
      event.id,
      event.title,
      event.kind,
      event.professional_schedule_state,
      case when event.professional_schedule_state = 'postponed'
        then 'Jogo adiado' else 'Data a definir' end as reason
    from public.events event
    where event.team_id = requested_team_id
      and event.status = 'scheduled'
      and event.professional_schedule_state in ('date_tbd', 'postponed')
      and (normalized_search = '' or private.normalize_management_search(
        event.title || ' ' || coalesce(event.opponent_name, '')
      ) like '%' || private.escape_management_like(normalized_search) || '%' escape '\')
      and (requested_kind is null or event.kind = requested_kind)
      and (requested_internal_team_id is null or exists (
        select 1 from public.event_squads filter_squad
        where filter_squad.team_id = event.team_id
          and filter_squad.event_id = event.id
          and filter_squad.source_internal_team_id = requested_internal_team_id
      ))
      and (requested_championship_id is null or exists (
        select 1 from public.event_matches filter_match
        join public.championship_fixtures filter_fixture
          on filter_fixture.team_id = filter_match.team_id
          and filter_fixture.match_id = filter_match.id
        where filter_match.team_id = event.team_id
          and filter_match.event_id = event.id
          and filter_fixture.championship_id = requested_championship_id
      ))
    order by event.updated_at desc, event.id desc
    limit 50
  )
  select jsonb_build_object(
    'period', jsonb_build_object(
      'start', requested_start,
      'end', requested_end,
      'time_zone', team_timezone
    ),
    'items', coalesce((select jsonb_agg(to_jsonb(item) order by item.starts_at, item.id)
      from (select * from scheduled limit 200) item), '[]'::jsonb),
    'truncated', (select count(*) > 200 from scheduled),
    'reschedule_items', coalesce((select jsonb_agg(to_jsonb(item)) from reschedule item), '[]'::jsonb),
    'summary', jsonb_build_object(
      'scheduled_count', least((select count(*) from scheduled), 200),
      'reschedule_count', (select count(*) from reschedule),
      'conflict_count', coalesce((select sum(item.pending_conflict_count) from scheduled item), 0)
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_management_calendar(
  uuid, date, date, text, public.event_kind, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.get_management_calendar(
  uuid, date, date, text, public.event_kind, uuid, uuid
) to authenticated;

comment on function public.get_management_calendar(
  uuid, date, date, text, public.event_kind, uuid, uuid
) is 'R16: projeta até 42 dias da agenda do time, com vínculos e conflitos agregados, sem dados de atletas ou de outros times.';
