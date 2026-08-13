-- R09 / WP-R09-02 — geração/publicação de pontos corridos e classificação
-- reconstruível. Nenhuma escrita é aberta diretamente ao cliente.

create or replace function public.generate_league_fixtures(
  requested_championship_id uuid,
  request_id uuid
)
returns public.championship_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_championship public.championships%rowtype;
  existing_command public.championship_commands%rowtype;
  participant_ids uuid[];
  rotation uuid[];
  participant_count integer;
  slot_count integer;
  fixture_ordinal integer := 0;
  left_participant_id uuid;
  right_participant_id uuid;
  swap_participant_id uuid;
  created_fixture_id uuid;
begin
  if requested_championship_id is null or request_id is null then
    raise exception 'Geração inválida' using errcode = '22023';
  end if;

  select championship.* into target_championship
  from public.championships championship
  where championship.id = requested_championship_id
  for update;

  if target_championship.id is null
    or current_user_id is null
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
    and command.request_id = generate_league_fixtures.request_id
  for update;

  if existing_command.id is not null then
    if existing_command.action <> 'generate'
      or existing_command.championship_id <> target_championship.id
    then
      raise exception 'Request ID já utilizado' using errcode = '22023';
    end if;
    return (
      request_id,
      target_championship.id,
      target_championship.id,
      true
    )::public.championship_command_result;
  end if;

  if not private.is_team_feature_enabled(
    target_championship.team_id,
    'championships'
  ) then
    raise exception 'Campeonatos desativados para o time' using errcode = '55000';
  end if;

  if target_championship.format <> 'league'
    or target_championship.status <> 'draft'
  then
    raise exception 'Grade indisponível' using errcode = '55000';
  end if;

  select array_agg(participant.id order by participant.seed, participant.id),
         count(*)::integer
  into participant_ids, participant_count
  from public.championship_participants participant
  where participant.championship_id = target_championship.id
    and participant.team_id = target_championship.team_id
    and participant.status = 'active';

  if participant_count not between 2 and 32 then
    raise exception 'Pontos corridos exige de 2 a 32 participantes'
      using errcode = '22023';
  end if;

  -- Uma nova intenção antes da publicação refaz somente a grade em rascunho.
  -- O retry da mesma intenção já retornou acima e não toca nos IDs existentes.
  delete from public.championship_fixtures fixture
  where fixture.championship_id = target_championship.id
    and fixture.team_id = target_championship.team_id
    and fixture.status = 'draft';

  rotation := participant_ids;
  if participant_count % 2 = 1 then
    rotation := array_append(rotation, null::uuid);
  end if;
  slot_count := cardinality(rotation);

  for round_index in 1..(slot_count - 1) loop
    for pair_index in 1..(slot_count / 2) loop
      left_participant_id := rotation[pair_index];
      right_participant_id := rotation[slot_count - pair_index + 1];

      if left_participant_id is not null and right_participant_id is not null then
        -- Alterna os lados de forma determinística sem transformar lado em
        -- vantagem esportiva ou critério de desempate.
        if (round_index + pair_index) % 2 = 0 then
          swap_participant_id := left_participant_id;
          left_participant_id := right_participant_id;
          right_participant_id := swap_participant_id;
        end if;

        fixture_ordinal := fixture_ordinal + 1;
        insert into public.championship_fixtures (
          championship_id, team_id, stage, status, round_number, ordinal,
          created_by, updated_by
        ) values (
          target_championship.id, target_championship.team_id, 'league',
          'draft', round_index, fixture_ordinal,
          current_user_id, current_user_id
        ) returning id into created_fixture_id;

        insert into public.championship_fixture_slots (
          fixture_id, championship_id, team_id, side_index, kind,
          participant_id
        ) values
          (created_fixture_id, target_championship.id,
           target_championship.team_id, 1, 'participant', left_participant_id),
          (created_fixture_id, target_championship.id,
           target_championship.team_id, 2, 'participant', right_participant_id);
      end if;
    end loop;

    rotation := array[rotation[1], rotation[slot_count]]
      || rotation[2:slot_count - 1];
  end loop;

  insert into public.championship_commands (
    team_id, championship_id, request_id, action, actor_id, result
  ) values (
    target_championship.team_id, target_championship.id, request_id,
    'generate', current_user_id,
    jsonb_build_object(
      'entity_id', target_championship.id,
      'fixture_count', fixture_ordinal,
      'round_count', slot_count - 1
    )
  );

  return (
    request_id,
    target_championship.id,
    target_championship.id,
    false
  )::public.championship_command_result;
end;
$$;

create or replace function public.publish_league_championship(
  requested_championship_id uuid,
  request_id uuid
)
returns public.championship_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_championship public.championships%rowtype;
  existing_command public.championship_commands%rowtype;
  participant_count integer;
  expected_fixture_count integer;
  actual_fixture_count integer;
begin
  if requested_championship_id is null or request_id is null then
    raise exception 'Publicação inválida' using errcode = '22023';
  end if;

  select championship.* into target_championship
  from public.championships championship
  where championship.id = requested_championship_id
  for update;

  if target_championship.id is null
    or current_user_id is null
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
    and command.request_id = publish_league_championship.request_id
  for update;

  if existing_command.id is not null then
    if existing_command.action <> 'publish'
      or existing_command.championship_id <> target_championship.id
    then
      raise exception 'Request ID já utilizado' using errcode = '22023';
    end if;
    return (
      request_id,
      target_championship.id,
      target_championship.id,
      true
    )::public.championship_command_result;
  end if;

  if not private.is_team_feature_enabled(
    target_championship.team_id,
    'championships'
  ) then
    raise exception 'Campeonatos desativados para o time' using errcode = '55000';
  end if;

  if target_championship.format <> 'league' then
    raise exception 'Formato ainda não publicável' using errcode = '55000';
  end if;

  -- Duas publicações concorrentes com IDs distintos convergem para o mesmo
  -- estado e recebem recibos separados, sem recriar a grade.
  if target_championship.status in ('published', 'active') then
    insert into public.championship_commands (
      team_id, championship_id, request_id, action, actor_id, result
    ) values (
      target_championship.team_id, target_championship.id, request_id,
      'publish', current_user_id,
      jsonb_build_object(
        'entity_id', target_championship.id,
        'already_published', true
      )
    );
    return (
      request_id,
      target_championship.id,
      target_championship.id,
      true
    )::public.championship_command_result;
  end if;

  if target_championship.status <> 'draft' then
    raise exception 'Campeonato não pode ser publicado' using errcode = '55000';
  end if;

  select count(*)::integer into participant_count
  from public.championship_participants participant
  where participant.championship_id = target_championship.id
    and participant.team_id = target_championship.team_id
    and participant.status = 'active';
  expected_fixture_count := participant_count * (participant_count - 1) / 2;

  select count(*)::integer into actual_fixture_count
  from public.championship_fixtures fixture
  where fixture.championship_id = target_championship.id
    and fixture.team_id = target_championship.team_id
    and fixture.stage = 'league'
    and fixture.status = 'draft';

  if participant_count not between 2 and 32
    or actual_fixture_count <> expected_fixture_count
    or exists (
      select 1
      from public.championship_fixtures fixture
      left join public.championship_fixture_slots slot
        on slot.fixture_id = fixture.id
        and slot.championship_id = fixture.championship_id
        and slot.team_id = fixture.team_id
        and slot.kind = 'participant'
      where fixture.championship_id = target_championship.id
        and fixture.team_id = target_championship.team_id
      group by fixture.id
      having count(slot.participant_id) <> 2
        or count(distinct slot.participant_id) <> 2
    )
    or exists (
      select 1
      from (
        select
          least(side_one.participant_id, side_two.participant_id) as first_id,
          greatest(side_one.participant_id, side_two.participant_id) as second_id
        from public.championship_fixtures fixture
        join public.championship_fixture_slots side_one
          on side_one.fixture_id = fixture.id and side_one.side_index = 1
        join public.championship_fixture_slots side_two
          on side_two.fixture_id = fixture.id and side_two.side_index = 2
        where fixture.championship_id = target_championship.id
          and fixture.team_id = target_championship.team_id
        group by least(side_one.participant_id, side_two.participant_id),
                 greatest(side_one.participant_id, side_two.participant_id)
        having count(*) <> 1
      ) duplicate_pair
    )
  then
    raise exception 'Revise a grade antes de publicar' using errcode = '22023';
  end if;

  update public.championship_fixtures fixture
  set status = 'scheduled', updated_by = current_user_id
  where fixture.championship_id = target_championship.id
    and fixture.team_id = target_championship.team_id
    and fixture.status = 'draft';

  update public.championships championship
  set status = 'published', published_at = now(),
      published_by = current_user_id, updated_by = current_user_id
  where championship.id = target_championship.id;

  insert into public.championship_commands (
    team_id, championship_id, request_id, action, actor_id, result
  ) values (
    target_championship.team_id, target_championship.id, request_id,
    'publish', current_user_id,
    jsonb_build_object(
      'entity_id', target_championship.id,
      'fixture_count', actual_fixture_count
    )
  );

  return (
    request_id,
    target_championship.id,
    target_championship.id,
    false
  )::public.championship_command_result;
end;
$$;

create or replace function public.get_championship_standings(
  requested_championship_id uuid
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
  head_to_head_points integer
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

  if target_championship.id is null
    or current_user_id is null
    or not private.is_team_staff(target_championship.team_id)
  then
    raise exception 'Campeonato indisponível' using errcode = '42501';
  end if;

  if not private.is_team_feature_enabled(
    target_championship.team_id,
    'championships'
  ) then
    raise exception 'Campeonatos desativados para o time' using errcode = '55000';
  end if;

  return query
  with fixture_scores as (
    select
      fixture.id as fixture_id,
      side_one.participant_id as participant_one_id,
      side_two.participant_id as participant_two_id,
      greatest(0, coalesce(sum(
        case
          when match_event.side_id = match_side_one.id
            and match_event.kind in ('goal', 'own_goal') then 1
          when match_event.side_id = match_side_one.id
            and match_event.kind = 'score_adjustment'
            then coalesce(match_event.delta, 0)
          else 0
        end
      ), 0))::integer as score_one,
      greatest(0, coalesce(sum(
        case
          when match_event.side_id = match_side_two.id
            and match_event.kind in ('goal', 'own_goal') then 1
          when match_event.side_id = match_side_two.id
            and match_event.kind = 'score_adjustment'
            then coalesce(match_event.delta, 0)
          else 0
        end
      ), 0))::integer as score_two
    from public.championship_fixtures fixture
    join public.championship_fixture_slots side_one
      on side_one.fixture_id = fixture.id and side_one.side_index = 1
    join public.championship_fixture_slots side_two
      on side_two.fixture_id = fixture.id and side_two.side_index = 2
    join public.event_matches match
      on match.id = fixture.match_id
      and match.team_id = fixture.team_id
      and match.status = 'finalized'
    join public.match_sides match_side_one
      on match_side_one.match_id = match.id and match_side_one.side_index = 1
    join public.match_sides match_side_two
      on match_side_two.match_id = match.id and match_side_two.side_index = 2
    left join public.match_events match_event
      on match_event.match_id = match.id
      and match_event.team_id = match.team_id
    where fixture.championship_id = target_championship.id
      and fixture.team_id = target_championship.team_id
      and fixture.stage = 'league'
    group by fixture.id, side_one.participant_id, side_two.participant_id,
      match_side_one.id, match_side_two.id
  ), result_rows as (
    select
      score.participant_one_id as result_participant_id,
      score.participant_two_id as opponent_id,
      score.score_one as scored,
      score.score_two as conceded,
      case
        when score.score_one > score.score_two then target_championship.win_points
        when score.score_one = score.score_two then target_championship.draw_points
        else target_championship.loss_points
      end::integer as result_points
    from fixture_scores score
    union all
    select
      score.participant_two_id,
      score.participant_one_id,
      score.score_two,
      score.score_one,
      case
        when score.score_two > score.score_one then target_championship.win_points
        when score.score_two = score.score_one then target_championship.draw_points
        else target_championship.loss_points
      end::integer
    from fixture_scores score
  ), base_stats as (
    select
      participant.id as stats_participant_id,
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
    left join result_rows result
      on result.result_participant_id = participant.id
    where participant.championship_id = target_championship.id
      and participant.team_id = target_championship.team_id
      and participant.status = 'active'
    group by participant.id
  ), with_head_to_head as (
    select
      stats.*,
      coalesce(sum(result.result_points) filter (
        where opponent.stats_participant_id is not null
      ), 0)::integer as stats_head_to_head_points
    from base_stats stats
    left join result_rows result
      on result.result_participant_id = stats.stats_participant_id
    left join base_stats opponent
      on opponent.stats_participant_id = result.opponent_id
      and opponent.stats_points = stats.stats_points
      and (
        coalesce(array_position(target_championship.tiebreak_order, 'head_to_head'), 99)
          <= coalesce(array_position(target_championship.tiebreak_order, 'wins'), 99)
        or opponent.stats_wins = stats.stats_wins
      )
      and (
        coalesce(array_position(target_championship.tiebreak_order, 'head_to_head'), 99)
          <= coalesce(array_position(target_championship.tiebreak_order, 'goal_difference'), 99)
        or opponent.stats_goal_difference = stats.stats_goal_difference
      )
      and (
        coalesce(array_position(target_championship.tiebreak_order, 'head_to_head'), 99)
          <= coalesce(array_position(target_championship.tiebreak_order, 'goals_for'), 99)
        or opponent.stats_goals_for = stats.stats_goals_for
      )
    group by stats.stats_participant_id, stats.stats_name, stats.stats_color,
      stats.stats_badge_key, stats.stats_seed, stats.stats_played,
      stats.stats_wins, stats.stats_draws, stats.stats_losses,
      stats.stats_goals_for, stats.stats_goals_against,
      stats.stats_goal_difference, stats.stats_points
  ), ranked as (
    select
      standings.*,
      dense_rank() over (
        order by standings.stats_points desc,
          case target_championship.tiebreak_order[1]
            when 'wins' then standings.stats_wins
            when 'goal_difference' then standings.stats_goal_difference
            when 'goals_for' then standings.stats_goals_for
            when 'head_to_head' then standings.stats_head_to_head_points
          end desc,
          case target_championship.tiebreak_order[2]
            when 'wins' then standings.stats_wins
            when 'goal_difference' then standings.stats_goal_difference
            when 'goals_for' then standings.stats_goals_for
            when 'head_to_head' then standings.stats_head_to_head_points
          end desc,
          case target_championship.tiebreak_order[3]
            when 'wins' then standings.stats_wins
            when 'goal_difference' then standings.stats_goal_difference
            when 'goals_for' then standings.stats_goals_for
            when 'head_to_head' then standings.stats_head_to_head_points
          end desc,
          case target_championship.tiebreak_order[4]
            when 'wins' then standings.stats_wins
            when 'goal_difference' then standings.stats_goal_difference
            when 'goals_for' then standings.stats_goals_for
            when 'head_to_head' then standings.stats_head_to_head_points
          end desc
      )::integer as stats_position
    from with_head_to_head standings
  )
  select
    ranked.stats_position,
    ranked.stats_participant_id,
    ranked.stats_name,
    ranked.stats_color,
    ranked.stats_badge_key,
    ranked.stats_played,
    ranked.stats_wins,
    ranked.stats_draws,
    ranked.stats_losses,
    ranked.stats_goals_for,
    ranked.stats_goals_against,
    ranked.stats_goal_difference,
    ranked.stats_points,
    ranked.stats_head_to_head_points
  from ranked
  order by ranked.stats_position, ranked.stats_seed,
    ranked.stats_participant_id;
end;
$$;

revoke all on function public.generate_league_fixtures(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.publish_league_championship(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.get_championship_standings(uuid)
  from public, anon, authenticated;

grant execute on function public.generate_league_fixtures(uuid, uuid)
  to authenticated;
grant execute on function public.publish_league_championship(uuid, uuid)
  to authenticated;
grant execute on function public.get_championship_standings(uuid)
  to authenticated;

comment on function public.generate_league_fixtures(uuid, uuid) is
  'R09: gera ou revisa sob lock uma grade determinística de turno único, com retry idempotente.';
comment on function public.publish_league_championship(uuid, uuid) is
  'R09: publica uma única grade completa de pontos corridos sob lock e preserva replay concorrente.';
comment on function public.get_championship_standings(uuid) is
  'R09: classificação privada reconstruída de partidas finalizadas, sem contador esportivo paralelo.';
