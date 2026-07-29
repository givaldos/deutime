-- Contrato transacional e inerte de RSVP por acesso reconhecido.
-- A flag event_capability_rsvp continua ausente/desligada por padrão.

create or replace function private.current_audit_actor()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_override text :=
    current_setting('app.audit_actor_override', true);
begin
  if actor_override is null or actor_override = '' then
    return (select auth.uid());
  end if;

  if actor_override = 'anonymous' then
    return null;
  end if;

  begin
    return actor_override::uuid;
  exception
    when invalid_text_representation then
      return (select auth.uid());
  end;
end;
$$;

-- Preserva a auditoria genérica existente e permite que uma RPC estreita evite
-- atribuir ao usuário logado uma capability encaminhada de outro atleta.
create or replace function private.audit_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb;
  new_row jsonb;
  row_data jsonb;
  action_name text;
begin
  old_row := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  new_row := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  row_data := case when tg_op = 'DELETE' then old_row else new_row end;
  action_name := lower(tg_table_name) || '.' || lower(tg_op);

  insert into public.audit_logs (
    team_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata,
    request_id
  )
  values (
    nullif(row_data ->> 'team_id', '')::uuid,
    private.current_audit_actor(),
    action_name,
    tg_table_name,
    coalesce(
      row_data ->> 'id',
      row_data ->> 'user_id',
      row_data ->> 'athlete_id',
      'unknown'
    ),
    jsonb_strip_nulls(jsonb_build_object(
      'old_status', old_row ->> 'status',
      'new_status', new_row ->> 'status'
    )),
    nullif(
      nullif(current_setting('request.headers', true), '')::jsonb
        ->> 'x-request-id',
      ''
    )
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
exception
  when others then
    raise warning 'Audit write failed for %.%: %',
      tg_table_schema,
      tg_table_name,
      sqlerrm;
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
end;
$$;

create or replace function public.respond_to_event_from_access(
  requested_public_id uuid,
  response_status public.attendance_status,
  requested_capability_secret text default null
)
returns public.attendance_status
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_session_id uuid;
  requested_hash bytea;
  candidate record;
  target record;
  matched_capability boolean := false;
  access_source text;
  effective_actor_id uuid;
  previous_audit_override text :=
    current_setting('app.audit_actor_override', true);
begin
  if response_status not in ('confirmed', 'declined', 'maybe') then
    raise exception 'Resposta de presença inválida'
      using errcode = '22023';
  end if;

  if requested_capability_secret is not null
    and char_length(requested_capability_secret) = 43
  then
    requested_hash :=
      private.hash_access_secret(requested_capability_secret);

    for candidate in
      select
        capability.id as capability_id,
        capability.team_id,
        capability.event_id,
        capability.athlete_id,
        capability.secret_hash,
        capability.absolute_expires_at,
        credential.expires_at as credential_expires_at,
        event.status as event_status,
        event.starts_at,
        event.attendance_deadline,
        athlete.user_id as athlete_user_id
      from public.event_capability_sessions capability
      join public.event_access_credentials credential
        on credential.id = capability.credential_id
        and credential.team_id = capability.team_id
        and credential.event_id = capability.event_id
        and credential.athlete_id = capability.athlete_id
        and credential.revoked_at is null
        and credential.expires_at > now()
      join public.events event
        on event.id = capability.event_id
        and event.team_id = capability.team_id
        and event.public_id = requested_public_id
      join public.athletes athlete
        on athlete.id = capability.athlete_id
        and athlete.team_id = capability.team_id
        and athlete.status = 'active'
        and athlete.user_id is not distinct from
          capability.athlete_user_id_at_issue
      join public.event_attendance attendance
        on attendance.event_id = capability.event_id
        and attendance.team_id = capability.team_id
        and attendance.athlete_id = capability.athlete_id
      join public.team_feature_flags page_flag
        on page_flag.team_id = capability.team_id
        and page_flag.feature = 'public_event_page'::public.feature_key
        and page_flag.enabled
      join public.team_feature_flags exchange_flag
        on exchange_flag.team_id = capability.team_id
        and exchange_flag.feature =
          'event_capability_exchange'::public.feature_key
        and exchange_flag.enabled
      join public.team_feature_flags rsvp_flag
        on rsvp_flag.team_id = capability.team_id
        and rsvp_flag.feature = 'event_capability_rsvp'::public.feature_key
        and rsvp_flag.enabled
      join public.runtime_controls runtime
        on runtime.control =
          'event_capability_exchange'::public.runtime_control_key
        and runtime.enabled
      where capability.revoked_at is null
        and capability.idle_expires_at > now()
        and capability.absolute_expires_at > now()
      for update of capability, credential, event, athlete, attendance
      for share of page_flag, exchange_flag, rsvp_flag, runtime
    loop
      if private.constant_time_equals(
        candidate.secret_hash,
        requested_hash
      ) then
        target := candidate;
        matched_capability := true;
        access_source := 'capability';
        exit;
      end if;
    end loop;
  end if;

  if matched_capability then
    update public.event_capability_sessions
    set
      last_seen_at = now(),
      idle_expires_at = least(
        target.absolute_expires_at,
        target.credential_expires_at,
        now() + interval '30 days'
      )
    where id = target.capability_id;

    begin
      current_session_id :=
        nullif(auth.jwt() ->> 'session_id', '')::uuid;
    exception
      when invalid_text_representation then
        current_session_id := null;
    end;

    if current_user_id is not null
      and current_user_id is not distinct from target.athlete_user_id
      and current_session_id is not null
      and exists (
        select 1
        from auth.sessions session_row
        join public.verified_device_sessions device
          on device.auth_session_id = session_row.id
          and device.user_id = session_row.user_id
          and device.revoked_at is null
          and device.idle_expires_at > now()
          and device.absolute_expires_at > now()
        where session_row.id = current_session_id
          and session_row.user_id = current_user_id
      )
    then
      effective_actor_id := current_user_id;
    end if;
  elsif current_user_id is not null then
    perform *
    from public.register_or_touch_verified_device_session();

    select
      null::uuid as capability_id,
      event.team_id,
      event.id as event_id,
      athlete.id as athlete_id,
      null::bytea as secret_hash,
      device.absolute_expires_at,
      device.absolute_expires_at as credential_expires_at,
      event.status as event_status,
      event.starts_at,
      event.attendance_deadline,
      athlete.user_id as athlete_user_id
    into target
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
    join public.team_feature_flags page_flag
      on page_flag.team_id = event.team_id
      and page_flag.feature = 'public_event_page'::public.feature_key
      and page_flag.enabled
    join public.team_feature_flags exchange_flag
      on exchange_flag.team_id = event.team_id
      and exchange_flag.feature =
        'event_capability_exchange'::public.feature_key
      and exchange_flag.enabled
    join public.team_feature_flags rsvp_flag
      on rsvp_flag.team_id = event.team_id
      and rsvp_flag.feature = 'event_capability_rsvp'::public.feature_key
      and rsvp_flag.enabled
    join public.runtime_controls runtime
      on runtime.control =
        'event_capability_exchange'::public.runtime_control_key
      and runtime.enabled
    where event.public_id = requested_public_id
    for update of event, athlete, attendance, device
    for share of page_flag, exchange_flag, rsvp_flag, runtime
    limit 1;

    if target.event_id is not null then
      access_source := 'verified_session';
      effective_actor_id := current_user_id;
    end if;
  end if;

  if access_source is null then
    raise exception 'Resposta ao evento indisponível'
      using errcode = '42501';
  end if;

  if target.event_id is null
    or target.event_status <> 'scheduled'::public.event_status
    or target.starts_at <= now()
    or (
      target.attendance_deadline is not null
      and target.attendance_deadline < now()
    )
  then
    raise exception 'Resposta ao evento indisponível'
      using errcode = '42501';
  end if;

  perform set_config(
    'app.audit_actor_override',
    coalesce(effective_actor_id::text, 'anonymous'),
    true
  );

  update public.event_attendance
  set
    status = response_status,
    source = 'web',
    responded_at = now(),
    responded_by = effective_actor_id
  where event_id = target.event_id
    and team_id = target.team_id
    and athlete_id = target.athlete_id;

  if not found then
    raise exception 'Resposta ao evento indisponível'
      using errcode = '42501';
  end if;

  perform set_config(
    'app.audit_actor_override',
    coalesce(previous_audit_override, ''),
    true
  );

  insert into public.audit_logs (
    team_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target.team_id,
    effective_actor_id,
    'event_attendance.responded_via_access',
    'event_attendance',
    target.event_id::text || ':' || target.athlete_id::text,
    jsonb_strip_nulls(jsonb_build_object(
      'status', response_status,
      'access_source', access_source,
      'capability_session_id', target.capability_id
    ))
  );

  return response_status;
end;
$$;

revoke all on function private.current_audit_actor() from public;
revoke all on function
  public.respond_to_event_from_access(
    uuid,
    public.attendance_status,
    text
  )
  from public;

grant execute on function
  public.respond_to_event_from_access(
    uuid,
    public.attendance_status,
    text
  )
  to anon, authenticated;

comment on function
  public.respond_to_event_from_access(
    uuid,
    public.attendance_status,
    text
  )
is
  'Atualiza somente a presença derivada de capability ou sessão verificada; nunca aceita IDs internos do cliente.';
