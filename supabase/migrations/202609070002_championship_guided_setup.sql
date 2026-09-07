-- R15 CP1 — finalização guiada e transacional do campeonato.

create table public.championship_roster_assignments (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null,
  team_id uuid not null,
  participant_id uuid not null,
  athlete_id uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (championship_id, team_id, athlete_id),
  constraint championship_roster_championship_fk
  foreign key (championship_id, team_id)
    references public.championships(id, team_id) on delete cascade,
  constraint championship_roster_participant_fk
  foreign key (participant_id, championship_id, team_id)
    references public.championship_participants(id, championship_id, team_id)
    on delete restrict,
  constraint championship_roster_athlete_fk
  foreign key (athlete_id, team_id)
    references public.athletes(id, team_id) on delete restrict
);

create index championship_roster_assignments_participant_idx
  on public.championship_roster_assignments(
    championship_id, participant_id, athlete_id
  );

alter table public.championship_roster_assignments enable row level security;

create policy championship_roster_assignments_select_staff
  on public.championship_roster_assignments
  for select to authenticated
  using (private.is_team_staff(team_id));

revoke all on public.championship_roster_assignments
  from public, anon, authenticated;
grant select on public.championship_roster_assignments to authenticated;

create trigger audit_championship_roster_assignments
  after insert or update or delete on public.championship_roster_assignments
  for each row execute function private.audit_status_change();

create or replace function public.is_championship_guided_setup_available()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null;
$$;

create or replace function public.finish_championship_setup(
  requested_championship_id uuid,
  request_id uuid,
  requested_rosters jsonb,
  requested_schedule jsonb,
  requested_sport_format public.sport_format,
  requested_duration_minutes integer,
  requested_attendance_deadline_minutes integer,
  requested_venue_name text default null,
  requested_venue_address text default null
)
returns public.championship_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '60s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_championship public.championships%rowtype;
  existing_command public.championship_commands%rowtype;
  payload_hash text;
  playable_fixture_count integer;
  roster_count integer;
  schedule_count integer;
  created_event_count integer := 0;
  warning_count integer := 0;
  schedule_item record;
  roster_item record;
  target_fixture public.championship_fixtures%rowtype;
  side_one public.championship_participants%rowtype;
  side_two public.championship_participants%rowtype;
  created_event public.event_command_result;
  created_match_id uuid;
  conflict_state record;
begin
  if requested_championship_id is null
    or request_id is null
    or requested_rosters is null
    or requested_schedule is null
    or jsonb_typeof(requested_rosters) <> 'array'
    or jsonb_typeof(requested_schedule) <> 'array'
    or jsonb_array_length(requested_rosters) > 300
    or jsonb_array_length(requested_schedule) > 100
    or requested_sport_format is null
    or requested_duration_minutes is null
    or requested_duration_minutes not between 15 and 480
    or requested_attendance_deadline_minutes is null
    or requested_attendance_deadline_minutes <> all (
      array[0, 60, 120, 180, 360, 720, 1440]
    )
    or (
      nullif(btrim(requested_venue_name), '') is not null
      and char_length(btrim(requested_venue_name)) not between 2 and 120
    )
    or (
      nullif(btrim(requested_venue_address), '') is not null
      and char_length(btrim(requested_venue_address)) > 500
    )
  then
    raise exception 'Revise a configuração do campeonato'
      using errcode = '22023';
  end if;

  payload_hash := encode(
    extensions.digest(
      convert_to(jsonb_build_object(
        'championship_id', requested_championship_id,
        'rosters', requested_rosters,
        'schedule', requested_schedule,
        'sport_format', requested_sport_format,
        'duration_minutes', requested_duration_minutes,
        'deadline_minutes', requested_attendance_deadline_minutes,
        'venue_name', nullif(btrim(requested_venue_name), ''),
        'venue_address', nullif(btrim(requested_venue_address), '')
      )::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

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
    and command.request_id = finish_championship_setup.request_id
  for update;

  if existing_command.id is not null then
    if existing_command.action <> 'finish_setup'
      or existing_command.championship_id <> target_championship.id
      or existing_command.result ->> 'payload_hash' <> payload_hash
    then
      raise exception 'Request ID já utilizado com outro conteúdo'
        using errcode = '22023';
    end if;
    return (
      request_id,
      target_championship.id,
      target_championship.id,
      true
    )::public.championship_command_result;
  end if;

  if target_championship.status <> 'draft'
    or not private.is_team_feature_enabled(
      target_championship.team_id, 'championships'
    )
    or not private.is_team_feature_enabled(
      target_championship.team_id, 'professional_scheduling'
    )
    or not private.is_team_feature_enabled(
      target_championship.team_id, 'event_control'
    )
  then
    raise exception 'Configuração não pode ser concluída agora'
      using errcode = '55000';
  end if;

  select count(*)::integer into roster_count
  from jsonb_to_recordset(requested_rosters)
    as roster(participant_id uuid, athlete_id uuid);

  if roster_count <> (
      select count(distinct roster.athlete_id)::integer
      from jsonb_to_recordset(requested_rosters)
        as roster(participant_id uuid, athlete_id uuid)
    )
    or exists (
      select 1
      from jsonb_to_recordset(requested_rosters)
        as roster(participant_id uuid, athlete_id uuid)
      left join public.championship_participants participant
        on participant.id = roster.participant_id
        and participant.championship_id = target_championship.id
        and participant.team_id = target_championship.team_id
        and participant.kind = 'internal'
        and participant.status = 'active'
      left join public.athletes athlete
        on athlete.id = roster.athlete_id
        and athlete.team_id = target_championship.team_id
        and athlete.status = 'active'
      where participant.id is null or athlete.id is null
    )
    or exists (
      select 1
      from public.championship_participants participant
      where participant.championship_id = target_championship.id
        and participant.team_id = target_championship.team_id
        and participant.kind = 'internal'
        and participant.status = 'active'
        and not exists (
          select 1
          from jsonb_to_recordset(requested_rosters)
            as roster(participant_id uuid, athlete_id uuid)
          where roster.participant_id = participant.id
        )
    )
  then
    raise exception 'Distribua os convocados entre todas as equipes'
      using errcode = '22023';
  end if;

  select count(*)::integer into playable_fixture_count
  from public.championship_fixtures fixture
  join public.championship_fixture_slots side_one_slot
    on side_one_slot.fixture_id = fixture.id
    and side_one_slot.side_index = 1
    and side_one_slot.kind = 'participant'
  join public.championship_fixture_slots side_two_slot
    on side_two_slot.fixture_id = fixture.id
    and side_two_slot.side_index = 2
    and side_two_slot.kind = 'participant'
  where fixture.championship_id = target_championship.id
    and fixture.team_id = target_championship.team_id
    and fixture.status = 'draft';

  select count(*)::integer into schedule_count
  from jsonb_to_recordset(requested_schedule)
    as schedule(fixture_id uuid, starts_at_local timestamp without time zone);

  if playable_fixture_count = 0
    or schedule_count <> playable_fixture_count
    or schedule_count <> (
      select count(distinct schedule.fixture_id)::integer
      from jsonb_to_recordset(requested_schedule)
        as schedule(fixture_id uuid, starts_at_local timestamp without time zone)
    )
    or exists (
      select 1
      from jsonb_to_recordset(requested_schedule)
        as schedule(fixture_id uuid, starts_at_local timestamp without time zone)
      left join public.championship_fixtures fixture
        on fixture.id = schedule.fixture_id
        and fixture.championship_id = target_championship.id
        and fixture.team_id = target_championship.team_id
        and fixture.status = 'draft'
      left join public.championship_fixture_slots side_one_slot
        on side_one_slot.fixture_id = fixture.id
        and side_one_slot.side_index = 1
        and side_one_slot.kind = 'participant'
      left join public.championship_fixture_slots side_two_slot
        on side_two_slot.fixture_id = fixture.id
        and side_two_slot.side_index = 2
        and side_two_slot.kind = 'participant'
      where fixture.id is null
        or side_one_slot.participant_id is null
        or side_two_slot.participant_id is null
        or schedule.starts_at_local is null
        or private.resolve_team_local_datetime(
          target_championship.team_id, schedule.starts_at_local
        ) < now() - interval '5 minutes'
    )
  then
    raise exception 'Revise os horários da agenda' using errcode = '22023';
  end if;

  delete from public.championship_roster_assignments assignment
  where assignment.championship_id = target_championship.id
    and assignment.team_id = target_championship.team_id;

  insert into public.championship_roster_assignments (
    championship_id, team_id, participant_id, athlete_id, created_by
  )
  select target_championship.id, target_championship.team_id,
    roster.participant_id, roster.athlete_id, current_user_id
  from jsonb_to_recordset(requested_rosters)
    as roster(participant_id uuid, athlete_id uuid);

  if target_championship.format = 'league' then
    perform public.publish_league_championship(
      target_championship.id, gen_random_uuid()
    );
  else
    perform public.publish_championship_format(
      target_championship.id, gen_random_uuid()
    );
  end if;

  for schedule_item in
    select schedule.fixture_id, schedule.starts_at_local
    from jsonb_to_recordset(requested_schedule)
      as schedule(fixture_id uuid, starts_at_local timestamp without time zone)
    order by schedule.starts_at_local, schedule.fixture_id
  loop
    select fixture.* into target_fixture
    from public.championship_fixtures fixture
    where fixture.id = schedule_item.fixture_id
      and fixture.championship_id = target_championship.id
      and fixture.team_id = target_championship.team_id
    for update;

    select participant.* into side_one
    from public.championship_fixture_slots slot
    join public.championship_participants participant
      on participant.id = slot.participant_id
      and participant.championship_id = slot.championship_id
      and participant.team_id = slot.team_id
    where slot.fixture_id = target_fixture.id and slot.side_index = 1;

    select participant.* into side_two
    from public.championship_fixture_slots slot
    join public.championship_participants participant
      on participant.id = slot.participant_id
      and participant.championship_id = slot.championship_id
      and participant.team_id = slot.team_id
    where slot.fixture_id = target_fixture.id and slot.side_index = 2;

    created_event := public.create_event_as_staff_v3(
      target_championship.team_id,
      gen_random_uuid(),
      schedule_item.starts_at_local,
      left(target_championship.name || ' · ' || side_one.snapshot_name ||
        ' × ' || side_two.snapshot_name, 120),
      'championship'::public.event_kind,
      'split_teams'::public.organization_mode,
      requested_sport_format,
      requested_duration_minutes,
      requested_attendance_deadline_minutes,
      1,
      case when side_two.kind = 'external'
        then side_two.snapshot_name else null end,
      nullif(btrim(requested_venue_name), ''),
      nullif(btrim(requested_venue_address), '')
    );

    insert into public.event_squads (
      event_id, team_id, sport_format, name, color, badge_key,
      sort_order, is_official, source_internal_team_id
    ) values
      (
        created_event.event_id, target_championship.team_id,
        requested_sport_format, side_one.snapshot_name,
        side_one.snapshot_color, side_one.snapshot_badge_key,
        1, true, side_one.internal_team_id
      ),
      (
        created_event.event_id, target_championship.team_id,
        requested_sport_format, side_two.snapshot_name,
        side_two.snapshot_color, side_two.snapshot_badge_key,
        2, true, side_two.internal_team_id
      );

    delete from public.event_attendance attendance
    where attendance.event_id = created_event.event_id
      and attendance.team_id = target_championship.team_id
      and not exists (
        select 1
        from public.championship_roster_assignments assignment
        where assignment.championship_id = target_championship.id
          and assignment.team_id = target_championship.team_id
          and assignment.participant_id in (side_one.id, side_two.id)
          and assignment.athlete_id = attendance.athlete_id
      );

    created_match_id := public.create_event_match(
      created_event.event_id, 1::smallint, side_one.snapshot_name,
      side_two.snapshot_name,
      case when side_two.kind = 'external'
        then side_two.snapshot_name else null end
    );

    perform public.link_championship_fixture_match(
      target_fixture.id, gen_random_uuid(), created_match_id
    );

    for roster_item in
      select assignment.athlete_id,
        (case when assignment.participant_id = side_one.id then 1 else 2 end)::smallint
          as side_index
      from public.championship_roster_assignments assignment
      where assignment.championship_id = target_championship.id
        and assignment.team_id = target_championship.team_id
        and assignment.participant_id in (side_one.id, side_two.id)
    loop
      perform public.set_match_participation(
        created_match_id, roster_item.athlete_id, roster_item.side_index
      );
    end loop;

    select refreshed.pending_count, refreshed.hard_count,
      refreshed.warning_count
    into conflict_state
    from private.refresh_event_schedule_conflicts(
      target_championship.team_id, created_event.event_id
    ) refreshed;

    if conflict_state.hard_count > 0 then
      raise exception 'Existe conflito de horário na agenda'
        using errcode = '55000';
    end if;

    warning_count := warning_count + coalesce(conflict_state.warning_count, 0);
    created_event_count := created_event_count + 1;
  end loop;

  insert into public.championship_commands (
    team_id, championship_id, request_id, action, actor_id, result
  ) values (
    target_championship.team_id, target_championship.id, request_id,
    'finish_setup', current_user_id,
    jsonb_build_object(
      'entity_id', target_championship.id,
      'payload_hash', payload_hash,
      'event_count', created_event_count,
      'roster_count', roster_count,
      'warning_count', warning_count
    )
  );

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata, request_id
  ) values (
    target_championship.team_id, current_user_id,
    'championship.setup.finished', 'championship',
    target_championship.id::text,
    jsonb_build_object(
      'event_count', created_event_count,
      'roster_count', roster_count,
      'warning_count', warning_count
    ),
    request_id::text
  );

  return (
    request_id,
    target_championship.id,
    target_championship.id,
    false
  )::public.championship_command_result;
end;
$$;

revoke all on function public.finish_championship_setup(
  uuid, uuid, jsonb, jsonb, public.sport_format, integer, integer, text, text
) from public, anon;
grant execute on function public.finish_championship_setup(
  uuid, uuid, jsonb, jsonb, public.sport_format, integer, integer, text, text
) to authenticated;
revoke all on function public.is_championship_guided_setup_available()
  from public, anon;
grant execute on function public.is_championship_guided_setup_available()
  to authenticated;

comment on table public.championship_roster_assignments is
  'R15: convocação escolhida no assistente, sem alterar o cadastro do atleta ou a equipe persistente.';
comment on function public.finish_championship_setup(
  uuid, uuid, jsonb, jsonb, public.sport_format, integer, integer, text, text
) is
  'R15: cria agenda, partidas, lados e participações e só então publica o campeonato na mesma transação.';
