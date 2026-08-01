-- Webhook assinado é validado no app. Esta projeção mantém a operação sem PII.
-- Nenhuma feature flag, controle ou envio externo é ativado nesta migration.

create or replace function public.list_whatsapp_delivery_operation(
  requested_team_id uuid,
  requested_limit integer default 50
)
returns table (
  outbox_id uuid,
  event_id uuid,
  athlete_id uuid,
  outbox_status public.message_status,
  delivery_status text,
  attempts smallint,
  requires_review boolean,
  failure_class text,
  provider_error_code text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
begin
  if requested_team_id is null
    or requested_limit is null
    or requested_limit not between 1 and 100
  then
    raise exception 'Consulta operacional inválida'
      using errcode = '22023';
  end if;

  if not private.is_team_staff(
    requested_team_id,
    array['owner', 'admin']::public.team_role[]
  ) then
    raise exception 'Acesso negado'
      using errcode = '42501';
  end if;

  return query
  select
    outbox.id,
    outbox.event_id,
    outbox.athlete_id,
    outbox.status,
    coalesce(attempt.delivery_status, outbox.status::text),
    outbox.attempts,
    outbox.requires_review,
    outbox.failure_class,
    attempt.provider_error_code,
    outbox.created_at,
    outbox.updated_at
  from public.notification_outbox outbox
  left join lateral (
    select
      candidate.delivery_status,
      candidate.provider_error_code
    from public.notification_delivery_attempts candidate
    where candidate.outbox_id = outbox.id
      and candidate.team_id = outbox.team_id
    order by candidate.attempt_number desc
    limit 1
  ) attempt on true
  where outbox.team_id = requested_team_id
    and outbox.channel = 'whatsapp'
  order by outbox.created_at desc, outbox.id desc
  limit requested_limit;
end;
$$;

revoke all on function public.list_whatsapp_delivery_operation(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.list_whatsapp_delivery_operation(uuid, integer)
  to authenticated;

comment on function public.list_whatsapp_delivery_operation(uuid, integer) is
  'Lista estados do WhatsApp para owner/admin do time sem telefone, corpo, URL, SID ou credencial.';
