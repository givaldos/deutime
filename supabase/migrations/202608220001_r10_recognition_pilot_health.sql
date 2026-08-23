-- R10 / WP-R10-04 — sonda agregada e sem PII para reconhecimento positivo.
-- Somente service_role recebe flags, contagens e horários operacionais.

create or replace function public.get_recognition_pilot_health(
  requested_team_id uuid
)
returns table (
  observed_at timestamptz,
  recognition_enabled boolean,
  activation_captured boolean,
  active_claimed_athletes bigint,
  source_cards bigint,
  source_goal_cards bigint,
  source_assist_cards bigint,
  source_crowd_star_cards bigint,
  projected_cards bigint,
  projected_goal_cards bigint,
  projected_assist_cards bigint,
  projected_crowd_star_cards bigint,
  reconstruction_mismatches bigint,
  granted_consents bigint,
  revoked_consents bigint,
  public_cards bigint,
  consent_commands_24h bigint,
  last_consent_command_at timestamptz,
  last_flag_change_at timestamptz,
  activated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
  with flag_state as (
    select coalesce((
      select flag.enabled
      from public.team_feature_flags flag
      where flag.team_id = requested_team_id
        and flag.feature = 'recognition'::public.feature_key
    ), false) as enabled
  ), eligible_links as materialized (
    select athlete.id as athlete_id,
      athlete.user_id,
      activation.activated_at
    from public.athletes athlete
    join private.team_recognition_activations activation
      on activation.team_id = athlete.team_id
    where athlete.team_id = requested_team_id
      and athlete.user_id is not null
      and athlete.status = 'active'
      and athlete.removed_at is null
  ), eligible_matches as materialized (
    select link.athlete_id,
      match.id as match_id,
      match.craque_voting_closes_at
    from eligible_links link
    join public.match_participations participation
      on participation.athlete_id = link.athlete_id
      and participation.team_id = requested_team_id
    join public.event_matches match
      on match.id = participation.match_id
      and match.team_id = requested_team_id
    where match.status = 'finalized'
      and match.finalized_at is not null
      and match.finalized_at >= link.activated_at
      and match.finalized_at <= now()
  ), vote_counts as materialized (
    select vote.match_id,
      vote.candidate_athlete_id,
      count(*)::bigint as vote_count
    from public.craque_votes vote
    where vote.team_id = requested_team_id
    group by vote.match_id, vote.candidate_athlete_id
  ), ranked_votes as materialized (
    select result.*,
      dense_rank() over (
        partition by result.match_id
        order by result.vote_count desc
      ) as rank_position
    from vote_counts result
  ), source_projection as materialized (
    select match.athlete_id,
      'goal_recorded'::public.recognition_kind as kind,
      source.id as source_id
    from eligible_matches match
    join public.match_events source
      on source.match_id = match.match_id
      and source.team_id = requested_team_id
      and source.kind = 'goal'
      and source.athlete_id = match.athlete_id

    union all

    select match.athlete_id,
      'assist_recorded'::public.recognition_kind,
      source.id
    from eligible_matches match
    join public.match_events source
      on source.match_id = match.match_id
      and source.team_id = requested_team_id
      and source.kind = 'goal'
      and source.assist_athlete_id = match.athlete_id

    union all

    select match.athlete_id,
      'crowd_star'::public.recognition_kind,
      result.match_id
    from eligible_matches match
    join ranked_votes result
      on result.match_id = match.match_id
      and result.candidate_athlete_id = match.athlete_id
      and result.rank_position = 1
    where match.craque_voting_closes_at is not null
      and match.craque_voting_closes_at <= now()
  ), linked_users as materialized (
    select distinct link.user_id
    from eligible_links link
  ), active_projection as materialized (
    select projection.athlete_id,
      projection.kind,
      projection.source_id
    from linked_users link
    cross join lateral private.get_recognition_projection(link.user_id) projection
    where projection.team_id = requested_team_id
  ), source_metrics as (
    select count(*) as source_cards,
      count(*) filter (where kind = 'goal_recorded') as source_goal_cards,
      count(*) filter (where kind = 'assist_recorded') as source_assist_cards,
      count(*) filter (where kind = 'crowd_star') as source_crowd_star_cards
    from source_projection
  ), projection_metrics as (
    select count(*) as projected_cards,
      count(*) filter (where kind = 'goal_recorded') as projected_goal_cards,
      count(*) filter (where kind = 'assist_recorded') as projected_assist_cards,
      count(*) filter (where kind = 'crowd_star') as projected_crowd_star_cards
    from active_projection
  ), difference_metrics as (
    select count(*) as reconstruction_mismatches
    from (
      (select athlete_id, kind, source_id from source_projection
       except
       select athlete_id, kind, source_id from active_projection)
      union all
      (select athlete_id, kind, source_id from active_projection
       except
       select athlete_id, kind, source_id from source_projection)
    ) difference
  ), consent_metrics as (
    select count(*) filter (
        where consent.status = 'granted' and consent.revoked_at is null
      ) as granted_consents,
      count(*) filter (
        where consent.status = 'revoked' or consent.revoked_at is not null
      ) as revoked_consents
    from public.athlete_public_consents consent
    where consent.team_id = requested_team_id
      and consent.purpose = 'public_recognition_summary_v1'
  ), public_metrics as (
    select count(*) as public_cards
    from active_projection projection
    join public.athlete_public_consents consent
      on consent.athlete_id = projection.athlete_id
      and consent.team_id = requested_team_id
      and consent.purpose = 'public_recognition_summary_v1'
      and consent.status = 'granted'
      and consent.revoked_at is null
  )
  select now(),
    flag_state.enabled,
    exists (
      select 1
      from private.team_recognition_activations activation
      where activation.team_id = requested_team_id
    ),
    (select count(*) from public.athletes athlete
      where athlete.team_id = requested_team_id
        and athlete.user_id is not null
        and athlete.status = 'active'
        and athlete.removed_at is null),
    source_metrics.source_cards,
    source_metrics.source_goal_cards,
    source_metrics.source_assist_cards,
    source_metrics.source_crowd_star_cards,
    projection_metrics.projected_cards,
    projection_metrics.projected_goal_cards,
    projection_metrics.projected_assist_cards,
    projection_metrics.projected_crowd_star_cards,
    case when flag_state.enabled
      then difference_metrics.reconstruction_mismatches
      else 0::bigint
    end,
    consent_metrics.granted_consents,
    consent_metrics.revoked_consents,
    public_metrics.public_cards,
    (select count(*) from public.audit_logs audit
      where audit.team_id = requested_team_id
        and audit.action in (
          'privacy.recognition_summary.granted',
          'privacy.recognition_summary.revoked'
        )
        and audit.created_at >= now() - interval '24 hours'),
    (select max(audit.created_at) from public.audit_logs audit
      where audit.team_id = requested_team_id
        and audit.action in (
          'privacy.recognition_summary.granted',
          'privacy.recognition_summary.revoked'
        )),
    (select max(audit.created_at) from public.audit_logs audit
      where audit.team_id = requested_team_id
        and audit.action = 'feature_flag.changed'
        and audit.entity_type = 'team_feature_flag'
        and audit.entity_id = 'recognition'),
    (select activation.activated_at
      from private.team_recognition_activations activation
      where activation.team_id = requested_team_id)
  from flag_state, source_metrics, projection_metrics, difference_metrics,
    consent_metrics, public_metrics
  where exists (
    select 1 from public.teams team where team.id = requested_team_id
  );
$$;

revoke all on function public.get_recognition_pilot_health(uuid)
  from public, anon, authenticated;
grant execute on function public.get_recognition_pilot_health(uuid)
  to service_role;

comment on function public.get_recognition_pilot_health(uuid) is
  'Returns aggregate, PII-free recognition health and rollback signals for one R10 pilot team.';
