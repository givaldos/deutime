-- Automatic production for due WhatsApp reminder quotas. The worker remains
-- responsible for the external effect and all switches continue fail-closed.

create or replace function private.attach_timezone_to_reminder_outbox()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  event_timezone text;
begin
  if new.reminder_slot_id is null
    or new.payload ? 'event_timezone'
  then
    return new;
  end if;

  select team.timezone
  into event_timezone
  from public.teams team
  where team.id = new.team_id;

  if event_timezone is not null then
    new.payload := new.payload || jsonb_build_object(
      'event_timezone', event_timezone
    );
  end if;

  return new;
end;
$$;

create trigger reminder_outbox_attach_timezone
  before insert on public.notification_outbox
  for each row
  when (new.reminder_slot_id is not null)
  execute function private.attach_timezone_to_reminder_outbox();

create or replace function public.produce_due_event_whatsapp_reminders(
  requested_limit integer default 25
)
returns table (
  scanned_slots integer,
  enqueued_slots integer,
  empty_slots integer,
  skipped_slots integer,
  enqueued_messages integer
)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '12s'
as $$
declare
  candidate record;
  target_event public.events%rowtype;
  target_slot public.event_whatsapp_reminder_slots%rowtype;
  recipient record;
  candidate_key text;
  current_eligible integer;
  current_inserted integer;
  skip_reason text;
begin
  if requested_limit not between 1 and 100 then
    raise exception 'Limite de produção inválido'
      using errcode = '22023';
  end if;

  scanned_slots := 0;
  enqueued_slots := 0;
  empty_slots := 0;
  skipped_slots := 0;
  enqueued_messages := 0;

  if not public.is_runtime_control_enabled('integration_produce') then
    return next;
    return;
  end if;

  for candidate in
    select due.id, due.event_id, due.scheduled_for
    from (
      select distinct on (slot.event_id)
        slot.id,
        slot.event_id,
        slot.scheduled_for
      from public.event_whatsapp_reminder_slots slot
      join public.events event
        on event.id = slot.event_id
        and event.team_id = slot.team_id
      where slot.status = 'scheduled'
        and slot.scheduled_for <= now()
        and private.is_team_feature_enabled(
          slot.team_id,
          'whatsapp_reminders'
        )
        and private.is_team_feature_enabled(
          slot.team_id,
          'whatsapp_delivery'
        )
      order by slot.event_id, slot.scheduled_for, slot.slot_key
    ) due
    order by due.scheduled_for, due.id
    limit requested_limit
  loop
    if not public.is_runtime_control_enabled('integration_produce') then
      exit;
    end if;

    select event.*
    into target_event
    from public.events event
    where event.id = candidate.event_id
    for update;

    select slot.*
    into target_slot
    from public.event_whatsapp_reminder_slots slot
    where slot.id = candidate.id
    for update;

    if target_event.id is null
      or target_slot.id is null
      or target_slot.status <> 'scheduled'
      or target_slot.scheduled_for > now()
      or not private.is_team_feature_enabled(
        target_slot.team_id,
        'whatsapp_reminders'
      )
      or not private.is_team_feature_enabled(
        target_slot.team_id,
        'whatsapp_delivery'
      )
    then
      continue;
    end if;

    scanned_slots := scanned_slots + 1;
    skip_reason := null;

    if target_event.status <> 'scheduled'
      or target_event.starts_at <= now()
    then
      skip_reason := 'event_not_scheduled';
    elsif target_event.attendance_deadline is not null
      and target_event.attendance_deadline <= now()
    then
      skip_reason := 'deadline_closed';
    elsif target_slot.scheduled_for < now() - interval '6 hours' then
      skip_reason := 'automatic_window_expired';
    end if;

    if skip_reason is not null then
      update public.event_whatsapp_reminder_slots slot
      set
        status = 'skipped',
        consumed_at = now(),
        status_reason = skip_reason,
        updated_at = now()
      where slot.id = target_slot.id;
      skipped_slots := skipped_slots + 1;

      insert into public.audit_logs (
        team_id, actor_id, action, entity_type, entity_id, metadata
      )
      values (
        target_event.team_id,
        null,
        'whatsapp.reminder.automatic_skipped',
        'event_reminder_slot',
        target_slot.id::text,
        jsonb_build_object(
          'slot_key', target_slot.slot_key,
          'reason', skip_reason
        )
      );
      continue;
    end if;

    current_eligible := 0;
    current_inserted := 0;

    for recipient in
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
      current_eligible := current_eligible + 1;
      candidate_key := concat_ws(
        ':',
        'whatsapp', 'event-reminder', target_slot.id, recipient.athlete_id
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
        recipient.athlete_id,
        'whatsapp',
        target_slot.template_key,
        target_slot.template_version,
        target_event.schedule_version,
        target_event.created_by,
        recipient.phone_e164,
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
        current_inserted := current_inserted + 1;
      end if;
    end loop;

    if current_eligible = 0 then
      update public.event_whatsapp_reminder_slots slot
      set
        status = 'skipped',
        consumed_at = now(),
        status_reason = 'automatic_empty',
        updated_at = now()
      where slot.id = target_slot.id;
      empty_slots := empty_slots + 1;
      skipped_slots := skipped_slots + 1;
    else
      update public.event_whatsapp_reminder_slots slot
      set
        status = 'enqueued',
        triggered_manually = false,
        consumed_at = now(),
        status_reason = 'automatic',
        updated_at = now()
      where slot.id = target_slot.id;
      enqueued_slots := enqueued_slots + 1;
      enqueued_messages := enqueued_messages + current_inserted;
    end if;

    insert into public.audit_logs (
      team_id, actor_id, action, entity_type, entity_id, metadata
    )
    values (
      target_event.team_id,
      null,
      case
        when current_eligible = 0
          then 'whatsapp.reminder.automatic_empty'
        else 'whatsapp.reminder.automatic_enqueued'
      end,
      'event_reminder_slot',
      target_slot.id::text,
      jsonb_build_object(
        'slot_key', target_slot.slot_key,
        'eligible_count', current_eligible,
        'inserted_count', current_inserted
      )
    );
  end loop;

  return next;
end;
$$;

revoke all on function private.attach_timezone_to_reminder_outbox()
  from public, anon, authenticated;
revoke all on function public.produce_due_event_whatsapp_reminders(integer)
  from public, anon, authenticated;
grant execute on function public.produce_due_event_whatsapp_reminders(integer)
  to service_role;

comment on function public.produce_due_event_whatsapp_reminders(integer) is
  'Produces at most one due reminder quota per event per run. Empty, closed, or more than six hours late quotas are skipped without external effect.';
