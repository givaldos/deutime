-- R04 CP2 — RPCs estreitas para operação mobile da súmula por partida (atrás de flag event_matches, inerte até CP2).
-- Todas derivam team_id/sessão de auth.uid(), validam via private.is_team_staff e falham fechado para cross-tenant/atleta.

create or replace function public.create_event_match(
  requested_event_id uuid,
  requested_ordinal smallint default null,
  requested_side_a_label text default null,
  requested_side_b_label text default null,
  requested_external_opponent_name text default null
) returns uuid language plpgsql security definer set search_path='' set statement_timeout='10s' as $$
declare
  current_user_id uuid := (select auth.uid());
  target_event public.events%rowtype;
  new_ordinal smallint;
  new_match_id uuid;
  side_a text := nullif(trim(requested_side_a_label), '');
  side_b text := nullif(trim(requested_side_b_label), '');
  ext_name text := nullif(trim(requested_external_opponent_name), '');
  max_ordinal smallint;
begin
  select e.* into target_event from public.events e where e.id = requested_event_id for update;
  if target_event.id is null or current_user_id is null or not private.is_team_staff(target_event.team_id) then raise exception 'Not allowed to create match' using errcode='42501'; end if;
  if target_event.status = 'cancelled' then raise exception 'Cancelled event cannot receive matches' using errcode='55000'; end if;
  if requested_external_opponent_name is not null and ext_name is not null and char_length(ext_name) > 80 then raise exception 'Invalid external opponent' using errcode='22023'; end if;
  if side_a is not null and char_length(side_a) not between 1 and 60 then raise exception 'Invalid side label' using errcode='22023'; end if;
  if side_b is not null and char_length(side_b) not between 1 and 60 then raise exception 'Invalid side label' using errcode='22023'; end if;
  if side_a is null then side_a := 'Time A'; end if;
  if side_b is null then side_b := coalesce(ext_name, 'Time B'); end if;
  if requested_ordinal is not null then
    if requested_ordinal not between 1 and 32 then raise exception 'Invalid ordinal' using errcode='22023'; end if;
    new_ordinal := requested_ordinal;
  else
    select coalesce(max(ordinal),0)+1 into max_ordinal from public.event_matches where event_id = target_event.id;
    new_ordinal := max_ordinal;
    if new_ordinal > 32 then raise exception 'Too many matches' using errcode='54000'; end if;
  end if;
  insert into public.event_matches (event_id, team_id, ordinal, status, public_mode, external_opponent_name, created_by)
  values (target_event.id, target_event.team_id, new_ordinal, 'scheduled'::public.match_status, 'private'::public.match_public_mode, ext_name, current_user_id)
  returning id into new_match_id;
  insert into public.match_sides (match_id, event_id, team_id, side_index, label) values (new_match_id, target_event.id, target_event.team_id, 1, side_a);
  insert into public.match_sides (match_id, event_id, team_id, side_index, label) values (new_match_id, target_event.id, target_event.team_id, 2, side_b);
  return new_match_id;
exception when unique_violation then raise exception 'Ordinal already taken' using errcode='23505';
end; $$;

create or replace function public.set_match_participation(
  requested_match_id uuid,
  requested_athlete_id uuid,
  requested_side_index smallint
) returns uuid language plpgsql security definer set search_path='' set statement_timeout='10s' as $$
declare
  current_user_id uuid := (select auth.uid());
  target_match public.event_matches%rowtype;
  target_side public.match_sides%rowtype;
  target_athlete public.athletes%rowtype;
  existing_id uuid;
begin
  select m.* into target_match from public.event_matches m where m.id = requested_match_id for update;
  if target_match.id is null or current_user_id is null or not private.is_team_staff(target_match.team_id) then raise exception 'Not allowed to set participation' using errcode='42501'; end if;
  if target_match.status = 'finalized' or target_match.status = 'void' then raise exception 'Match already closed' using errcode='55000'; end if;
  if requested_side_index not in (1,2) then raise exception 'Invalid side' using errcode='22023'; end if;
  select s.* into target_side from public.match_sides s where s.match_id = target_match.id and s.side_index = requested_side_index;
  if target_side.id is null then raise exception 'Side not found' using errcode='22023'; end if;
  select a.* into target_athlete from public.athletes a where a.id = requested_athlete_id and a.team_id = target_match.team_id;
  if target_athlete.id is null then raise exception 'Athlete not in team' using errcode='22023'; end if;
  if target_athlete.status <> 'active' then raise exception 'Athlete not active' using errcode='55000'; end if;
  insert into public.match_participations (match_id, event_id, team_id, athlete_id, side_id, created_by)
  values (target_match.id, target_match.event_id, target_match.team_id, requested_athlete_id, target_side.id, current_user_id)
  on conflict (match_id, athlete_id) do update set side_id = excluded.side_id returning id into existing_id;
  return existing_id;
end; $$;

create or replace function public.record_match_event(
  requested_match_id uuid,
  requested_kind public.match_event_kind,
  requested_side_index smallint,
  requested_athlete_id uuid default null,
  requested_assist_athlete_id uuid default null,
  requested_minute smallint default null,
  requested_delta smallint default null,
  requested_notes text default null
) returns uuid language plpgsql security definer set search_path='' set statement_timeout='10s' as $$
declare
  current_user_id uuid := (select auth.uid());
  target_match public.event_matches%rowtype;
  target_side public.match_sides%rowtype;
  event_id uuid;
  new_id uuid;
  note text := nullif(trim(requested_notes), '');
begin
  select m.* into target_match from public.event_matches m where m.id = requested_match_id for update;
  if target_match.id is null or current_user_id is null or not private.is_team_staff(target_match.team_id) then raise exception 'Not allowed to record event' using errcode='42501'; end if;
  if target_match.status in ('finalized','void') then raise exception 'Match closed, use correction' using errcode='55000'; end if;
  if requested_kind is null then raise exception 'Invalid kind' using errcode='22023'; end if;
  if requested_side_index is not null then
    if requested_side_index not in (1,2) then raise exception 'Invalid side' using errcode='22023'; end if;
    select s.* into target_side from public.match_sides s where s.match_id = target_match.id and s.side_index = requested_side_index;
    if target_side.id is null then raise exception 'Side not found' using errcode='22023'; end if;
  end if;
  if requested_kind in ('goal','own_goal') and target_side.id is null then raise exception 'Goal requires side' using errcode='22023'; end if;
  if requested_kind = 'score_adjustment' and requested_delta is null then raise exception 'Adjustment requires delta' using errcode='22023'; end if;
  if requested_kind <> 'score_adjustment' and requested_delta is not null then raise exception 'Delta only for adjustment' using errcode='22023'; end if;
  if requested_minute is not null and requested_minute not between 0 and 300 then raise exception 'Invalid minute' using errcode='22023'; end if;
  if note is not null and char_length(note) > 500 then raise exception 'Notes too long' using errcode='22023'; end if;
  -- autoria exige participação real no mesmo lado quando atleta interno informado
  if requested_athlete_id is not null then
    if not exists (select 1 from public.match_participations p where p.match_id = target_match.id and p.athlete_id = requested_athlete_id and p.side_id = target_side.id) then
      -- permite gol de adversário externo sem atleta (athlete_id null) ou com atleta mas sem participação -> falha se interno
      if exists (select 1 from public.athletes a where a.id = requested_athlete_id and a.team_id = target_match.team_id) then
        raise exception 'Athlete not participating on this side' using errcode='23514';
      end if;
    end if;
  end if;
  if requested_assist_athlete_id is not null then
    if requested_assist_athlete_id = requested_athlete_id then raise exception 'Athlete and assist must differ' using errcode='23514'; end if;
    if not exists (select 1 from public.match_participations p where p.match_id = target_match.id and p.athlete_id = requested_assist_athlete_id and p.side_id = target_side.id) then
      if exists (select 1 from public.athletes a where a.id = requested_assist_athlete_id and a.team_id = target_match.team_id) then
        raise exception 'Assist not participating on this side' using errcode='23514';
      end if;
    end if;
  end if;
  insert into public.match_events (match_id, event_id, team_id, kind, side_id, athlete_id, assist_athlete_id, minute, delta, notes, created_by)
  values (target_match.id, target_match.event_id, target_match.team_id, requested_kind, target_side.id, requested_athlete_id, requested_assist_athlete_id, requested_minute, requested_delta, note, current_user_id)
  returning id into new_id;
  return new_id;
end; $$;

create or replace function public.finalize_event_match(
  requested_match_id uuid
) returns void language plpgsql security definer set search_path='' set statement_timeout='10s' as $$
declare
  current_user_id uuid := (select auth.uid());
  target_match public.event_matches%rowtype;
begin
  select m.* into target_match from public.event_matches m where m.id = requested_match_id for update;
  if target_match.id is null or current_user_id is null or not private.is_team_staff(target_match.team_id) then raise exception 'Not allowed to finalize' using errcode='42501'; end if;
  if target_match.status = 'finalized' then return; end if;
  if target_match.status = 'void' then raise exception 'Void match cannot be finalized' using errcode='55000'; end if;
  update public.event_matches set status='finalized'::public.match_status, finalized_at=now(), finalized_by=current_user_id, updated_at=now() where id = target_match.id;
end; $$;

create or replace function public.void_event_match(
  requested_match_id uuid,
  requested_reason text
) returns void language plpgsql security definer set search_path='' set statement_timeout='10s' as $$
declare
  current_user_id uuid := (select auth.uid());
  target_match public.event_matches%rowtype;
  reason text := nullif(trim(requested_reason), '');
begin
  if reason is null or char_length(reason) not between 3 and 500 then raise exception 'Reason required' using errcode='22023'; end if;
  select m.* into target_match from public.event_matches m where m.id = requested_match_id for update;
  if target_match.id is null or current_user_id is null or not private.is_team_staff(target_match.team_id) then raise exception 'Not allowed to void' using errcode='42501'; end if;
  if target_match.status = 'void' then return; end if;
  update public.event_matches set status='void'::public.match_status, updated_at=now() where id = target_match.id;
  insert into public.match_events (match_id, event_id, team_id, kind, notes, created_by) values (target_match.id, target_match.event_id, target_match.team_id, 'note'::public.match_event_kind, 'Anulação: '||reason, current_user_id);
end; $$;

revoke all on function public.create_event_match(uuid, smallint, text, text, text) from public, anon, authenticated;
revoke all on function public.set_match_participation(uuid, uuid, smallint) from public, anon, authenticated;
revoke all on function public.record_match_event(uuid, public.match_event_kind, smallint, uuid, uuid, smallint, smallint, text) from public, anon, authenticated;
revoke all on function public.finalize_event_match(uuid) from public, anon, authenticated;
revoke all on function public.void_event_match(uuid, text) from public, anon, authenticated;
grant execute on function public.create_event_match(uuid, smallint, text, text, text) to authenticated;
grant execute on function public.set_match_participation(uuid, uuid, smallint) to authenticated;
grant execute on function public.record_match_event(uuid, public.match_event_kind, smallint, uuid, uuid, smallint, smallint, text) to authenticated;
grant execute on function public.finalize_event_match(uuid) to authenticated;
grant execute on function public.void_event_match(uuid, text) to authenticated;

comment on function public.create_event_match(uuid, smallint, text, text, text) is 'R04 CP2: cria partida e 2 lados; caller é staff do time, ordinal auto-incremental.';
comment on function public.set_match_participation(uuid, uuid, smallint) is 'R04 CP2: participação real por partida/lado, fonte para autoria e estatísticas.';
comment on function public.record_match_event(uuid, public.match_event_kind, smallint, uuid, uuid, smallint, smallint, text) is 'R04 CP2: timeline append-only; gol exige participação no mesmo lado, adversário externo pode omitir atleta.';
