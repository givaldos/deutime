-- R13 / WP-R13-02 — equipes padrão e snapshots profissionais.
-- A expansão permanece inerte enquanto professional_scheduling estiver desligada.

create table public.team_professional_scheduling_settings (
  team_id uuid primary key references public.teams(id) on delete cascade,
  default_home_team_id uuid not null,
  default_away_team_id uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (default_home_team_id, team_id)
    references public.team_squad_presets(id, team_id) on delete restrict,
  foreign key (default_away_team_id, team_id)
    references public.team_squad_presets(id, team_id) on delete restrict,
  check (default_home_team_id <> default_away_team_id)
);

create table public.professional_scheduling_commands (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  request_id uuid not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  kind text not null check (kind in (
    'replace_team_defaults', 'create_event', 'create_championship'
  )),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  result jsonb,
  created_at timestamptz not null default now(),
  unique (team_id, request_id)
);

create trigger team_professional_scheduling_settings_set_updated_at
  before update on public.team_professional_scheduling_settings
  for each row execute function private.set_updated_at();

create trigger team_professional_scheduling_settings_immutable
  before update on public.team_professional_scheduling_settings
  for each row execute function private.prevent_column_changes(
    'team_id', 'created_by'
  );

alter table public.team_professional_scheduling_settings enable row level security;
alter table public.professional_scheduling_commands enable row level security;

create policy team_professional_scheduling_settings_select_staff
  on public.team_professional_scheduling_settings
  for select to authenticated
  using (private.is_team_staff(team_id));

revoke all on public.team_professional_scheduling_settings from anon, authenticated;
revoke all on public.professional_scheduling_commands from anon, authenticated;
grant select on public.team_professional_scheduling_settings to authenticated;

with ranked as (
  select preset.team_id, preset.id,
    row_number() over (
      partition by preset.team_id order by preset.sort_order, preset.id
    ) as position,
    count(*) over (partition by preset.team_id) as active_count
  from public.team_squad_presets preset
  where preset.is_active
), defaults as (
  select ranked.team_id,
    (array_agg(ranked.id order by ranked.position))[1] as home_id,
    (array_agg(ranked.id order by ranked.position))[2] as away_id
  from ranked
  where ranked.active_count = 2
  group by ranked.team_id
)
insert into public.team_professional_scheduling_settings (
  team_id, default_home_team_id, default_away_team_id, created_by, updated_by
)
select defaults.team_id, defaults.home_id, defaults.away_id,
  team.created_by, team.created_by
from defaults
join public.teams team on team.id = defaults.team_id
where defaults.home_id is not null and defaults.away_id is not null;

create or replace function public.replace_team_squad_presets_v2(
  requested_team_id uuid,
  request_id uuid,
  requested_presets jsonb,
  requested_default_home_team_id uuid,
  requested_default_away_team_id uuid
)
returns public.team_squad_preset_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  command_id uuid;
  existing_hash text;
  command_result jsonb;
  payload_hash text;
  preset_result public.team_squad_preset_command_result;
begin
  if request_id is null
    or jsonb_typeof(requested_presets) <> 'array'
    or requested_default_home_team_id is null
    or requested_default_away_team_id is null
    or requested_default_home_team_id = requested_default_away_team_id
    or not exists (
      select 1 from jsonb_to_recordset(requested_presets)
        as preset(id uuid)
      where preset.id = requested_default_home_team_id
    )
    or not exists (
      select 1 from jsonb_to_recordset(requested_presets)
        as preset(id uuid)
      where preset.id = requested_default_away_team_id
    )
  then
    raise exception 'Selecione duas equipes padrão distintas'
      using errcode = '22023';
  end if;

  if current_user_id is null
    or not private.is_team_staff(
      requested_team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Equipes internas indisponíveis' using errcode = '42501';
  end if;

  if not private.is_team_feature_enabled(requested_team_id, 'team_division')
    or not private.is_team_feature_enabled(
      requested_team_id, 'professional_scheduling'
    )
  then
    raise exception 'Agenda profissional desativada para o time'
      using errcode = '55000';
  end if;

  payload_hash := encode(
    extensions.digest(
      convert_to(jsonb_build_object(
        'kind', 'replace_team_defaults',
        'presets', requested_presets,
        'default_home_team_id', requested_default_home_team_id,
        'default_away_team_id', requested_default_away_team_id
      )::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  insert into public.professional_scheduling_commands (
    team_id, request_id, actor_id, kind, payload_hash
  ) values (
    requested_team_id, request_id, current_user_id,
    'replace_team_defaults', payload_hash
  )
  on conflict on constraint professional_scheduling_commands_team_id_request_id_key
    do nothing
  returning id into command_id;

  if command_id is null then
    select command.payload_hash, command.result
    into existing_hash, command_result
    from public.professional_scheduling_commands command
    where command.team_id = requested_team_id
      and command.request_id = replace_team_squad_presets_v2.request_id
    for update;

    if existing_hash <> payload_hash or command_result is null then
      raise exception 'Request ID já utilizado com outro conteúdo'
        using errcode = '22023';
    end if;

    return (
      request_id,
      (command_result ->> 'preset_count')::integer,
      true
    )::public.team_squad_preset_command_result;
  end if;

  preset_result := public.replace_team_squad_presets(
    requested_team_id, request_id, requested_presets
  );

  if not exists (
      select 1 from public.team_squad_presets preset
      where preset.id = requested_default_home_team_id
        and preset.team_id = requested_team_id and preset.is_active
    )
    or not exists (
      select 1 from public.team_squad_presets preset
      where preset.id = requested_default_away_team_id
        and preset.team_id = requested_team_id and preset.is_active
    )
  then
    raise exception 'Selecione equipes padrão ativas do próprio time'
      using errcode = '22023';
  end if;

  insert into public.team_professional_scheduling_settings (
    team_id, default_home_team_id, default_away_team_id,
    created_by, updated_by
  ) values (
    requested_team_id, requested_default_home_team_id,
    requested_default_away_team_id, current_user_id, current_user_id
  )
  on conflict (team_id) do update set
    default_home_team_id = excluded.default_home_team_id,
    default_away_team_id = excluded.default_away_team_id,
    updated_by = current_user_id,
    updated_at = now();

  command_result := jsonb_build_object(
    'preset_count', preset_result.preset_count
  );
  update public.professional_scheduling_commands command
  set result = command_result
  where command.id = command_id;

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata, request_id
  ) values (
    requested_team_id, current_user_id, 'professional.defaults.replaced',
    'team_professional_scheduling_settings', requested_team_id::text,
    jsonb_build_object('preset_count', preset_result.preset_count),
    request_id::text
  );

  return (
    request_id, preset_result.preset_count, false
  )::public.team_squad_preset_command_result;
end;
$$;

create or replace function public.create_event_as_staff_v4(
  requested_team_id uuid,
  request_id uuid,
  starts_at_local timestamp without time zone,
  event_title text,
  event_kind public.event_kind,
  event_organization_mode public.organization_mode,
  event_sport_format public.sport_format,
  event_duration_minutes integer,
  attendance_deadline_minutes integer,
  repeat_weeks integer default 1,
  event_opponent_name text default null,
  event_venue_name text default null,
  event_venue_address text default null,
  requested_home_internal_team_id uuid default null,
  requested_away_internal_team_id uuid default null
)
returns public.event_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  command_id uuid;
  existing_hash text;
  command_result jsonb;
  payload_hash text;
  created_result public.event_command_result;
begin
  if current_user_id is null
    or not private.is_team_staff(requested_team_id)
  then
    raise exception 'Agenda profissional indisponível' using errcode = '42501';
  end if;

  if not private.is_team_feature_enabled(
    requested_team_id, 'professional_scheduling'
  ) then
    raise exception 'Agenda profissional desativada para o time'
      using errcode = '55000';
  end if;

  if requested_home_internal_team_id is null
    or requested_away_internal_team_id is null
    or requested_home_internal_team_id = requested_away_internal_team_id
    or not exists (
      select 1 from public.team_squad_presets preset
      where preset.id = requested_home_internal_team_id
        and preset.team_id = requested_team_id and preset.is_active
    )
    or not exists (
      select 1 from public.team_squad_presets preset
      where preset.id = requested_away_internal_team_id
        and preset.team_id = requested_team_id and preset.is_active
    )
  then
    raise exception 'Selecione duas equipes ativas e distintas do próprio time'
      using errcode = '22023';
  end if;

  payload_hash := encode(
    extensions.digest(
      convert_to(jsonb_build_object(
        'kind', 'create_event',
        'starts_at_local', starts_at_local,
        'title', event_title,
        'event_kind', event_kind,
        'organization_mode', event_organization_mode,
        'sport_format', event_sport_format,
        'duration_minutes', event_duration_minutes,
        'deadline_minutes', attendance_deadline_minutes,
        'repeat_weeks', repeat_weeks,
        'opponent_name', event_opponent_name,
        'venue_name', event_venue_name,
        'venue_address', event_venue_address,
        'home_internal_team_id', requested_home_internal_team_id,
        'away_internal_team_id', requested_away_internal_team_id
      )::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  insert into public.professional_scheduling_commands (
    team_id, request_id, actor_id, kind, payload_hash
  ) values (
    requested_team_id, request_id, current_user_id,
    'create_event', payload_hash
  )
  on conflict on constraint professional_scheduling_commands_team_id_request_id_key
    do nothing
  returning id into command_id;

  if command_id is null then
    select command.payload_hash, command.result
    into existing_hash, command_result
    from public.professional_scheduling_commands command
    where command.team_id = requested_team_id
      and command.request_id = create_event_as_staff_v4.request_id
    for update;

    if existing_hash <> payload_hash or command_result is null then
      raise exception 'Request ID já utilizado com outro conteúdo'
        using errcode = '22023';
    end if;

    return (
      request_id,
      (command_result ->> 'event_id')::uuid,
      (command_result ->> 'series_id')::uuid,
      (command_result ->> 'affected_count')::integer,
      (command_result ->> 'max_schedule_version')::bigint,
      true
    )::public.event_command_result;
  end if;

  created_result := public.create_event_as_staff_v3(
    requested_team_id, request_id, starts_at_local, event_title,
    event_kind, event_organization_mode, event_sport_format,
    event_duration_minutes, attendance_deadline_minutes, repeat_weeks,
    event_opponent_name, event_venue_name, event_venue_address
  );

  insert into public.event_squads (
    event_id, team_id, sport_format, name, color, sort_order, is_official
  )
  select event.id, event.team_id, event.sport_format,
    preset.name, preset.color, side.sort_order, true
  from public.events event
  cross join (values
    (requested_home_internal_team_id, 1::smallint),
    (requested_away_internal_team_id, 2::smallint)
  ) as side(internal_team_id, sort_order)
  join public.team_squad_presets preset
    on preset.id = side.internal_team_id
    and preset.team_id = requested_team_id
    and preset.is_active
  where event.team_id = requested_team_id
    and (
      event.id = created_result.event_id
      or (
        created_result.series_id is not null
        and event.series_id = created_result.series_id
      )
    );

  command_result := jsonb_build_object(
    'event_id', created_result.event_id,
    'series_id', created_result.series_id,
    'affected_count', created_result.affected_count,
    'max_schedule_version', created_result.max_schedule_version
  );
  update public.professional_scheduling_commands command
  set result = command_result
  where command.id = command_id;

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata, request_id
  ) values (
    requested_team_id, current_user_id, 'professional.event.created',
    'event', created_result.event_id::text,
    jsonb_build_object('affected_count', created_result.affected_count),
    request_id::text
  );

  return created_result;
end;
$$;

create or replace function public.create_championship_draft_v2(
  requested_team_id uuid,
  request_id uuid,
  requested_name text,
  requested_format public.championship_format,
  requested_win_points smallint,
  requested_draw_points smallint,
  requested_loss_points smallint,
  requested_tiebreak_order public.championship_tiebreak_key[],
  requested_group_count smallint default null,
  requested_qualifiers_per_group smallint default null,
  requested_internal_team_ids uuid[] default null
)
returns public.championship_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  command_id uuid;
  existing_hash text;
  command_result jsonb;
  payload_hash text;
  created_result public.championship_command_result;
  internal_team_count integer;
begin
  if current_user_id is null
    or not private.is_team_staff(
      requested_team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Campeonato indisponível' using errcode = '42501';
  end if;

  if not private.is_team_feature_enabled(
    requested_team_id, 'professional_scheduling'
  ) then
    raise exception 'Agenda profissional desativada para o time'
      using errcode = '55000';
  end if;

  internal_team_count := cardinality(requested_internal_team_ids);
  if internal_team_count not between 2 and 12
    or (select count(distinct team_id) from unnest(requested_internal_team_ids)
      as team_id) <> internal_team_count
    or exists (
      select 1 from unnest(requested_internal_team_ids) as requested(id)
      left join public.team_squad_presets preset
        on preset.id = requested.id
        and preset.team_id = requested_team_id
        and preset.is_active
      where preset.id is null
    )
  then
    raise exception 'Selecione de 2 a 12 equipes internas ativas do próprio time'
      using errcode = '22023';
  end if;

  payload_hash := encode(
    extensions.digest(
      convert_to(jsonb_build_object(
        'kind', 'create_championship',
        'name', requested_name,
        'format', requested_format,
        'win_points', requested_win_points,
        'draw_points', requested_draw_points,
        'loss_points', requested_loss_points,
        'tiebreak_order', requested_tiebreak_order,
        'group_count', requested_group_count,
        'qualifiers_per_group', requested_qualifiers_per_group,
        'internal_team_ids', requested_internal_team_ids
      )::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  insert into public.professional_scheduling_commands (
    team_id, request_id, actor_id, kind, payload_hash
  ) values (
    requested_team_id, request_id, current_user_id,
    'create_championship', payload_hash
  )
  on conflict on constraint professional_scheduling_commands_team_id_request_id_key
    do nothing
  returning id into command_id;

  if command_id is null then
    select command.payload_hash, command.result
    into existing_hash, command_result
    from public.professional_scheduling_commands command
    where command.team_id = requested_team_id
      and command.request_id = create_championship_draft_v2.request_id
    for update;

    if existing_hash <> payload_hash or command_result is null then
      raise exception 'Request ID já utilizado com outro conteúdo'
        using errcode = '22023';
    end if;

    return (
      request_id,
      (command_result ->> 'championship_id')::uuid,
      (command_result ->> 'entity_id')::uuid,
      true
    )::public.championship_command_result;
  end if;

  created_result := public.create_championship_draft(
    requested_team_id, request_id, requested_name, requested_format,
    requested_win_points, requested_draw_points, requested_loss_points,
    requested_tiebreak_order, requested_group_count,
    requested_qualifiers_per_group
  );

  insert into public.championship_participants (
    championship_id, team_id, kind, internal_team_id, snapshot_name,
    snapshot_color, snapshot_badge_key, seed, group_number,
    created_by, updated_by
  )
  select created_result.championship_id, requested_team_id, 'internal',
    preset.id, preset.name, preset.color, preset.badge_key,
    requested.ordinality::smallint,
    case when requested_format = 'groups_knockout' then
      (((requested.ordinality - 1) % requested_group_count) + 1)::smallint
    else null end,
    current_user_id, current_user_id
  from unnest(requested_internal_team_ids) with ordinality
    as requested(id, ordinality)
  join public.team_squad_presets preset
    on preset.id = requested.id
    and preset.team_id = requested_team_id
    and preset.is_active;

  command_result := jsonb_build_object(
    'championship_id', created_result.championship_id,
    'entity_id', created_result.entity_id
  );
  update public.professional_scheduling_commands command
  set result = command_result
  where command.id = command_id;

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata, request_id
  ) values (
    requested_team_id, current_user_id, 'professional.championship.created',
    'championship', created_result.championship_id::text,
    jsonb_build_object('participant_count', internal_team_count),
    request_id::text
  );

  return created_result;
end;
$$;

revoke all on function public.replace_team_squad_presets_v2(
  uuid, uuid, jsonb, uuid, uuid
) from public, anon;
grant execute on function public.replace_team_squad_presets_v2(
  uuid, uuid, jsonb, uuid, uuid
) to authenticated;

revoke all on function public.create_event_as_staff_v4(
  uuid, uuid, timestamp without time zone, text, public.event_kind,
  public.organization_mode, public.sport_format, integer, integer, integer,
  text, text, text, uuid, uuid
) from public, anon;
grant execute on function public.create_event_as_staff_v4(
  uuid, uuid, timestamp without time zone, text, public.event_kind,
  public.organization_mode, public.sport_format, integer, integer, integer,
  text, text, text, uuid, uuid
) to authenticated;

revoke all on function public.create_championship_draft_v2(
  uuid, uuid, text, public.championship_format, smallint, smallint, smallint,
  public.championship_tiebreak_key[], smallint, smallint, uuid[]
) from public, anon;
grant execute on function public.create_championship_draft_v2(
  uuid, uuid, text, public.championship_format, smallint, smallint, smallint,
  public.championship_tiebreak_key[], smallint, smallint, uuid[]
) to authenticated;

comment on table public.team_professional_scheduling_settings is
  'R13: duas identidades internas padrão; nomes, cores e escudos permanecem nas equipes canônicas.';
comment on table public.professional_scheduling_commands is
  'R13: idempotência interna dos comandos profissionais; sem acesso direto do cliente.';
