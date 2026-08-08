-- R06 CP2 — estado mínimo para o consumidor mobile distinguir conversa vazia
-- de acesso negado. Correção forward-only do contrato publicado em 005.

create or replace function public.get_match_conversation_state(
  requested_match_id uuid
)
returns table (
  accessible boolean,
  writable boolean,
  closes_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  target_match public.event_matches%rowtype;
  allowed boolean := false;
begin
  if (select auth.uid()) is null then
    return query select false, false, null::timestamptz;
    return;
  end if;

  select match.*
  into target_match
  from public.event_matches match
  where match.id = requested_match_id;

  if target_match.id is not null then
    allowed := private.can_access_match_conversation(target_match.id);
  end if;

  if not allowed then
    return query select false, false, null::timestamptz;
    return;
  end if;

  return query select
    true,
    target_match.status = 'finalized'
      and target_match.finalized_at is not null
      and now() < target_match.finalized_at + interval '7 days',
    target_match.finalized_at + interval '7 days';
end;
$$;

revoke all on function public.get_match_conversation_state(uuid)
  from public, anon, authenticated;
grant execute on function public.get_match_conversation_state(uuid)
  to authenticated;

comment on function public.get_match_conversation_state(uuid) is
  'R06: informa somente acesso, escrita e fechamento para a UI privada; não expõe time, partida ou identidade.';
