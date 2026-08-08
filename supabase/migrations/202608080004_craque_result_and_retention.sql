-- R05 CP3 — apuração agregada após o fechamento e retenção irreversível.

alter table public.craque_votes
  alter column receipt_token_hash drop not null;

alter table public.craque_votes
  drop constraint if exists craque_votes_anonymized_state_check;

alter table public.craque_votes
  add constraint craque_votes_anonymized_state_check
  check (
    (anonymized_at is null and voter_hash is not null)
    or (
      anonymized_at is not null
      and voter_hash is null
      and receipt_token_hash is null
    )
  );

create or replace function public.get_craque_vote_result(
  requested_match_id uuid
)
returns table (
  candidate_athlete_id uuid,
  vote_count bigint,
  vote_percentage numeric
)
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  target_match public.event_matches%rowtype;
begin
  if (select auth.uid()) is null then
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

  if target_match.id is null
    or target_match.status <> 'finalized'
    or target_match.craque_voting_closes_at is null
    or now() < target_match.craque_voting_closes_at
  then
    return;
  end if;

  return query
  with result as (
    select
      vote.candidate_athlete_id,
      count(*)::bigint as vote_count
    from public.craque_votes vote
    where vote.match_id = target_match.id
      and vote.team_id = target_match.team_id
    group by vote.candidate_athlete_id
  ), totals as (
    select sum(result.vote_count)::numeric as total_votes
    from result
  )
  select
    result.candidate_athlete_id,
    result.vote_count,
    round(result.vote_count::numeric * 100 / totals.total_votes, 1)
  from result
  cross join totals
  where totals.total_votes > 0
  order by result.vote_count desc, result.candidate_athlete_id;
end;
$$;

revoke all on function public.get_craque_vote_result(uuid)
  from public, anon, authenticated;
grant execute on function public.get_craque_vote_result(uuid)
  to authenticated;

create or replace function public.cleanup_craque_voting_retention(
  requested_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '30s'
as $$
declare
  deleted_receipts integer := 0;
  anonymized_votes integer := 0;
  deleted_eligibility integer := 0;
  deleted_salts integer := 0;
  aged_receipts integer := 0;
  retained_match_ids uuid[] := '{}'::uuid[];
begin
  if requested_limit is null or requested_limit < 1 or requested_limit > 5000 then
    raise exception 'Retention batch limit must be between 1 and 5000'
      using errcode = '22023';
  end if;

  with expired as (
    select receipt.token_hash, receipt.vote_id
    from public.craque_vote_receipts receipt
    where receipt.expires_at <= now()
    order by receipt.expires_at, receipt.token_hash
    limit requested_limit
    for update skip locked
  ), deleted as (
    delete from public.craque_vote_receipts receipt
    using expired
    where receipt.token_hash = expired.token_hash
    returning receipt.vote_id
  ), cleared as (
    update public.craque_votes vote
    set receipt_token_hash = null
    where vote.id in (select deleted.vote_id from deleted)
    returning vote.id
  )
  select count(*)::integer
  into deleted_receipts
  from deleted;

  select coalesce(array_agg(retained.match_id), '{}'::uuid[])
  into retained_match_ids
  from (
    select match.id as match_id
    from public.event_matches match
    where match.status = 'finalized'
      and match.finalized_at <= now() - interval '90 days'
      and (
        exists (
          select 1 from public.craque_votes vote
          where vote.match_id = match.id
            and vote.anonymized_at is null
        )
        or exists (
          select 1 from private.craque_vote_eligibility eligibility
          where eligibility.match_id = match.id
        )
        or exists (
          select 1 from private.craque_vote_salts salt
          where salt.match_id = match.id
        )
      )
    order by match.finalized_at, match.id
    limit requested_limit
    for update skip locked
  ) retained;

  update public.craque_votes vote
  set
    voter_hash = null,
    receipt_token_hash = null,
    anonymized_at = now()
  where vote.match_id = any(retained_match_ids)
    and vote.anonymized_at is null;
  get diagnostics anonymized_votes = row_count;

  delete from public.craque_vote_receipts receipt
  using public.craque_votes vote
  where receipt.vote_id = vote.id
    and vote.match_id = any(retained_match_ids);
  get diagnostics aged_receipts = row_count;
  deleted_receipts := deleted_receipts + aged_receipts;

  delete from private.craque_vote_eligibility eligibility
  where eligibility.match_id = any(retained_match_ids);
  get diagnostics deleted_eligibility = row_count;

  delete from private.craque_vote_salts salt
  where salt.match_id = any(retained_match_ids);
  get diagnostics deleted_salts = row_count;

  return jsonb_build_object(
    'deletedReceipts', deleted_receipts,
    'anonymizedVotes', anonymized_votes,
    'deletedEligibility', deleted_eligibility,
    'deletedSalts', deleted_salts
  );
end;
$$;

revoke all on function public.cleanup_craque_voting_retention(integer)
  from public, anon, authenticated;
grant execute on function public.cleanup_craque_voting_retention(integer)
  to service_role;

comment on function public.get_craque_vote_result(uuid) is
  'R05: retorna somente contagem e percentual por candidato depois do fechamento, sem cédulas ou eleitores.';
comment on function public.cleanup_craque_voting_retention(integer) is
  'R05: descarta recibos expirados e remove irreversivelmente pseudônimos/salts após 90 dias, preservando totais.';
