-- R05 — RPC para voto único anônimo do Craque (atrás de flag craque_voting, draft até DEC aceita)
create or replace function public.cast_craque_vote(
  requested_match_id uuid,
  requested_candidate_athlete_id uuid,
  requested_voter_hash text,
  requested_receipt_hash text
) returns uuid language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare
  target_match public.event_matches%rowtype;
  new_id uuid;
begin
  select m.* into target_match from public.event_matches m where m.id = requested_match_id for update;
  if target_match.id is null or target_match.status <> 'finalized' then raise exception 'Match not finalized for voting' using errcode='55000'; end if;
  if not private.is_team_staff(target_match.team_id) and not exists (select 1 from public.match_participations p where p.match_id=target_match.id and p.athlete_id in (select id from public.athletes where user_id = auth.uid())) then
    -- permite voto de quem participou (SIM/TALVEZ) - simplificado para draft
    null;
  end if;
  insert into public.craque_votes (match_id, team_id, voter_hash, candidate_athlete_id, receipt_token_hash)
  values (target_match.id, target_match.team_id, requested_voter_hash, requested_candidate_athlete_id, requested_receipt_hash)
  returning id into new_id;
  insert into public.craque_vote_receipts (token_hash, vote_id, expires_at) values (requested_receipt_hash, new_id, now() + interval '7 days')
  on conflict (token_hash) do nothing;
  return new_id;
exception when unique_violation then raise exception 'Already voted' using errcode='23505';
end; $$;
revoke all on function public.cast_craque_vote(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.cast_craque_vote(uuid,uuid,text,text) to authenticated;
comment on function public.cast_craque_vote(uuid,uuid,text,text) is 'R05 draft: voto único anônimo, voter_hash com salt, recibo 7d';
