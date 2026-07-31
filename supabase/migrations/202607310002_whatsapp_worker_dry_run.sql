-- Liberação segura do claim usada pelo worker em dry-run.
-- Só desfaz claims que ainda não cruzaram a barreira de efeito externo.

create or replace function public.release_notification_claim(
  requested_outbox_id uuid,
  requested_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  released boolean;
begin
  update public.notification_outbox outbox
  set
    status = 'pending',
    attempts = greatest(outbox.attempts - 1, 0),
    lease_token = null,
    lease_expires_at = null,
    failure_class = null,
    requires_review = false,
    last_error = null,
    processed_at = null
  where outbox.id = requested_outbox_id
    and outbox.status = 'processing'
    and outbox.lease_token = requested_lease_token
    and outbox.effect_started_at is null;

  released := found;
  return released;
end;
$$;

revoke all on function public.release_notification_claim(uuid, uuid)
  from public;
grant execute on function public.release_notification_claim(uuid, uuid)
  to service_role;

comment on function public.release_notification_claim(uuid, uuid) is
  'Desfaz claim anterior ao efeito; dry-run não consome tentativa nem revela PII.';
