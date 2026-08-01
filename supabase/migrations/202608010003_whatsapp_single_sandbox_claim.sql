-- Claim live limitado a uma intenção, um time e um destinatário do Sandbox.
-- Sem configuração e controles externos, a função permanece inerte.

create or replace function public.claim_notification_for_sandbox_pilot(
  requested_outbox_id uuid,
  requested_team_id uuid,
  requested_recipient text,
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
set statement_timeout = '5s'
as $$
begin
  if requested_outbox_id is null
    or requested_team_id is null
    or requested_recipient !~ '^\+[1-9][0-9]{7,14}$'
    or requested_lease_seconds not between 30 and 300
  then
    raise exception 'Claim do piloto inválido'
      using errcode = '22023';
  end if;

  if not public.is_runtime_control_enabled('integration_consume') then
    raise exception 'Consumo de WhatsApp desativado'
      using errcode = '55000';
  end if;

  return query
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
  where claimed.id = requested_outbox_id
    and claimed.team_id = requested_team_id
    and claimed.recipient = requested_recipient
    and claimed.channel = 'whatsapp'
    and claimed.template_key = 'event_call'
    and claimed.template_version = 'v1'
    and claimed.event_id is not null
    and claimed.athlete_id is not null
    and claimed.requested_by is not null
    and claimed.status in ('pending', 'failed')
    and claimed.available_at <= now()
    and claimed.requires_review is false
    and claimed.effect_started_at is null
    and claimed.lease_token is null
    and private.is_team_feature_enabled(
      claimed.team_id,
      'whatsapp_delivery'
    )
  returning claimed.id, claimed.lease_token, claimed.attempts;
end;
$$;

revoke all on function public.claim_notification_for_sandbox_pilot(
  uuid, uuid, text, integer
) from public, anon, authenticated;
grant execute on function public.claim_notification_for_sandbox_pilot(
  uuid, uuid, text, integer
) to service_role;

comment on function public.claim_notification_for_sandbox_pilot(
  uuid, uuid, text, integer
) is 'Claims exactly one allowlisted Sandbox intention; never scans the queue.';
