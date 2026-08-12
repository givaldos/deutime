-- R08M / WP-R08M-01 — projeção anônima e inerte da fase compartilhável.
-- A função consolida fontes autoritativas sem conceder leitura das tabelas-base.

create or replace function public.get_public_event_share_state(
  requested_public_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  target_event record;
  target_match record;
  lineup_state jsonb := null;
  match_state jsonb := null;
  voting_state jsonb := null;
  result_state jsonb := null;
  selected_phase text;
  total_votes bigint := 0;
  top_vote_count bigint := 0;
  top_candidate_count integer := 0;
  winner_candidate_id uuid := null;
  winner_name text := null;
begin
  select
    event.id,
    event.team_id,
    event.public_id,
    event.title,
    event.kind::text as kind,
    event.sport_format::text as sport_format,
    event.starts_at,
    event.ends_at,
    event.status::text as status,
    team.name as team_name,
    team.timezone as team_timezone
  into target_event
  from public.events event
  join public.teams team on team.id = event.team_id
  where event.public_id = requested_public_id
    and private.is_team_feature_enabled(event.team_id, 'public_event_page')
    and private.is_team_feature_enabled(event.team_id, 'event_share_card');

  if target_event.id is null then
    return null;
  end if;

  if target_event.status = 'cancelled' then
    selected_phase := 'cancelled';
  else
    select match.*
    into target_match
    from public.event_matches match
    where match.event_id = target_event.id
      and match.team_id = target_event.team_id
      and private.is_team_feature_enabled(match.team_id, 'event_matches')
      and (
        (match.status = 'live' and match.public_mode = 'live')
        or (
          match.status = 'finalized'
          and match.public_mode in ('live', 'final_result')
        )
      )
    order by
      case when match.status = 'live' then 0 else 1 end,
      match.ordinal desc
    limit 1;

    if target_match.id is not null then
      select jsonb_build_object(
        'ordinal', target_match.ordinal,
        'status', target_match.status::text,
        'public_mode', target_match.public_mode::text,
        'sides', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'side_index', side.side_index,
              'label', side.label,
              'score', greatest(0, coalesce((
                select sum(
                  case
                    when event.kind in ('goal', 'own_goal') then 1
                    when event.kind = 'score_adjustment' then coalesce(event.delta, 0)
                    else 0
                  end
                )
                from public.match_events event
                where event.match_id = target_match.id
                  and event.team_id = target_event.team_id
                  and event.side_id = side.id
              ), 0))
            ) order by side.side_index
          )
          from public.match_sides side
          where side.match_id = target_match.id
            and side.team_id = target_event.team_id
        ), '[]'::jsonb),
        'events', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'kind', event.kind::text,
              'side_index', side.side_index,
              'minute', event.minute
            ) order by event.created_at, event.id
          )
          from public.match_events event
          left join public.match_sides side
            on side.id = event.side_id
            and side.match_id = event.match_id
            and side.team_id = event.team_id
          where event.match_id = target_match.id
            and event.team_id = target_event.team_id
            and event.kind in (
              'goal',
              'own_goal',
              'yellow_card',
              'red_card',
              'substitution',
              'score_adjustment'
            )
        ), '[]'::jsonb)
      )
      into match_state;
    end if;

    if target_match.status = 'live' then
      selected_phase := 'live';
    elsif target_match.status = 'finalized' then
      if private.is_team_feature_enabled(target_event.team_id, 'voting')
        and target_match.craque_voting_closes_at is not null
        and now() < target_match.craque_voting_closes_at
      then
        selected_phase := 'voting';
        voting_state := jsonb_build_object(
          'closes_at', target_match.craque_voting_closes_at
        );
      elsif private.is_team_feature_enabled(target_event.team_id, 'voting')
        and target_match.craque_voting_closes_at is not null
        and now() >= target_match.craque_voting_closes_at
        and exists (
          select 1
          from public.craque_votes vote
          where vote.match_id = target_match.id
            and vote.team_id = target_event.team_id
        )
      then
        selected_phase := 'result';

        with candidate_totals as (
          select
            vote.candidate_athlete_id,
            count(*)::bigint as vote_count
          from public.craque_votes vote
          where vote.match_id = target_match.id
            and vote.team_id = target_event.team_id
          group by vote.candidate_athlete_id
        )
        select coalesce(sum(candidate.vote_count), 0),
          coalesce(max(candidate.vote_count), 0)
        into total_votes, top_vote_count
        from candidate_totals candidate;

        with candidate_totals as (
          select
            vote.candidate_athlete_id,
            count(*)::bigint as vote_count
          from public.craque_votes vote
          where vote.match_id = target_match.id
            and vote.team_id = target_event.team_id
          group by vote.candidate_athlete_id
        )
        select count(*)::integer, min(candidate.candidate_athlete_id::text)::uuid
        into top_candidate_count, winner_candidate_id
        from candidate_totals candidate
        where candidate.vote_count = top_vote_count;

        if top_candidate_count = 1 then
          select substring(
            coalesce(
              nullif(btrim(athlete.preferred_name), ''),
              athlete.full_name
            )
            from '[^[:space:]]+'
          )
          into winner_name
          from public.athletes athlete
          join public.athlete_public_consents consent
            on consent.athlete_id = athlete.id
            and consent.team_id = athlete.team_id
            and consent.purpose = 'public_sports_activity'
            and consent.status = 'granted'
            and consent.revoked_at is null
          where athlete.id = winner_candidate_id
            and athlete.team_id = target_event.team_id;
        end if;

        result_state := jsonb_build_object(
          'winner_name', winner_name,
          'vote_count', case
            when winner_name is not null then top_vote_count
            else null
          end,
          'vote_percentage', case
            when winner_name is not null and total_votes > 0
              then round(top_vote_count::numeric * 100 / total_votes, 1)
            else null
          end,
          'total_votes', total_votes,
          'tied', top_candidate_count > 1
        );
      else
        selected_phase := 'score';
      end if;
    else
      lineup_state := public.get_public_event_lineup(requested_public_id);
      if lineup_state is not null then
        selected_phase := 'lineup';
      elsif target_event.status = 'completed' then
        selected_phase := 'completed';
      else
        selected_phase := 'call';
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'phase', selected_phase,
    'event', jsonb_build_object(
      'team_name', target_event.team_name,
      'team_timezone', target_event.team_timezone,
      'title', target_event.title,
      'kind', target_event.kind,
      'sport_format', target_event.sport_format,
      'starts_at', target_event.starts_at,
      'ends_at', target_event.ends_at,
      'status', target_event.status
    ),
    'lineup', case when selected_phase = 'lineup' then lineup_state else null end,
    'match', case
      when selected_phase in ('live', 'voting', 'result', 'score') then match_state
      else null
    end,
    'voting', voting_state,
    'result', result_state
  );
end;
$$;

revoke all on function public.get_public_event_share_state(uuid)
  from public, anon, authenticated;
grant execute on function public.get_public_event_share_state(uuid)
  to anon, authenticated;

comment on function public.get_public_event_share_state(uuid) is
  'R08M: resolve a fase compartilhável por public_id e retorna somente contexto anônimo, sem IDs, capability, presença, endereço ou voto individual.';
