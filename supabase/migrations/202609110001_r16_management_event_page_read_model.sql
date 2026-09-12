-- R16 / WP-R16-02 / LIST-02 — projeção única da página de Jogos.
-- Mantém o contrato LIST-01 e reúne lista e opções de filtro em uma chamada.

create or replace function public.get_management_event_page(
  requested_team_id uuid,
  requested_view public.management_event_view,
  requested_search text default null,
  requested_period_start date default null,
  requested_period_end date default null,
  requested_kind public.event_kind default null,
  requested_internal_team_id uuid default null,
  requested_championship_id uuid default null,
  requested_limit integer default 24,
  requested_cursor jsonb default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  list_result jsonb;
  internal_team_options jsonb;
  championship_options jsonb;
begin
  if (select auth.uid()) is null
    or not private.is_team_staff(requested_team_id)
  then
    raise exception 'Página de jogos indisponível' using errcode = '42501';
  end if;

  if not private.is_team_feature_enabled(
    requested_team_id, 'complete_management_lists'::public.feature_key
  ) then
    raise exception 'Listas completas indisponíveis' using errcode = 'P0001';
  end if;

  list_result := public.list_management_events(
    requested_team_id,
    requested_view,
    requested_search,
    requested_period_start,
    requested_period_end,
    requested_kind,
    requested_internal_team_id,
    requested_championship_id,
    requested_limit,
    requested_cursor
  );

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', preset.id,
    'name', preset.name,
    'color', preset.color
  ) order by preset.sort_order, preset.id), '[]'::jsonb)
  into internal_team_options
  from public.team_squad_presets preset
  where preset.team_id = requested_team_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', championship.id,
    'name', championship.name,
    'status', championship.status
  ) order by championship.updated_at desc, championship.id desc), '[]'::jsonb)
  into championship_options
  from public.championships championship
  where championship.team_id = requested_team_id;

  return jsonb_build_object(
    'list', list_result,
    'filter_options', jsonb_build_object(
      'internal_teams', internal_team_options,
      'championships', championship_options
    )
  );
end;
$$;

revoke all on function public.get_management_event_page(
  uuid, public.management_event_view, text, date, date, public.event_kind,
  uuid, uuid, integer, jsonb
) from public, anon, authenticated;

grant execute on function public.get_management_event_page(
  uuid, public.management_event_view, text, date, date, public.event_kind,
  uuid, uuid, integer, jsonb
) to authenticated;

comment on function public.get_management_event_page(
  uuid, public.management_event_view, text, date, date, public.event_kind,
  uuid, uuid, integer, jsonb
) is 'R16: entrega a lista paginada de jogos e suas opções de filtro em uma chamada protegida por sessão, vínculo e flag.';
