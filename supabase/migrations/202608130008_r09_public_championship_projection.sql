-- R09 / WP-R09-04 — projeção anônima mínima e controle de publicação.
-- A RPC pública não concede leitura das tabelas-base nem expõe IDs internos.

create or replace function private.get_championship_league_standings(
  target_championship public.championships
)
returns table (
  rank_position integer,
  participant_id uuid,
  participant_name text,
  participant_color text,
  participant_badge_key public.internal_squad_badge_key,
  played integer,
  wins integer,
  draws integer,
  losses integer,
  goals_for integer,
  goals_against integer,
  goal_difference integer,
  points integer,
  head_to_head_points integer,
  participant_seed smallint
)
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
begin
  return query
  with fixture_scores as (
    select fixture.id as fixture_id,
      side_one.participant_id as participant_one_id,
      side_two.participant_id as participant_two_id,
      greatest(0, coalesce(sum(case
        when match_event.side_id = match_side_one.id
          and match_event.kind in ('goal', 'own_goal') then 1
        when match_event.side_id = match_side_one.id
          and match_event.kind = 'score_adjustment'
          then coalesce(match_event.delta, 0)
        else 0 end), 0))::integer as score_one,
      greatest(0, coalesce(sum(case
        when match_event.side_id = match_side_two.id
          and match_event.kind in ('goal', 'own_goal') then 1
        when match_event.side_id = match_side_two.id
          and match_event.kind = 'score_adjustment'
          then coalesce(match_event.delta, 0)
        else 0 end), 0))::integer as score_two
    from public.championship_fixtures fixture
    join public.championship_fixture_slots side_one
      on side_one.fixture_id = fixture.id and side_one.side_index = 1
    join public.championship_fixture_slots side_two
      on side_two.fixture_id = fixture.id and side_two.side_index = 2
    join public.event_matches match
      on match.id = fixture.match_id and match.team_id = fixture.team_id
      and match.status = 'finalized'
    join public.match_sides match_side_one
      on match_side_one.match_id = match.id and match_side_one.side_index = 1
    join public.match_sides match_side_two
      on match_side_two.match_id = match.id and match_side_two.side_index = 2
    left join public.match_events match_event
      on match_event.match_id = match.id and match_event.team_id = match.team_id
    where fixture.championship_id = target_championship.id
      and fixture.team_id = target_championship.team_id
      and fixture.stage = 'league'
    group by fixture.id, side_one.participant_id, side_two.participant_id,
      match_side_one.id, match_side_two.id
  ), result_rows as (
    select score.participant_one_id as result_participant_id,
      score.participant_two_id as opponent_id, score.score_one as scored,
      score.score_two as conceded,
      case when score.score_one > score.score_two then target_championship.win_points
        when score.score_one = score.score_two then target_championship.draw_points
        else target_championship.loss_points end::integer as result_points
    from fixture_scores score
    union all
    select score.participant_two_id, score.participant_one_id,
      score.score_two, score.score_one,
      case when score.score_two > score.score_one then target_championship.win_points
        when score.score_two = score.score_one then target_championship.draw_points
        else target_championship.loss_points end::integer
    from fixture_scores score
  ), base_stats as (
    select participant.id as stats_participant_id,
      participant.snapshot_name as stats_name,
      participant.snapshot_color as stats_color,
      participant.snapshot_badge_key as stats_badge_key,
      participant.seed as stats_seed,
      count(result.result_participant_id)::integer as stats_played,
      count(*) filter (where result.scored > result.conceded)::integer as stats_wins,
      count(*) filter (where result.scored = result.conceded)::integer as stats_draws,
      count(*) filter (where result.scored < result.conceded)::integer as stats_losses,
      coalesce(sum(result.scored), 0)::integer as stats_goals_for,
      coalesce(sum(result.conceded), 0)::integer as stats_goals_against,
      coalesce(sum(result.scored - result.conceded), 0)::integer as stats_goal_difference,
      coalesce(sum(result.result_points), 0)::integer as stats_points
    from public.championship_participants participant
    left join result_rows result on result.result_participant_id = participant.id
    where participant.championship_id = target_championship.id
      and participant.team_id = target_championship.team_id
      and participant.status = 'active'
    group by participant.id
  ), with_head_to_head as (
    select stats.*,
      coalesce(sum(result.result_points) filter (
        where opponent.stats_participant_id is not null
      ), 0)::integer as stats_head_to_head_points
    from base_stats stats
    left join result_rows result
      on result.result_participant_id = stats.stats_participant_id
    left join base_stats opponent
      on opponent.stats_participant_id = result.opponent_id
      and opponent.stats_points = stats.stats_points
      and (coalesce(array_position(target_championship.tiebreak_order, 'head_to_head'), 99)
        <= coalesce(array_position(target_championship.tiebreak_order, 'wins'), 99)
        or opponent.stats_wins = stats.stats_wins)
      and (coalesce(array_position(target_championship.tiebreak_order, 'head_to_head'), 99)
        <= coalesce(array_position(target_championship.tiebreak_order, 'goal_difference'), 99)
        or opponent.stats_goal_difference = stats.stats_goal_difference)
      and (coalesce(array_position(target_championship.tiebreak_order, 'head_to_head'), 99)
        <= coalesce(array_position(target_championship.tiebreak_order, 'goals_for'), 99)
        or opponent.stats_goals_for = stats.stats_goals_for)
    group by stats.stats_participant_id, stats.stats_name, stats.stats_color,
      stats.stats_badge_key, stats.stats_seed, stats.stats_played,
      stats.stats_wins, stats.stats_draws, stats.stats_losses,
      stats.stats_goals_for, stats.stats_goals_against,
      stats.stats_goal_difference, stats.stats_points
  ), ranked as (
    select standings.*,
      dense_rank() over (order by standings.stats_points desc,
        case target_championship.tiebreak_order[1]
          when 'wins' then standings.stats_wins
          when 'goal_difference' then standings.stats_goal_difference
          when 'goals_for' then standings.stats_goals_for
          when 'head_to_head' then standings.stats_head_to_head_points end desc,
        case target_championship.tiebreak_order[2]
          when 'wins' then standings.stats_wins
          when 'goal_difference' then standings.stats_goal_difference
          when 'goals_for' then standings.stats_goals_for
          when 'head_to_head' then standings.stats_head_to_head_points end desc,
        case target_championship.tiebreak_order[3]
          when 'wins' then standings.stats_wins
          when 'goal_difference' then standings.stats_goal_difference
          when 'goals_for' then standings.stats_goals_for
          when 'head_to_head' then standings.stats_head_to_head_points end desc,
        case target_championship.tiebreak_order[4]
          when 'wins' then standings.stats_wins
          when 'goal_difference' then standings.stats_goal_difference
          when 'goals_for' then standings.stats_goals_for
          when 'head_to_head' then standings.stats_head_to_head_points end desc
      )::integer as stats_position
    from with_head_to_head standings
  )
  select ranked.stats_position, ranked.stats_participant_id,
    ranked.stats_name, ranked.stats_color, ranked.stats_badge_key,
    ranked.stats_played, ranked.stats_wins, ranked.stats_draws,
    ranked.stats_losses, ranked.stats_goals_for, ranked.stats_goals_against,
    ranked.stats_goal_difference, ranked.stats_points,
    ranked.stats_head_to_head_points, ranked.stats_seed
  from ranked
  order by ranked.stats_position, ranked.stats_seed,
    ranked.stats_participant_id;
end;
$$;

create or replace function public.get_championship_standings(
  requested_championship_id uuid
)
returns table (
  rank_position integer, participant_id uuid, participant_name text,
  participant_color text,
  participant_badge_key public.internal_squad_badge_key,
  played integer, wins integer, draws integer, losses integer,
  goals_for integer, goals_against integer, goal_difference integer,
  points integer, head_to_head_points integer
)
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_championship public.championships%rowtype;
begin
  select championship.* into target_championship
  from public.championships championship
  where championship.id = requested_championship_id;
  if target_championship.id is null or current_user_id is null
    or not private.is_team_staff(target_championship.team_id)
  then
    raise exception 'Campeonato indisponível' using errcode = '42501';
  end if;
  if not private.is_team_feature_enabled(
    target_championship.team_id, 'championships'
  ) then
    raise exception 'Campeonatos desativados para o time' using errcode = '55000';
  end if;
  return query
  select standing.rank_position, standing.participant_id,
    standing.participant_name, standing.participant_color,
    standing.participant_badge_key, standing.played, standing.wins,
    standing.draws, standing.losses, standing.goals_for,
    standing.goals_against, standing.goal_difference, standing.points,
    standing.head_to_head_points
  from private.get_championship_league_standings(target_championship) standing;
end;
$$;

create or replace function private.championship_match_score(
  requested_match_id uuid,
  requested_side_index smallint
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(0, coalesce(sum(case
    when event.kind in ('goal', 'own_goal') then 1
    when event.kind = 'score_adjustment' then coalesce(event.delta, 0)
    else 0 end), 0))::integer
  from public.match_sides side
  left join public.match_events event
    on event.match_id = side.match_id and event.side_id = side.id
  where side.match_id = requested_match_id
    and side.side_index = requested_side_index;
$$;

create or replace function public.set_championship_public_mode(
  requested_championship_id uuid,
  request_id uuid,
  requested_mode public.championship_public_mode
)
returns public.championship_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_championship public.championships%rowtype;
  existing_command public.championship_commands%rowtype;
begin
  if request_id is null or requested_mode is null then
    raise exception 'Publicação inválida' using errcode = '22023';
  end if;
  select championship.* into target_championship
  from public.championships championship
  where championship.id = requested_championship_id
  for update;
  if target_championship.id is null or current_user_id is null
    or not private.is_team_staff(
      target_championship.team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Campeonato indisponível' using errcode = '42501';
  end if;
  select command.* into existing_command
  from public.championship_commands command
  where command.team_id = target_championship.team_id
    and command.request_id = set_championship_public_mode.request_id
  for update;
  if existing_command.id is not null then
    if existing_command.action <> 'set_public_mode'
      or existing_command.championship_id <> target_championship.id
      or existing_command.result ->> 'mode' <> requested_mode::text
    then
      raise exception 'Request ID já utilizado' using errcode = '22023';
    end if;
    return (request_id, target_championship.id,
      target_championship.id, true)::public.championship_command_result;
  end if;
  if not private.is_team_feature_enabled(
      target_championship.team_id, 'championships'
    ) or (requested_mode = 'public' and target_championship.status
      not in ('published', 'active', 'completed'))
  then
    raise exception 'Publicação indisponível' using errcode = '55000';
  end if;
  update public.championships championship
  set public_mode = requested_mode, updated_by = current_user_id
  where championship.id = target_championship.id;
  insert into public.championship_commands (
    team_id, championship_id, request_id, action, actor_id, result
  ) values (
    target_championship.team_id, target_championship.id, request_id,
    'set_public_mode', current_user_id,
    jsonb_build_object('entity_id', target_championship.id,
      'mode', requested_mode::text)
  );
  return (request_id, target_championship.id,
    target_championship.id, false)::public.championship_command_result;
end;
$$;

create or replace function public.get_public_championship(
  requested_public_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  target_championship public.championships%rowtype;
  projected_standings jsonb := '[]'::jsonb;
begin
  select championship.* into target_championship
  from public.championships championship
  where championship.public_id = requested_public_id
    and championship.public_mode = 'public'
    and championship.status in ('published', 'active', 'completed')
    and private.is_team_feature_enabled(championship.team_id, 'championships');
  if target_championship.id is null then return null; end if;

  if target_championship.format = 'league' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'group_number', null,
      'rank_position', standing.rank_position,
      'seed', standing.participant_seed,
      'name', standing.participant_name,
      'color', standing.participant_color,
      'badge_key', standing.participant_badge_key::text,
      'played', standing.played, 'wins', standing.wins,
      'draws', standing.draws, 'losses', standing.losses,
      'goals_for', standing.goals_for,
      'goals_against', standing.goals_against,
      'goal_difference', standing.goal_difference,
      'points', standing.points
    ) order by standing.rank_position, standing.participant_seed), '[]'::jsonb)
    into projected_standings
    from private.get_championship_league_standings(target_championship) standing;
  elsif target_championship.format = 'groups_knockout' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'group_number', standing.group_number,
      'rank_position', standing.rank_position,
      'seed', standing.participant_seed,
      'name', standing.participant_name,
      'color', standing.participant_color,
      'badge_key', standing.participant_badge_key::text,
      'played', standing.played, 'wins', standing.wins,
      'draws', standing.draws, 'losses', standing.losses,
      'goals_for', standing.goals_for,
      'goals_against', standing.goals_against,
      'goal_difference', standing.goal_difference,
      'points', standing.points
    ) order by standing.group_number, standing.rank_position,
      standing.participant_seed), '[]'::jsonb)
    into projected_standings
    from private.get_championship_group_standings(target_championship) standing;
  end if;

  return jsonb_build_object(
    'championship', jsonb_build_object(
      'public_id', target_championship.public_id,
      'name', target_championship.name,
      'format', target_championship.format::text,
      'status', target_championship.status::text,
      'win_points', target_championship.win_points,
      'draw_points', target_championship.draw_points,
      'loss_points', target_championship.loss_points,
      'tiebreak_order', to_jsonb(target_championship.tiebreak_order),
      'group_count', target_championship.group_count,
      'qualifiers_per_group', target_championship.qualifiers_per_group,
      'published_at', target_championship.published_at
    ),
    'participants', coalesce((select jsonb_agg(jsonb_build_object(
      'seed', participant.seed, 'name', participant.snapshot_name,
      'color', participant.snapshot_color,
      'badge_key', participant.snapshot_badge_key::text,
      'group_number', participant.group_number,
      'status', participant.status::text
    ) order by participant.seed)
      from public.championship_participants participant
      where participant.championship_id = target_championship.id
        and participant.team_id = target_championship.team_id), '[]'::jsonb),
    'standings', projected_standings,
    'fixtures', coalesce((select jsonb_agg(jsonb_build_object(
      'stage', fixture.stage::text, 'status', fixture.status::text,
      'group_number', fixture.group_number,
      'round_number', fixture.round_number, 'ordinal', fixture.ordinal,
      'side_one_kind', slot_one.kind::text,
      'side_two_kind', slot_two.kind::text,
      'side_one', case when side_one.id is null then null else jsonb_build_object(
        'seed', side_one.seed, 'name', side_one.snapshot_name,
        'color', side_one.snapshot_color,
        'badge_key', side_one.snapshot_badge_key::text) end,
      'side_two', case when side_two.id is null then null else jsonb_build_object(
        'seed', side_two.seed, 'name', side_two.snapshot_name,
        'color', side_two.snapshot_color,
        'badge_key', side_two.snapshot_badge_key::text) end,
      'winner_seed', winner.seed,
      'resolution', fixture.resolution::text,
      'score_one', case when public_match.is_public
        then private.championship_match_score(fixture.match_id, 1::smallint)
        else null end,
      'score_two', case when public_match.is_public
        then private.championship_match_score(fixture.match_id, 2::smallint)
        else null end,
      'event_public_id', case when public_match.is_public
        then event.public_id else null end
    ) order by case fixture.stage when 'league' then 1 when 'group' then 2 else 3 end,
      fixture.group_number nulls last, fixture.round_number, fixture.ordinal)
      from public.championship_fixtures fixture
      join public.championship_fixture_slots slot_one
        on slot_one.fixture_id = fixture.id and slot_one.side_index = 1
      join public.championship_fixture_slots slot_two
        on slot_two.fixture_id = fixture.id and slot_two.side_index = 2
      left join public.championship_participants side_one on side_one.id =
        private.championship_fixture_slot_participant(fixture.id, 1::smallint)
      left join public.championship_participants side_two on side_two.id =
        private.championship_fixture_slot_participant(fixture.id, 2::smallint)
      left join public.championship_participants winner
        on winner.id = fixture.winner_participant_id
      left join public.event_matches match on match.id = fixture.match_id
        and match.team_id = fixture.team_id
      left join public.events event on event.id = match.event_id
        and event.team_id = fixture.team_id
      cross join lateral (select coalesce(
        fixture.match_id is not null
        and private.is_team_feature_enabled(fixture.team_id, 'public_event_page')
        and ((match.status = 'live' and match.public_mode = 'live')
          or (match.status = 'finalized'
            and match.public_mode in ('live', 'final_result'))), false
      ) as is_public) public_match
      where fixture.championship_id = target_championship.id
        and fixture.team_id = target_championship.team_id), '[]'::jsonb)
  );
end;
$$;

revoke all on function private.get_championship_league_standings(
  public.championships
) from public;
revoke all on function private.championship_match_score(uuid, smallint)
  from public;
revoke all on function public.set_championship_public_mode(
  uuid, uuid, public.championship_public_mode
) from public, anon, authenticated;
revoke all on function public.get_public_championship(uuid)
  from public, anon, authenticated;

grant execute on function public.set_championship_public_mode(
  uuid, uuid, public.championship_public_mode
) to authenticated;
grant execute on function public.get_public_championship(uuid)
  to anon, authenticated;

comment on function public.set_championship_public_mode(
  uuid, uuid, public.championship_public_mode
) is 'R09: owner/admin publica ou recolhe a página anônima com recibo idempotente.';
comment on function public.get_public_championship(uuid) is
  'R09: projeção anônima mínima sem PII nem IDs internos; sessão não amplia o resultado.';
