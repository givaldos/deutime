-- R07 / WP-R07-05 — modelos reutilizáveis, isolados do snapshot de cada evento.

create type public.team_squad_preset_command_result as (
  request_id uuid,
  preset_count integer,
  replayed boolean
);

create table public.team_squad_presets (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (
    char_length(btrim(name)) between 1 and 60
    and btrim(name) !~ '^__r07_'
  ),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order smallint not null check (sort_order between 1 and 12),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, team_id),
  unique (team_id, sort_order)
);

create unique index team_squad_presets_name_ci_idx
  on public.team_squad_presets(team_id, lower(btrim(name)));

create table public.team_squad_preset_commands (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  request_id uuid not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  unique (team_id, request_id)
);

create or replace function public.replace_team_squad_presets(
  requested_team_id uuid,
  request_id uuid,
  requested_presets jsonb
)
returns public.team_squad_preset_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  existing_command public.team_squad_preset_commands%rowtype;
  preset_count integer;
begin
  if request_id is null or jsonb_typeof(requested_presets) <> 'array' then
    raise exception 'Modelos inválidos' using errcode = '22023';
  end if;

  if current_user_id is null
    or not private.is_team_staff(
      requested_team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Modelos indisponíveis' using errcode = '42501';
  end if;

  perform 1 from public.teams team
  where team.id = requested_team_id
  for update;

  select command.* into existing_command
  from public.team_squad_preset_commands command
  where command.team_id = requested_team_id
    and command.request_id = replace_team_squad_presets.request_id
  for update;

  if existing_command.id is not null then
    return (
      request_id,
      (existing_command.result ->> 'preset_count')::integer,
      true
    )::public.team_squad_preset_command_result;
  end if;

  if not private.is_team_feature_enabled(requested_team_id, 'team_division') then
    raise exception 'Divisão desativada para o time' using errcode = '55000';
  end if;

  preset_count := jsonb_array_length(requested_presets);
  if preset_count not between 2 and 12
    or exists (
      select 1
      from jsonb_to_recordset(requested_presets)
        as preset(id uuid, name text, color text, sort_order integer)
      where preset.id is null
        or nullif(btrim(preset.name), '') is null
        or char_length(btrim(preset.name)) > 60
        or btrim(preset.name) ~ '^__r07_'
        or preset.color !~ '^#[0-9A-Fa-f]{6}$'
        or preset.sort_order not between 1 and 12
    )
    or (select count(distinct preset.id) from jsonb_to_recordset(requested_presets)
      as preset(id uuid, name text, color text, sort_order integer)) <> preset_count
    or (select count(distinct lower(btrim(preset.name))) from jsonb_to_recordset(requested_presets)
      as preset(id uuid, name text, color text, sort_order integer)) <> preset_count
    or (select count(distinct preset.sort_order) from jsonb_to_recordset(requested_presets)
      as preset(id uuid, name text, color text, sort_order integer)) <> preset_count
    or exists (
      select 1
      from jsonb_to_recordset(requested_presets)
        as incoming(id uuid, name text, color text, sort_order integer)
      join public.team_squad_presets stored on stored.id = incoming.id
      where stored.team_id <> requested_team_id
    )
  then
    raise exception 'Use de 2 a 12 modelos válidos' using errcode = '22023';
  end if;

  delete from public.team_squad_presets
  where team_id = requested_team_id;

  insert into public.team_squad_presets(
    id, team_id, name, color, sort_order, created_by, updated_by
  )
  select preset.id, requested_team_id, btrim(preset.name), preset.color,
    preset.sort_order, current_user_id, current_user_id
  from jsonb_to_recordset(requested_presets)
    as preset(id uuid, name text, color text, sort_order integer);

  insert into public.team_squad_preset_commands(
    team_id, request_id, actor_id, result
  ) values (
    requested_team_id, request_id, current_user_id,
    jsonb_build_object('preset_count', preset_count)
  );

  insert into public.audit_logs(
    team_id, actor_id, action, entity_type, entity_id, metadata, request_id
  ) values (
    requested_team_id, current_user_id, 'lineup.presets.replaced',
    'team_squad_presets', requested_team_id::text,
    jsonb_build_object('preset_count', preset_count), request_id::text
  );

  return (request_id, preset_count, false)::public.team_squad_preset_command_result;
end;
$$;

alter table public.team_squad_presets enable row level security;
alter table public.team_squad_preset_commands enable row level security;

create policy team_squad_presets_select_staff on public.team_squad_presets
  for select to authenticated
  using (private.is_team_staff(team_id));

revoke all on public.team_squad_presets, public.team_squad_preset_commands
  from public, anon, authenticated;
grant select on public.team_squad_presets to authenticated;

revoke all on function public.replace_team_squad_presets(uuid,uuid,jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_team_squad_presets(uuid,uuid,jsonb)
  to authenticated;

comment on table public.team_squad_presets is
  'R07: modelos reutilizáveis de nome, cor e ordem; eventos guardam cópias independentes.';
comment on function public.replace_team_squad_presets(uuid,uuid,jsonb) is
  'R07: owner/admin substitui de forma idempotente os modelos reutilizáveis do próprio time.';
