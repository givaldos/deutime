-- R16 / WP-R16-04 / CMP-01 — resumo privado e confrontos paginados.
-- O app atual permanece intacto e as RPCs falham fechado enquanto a flag estiver
-- desligada. As projeções derivam tenant e papel da sessão verificada.

create type public.championship_fixture_view as enum (
  'upcoming', 'completed', 'unscheduled', 'all'
);

create index championship_fixtures_followup_idx
  on public.championship_fixtures(
    team_id,
    championship_id,
    stage,
    coalesce(group_number, 0),
    round_number,
    ordinal,
    id
  ) include (status, match_id);

create or replace function public.get_championship_followup_summary(
  requested_team_id uuid,
  requested_championship_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  target public.championships%rowtype;
  current_fixture public.championship_fixtures%rowtype;
  active_participant_count integer := 0;
  planned_count integer := 0;
  completed_count integer := 0;
  scheduled_count integer := 0;
  unscheduled_count integer := 0;
  group_pending_count integer := 0;
  knockout_count integer := 0;
  knockout_max_round integer := 0;
  regulation_version_number integer;
  qualification_needs_decision boolean := false;
  target_rank integer;
  tied_count integer;
  phase_kind text;
  phase_label text;
  next_action_kind text;
  next_action_label text;
  next_action_allowed boolean := true;
  next_games jsonb;
begin
  if (select auth.uid()) is null
    or not private.is_team_staff(requested_team_id)
  then
    raise exception 'Campeonato indisponível' using errcode = '42501';
  end if;

  if not private.is_team_feature_enabled(
      requested_team_id, 'championships'::public.feature_key
    )
    or not private.is_team_feature_enabled(
      requested_team_id, 'clear_championship_workspace'::public.feature_key
    )
  then
    raise exception 'Acompanhamento de campeonato indisponível'
      using errcode = 'P0001';
  end if;

  select championship.* into target
  from public.championships championship
  where championship.id = requested_championship_id
    and championship.team_id = requested_team_id;

  if target.id is null then
    raise exception 'Campeonato indisponível' using errcode = '42501';
  end if;

  select count(*)::integer into active_participant_count
  from public.championship_participants participant
  where participant.team_id = requested_team_id
    and participant.championship_id = requested_championship_id
    and participant.status = 'active';

  select
    count(*) filter (where fixture.status <> 'void')::integer,
    count(*) filter (where fixture.status = 'finalized')::integer,
    count(*) filter (
      where fixture.status not in ('finalized', 'void')
        and event.id is not null
        and event.status = 'scheduled'
        and event.professional_schedule_state in ('scheduled', 'pending_review')
        and event.starts_at >= statement_timestamp()
    )::integer,
    count(*) filter (
      where fixture.stage = 'group'
        and fixture.status not in ('finalized', 'void')
    )::integer,
    count(*) filter (where fixture.stage = 'knockout')::integer,
    coalesce(max(fixture.round_number) filter (
      where fixture.stage = 'knockout'
    ), 0)::integer
  into planned_count, completed_count, scheduled_count,
    group_pending_count, knockout_count, knockout_max_round
  from public.championship_fixtures fixture
  left join public.event_matches match
    on match.id = fixture.match_id and match.team_id = fixture.team_id
  left join public.events event
    on event.id = match.event_id and event.team_id = match.team_id
  where fixture.team_id = requested_team_id
    and fixture.championship_id = requested_championship_id;

  unscheduled_count := greatest(
    planned_count - completed_count - scheduled_count,
    0
  );

  select version.version_number into regulation_version_number
  from public.championship_regulation_versions version
  where version.id = target.regulation_version_id
    and version.championship_id = target.id
    and version.team_id = target.team_id;

  if target.status = 'draft' then
    phase_kind := 'configuration';
    phase_label := 'Configuração em andamento';
  else
    select fixture.* into current_fixture
    from public.championship_fixtures fixture
    where fixture.team_id = requested_team_id
      and fixture.championship_id = requested_championship_id
      and fixture.status not in ('finalized', 'void')
    order by
      case fixture.stage when 'group' then 1 when 'league' then 1 else 2 end,
      coalesce(fixture.group_number, 0),
      fixture.round_number,
      fixture.ordinal,
      fixture.id
    limit 1;

    if current_fixture.id is null then
      phase_kind := 'completed';
      phase_label := 'Campeonato concluído';
    elsif current_fixture.stage = 'league' then
      phase_kind := 'league';
      phase_label := 'Rodada ' || current_fixture.round_number;
    elsif current_fixture.stage = 'group' then
      phase_kind := 'group';
      phase_label := 'Fase de grupos, rodada ' || current_fixture.round_number;
    else
      phase_kind := 'knockout';
      phase_label := case knockout_max_round - current_fixture.round_number
        when 0 then 'Final'
        when 1 then 'Semifinal'
        when 2 then 'Quartas de final'
        else 'Fase ' || current_fixture.round_number
      end;
    end if;
  end if;

  if target.format = 'groups_knockout'
    and target.status <> 'draft'
    and group_pending_count = 0
    and knockout_count = 0
  then
    for current_group in 1..target.group_count loop
      for current_qualifier in 1..target.qualifiers_per_group loop
        select standing.rank_position into target_rank
        from private.get_championship_group_standings(target) standing
        where standing.group_number = current_group
        order by standing.rank_position, standing.participant_seed,
          standing.participant_id
        offset (current_qualifier - 1) limit 1;

        select count(*)::integer into tied_count
        from private.get_championship_group_standings(target) standing
        where standing.group_number = current_group
          and standing.rank_position = target_rank;

        if target_rank is not null and tied_count > 1 and not exists (
          select 1
          from public.championship_qualification_decisions decision
          where decision.team_id = target.team_id
            and decision.championship_id = target.id
            and decision.group_number = current_group
            and decision.qualifier_position = current_qualifier
            and exists (
              select 1
              from private.get_championship_group_standings(target) standing
              where standing.group_number = current_group
                and standing.rank_position = target_rank
                and standing.participant_id = decision.participant_id
            )
        ) then
          qualification_needs_decision := true;
        end if;
      end loop;
    end loop;

    phase_kind := 'qualification';
    phase_label := case when qualification_needs_decision
      then 'Classificação precisa de decisão'
      else 'Mata-mata a montar'
    end;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'fixture_id', next_fixture.id,
    'match_id', next_fixture.match_id,
    'event_id', next_fixture.event_id,
    'event_title', next_fixture.event_title,
    'starts_at', next_fixture.starts_at,
    'stage', next_fixture.stage,
    'group_number', next_fixture.group_number,
    'round_number', next_fixture.round_number,
    'side_a', next_fixture.side_a,
    'side_b', next_fixture.side_b
  ) order by next_fixture.starts_at, next_fixture.fixture_ordinal,
    next_fixture.id), '[]'::jsonb)
  into next_games
  from (
    select
      fixture.id,
      fixture.match_id,
      match.event_id,
      event.title as event_title,
      event.starts_at,
      fixture.stage,
      fixture.group_number,
      fixture.round_number,
      fixture.ordinal as fixture_ordinal,
      coalesce((select case slot.kind
          when 'participant' then participant.snapshot_name
          when 'bye' then 'Avança sem jogo'
          when 'winner' then coalesce(source_winner.snapshot_name, 'A definir')
          else 'A definir'
        end
        from public.championship_fixture_slots slot
        left join public.championship_participants participant
          on participant.id = slot.participant_id
          and participant.team_id = slot.team_id
        left join public.championship_fixtures source_fixture
          on source_fixture.id = slot.source_fixture_id
          and source_fixture.team_id = slot.team_id
        left join public.championship_participants source_winner
          on source_winner.id = source_fixture.winner_participant_id
          and source_winner.team_id = slot.team_id
        where slot.fixture_id = fixture.id and slot.side_index = 1
      ), 'A definir') as side_a,
      coalesce((select case slot.kind
          when 'participant' then participant.snapshot_name
          when 'bye' then 'Avança sem jogo'
          when 'winner' then coalesce(source_winner.snapshot_name, 'A definir')
          else 'A definir'
        end
        from public.championship_fixture_slots slot
        left join public.championship_participants participant
          on participant.id = slot.participant_id
          and participant.team_id = slot.team_id
        left join public.championship_fixtures source_fixture
          on source_fixture.id = slot.source_fixture_id
          and source_fixture.team_id = slot.team_id
        left join public.championship_participants source_winner
          on source_winner.id = source_fixture.winner_participant_id
          and source_winner.team_id = slot.team_id
        where slot.fixture_id = fixture.id and slot.side_index = 2
      ), 'A definir') as side_b
    from public.championship_fixtures fixture
    join public.event_matches match
      on match.id = fixture.match_id and match.team_id = fixture.team_id
    join public.events event
      on event.id = match.event_id and event.team_id = match.team_id
    where fixture.team_id = requested_team_id
      and fixture.championship_id = requested_championship_id
      and fixture.status not in ('finalized', 'void')
      and event.status = 'scheduled'
      and event.professional_schedule_state in ('scheduled', 'pending_review')
      and event.starts_at >= statement_timestamp()
    order by event.starts_at, fixture.ordinal, fixture.id
    limit 3
  ) next_fixture;

  if target.status = 'draft' then
    next_action_kind := 'continue_setup';
    next_action_label := 'Continuar configuração';
    next_action_allowed := private.is_team_staff(
      requested_team_id, array['owner', 'admin']::public.team_role[]
    );
  elsif qualification_needs_decision then
    next_action_kind := 'resolve_qualification';
    next_action_label := 'Resolver classificação';
    next_action_allowed := private.is_team_staff(
      requested_team_id, array['owner', 'admin']::public.team_role[]
    );
  elsif target.format = 'groups_knockout'
    and group_pending_count = 0 and knockout_count = 0
  then
    next_action_kind := 'build_knockout';
    next_action_label := 'Montar mata-mata';
    next_action_allowed := private.is_team_staff(
      requested_team_id, array['owner', 'admin']::public.team_role[]
    );
  elsif unscheduled_count > 0 then
    next_action_kind := 'schedule_matches';
    next_action_label := 'Agendar jogos';
  elsif jsonb_array_length(next_games) > 0 then
    next_action_kind := 'view_next_match';
    next_action_label := 'Ver próximo jogo';
  else
    next_action_kind := 'completed';
    next_action_label := 'Campeonato encerrado';
    next_action_allowed := false;
  end if;

  return jsonb_build_object(
    'championship', jsonb_build_object(
      'id', target.id,
      'name', target.name,
      'format', target.format,
      'status', target.status,
      'status_label', case target.status
        when 'draft' then 'Configuração em andamento'
        when 'published' then 'A começar'
        when 'active' then 'Em andamento'
        when 'completed' then 'Encerrado'
        when 'archived' then 'Arquivado'
      end,
      'public_mode', target.public_mode
    ),
    'phase', jsonb_build_object(
      'kind', phase_kind,
      'label', phase_label,
      'stage', current_fixture.stage,
      'group_number', current_fixture.group_number,
      'round_number', current_fixture.round_number
    ),
    'progress', jsonb_build_object(
      'completed_matches', completed_count,
      'planned_matches', planned_count,
      'scheduled_matches', scheduled_count,
      'unscheduled_matches', unscheduled_count
    ),
    'next_games', next_games,
    'next_action', jsonb_build_object(
      'kind', next_action_kind,
      'label', next_action_label,
      'allowed', next_action_allowed
    ),
    'active_participants', active_participant_count,
    'regulation_version_number', regulation_version_number
  );
end;
$$;

create or replace function public.list_championship_followup_fixtures(
  requested_team_id uuid,
  requested_championship_id uuid,
  requested_stage public.championship_fixture_stage default null,
  requested_group_number smallint default null,
  requested_round_number smallint default null,
  requested_view public.championship_fixture_view default 'all',
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
  cursor_stage_rank integer;
  cursor_group_number integer;
  cursor_round_number integer;
  cursor_ordinal integer;
  cursor_id uuid;
  result jsonb;
begin
  if (select auth.uid()) is null
    or not private.is_team_staff(requested_team_id)
  then
    raise exception 'Campeonato indisponível' using errcode = '42501';
  end if;

  if not private.is_team_feature_enabled(
      requested_team_id, 'championships'::public.feature_key
    )
    or not private.is_team_feature_enabled(
      requested_team_id, 'clear_championship_workspace'::public.feature_key
    )
  then
    raise exception 'Acompanhamento de campeonato indisponível'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.championships championship
    where championship.id = requested_championship_id
      and championship.team_id = requested_team_id
  ) then
    raise exception 'Campeonato indisponível' using errcode = '42501';
  end if;

  if requested_view is null
    or requested_limit is null
    or requested_limit not between 1 and 50
    or requested_group_number is not null and (
      requested_group_number not between 1 and 8
      or requested_stage is distinct from 'group'
    )
    or requested_round_number is not null
      and requested_round_number not between 1 and 32
  then
    raise exception 'Filtros de confrontos inválidos' using errcode = '22023';
  end if;

  if requested_cursor is not null then
    if jsonb_typeof(requested_cursor) <> 'object'
      or requested_cursor - array[
        'stage_rank', 'group_number', 'round_number', 'ordinal', 'id'
      ] <> '{}'::jsonb
      or not requested_cursor ?& array[
        'stage_rank', 'group_number', 'round_number', 'ordinal', 'id'
      ]
    then
      raise exception 'Cursor de confrontos inválido' using errcode = '22023';
    end if;
    begin
      cursor_stage_rank := (requested_cursor ->> 'stage_rank')::integer;
      cursor_group_number := (requested_cursor ->> 'group_number')::integer;
      cursor_round_number := (requested_cursor ->> 'round_number')::integer;
      cursor_ordinal := (requested_cursor ->> 'ordinal')::integer;
      cursor_id := (requested_cursor ->> 'id')::uuid;
    exception when others then
      raise exception 'Cursor de confrontos inválido' using errcode = '22023';
    end;
    if cursor_stage_rank not between 1 and 3
      or cursor_group_number not between 0 and 8
      or cursor_round_number not between 1 and 32
      or cursor_ordinal not between 1 and 512
    then
      raise exception 'Cursor de confrontos inválido' using errcode = '22023';
    end if;
  end if;

  with filtered as materialized (
    select
      fixture.id,
      fixture.stage,
      case fixture.stage when 'league' then 1 when 'group' then 2 else 3 end
        as stage_rank,
      fixture.group_number,
      coalesce(fixture.group_number, 0) as group_sort,
      fixture.round_number,
      fixture.ordinal,
      fixture.status,
      case
        when fixture.status = 'void' then 'void'
        when fixture.status = 'finalized' then 'completed'
        when event.id is not null
          and event.status = 'scheduled'
          and event.professional_schedule_state in ('scheduled', 'pending_review')
          and event.starts_at >= statement_timestamp() then 'upcoming'
        else 'unscheduled'
      end as situation,
      fixture.match_id,
      match.event_id,
      event.title as event_title,
      event.starts_at,
      coalesce((select case slot.kind
          when 'participant' then participant.snapshot_name
          when 'bye' then 'Avança sem jogo'
          when 'winner' then coalesce(source_winner.snapshot_name, 'A definir')
          else 'A definir'
        end
        from public.championship_fixture_slots slot
        left join public.championship_participants participant
          on participant.id = slot.participant_id
          and participant.team_id = slot.team_id
        left join public.championship_fixtures source_fixture
          on source_fixture.id = slot.source_fixture_id
          and source_fixture.team_id = slot.team_id
        left join public.championship_participants source_winner
          on source_winner.id = source_fixture.winner_participant_id
          and source_winner.team_id = slot.team_id
        where slot.fixture_id = fixture.id and slot.side_index = 1
      ), 'A definir') as side_a,
      coalesce((select case slot.kind
          when 'participant' then participant.snapshot_name
          when 'bye' then 'Avança sem jogo'
          when 'winner' then coalesce(source_winner.snapshot_name, 'A definir')
          else 'A definir'
        end
        from public.championship_fixture_slots slot
        left join public.championship_participants participant
          on participant.id = slot.participant_id
          and participant.team_id = slot.team_id
        left join public.championship_fixtures source_fixture
          on source_fixture.id = slot.source_fixture_id
          and source_fixture.team_id = slot.team_id
        left join public.championship_participants source_winner
          on source_winner.id = source_fixture.winner_participant_id
          and source_winner.team_id = slot.team_id
        where slot.fixture_id = fixture.id and slot.side_index = 2
      ), 'A definir') as side_b
    from public.championship_fixtures fixture
    left join public.event_matches match
      on match.id = fixture.match_id and match.team_id = fixture.team_id
    left join public.events event
      on event.id = match.event_id and event.team_id = match.team_id
    where fixture.team_id = requested_team_id
      and fixture.championship_id = requested_championship_id
      and (requested_stage is null or fixture.stage = requested_stage)
      and (requested_group_number is null
        or fixture.group_number = requested_group_number)
      and (requested_round_number is null
        or fixture.round_number = requested_round_number)
      and (requested_view = 'all'
        or requested_view = 'completed' and fixture.status = 'finalized'
        or requested_view = 'upcoming' and fixture.status not in ('finalized', 'void')
          and event.id is not null and event.status = 'scheduled'
          and event.professional_schedule_state in ('scheduled', 'pending_review')
          and event.starts_at >= statement_timestamp()
        or requested_view = 'unscheduled' and fixture.status not in ('finalized', 'void')
          and not (event.id is not null and event.status = 'scheduled'
            and event.professional_schedule_state in ('scheduled', 'pending_review')
            and event.starts_at >= statement_timestamp())
      )
  ), after_cursor as (
    select * from filtered item
    where requested_cursor is null
      or (item.stage_rank, item.group_sort, item.round_number, item.ordinal, item.id)
        > (cursor_stage_rank, cursor_group_number, cursor_round_number,
          cursor_ordinal, cursor_id)
  ), numbered as (
    select item.*, row_number() over (order by item.stage_rank,
      item.group_sort, item.round_number, item.ordinal, item.id) as page_number
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
      to_jsonb(item) - array['stage_rank', 'group_sort', 'page_number']
      order by item.page_number
    ) from page_items item), '[]'::jsonb),
    'filtered_count', (select count(*) from filtered),
    'next_cursor', case when (select has_more from page_meta) then (
      select jsonb_build_object(
        'stage_rank', item.stage_rank,
        'group_number', item.group_sort,
        'round_number', item.round_number,
        'ordinal', item.ordinal,
        'id', item.id
      ) from page_items item order by item.page_number desc limit 1
    ) else null end,
    'effective_filters', jsonb_strip_nulls(jsonb_build_object(
      'stage', requested_stage,
      'group_number', requested_group_number,
      'round_number', requested_round_number,
      'view', requested_view,
      'limit', requested_limit
    ))
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_championship_followup_summary(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.list_championship_followup_fixtures(
  uuid, uuid, public.championship_fixture_stage, smallint, smallint,
  public.championship_fixture_view, integer, jsonb
) from public, anon, authenticated;

grant execute on function public.get_championship_followup_summary(uuid, uuid)
  to authenticated;
grant execute on function public.list_championship_followup_fixtures(
  uuid, uuid, public.championship_fixture_stage, smallint, smallint,
  public.championship_fixture_view, integer, jsonb
) to authenticated;

comment on function public.get_championship_followup_summary(uuid, uuid) is
  'R16: resumo privado do campeonato com fase, progresso, próximos jogos e ação prioritária; exige staff e flag do time.';
comment on function public.list_championship_followup_fixtures(
  uuid, uuid, public.championship_fixture_stage, smallint, smallint,
  public.championship_fixture_view, integer, jsonb
) is 'R16: confrontos privados paginados por ordem esportiva; exige staff e flag do time.';
