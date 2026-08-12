-- R08M / WP-R08M-03 — sonda agregada e somente leitura do cartão público.
-- O retorno não contém time, evento, public_id, atleta, capability ou conteúdo.

create or replace function public.get_event_share_card_pilot_health(
  requested_team_id uuid
)
returns table (
  observed_at timestamptz,
  event_share_card_enabled boolean,
  public_event_page_enabled boolean,
  event_matches_enabled boolean,
  voting_enabled boolean,
  window_events bigint,
  projected_events bigint,
  fallback_events bigint,
  call_events bigint,
  lineup_events bigint,
  live_events bigint,
  voting_events bigint,
  result_events bigint,
  score_events bigint,
  cancelled_events bigint,
  completed_events bigint,
  last_flag_change_at timestamptz
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  with candidate_events as materialized (
    select event.public_id
    from public.events event
    where event.team_id = requested_team_id
      and event.starts_at >= now() - interval '30 days'
      and event.starts_at < now() + interval '90 days'
  ),
  projections as materialized (
    select public.get_public_event_share_state(event.public_id) as state
    from candidate_events event
  ),
  metrics as (
    select
      (select count(*) from candidate_events) as window_events,
      count(*) filter (where state is not null) as projected_events,
      count(*) filter (where state is null) as fallback_events,
      count(*) filter (where state ->> 'phase' = 'call') as call_events,
      count(*) filter (where state ->> 'phase' = 'lineup') as lineup_events,
      count(*) filter (where state ->> 'phase' = 'live') as live_events,
      count(*) filter (where state ->> 'phase' = 'voting') as voting_events,
      count(*) filter (where state ->> 'phase' = 'result') as result_events,
      count(*) filter (where state ->> 'phase' = 'score') as score_events,
      count(*) filter (where state ->> 'phase' = 'cancelled') as cancelled_events,
      count(*) filter (where state ->> 'phase' = 'completed') as completed_events
    from projections
  )
  select
    now(),
    coalesce((
      select flag.enabled
      from public.team_feature_flags flag
      where flag.team_id = requested_team_id
        and flag.feature = 'event_share_card'
    ), false),
    coalesce((
      select flag.enabled
      from public.team_feature_flags flag
      where flag.team_id = requested_team_id
        and flag.feature = 'public_event_page'
    ), false),
    coalesce((
      select flag.enabled
      from public.team_feature_flags flag
      where flag.team_id = requested_team_id
        and flag.feature = 'event_matches'
    ), false),
    coalesce((
      select flag.enabled
      from public.team_feature_flags flag
      where flag.team_id = requested_team_id
        and flag.feature = 'voting'
    ), false),
    metrics.window_events,
    metrics.projected_events,
    metrics.fallback_events,
    metrics.call_events,
    metrics.lineup_events,
    metrics.live_events,
    metrics.voting_events,
    metrics.result_events,
    metrics.score_events,
    metrics.cancelled_events,
    metrics.completed_events,
    (
      select max(audit.created_at)
      from public.audit_logs audit
      where audit.team_id = requested_team_id
        and audit.action = 'feature_flag.changed'
        and audit.entity_type = 'team_feature_flag'
        and audit.entity_id = 'event_share_card'
    )
  from metrics
  where exists (
    select 1
    from public.teams team
    where team.id = requested_team_id
  );
$$;

revoke all on function public.get_event_share_card_pilot_health(uuid)
  from public, anon, authenticated;
grant execute on function public.get_event_share_card_pilot_health(uuid)
  to service_role;

comment on function public.get_event_share_card_pilot_health(uuid) is
  'Returns aggregate, PII-free health signals for one R08M share-card pilot team.';
