-- R09 / WP-R09-01 — contrato inerte de campeonatos, participantes e confrontos.
-- A expansão não altera event_matches e permanece inacessível enquanto a flag
-- championships estiver desligada para todos os times.

create type public.championship_format as enum (
  'league', 'groups_knockout', 'knockout'
);

create type public.championship_status as enum (
  'draft', 'published', 'active', 'completed', 'archived'
);

create type public.championship_public_mode as enum (
  'private', 'public'
);

create type public.championship_tiebreak_key as enum (
  'wins', 'goal_difference', 'goals_for', 'head_to_head'
);

create type public.championship_participant_kind as enum (
  'internal', 'external'
);

create type public.championship_participant_status as enum (
  'active', 'withdrawn'
);

create type public.championship_fixture_stage as enum (
  'league', 'group', 'knockout'
);

create type public.championship_fixture_status as enum (
  'draft', 'scheduled', 'finalized', 'void'
);

create type public.championship_fixture_resolution as enum (
  'score', 'penalties', 'walkover', 'regulation', 'administrative'
);

create type public.championship_fixture_slot_kind as enum (
  'participant', 'winner', 'loser', 'bye'
);

create type public.championship_command_kind as enum (
  'create', 'add_participant', 'link_fixture'
);

create type public.championship_command_result as (
  request_id uuid,
  championship_id uuid,
  entity_id uuid,
  replayed boolean
);

create or replace function private.valid_championship_tiebreak_order(
  requested public.championship_tiebreak_key[]
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select requested is not null
    and cardinality(requested) between 1 and 4
    and cardinality(requested) = (
      select count(distinct item)
      from unnest(requested) as item
    );
$$;

create table public.championships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  public_id uuid not null default gen_random_uuid() unique,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  format public.championship_format not null,
  status public.championship_status not null default 'draft',
  public_mode public.championship_public_mode not null default 'private',
  win_points smallint not null default 3 check (win_points between 0 and 10),
  draw_points smallint not null default 1 check (draw_points between 0 and 10),
  loss_points smallint not null default 0 check (loss_points between 0 and 10),
  tiebreak_order public.championship_tiebreak_key[] not null
    default array[
      'wins'::public.championship_tiebreak_key,
      'goal_difference'::public.championship_tiebreak_key,
      'goals_for'::public.championship_tiebreak_key,
      'head_to_head'::public.championship_tiebreak_key
    ],
  group_count smallint check (group_count between 2 and 8),
  qualifiers_per_group smallint check (qualifiers_per_group between 1 and 2),
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, team_id),
  check (private.valid_championship_tiebreak_order(tiebreak_order)),
  check (
    (format = 'groups_knockout' and group_count is not null and qualifiers_per_group is not null)
    or
    (format <> 'groups_knockout' and group_count is null and qualifiers_per_group is null)
  ),
  check (
    (status = 'draft' and published_at is null and published_by is null)
    or
    (status <> 'draft' and published_at is not null and published_by is not null)
  )
);

create table public.championship_participants (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null,
  team_id uuid not null,
  kind public.championship_participant_kind not null,
  status public.championship_participant_status not null default 'active',
  internal_team_id uuid,
  snapshot_name text not null check (
    char_length(btrim(snapshot_name)) between 1 and 80
  ),
  snapshot_color text not null check (
    snapshot_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  snapshot_badge_key public.internal_squad_badge_key not null,
  seed smallint not null check (seed between 1 and 32),
  group_number smallint check (group_number between 1 and 8),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, championship_id, team_id),
  unique (championship_id, team_id, seed),
  foreign key (championship_id, team_id)
    references public.championships(id, team_id) on delete cascade,
  foreign key (internal_team_id, team_id)
    references public.team_squad_presets(id, team_id) on delete restrict,
  check (
    (kind = 'internal' and internal_team_id is not null)
    or
    (kind = 'external' and internal_team_id is null)
  )
);

create unique index championship_participants_name_ci_idx
  on public.championship_participants(
    championship_id,
    team_id,
    lower(btrim(snapshot_name))
  );

create table public.championship_fixtures (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null,
  team_id uuid not null,
  stage public.championship_fixture_stage not null,
  status public.championship_fixture_status not null default 'draft',
  group_number smallint check (group_number between 1 and 8),
  round_number smallint not null check (round_number between 1 and 32),
  ordinal smallint not null check (ordinal between 1 and 512),
  match_id uuid,
  winner_participant_id uuid,
  resolution public.championship_fixture_resolution,
  resolution_reason text check (
    resolution_reason is null
    or char_length(btrim(resolution_reason)) between 3 and 500
  ),
  linked_at timestamptz,
  linked_by uuid references auth.users(id) on delete restrict,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, championship_id, team_id),
  foreign key (championship_id, team_id)
    references public.championships(id, team_id) on delete cascade,
  foreign key (match_id, team_id)
    references public.event_matches(id, team_id) on delete restrict,
  foreign key (winner_participant_id, championship_id, team_id)
    references public.championship_participants(id, championship_id, team_id)
    on delete restrict,
  check (
    (stage = 'group' and group_number is not null)
    or
    (stage <> 'group' and group_number is null)
  ),
  check (
    (match_id is null and linked_at is null and linked_by is null)
    or
    (match_id is not null and linked_at is not null and linked_by is not null)
  ),
  check (
    (winner_participant_id is null and resolution is null and resolved_at is null and resolved_by is null)
    or
    (winner_participant_id is not null and resolution is not null and resolved_at is not null and resolved_by is not null)
  ),
  check (
    resolution not in ('penalties', 'walkover', 'regulation', 'administrative')
    or nullif(btrim(resolution_reason), '') is not null
  )
);

create unique index championship_fixtures_match_idx
  on public.championship_fixtures(match_id)
  where match_id is not null;

create unique index championship_fixtures_order_idx
  on public.championship_fixtures(
    championship_id,
    team_id,
    stage,
    coalesce(group_number, 0),
    round_number,
    ordinal
  );

create table public.championship_fixture_slots (
  fixture_id uuid not null,
  championship_id uuid not null,
  team_id uuid not null,
  side_index smallint not null check (side_index in (1, 2)),
  kind public.championship_fixture_slot_kind not null,
  participant_id uuid,
  source_fixture_id uuid,
  created_at timestamptz not null default now(),
  primary key (fixture_id, side_index),
  foreign key (fixture_id, championship_id, team_id)
    references public.championship_fixtures(id, championship_id, team_id)
    on delete cascade,
  foreign key (participant_id, championship_id, team_id)
    references public.championship_participants(id, championship_id, team_id)
    on delete restrict,
  foreign key (source_fixture_id, championship_id, team_id)
    references public.championship_fixtures(id, championship_id, team_id)
    on delete restrict,
  check (source_fixture_id is distinct from fixture_id),
  check (
    (kind = 'participant' and participant_id is not null and source_fixture_id is null)
    or
    (kind in ('winner', 'loser') and participant_id is null and source_fixture_id is not null)
    or
    (kind = 'bye' and participant_id is null and source_fixture_id is null)
  )
);

create table public.championship_commands (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  championship_id uuid references public.championships(id) on delete restrict,
  request_id uuid not null,
  action public.championship_command_kind not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  unique (team_id, request_id)
);

create trigger championships_set_updated_at
  before update on public.championships
  for each row execute function private.set_updated_at();
create trigger championship_participants_set_updated_at
  before update on public.championship_participants
  for each row execute function private.set_updated_at();
create trigger championship_fixtures_set_updated_at
  before update on public.championship_fixtures
  for each row execute function private.set_updated_at();

create trigger championships_immutable
  before update on public.championships
  for each row execute function private.prevent_column_changes(
    'id', 'team_id', 'public_id', 'format'
  );
create trigger championship_participants_immutable
  before update on public.championship_participants
  for each row execute function private.prevent_column_changes(
    'id', 'championship_id', 'team_id', 'kind', 'internal_team_id',
    'snapshot_name', 'snapshot_color', 'snapshot_badge_key', 'seed'
  );
create trigger championship_fixtures_immutable
  before update on public.championship_fixtures
  for each row execute function private.prevent_column_changes(
    'id', 'championship_id', 'team_id', 'stage', 'group_number',
    'round_number', 'ordinal'
  );
create trigger championship_fixture_slots_immutable
  before update on public.championship_fixture_slots
  for each row execute function private.prevent_column_changes(
    'fixture_id', 'championship_id', 'team_id', 'side_index', 'kind',
    'participant_id', 'source_fixture_id'
  );

create trigger audit_championships
  after insert or update or delete on public.championships
  for each row execute function private.audit_status_change();
create trigger audit_championship_participants
  after insert or update or delete on public.championship_participants
  for each row execute function private.audit_status_change();
create trigger audit_championship_fixtures
  after insert or update or delete on public.championship_fixtures
  for each row execute function private.audit_status_change();

alter table public.championships enable row level security;
alter table public.championship_participants enable row level security;
alter table public.championship_fixtures enable row level security;
alter table public.championship_fixture_slots enable row level security;
alter table public.championship_commands enable row level security;

create policy championships_select_staff on public.championships
  for select to authenticated
  using (private.is_team_staff(team_id));
create policy championship_participants_select_staff
  on public.championship_participants
  for select to authenticated
  using (private.is_team_staff(team_id));
create policy championship_fixtures_select_staff
  on public.championship_fixtures
  for select to authenticated
  using (private.is_team_staff(team_id));
create policy championship_fixture_slots_select_staff
  on public.championship_fixture_slots
  for select to authenticated
  using (private.is_team_staff(team_id));

create or replace function public.create_championship_draft(
  requested_team_id uuid,
  request_id uuid,
  requested_name text,
  requested_format public.championship_format,
  requested_win_points smallint,
  requested_draw_points smallint,
  requested_loss_points smallint,
  requested_tiebreak_order public.championship_tiebreak_key[],
  requested_group_count smallint default null,
  requested_qualifiers_per_group smallint default null
)
returns public.championship_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  existing_command public.championship_commands%rowtype;
  created_championship public.championships%rowtype;
begin
  if request_id is null
    or requested_format is null
    or nullif(btrim(requested_name), '') is null
    or char_length(btrim(requested_name)) not between 2 and 120
    or requested_win_points is null
    or requested_win_points not between 0 and 10
    or requested_draw_points is null
    or requested_draw_points not between 0 and 10
    or requested_loss_points is null
    or requested_loss_points not between 0 and 10
    or not private.valid_championship_tiebreak_order(requested_tiebreak_order)
    or (
      requested_format = 'groups_knockout'
      and (
        requested_group_count is null
        or requested_group_count not between 2 and 8
        or requested_qualifiers_per_group is null
        or requested_qualifiers_per_group not between 1 and 2
      )
    )
    or (
      requested_format <> 'groups_knockout'
      and (
        requested_group_count is not null
        or requested_qualifiers_per_group is not null
      )
    )
  then
    raise exception 'Campeonato inválido' using errcode = '22023';
  end if;

  if current_user_id is null
    or not private.is_team_staff(
      requested_team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Campeonato indisponível' using errcode = '42501';
  end if;

  perform 1 from public.teams team
  where team.id = requested_team_id
  for update;

  select command.* into existing_command
  from public.championship_commands command
  where command.team_id = requested_team_id
    and command.request_id = create_championship_draft.request_id
  for update;

  if existing_command.id is not null then
    if existing_command.action <> 'create' then
      raise exception 'Request ID já utilizado' using errcode = '22023';
    end if;
    return (
      request_id,
      existing_command.championship_id,
      (existing_command.result ->> 'entity_id')::uuid,
      true
    )::public.championship_command_result;
  end if;

  if not private.is_team_feature_enabled(requested_team_id, 'championships') then
    raise exception 'Campeonatos desativados para o time' using errcode = '55000';
  end if;

  insert into public.championships (
    team_id, name, format, win_points, draw_points, loss_points,
    tiebreak_order, group_count, qualifiers_per_group, created_by, updated_by
  ) values (
    requested_team_id, btrim(requested_name), requested_format,
    requested_win_points, requested_draw_points, requested_loss_points,
    requested_tiebreak_order, requested_group_count,
    requested_qualifiers_per_group, current_user_id, current_user_id
  )
  returning * into created_championship;

  insert into public.championship_commands (
    team_id, championship_id, request_id, action, actor_id, result
  ) values (
    requested_team_id, created_championship.id, request_id, 'create',
    current_user_id, jsonb_build_object('entity_id', created_championship.id)
  );

  return (
    request_id,
    created_championship.id,
    created_championship.id,
    false
  )::public.championship_command_result;
end;
$$;

create or replace function public.add_championship_participant(
  requested_championship_id uuid,
  request_id uuid,
  requested_seed smallint,
  requested_group_number smallint,
  requested_internal_team_id uuid,
  requested_external_name text,
  requested_external_color text,
  requested_external_badge_key public.internal_squad_badge_key
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
  internal_team public.team_squad_presets%rowtype;
  created_participant public.championship_participants%rowtype;
  participant_kind public.championship_participant_kind;
  participant_name text;
  participant_color text;
  participant_badge public.internal_squad_badge_key;
begin
  if request_id is null
    or requested_seed is null
    or requested_seed not between 1 and 32
  then
    raise exception 'Participante inválido' using errcode = '22023';
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
    and command.request_id = add_championship_participant.request_id
  for update;

  if existing_command.id is not null then
    if existing_command.action <> 'add_participant'
      or existing_command.championship_id <> target_championship.id
    then
      raise exception 'Request ID já utilizado' using errcode = '22023';
    end if;
    return (
      request_id,
      target_championship.id,
      (existing_command.result ->> 'entity_id')::uuid,
      true
    )::public.championship_command_result;
  end if;

  if not private.is_team_feature_enabled(
    target_championship.team_id,
    'championships'
  ) then
    raise exception 'Campeonatos desativados para o time' using errcode = '55000';
  end if;

  if target_championship.status <> 'draft'
    or (select count(*) from public.championship_participants participant
      where participant.championship_id = target_championship.id
        and participant.status = 'active') >= 32
    or exists (
      select 1 from public.championship_participants participant
      where participant.championship_id = target_championship.id
        and participant.seed = requested_seed
    )
  then
    raise exception 'Participante inválido' using errcode = '22023';
  end if;

  if target_championship.format = 'groups_knockout' then
    if requested_group_number is null
      or requested_group_number > target_championship.group_count
    then
      raise exception 'Grupo inválido' using errcode = '22023';
    end if;
  elsif requested_group_number is not null then
    raise exception 'Grupo inválido' using errcode = '22023';
  end if;

  if requested_internal_team_id is not null then
    if requested_external_name is not null
      or requested_external_color is not null
      or requested_external_badge_key is not null
    then
      raise exception 'Participante inválido' using errcode = '22023';
    end if;

    select preset.* into internal_team
    from public.team_squad_presets preset
    where preset.id = requested_internal_team_id
      and preset.team_id = target_championship.team_id
      and preset.is_active;

    if internal_team.id is null then
      raise exception 'Participante inválido' using errcode = '22023';
    end if;

    participant_kind := 'internal';
    participant_name := internal_team.name;
    participant_color := internal_team.color;
    participant_badge := internal_team.badge_key;
  else
    if nullif(btrim(requested_external_name), '') is null
      or char_length(btrim(requested_external_name)) > 80
      or requested_external_color !~ '^#[0-9A-Fa-f]{6}$'
      or requested_external_badge_key is null
    then
      raise exception 'Participante inválido' using errcode = '22023';
    end if;

    participant_kind := 'external';
    participant_name := btrim(requested_external_name);
    participant_color := requested_external_color;
    participant_badge := requested_external_badge_key;
  end if;

  if exists (
    select 1 from public.championship_participants participant
    where participant.championship_id = target_championship.id
      and lower(btrim(participant.snapshot_name)) = lower(participant_name)
  ) then
    raise exception 'Participante inválido' using errcode = '22023';
  end if;

  insert into public.championship_participants (
    championship_id, team_id, kind, internal_team_id, snapshot_name,
    snapshot_color, snapshot_badge_key, seed, group_number,
    created_by, updated_by
  ) values (
    target_championship.id, target_championship.team_id, participant_kind,
    requested_internal_team_id, participant_name, participant_color,
    participant_badge, requested_seed, requested_group_number,
    current_user_id, current_user_id
  )
  returning * into created_participant;

  insert into public.championship_commands (
    team_id, championship_id, request_id, action, actor_id, result
  ) values (
    target_championship.team_id, target_championship.id, request_id,
    'add_participant', current_user_id,
    jsonb_build_object('entity_id', created_participant.id)
  );

  return (
    request_id,
    target_championship.id,
    created_participant.id,
    false
  )::public.championship_command_result;
end;
$$;

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
  if request_id is null or requested_match_id is null then
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
    return (
      request_id,
      target_fixture.championship_id,
      target_fixture.id,
      true
    )::public.championship_command_result;
  end if;

  if not private.is_team_feature_enabled(target_fixture.team_id, 'championships')
    or target_championship.status not in ('published', 'active')
    or target_fixture.match_id is not null
  then
    raise exception 'Vínculo indisponível' using errcode = '55000';
  end if;

  select slot.participant_id into side_one_participant_id
  from public.championship_fixture_slots slot
  where slot.fixture_id = target_fixture.id
    and slot.side_index = 1
    and slot.kind = 'participant';

  select slot.participant_id into side_two_participant_id
  from public.championship_fixture_slots slot
  where slot.fixture_id = target_fixture.id
    and slot.side_index = 2
    and slot.kind = 'participant';

  if side_one_participant_id is null
    or side_two_participant_id is null
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
  where match.id = requested_match_id
    and match.team_id = target_fixture.team_id
  for update;

  if target_match.id is null
    or target_match.status <> 'scheduled'
    or exists (
      select 1 from public.match_events event
      where event.match_id = target_match.id
    )
    or exists (
      select 1 from public.match_participations participation
      where participation.match_id = target_match.id
    )
    or (select count(*) from public.match_sides side
      where side.match_id = target_match.id) <> 2
  then
    raise exception 'Partida indisponível' using errcode = '22023';
  end if;

  update public.match_sides side
  set label = case side.side_index
      when 1 then side_one.snapshot_name
      else side_two.snapshot_name
    end,
    external_snapshot = case side.side_index
      when 1 then jsonb_build_object(
        'name', side_one.snapshot_name,
        'color', side_one.snapshot_color,
        'badge_key', side_one.snapshot_badge_key
      )
      else jsonb_build_object(
        'name', side_two.snapshot_name,
        'color', side_two.snapshot_color,
        'badge_key', side_two.snapshot_badge_key
      )
    end
  where side.match_id = target_match.id;

  update public.championship_fixtures fixture
  set match_id = target_match.id,
      status = 'scheduled',
      linked_at = now(),
      linked_by = current_user_id,
      updated_by = current_user_id
  where fixture.id = target_fixture.id;

  insert into public.championship_commands (
    team_id, championship_id, request_id, action, actor_id, result
  ) values (
    target_fixture.team_id, target_fixture.championship_id, request_id,
    'link_fixture', current_user_id,
    jsonb_build_object(
      'entity_id', target_fixture.id,
      'match_id', target_match.id
    )
  );

  return (
    request_id,
    target_fixture.championship_id,
    target_fixture.id,
    false
  )::public.championship_command_result;
end;
$$;

revoke all on function private.valid_championship_tiebreak_order(
  public.championship_tiebreak_key[]
) from public;

revoke all on public.championships, public.championship_participants,
  public.championship_fixtures, public.championship_fixture_slots,
  public.championship_commands from public, anon, authenticated;

grant select on public.championships, public.championship_participants,
  public.championship_fixtures, public.championship_fixture_slots
  to authenticated;

revoke all on function public.create_championship_draft(
  uuid, uuid, text, public.championship_format, smallint, smallint, smallint,
  public.championship_tiebreak_key[], smallint, smallint
) from public, anon, authenticated;
revoke all on function public.add_championship_participant(
  uuid, uuid, smallint, smallint, uuid, text, text,
  public.internal_squad_badge_key
) from public, anon, authenticated;
revoke all on function public.link_championship_fixture_match(
  uuid, uuid, uuid
) from public, anon, authenticated;

grant execute on function public.create_championship_draft(
  uuid, uuid, text, public.championship_format, smallint, smallint, smallint,
  public.championship_tiebreak_key[], smallint, smallint
) to authenticated;
grant execute on function public.add_championship_participant(
  uuid, uuid, smallint, smallint, uuid, text, text,
  public.internal_squad_badge_key
) to authenticated;
grant execute on function public.link_championship_fixture_match(
  uuid, uuid, uuid
) to authenticated;

comment on table public.championships is
  'R09: regulamento versionável do campeonato de um único tenant; flag desligada por padrão.';
comment on table public.championship_participants is
  'R09: identidade e snapshot histórico de equipe interna ou adversário externo sem vínculo cross-tenant.';
comment on table public.championship_fixtures is
  'R09: confronto reconstruível, opcionalmente ligado 1:1 a event_matches sem alterar a tabela de partidas.';
comment on table public.championship_fixture_slots is
  'R09: origem auditável dos dois lados de um confronto, incluindo avanço e bye.';
comment on function public.create_championship_draft(
  uuid, uuid, text, public.championship_format, smallint, smallint, smallint,
  public.championship_tiebreak_key[], smallint, smallint
) is 'R09: cria rascunho idempotente somente para owner/admin com a flag ativa.';
comment on function public.add_championship_participant(
  uuid, uuid, smallint, smallint, uuid, text, text,
  public.internal_squad_badge_key
) is 'R09: adiciona participante idempotente e preserva snapshot sem autorização cross-tenant.';
comment on function public.link_championship_fixture_match(
  uuid, uuid, uuid
) is 'R09: manager ou owner/admin vincula confronto publicado a partida ainda sem fatos.';
