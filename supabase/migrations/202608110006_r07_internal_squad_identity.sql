-- R07 / WP-R07-06 — equipes internas persistentes e escudos padronizados.

create type public.internal_squad_badge_key as enum (
  'shield', 'stripes', 'sash', 'quarters', 'circle', 'diamond'
);

alter table public.team_squad_presets
  add column badge_key public.internal_squad_badge_key not null default 'shield',
  add column is_active boolean not null default true;

alter table public.event_squads
  add column internal_team_id uuid,
  add column badge_key public.internal_squad_badge_key not null default 'shield';

alter table public.event_lineup_revision_squads
  add column badge_key public.internal_squad_badge_key not null default 'shield';

alter table public.team_squad_presets
  drop constraint team_squad_presets_team_id_sort_order_key;
drop index public.team_squad_presets_name_ci_idx;

create unique index team_squad_presets_active_order_idx
  on public.team_squad_presets(team_id, sort_order)
  where is_active;
create unique index team_squad_presets_active_name_ci_idx
  on public.team_squad_presets(team_id, lower(btrim(name)))
  where is_active;

insert into public.team_squad_presets(
  id, team_id, name, color, badge_key, sort_order,
  created_by, updated_by
)
select gen_random_uuid(), team.id, defaults.name, defaults.color,
  defaults.badge_key::public.internal_squad_badge_key, defaults.sort_order,
  team.created_by, team.created_by
from public.teams team
cross join (values
  ('Time A', '#0D9488', 'stripes', 1),
  ('Time B', '#2563EB', 'sash', 2)
) as defaults(name, color, badge_key, sort_order)
where not exists (
  select 1 from public.team_squad_presets preset
  where preset.team_id = team.id and preset.is_active
);

update public.event_squads squad
set internal_team_id = preset.id,
    badge_key = preset.badge_key
from public.team_squad_presets preset
where preset.team_id = squad.team_id
  and preset.is_active
  and lower(btrim(preset.name)) = lower(btrim(squad.name));

alter table public.event_squads
  add constraint event_squads_internal_team_fk
  foreign key (internal_team_id, team_id)
  references public.team_squad_presets(id, team_id)
  on delete restrict;

create or replace function private.attach_internal_team_to_event_squad()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  internal_team public.team_squad_presets%rowtype;
begin
  select preset.* into internal_team
  from public.team_squad_presets preset
  where preset.team_id = new.team_id
    and preset.is_active
    and lower(btrim(preset.name)) = lower(btrim(new.name))
  limit 1;

  if internal_team.id is null then
    new.internal_team_id := null;
    new.badge_key := 'shield';
  else
    new.internal_team_id := internal_team.id;
    new.badge_key := internal_team.badge_key;
  end if;
  return new;
end;
$$;

create trigger event_squads_attach_internal_team
  before insert or update of team_id, name on public.event_squads
  for each row execute function private.attach_internal_team_to_event_squad();

create or replace function private.snapshot_lineup_squad_badge()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select squad.badge_key into new.badge_key
  from public.event_squads squad
  where squad.id = new.source_squad_id
    and squad.team_id = new.team_id
    and squad.event_id = new.event_id;
  new.badge_key := coalesce(new.badge_key, 'shield');
  return new;
end;
$$;

create trigger event_lineup_revision_squads_snapshot_badge
  before insert on public.event_lineup_revision_squads
  for each row execute function private.snapshot_lineup_squad_badge();

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
    raise exception 'Equipes internas inválidas' using errcode = '22023';
  end if;

  if current_user_id is null
    or not private.is_team_staff(
      requested_team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Equipes internas indisponíveis' using errcode = '42501';
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
        as preset(id uuid, name text, color text, badge_key text, sort_order integer)
      where preset.id is null
        or nullif(btrim(preset.name), '') is null
        or char_length(btrim(preset.name)) > 60
        or btrim(preset.name) ~ '^__r07_'
        or preset.color !~ '^#[0-9A-Fa-f]{6}$'
        or coalesce(nullif(preset.badge_key, ''), 'shield') not in
          ('shield', 'stripes', 'sash', 'quarters', 'circle', 'diamond')
        or preset.sort_order not between 1 and 12
    )
    or (select count(distinct preset.id) from jsonb_to_recordset(requested_presets)
      as preset(id uuid, name text, color text, badge_key text, sort_order integer)) <> preset_count
    or (select count(distinct lower(btrim(preset.name))) from jsonb_to_recordset(requested_presets)
      as preset(id uuid, name text, color text, badge_key text, sort_order integer)) <> preset_count
    or (select count(distinct preset.sort_order) from jsonb_to_recordset(requested_presets)
      as preset(id uuid, name text, color text, badge_key text, sort_order integer)) <> preset_count
    or exists (
      select 1
      from jsonb_to_recordset(requested_presets)
        as incoming(id uuid, name text, color text, badge_key text, sort_order integer)
      join public.team_squad_presets stored on stored.id = incoming.id
      where stored.team_id <> requested_team_id
    )
  then
    raise exception 'Use de 2 a 12 equipes internas válidas' using errcode = '22023';
  end if;

  update public.team_squad_presets stored
  set is_active = false, updated_by = current_user_id, updated_at = now()
  where stored.team_id = requested_team_id
    and stored.is_active
    and not exists (
      select 1 from jsonb_to_recordset(requested_presets)
        as incoming(id uuid, name text, color text, badge_key text, sort_order integer)
      where incoming.id = stored.id
    );

  insert into public.team_squad_presets(
    id, team_id, name, color, badge_key, sort_order,
    is_active, created_by, updated_by
  )
  select preset.id, requested_team_id, btrim(preset.name), preset.color,
    coalesce(nullif(preset.badge_key, ''), 'shield')::public.internal_squad_badge_key,
    preset.sort_order, true, current_user_id, current_user_id
  from jsonb_to_recordset(requested_presets)
    as preset(id uuid, name text, color text, badge_key text, sort_order integer)
  on conflict (id) do update set
    name = excluded.name,
    color = excluded.color,
    badge_key = excluded.badge_key,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_by = current_user_id,
    updated_at = now();

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

drop policy team_squad_presets_select_staff on public.team_squad_presets;
create policy team_squad_presets_select_staff on public.team_squad_presets
  for select to authenticated
  using (is_active and private.is_team_staff(team_id));

comment on table public.team_squad_presets is
  'R07: identidade persistente das equipes internas; nome técnico legado preservado por compatibilidade.';
comment on column public.event_squads.internal_team_id is
  'R07: identidade interna estável para estatísticas derivadas; nome, cor e escudo permanecem snapshot do evento.';
