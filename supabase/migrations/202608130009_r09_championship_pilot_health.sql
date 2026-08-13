-- R09 / WP-R09-05 — sonda agregada e sem PII para o piloto de campeonatos.
-- Somente service_role recebe contagens, flags e divergências reconstruíveis.

create or replace function public.get_championship_pilot_health(
  requested_team_id uuid
)
returns table (
  observed_at timestamptz,
  championships_enabled boolean,
  public_event_page_enabled boolean,
  championships_total bigint,
  draft_championships bigint,
  published_championships bigint,
  active_championships bigint,
  completed_championships bigint,
  archived_championships bigint,
  league_championships bigint,
  groups_knockout_championships bigint,
  knockout_championships bigint,
  page_candidates bigint,
  projected_championships bigint,
  fallback_championships bigint,
  participants_total bigint,
  fixtures_total bigint,
  linked_fixtures bigint,
  finalized_fixtures bigint,
  void_fixtures bigint,
  resolved_fixtures bigint,
  projected_participants bigint,
  projected_fixtures bigint,
  projected_standings bigint,
  reconstruction_mismatches bigint,
  commands_24h bigint,
  last_command_at timestamptz,
  last_flag_change_at timestamptz
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
  with championships as materialized (
    select championship.*
    from public.championships championship
    where championship.team_id = requested_team_id
  ), pages as materialized (
    select championship.id, championship.format,
      public.get_public_championship(championship.public_id) as state,
      (select count(*)
        from public.championship_participants participant
        where participant.championship_id = championship.id
          and participant.team_id = requested_team_id) as expected_participants,
      (select count(*)
        from public.championship_fixtures fixture
        where fixture.championship_id = championship.id
          and fixture.team_id = requested_team_id) as expected_fixtures,
      case championship.format
        when 'league' then (
          select count(*)
          from private.get_championship_league_standings(championship)
        )
        when 'groups_knockout' then (
          select count(*)
          from private.get_championship_group_standings(championship)
        )
        else 0
      end as expected_standings
    from championships championship
    where championship.public_mode = 'public'
      and championship.status in ('published', 'active', 'completed')
  ), championship_metrics as (
    select count(*) as championships_total,
      count(*) filter (where status = 'draft') as draft_championships,
      count(*) filter (where status = 'published') as published_championships,
      count(*) filter (where status = 'active') as active_championships,
      count(*) filter (where status = 'completed') as completed_championships,
      count(*) filter (where status = 'archived') as archived_championships,
      count(*) filter (where format = 'league') as league_championships,
      count(*) filter (where format = 'groups_knockout')
        as groups_knockout_championships,
      count(*) filter (where format = 'knockout') as knockout_championships
    from championships
  ), object_metrics as (
    select
      (select count(*) from public.championship_participants participant
        where participant.team_id = requested_team_id) as participants_total,
      count(*) as fixtures_total,
      count(*) filter (where fixture.match_id is not null) as linked_fixtures,
      count(*) filter (where fixture.status = 'finalized') as finalized_fixtures,
      count(*) filter (where fixture.status = 'void') as void_fixtures,
      count(*) filter (
        where fixture.winner_participant_id is not null
      ) as resolved_fixtures
    from public.championship_fixtures fixture
    where fixture.team_id = requested_team_id
  ), page_metrics as (
    select count(*) as page_candidates,
      count(*) filter (where state is not null) as projected_championships,
      count(*) filter (where state is null) as fallback_championships,
      coalesce(sum(jsonb_array_length(state -> 'participants'))
        filter (where state is not null), 0) as projected_participants,
      coalesce(sum(jsonb_array_length(state -> 'fixtures'))
        filter (where state is not null), 0) as projected_fixtures,
      coalesce(sum(jsonb_array_length(state -> 'standings'))
        filter (where state is not null), 0) as projected_standings,
      count(*) filter (
        where state is not null and (
          jsonb_array_length(state -> 'participants') <> expected_participants
          or jsonb_array_length(state -> 'fixtures') <> expected_fixtures
          or jsonb_array_length(state -> 'standings') <> expected_standings
          or state #>> '{championship,format}' <> format::text
        )
      ) as reconstruction_mismatches
    from pages
  )
  select now(),
    coalesce((select flag.enabled from public.team_feature_flags flag
      where flag.team_id = requested_team_id
        and flag.feature = 'championships'), false),
    coalesce((select flag.enabled from public.team_feature_flags flag
      where flag.team_id = requested_team_id
        and flag.feature = 'public_event_page'), false),
    championship_metrics.championships_total,
    championship_metrics.draft_championships,
    championship_metrics.published_championships,
    championship_metrics.active_championships,
    championship_metrics.completed_championships,
    championship_metrics.archived_championships,
    championship_metrics.league_championships,
    championship_metrics.groups_knockout_championships,
    championship_metrics.knockout_championships,
    page_metrics.page_candidates,
    page_metrics.projected_championships,
    page_metrics.fallback_championships,
    object_metrics.participants_total,
    object_metrics.fixtures_total,
    object_metrics.linked_fixtures,
    object_metrics.finalized_fixtures,
    object_metrics.void_fixtures,
    object_metrics.resolved_fixtures,
    page_metrics.projected_participants,
    page_metrics.projected_fixtures,
    page_metrics.projected_standings,
    page_metrics.reconstruction_mismatches,
    (select count(*) from public.championship_commands command
      where command.team_id = requested_team_id
        and command.created_at >= now() - interval '24 hours'),
    (select max(command.created_at) from public.championship_commands command
      where command.team_id = requested_team_id),
    (select max(audit.created_at) from public.audit_logs audit
      where audit.team_id = requested_team_id
        and audit.action = 'feature_flag.changed'
        and audit.entity_type = 'team_feature_flag'
        and audit.entity_id = 'championships')
  from championship_metrics, object_metrics, page_metrics
  where exists (
    select 1 from public.teams team where team.id = requested_team_id
  );
$$;

revoke all on function public.get_championship_pilot_health(uuid)
  from public, anon, authenticated;
grant execute on function public.get_championship_pilot_health(uuid)
  to service_role;

comment on function public.get_championship_pilot_health(uuid) is
  'Returns aggregate, PII-free health and reconstruction signals for one R09 pilot team.';
