-- R04 CP4 — visão pública de partidas (private por padrão, live/final_result expõe sem identidade)
create or replace view public.public_match_directory as
select m.id, m.event_id, m.team_id, m.ordinal, m.status, m.public_mode, e.public_id
from public.event_matches m join public.events e on e.id = m.event_id
where m.public_mode in ('live','final_result');

revoke all on public.public_match_directory from public, anon, authenticated;
grant select on public.public_match_directory to anon, authenticated;

-- RLS para leitura pública: anon pode ler event_matches/sides/events quando modo público
create policy event_matches_public_select on public.event_matches for select to anon using (public_mode in ('live','final_result'));
create policy match_sides_public_select on public.match_sides for select to anon using (exists (select 1 from public.event_matches m where m.id = match_sides.match_id and m.public_mode in ('live','final_result')));
create policy match_events_public_select on public.match_events for select to anon using (exists (select 1 from public.event_matches m where m.id = match_events.match_id and m.public_mode in ('live','final_result')));

-- também liberar sides/events para anônimo quando partida pública (necessário para DAL público)
