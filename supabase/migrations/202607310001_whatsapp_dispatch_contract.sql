-- Expansão inerte do contrato de dispatch da R03.
-- Nenhuma feature flag ou kill switch é ativado por esta migration.

alter table public.notification_outbox
  add column template_version text not null default '1'
    check (template_version ~ '^[a-z0-9_.-]{1,40}$'),
  add column intent_version bigint not null default 1
    check (intent_version > 0),
  add column requested_by uuid references auth.users (id) on delete set null,
  add column lease_token uuid,
  add column lease_expires_at timestamptz,
  add column effect_started_at timestamptz,
  add column failure_class text check (
    failure_class is null
    or failure_class in ('transient', 'permanent', 'ambiguous')
  ),
  add column requires_review boolean not null default false,
  add constraint notification_outbox_lease_pair_check check (
    (lease_token is null and lease_expires_at is null)
    or (lease_token is not null and lease_expires_at is not null)
  ),
  add constraint notification_outbox_review_status_check check (
    not requires_review or status = 'failed'
  ),
  add constraint notification_outbox_id_team_key unique (id, team_id);

create index notification_outbox_claim_idx
  on public.notification_outbox (available_at, created_at)
  where status in ('pending', 'failed') and requires_review is false;

create index notification_outbox_expired_lease_idx
  on public.notification_outbox (lease_expires_at)
  where status = 'processing';

create table public.notification_delivery_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  outbox_id uuid not null,
  team_id uuid not null,
  attempt_number smallint not null check (attempt_number between 1 and 20),
  callback_token_hash bytea not null unique
    check (octet_length(callback_token_hash) = 32),
  provider_message_id text check (
    provider_message_id is null
    or char_length(provider_message_id) between 2 and 255
  ),
  delivery_status text not null default 'prepared' check (
    delivery_status in (
      'prepared', 'accepted', 'queued', 'sent', 'delivered', 'read',
      'failed', 'undelivered'
    )
  ),
  provider_error_code text check (
    provider_error_code is null
    or provider_error_code ~ '^[A-Za-z0-9_.-]{1,100}$'
  ),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (outbox_id, attempt_number),
  foreign key (outbox_id, team_id)
    references public.notification_outbox (id, team_id) on delete cascade
);

create unique index notification_attempt_provider_message_idx
  on public.notification_delivery_attempts (provider_message_id)
  where provider_message_id is not null;

create index notification_attempts_outbox_idx
  on public.notification_delivery_attempts (outbox_id, attempt_number desc);

create table public.notification_delivery_events (
  id bigint primary key generated always as identity,
  attempt_id uuid not null
    references public.notification_delivery_attempts (id) on delete cascade,
  outbox_id uuid not null,
  team_id uuid not null,
  delivery_status text not null check (
    delivery_status in (
      'accepted', 'queued', 'sent', 'delivered', 'read',
      'failed', 'undelivered'
    )
  ),
  provider_message_id text check (
    provider_message_id is null
    or char_length(provider_message_id) between 2 and 255
  ),
  provider_error_code text check (
    provider_error_code is null
    or provider_error_code ~ '^[A-Za-z0-9_.-]{1,100}$'
  ),
  received_at timestamptz not null default now(),
  foreign key (outbox_id, team_id)
    references public.notification_outbox (id, team_id) on delete cascade
);

create unique index notification_delivery_events_replay_idx
  on public.notification_delivery_events (
    attempt_id,
    delivery_status,
    coalesce(provider_message_id, ''),
    coalesce(provider_error_code, '')
  );

create index notification_delivery_events_outbox_idx
  on public.notification_delivery_events (outbox_id, received_at desc);

alter table public.notification_delivery_attempts enable row level security;
alter table public.notification_delivery_events enable row level security;

revoke all on public.notification_delivery_attempts
  from public, anon, authenticated;
revoke all on public.notification_delivery_events
  from public, anon, authenticated;
revoke all on sequence public.notification_delivery_events_id_seq
  from public, anon, authenticated;

create trigger outbox_dispatch_identity_immutable
  before update on public.notification_outbox
  for each row execute function private.prevent_column_changes(
    'template_version', 'intent_version', 'requested_by'
  );

create trigger notification_attempt_identity_immutable
  before update on public.notification_delivery_attempts
  for each row execute function private.prevent_column_changes(
    'id', 'outbox_id', 'team_id', 'attempt_number', 'callback_token_hash',
    'started_at'
  );

create or replace function private.delivery_status_rank(requested_status text)
returns smallint
language sql
immutable
strict
set search_path = ''
as $$
  select case requested_status
    when 'prepared' then 0
    when 'accepted' then 10
    when 'queued' then 20
    when 'sent' then 30
    when 'delivered' then 40
    when 'read' then 50
    when 'failed' then 90
    when 'undelivered' then 90
  end::smallint;
$$;

create or replace function public.enqueue_event_whatsapp_call(
  requested_event_id uuid,
  requested_template_key text,
  requested_template_version text default '1'
)
returns table (
  outbox_id uuid,
  athlete_id uuid,
  inserted boolean
)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '8s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_event record;
  candidate record;
  candidate_key text;
  candidate_outbox_id uuid;
  was_inserted boolean;
  inserted_count integer := 0;
begin
  if requested_template_key is null
    or requested_template_key !~ '^[a-z0-9_.-]{2,80}$'
    or requested_template_version is null
    or requested_template_version !~ '^[a-z0-9_.-]{1,40}$'
  then
    raise exception 'Template de WhatsApp inválido'
      using errcode = '22023';
  end if;

  select e.*
  into target_event
  from public.events e
  where e.id = requested_event_id
  for update;

  if target_event.id is null
    or current_user_id is null
    or not private.is_team_staff(
      target_event.team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Chamada de WhatsApp indisponível'
      using errcode = '42501';
  end if;

  if target_event.status <> 'scheduled'
    or target_event.starts_at <= now()
    or (
      target_event.attendance_deadline is not null
      and target_event.attendance_deadline <= now()
    )
  then
    raise exception 'Chamada de WhatsApp fora do prazo'
      using errcode = '55000';
  end if;

  if not private.is_team_feature_enabled(
    target_event.team_id,
    'whatsapp_delivery'
  ) or not public.is_runtime_control_enabled('integration_produce')
  then
    raise exception 'Produção de WhatsApp desativada'
      using errcode = '55000';
  end if;

  for candidate in
    select
      athlete.id as athlete_id,
      athlete_private.phone_e164
    from public.event_attendance attendance
    join public.athletes athlete
      on athlete.id = attendance.athlete_id
      and athlete.team_id = attendance.team_id
      and athlete.status = 'active'
    join public.athlete_private athlete_private
      on athlete_private.athlete_id = athlete.id
      and athlete_private.team_id = athlete.team_id
      and athlete_private.phone_e164 is not null
      and athlete_private.privacy_terms_accepted_at is not null
    join public.communication_consents consent
      on consent.athlete_id = athlete.id
      and consent.team_id = athlete.team_id
      and consent.channel = 'whatsapp'
      and consent.status = 'granted'
    where attendance.event_id = target_event.id
      and attendance.team_id = target_event.team_id
    order by athlete.id
  loop
    candidate_key := concat_ws(
      ':',
      'whatsapp', 'event-call', target_event.team_id, target_event.id,
      candidate.athlete_id, target_event.schedule_version,
      requested_template_key, requested_template_version
    );
    candidate_outbox_id := null;

    insert into public.notification_outbox (
      team_id,
      event_id,
      athlete_id,
      channel,
      template_key,
      template_version,
      intent_version,
      requested_by,
      recipient,
      payload,
      dedupe_key
    )
    values (
      target_event.team_id,
      target_event.id,
      candidate.athlete_id,
      'whatsapp',
      requested_template_key,
      requested_template_version,
      target_event.schedule_version,
      current_user_id,
      candidate.phone_e164,
      jsonb_build_object(
        'event_public_id', target_event.public_id,
        'event_title', target_event.title,
        'event_starts_at', target_event.starts_at,
        'schedule_version', target_event.schedule_version
      ),
      candidate_key
    )
    on conflict (dedupe_key) do nothing
    returning id into candidate_outbox_id;

    was_inserted := candidate_outbox_id is not null;
    if not was_inserted then
      select existing.id
      into candidate_outbox_id
      from public.notification_outbox existing
      where existing.dedupe_key = candidate_key;
    else
      inserted_count := inserted_count + 1;
    end if;

    outbox_id := candidate_outbox_id;
    athlete_id := candidate.athlete_id;
    inserted := was_inserted;
    return next;
  end loop;

  if inserted_count > 0 then
    insert into public.audit_logs (
      team_id, actor_id, action, entity_type, entity_id, metadata
    )
    values (
      target_event.team_id,
      current_user_id,
      'whatsapp.call.enqueued',
      'event',
      target_event.id::text,
      jsonb_build_object(
        'intent_count', inserted_count,
        'schedule_version', target_event.schedule_version,
        'template_key', requested_template_key,
        'template_version', requested_template_version
      )
    );
  end if;
end;
$$;

create or replace function public.claim_notification_batch(
  requested_limit integer default 10,
  requested_lease_seconds integer default 60
)
returns table (
  outbox_id uuid,
  lease_token uuid,
  attempt_number smallint
)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '8s'
as $$
begin
  if requested_limit not between 1 and 100
    or requested_lease_seconds not between 15 and 300
  then
    raise exception 'Parâmetros de claim inválidos'
      using errcode = '22023';
  end if;

  if not public.is_runtime_control_enabled('integration_consume') then
    raise exception 'Consumo de WhatsApp desativado'
      using errcode = '55000';
  end if;

  return query
  with candidates as (
    select candidate.id
    from public.notification_outbox candidate
    where candidate.channel = 'whatsapp'
      and candidate.requested_by is not null
      and candidate.status in ('pending', 'failed')
      and candidate.requires_review is false
      and coalesce(candidate.failure_class, 'transient') <> 'permanent'
      and candidate.available_at <= now()
      and candidate.attempts < 5
    order by candidate.available_at, candidate.created_at
    for update skip locked
    limit requested_limit
  )
  update public.notification_outbox claimed
  set
    status = 'processing',
    attempts = claimed.attempts + 1,
    lease_token = extensions.gen_random_uuid(),
    lease_expires_at = now()
      + pg_catalog.make_interval(secs => requested_lease_seconds),
    failure_class = null,
    last_error = null,
    processed_at = null
  from candidates
  where claimed.id = candidates.id
  returning claimed.id, claimed.lease_token, claimed.attempts;
end;
$$;

create or replace function public.prepare_whatsapp_dispatch(
  requested_outbox_id uuid,
  requested_lease_token uuid
)
returns table (
  attempt_id uuid,
  recipient text,
  event_public_id uuid,
  credential_secret text,
  callback_token text,
  template_key text,
  template_version text,
  template_payload jsonb
)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '8s'
as $$
declare
  target public.notification_outbox;
  eligible record;
  raw_credential text;
  raw_callback_token text;
  created_attempt_id uuid;
begin
  if not public.is_runtime_control_enabled('integration_consume') then
    raise exception 'Consumo de WhatsApp desativado'
      using errcode = '55000';
  end if;

  select outbox.*
  into target
  from public.notification_outbox outbox
  where outbox.id = requested_outbox_id
  for update;

  if target.id is null
    or target.status <> 'processing'
    or target.lease_token is distinct from requested_lease_token
    or target.lease_expires_at <= now()
    or target.effect_started_at is not null
  then
    raise exception 'Lease de dispatch inválido'
      using errcode = '55000';
  end if;

  select
    event.public_id,
    event.ends_at,
    athlete.user_id as athlete_user_id,
    athlete_private.phone_e164
  into eligible
  from public.events event
  join public.event_attendance attendance
    on attendance.event_id = event.id
    and attendance.team_id = event.team_id
    and attendance.athlete_id = target.athlete_id
  join public.athletes athlete
    on athlete.id = attendance.athlete_id
    and athlete.team_id = attendance.team_id
    and athlete.status = 'active'
  join public.athlete_private athlete_private
    on athlete_private.athlete_id = athlete.id
    and athlete_private.team_id = athlete.team_id
    and athlete_private.phone_e164 = target.recipient
    and athlete_private.privacy_terms_accepted_at is not null
  join public.communication_consents consent
    on consent.athlete_id = athlete.id
    and consent.team_id = athlete.team_id
    and consent.channel = 'whatsapp'
    and consent.status = 'granted'
  where event.id = target.event_id
    and event.team_id = target.team_id
    and event.status = 'scheduled'
    and event.schedule_version = target.intent_version
    and event.starts_at > now()
    and (
      event.attendance_deadline is null
      or event.attendance_deadline > now()
    )
    and private.is_team_feature_enabled(event.team_id, 'whatsapp_delivery');

  if eligible.public_id is null or target.requested_by is null then
    update public.notification_outbox
    set
      status = 'cancelled',
      lease_token = null,
      lease_expires_at = null,
      processed_at = now(),
      last_error = 'Intenção inelegível na preparação.'
    where id = target.id;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(target.event_id::text || ':' || target.athlete_id::text, 0)
  );

  update public.event_access_credentials
  set
    revoked_at = now(),
    revoked_by = target.requested_by,
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

  raw_credential := private.new_access_secret();
  raw_callback_token := private.new_access_secret();

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
    private.hash_access_secret(raw_credential),
    eligible.athlete_user_id,
    target.requested_by,
    eligible.ends_at + interval '7 days'
  );

  insert into public.notification_delivery_attempts (
    outbox_id,
    team_id,
    attempt_number,
    callback_token_hash
  )
  values (
    target.id,
    target.team_id,
    target.attempts,
    private.hash_access_secret(raw_callback_token)
  )
  returning id into created_attempt_id;

  update public.notification_outbox
  set effect_started_at = now()
  where id = target.id;

  attempt_id := created_attempt_id;
  recipient := target.recipient;
  event_public_id := eligible.public_id;
  credential_secret := raw_credential;
  callback_token := raw_callback_token;
  template_key := target.template_key;
  template_version := target.template_version;
  template_payload := target.payload;
  return next;
end;
$$;

create or replace function public.ack_notification_sent(
  requested_outbox_id uuid,
  requested_lease_token uuid,
  requested_attempt_id uuid,
  requested_provider_message_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  target record;
begin
  if requested_provider_message_id is null
    or char_length(requested_provider_message_id) not between 2 and 255
  then
    raise exception 'Identificador do provedor inválido'
      using errcode = '22023';
  end if;

  select
    outbox.status as outbox_status,
    outbox.lease_token,
    outbox.provider_message_id as outbox_provider_message_id,
    attempt.delivery_status,
    attempt.provider_message_id as attempt_provider_message_id
  into target
  from public.notification_outbox outbox
  join public.notification_delivery_attempts attempt
    on attempt.id = requested_attempt_id
    and attempt.outbox_id = outbox.id
    and attempt.team_id = outbox.team_id
  where outbox.id = requested_outbox_id
  for update of outbox, attempt;

  if target.outbox_status is null
    or (
      target.outbox_status = 'processing'
      and target.lease_token is distinct from requested_lease_token
    )
    or target.attempt_provider_message_id is not null
      and target.attempt_provider_message_id <> requested_provider_message_id
    or target.outbox_provider_message_id is not null
      and target.outbox_provider_message_id <> requested_provider_message_id
  then
    raise exception 'Ack de dispatch inválido'
      using errcode = '55000';
  end if;

  update public.notification_delivery_attempts
  set
    provider_message_id = coalesce(
      provider_message_id,
      requested_provider_message_id
    ),
    delivery_status = case
      when delivery_status = 'prepared' then 'accepted'
      else delivery_status
    end
  where id = requested_attempt_id;

  insert into public.notification_delivery_events (
    attempt_id, outbox_id, team_id, delivery_status, provider_message_id
  )
  select
    attempt.id,
    attempt.outbox_id,
    attempt.team_id,
    'accepted',
    requested_provider_message_id
  from public.notification_delivery_attempts attempt
  where attempt.id = requested_attempt_id
  on conflict do nothing;

  update public.notification_outbox outbox
  set
    status = case
      when attempt.delivery_status in ('failed', 'undelivered')
        then 'failed'::public.message_status
      else 'sent'::public.message_status
    end,
    provider_message_id = requested_provider_message_id,
    processed_at = now(),
    lease_token = null,
    lease_expires_at = null,
    last_error = case
      when attempt.delivery_status in ('failed', 'undelivered')
        then outbox.last_error
      else null
    end
  from public.notification_delivery_attempts attempt
  where outbox.id = requested_outbox_id
    and attempt.id = requested_attempt_id;

  return true;
end;
$$;

create or replace function public.nack_notification(
  requested_outbox_id uuid,
  requested_lease_token uuid,
  requested_attempt_id uuid,
  requested_failure_class text,
  requested_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  target public.notification_outbox;
  effective_failure_class text;
begin
  if requested_failure_class not in ('transient', 'permanent', 'ambiguous')
    or requested_error_code is null
    or requested_error_code !~ '^[A-Za-z0-9_.-]{1,100}$'
  then
    raise exception 'Falha de dispatch inválida'
      using errcode = '22023';
  end if;

  select outbox.*
  into target
  from public.notification_outbox outbox
  where outbox.id = requested_outbox_id
  for update;

  if target.id is null
    or target.status <> 'processing'
    or target.lease_token is distinct from requested_lease_token
    or not exists (
      select 1
      from public.notification_delivery_attempts attempt
      where attempt.id = requested_attempt_id
        and attempt.outbox_id = target.id
        and attempt.team_id = target.team_id
    )
  then
    raise exception 'Nack de dispatch inválido'
      using errcode = '55000';
  end if;

  effective_failure_class := case
    when requested_failure_class = 'transient' and target.attempts >= 5
      then 'permanent'
    else requested_failure_class
  end;

  update public.notification_delivery_attempts
  set
    delivery_status = 'failed',
    provider_error_code = requested_error_code,
    completed_at = now()
  where id = requested_attempt_id;

  insert into public.notification_delivery_events (
    attempt_id, outbox_id, team_id, delivery_status, provider_error_code
  )
  values (
    requested_attempt_id,
    target.id,
    target.team_id,
    'failed',
    requested_error_code
  )
  on conflict do nothing;

  update public.notification_outbox
  set
    status = 'failed',
    failure_class = effective_failure_class,
    requires_review = effective_failure_class = 'ambiguous',
    available_at = case
      when effective_failure_class = 'transient'
        then now() + case attempts
          when 1 then interval '30 seconds'
          when 2 then interval '2 minutes'
          when 3 then interval '10 minutes'
          else interval '30 minutes'
        end
      else available_at
    end,
    effect_started_at = case
      when effective_failure_class = 'transient' then null
      else effect_started_at
    end,
    processed_at = case
      when effective_failure_class = 'transient' then null
      else now()
    end,
    lease_token = null,
    lease_expires_at = null,
    last_error = requested_error_code
  where id = target.id;

  return true;
end;
$$;

create or replace function public.record_notification_callback(
  requested_callback_token text,
  requested_provider_message_id text,
  requested_delivery_status text,
  requested_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  target record;
begin
  if requested_callback_token is null
    or char_length(requested_callback_token) <> 43
    or requested_provider_message_id is null
    or char_length(requested_provider_message_id) not between 2 and 255
    or requested_delivery_status not in (
      'accepted', 'queued', 'sent', 'delivered', 'read',
      'failed', 'undelivered'
    )
    or requested_error_code is not null
      and requested_error_code !~ '^[A-Za-z0-9_.-]{1,100}$'
  then
    raise exception 'Callback de dispatch inválido'
      using errcode = '22023';
  end if;

  select
    attempt.id,
    attempt.outbox_id,
    attempt.team_id,
    attempt.delivery_status,
    attempt.provider_message_id
  into target
  from public.notification_delivery_attempts attempt
  where attempt.callback_token_hash =
    private.hash_access_secret(requested_callback_token)
  for update;

  if target.id is null
    or target.provider_message_id is not null
      and target.provider_message_id <> requested_provider_message_id
  then
    return false;
  end if;

  if target.delivery_status in ('failed', 'undelivered', 'read')
    and target.delivery_status <> requested_delivery_status
  then
    return false;
  end if;

  if target.delivery_status = 'delivered'
    and requested_delivery_status in ('failed', 'undelivered')
  then
    return false;
  end if;

  if private.delivery_status_rank(requested_delivery_status)
    < private.delivery_status_rank(target.delivery_status)
  then
    return false;
  end if;

  insert into public.notification_delivery_events (
    attempt_id,
    outbox_id,
    team_id,
    delivery_status,
    provider_message_id,
    provider_error_code
  )
  values (
    target.id,
    target.outbox_id,
    target.team_id,
    requested_delivery_status,
    requested_provider_message_id,
    requested_error_code
  )
  on conflict do nothing;

  if not found then
    return true;
  end if;

  update public.notification_delivery_attempts
  set
    provider_message_id = coalesce(
      provider_message_id,
      requested_provider_message_id
    ),
    delivery_status = requested_delivery_status,
    provider_error_code = requested_error_code,
    completed_at = case
      when requested_delivery_status in (
        'read', 'failed', 'undelivered'
      ) then now()
      else completed_at
    end
  where id = target.id;

  update public.notification_outbox
  set
    status = case
      when requested_delivery_status in ('failed', 'undelivered')
        then 'failed'::public.message_status
      else 'sent'::public.message_status
    end,
    provider_message_id = coalesce(
      provider_message_id,
      requested_provider_message_id
    ),
    failure_class = case
      when requested_delivery_status in ('failed', 'undelivered')
        then 'permanent'
      else null
    end,
    requires_review = false,
    processed_at = now(),
    lease_token = null,
    lease_expires_at = null,
    last_error = requested_error_code
  where id = target.outbox_id;

  return true;
end;
$$;

create or replace function public.recover_expired_notification_leases()
returns table (
  safe_retry_count integer,
  review_count integer
)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '8s'
as $$
begin
  with recovered as (
    update public.notification_outbox outbox
    set
      status = 'failed',
      failure_class = 'transient',
      requires_review = false,
      available_at = now(),
      lease_token = null,
      lease_expires_at = null,
      last_error = 'lease_expired_before_effect'
    where outbox.status = 'processing'
      and outbox.lease_expires_at <= now()
      and outbox.effect_started_at is null
    returning 1
  )
  select count(*)::integer into safe_retry_count from recovered;

  with quarantined as (
    update public.notification_outbox outbox
    set
      status = 'failed',
      failure_class = 'ambiguous',
      requires_review = true,
      processed_at = now(),
      lease_token = null,
      lease_expires_at = null,
      last_error = 'lease_expired_after_effect'
    where outbox.status = 'processing'
      and outbox.lease_expires_at <= now()
      and outbox.effect_started_at is not null
    returning 1
  )
  select count(*)::integer into review_count from quarantined;

  return next;
end;
$$;

revoke all on function private.delivery_status_rank(text) from public;
revoke all on function public.enqueue_event_whatsapp_call(uuid, text, text)
  from public;
revoke all on function public.claim_notification_batch(integer, integer)
  from public;
revoke all on function public.prepare_whatsapp_dispatch(uuid, uuid)
  from public;
revoke all on function public.ack_notification_sent(uuid, uuid, uuid, text)
  from public;
revoke all on function public.nack_notification(uuid, uuid, uuid, text, text)
  from public;
revoke all on function public.record_notification_callback(text, text, text, text)
  from public;
revoke all on function public.recover_expired_notification_leases()
  from public;

grant execute on function public.enqueue_event_whatsapp_call(uuid, text, text)
  to authenticated;
grant execute on function public.claim_notification_batch(integer, integer)
  to service_role;
grant execute on function public.prepare_whatsapp_dispatch(uuid, uuid)
  to service_role;
grant execute on function public.ack_notification_sent(uuid, uuid, uuid, text)
  to service_role;
grant execute on function public.nack_notification(uuid, uuid, uuid, text, text)
  to service_role;
grant execute on function public.record_notification_callback(text, text, text, text)
  to service_role;
grant execute on function public.recover_expired_notification_leases()
  to service_role;

comment on table public.notification_delivery_attempts is
  'Tentativas provider-neutral; token de callback somente como SHA-256.';
comment on table public.notification_delivery_events is
  'Histórico append-only de estados normalizados, sem telefone, corpo ou URL.';
comment on function public.prepare_whatsapp_dispatch(uuid, uuid) is
  'Emite segredo uma vez e grava a barreira antes de autorizar efeito externo.';
comment on function public.recover_expired_notification_leases() is
  'Recupera somente lease anterior ao efeito; ambiguidade exige revisão manual.';
