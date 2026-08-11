-- Reprojeta a outbox mesmo quando o evento de callback já foi persistido.
-- Isso permite reconciliar uma quarentena posterior à confirmação do provedor
-- sem criar evento duplicado, regredir estado ou liberar retry automático.

create or replace function public.record_notification_callback_by_attempt_id(
  requested_attempt_id uuid,
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
  if requested_attempt_id is null
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
  where attempt.id = requested_attempt_id
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
      ) then coalesce(completed_at, now())
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

revoke all on function public.record_notification_callback_by_attempt_id(
  uuid, text, text, text
) from public;

grant execute on function public.record_notification_callback_by_attempt_id(
  uuid, text, text, text
) to service_role;

comment on function public.record_notification_callback_by_attempt_id(
  uuid, text, text, text
) is
  'Registra ou reprojeta callback assinado por tentativa, sem duplicar evento.';
