-- R16 / WP-R16-06 / BAT-04 — consulta de resultado após perda da resposta.
create or replace function public.get_batch_command_result(
  requested_team_id uuid,
  requested_domain text,
  requested_request_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  command_result jsonb;
begin
  if current_user_id is null or requested_team_id is null
    or requested_request_id is null
    or requested_domain not in ('events', 'athletes')
    or not private.is_team_staff(requested_team_id)
  then
    raise exception 'Consulta de lote indisponível' using errcode = '42501';
  end if;

  if requested_domain = 'events' then
    select command.result into command_result
    from public.event_commands command
    where command.team_id = requested_team_id
      and command.request_id = requested_request_id
      and command.actor_id = current_user_id
      and command.result ? 'applied_count';
  else
    select command.result into command_result
    from private.athlete_batch_commands command
    where command.team_id = requested_team_id
      and command.request_id = requested_request_id
      and command.actor_id = current_user_id;
  end if;

  if command_result is null then
    return jsonb_build_object('status', 'unknown');
  end if;
  return jsonb_build_object(
    'status', 'applied',
    'applied_count', command_result->'applied_count',
    'communication', coalesce(command_result->>'communication', 'not_requested')
  );
end;
$$;

revoke all on function public.get_batch_command_result(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.get_batch_command_result(uuid, text, uuid)
  to authenticated;
