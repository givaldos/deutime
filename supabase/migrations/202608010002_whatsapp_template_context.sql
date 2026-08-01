-- Contexto mínimo e autoritativo para renderizar o horário no fuso do time.
-- A expansão é compatível: consumidores N-1 ignoram a nova chave JSON.

create or replace function private.add_whatsapp_template_context()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  authoritative_timezone text;
begin
  if new.channel <> 'whatsapp' or new.event_id is null then
    return new;
  end if;

  select team.timezone
  into authoritative_timezone
  from public.teams team
  where team.id = new.team_id;

  if authoritative_timezone is null then
    raise exception 'Time inválido para contexto do template'
      using errcode = '23503';
  end if;

  new.payload := new.payload || jsonb_build_object(
    'event_timezone', authoritative_timezone
  );
  return new;
end;
$$;

revoke all on function private.add_whatsapp_template_context() from public;

create trigger notification_outbox_whatsapp_template_context
  before insert on public.notification_outbox
  for each row execute function private.add_whatsapp_template_context();

comment on function private.add_whatsapp_template_context() is
  'Adds only the authoritative team timezone to new event WhatsApp intents.';
