-- R16 / WP-R16-02 / LIST-05 — inclui as listas validadas no catálogo global e
-- instala rollout e sonda específicos. A migration não altera flags existentes.

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
    'professional_scheduling',
    'team_navigation_shell',
    'complete_management_lists'
  ]::public.feature_key[]);
$$;

create or replace function public.set_complete_management_lists_rollout(
  requested_enabled boolean,
  requested_team_id uuid default null
)
returns table (
  teams_seen integer,
  flags_changed integer
)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '30s'
as $$
declare
  current_team record;
  responsible_user_id uuid;
  seen_count integer := 0;
  changed_count integer := 0;
begin
  if requested_enabled is null then
    raise exception 'Management lists rollout state is required'
      using errcode = '22023';
  end if;

  if requested_team_id is not null and not exists (
    select 1 from public.teams team where team.id = requested_team_id
  ) then
    raise exception 'Team % not found', requested_team_id using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('set_complete_management_lists_rollout', 0)
  );

  for current_team in
    select team.id
    from public.teams team
    where requested_team_id is null or team.id = requested_team_id
    order by team.id
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

    if not exists (
      select 1 from public.team_feature_flags flag
      where flag.team_id = current_team.id
        and flag.feature = 'complete_management_lists'
        and flag.enabled = requested_enabled
    ) then
      insert into public.team_feature_flags(team_id, feature, enabled, updated_by)
      values (
        current_team.id, 'complete_management_lists', requested_enabled,
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
        'complete_management_lists',
        jsonb_build_object(
          'enabled', requested_enabled,
          'source', 'management_lists_rollout',
          'scope', case when requested_team_id is null then 'global' else 'pilot' end
        )
      );
      changed_count := changed_count + 1;
    end if;
  end loop;

  return query select seen_count, changed_count;
end;
$$;

create or replace function public.get_complete_management_lists_health(
  requested_team_id uuid
)
returns table (
  observed_at timestamptz,
  team_open boolean,
  complete_management_lists_enabled boolean,
  total_events bigint,
  upcoming_events bigint,
  reschedule_events bigint,
  total_championships bigint,
  last_flag_change_at timestamptz
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  select
    now(),
    team.closed_at is null,
    private.is_team_feature_enabled(team.id, 'complete_management_lists'),
    (select count(*) from public.events event where event.team_id = team.id),
    (select count(*) from public.events event
      where event.team_id = team.id and event.status = 'scheduled'
        and event.professional_schedule_state in ('scheduled', 'pending_review')
        and event.starts_at >= now()),
    (select count(*) from public.events event
      where event.team_id = team.id and event.status = 'scheduled'
        and (
          event.professional_schedule_state in ('date_tbd', 'postponed')
          or (event.professional_schedule_state = 'scheduled' and event.starts_at < now())
        )),
    (select count(*) from public.championships championship
      where championship.team_id = team.id),
    (select flag.updated_at from public.team_feature_flags flag
      where flag.team_id = team.id and flag.feature = 'complete_management_lists')
  from public.teams team
  where team.id = requested_team_id;
$$;

revoke all on function private.product_feature_keys() from public;
revoke all on function public.set_complete_management_lists_rollout(boolean, uuid)
  from public, anon, authenticated;
grant execute on function public.set_complete_management_lists_rollout(boolean, uuid)
  to service_role;
revoke all on function public.get_complete_management_lists_health(uuid)
  from public, anon, authenticated;
grant execute on function public.get_complete_management_lists_health(uuid)
  to service_role;

comment on function private.product_feature_keys() is
  'Catálogo das 18 capacidades validadas herdadas por novos times no rollout global.';
comment on function public.set_complete_management_lists_rollout(boolean, uuid) is
  'Ativa ou restaura de forma idempotente e auditada somente as listas completas R16, globalmente ou em um time piloto.';
comment on function public.get_complete_management_lists_health(uuid) is
  'Sonda agregada das listas completas R16, sem nomes, buscas, conteúdo ou identificadores pessoais.';
comment on function public.set_all_product_features(boolean) is
  'Ativa ou desativa transacionalmente as 18 capacidades validadas e os 6 controles globais.';
