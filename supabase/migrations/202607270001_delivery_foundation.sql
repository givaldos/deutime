create type public.feature_key as enum (
  'persistent_event_access',
  'whatsapp_delivery',
  'post_match',
  'voting',
  'comments',
  'team_division'
);

create type public.runtime_control_key as enum (
  'integration_produce',
  'integration_consume'
);

-- Corrige grants implícitos deixados pelas expansões de identidade anteriores.
-- A R00 torna esse tipo de regressão visível pelo censo dinâmico de pgTAP.
revoke all on public.player_profiles from anon, authenticated;
revoke all on public.player_position_preferences from anon, authenticated;
grant select on public.player_profiles to authenticated;
grant select on public.player_position_preferences to authenticated;

create table public.team_feature_flags (
  team_id uuid not null references public.teams (id) on delete cascade,
  feature public.feature_key not null,
  enabled boolean not null default false,
  updated_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (team_id, feature)
);

create table public.runtime_controls (
  control public.runtime_control_key primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.runtime_controls (control)
values ('integration_produce'), ('integration_consume');

create table public.delivery_smoke_runs (
  team_id uuid not null references public.teams (id) on delete cascade,
  idempotency_key text not null check (
    idempotency_key ~ '^smoke-[a-z0-9-]{8,80}$'
  ),
  checked_at timestamptz not null default now(),
  primary key (team_id, idempotency_key)
);

alter table public.teams
  add column is_synthetic boolean not null default false;

drop policy teams_insert_owner on public.teams;
create policy teams_insert_owner on public.teams
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and not is_synthetic
  );

create trigger teams_synthetic_marker_immutable
  before update on public.teams
  for each row execute function private.prevent_column_changes('is_synthetic');

create or replace function private.is_team_feature_enabled(
  requested_team_id uuid,
  requested_feature public.feature_key
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select flag.enabled
    from public.team_feature_flags flag
    where flag.team_id = requested_team_id
      and flag.feature = requested_feature
  ), false);
$$;

create or replace function public.is_team_feature_enabled(
  requested_team_id uuid,
  requested_feature public.feature_key
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.can_access_team(requested_team_id)
    and private.is_team_feature_enabled(requested_team_id, requested_feature);
$$;

create or replace function public.set_team_feature_flag(
  requested_team_id uuid,
  requested_feature public.feature_key,
  requested_enabled boolean
)
returns public.team_feature_flags
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_flag public.team_feature_flags;
begin
  if not private.is_team_staff(
    requested_team_id,
    array['owner', 'admin']::public.team_role[]
  ) then
    raise exception 'Somente owner ou admin pode alterar capacidades'
      using errcode = '42501';
  end if;

  insert into public.team_feature_flags (
    team_id,
    feature,
    enabled,
    updated_by
  )
  values (
    requested_team_id,
    requested_feature,
    requested_enabled,
    (select auth.uid())
  )
  on conflict (team_id, feature) do update
  set
    enabled = excluded.enabled,
    updated_by = excluded.updated_by,
    updated_at = now()
  returning * into changed_flag;

  insert into public.audit_logs (
    team_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    requested_team_id,
    (select auth.uid()),
    'feature_flag.changed',
    'team_feature_flag',
    requested_feature::text,
    jsonb_build_object('enabled', requested_enabled)
  );

  return changed_flag;
end;
$$;

create or replace function public.set_runtime_control(
  requested_control public.runtime_control_key,
  requested_enabled boolean
)
returns public.runtime_controls
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_control public.runtime_controls;
begin
  update public.runtime_controls
  set enabled = requested_enabled, updated_at = now()
  where control = requested_control
  returning * into changed_control;

  insert into public.audit_logs (
    team_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    null,
    null,
    'runtime_control.changed',
    'runtime_control',
    requested_control::text,
    jsonb_build_object('enabled', requested_enabled)
  );

  return changed_control;
end;
$$;

create or replace function public.is_runtime_control_enabled(
  requested_control public.runtime_control_key
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select control.enabled
    from public.runtime_controls control
    where control.control = requested_control
  ), false);
$$;

create or replace function public.delivery_foundation_probe(
  requested_team_id uuid,
  requested_feature public.feature_key
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.can_access_team(requested_team_id)
    and private.is_team_feature_enabled(requested_team_id, requested_feature);
$$;

create or replace function public.run_staging_delivery_smoke(
  requested_team_id uuid,
  requested_idempotency_key text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if requested_idempotency_key !~ '^smoke-[a-z0-9-]{8,80}$' then
    raise exception 'Chave de idempotência de smoke inválida'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.teams
    where id = requested_team_id
      and is_synthetic
  ) then
    raise exception 'Smoke de escrita exige tenant sintético'
      using errcode = '42501';
  end if;

  insert into public.delivery_smoke_runs (team_id, idempotency_key)
  values (requested_team_id, requested_idempotency_key)
  on conflict (team_id, idempotency_key) do update
    set checked_at = now();

  delete from public.delivery_smoke_runs
  where team_id = requested_team_id
    and idempotency_key = requested_idempotency_key;

  return true;
end;
$$;

revoke all on function private.is_team_feature_enabled(uuid, public.feature_key) from public;
revoke all on function public.is_team_feature_enabled(uuid, public.feature_key) from public;
revoke all on function public.set_team_feature_flag(uuid, public.feature_key, boolean) from public;
revoke all on function public.set_runtime_control(public.runtime_control_key, boolean) from public;
revoke all on function public.is_runtime_control_enabled(public.runtime_control_key) from public;
revoke all on function public.delivery_foundation_probe(uuid, public.feature_key) from public;
revoke all on function public.run_staging_delivery_smoke(uuid, text) from public;

grant execute on function public.is_team_feature_enabled(uuid, public.feature_key)
  to authenticated;
grant execute on function public.set_team_feature_flag(uuid, public.feature_key, boolean)
  to authenticated;
grant execute on function public.delivery_foundation_probe(uuid, public.feature_key)
  to authenticated;
grant execute on function public.set_runtime_control(public.runtime_control_key, boolean)
  to service_role;
grant execute on function public.is_runtime_control_enabled(public.runtime_control_key)
  to service_role;
grant execute on function public.run_staging_delivery_smoke(uuid, text)
  to service_role;

alter table public.team_feature_flags enable row level security;
alter table public.runtime_controls enable row level security;
alter table public.delivery_smoke_runs enable row level security;

create policy team_feature_flags_select_operator
  on public.team_feature_flags
  for select
  to authenticated
  using (
    private.is_team_staff(
      team_id,
      array['owner', 'admin']::public.team_role[]
    )
  );

revoke all on public.team_feature_flags from public, anon, authenticated;
revoke all on public.runtime_controls from public, anon, authenticated;
revoke all on public.delivery_smoke_runs from public, anon, authenticated;
grant select on public.team_feature_flags to authenticated;
grant select on public.runtime_controls to service_role;

create trigger team_feature_flags_set_updated_at
  before update on public.team_feature_flags
  for each row execute function private.set_updated_at();
create trigger runtime_controls_set_updated_at
  before update on public.runtime_controls
  for each row execute function private.set_updated_at();
