-- Contrato de rate limiting em banco (F1 do pentest, camada 3).
--
-- O edge/WAF continua sendo a primeira barreira, mas chamadas diretas ao
-- PostgREST com a chave publicável contornam o Next. Este contrato impõe
-- tetos por ação/escopo dentro das RPCs sensíveis, independente do chamador.
--
-- As redefinições abaixo reproduzem na íntegra os corpos originais
-- (202607200001_player_identity.sql e 202607290002_event_capability_contract.sql);
-- a única mudança em cada uma é a linha `perform private.check_rate_limit(...)`
-- marcada com [RATE-LIMIT]. Nenhuma migration aplicada foi editada.

create table private.rate_limit_attempts (
  id bigint generated always as identity primary key,
  action text not null,
  scope text not null,
  attempted_at timestamptz not null default now()
);

create index rate_limit_attempts_action_scope_at_idx
  on private.rate_limit_attempts (action, scope, attempted_at);

alter table private.rate_limit_attempts enable row level security;

create or replace function private.check_rate_limit(
  p_action text,
  p_scope text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  window_start timestamptz := now() - make_interval(secs => p_window_seconds);
  attempt_count integer;
begin
  if p_action is null
    or p_scope is null
    or p_max_attempts is null
    or p_max_attempts < 1
    or p_window_seconds is null
    or p_window_seconds < 1
  then
    raise exception 'Invalid rate limit configuration' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_action || ':' || p_scope, 0)
  );

  delete from private.rate_limit_attempts
  where action = p_action
    and scope = p_scope
    and attempted_at < window_start;

  select count(*)
  into attempt_count
  from private.rate_limit_attempts
  where action = p_action
    and scope = p_scope
    and attempted_at >= window_start;

  if attempt_count >= p_max_attempts then
    raise exception 'Too many attempts' using errcode = '54000';
  end if;

  insert into private.rate_limit_attempts (action, scope)
  values (p_action, p_scope);
end;
$$;

revoke all on function private.check_rate_limit(text, text, integer, integer) from public;

create or replace function public.complete_verified_athlete_registration(
  team_slug text,
  full_name text,
  preferred_name text,
  birth_date text,
  accepts_privacy_terms boolean,
  accepts_whatsapp boolean,
  position_codes text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  verified_phone text := private.current_verified_phone();
  normalized_full_name text := trim(full_name);
  normalized_preferred_name text := nullif(trim(preferred_name), '');
  normalized_birth_date date;
  requested_positions text[] := coalesce(position_codes, '{}'::text[]);
  target_team_id uuid;
  target_sport public.sport_format;
  target_athlete_id uuid;
  generated_handle text;
  position_code text;
  position_priority smallint := 0;
begin
  begin
    normalized_birth_date := nullif(trim(birth_date), '')::date;
  exception
    when invalid_datetime_format or datetime_field_overflow then
      raise exception 'Invalid player registration' using errcode = '22023';
  end;

  if current_user_id is null or verified_phone is null then
    raise exception 'Verified phone authentication required' using errcode = '42501';
  end if;

  -- [RATE-LIMIT] teto por conta: concluir cadastro é ação única, repetição
  -- acima do teto indica automação.
  perform private.check_rate_limit(
    'athlete_registration',
    current_user_id::text,
    5,
    3600
  );

  if accepts_privacy_terms is not true
    or char_length(normalized_full_name) not between 2 and 100
    or (normalized_preferred_name is not null and char_length(normalized_preferred_name) not between 2 and 60)
    or (normalized_birth_date is not null and normalized_birth_date not between date '1900-01-01' and current_date)
    or coalesce(array_length(requested_positions, 1), 0) > 3
    or (
      select count(*) <> count(distinct candidate)
      from unnest(requested_positions) candidate
    )
  then
    raise exception 'Invalid player registration' using errcode = '22023';
  end if;

  select t.id, t.default_sport_format
  into target_team_id, target_sport
  from public.teams t
  where t.slug = lower(trim(team_slug))::extensions.citext
    and t.is_public = true;

  if target_team_id is null
    or exists (
      select 1
      from unnest(requested_positions) candidate
      where not exists (
        select 1
        from public.positions p
        where p.sport_format = target_sport
          and p.code = candidate
      )
    )
  then
    raise exception 'Invalid player registration' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text || ':' || target_team_id::text, 0)
  );

  generated_handle := 'atleta-' || left(replace(current_user_id::text, '-', ''), 12);

  insert into public.player_profiles (
    user_id,
    handle,
    display_name,
    preferred_name,
    birth_date,
    phone_verified_at
  )
  values (
    current_user_id,
    generated_handle,
    normalized_full_name,
    normalized_preferred_name,
    normalized_birth_date,
    now()
  )
  on conflict (user_id) do update
  set
    display_name = excluded.display_name,
    preferred_name = excluded.preferred_name,
    birth_date = coalesce(excluded.birth_date, public.player_profiles.birth_date);

  update public.profiles
  set display_name = normalized_full_name
  where user_id = current_user_id;

  delete from public.player_position_preferences ppp
  where ppp.user_id = current_user_id
    and ppp.sport_format = target_sport;

  foreach position_code in array requested_positions loop
    position_priority := position_priority + 1;
    insert into public.player_position_preferences (
      user_id,
      sport_format,
      position_code,
      priority
    )
    values (
      current_user_id,
      target_sport,
      position_code,
      position_priority
    );
  end loop;

  select a.id
  into target_athlete_id
  from public.athletes a
  where a.team_id = target_team_id
    and a.user_id = current_user_id
  for update;

  if target_athlete_id is null then
    select a.id
    into target_athlete_id
    from public.athletes a
    join public.athlete_private ap on ap.athlete_id = a.id
    where a.team_id = target_team_id
      and a.user_id is null
      and ap.phone_e164 = verified_phone
    order by (a.status = 'active') desc, a.created_at
    limit 1
    for update of a;
  end if;

  if target_athlete_id is null then
    insert into public.athletes (
      team_id,
      user_id,
      full_name,
      preferred_name,
      status,
      registration_source,
      public_profile
    )
    values (
      target_team_id,
      current_user_id,
      normalized_full_name,
      normalized_preferred_name,
      'pending',
      'public_form',
      false
    )
    returning id into target_athlete_id;
  else
    update public.athletes
    set
      user_id = current_user_id,
      full_name = normalized_full_name,
      preferred_name = normalized_preferred_name
    where id = target_athlete_id;
  end if;

  insert into public.athlete_private (
    athlete_id,
    team_id,
    birth_date,
    phone_e164,
    privacy_terms_version,
    privacy_terms_accepted_at
  )
  values (
    target_athlete_id,
    target_team_id,
    normalized_birth_date,
    verified_phone,
    '2026-07-20',
    now()
  )
  on conflict (athlete_id) do update
  set
    birth_date = coalesce(excluded.birth_date, public.athlete_private.birth_date),
    phone_e164 = excluded.phone_e164,
    privacy_terms_version = excluded.privacy_terms_version,
    privacy_terms_accepted_at = excluded.privacy_terms_accepted_at;

  delete from public.athlete_position_preferences app
  where app.athlete_id = target_athlete_id
    and app.sport_format = target_sport;

  insert into public.athlete_position_preferences (
    athlete_id,
    team_id,
    sport_format,
    position_code,
    priority
  )
  select
    target_athlete_id,
    target_team_id,
    ppp.sport_format,
    ppp.position_code,
    ppp.priority
  from public.player_position_preferences ppp
  where ppp.user_id = current_user_id
    and ppp.sport_format = target_sport;

  if accepts_whatsapp is true then
    insert into public.communication_consents (
      athlete_id,
      team_id,
      channel,
      status,
      evidence,
      granted_at,
      revoked_at
    )
    values (
      target_athlete_id,
      target_team_id,
      'whatsapp',
      'granted',
      'verified_phone_registration',
      now(),
      null
    )
    on conflict (athlete_id, channel) do update
    set
      status = 'granted',
      evidence = excluded.evidence,
      granted_at = excluded.granted_at,
      revoked_at = null;
  end if;

  return target_athlete_id;
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

  -- [RATE-LIMIT] teto por evento: a troca é executável por anônimo, então o
  -- teto alto barra abuso automatizado sem afetar pico legítimo.
  perform private.check_rate_limit(
    'event_access_exchange',
    requested_public_id::text,
    120,
    60
  );

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
