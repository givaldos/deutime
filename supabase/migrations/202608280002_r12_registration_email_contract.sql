-- R12 / WP-R12-04 — aviso mínimo de cadastro pendente.
-- O evento e o outbox não guardam PII do atleta nem o e-mail do destinatário.
-- Destinatário e endereço confirmado são recalculados imediatamente antes do envio.

insert into public.runtime_controls (control, enabled)
values
  ('registration_email_alerts', false),
  ('registration_email_delivery', false)
on conflict (control) do nothing;

create table public.registration_email_preferences (
  team_id uuid not null,
  user_id uuid not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (team_id, user_id),
  foreign key (team_id, user_id)
    references public.team_memberships (team_id, user_id) on delete cascade
);

create table private.registration_email_events (
  event_id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  registration_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'expanded')),
  created_at timestamptz not null default now(),
  expanded_at timestamptz,
  unique (event_id, team_id),
  check (
    (status = 'pending' and expanded_at is null)
    or (status = 'expanded' and expanded_at is not null)
  )
);

create table private.registration_email_outbox (
  outbox_id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  team_id uuid not null,
  registration_id uuid not null,
  recipient_user_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled', 'review')),
  attempts smallint not null default 0 check (attempts between 0 and 10),
  current_attempt_id uuid,
  lease_token uuid,
  lease_expires_at timestamptz,
  effect_started_at timestamptz,
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  provider_message_id text check (
    provider_message_id is null or char_length(provider_message_id) <= 255
  ),
  last_error_code text check (
    last_error_code is null or last_error_code ~ '^[a-z0-9_.-]{2,80}$'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, recipient_user_id),
  foreign key (event_id, team_id)
    references private.registration_email_events(event_id, team_id) on delete cascade,
  check (
    (status = 'processing' and lease_token is not null and lease_expires_at is not null
      and current_attempt_id is not null)
    or (status <> 'processing' and lease_token is null and lease_expires_at is null)
  )
);

create index registration_email_events_pending_idx
  on private.registration_email_events(created_at)
  where status = 'pending';

create index registration_email_outbox_claim_idx
  on private.registration_email_outbox(available_at, created_at)
  where status in ('pending', 'failed');

create index registration_email_outbox_expired_idx
  on private.registration_email_outbox(lease_expires_at)
  where status = 'processing';

alter table public.registration_email_preferences enable row level security;
alter table private.registration_email_events enable row level security;
alter table private.registration_email_outbox enable row level security;

revoke all on public.registration_email_preferences
  from public, anon, authenticated;
revoke all on private.registration_email_events, private.registration_email_outbox
  from public, anon, authenticated;

create trigger registration_email_preferences_set_updated_at
  before update on public.registration_email_preferences
  for each row execute function private.set_updated_at();

create trigger registration_email_outbox_set_updated_at
  before update on private.registration_email_outbox
  for each row execute function private.set_updated_at();

create or replace function private.is_registration_email_alert_production_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select control.enabled
    from public.runtime_controls control
    where control.control = 'registration_email_alerts'::public.runtime_control_key
  ), false);
$$;

create or replace function private.is_registration_email_delivery_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select control.enabled
    from public.runtime_controls control
    where control.control = 'registration_email_delivery'::public.runtime_control_key
  ), false);
$$;

create or replace function private.capture_pending_registration_email_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending'
    and new.registration_source = 'public_form'
    and (tg_op = 'INSERT' or old.status is distinct from new.status)
    and private.is_registration_email_alert_production_enabled()
  then
    insert into private.registration_email_events(team_id, registration_id)
    values (new.team_id, new.id);

    insert into public.audit_logs(
      team_id, actor_id, action, entity_type, entity_id, metadata
    )
    values (
      new.team_id,
      null,
      'registration_email.queued',
      'registration_email_event',
      new.id::text,
      jsonb_build_object('source', 'public_form', 'status', 'pending')
    );
  end if;

  return new;
end;
$$;

create trigger athletes_capture_pending_registration_email
  after insert or update of status on public.athletes
  for each row execute function private.capture_pending_registration_email_event();

create or replace function public.get_my_registration_email_preference(
  requested_team_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null or not exists (
    select 1
    from public.team_memberships membership
    join public.teams team on team.id = membership.team_id
    where membership.team_id = requested_team_id
      and membership.user_id = current_user_id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
      and team.closed_at is null
  ) then
    raise exception 'Active team administrator required' using errcode = '42501';
  end if;

  return coalesce((
    select preference.enabled
    from public.registration_email_preferences preference
    where preference.team_id = requested_team_id
      and preference.user_id = current_user_id
  ), true);
end;
$$;

create or replace function public.set_my_registration_email_preference(
  requested_team_id uuid,
  requested_enabled boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null or requested_enabled is null or not exists (
    select 1
    from public.team_memberships membership
    join public.teams team on team.id = membership.team_id
    where membership.team_id = requested_team_id
      and membership.user_id = current_user_id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
      and team.closed_at is null
  ) then
    raise exception 'Active team administrator required' using errcode = '42501';
  end if;

  insert into public.registration_email_preferences(team_id, user_id, enabled)
  values (requested_team_id, current_user_id, requested_enabled)
  on conflict (team_id, user_id) do update
  set enabled = excluded.enabled;

  insert into public.audit_logs(
    team_id, actor_id, action, entity_type, entity_id, metadata
  )
  values (
    requested_team_id,
    current_user_id,
    'registration_email.preference_changed',
    'registration_email_preference',
    current_user_id::text,
    jsonb_build_object('enabled', requested_enabled)
  );

  return requested_enabled;
end;
$$;

create or replace function public.claim_registration_email_batch(
  requested_limit integer default 25,
  requested_lease_seconds integer default 90
)
returns table(outbox_id uuid, lease_token uuid, attempt_number smallint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_registration_email_delivery_enabled() then
    return;
  end if;

  if requested_limit not between 1 and 100
    or requested_lease_seconds not between 30 and 300
  then
    raise exception 'Invalid email claim request' using errcode = '22023';
  end if;

  with pending_events as (
    select event.event_id, event.team_id, event.registration_id
    from private.registration_email_events event
    where event.status = 'pending'
    order by event.created_at
    limit requested_limit
    for update skip locked
  ), inserted as (
    insert into private.registration_email_outbox(
      event_id, team_id, registration_id, recipient_user_id
    )
    select
      event.event_id,
      event.team_id,
      event.registration_id,
      membership.user_id
    from pending_events event
    join public.team_memberships membership
      on membership.team_id = event.team_id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
    join auth.users recipient
      on recipient.id = membership.user_id
      and recipient.email_confirmed_at is not null
      and recipient.email is not null
    left join public.registration_email_preferences preference
      on preference.team_id = membership.team_id
      and preference.user_id = membership.user_id
    join public.teams team on team.id = event.team_id and team.closed_at is null
    where coalesce(preference.enabled, true)
    on conflict (event_id, recipient_user_id) do nothing
    returning private.registration_email_outbox.event_id
  )
  update private.registration_email_events event
  set status = 'expanded', expanded_at = now()
  where event.event_id in (select pending.event_id from pending_events pending);

  return query
  with candidates as (
    select outbox.outbox_id
    from private.registration_email_outbox outbox
    where outbox.status in ('pending', 'failed')
      and outbox.available_at <= now()
      and outbox.attempts < 5
    order by outbox.available_at, outbox.created_at
    limit requested_limit
    for update skip locked
  ), claimed as (
    update private.registration_email_outbox outbox
    set
      status = 'processing',
      attempts = outbox.attempts + 1,
      current_attempt_id = gen_random_uuid(),
      lease_token = gen_random_uuid(),
      lease_expires_at = now() + make_interval(secs => requested_lease_seconds),
      effect_started_at = null,
      last_error_code = null
    from candidates
    where outbox.outbox_id = candidates.outbox_id
    returning outbox.outbox_id, outbox.lease_token, outbox.attempts
  )
  select claimed.outbox_id, claimed.lease_token, claimed.attempts
  from claimed;
end;
$$;

create or replace function public.prepare_registration_email_dispatch(
  requested_outbox_id uuid,
  requested_lease_token uuid
)
returns table(
  attempt_id uuid,
  recipient_email text,
  team_name text,
  team_slug text,
  template_key text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target private.registration_email_outbox;
  resolved_email text;
  resolved_team_name text;
  resolved_team_slug text;
begin
  if not private.is_registration_email_delivery_enabled() then
    return;
  end if;

  select outbox.* into target
  from private.registration_email_outbox outbox
  where outbox.outbox_id = requested_outbox_id
    and outbox.status = 'processing'
    and outbox.lease_token = requested_lease_token
    and outbox.lease_expires_at > now()
  for update;

  if target.outbox_id is null then
    return;
  end if;

  select recipient.email, team.name, team.slug::text
  into resolved_email, resolved_team_name, resolved_team_slug
  from public.team_memberships membership
  join public.teams team
    on team.id = membership.team_id and team.closed_at is null
  join auth.users recipient
    on recipient.id = membership.user_id
    and recipient.email_confirmed_at is not null
    and recipient.email is not null
  left join public.registration_email_preferences preference
    on preference.team_id = membership.team_id
    and preference.user_id = membership.user_id
  where membership.team_id = target.team_id
    and membership.user_id = target.recipient_user_id
    and membership.status = 'active'
    and membership.role in ('owner', 'admin')
    and coalesce(preference.enabled, true);

  if resolved_email is null then
    update private.registration_email_outbox outbox
    set
      status = 'cancelled',
      processed_at = now(),
      current_attempt_id = null,
      lease_token = null,
      lease_expires_at = null,
      last_error_code = 'recipient_ineligible'
    where outbox.outbox_id = target.outbox_id;
    return;
  end if;

  update private.registration_email_outbox outbox
  set effect_started_at = now()
  where outbox.outbox_id = target.outbox_id;

  return query select
    target.current_attempt_id,
    resolved_email,
    resolved_team_name,
    resolved_team_slug,
    'registration_pending:v1'::text;
end;
$$;

create or replace function public.ack_registration_email_sent(
  requested_outbox_id uuid,
  requested_lease_token uuid,
  requested_attempt_id uuid,
  requested_provider_message_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_team_id uuid;
  changed_event_id uuid;
begin
  if requested_provider_message_id is null
    or char_length(requested_provider_message_id) not between 2 and 255
  then
    raise exception 'Invalid provider message id' using errcode = '22023';
  end if;

  update private.registration_email_outbox outbox
  set
    status = 'sent',
    processed_at = now(),
    provider_message_id = requested_provider_message_id,
    current_attempt_id = null,
    lease_token = null,
    lease_expires_at = null,
    last_error_code = null
  where outbox.outbox_id = requested_outbox_id
    and outbox.status = 'processing'
    and outbox.lease_token = requested_lease_token
    and outbox.current_attempt_id = requested_attempt_id
    and outbox.effect_started_at is not null
  returning outbox.team_id, outbox.event_id
  into changed_team_id, changed_event_id;

  if changed_event_id is null then return false; end if;

  insert into public.audit_logs(
    team_id, actor_id, action, entity_type, entity_id, metadata
  )
  values (
    changed_team_id,
    null,
    'registration_email.sent',
    'registration_email_event',
    changed_event_id::text,
    jsonb_build_object('channel', 'email')
  );

  return true;
end;
$$;

create or replace function public.nack_registration_email(
  requested_outbox_id uuid,
  requested_lease_token uuid,
  requested_attempt_id uuid,
  requested_failure_class text,
  requested_error_code text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_status text;
  current_attempts smallint;
begin
  if requested_failure_class not in ('transient', 'permanent', 'ambiguous')
    or requested_error_code is null
    or requested_error_code !~ '^[a-z0-9_.-]{2,80}$'
  then
    raise exception 'Invalid email failure' using errcode = '22023';
  end if;

  select outbox.attempts into current_attempts
  from private.registration_email_outbox outbox
  where outbox.outbox_id = requested_outbox_id
    and outbox.status = 'processing'
    and outbox.lease_token = requested_lease_token
    and outbox.current_attempt_id = requested_attempt_id
  for update;

  if current_attempts is null then return 'stale'; end if;

  next_status := case
    when requested_failure_class = 'ambiguous' then 'review'
    when requested_failure_class = 'permanent' or current_attempts >= 5 then 'cancelled'
    else 'failed'
  end;

  update private.registration_email_outbox outbox
  set
    status = next_status,
    available_at = case
      when next_status = 'failed'
        then now() + make_interval(mins => least(60, 5 * (2 ^ greatest(current_attempts - 1, 0))::integer))
      else outbox.available_at
    end,
    processed_at = case when next_status in ('review', 'cancelled') then now() else null end,
    current_attempt_id = null,
    lease_token = null,
    lease_expires_at = null,
    last_error_code = requested_error_code
  where outbox.outbox_id = requested_outbox_id;

  return next_status;
end;
$$;

create or replace function public.recover_expired_registration_email_leases()
returns table(safe_retry_count integer, review_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  recovered integer;
  reviewed integer;
begin
  update private.registration_email_outbox outbox
  set
    status = 'failed',
    available_at = now(),
    current_attempt_id = null,
    lease_token = null,
    lease_expires_at = null,
    last_error_code = 'lease_expired_before_send'
  where outbox.status = 'processing'
    and outbox.lease_expires_at <= now()
    and outbox.effect_started_at is null;
  get diagnostics recovered = row_count;

  update private.registration_email_outbox outbox
  set
    status = 'review',
    processed_at = now(),
    current_attempt_id = null,
    lease_token = null,
    lease_expires_at = null,
    last_error_code = 'lease_expired_after_send_started'
  where outbox.status = 'processing'
    and outbox.lease_expires_at <= now()
    and outbox.effect_started_at is not null;
  get diagnostics reviewed = row_count;

  return query select recovered, reviewed;
end;
$$;

create or replace function public.get_registration_email_health()
returns table(pending_count bigint, failed_count bigint, review_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) filter (where status in ('pending', 'processing')),
    count(*) filter (where status = 'failed'),
    count(*) filter (where status = 'review')
  from private.registration_email_outbox;
$$;

revoke all on function private.is_registration_email_alert_production_enabled() from public;
revoke all on function private.is_registration_email_delivery_enabled() from public;
revoke all on function private.capture_pending_registration_email_event() from public;

revoke all on function public.get_my_registration_email_preference(uuid) from public;
revoke all on function public.set_my_registration_email_preference(uuid, boolean) from public;
revoke all on function public.claim_registration_email_batch(integer, integer) from public;
revoke all on function public.prepare_registration_email_dispatch(uuid, uuid) from public;
revoke all on function public.ack_registration_email_sent(uuid, uuid, uuid, text) from public;
revoke all on function public.nack_registration_email(uuid, uuid, uuid, text, text) from public;
revoke all on function public.recover_expired_registration_email_leases() from public;
revoke all on function public.get_registration_email_health() from public;

grant execute on function public.get_my_registration_email_preference(uuid),
  public.set_my_registration_email_preference(uuid, boolean)
to authenticated;

grant execute on function public.claim_registration_email_batch(integer, integer),
  public.prepare_registration_email_dispatch(uuid, uuid),
  public.ack_registration_email_sent(uuid, uuid, uuid, text),
  public.nack_registration_email(uuid, uuid, uuid, text, text),
  public.recover_expired_registration_email_leases(),
  public.get_registration_email_health()
to service_role;

comment on table public.registration_email_preferences is
  'Optional per-user and per-team preference for pending-registration email alerts; absence means enabled.';
comment on table private.registration_email_events is
  'PII-free transition log expanded to currently eligible recipients only when delivery runs.';
comment on table private.registration_email_outbox is
  'PII-free email delivery outbox. Recipient email is resolved from a confirmed Auth identity immediately before SMTP.';
