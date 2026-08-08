-- R05 CP2 — leitura mínima para a jornada do atleta e verificação do recibo.
-- Nenhuma RPC retorna candidato escolhido, hash do eleitor ou cédula.

create or replace function public.get_my_craque_vote_status(
  requested_match_id uuid
)
returns table (
  eligible boolean,
  already_voted boolean,
  voting_closes_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_match public.event_matches%rowtype;
  voter_athlete_id uuid;
  vote_salt bytea;
  derived_voter_hash text;
begin
  if current_user_id is null then
    return;
  end if;

  select match.*
  into target_match
  from public.event_matches match
  where match.id = requested_match_id
    and private.can_access_team(match.team_id)
    and private.is_team_feature_enabled(
      match.team_id,
      'voting'::public.feature_key
    );

  if target_match.id is null or target_match.status <> 'finalized' then
    return;
  end if;

  select athlete.id
  into voter_athlete_id
  from public.athletes athlete
  where athlete.team_id = target_match.team_id
    and athlete.user_id = current_user_id
    and athlete.status = 'active'
    and athlete.removed_at is null;

  select salt.salt
  into vote_salt
  from private.craque_vote_salts salt
  where salt.match_id = target_match.id
    and salt.team_id = target_match.team_id;

  if voter_athlete_id is not null and vote_salt is not null then
    derived_voter_hash := encode(
      extensions.digest(
        vote_salt || pg_catalog.convert_to(voter_athlete_id::text, 'UTF8'),
        'sha256'
      ),
      'hex'
    );
  end if;

  return query
  select
    exists (
      select 1
      from private.craque_vote_eligibility eligibility
      where eligibility.match_id = target_match.id
        and eligibility.team_id = target_match.team_id
        and eligibility.athlete_id = voter_athlete_id
    ),
    derived_voter_hash is not null and exists (
      select 1
      from public.craque_votes vote
      where vote.match_id = target_match.id
        and vote.team_id = target_match.team_id
        and vote.voter_hash = derived_voter_hash
    ),
    target_match.craque_voting_closes_at;
end;
$$;

revoke all on function public.get_my_craque_vote_status(uuid)
  from public, anon, authenticated;
grant execute on function public.get_my_craque_vote_status(uuid)
  to authenticated;

create or replace function public.verify_craque_vote_receipt(
  requested_receipt_token text
)
returns boolean
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  select case
    when (select auth.uid()) is null
      or requested_receipt_token is null
      or requested_receipt_token !~ '^[0-9a-f]{64}$'
    then false
    else exists (
      select 1
      from public.craque_vote_receipts receipt
      join public.craque_votes vote on vote.id = receipt.vote_id
      where receipt.token_hash = encode(
        extensions.digest(
          decode(requested_receipt_token, 'hex'),
          'sha256'
        ),
        'hex'
      )
        and receipt.expires_at > now()
    )
  end;
$$;

revoke all on function public.verify_craque_vote_receipt(text)
  from public, anon, authenticated;
grant execute on function public.verify_craque_vote_receipt(text)
  to authenticated;

comment on function public.get_my_craque_vote_status(uuid) is
  'R05: retorna somente elegibilidade, já votou e fechamento para o atleta autenticado; nunca retorna cédula.';
comment on function public.verify_craque_vote_receipt(text) is
  'R05: confirma recibo bearer válido e não expirado sem revelar candidato, eleitor ou voto.';
