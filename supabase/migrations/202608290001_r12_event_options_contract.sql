create or replace function public.create_event_as_staff_v3(
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
  event_venue_address text default null
)
returns public.event_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
begin
  if auth.uid() is null
    or not private.is_team_staff(requested_team_id)
    or not private.is_team_feature_enabled(requested_team_id, 'event_control')
  then
    raise exception 'Event control access required' using errcode = '42501';
  end if;

  if event_duration_minutes is null
    or event_duration_minutes not between 15 and 480
  then
    raise exception 'Event duration must be between 15 and 480 minutes'
      using errcode = '22023';
  end if;

  if attendance_deadline_minutes is null
    or attendance_deadline_minutes <> all (
      array[0, 60, 120, 180, 360, 720, 1440]
    )
  then
    raise exception 'Unsupported attendance confirmation deadline'
      using errcode = '22023';
  end if;

  return public.create_event_as_staff_v2(
    requested_team_id,
    request_id,
    starts_at_local,
    event_title,
    event_kind,
    event_organization_mode,
    event_sport_format,
    event_duration_minutes,
    attendance_deadline_minutes,
    repeat_weeks,
    event_opponent_name,
    event_venue_name,
    event_venue_address
  );
end;
$$;

create or replace function public.update_event_as_staff_v3(
  requested_team_id uuid,
  requested_event_id uuid,
  request_id uuid,
  edit_scope text,
  starts_at_local timestamp without time zone,
  event_title text,
  event_kind public.event_kind,
  event_organization_mode public.organization_mode,
  event_sport_format public.sport_format,
  event_duration_minutes integer,
  attendance_deadline_minutes integer,
  event_opponent_name text default null,
  event_venue_name text default null,
  event_venue_address text default null
)
returns public.event_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
begin
  if auth.uid() is null
    or not private.is_team_staff(requested_team_id)
    or not private.is_team_feature_enabled(requested_team_id, 'event_control')
  then
    raise exception 'Event control access required' using errcode = '42501';
  end if;

  if event_duration_minutes is null
    or event_duration_minutes not between 15 and 480
  then
    raise exception 'Event duration must be between 15 and 480 minutes'
      using errcode = '22023';
  end if;

  if attendance_deadline_minutes is null
    or attendance_deadline_minutes <> all (
      array[0, 60, 120, 180, 360, 720, 1440]
    )
  then
    raise exception 'Unsupported attendance confirmation deadline'
      using errcode = '22023';
  end if;

  return public.update_event_as_staff_v2(
    requested_team_id,
    requested_event_id,
    request_id,
    edit_scope,
    starts_at_local,
    event_title,
    event_kind,
    event_organization_mode,
    event_sport_format,
    event_duration_minutes,
    attendance_deadline_minutes,
    event_opponent_name,
    event_venue_name,
    event_venue_address
  );
end;
$$;

revoke all on function public.create_event_as_staff_v3(
  uuid,
  uuid,
  timestamp without time zone,
  text,
  public.event_kind,
  public.organization_mode,
  public.sport_format,
  integer,
  integer,
  integer,
  text,
  text,
  text
) from public, anon;
grant execute on function public.create_event_as_staff_v3(
  uuid,
  uuid,
  timestamp without time zone,
  text,
  public.event_kind,
  public.organization_mode,
  public.sport_format,
  integer,
  integer,
  integer,
  text,
  text,
  text
) to authenticated;

revoke all on function public.update_event_as_staff_v3(
  uuid,
  uuid,
  uuid,
  text,
  timestamp without time zone,
  text,
  public.event_kind,
  public.organization_mode,
  public.sport_format,
  integer,
  integer,
  text,
  text,
  text
) from public, anon;
grant execute on function public.update_event_as_staff_v3(
  uuid,
  uuid,
  uuid,
  text,
  timestamp without time zone,
  text,
  public.event_kind,
  public.organization_mode,
  public.sport_format,
  integer,
  integer,
  text,
  text,
  text
) to authenticated;
