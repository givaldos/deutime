-- Manual happy path for the next WhatsApp reminder quota. Automatic claiming
-- remains out of scope and every external-effect switch stays fail-closed.

create table public.event_whatsapp_reminder_commands (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  event_id uuid not null,
  request_id uuid not null,
  actor_id uuid not null references auth.users (id) on delete restrict,
  slot_id uuid,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  unique (team_id, request_id),
  foreign key (event_id, team_id)
    references public.events (id, team_id) on delete restrict,
  foreign key (slot_id, team_id)
    references public.event_whatsapp_reminder_slots (id, team_id)
    on delete restrict
);

create type public.event_whatsapp_reminder_command_result as (
  request_id uuid,
  slot_id uuid,
  slot_key public.event_reminder_slot_key,
  eligible_count integer,
  inserted_count integer,
  replayed boolean
);

create or replace function public.get_event_whatsapp_reminder_state(
  requested_event_id uuid
)
returns table (
  slot_id uuid,
  slot_key public.event_reminder_slot_key,
  status public.event_reminder_slot_status,
  scheduled_for timestamptz,
  triggered_manually boolean,
  consumed_at timestamptz,
  template_version text,
  eligible_count integer,
  outbox_count integer,
  pending_count integer,
  sent_count integer,
  failed_count integer,
  cost_amount numeric,
  cost_kind text
)
language plpgsql
security definer
stable
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  target_event record;
  current_eligible_count integer;
begin
  select e.id, e.team_id
  into target_event
  from public.events e
  where e.id = requested_event_id;

  if target_event.id is null
    or not private.is_team_staff(
      target_event.team_id,
      array['owner', 'admin']::public.team_role[]
    )
    or not private.is_team_feature_enabled(
      target_event.team_id,
      'whatsapp_reminders'
    )
  then
    raise exception 'Lembretes de WhatsApp indisponíveis'
      using errcode = '42501';
  end if;

  select count(*)::integer
  into current_eligible_count
  from public.event_attendance attendance
  join public.athletes athlete
    on athlete.id = attendance.athlete_id
    and athlete.team_id = attendance.team_id
    and athlete.status = 'active'
    and athlete.removed_at is null
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
    and attendance.status = 'pending';

  return query
  select
    slot.id,
    slot.slot_key,
    slot.status,
    slot.scheduled_for,
    slot.triggered_manually,
    slot.consumed_at,
    slot.template_version,
    current_eligible_count,
    count(outbox.id)::integer,
    count(outbox.id) filter (
      where outbox.status in ('pending', 'processing')
    )::integer,
    count(outbox.id) filter (where outbox.status = 'sent')::integer,
    count(outbox.id) filter (where outbox.status = 'failed')::integer,
    null::numeric,
    'unavailable'::text
  from public.event_whatsapp_reminder_slots slot
  left join public.notification_outbox outbox
    on outbox.reminder_slot_id = slot.id
    and outbox.team_id = slot.team_id
  where slot.event_id = target_event.id
  group by slot.id
  order by slot.slot_key;
end;
$$;

create or replace function public.enqueue_next_event_whatsapp_reminder(
  requested_event_id uuid,
  request_id uuid
)
returns public.event_whatsapp_reminder_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '8s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_event record;
  target_slot public.event_whatsapp_reminder_slots%rowtype;
  existing_command public.event_whatsapp_reminder_commands%rowtype;
  candidate record;
  candidate_key text;
  eligible_count integer := 0;
  inserted_count integer := 0;
  command_result public.event_whatsapp_reminder_command_result;
begin
  if request_id is null then
    raise exception 'Identificador da solicitação é obrigatório'
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
    raise exception 'Envio de lembrete indisponível'
      using errcode = '42501';
  end if;

  select command.*
  into existing_command
  from public.event_whatsapp_reminder_commands command
  where command.team_id = target_event.team_id
    and command.request_id = enqueue_next_event_whatsapp_reminder.request_id
  for update;

  if existing_command.id is not null then
    if existing_command.event_id <> target_event.id then
      raise exception 'Identificador já usado em outro evento'
        using errcode = '22023';
    end if;

    return (
      request_id,
      existing_command.slot_id,
      nullif(existing_command.result ->> 'slot_key', '')::public.event_reminder_slot_key,
      (existing_command.result ->> 'eligible_count')::integer,
      (existing_command.result ->> 'inserted_count')::integer,
      true
    )::public.event_whatsapp_reminder_command_result;
  end if;

  if target_event.status <> 'scheduled'
    or target_event.starts_at <= now()
    or (
      target_event.attendance_deadline is not null
      and target_event.attendance_deadline <= now()
    )
  then
    raise exception 'Lembrete fora do prazo'
      using errcode = '55000';
  end if;

  if not private.is_team_feature_enabled(
    target_event.team_id,
    'whatsapp_reminders'
  )
    or not private.is_team_feature_enabled(
      target_event.team_id,
      'whatsapp_delivery'
    )
    or not public.is_runtime_control_enabled('integration_produce')
  then
    raise exception 'Produção de lembretes desativada'
      using errcode = '55000';
  end if;

  select slot.*
  into target_slot
  from public.event_whatsapp_reminder_slots slot
  where slot.event_id = target_event.id
    and slot.status = 'scheduled'
  order by slot.slot_key
  limit 1
  for update;

  if target_slot.id is null then
    raise exception 'Nenhuma cota de lembrete disponível'
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
      and athlete.removed_at is null
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
      and attendance.status = 'pending'
    order by athlete.id
  loop
    eligible_count := eligible_count + 1;
    candidate_key := concat_ws(
      ':',
      'whatsapp', 'event-reminder', target_slot.id, candidate.athlete_id
    );

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
      dedupe_key,
      reminder_slot_id
    )
    values (
      target_event.team_id,
      target_event.id,
      candidate.athlete_id,
      'whatsapp',
      target_slot.template_key,
      target_slot.template_version,
      target_event.schedule_version,
      current_user_id,
      candidate.phone_e164,
      jsonb_build_object(
        'event_public_id', target_event.public_id,
        'event_title', target_event.title,
        'event_starts_at', target_event.starts_at,
        'schedule_version', target_event.schedule_version,
        'reminder_slot', target_slot.slot_key
      ),
      candidate_key,
      target_slot.id
    )
    on conflict (reminder_slot_id, athlete_id)
      where reminder_slot_id is not null
      do nothing;

    if found then
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  if eligible_count > 0 then
    update public.event_whatsapp_reminder_slots slot
    set
      status = 'enqueued',
      triggered_manually = true,
      consumed_at = now(),
      status_reason = 'manual',
      updated_at = now()
    where slot.id = target_slot.id;
  end if;

  command_result := (
    request_id,
    case when eligible_count > 0 then target_slot.id else null end,
    target_slot.slot_key,
    eligible_count,
    inserted_count,
    false
  );

  insert into public.event_whatsapp_reminder_commands (
    team_id,
    event_id,
    request_id,
    actor_id,
    slot_id,
    result
  )
  values (
    target_event.team_id,
    target_event.id,
    request_id,
    current_user_id,
    case when eligible_count > 0 then target_slot.id else null end,
    jsonb_build_object(
      'slot_key', target_slot.slot_key,
      'eligible_count', eligible_count,
      'inserted_count', inserted_count
    )
  );

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata, request_id
  )
  values (
    target_event.team_id,
    current_user_id,
    case
      when eligible_count > 0 then 'whatsapp.reminder.enqueued'
      else 'whatsapp.reminder.empty'
    end,
    'event_reminder_slot',
    target_slot.id::text,
    jsonb_build_object(
      'slot_key', target_slot.slot_key,
      'eligible_count', eligible_count,
      'inserted_count', inserted_count
    ),
    request_id::text
  );

  return command_result;
end;
$$;

-- Recheck reminder eligibility at the external-effect boundary. The original
-- dispatch contract is preserved for invitations and other messages.
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
    and athlete.removed_at is null
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
    and private.is_team_feature_enabled(event.team_id, 'whatsapp_delivery')
    and (
      target.reminder_slot_id is null
      or (
        attendance.status = 'pending'
        and private.is_team_feature_enabled(
          event.team_id,
          'whatsapp_reminders'
        )
      )
    );

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

alter table public.event_whatsapp_reminder_commands enable row level security;

revoke all on public.event_whatsapp_reminder_commands
  from public, anon, authenticated;

revoke all on function public.get_event_whatsapp_reminder_state(uuid)
  from public, anon, authenticated;
revoke all on function public.enqueue_next_event_whatsapp_reminder(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_event_whatsapp_reminder_state(uuid)
  to authenticated;
grant execute on function public.enqueue_next_event_whatsapp_reminder(uuid, uuid)
  to authenticated;

comment on function public.enqueue_next_event_whatsapp_reminder(uuid, uuid) is
  'Consumes only the next scheduled lifetime quota after recalculating pending, active, consented recipients. Zero recipients does not consume the quota.';
