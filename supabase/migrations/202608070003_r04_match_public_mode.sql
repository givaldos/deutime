-- R04 CP5 — controle de publicação da partida (private/final_result/live) — DEC-PUBLIC-PRIVACY
-- Staff do próprio time altera modo; public_mode não substitui consentimento pessoal.

create or replace function public.set_match_public_mode(
  requested_match_id uuid,
  requested_mode public.match_public_mode
) returns void language plpgsql security definer set search_path='' set statement_timeout='10s' as $$
declare
  current_user_id uuid := (select auth.uid());
  target_match public.event_matches%rowtype;
begin
  select m.* into target_match from public.event_matches m where m.id = requested_match_id for update;
  if target_match.id is null or current_user_id is null or not private.is_team_staff(target_match.team_id) then raise exception 'Not allowed to set public mode' using errcode='42501'; end if;
  if requested_mode is null then raise exception 'Invalid mode' using errcode='22023'; end if;
  update public.event_matches set public_mode = requested_mode, updated_at = now() where id = target_match.id;
end; $$;

revoke all on function public.set_match_public_mode(uuid, public.match_public_mode) from public, anon, authenticated;
grant execute on function public.set_match_public_mode(uuid, public.match_public_mode) to authenticated;
comment on function public.set_match_public_mode(uuid, public.match_public_mode) is 'R04 CP5: publica timeline por partida (private/final_result/live) — não expõe identidade sem consentimento.';
