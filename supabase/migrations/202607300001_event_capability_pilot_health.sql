-- Sonda agregada e somente leitura para o piloto de capability/RSVP.
-- O retorno não contém atleta, telefone, segredo ou identificador de sessão.

create or replace function public.get_event_capability_pilot_health(
  requested_team_id uuid
)
returns table (
  observed_at timestamptz,
  global_exchange_enabled boolean,
  team_exchange_enabled boolean,
  team_rsvp_enabled boolean,
  active_credentials bigint,
  active_capability_sessions bigint,
  capability_sessions_created_24h bigint,
  capability_sessions_revoked_24h bigint,
  rsvp_writes_24h bigint,
  last_exchange_at timestamptz,
  last_rsvp_at timestamptz
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  select
    now() as observed_at,
    coalesce((
      select control.enabled
      from public.runtime_controls control
      where control.control =
        'event_capability_exchange'::public.runtime_control_key
    ), false) as global_exchange_enabled,
    coalesce((
      select flag.enabled
      from public.team_feature_flags flag
      where flag.team_id = requested_team_id
        and flag.feature =
          'event_capability_exchange'::public.feature_key
    ), false) as team_exchange_enabled,
    coalesce((
      select flag.enabled
      from public.team_feature_flags flag
      where flag.team_id = requested_team_id
        and flag.feature = 'event_capability_rsvp'::public.feature_key
    ), false) as team_rsvp_enabled,
    (
      select count(*)
      from public.event_access_credentials credential
      where credential.team_id = requested_team_id
        and credential.revoked_at is null
        and credential.expires_at > now()
    ) as active_credentials,
    (
      select count(*)
      from public.event_capability_sessions capability
      where capability.team_id = requested_team_id
        and capability.revoked_at is null
        and capability.idle_expires_at > now()
        and capability.absolute_expires_at > now()
    ) as active_capability_sessions,
    (
      select count(*)
      from public.event_capability_sessions capability
      where capability.team_id = requested_team_id
        and capability.created_at >= now() - interval '24 hours'
    ) as capability_sessions_created_24h,
    (
      select count(*)
      from public.event_capability_sessions capability
      where capability.team_id = requested_team_id
        and capability.revoked_at >= now() - interval '24 hours'
    ) as capability_sessions_revoked_24h,
    (
      select count(*)
      from public.audit_logs audit
      where audit.team_id = requested_team_id
        and audit.action = 'event_attendance.responded_via_access'
        and audit.created_at >= now() - interval '24 hours'
    ) as rsvp_writes_24h,
    (
      select max(credential.last_exchanged_at)
      from public.event_access_credentials credential
      where credential.team_id = requested_team_id
    ) as last_exchange_at,
    (
      select max(audit.created_at)
      from public.audit_logs audit
      where audit.team_id = requested_team_id
        and audit.action = 'event_attendance.responded_via_access'
    ) as last_rsvp_at
  where exists (
    select 1
    from public.teams team
    where team.id = requested_team_id
  );
$$;

revoke all on function public.get_event_capability_pilot_health(uuid)
  from public, anon, authenticated;
grant execute on function public.get_event_capability_pilot_health(uuid)
  to service_role;

comment on function public.get_event_capability_pilot_health(uuid) is
  'Returns aggregate, secret-free health signals for one capability/RSVP pilot team.';
