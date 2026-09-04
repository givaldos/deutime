-- R13 / rollout global — promove a agenda profissional para o catálogo ativo.
-- A migration apenas instala o mecanismo; a ativação continua explícita pela
-- RPC de service_role, preservando deploy forward-only e rollback operacional.

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
    'recognition',
    'professional_scheduling'
  ]::public.feature_key[]);
$$;

create or replace function private.ensure_professional_scheduling_defaults(
  requested_team_id uuid,
  responsible_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
  created_count integer := 0;
  selected_ids uuid[];
  selected_name text;
  settings_are_complete boolean;
begin
  if requested_team_id is null or responsible_user_id is null then
    raise exception 'Time e responsável são obrigatórios' using errcode = '22023';
  end if;

  perform 1 from public.teams team
  where team.id = requested_team_id
  for update;

  if not found then
    raise exception 'Time não encontrado' using errcode = 'P0002';
  end if;

  select count(*) into active_count
  from public.team_squad_presets preset
  where preset.team_id = requested_team_id and preset.is_active;

  if active_count = 0 then
    insert into public.team_squad_presets(
      team_id, name, color, badge_key, sort_order, created_by, updated_by
    ) values
      (requested_team_id, 'Time A', '#0D9488', 'stripes', 1,
       responsible_user_id, responsible_user_id),
      (requested_team_id, 'Time B', '#2563EB', 'sash', 2,
       responsible_user_id, responsible_user_id);
    created_count := 2;
  elsif active_count = 1 then
    select candidate.name into selected_name
    from (values ('Time A'), ('Time B'), ('Equipe 2')) candidate(name)
    where not exists (
      select 1 from public.team_squad_presets preset
      where preset.team_id = requested_team_id
        and preset.is_active
        and lower(btrim(preset.name)) = lower(candidate.name)
    )
    limit 1;

    insert into public.team_squad_presets(
      team_id, name, color, badge_key, sort_order, created_by, updated_by
    )
    select requested_team_id, selected_name, '#2563EB', 'sash', free_order,
      responsible_user_id, responsible_user_id
    from generate_series(1, 12) free_order
    where not exists (
      select 1 from public.team_squad_presets preset
      where preset.team_id = requested_team_id
        and preset.is_active
        and preset.sort_order = free_order
    )
    order by free_order
    limit 1;
    created_count := 1;
  end if;

  select array_agg(preset.id order by preset.sort_order, preset.id)
  into selected_ids
  from (
    select preset.id, preset.sort_order
    from public.team_squad_presets preset
    where preset.team_id = requested_team_id and preset.is_active
    order by preset.sort_order, preset.id
    limit 2
  ) preset;

  if coalesce(cardinality(selected_ids), 0) <> 2 then
    raise exception 'Duas equipes internas ativas são obrigatórias'
      using errcode = '55000';
  end if;

  select exists (
    select 1
    from public.team_professional_scheduling_settings settings
    join public.team_squad_presets home_team
      on home_team.id = settings.default_home_team_id
      and home_team.team_id = settings.team_id and home_team.is_active
    join public.team_squad_presets away_team
      on away_team.id = settings.default_away_team_id
      and away_team.team_id = settings.team_id and away_team.is_active
    where settings.team_id = requested_team_id
      and home_team.id <> away_team.id
  ) into settings_are_complete;

  if not settings_are_complete then
    insert into public.team_professional_scheduling_settings(
      team_id, default_home_team_id, default_away_team_id,
      created_by, updated_by
    ) values (
      requested_team_id, selected_ids[1], selected_ids[2],
      responsible_user_id, responsible_user_id
    )
    on conflict (team_id) do update set
      default_home_team_id = excluded.default_home_team_id,
      default_away_team_id = excluded.default_away_team_id,
      updated_by = responsible_user_id,
      updated_at = now();
  end if;

  if created_count > 0 or not settings_are_complete then
    insert into public.audit_logs(
      team_id, actor_id, action, entity_type, entity_id, metadata
    ) values (
      requested_team_id, null, 'professional.defaults.seeded',
      'team_professional_scheduling_settings', requested_team_id::text,
      jsonb_build_object(
        'presets_created', created_count,
        'source', 'product_rollout'
      )
    );
  end if;

  return created_count;
end;
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

  perform private.ensure_professional_scheduling_defaults(new.id, new.created_by);

  for current_feature in select private.product_feature_keys()
  loop
    insert into public.team_feature_flags(team_id, feature, enabled, updated_by)
    values (new.id, current_feature, true, new.created_by)
    on conflict (team_id, feature) do update set
      enabled = excluded.enabled,
      updated_by = excluded.updated_by,
      updated_at = now();

    insert into public.audit_logs(
      team_id, actor_id, action, entity_type, entity_id, metadata
    ) values (
      new.id, new.created_by, 'feature_flag.changed', 'team_feature_flag',
      current_feature::text,
      jsonb_build_object('enabled', true, 'source', 'team_creation')
    );
  end loop;

  return new;
end;
$$;

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
    select team.id from public.teams team order by team.id
  loop
    seen_count := seen_count + 1;

    select membership.user_id into responsible_user_id
    from public.team_memberships membership
    where membership.team_id = current_team.id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
    order by case membership.role when 'owner' then 0 else 1 end,
      membership.created_at, membership.user_id
    limit 1;

    if responsible_user_id is null then
      raise exception 'Team % has no active owner or admin', current_team.id
        using errcode = '42501';
    end if;

    if requested_enabled then
      perform private.ensure_professional_scheduling_defaults(
        current_team.id, responsible_user_id
      );
    end if;

    for current_feature in select private.product_feature_keys()
    loop
      if not exists (
        select 1 from public.team_feature_flags flag
        where flag.team_id = current_team.id
          and flag.feature = current_feature
          and flag.enabled = requested_enabled
      ) then
        insert into public.team_feature_flags(team_id, feature, enabled, updated_by)
        values (
          current_team.id, current_feature, requested_enabled,
          responsible_user_id
        )
        on conflict (team_id, feature) do update set
          enabled = excluded.enabled,
          updated_by = excluded.updated_by,
          updated_at = now();

        insert into public.audit_logs(
          team_id, actor_id, action, entity_type, entity_id, metadata
        ) values (
          current_team.id, null, 'feature_flag.changed', 'team_feature_flag',
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
      'event_capability_exchange',
      'account_autonomy',
      'registration_email_alerts',
      'registration_email_delivery'
    ]::public.runtime_control_key[])
  loop
    if not exists (
      select 1 from public.runtime_controls control
      where control.control = current_control
        and control.enabled = requested_enabled
    ) then
      insert into public.runtime_controls(control, enabled)
      values (current_control, requested_enabled)
      on conflict (control) do update set
        enabled = excluded.enabled, updated_at = now();

      insert into public.audit_logs(
        team_id, actor_id, action, entity_type, entity_id, metadata
      ) values (
        null, null, 'runtime_control.changed', 'runtime_control',
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
revoke all on function private.ensure_professional_scheduling_defaults(uuid,uuid)
  from public, anon, authenticated;
revoke all on function private.enable_product_features_for_new_team() from public;
revoke all on function public.set_all_product_features(boolean)
  from public, anon, authenticated;
grant execute on function public.set_all_product_features(boolean) to service_role;

comment on function private.ensure_professional_scheduling_defaults(uuid,uuid) is
  'R13: completa apenas padrões ausentes antes do rollout global, sem alterar eventos.';
comment on function public.set_all_product_features(boolean) is
  'Ativa ou desativa transacionalmente as 16 capacidades validadas e os 6 controles globais.';
