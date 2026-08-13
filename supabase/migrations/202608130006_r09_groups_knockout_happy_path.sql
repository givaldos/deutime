-- R09 / WP-R09-03 — grupos, chave eliminatória, byes e decisão motivada.
-- Classificação e avanço continuam reconstruíveis a partir de súmulas
-- finalizadas e decisões explícitas; não há contador esportivo paralelo.

create table public.championship_qualification_decisions (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null,
  team_id uuid not null,
  group_number smallint not null check (group_number between 1 and 8),
  qualifier_position smallint not null check (qualifier_position between 1 and 2),
  participant_id uuid not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (championship_id, team_id, group_number, qualifier_position),
  foreign key (championship_id, team_id)
    references public.championships(id, team_id) on delete cascade,
  foreign key (participant_id, championship_id, team_id)
    references public.championship_participants(id, championship_id, team_id)
    on delete restrict
);

create trigger championship_qualification_decisions_set_updated_at
  before update on public.championship_qualification_decisions
  for each row execute function private.set_updated_at();
create trigger championship_qualification_decisions_immutable
  before update on public.championship_qualification_decisions
  for each row execute function private.prevent_column_changes(
    'id', 'championship_id', 'team_id', 'group_number',
    'qualifier_position', 'created_by', 'created_at'
  );
create trigger audit_championship_qualification_decisions
  after insert or update or delete on public.championship_qualification_decisions
  for each row execute function private.audit_status_change();

alter table public.championship_qualification_decisions enable row level security;

create policy championship_qualification_decisions_select_staff
  on public.championship_qualification_decisions
  for select to authenticated
  using (private.is_team_staff(team_id));

revoke all on public.championship_qualification_decisions
  from public, anon, authenticated;
grant select on public.championship_qualification_decisions to authenticated;

create or replace function private.championship_fixture_slot_participant(
  requested_fixture_id uuid,
  requested_side_index smallint
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_slot public.championship_fixture_slots%rowtype;
  source_winner_id uuid;
  source_side_one_id uuid;
  source_side_two_id uuid;
begin
  select slot.* into target_slot
  from public.championship_fixture_slots slot
  where slot.fixture_id = requested_fixture_id
    and slot.side_index = requested_side_index;

  if target_slot.fixture_id is null or target_slot.kind = 'bye' then
    return null;
  end if;
  if target_slot.kind = 'participant' then
    return target_slot.participant_id;
  end if;

  select fixture.winner_participant_id into source_winner_id
  from public.championship_fixtures fixture
  where fixture.id = target_slot.source_fixture_id;

  if target_slot.kind = 'winner' then
    return source_winner_id;
  end if;

  if source_winner_id is null then
    return null;
  end if;
  source_side_one_id := private.championship_fixture_slot_participant(
    target_slot.source_fixture_id, 1::smallint
  );
  source_side_two_id := private.championship_fixture_slot_participant(
    target_slot.source_fixture_id, 2::smallint
  );
  return case
    when source_side_one_id = source_winner_id then source_side_two_id
    else source_side_one_id
  end;
end;
$$;

create or replace function private.get_championship_group_standings(
  target_championship public.championships
)
returns table (
  group_number smallint,
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
    select
      fixture.group_number as score_group_number,
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
      on match_event.match_id = match.id and match_event.team_id = match.team_id
    where fixture.championship_id = target_championship.id
      and fixture.team_id = target_championship.team_id
      and fixture.stage = 'group'
    group by fixture.id, fixture.group_number, side_one.participant_id,
      side_two.participant_id, match_side_one.id, match_side_two.id
  ), result_rows as (
    select score.score_group_number, score.participant_one_id as result_participant_id,
      score.participant_two_id as opponent_id, score.score_one as scored,
      score.score_two as conceded,
      case
        when score.score_one > score.score_two then target_championship.win_points
        when score.score_one = score.score_two then target_championship.draw_points
        else target_championship.loss_points
      end::integer as result_points
    from fixture_scores score
    union all
    select score.score_group_number, score.participant_two_id,
      score.participant_one_id, score.score_two, score.score_one,
      case
        when score.score_two > score.score_one then target_championship.win_points
        when score.score_two = score.score_one then target_championship.draw_points
        else target_championship.loss_points
      end::integer
    from fixture_scores score
  ), base_stats as (
    select
      participant.group_number as stats_group_number,
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
      and result.score_group_number = participant.group_number
    where participant.championship_id = target_championship.id
      and participant.team_id = target_championship.team_id
      and participant.status = 'active'
      and participant.group_number is not null
    group by participant.id
  ), with_head_to_head as (
    select stats.*,
      coalesce(sum(result.result_points) filter (
        where opponent.stats_participant_id is not null
      ), 0)::integer as stats_head_to_head_points
    from base_stats stats
    left join result_rows result
      on result.result_participant_id = stats.stats_participant_id
      and result.score_group_number = stats.stats_group_number
    left join base_stats opponent
      on opponent.stats_participant_id = result.opponent_id
      and opponent.stats_group_number = stats.stats_group_number
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
    group by stats.stats_group_number, stats.stats_participant_id,
      stats.stats_name, stats.stats_color, stats.stats_badge_key,
      stats.stats_seed, stats.stats_played, stats.stats_wins,
      stats.stats_draws, stats.stats_losses, stats.stats_goals_for,
      stats.stats_goals_against, stats.stats_goal_difference,
      stats.stats_points
  ), ranked as (
    select standings.*,
      dense_rank() over (
        partition by standings.stats_group_number
        order by standings.stats_points desc,
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
  select ranked.stats_group_number, ranked.stats_position,
    ranked.stats_participant_id, ranked.stats_name, ranked.stats_color,
    ranked.stats_badge_key, ranked.stats_played, ranked.stats_wins,
    ranked.stats_draws, ranked.stats_losses, ranked.stats_goals_for,
    ranked.stats_goals_against, ranked.stats_goal_difference,
    ranked.stats_points, ranked.stats_head_to_head_points, ranked.stats_seed
  from ranked
  order by ranked.stats_group_number, ranked.stats_position,
    ranked.stats_seed, ranked.stats_participant_id;
end;
$$;

create or replace function public.get_championship_group_standings(
  requested_championship_id uuid
)
returns table (
  group_number smallint,
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
declare
  current_user_id uuid := (select auth.uid());
  target_championship public.championships%rowtype;
begin
  select championship.* into target_championship
  from public.championships championship
  where championship.id = requested_championship_id;

  if target_championship.id is null
    or target_championship.format <> 'groups_knockout'
    or current_user_id is null
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
  select * from private.get_championship_group_standings(target_championship);
end;
$$;

create or replace function private.create_championship_knockout_bracket(
  requested_championship_id uuid,
  requested_team_id uuid,
  ordered_participant_ids uuid[],
  actor_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  participant_count integer := cardinality(ordered_participant_ids);
  bracket_size integer := 2;
  round_number integer := 1;
  fixture_ordinal integer := 0;
  left_participant_id uuid;
  right_participant_id uuid;
  created_fixture_id uuid;
  previous_fixture_ids uuid[] := '{}'::uuid[];
  current_fixture_ids uuid[];
begin
  while bracket_size < participant_count loop
    bracket_size := bracket_size * 2;
  end loop;

  for pair_index in 1..(bracket_size / 2) loop
    left_participant_id := ordered_participant_ids[pair_index];
    right_participant_id := ordered_participant_ids[bracket_size - pair_index + 1];
    fixture_ordinal := fixture_ordinal + 1;

    insert into public.championship_fixtures (
      championship_id, team_id, stage, status, round_number, ordinal,
      winner_participant_id, resolution, resolution_reason,
      resolved_at, resolved_by, created_by, updated_by
    ) values (
      requested_championship_id, requested_team_id, 'knockout', 'draft',
      round_number, fixture_ordinal,
      case when left_participant_id is null then right_participant_id
           when right_participant_id is null then left_participant_id end,
      case when left_participant_id is null or right_participant_id is null
           then 'administrative'::public.championship_fixture_resolution end,
      case when left_participant_id is null or right_participant_id is null
           then 'Avanço automático por bye do chaveamento publicado.' end,
      case when left_participant_id is null or right_participant_id is null
           then now() end,
      case when left_participant_id is null or right_participant_id is null
           then actor_id end,
      actor_id, actor_id
    ) returning id into created_fixture_id;

    insert into public.championship_fixture_slots (
      fixture_id, championship_id, team_id, side_index, kind, participant_id
    ) values
      (created_fixture_id, requested_championship_id, requested_team_id, 1,
       case when left_participant_id is null
            then 'bye'::public.championship_fixture_slot_kind
            else 'participant'::public.championship_fixture_slot_kind end,
       left_participant_id),
      (created_fixture_id, requested_championship_id, requested_team_id, 2,
       case when right_participant_id is null
            then 'bye'::public.championship_fixture_slot_kind
            else 'participant'::public.championship_fixture_slot_kind end,
       right_participant_id);
    previous_fixture_ids := array_append(previous_fixture_ids, created_fixture_id);
  end loop;

  while cardinality(previous_fixture_ids) > 1 loop
    round_number := round_number + 1;
    current_fixture_ids := '{}'::uuid[];
    for pair_index in 1..(cardinality(previous_fixture_ids) / 2) loop
      fixture_ordinal := fixture_ordinal + 1;
      insert into public.championship_fixtures (
        championship_id, team_id, stage, status, round_number, ordinal,
        created_by, updated_by
      ) values (
        requested_championship_id, requested_team_id, 'knockout', 'draft',
        round_number, fixture_ordinal, actor_id, actor_id
      ) returning id into created_fixture_id;

      insert into public.championship_fixture_slots (
        fixture_id, championship_id, team_id, side_index, kind,
        source_fixture_id
      ) values
        (created_fixture_id, requested_championship_id, requested_team_id,
         1, 'winner', previous_fixture_ids[pair_index * 2 - 1]),
        (created_fixture_id, requested_championship_id, requested_team_id,
         2, 'winner', previous_fixture_ids[pair_index * 2]);
      current_fixture_ids := array_append(current_fixture_ids, created_fixture_id);
    end loop;
    previous_fixture_ids := current_fixture_ids;
  end loop;

  return fixture_ordinal;
end;
$$;

create or replace function public.generate_championship_fixtures(
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
  participant_count integer;
  fixture_ordinal integer := 0;
  group_row record;
  rotation uuid[];
  slot_count integer;
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
    and command.request_id = generate_championship_fixtures.request_id
  for update;
  if existing_command.id is not null then
    if existing_command.action <> 'generate'
      or existing_command.championship_id <> target_championship.id
    then
      raise exception 'Request ID já utilizado' using errcode = '22023';
    end if;
    return (request_id, target_championship.id, target_championship.id, true)
      ::public.championship_command_result;
  end if;

  if not private.is_team_feature_enabled(
    target_championship.team_id, 'championships'
  ) then
    raise exception 'Campeonatos desativados para o time' using errcode = '55000';
  end if;
  if target_championship.status <> 'draft'
    or target_championship.format = 'league'
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

  if participant_count < (
      case when target_championship.format = 'groups_knockout' then 4 else 2 end
    )
    or participant_count > 32
    or (select min(participant.seed) from public.championship_participants participant
        where participant.championship_id = target_championship.id
          and participant.status = 'active') <> 1
    or (select max(participant.seed) from public.championship_participants participant
        where participant.championship_id = target_championship.id
          and participant.status = 'active') <> participant_count
  then
    raise exception 'Revise participantes e seeds' using errcode = '22023';
  end if;

  delete from public.championship_fixtures fixture
  where fixture.championship_id = target_championship.id
    and fixture.team_id = target_championship.team_id
    and fixture.status = 'draft';

  if target_championship.format = 'knockout' then
    fixture_ordinal := private.create_championship_knockout_bracket(
      target_championship.id, target_championship.team_id,
      participant_ids, current_user_id
    );
  else
    if (select count(distinct participant.group_number)
        from public.championship_participants participant
        where participant.championship_id = target_championship.id
          and participant.status = 'active') <> target_championship.group_count
      or exists (
        select 1
        from public.championship_participants participant
        where participant.championship_id = target_championship.id
          and participant.status = 'active'
          and (participant.group_number is null
            or participant.group_number > target_championship.group_count)
      )
      or exists (
        select 1 from (
          select participant.group_number, count(*)::integer as group_size
          from public.championship_participants participant
          where participant.championship_id = target_championship.id
            and participant.status = 'active'
          group by participant.group_number
        ) grouped
        where grouped.group_size <= target_championship.qualifiers_per_group
      )
      or (select max(grouped.group_size) - min(grouped.group_size)
          from (
            select count(*)::integer as group_size
            from public.championship_participants participant
            where participant.championship_id = target_championship.id
              and participant.status = 'active'
            group by participant.group_number
          ) grouped) > 1
    then
      raise exception 'Revise a distribuição dos grupos' using errcode = '22023';
    end if;

    for group_row in
      select participant.group_number,
        array_agg(participant.id order by participant.seed, participant.id) as ids
      from public.championship_participants participant
      where participant.championship_id = target_championship.id
        and participant.status = 'active'
      group by participant.group_number
      order by participant.group_number
    loop
      rotation := group_row.ids;
      if cardinality(rotation) % 2 = 1 then
        rotation := array_append(rotation, null::uuid);
      end if;
      slot_count := cardinality(rotation);

      for round_index in 1..(slot_count - 1) loop
        for pair_index in 1..(slot_count / 2) loop
          left_participant_id := rotation[pair_index];
          right_participant_id := rotation[slot_count - pair_index + 1];
          if left_participant_id is not null and right_participant_id is not null then
            if (round_index + pair_index) % 2 = 0 then
              swap_participant_id := left_participant_id;
              left_participant_id := right_participant_id;
              right_participant_id := swap_participant_id;
            end if;
            fixture_ordinal := fixture_ordinal + 1;
            insert into public.championship_fixtures (
              championship_id, team_id, stage, status, group_number,
              round_number, ordinal, created_by, updated_by
            ) values (
              target_championship.id, target_championship.team_id, 'group',
              'draft', group_row.group_number, round_index, fixture_ordinal,
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
    end loop;
  end if;

  insert into public.championship_commands (
    team_id, championship_id, request_id, action, actor_id, result
  ) values (
    target_championship.team_id, target_championship.id, request_id,
    'generate', current_user_id,
    jsonb_build_object('entity_id', target_championship.id,
      'fixture_count', fixture_ordinal)
  );
  return (request_id, target_championship.id, target_championship.id, false)
    ::public.championship_command_result;
end;
$$;

create or replace function public.publish_championship_format(
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
  bracket_size integer := 2;
begin
  if requested_championship_id is null or request_id is null then
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
    and command.request_id = publish_championship_format.request_id
  for update;
  if existing_command.id is not null then
    if existing_command.action <> 'publish'
      or existing_command.championship_id <> target_championship.id
    then
      raise exception 'Request ID já utilizado' using errcode = '22023';
    end if;
    return (request_id, target_championship.id, target_championship.id, true)
      ::public.championship_command_result;
  end if;
  if not private.is_team_feature_enabled(
    target_championship.team_id, 'championships'
  ) or target_championship.format = 'league' then
    raise exception 'Publicação indisponível' using errcode = '55000';
  end if;

  if target_championship.status in ('published', 'active') then
    insert into public.championship_commands (
      team_id, championship_id, request_id, action, actor_id, result
    ) values (
      target_championship.team_id, target_championship.id, request_id,
      'publish', current_user_id,
      jsonb_build_object('entity_id', target_championship.id,
        'already_published', true)
    );
    return (request_id, target_championship.id, target_championship.id, true)
      ::public.championship_command_result;
  end if;
  if target_championship.status <> 'draft' then
    raise exception 'Campeonato não pode ser publicado' using errcode = '55000';
  end if;

  select count(*)::integer into participant_count
  from public.championship_participants participant
  where participant.championship_id = target_championship.id
    and participant.status = 'active';
  select count(*)::integer into actual_fixture_count
  from public.championship_fixtures fixture
  where fixture.championship_id = target_championship.id
    and fixture.status = 'draft';

  if target_championship.format = 'groups_knockout' then
    select coalesce(sum(grouped.group_size * (grouped.group_size - 1) / 2), 0)::integer
    into expected_fixture_count
    from (
      select count(*)::integer as group_size
      from public.championship_participants participant
      where participant.championship_id = target_championship.id
        and participant.status = 'active'
      group by participant.group_number
    ) grouped;
    if actual_fixture_count <> expected_fixture_count
      or exists (
        select 1
        from public.championship_fixtures fixture
        left join public.championship_fixture_slots slot
          on slot.fixture_id = fixture.id and slot.kind = 'participant'
        where fixture.championship_id = target_championship.id
          and fixture.stage = 'group'
        group by fixture.id
        having count(slot.participant_id) <> 2
          or count(distinct slot.participant_id) <> 2
      )
      or exists (
        select 1 from (
          select fixture.group_number,
            least(side_one.participant_id, side_two.participant_id) as first_id,
            greatest(side_one.participant_id, side_two.participant_id) as second_id
          from public.championship_fixtures fixture
          join public.championship_fixture_slots side_one
            on side_one.fixture_id = fixture.id and side_one.side_index = 1
          join public.championship_fixture_slots side_two
            on side_two.fixture_id = fixture.id and side_two.side_index = 2
          where fixture.championship_id = target_championship.id
            and fixture.stage = 'group'
          group by fixture.group_number,
            least(side_one.participant_id, side_two.participant_id),
            greatest(side_one.participant_id, side_two.participant_id)
          having count(*) <> 1
        ) duplicate_pair
      )
    then
      raise exception 'Revise a fase de grupos antes de publicar'
        using errcode = '22023';
    end if;
  else
    while bracket_size < participant_count loop
      bracket_size := bracket_size * 2;
    end loop;
    expected_fixture_count := bracket_size - 1;
    if actual_fixture_count <> expected_fixture_count
      or (select count(*) from public.championship_fixture_slots slot
          where slot.championship_id = target_championship.id)
        <> expected_fixture_count * 2
      or (select count(*) from public.championship_fixture_slots slot
          where slot.championship_id = target_championship.id
            and slot.kind = 'bye') <> bracket_size - participant_count
      or exists (
        select 1
        from public.championship_fixtures fixture
        join public.championship_fixture_slots slot on slot.fixture_id = fixture.id
        where fixture.championship_id = target_championship.id
        group by fixture.id
        having count(*) filter (where slot.kind = 'bye') > 1
      )
      or exists (
        select 1
        from public.championship_fixtures fixture
        join public.championship_fixture_slots slot on slot.fixture_id = fixture.id
        where fixture.championship_id = target_championship.id
        group by fixture.id, fixture.round_number
        having (fixture.round_number = 1
          and count(*) filter (where slot.kind in ('participant', 'bye')) <> 2)
          or (fixture.round_number > 1
            and count(*) filter (where slot.kind = 'winner') <> 2)
      )
    then
      raise exception 'Revise o chaveamento antes de publicar'
        using errcode = '22023';
    end if;
  end if;

  update public.championship_fixtures fixture
  set status = case
      when fixture.winner_participant_id is not null
        then 'finalized'::public.championship_fixture_status
      else 'scheduled'::public.championship_fixture_status
    end,
    updated_by = current_user_id
  where fixture.championship_id = target_championship.id
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
    jsonb_build_object('entity_id', target_championship.id,
      'fixture_count', actual_fixture_count)
  );
  return (request_id, target_championship.id, target_championship.id, false)
    ::public.championship_command_result;
end;
$$;

create or replace function public.decide_championship_qualifier(
  requested_championship_id uuid,
  request_id uuid,
  requested_group_number smallint,
  requested_qualifier_position smallint,
  requested_participant_id uuid,
  requested_reason text
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
  target_rank integer;
  tied_count integer;
  reason text := nullif(btrim(requested_reason), '');
  decision_id uuid;
begin
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
    and command.request_id = decide_championship_qualifier.request_id
  for update;
  if existing_command.id is not null then
    if existing_command.action <> 'decide_qualifier'
      or existing_command.championship_id <> target_championship.id
    then
      raise exception 'Request ID já utilizado' using errcode = '22023';
    end if;
    return (request_id, target_championship.id,
      (existing_command.result ->> 'entity_id')::uuid, true)
      ::public.championship_command_result;
  end if;
  if not private.is_team_feature_enabled(
      target_championship.team_id, 'championships'
    )
    or target_championship.format <> 'groups_knockout'
    or target_championship.status not in ('published', 'active')
    or requested_group_number not between 1 and target_championship.group_count
    or requested_qualifier_position not between 1
      and target_championship.qualifiers_per_group
    or reason is null or char_length(reason) > 500
    or exists (
      select 1 from public.championship_fixtures fixture
      where fixture.championship_id = target_championship.id
        and fixture.stage = 'knockout'
    )
  then
    raise exception 'Decisão indisponível' using errcode = '55000';
  end if;

  select standing.rank_position into target_rank
  from private.get_championship_group_standings(target_championship) standing
  where standing.group_number = requested_group_number
  order by standing.rank_position, standing.participant_seed,
    standing.participant_id
  offset (requested_qualifier_position - 1) limit 1;
  select count(*)::integer into tied_count
  from private.get_championship_group_standings(target_championship) standing
  where standing.group_number = requested_group_number
    and standing.rank_position = target_rank;

  if target_rank is null or tied_count < 2
    or not exists (
      select 1
      from private.get_championship_group_standings(target_championship) standing
      where standing.group_number = requested_group_number
        and standing.rank_position = target_rank
        and standing.participant_id = requested_participant_id
    )
    or exists (
      select 1
      from public.championship_qualification_decisions decision
      where decision.championship_id = target_championship.id
        and decision.group_number = requested_group_number
        and decision.qualifier_position <> requested_qualifier_position
        and decision.participant_id = requested_participant_id
    )
  then
    raise exception 'A vaga não exige esta decisão' using errcode = '22023';
  end if;

  insert into public.championship_qualification_decisions (
    championship_id, team_id, group_number, qualifier_position,
    participant_id, reason, created_by, updated_by
  ) values (
    target_championship.id, target_championship.team_id,
    requested_group_number, requested_qualifier_position,
    requested_participant_id, reason, current_user_id, current_user_id
  )
  on conflict (championship_id, team_id, group_number, qualifier_position)
  do update set participant_id = excluded.participant_id,
    reason = excluded.reason, updated_by = excluded.updated_by
  returning id into decision_id;

  insert into public.championship_commands (
    team_id, championship_id, request_id, action, actor_id, result
  ) values (
    target_championship.team_id, target_championship.id, request_id,
    'decide_qualifier', current_user_id,
    jsonb_build_object('entity_id', decision_id,
      'group_number', requested_group_number,
      'qualifier_position', requested_qualifier_position,
      'participant_id', requested_participant_id, 'reason', reason)
  );
  return (request_id, target_championship.id, decision_id, false)
    ::public.championship_command_result;
end;
$$;

create or replace function public.advance_championship_groups(
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
  qualifier_ids uuid[] := '{}'::uuid[];
  target_rank integer;
  tied_count integer;
  selected_participant_id uuid;
  fixture_count integer;
begin
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
    and command.request_id = advance_championship_groups.request_id
  for update;
  if existing_command.id is not null then
    if existing_command.action <> 'advance'
      or existing_command.championship_id <> target_championship.id
    then
      raise exception 'Request ID já utilizado' using errcode = '22023';
    end if;
    return (request_id, target_championship.id, target_championship.id, true)
      ::public.championship_command_result;
  end if;
  if not private.is_team_feature_enabled(
      target_championship.team_id, 'championships'
    )
    or target_championship.format <> 'groups_knockout'
    or target_championship.status not in ('published', 'active')
  then
    raise exception 'Avanço indisponível' using errcode = '55000';
  end if;

  if exists (
    select 1 from public.championship_fixtures fixture
    where fixture.championship_id = target_championship.id
      and fixture.stage = 'knockout'
  ) then
    insert into public.championship_commands (
      team_id, championship_id, request_id, action, actor_id, result
    ) values (
      target_championship.team_id, target_championship.id, request_id,
      'advance', current_user_id,
      jsonb_build_object('entity_id', target_championship.id,
        'already_advanced', true)
    );
    return (request_id, target_championship.id, target_championship.id, true)
      ::public.championship_command_result;
  end if;

  if exists (
    select 1
    from public.championship_fixtures fixture
    left join public.event_matches match on match.id = fixture.match_id
    where fixture.championship_id = target_championship.id
      and fixture.stage = 'group'
      and (match.id is null or match.status not in ('finalized', 'void'))
  ) then
    raise exception 'Encerre ou anule todos os jogos dos grupos'
      using errcode = '55000';
  end if;

  for current_qualifier_position in 1..target_championship.qualifiers_per_group loop
    for current_group in 1..target_championship.group_count loop
      select standing.rank_position into target_rank
      from private.get_championship_group_standings(target_championship) standing
      where standing.group_number = current_group
      order by standing.rank_position, standing.participant_seed,
        standing.participant_id
      offset (current_qualifier_position - 1) limit 1;
      select count(*)::integer into tied_count
      from private.get_championship_group_standings(target_championship) standing
      where standing.group_number = current_group
        and standing.rank_position = target_rank;

      if tied_count > 1 then
        select decision.participant_id into selected_participant_id
        from public.championship_qualification_decisions decision
        where decision.championship_id = target_championship.id
          and decision.group_number = current_group
          and decision.qualifier_position = current_qualifier_position
          and exists (
            select 1
            from private.get_championship_group_standings(target_championship) standing
            where standing.group_number = current_group
              and standing.rank_position = target_rank
              and standing.participant_id = decision.participant_id
          );
        if selected_participant_id is null then
          raise exception 'Decida a vaga empatada do grupo %', current_group
            using errcode = '22023';
        end if;
      else
        select standing.participant_id into selected_participant_id
        from private.get_championship_group_standings(target_championship) standing
        where standing.group_number = current_group
          and standing.rank_position = target_rank;
      end if;

      if selected_participant_id is null
        or selected_participant_id = any(qualifier_ids)
      then
        raise exception 'Classificação inválida no grupo %', current_group
          using errcode = '22023';
      end if;
      qualifier_ids := array_append(qualifier_ids, selected_participant_id);
    end loop;
  end loop;

  fixture_count := private.create_championship_knockout_bracket(
    target_championship.id, target_championship.team_id,
    qualifier_ids, current_user_id
  );
  update public.championship_fixtures fixture
  set status = case when fixture.winner_participant_id is not null
      then 'finalized'::public.championship_fixture_status
      else 'scheduled'::public.championship_fixture_status end,
    updated_by = current_user_id
  where fixture.championship_id = target_championship.id
    and fixture.stage = 'knockout' and fixture.status = 'draft';
  update public.championships championship
  set status = 'active', updated_by = current_user_id
  where championship.id = target_championship.id;
  insert into public.championship_commands (
    team_id, championship_id, request_id, action, actor_id, result
  ) values (
    target_championship.team_id, target_championship.id, request_id,
    'advance', current_user_id,
    jsonb_build_object('entity_id', target_championship.id,
      'fixture_count', fixture_count, 'qualifier_ids', qualifier_ids)
  );
  return (request_id, target_championship.id, target_championship.id, false)
    ::public.championship_command_result;
end;
$$;

create or replace function public.resolve_championship_knockout_fixture(
  requested_fixture_id uuid,
  request_id uuid,
  requested_winner_id uuid default null,
  requested_resolution public.championship_fixture_resolution default null,
  requested_reason text default null
)
returns public.championship_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_fixture public.championship_fixtures%rowtype;
  target_championship public.championships%rowtype;
  target_match public.event_matches%rowtype;
  existing_command public.championship_commands%rowtype;
  side_one_participant_id uuid;
  side_two_participant_id uuid;
  resolved_winner_id uuid;
  resolved_resolution public.championship_fixture_resolution;
  resolved_reason text := nullif(btrim(requested_reason), '');
  score_one integer;
  score_two integer;
  dependent record;
  dependent_side_one_id uuid;
  dependent_side_two_id uuid;
  dependent_side_one public.championship_participants%rowtype;
  dependent_side_two public.championship_participants%rowtype;
  correction boolean := false;
begin
  if requested_fixture_id is null or request_id is null then
    raise exception 'Decisão inválida' using errcode = '22023';
  end if;
  select fixture.* into target_fixture
  from public.championship_fixtures fixture
  where fixture.id = requested_fixture_id
  for update;
  if target_fixture.id is null then
    raise exception 'Confronto indisponível' using errcode = '42501';
  end if;
  select championship.* into target_championship
  from public.championships championship
  where championship.id = target_fixture.championship_id
    and championship.team_id = target_fixture.team_id
  for update;
  if current_user_id is null
    or not private.is_team_staff(
      target_fixture.team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Confronto indisponível' using errcode = '42501';
  end if;
  select command.* into existing_command
  from public.championship_commands command
  where command.team_id = target_fixture.team_id
    and command.request_id = resolve_championship_knockout_fixture.request_id
  for update;
  if existing_command.id is not null then
    if existing_command.action <> 'resolve'
      or existing_command.championship_id <> target_fixture.championship_id
      or (existing_command.result ->> 'entity_id')::uuid <> target_fixture.id
    then
      raise exception 'Request ID já utilizado' using errcode = '22023';
    end if;
    return (request_id, target_fixture.championship_id,
      target_fixture.id, true)::public.championship_command_result;
  end if;
  if not private.is_team_feature_enabled(target_fixture.team_id, 'championships')
    or target_championship.status not in ('published', 'active')
    or target_fixture.stage <> 'knockout'
  then
    raise exception 'Decisão indisponível' using errcode = '55000';
  end if;

  side_one_participant_id := private.championship_fixture_slot_participant(
    target_fixture.id, 1::smallint
  );
  side_two_participant_id := private.championship_fixture_slot_participant(
    target_fixture.id, 2::smallint
  );
  if side_one_participant_id is null or side_two_participant_id is null
    or side_one_participant_id = side_two_participant_id
  then
    raise exception 'Confronto ainda não possui dois classificados'
      using errcode = '55000';
  end if;

  if target_fixture.match_id is not null then
    select match.* into target_match
    from public.event_matches match
    where match.id = target_fixture.match_id
      and match.team_id = target_fixture.team_id
    for update;
  end if;

  if target_match.id is not null and target_match.status = 'finalized' then
    select
      greatest(0, coalesce(sum(case
        when event.side_id = side_one.id and event.kind in ('goal', 'own_goal') then 1
        when event.side_id = side_one.id and event.kind = 'score_adjustment'
          then coalesce(event.delta, 0)
        else 0 end), 0))::integer,
      greatest(0, coalesce(sum(case
        when event.side_id = side_two.id and event.kind in ('goal', 'own_goal') then 1
        when event.side_id = side_two.id and event.kind = 'score_adjustment'
          then coalesce(event.delta, 0)
        else 0 end), 0))::integer
    into score_one, score_two
    from public.match_sides side_one
    join public.match_sides side_two
      on side_two.match_id = side_one.match_id and side_two.side_index = 2
    left join public.match_events event
      on event.match_id = side_one.match_id and event.team_id = target_fixture.team_id
    where side_one.match_id = target_match.id and side_one.side_index = 1
    group by side_one.id, side_two.id;

    if score_one <> score_two then
      resolved_winner_id := case when score_one > score_two
        then side_one_participant_id else side_two_participant_id end;
      if requested_winner_id is not null
        and requested_winner_id <> resolved_winner_id
      then
        raise exception 'O vencedor não corresponde ao placar'
          using errcode = '22023';
      end if;
      if requested_resolution is not null and requested_resolution <> 'score'
        or resolved_reason is not null
      then
        raise exception 'Placar definido não aceita decisão manual'
          using errcode = '22023';
      end if;
      resolved_resolution := 'score';
      resolved_reason := null;
    else
      if requested_winner_id is null or requested_winner_id not in (
          side_one_participant_id, side_two_participant_id
        )
        or requested_resolution not in (
          'penalties', 'regulation', 'administrative'
        )
        or resolved_reason is null or char_length(resolved_reason) > 500
      then
        raise exception 'Empate exige vencedor, critério e motivo'
          using errcode = '22023';
      end if;
      resolved_winner_id := requested_winner_id;
      resolved_resolution := requested_resolution;
    end if;
  else
    if requested_winner_id is null or requested_winner_id not in (
        side_one_participant_id, side_two_participant_id
      )
      or requested_resolution not in ('walkover', 'administrative')
      or resolved_reason is null or char_length(resolved_reason) > 500
    then
      raise exception 'W.O. ou decisão administrativa exige vencedor e motivo'
        using errcode = '22023';
    end if;
    resolved_winner_id := requested_winner_id;
    resolved_resolution := requested_resolution;
  end if;

  if target_fixture.winner_participant_id is not null then
    if target_fixture.winner_participant_id = resolved_winner_id
      and target_fixture.resolution = resolved_resolution
      and target_fixture.resolution_reason is not distinct from resolved_reason
    then
      insert into public.championship_commands (
        team_id, championship_id, request_id, action, actor_id, result
      ) values (
        target_fixture.team_id, target_fixture.championship_id, request_id,
        'resolve', current_user_id,
        jsonb_build_object('entity_id', target_fixture.id,
          'already_resolved', true)
      );
      return (request_id, target_fixture.championship_id,
        target_fixture.id, true)::public.championship_command_result;
    end if;
    correction := true;
    if exists (
      select 1
      from public.championship_fixture_slots source_slot
      join public.championship_fixtures dependent_fixture
        on dependent_fixture.id = source_slot.fixture_id
      left join public.event_matches dependent_match
        on dependent_match.id = dependent_fixture.match_id
      where source_slot.source_fixture_id = target_fixture.id
        and (
          dependent_fixture.winner_participant_id is not null
          or dependent_match.status in ('live', 'finalized', 'void')
          or exists (select 1 from public.match_events event
            where event.match_id = dependent_match.id)
          or exists (select 1 from public.match_participations participation
            where participation.match_id = dependent_match.id)
        )
    ) then
      raise exception 'Correção bloqueada: confronto dependente já começou'
        using errcode = '55000';
    end if;
  end if;

  update public.championship_fixtures fixture
  set winner_participant_id = resolved_winner_id,
    resolution = resolved_resolution, resolution_reason = resolved_reason,
    resolved_at = now(), resolved_by = current_user_id,
    status = 'finalized', updated_by = current_user_id
  where fixture.id = target_fixture.id;

  -- Uma correção anterior ao início atualiza os snapshots da partida já
  -- agendada; fatos, participação ou partida iniciada bloqueiam acima.
  for dependent in
    select distinct dependent_fixture.id, dependent_fixture.match_id
    from public.championship_fixture_slots source_slot
    join public.championship_fixtures dependent_fixture
      on dependent_fixture.id = source_slot.fixture_id
    where source_slot.source_fixture_id = target_fixture.id
      and dependent_fixture.match_id is not null
  loop
    dependent_side_one_id := private.championship_fixture_slot_participant(
      dependent.id, 1::smallint
    );
    dependent_side_two_id := private.championship_fixture_slot_participant(
      dependent.id, 2::smallint
    );
    if dependent_side_one_id is not null and dependent_side_two_id is not null then
      select participant.* into dependent_side_one
      from public.championship_participants participant
      where participant.id = dependent_side_one_id;
      select participant.* into dependent_side_two
      from public.championship_participants participant
      where participant.id = dependent_side_two_id;
      update public.match_sides side
      set label = case side.side_index
          when 1 then dependent_side_one.snapshot_name
          else dependent_side_two.snapshot_name end,
        external_snapshot = case side.side_index
          when 1 then jsonb_build_object(
            'name', dependent_side_one.snapshot_name,
            'color', dependent_side_one.snapshot_color,
            'badge_key', dependent_side_one.snapshot_badge_key)
          else jsonb_build_object(
            'name', dependent_side_two.snapshot_name,
            'color', dependent_side_two.snapshot_color,
            'badge_key', dependent_side_two.snapshot_badge_key) end
      where side.match_id = dependent.match_id;
    end if;
  end loop;

  insert into public.championship_commands (
    team_id, championship_id, request_id, action, actor_id, result
  ) values (
    target_fixture.team_id, target_fixture.championship_id, request_id,
    'resolve', current_user_id,
    jsonb_build_object('entity_id', target_fixture.id,
      'winner_participant_id', resolved_winner_id,
      'resolution', resolved_resolution, 'reason', resolved_reason,
      'correction', correction)
  );
  return (request_id, target_fixture.championship_id,
    target_fixture.id, false)::public.championship_command_result;
end;
$$;

-- O contrato original aceitava somente slots diretos. A assinatura permanece
-- compatível, mas agora resolve vencedores de confrontos anteriores sob lock.
create or replace function public.link_championship_fixture_match(
  requested_fixture_id uuid,
  request_id uuid,
  requested_match_id uuid
)
returns public.championship_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_fixture public.championship_fixtures%rowtype;
  target_championship public.championships%rowtype;
  target_match public.event_matches%rowtype;
  existing_command public.championship_commands%rowtype;
  side_one_participant_id uuid;
  side_two_participant_id uuid;
  side_one public.championship_participants%rowtype;
  side_two public.championship_participants%rowtype;
begin
  if requested_fixture_id is null or request_id is null
    or requested_match_id is null
  then
    raise exception 'Vínculo inválido' using errcode = '22023';
  end if;
  select fixture.* into target_fixture
  from public.championship_fixtures fixture
  where fixture.id = requested_fixture_id
  for update;
  if target_fixture.id is null then
    raise exception 'Confronto indisponível' using errcode = '42501';
  end if;
  select championship.* into target_championship
  from public.championships championship
  where championship.id = target_fixture.championship_id
    and championship.team_id = target_fixture.team_id
  for update;
  if current_user_id is null
    or not private.is_team_staff(target_fixture.team_id)
  then
    raise exception 'Confronto indisponível' using errcode = '42501';
  end if;
  select command.* into existing_command
  from public.championship_commands command
  where command.team_id = target_fixture.team_id
    and command.request_id = link_championship_fixture_match.request_id
  for update;
  if existing_command.id is not null then
    if existing_command.action <> 'link_fixture'
      or existing_command.championship_id <> target_fixture.championship_id
      or (existing_command.result ->> 'entity_id')::uuid <> target_fixture.id
    then
      raise exception 'Request ID já utilizado' using errcode = '22023';
    end if;
    return (request_id, target_fixture.championship_id,
      target_fixture.id, true)::public.championship_command_result;
  end if;
  if not private.is_team_feature_enabled(target_fixture.team_id, 'championships')
    or target_championship.status not in ('published', 'active')
    or target_fixture.status not in ('draft', 'scheduled')
    or target_fixture.winner_participant_id is not null
    or target_fixture.match_id is not null
  then
    raise exception 'Vínculo indisponível' using errcode = '55000';
  end if;

  side_one_participant_id := private.championship_fixture_slot_participant(
    target_fixture.id, 1::smallint
  );
  side_two_participant_id := private.championship_fixture_slot_participant(
    target_fixture.id, 2::smallint
  );
  if side_one_participant_id is null or side_two_participant_id is null
    or side_one_participant_id = side_two_participant_id
  then
    raise exception 'Confronto sem dois participantes' using errcode = '22023';
  end if;
  select participant.* into side_one
  from public.championship_participants participant
  where participant.id = side_one_participant_id
    and participant.championship_id = target_fixture.championship_id
    and participant.team_id = target_fixture.team_id;
  select participant.* into side_two
  from public.championship_participants participant
  where participant.id = side_two_participant_id
    and participant.championship_id = target_fixture.championship_id
    and participant.team_id = target_fixture.team_id;
  select match.* into target_match
  from public.event_matches match
  where match.id = requested_match_id and match.team_id = target_fixture.team_id
  for update;
  if target_match.id is null or target_match.status <> 'scheduled'
    or exists (select 1 from public.match_events event
      where event.match_id = target_match.id)
    or exists (select 1 from public.match_participations participation
      where participation.match_id = target_match.id)
    or (select count(*) from public.match_sides side
      where side.match_id = target_match.id) <> 2
  then
    raise exception 'Partida indisponível' using errcode = '22023';
  end if;

  update public.match_sides side
  set label = case side.side_index
      when 1 then side_one.snapshot_name else side_two.snapshot_name end,
    external_snapshot = case side.side_index
      when 1 then jsonb_build_object('name', side_one.snapshot_name,
        'color', side_one.snapshot_color,
        'badge_key', side_one.snapshot_badge_key)
      else jsonb_build_object('name', side_two.snapshot_name,
        'color', side_two.snapshot_color,
        'badge_key', side_two.snapshot_badge_key) end
  where side.match_id = target_match.id;
  update public.championship_fixtures fixture
  set match_id = target_match.id, status = 'scheduled', linked_at = now(),
    linked_by = current_user_id, updated_by = current_user_id
  where fixture.id = target_fixture.id;
  insert into public.championship_commands (
    team_id, championship_id, request_id, action, actor_id, result
  ) values (
    target_fixture.team_id, target_fixture.championship_id, request_id,
    'link_fixture', current_user_id,
    jsonb_build_object('entity_id', target_fixture.id,
      'match_id', target_match.id)
  );
  return (request_id, target_fixture.championship_id,
    target_fixture.id, false)::public.championship_command_result;
end;
$$;

create or replace function public.release_championship_fixture_match(
  requested_fixture_id uuid,
  request_id uuid,
  requested_reason text
)
returns public.championship_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_fixture public.championship_fixtures%rowtype;
  target_match public.event_matches%rowtype;
  target_event public.events%rowtype;
  existing_command public.championship_commands%rowtype;
  reason text := nullif(btrim(requested_reason), '');
begin
  select fixture.* into target_fixture
  from public.championship_fixtures fixture
  where fixture.id = requested_fixture_id
  for update;
  if target_fixture.id is null or current_user_id is null
    or not private.is_team_staff(target_fixture.team_id)
  then
    raise exception 'Confronto indisponível' using errcode = '42501';
  end if;
  select command.* into existing_command
  from public.championship_commands command
  where command.team_id = target_fixture.team_id
    and command.request_id = release_championship_fixture_match.request_id
  for update;
  if existing_command.id is not null then
    if existing_command.action <> 'release_fixture'
      or existing_command.championship_id <> target_fixture.championship_id
      or (existing_command.result ->> 'entity_id')::uuid <> target_fixture.id
    then
      raise exception 'Request ID já utilizado' using errcode = '22023';
    end if;
    return (request_id, target_fixture.championship_id,
      target_fixture.id, true)::public.championship_command_result;
  end if;
  if reason is null or char_length(reason) not between 3 and 500
    or not private.is_team_feature_enabled(target_fixture.team_id, 'championships')
    or target_fixture.match_id is null
    or target_fixture.winner_participant_id is not null
  then
    raise exception 'Remarcação indisponível' using errcode = '55000';
  end if;
  select match.* into target_match
  from public.event_matches match
  where match.id = target_fixture.match_id and match.team_id = target_fixture.team_id
  for update;
  select event.* into target_event
  from public.events event
  where event.id = target_match.event_id and event.team_id = target_match.team_id
  for update;
  if target_match.status <> 'scheduled'
    or target_event.starts_at <= now()
    or exists (select 1 from public.match_events event
      where event.match_id = target_match.id)
    or exists (select 1 from public.match_participations participation
      where participation.match_id = target_match.id)
  then
    raise exception 'Partida já começou e não pode ser liberada'
      using errcode = '55000';
  end if;

  update public.championship_fixtures fixture
  set match_id = null, linked_at = null, linked_by = null,
    status = 'scheduled', updated_by = current_user_id
  where fixture.id = target_fixture.id;
  update public.match_sides side
  set label = case side.side_index when 1 then 'Time A' else 'Time B' end,
    external_snapshot = null
  where side.match_id = target_match.id;
  insert into public.championship_commands (
    team_id, championship_id, request_id, action, actor_id, result
  ) values (
    target_fixture.team_id, target_fixture.championship_id, request_id,
    'release_fixture', current_user_id,
    jsonb_build_object('entity_id', target_fixture.id,
      'released_match_id', target_match.id, 'reason', reason)
  );
  return (request_id, target_fixture.championship_id,
    target_fixture.id, false)::public.championship_command_result;
end;
$$;

create or replace function public.withdraw_championship_participant(
  requested_participant_id uuid,
  request_id uuid,
  requested_reason text
)
returns public.championship_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_participant public.championship_participants%rowtype;
  target_championship public.championships%rowtype;
  existing_command public.championship_commands%rowtype;
  reason text := nullif(btrim(requested_reason), '');
  future_fixture record;
  side_one_id uuid;
  side_two_id uuid;
  opponent_id uuid;
begin
  select participant.* into target_participant
  from public.championship_participants participant
  where participant.id = requested_participant_id
  for update;
  if target_participant.id is null then
    raise exception 'Participante indisponível' using errcode = '42501';
  end if;
  select championship.* into target_championship
  from public.championships championship
  where championship.id = target_participant.championship_id
    and championship.team_id = target_participant.team_id
  for update;
  if current_user_id is null
    or not private.is_team_staff(
      target_participant.team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Participante indisponível' using errcode = '42501';
  end if;
  select command.* into existing_command
  from public.championship_commands command
  where command.team_id = target_participant.team_id
    and command.request_id = withdraw_championship_participant.request_id
  for update;
  if existing_command.id is not null then
    if existing_command.action <> 'withdraw'
      or existing_command.championship_id <> target_participant.championship_id
      or (existing_command.result ->> 'entity_id')::uuid <> target_participant.id
    then
      raise exception 'Request ID já utilizado' using errcode = '22023';
    end if;
    return (request_id, target_participant.championship_id,
      target_participant.id, true)::public.championship_command_result;
  end if;
  if reason is null or char_length(reason) not between 3 and 500
    or not private.is_team_feature_enabled(target_participant.team_id, 'championships')
    or target_championship.status not in ('published', 'active')
  then
    raise exception 'Retirada indisponível' using errcode = '55000';
  end if;
  if target_participant.status = 'withdrawn' then
    insert into public.championship_commands (
      team_id, championship_id, request_id, action, actor_id, result
    ) values (
      target_participant.team_id, target_participant.championship_id,
      request_id, 'withdraw', current_user_id,
      jsonb_build_object('entity_id', target_participant.id,
        'already_withdrawn', true)
    );
    return (request_id, target_participant.championship_id,
      target_participant.id, true)::public.championship_command_result;
  end if;

  if exists (
    select 1
    from public.championship_fixtures fixture
    left join public.event_matches match on match.id = fixture.match_id
    where fixture.championship_id = target_participant.championship_id
      and fixture.winner_participant_id is null
      and (
        private.championship_fixture_slot_participant(
          fixture.id, 1::smallint
        ) = target_participant.id
        or private.championship_fixture_slot_participant(
          fixture.id, 2::smallint
        ) = target_participant.id
      )
      and (
        match.status = 'live'
        or (fixture.stage = 'knockout' and match.status = 'finalized')
        or (
          match.status is distinct from 'finalized'
          and (
            exists (select 1 from public.match_events event
              where event.match_id = match.id)
            or exists (select 1 from public.match_participations participation
              where participation.match_id = match.id)
          )
        )
      )
  ) or exists (
    select 1
    from public.championship_fixtures source_fixture
    join public.championship_fixture_slots source_slot
      on source_slot.source_fixture_id = source_fixture.id
    join public.championship_fixtures dependent_fixture
      on dependent_fixture.id = source_slot.fixture_id
    left join public.event_matches dependent_match
      on dependent_match.id = dependent_fixture.match_id
    where source_fixture.championship_id = target_participant.championship_id
      and source_fixture.winner_participant_id = target_participant.id
      and (
        dependent_fixture.winner_participant_id is not null
        or dependent_match.status in ('live', 'finalized')
        or exists (select 1 from public.match_events event
          where event.match_id = dependent_match.id)
        or exists (select 1 from public.match_participations participation
          where participation.match_id = dependent_match.id)
      )
  ) then
    raise exception 'Retirada bloqueada: confronto dependente já começou'
      using errcode = '55000';
  end if;

  update public.championship_participants participant
  set status = 'withdrawn', updated_by = current_user_id
  where participant.id = target_participant.id;

  for future_fixture in
    select fixture.*
    from public.championship_fixtures fixture
    left join public.event_matches match on match.id = fixture.match_id
    where fixture.championship_id = target_participant.championship_id
      and fixture.winner_participant_id is null
      and coalesce(match.status, 'scheduled') not in ('finalized', 'live')
      and (
        private.championship_fixture_slot_participant(
          fixture.id, 1::smallint
        ) = target_participant.id
        or private.championship_fixture_slot_participant(
          fixture.id, 2::smallint
        ) = target_participant.id
      )
    order by fixture.round_number, fixture.ordinal
  loop
    side_one_id := private.championship_fixture_slot_participant(
      future_fixture.id, 1::smallint
    );
    side_two_id := private.championship_fixture_slot_participant(
      future_fixture.id, 2::smallint
    );
    opponent_id := case when side_one_id = target_participant.id
      then side_two_id else side_one_id end;
    if future_fixture.match_id is not null then
      update public.event_matches match
      set status = 'void', updated_at = now()
      where match.id = future_fixture.match_id
        and match.status = 'scheduled';
    end if;
    if future_fixture.stage = 'knockout' and opponent_id is not null then
      update public.championship_fixtures fixture
      set winner_participant_id = opponent_id, resolution = 'administrative',
        resolution_reason = left('Retirada: ' || reason, 500),
        resolved_at = now(),
        resolved_by = current_user_id, status = 'finalized',
        updated_by = current_user_id
      where fixture.id = future_fixture.id;
    else
      update public.championship_fixtures fixture
      set status = 'void', updated_by = current_user_id
      where fixture.id = future_fixture.id;
    end if;
  end loop;

  insert into public.championship_commands (
    team_id, championship_id, request_id, action, actor_id, result
  ) values (
    target_participant.team_id, target_participant.championship_id,
    request_id, 'withdraw', current_user_id,
    jsonb_build_object('entity_id', target_participant.id, 'reason', reason)
  );
  return (request_id, target_participant.championship_id,
    target_participant.id, false)::public.championship_command_result;
end;
$$;

revoke all on function private.championship_fixture_slot_participant(uuid, smallint)
  from public;
revoke all on function private.get_championship_group_standings(public.championships)
  from public;
revoke all on function private.create_championship_knockout_bracket(
  uuid, uuid, uuid[], uuid
) from public;

revoke all on function public.get_championship_group_standings(uuid)
  from public, anon, authenticated;
revoke all on function public.generate_championship_fixtures(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.publish_championship_format(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.decide_championship_qualifier(
  uuid, uuid, smallint, smallint, uuid, text
) from public, anon, authenticated;
revoke all on function public.advance_championship_groups(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.resolve_championship_knockout_fixture(
  uuid, uuid, uuid, public.championship_fixture_resolution, text
) from public, anon, authenticated;
revoke all on function public.release_championship_fixture_match(
  uuid, uuid, text
) from public, anon, authenticated;
revoke all on function public.withdraw_championship_participant(
  uuid, uuid, text
) from public, anon, authenticated;

grant execute on function public.get_championship_group_standings(uuid)
  to authenticated;
grant execute on function public.generate_championship_fixtures(uuid, uuid)
  to authenticated;
grant execute on function public.publish_championship_format(uuid, uuid)
  to authenticated;
grant execute on function public.decide_championship_qualifier(
  uuid, uuid, smallint, smallint, uuid, text
) to authenticated;
grant execute on function public.advance_championship_groups(uuid, uuid)
  to authenticated;
grant execute on function public.resolve_championship_knockout_fixture(
  uuid, uuid, uuid, public.championship_fixture_resolution, text
) to authenticated;
grant execute on function public.release_championship_fixture_match(
  uuid, uuid, text
) to authenticated;
grant execute on function public.withdraw_championship_participant(
  uuid, uuid, text
) to authenticated;

comment on table public.championship_qualification_decisions is
  'R09: decisão motivada para vaga de grupo ainda absolutamente empatada.';
comment on function public.generate_championship_fixtures(uuid, uuid) is
  'R09: gera grupos ou chave eliminatória reproduzível sob lock, incluindo byes por seed.';
comment on function public.publish_championship_format(uuid, uuid) is
  'R09: publica grupos ou mata-mata depois da revisão estrutural, com replay idempotente.';
comment on function public.advance_championship_groups(uuid, uuid) is
  'R09: classifica grupos encerrados e cria uma única chave eliminatória sob lock.';
comment on function public.resolve_championship_knockout_fixture(
  uuid, uuid, uuid, public.championship_fixture_resolution, text
) is 'R09: resolve ou corrige vencedor eliminatório sem inventar gols e falha fechado após dependência iniciada.';
comment on function public.release_championship_fixture_match(uuid, uuid, text) is
  'R09: libera para remarcação somente vínculo futuro ainda sem fatos ou participação.';
comment on function public.withdraw_championship_participant(uuid, uuid, text) is
  'R09: retira participante com motivo, preserva jogos concluídos e falha fechado após dependência iniciada.';
