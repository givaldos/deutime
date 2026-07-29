-- Completa o consumidor CP2 sem alterar as migrations já aplicadas.
-- A sessão verificada recebe o mesmo contexto mínimo da capability.

create or replace function public.resolve_event_access_for_verified_session(
  requested_public_id uuid
)
returns table (
  public_id uuid,
  athlete_display_name text,
  attendance_status public.attendance_status,
  event_status public.event_status,
  can_respond boolean,
  capability_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    return;
  end if;

  -- Valida existência em auth.sessions, inventário, tombstone e prazos antes
  -- de consultar qualquer vínculo do evento.
  perform *
  from public.register_or_touch_verified_device_session();

  return query
  select
    event.public_id,
    coalesce(athlete.preferred_name, athlete.full_name),
    attendance.status,
    event.status,
    (
      event.status = 'scheduled'::public.event_status
      and event.starts_at > now()
      and (
        event.attendance_deadline is null
        or event.attendance_deadline >= now()
      )
      and private.is_team_feature_enabled(
        event.team_id,
        'event_capability_rsvp'::public.feature_key
      )
    ),
    device.absolute_expires_at
  from public.events event
  join public.athletes athlete
    on athlete.team_id = event.team_id
    and athlete.user_id = current_user_id
    and athlete.status = 'active'
  join public.event_attendance attendance
    on attendance.event_id = event.id
    and attendance.team_id = event.team_id
    and attendance.athlete_id = athlete.id
  join public.verified_device_sessions device
    on device.user_id = current_user_id
    and device.auth_session_id =
      nullif(auth.jwt() ->> 'session_id', '')::uuid
    and device.revoked_at is null
    and device.idle_expires_at > now()
    and device.absolute_expires_at > now()
  where event.public_id = requested_public_id
    and private.is_team_feature_enabled(
      event.team_id,
      'public_event_page'::public.feature_key
    )
    and private.is_team_feature_enabled(
      event.team_id,
      'event_capability_exchange'::public.feature_key
    )
    and exists (
      select 1
      from public.runtime_controls runtime
      where runtime.control =
        'event_capability_exchange'::public.runtime_control_key
        and runtime.enabled
    )
  limit 1;
end;
$$;

revoke all on function
  public.resolve_event_access_for_verified_session(uuid)
  from public;
grant execute on function
  public.resolve_event_access_for_verified_session(uuid)
  to authenticated;

comment on function
  public.resolve_event_access_for_verified_session(uuid)
is
  'Resolve o mesmo contexto mínimo da capability após validar session_id e inventário.';
