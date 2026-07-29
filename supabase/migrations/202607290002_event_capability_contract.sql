-- Contrato inerte de credencial, capability e sessão verificada de R02.
-- Nenhuma flag ou controle é ativado por esta expansão.

insert into public.runtime_controls (control, enabled)
values ('event_capability_exchange', false)
on conflict (control) do nothing;

create table public.event_access_credentials (
  id uuid primary key default extensions.gen_random_uuid(),
  team_id uuid not null,
  event_id uuid not null,
  athlete_id uuid not null,
  secret_hash bytea not null unique check (octet_length(secret_hash) = 32),
  athlete_user_id_at_issue uuid references auth.users (id) on delete set null,
  issued_by uuid not null references auth.users (id) on delete restrict,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  revocation_reason text check (
    revocation_reason is null
    or char_length(revocation_reason) between 2 and 120
  ),
  created_at timestamptz not null default now(),
  last_exchanged_at timestamptz,
  exchange_count integer not null default 0 check (exchange_count >= 0),
  foreign key (event_id, team_id)
    references public.events (id, team_id) on delete cascade,
  foreign key (athlete_id, team_id)
    references public.athletes (id, team_id) on delete cascade,
  foreign key (event_id, athlete_id)
    references public.event_attendance (event_id, athlete_id) on delete cascade,
  check (expires_at > created_at),
  check (
    (revoked_at is null and revoked_by is null and revocation_reason is null)
    or revoked_at is not null
  )
);

create unique index event_access_credentials_one_active_idx
  on public.event_access_credentials (event_id, athlete_id)
  where revoked_at is null;

create index event_access_credentials_event_idx
  on public.event_access_credentials (event_id, expires_at)
  where revoked_at is null;

create table public.event_capability_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  credential_id uuid not null
    references public.event_access_credentials (id) on delete cascade,
  team_id uuid not null,
  event_id uuid not null,
  athlete_id uuid not null,
  secret_hash bytea not null unique check (octet_length(secret_hash) = 32),
  athlete_user_id_at_issue uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  idle_expires_at timestamptz not null,
  absolute_expires_at timestamptz not null,
  revoked_at timestamptz,
  revocation_reason text check (
    revocation_reason is null
    or char_length(revocation_reason) between 2 and 120
  ),
  foreign key (event_id, team_id)
    references public.events (id, team_id) on delete cascade,
  foreign key (athlete_id, team_id)
    references public.athletes (id, team_id) on delete cascade,
  foreign key (event_id, athlete_id)
    references public.event_attendance (event_id, athlete_id) on delete cascade,
  check (idle_expires_at > created_at),
  check (absolute_expires_at >= idle_expires_at),
  check (last_seen_at >= created_at),
  check (revoked_at is not null or revocation_reason is null)
);

create index event_capability_sessions_event_idx
  on public.event_capability_sessions (event_id, idle_expires_at)
  where revoked_at is null;

create index event_capability_sessions_credential_idx
  on public.event_capability_sessions (credential_id)
  where revoked_at is null;

create table public.verified_device_sessions (
  auth_session_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  idle_expires_at timestamptz not null default (now() + interval '30 days'),
  absolute_expires_at timestamptz not null default (now() + interval '180 days'),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  revocation_reason text check (
    revocation_reason is null
    or char_length(revocation_reason) between 2 and 120
  ),
  check (last_seen_at >= first_seen_at),
  check (idle_expires_at > first_seen_at),
  check (absolute_expires_at >= idle_expires_at),
  check (
    (revoked_at is null and revoked_by is null and revocation_reason is null)
    or revoked_at is not null
  )
);

create index verified_device_sessions_user_idx
  on public.verified_device_sessions (user_id, last_seen_at desc);

alter table public.event_access_credentials enable row level security;
alter table public.event_capability_sessions enable row level security;
alter table public.verified_device_sessions enable row level security;

revoke all on public.event_access_credentials
  from public, anon, authenticated;
revoke all on public.event_capability_sessions
  from public, anon, authenticated;
revoke all on public.verified_device_sessions
  from public, anon, authenticated;

create or replace function private.constant_time_equals(
  left_value bytea,
  right_value bytea
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  difference integer := 0;
begin
  if octet_length(left_value) <> octet_length(right_value) then
    return false;
  end if;

  if octet_length(left_value) = 0 then
    return true;
  end if;

  for position in 0 .. octet_length(left_value) - 1 loop
    difference := difference
      | (get_byte(left_value, position) # get_byte(right_value, position));
  end loop;

  return difference = 0;
end;
$$;

create or replace function private.new_access_secret()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select rtrim(
    translate(
      pg_catalog.encode(extensions.gen_random_bytes(32), 'base64'),
      '+/',
      '-_'
    ),
    '='
  );
$$;

create or replace function private.hash_access_secret(requested_secret text)
returns bytea
language sql
immutable
strict
set search_path = ''
as $$
  select extensions.digest(requested_secret, 'sha256');
$$;

create or replace function public.issue_event_access_credential(
  requested_event_id uuid,
  requested_athlete_id uuid
)
returns table (
  credential_id uuid,
  public_id uuid,
  credential_secret text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target record;
  raw_secret text;
  created_credential_id uuid;
begin
  select
    e.id as event_id,
    e.public_id,
    e.team_id,
    e.ends_at,
    a.id as athlete_id,
    a.user_id as athlete_user_id
  into target
  from public.events e
  join public.event_attendance attendance
    on attendance.event_id = e.id
    and attendance.team_id = e.team_id
    and attendance.athlete_id = requested_athlete_id
  join public.athletes a
    on a.id = attendance.athlete_id
    and a.team_id = attendance.team_id
    and a.status = 'active'
  join public.athlete_private athlete_private
    on athlete_private.athlete_id = a.id
    and athlete_private.team_id = a.team_id
    and athlete_private.phone_e164 is not null
    and athlete_private.privacy_terms_accepted_at is not null
  where e.id = requested_event_id
    and e.status = 'scheduled'
    and e.starts_at > now();

  if target.event_id is null
    or current_user_id is null
    or not private.is_team_staff(
      target.team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Credencial de evento indisponível'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(target.event_id::text || ':' || target.athlete_id::text, 0)
  );

  update public.event_access_credentials
  set
    revoked_at = now(),
    revoked_by = current_user_id,
    revocation_reason = 'rotated'
  where event_id = target.event_id
    and athlete_id = target.athlete_id
    and revoked_at is null;

  update public.event_capability_sessions
  set
    revoked_at = now(),
    revocation_reason = 'credential_rotated'
  where event_id = target.event_id
    and athlete_id = target.athlete_id
    and revoked_at is null;

  raw_secret := private.new_access_secret();

  insert into public.event_access_credentials (
    team_id,
    event_id,
    athlete_id,
    secret_hash,
    athlete_user_id_at_issue,
    issued_by,
    expires_at
  )
  values (
    target.team_id,
    target.event_id,
    target.athlete_id,
    private.hash_access_secret(raw_secret),
    target.athlete_user_id,
    current_user_id,
    target.ends_at + interval '7 days'
  )
  returning id into created_credential_id;

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
    current_user_id,
    'event_access_credential.issued',
    'event_access_credential',
    created_credential_id::text,
    jsonb_build_object(
      'event_id', target.event_id,
      'athlete_id', target.athlete_id,
      'issued_unclaimed', target.athlete_user_id is null
    )
  );

  return query
  select
    created_credential_id,
    target.public_id,
    raw_secret,
    target.ends_at + interval '7 days';
end;
$$;

create or replace function public.revoke_event_access_credential(
  requested_credential_id uuid,
  requested_reason text default 'operator_revoked'
)
returns boolean
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_team_id uuid;
begin
  select credential.team_id
  into target_team_id
  from public.event_access_credentials credential
  where credential.id = requested_credential_id;

  if target_team_id is null
    or current_user_id is null
    or not private.is_team_staff(
      target_team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Credencial de evento indisponível'
      using errcode = '42501';
  end if;

  update public.event_access_credentials
  set
    revoked_at = coalesce(revoked_at, now()),
    revoked_by = coalesce(revoked_by, current_user_id),
    revocation_reason = coalesce(revocation_reason, requested_reason)
  where id = requested_credential_id;

  update public.event_capability_sessions
  set
    revoked_at = coalesce(revoked_at, now()),
    revocation_reason = coalesce(revocation_reason, 'credential_revoked')
  where credential_id = requested_credential_id;

  insert into public.audit_logs (
    team_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_team_id,
    current_user_id,
    'event_access_credential.revoked',
    'event_access_credential',
    requested_credential_id::text,
    jsonb_build_object('reason', requested_reason)
  );

  return true;
end;
$$;

create or replace function public.exchange_event_access_credential(
  requested_public_id uuid,
  requested_credential_secret text
)
returns table (
  capability_secret text,
  capability_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  candidate record;
  matched record;
  requested_hash bytea;
  raw_capability_secret text;
  capability_limit timestamptz;
  matched_found boolean := false;
begin
  if requested_credential_secret is null
    or char_length(requested_credential_secret) <> 43
  then
    raise exception 'Acesso ao evento indisponível'
      using errcode = '42501';
  end if;

  requested_hash := private.hash_access_secret(requested_credential_secret);

  for candidate in
    select
      credential.id as credential_id,
      credential.team_id,
      credential.event_id,
      credential.athlete_id,
      credential.secret_hash,
      credential.athlete_user_id_at_issue,
      credential.expires_at
    from public.event_access_credentials credential
    join public.events event
      on event.id = credential.event_id
      and event.team_id = credential.team_id
    join public.athletes athlete
      on athlete.id = credential.athlete_id
      and athlete.team_id = credential.team_id
      and athlete.status = 'active'
      and athlete.user_id is not distinct from credential.athlete_user_id_at_issue
    join public.event_attendance attendance
      on attendance.event_id = credential.event_id
      and attendance.team_id = credential.team_id
      and attendance.athlete_id = credential.athlete_id
    where event.public_id = requested_public_id
      and credential.revoked_at is null
      and credential.expires_at > now()
      and private.is_team_feature_enabled(
        credential.team_id,
        'public_event_page'::public.feature_key
      )
      and private.is_team_feature_enabled(
        credential.team_id,
        'event_capability_exchange'::public.feature_key
      )
      and exists (
        select 1
        from public.runtime_controls runtime
        where runtime.control =
          'event_capability_exchange'::public.runtime_control_key
          and runtime.enabled
      )
    for update of credential
  loop
    if private.constant_time_equals(candidate.secret_hash, requested_hash) then
      matched := candidate;
      matched_found := true;
      exit;
    end if;
  end loop;

  if not matched_found then
    raise exception 'Acesso ao evento indisponível'
      using errcode = '42501';
  end if;

  raw_capability_secret := private.new_access_secret();
  capability_limit := least(
    matched.expires_at,
    now() + interval '30 days'
  );

  insert into public.event_capability_sessions (
    credential_id,
    team_id,
    event_id,
    athlete_id,
    secret_hash,
    athlete_user_id_at_issue,
    idle_expires_at,
    absolute_expires_at
  )
  values (
    matched.credential_id,
    matched.team_id,
    matched.event_id,
    matched.athlete_id,
    private.hash_access_secret(raw_capability_secret),
    matched.athlete_user_id_at_issue,
    capability_limit,
    matched.expires_at
  );

  update public.event_access_credentials
  set
    last_exchanged_at = now(),
    exchange_count = exchange_count + 1
  where id = matched.credential_id;

  return query select raw_capability_secret, capability_limit;
end;
$$;

create or replace function public.resolve_event_capability(
  requested_public_id uuid,
  requested_capability_secret text
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
  candidate record;
  matched record;
  requested_hash bytea;
  renewed_idle_limit timestamptz;
  matched_found boolean := false;
begin
  if requested_capability_secret is null
    or char_length(requested_capability_secret) <> 43
  then
    return;
  end if;

  requested_hash := private.hash_access_secret(requested_capability_secret);

  for candidate in
    select
      capability.id as capability_id,
      capability.secret_hash,
      capability.absolute_expires_at,
      event.public_id,
      event.status as event_status,
      event.starts_at,
      event.attendance_deadline,
      coalesce(athlete.preferred_name, athlete.full_name) as athlete_display_name,
      attendance.status as attendance_status
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
    where capability.revoked_at is null
      and capability.idle_expires_at > now()
      and capability.absolute_expires_at > now()
      and private.is_team_feature_enabled(
        capability.team_id,
        'public_event_page'::public.feature_key
      )
      and private.is_team_feature_enabled(
        capability.team_id,
        'event_capability_exchange'::public.feature_key
      )
      and exists (
        select 1
        from public.runtime_controls runtime
        where runtime.control =
          'event_capability_exchange'::public.runtime_control_key
          and runtime.enabled
      )
    for update of capability
  loop
    if private.constant_time_equals(candidate.secret_hash, requested_hash) then
      matched := candidate;
      matched_found := true;
      exit;
    end if;
  end loop;

  if not matched_found then
    return;
  end if;

  renewed_idle_limit := least(
    matched.absolute_expires_at,
    now() + interval '30 days'
  );

  update public.event_capability_sessions
  set
    last_seen_at = now(),
    idle_expires_at = renewed_idle_limit
  where id = matched.capability_id;

  return query
  select
    matched.public_id,
    matched.athlete_display_name,
    matched.attendance_status,
    matched.event_status,
    (
      matched.event_status = 'scheduled'::public.event_status
      and matched.starts_at > now()
      and (
        matched.attendance_deadline is null
        or matched.attendance_deadline >= now()
      )
      and private.is_team_feature_enabled(
        (
          select capability.team_id
          from public.event_capability_sessions capability
          where capability.id = matched.capability_id
        ),
        'event_capability_rsvp'::public.feature_key
      )
    ),
    renewed_idle_limit;
end;
$$;

create or replace function public.register_or_touch_verified_device_session()
returns table (
  auth_session_id uuid,
  idle_expires_at timestamptz,
  absolute_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_session_id uuid;
  inventory record;
begin
  begin
    current_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  exception
    when invalid_text_representation then
      current_session_id := null;
  end;

  if current_user_id is null
    or current_session_id is null
    or not exists (
      select 1
      from auth.sessions session_row
      where session_row.id = current_session_id
        and session_row.user_id = current_user_id
    )
  then
    raise exception 'Sessão verificada indisponível'
      using errcode = '42501';
  end if;

  insert into public.verified_device_sessions as device_inventory (
    auth_session_id,
    user_id
  )
  values (
    current_session_id,
    current_user_id
  )
  on conflict on constraint verified_device_sessions_pkey do update
  set
    last_seen_at = now(),
    idle_expires_at = least(
      device_inventory.absolute_expires_at,
      now() + interval '30 days'
    )
  where device_inventory.user_id = current_user_id
    and device_inventory.revoked_at is null
    and device_inventory.idle_expires_at > now()
    and device_inventory.absolute_expires_at > now()
  returning
    device_inventory.auth_session_id,
    device_inventory.idle_expires_at,
    device_inventory.absolute_expires_at
  into inventory;

  if inventory.auth_session_id is null then
    raise exception 'Sessão verificada indisponível'
      using errcode = '42501';
  end if;

  return query
  select
    inventory.auth_session_id,
    inventory.idle_expires_at,
    inventory.absolute_expires_at;
end;
$$;

create or replace function public.revoke_verified_device_session(
  requested_session_id uuid,
  requested_reason text default 'user_revoked'
)
returns boolean
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  affected_rows integer;
begin
  update public.verified_device_sessions
  set
    revoked_at = coalesce(revoked_at, now()),
    revoked_by = coalesce(revoked_by, current_user_id),
    revocation_reason = coalesce(revocation_reason, requested_reason)
  where auth_session_id = requested_session_id
    and user_id = current_user_id;

  get diagnostics affected_rows = row_count;

  if affected_rows = 0 then
    raise exception 'Sessão verificada indisponível'
      using errcode = '42501';
  end if;

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
    current_user_id,
    'verified_device_session.revoked',
    'verified_device_session',
    requested_session_id::text,
    jsonb_build_object('reason', requested_reason)
  );

  return true;
end;
$$;

create or replace function public.revoke_all_my_verified_device_sessions(
  requested_reason text default 'user_global_revoked'
)
returns integer
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  affected_rows integer;
begin
  if current_user_id is null then
    raise exception 'Sessão verificada indisponível'
      using errcode = '42501';
  end if;

  update public.verified_device_sessions
  set
    revoked_at = coalesce(revoked_at, now()),
    revoked_by = coalesce(revoked_by, current_user_id),
    revocation_reason = coalesce(revocation_reason, requested_reason)
  where user_id = current_user_id
    and revoked_at is null;

  get diagnostics affected_rows = row_count;

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
    current_user_id,
    'verified_device_session.revoked_all',
    'verified_device_session',
    current_user_id::text,
    jsonb_build_object(
      'reason', requested_reason,
      'count', affected_rows
    )
  );

  return affected_rows;
end;
$$;

create or replace function private.revoke_event_access_after_athlete_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'active'::public.athlete_status
    or new.user_id is distinct from old.user_id
  then
    update public.event_access_credentials
    set
      revoked_at = coalesce(revoked_at, now()),
      revocation_reason = coalesce(
        revocation_reason,
        case
          when new.user_id is distinct from old.user_id
            then 'athlete_identity_changed'
          else 'athlete_inactive'
        end
      )
    where athlete_id = new.id
      and team_id = new.team_id
      and revoked_at is null;

    update public.event_capability_sessions
    set
      revoked_at = coalesce(revoked_at, now()),
      revocation_reason = coalesce(
        revocation_reason,
        case
          when new.user_id is distinct from old.user_id
            then 'athlete_identity_changed'
          else 'athlete_inactive'
        end
      )
    where athlete_id = new.id
      and team_id = new.team_id
      and revoked_at is null;
  end if;

  return new;
end;
$$;

create trigger athletes_revoke_event_access
  after update of user_id, status on public.athletes
  for each row execute function private.revoke_event_access_after_athlete_change();

revoke all on function private.constant_time_equals(bytea, bytea) from public;
revoke all on function private.new_access_secret() from public;
revoke all on function private.hash_access_secret(text) from public;
revoke all on function private.revoke_event_access_after_athlete_change()
  from public;

revoke all on function public.issue_event_access_credential(uuid, uuid)
  from public;
revoke all on function public.revoke_event_access_credential(uuid, text)
  from public;
revoke all on function public.exchange_event_access_credential(uuid, text)
  from public;
revoke all on function public.resolve_event_capability(uuid, text)
  from public;
revoke all on function public.register_or_touch_verified_device_session()
  from public;
revoke all on function public.revoke_verified_device_session(uuid, text)
  from public;
revoke all on function public.revoke_all_my_verified_device_sessions(text)
  from public;

grant execute on function public.issue_event_access_credential(uuid, uuid)
  to authenticated;
grant execute on function public.revoke_event_access_credential(uuid, text)
  to authenticated;
grant execute on function public.exchange_event_access_credential(uuid, text)
  to anon, authenticated;
grant execute on function public.resolve_event_capability(uuid, text)
  to anon, authenticated;
grant execute on function public.register_or_touch_verified_device_session()
  to authenticated;
grant execute on function public.revoke_verified_device_session(uuid, text)
  to authenticated;
grant execute on function public.revoke_all_my_verified_device_sessions(text)
  to authenticated;

comment on table public.event_access_credentials is
  'Credenciais reutilizáveis de evento; somente SHA-256 é persistido.';
comment on table public.event_capability_sessions is
  'Sessões opacas limitadas ao par atleta-evento e revogadas no banco.';
comment on table public.verified_device_sessions is
  'Inventário e tombstones de session_id verificados; não armazena tokens.';
comment on function public.exchange_event_access_credential(uuid, text) is
  'Troca server-side; o Route Handler deve validar POST same-origin e nunca logar o segredo.';
comment on function public.resolve_event_capability(uuid, text) is
  'Resolve contexto limitado sem expor team_id, event_id ou athlete_id.';
