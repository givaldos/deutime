-- Fix forward-only para 001 — restaura lógica legada de placar e confirmação em add_match_incident_as_staff
-- Mantém check N/N-1 (match_count >1) mas preserva incremento de side_a/b_score e checagem de confirmed.
create or replace function public.add_match_incident_as_staff(
  requested_event_id uuid,
  incident_kind public.match_incident_kind,
  incident_athlete_id uuid,
  incident_assist_athlete_id uuid default null,
  incident_scoring_side integer default null,
  incident_minute integer default null,
  incident_notes text default null
) returns uuid language plpgsql security definer set search_path='' set statement_timeout='10s' as $$
declare
  current_user_id uuid := (select auth.uid());
  target_event public.events%rowtype;
  normalized_notes text := nullif(trim(incident_notes), '');
  default_side_a_label text; default_side_b_label text;
  new_incident_id uuid; match_count integer;
begin
  select e.* into target_event from public.events e where e.id = requested_event_id for update;
  if target_event.id is null or current_user_id is null or not private.is_team_staff(target_event.team_id) then raise exception 'Match incident creation not allowed' using errcode='42501'; end if;
  select count(*) into match_count from public.event_matches where event_id = requested_event_id;
  if match_count > 1 then raise exception 'Event has multiple matches, use match-specific RPC' using errcode='40001'; end if;
  if target_event.status not in ('scheduled','completed') then raise exception 'Cancelled events cannot receive match incidents' using errcode='55000'; end if;
  if incident_kind is null or incident_athlete_id is null or (incident_minute is not null and incident_minute not between 1 and 300) or (normalized_notes is not null and char_length(normalized_notes) > 200) or (incident_kind = 'goal' and (incident_scoring_side is null or incident_scoring_side not in (1,2) or incident_assist_athlete_id = incident_athlete_id)) or (incident_kind in ('yellow_card','red_card') and (incident_scoring_side is not null or incident_assist_athlete_id is not null)) then raise exception 'Invalid match incident data' using errcode='22023'; end if;
  if not exists (select 1 from public.athletes a join public.event_attendance att on att.athlete_id=a.id and att.event_id=target_event.id and att.status='confirmed' where a.id=incident_athlete_id and a.team_id=target_event.team_id) then raise exception 'The athlete must be confirmed for this match' using errcode='55000'; end if;
  if incident_assist_athlete_id is not null and not exists (select 1 from public.athletes a join public.event_attendance att on att.athlete_id=a.id and att.event_id=target_event.id and att.status='confirmed' where a.id=incident_assist_athlete_id and a.team_id=target_event.team_id) then raise exception 'The assisting athlete must be confirmed for this match' using errcode='55000'; end if;
  select coalesce((select name from public.event_squads where event_id=target_event.id order by sort_order limit 1),'Time A'), coalesce((select name from public.event_squads where event_id=target_event.id order by sort_order offset 1 limit 1),'Time B') into default_side_a_label, default_side_b_label;
  insert into public.match_reports (event_id,team_id,side_a_label,side_b_label,created_by) values (target_event.id,target_event.team_id,default_side_a_label,default_side_b_label,current_user_id) on conflict (event_id) do nothing;
  insert into public.match_incidents (event_id,team_id,kind,athlete_id,assist_athlete_id,scoring_side,minute,notes,created_by) values (target_event.id,target_event.team_id,incident_kind,incident_athlete_id,incident_assist_athlete_id,incident_scoring_side,incident_minute,normalized_notes,current_user_id) returning id into new_incident_id;
  if incident_kind='goal' then update public.match_reports set side_a_score=side_a_score+case when incident_scoring_side=1 then 1 else 0 end, side_b_score=side_b_score+case when incident_scoring_side=2 then 1 else 0 end where event_id=target_event.id; end if;
  return new_incident_id;
end; $$;
