-- R00 / lançamento do produto — ativa o catálogo já validado para todos os
-- times, sem incluir automaticamente capacidades futuras ainda em piloto.

create table private.product_rollout_state (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into private.product_rollout_state (singleton, enabled)
values (true, false);

alter table private.product_rollout_state enable row level security;
revoke all on private.product_rollout_state from public, anon, authenticated;

create or replace function private.product_feature_keys()
returns setof public.feature_key
language sql
immutable
security definer
set search_path = ''
as $$
  select unnest(array[
    'persistent_event_access',
    'whatsapp_delivery',
    'post_match',
    'voting',
    'comments',
    'team_division',
    'event_control',
    'public_event_page',
    'event_capability_exchange',
    'event_capability_rsvp',
    'event_matches',
    'whatsapp_reminders',
    'event_share_card',
    'championships',
    'recognition'
  ]::public.feature_key[]);
$$;

create or replace function private.enable_product_features_for_new_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_feature public.feature_key;
begin
  if not coalesce((
    select rollout.enabled
    from private.product_rollout_state rollout
    where rollout.singleton
  ), false) then
    return new;
  end if;

  for current_feature in select private.product_feature_keys()
  loop
    insert into public.team_feature_flags (
      team_id,
      feature,
      enabled,
      updated_by
    ) values (
      new.id,
      current_feature,
      true,
      new.created_by
    )
    on conflict (team_id, feature) do update
    set
      enabled = excluded.enabled,
      updated_by = excluded.updated_by,
      updated_at = now();

    insert into public.audit_logs (
      team_id,
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) values (
      new.id,
      new.created_by,
      'feature_flag.changed',
      'team_feature_flag',
      current_feature::text,
      jsonb_build_object('enabled', true, 'source', 'team_creation')
    );
  end loop;

  return new;
end;
$$;

create trigger zz_teams_enable_product_features
  after insert on public.teams
  for each row execute function private.enable_product_features_for_new_team();

create or replace function public.set_all_product_features(
  requested_enabled boolean
)
returns table (
  teams_seen integer,
  flags_changed integer,
  controls_changed integer
)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '30s'
as $$
declare
  current_team record;
  current_feature public.feature_key;
  current_control public.runtime_control_key;
  responsible_user_id uuid;
  seen_count integer := 0;
  flag_count integer := 0;
  control_count integer := 0;
begin
  if requested_enabled is null then
    raise exception 'Product rollout state is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('set_all_product_features', 0)
  );

  for current_team in
    select team.id
    from public.teams team
    order by team.id
  loop
    seen_count := seen_count + 1;

    select membership.user_id
    into responsible_user_id
    from public.team_memberships membership
    where membership.team_id = current_team.id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
    order by
      case membership.role when 'owner' then 0 else 1 end,
      membership.created_at,
      membership.user_id
    limit 1;

    if responsible_user_id is null then
      raise exception 'Team % has no active owner or admin', current_team.id
        using errcode = '42501';
    end if;

    for current_feature in select private.product_feature_keys()
    loop
      if not exists (
        select 1
        from public.team_feature_flags flag
        where flag.team_id = current_team.id
          and flag.feature = current_feature
          and flag.enabled = requested_enabled
      ) then
        insert into public.team_feature_flags (
          team_id,
          feature,
          enabled,
          updated_by
        ) values (
          current_team.id,
          current_feature,
          requested_enabled,
          responsible_user_id
        )
        on conflict (team_id, feature) do update
        set
          enabled = excluded.enabled,
          updated_by = excluded.updated_by,
          updated_at = now();

        insert into public.audit_logs (
          team_id,
          actor_id,
          action,
          entity_type,
          entity_id,
          metadata
        ) values (
          current_team.id,
          null,
          'feature_flag.changed',
          'team_feature_flag',
          current_feature::text,
          jsonb_build_object(
            'enabled', requested_enabled,
            'source', 'product_rollout'
          )
        );

        flag_count := flag_count + 1;
      end if;
    end loop;
  end loop;

  for current_control in
    select unnest(array[
      'integration_produce',
      'integration_consume',
      'event_capability_exchange'
    ]::public.runtime_control_key[])
  loop
    if not exists (
      select 1
      from public.runtime_controls control
      where control.control = current_control
        and control.enabled = requested_enabled
    ) then
      insert into public.runtime_controls (control, enabled)
      values (current_control, requested_enabled)
      on conflict (control) do update
      set enabled = excluded.enabled, updated_at = now();

      insert into public.audit_logs (
        team_id,
        actor_id,
        action,
        entity_type,
        entity_id,
        metadata
      ) values (
        null,
        null,
        'runtime_control.changed',
        'runtime_control',
        current_control::text,
        jsonb_build_object(
          'enabled', requested_enabled,
          'source', 'product_rollout'
        )
      );

      control_count := control_count + 1;
    end if;
  end loop;

  update private.product_rollout_state
  set enabled = requested_enabled, updated_at = now()
  where singleton;

  return query select seen_count, flag_count, control_count;
end;
$$;

revoke all on function private.product_feature_keys() from public;
revoke all on function private.enable_product_features_for_new_team() from public;
revoke all on function public.set_all_product_features(boolean) from public;
grant execute on function public.set_all_product_features(boolean) to service_role;

comment on function public.set_all_product_features(boolean) is
  'Atomically enables or disables the validated product catalog for every team and its global runtime controls.';
