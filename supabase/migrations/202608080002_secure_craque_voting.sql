-- R05 CP1 — corrige forward-only o contrato de votação publicado em
-- 202608080001. A assinatura antiga confiava em hashes fornecidos pelo cliente
-- e não interrompia a execução para usuário inelegível.

alter table public.event_matches
  add column if not exists craque_voting_closes_at timestamptz;

alter table public.craque_votes
  add column if not exists anonymized_at timestamptz;

alter table public.craque_votes
  alter column voter_hash drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.event_matches'::regclass
      and conname = 'event_matches_id_team_key'
  ) then
    alter table public.event_matches
      add constraint event_matches_id_team_key unique (id, team_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.craque_votes'::regclass
      and conname = 'craque_votes_match_team_fkey'
  ) then
    alter table public.craque_votes
      add constraint craque_votes_match_team_fkey
      foreign key (match_id, team_id)
      references public.event_matches (id, team_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.craque_votes'::regclass
      and conname = 'craque_votes_candidate_team_fkey'
  ) then
    alter table public.craque_votes
      add constraint craque_votes_candidate_team_fkey
      foreign key (candidate_athlete_id, team_id)
      references public.athletes (id, team_id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.craque_votes'::regclass
      and conname = 'craque_votes_anonymized_state_check'
  ) then
    alter table public.craque_votes
      add constraint craque_votes_anonymized_state_check
      check (
        (anonymized_at is null and voter_hash is not null)
        or (anonymized_at is not null and voter_hash is null)
      );
  end if;
end;
$$;

create table if not exists private.craque_vote_salts (
  match_id uuid primary key,
  team_id uuid not null,
  salt bytea not null check (octet_length(salt) = 32),
  created_at timestamptz not null default now(),
  foreign key (match_id, team_id)
    references public.event_matches (id, team_id)
    on delete cascade
);

create table if not exists private.craque_vote_eligibility (
  match_id uuid not null,
  team_id uuid not null,
  athlete_id uuid not null,
  attendance_status public.attendance_status not null
    check (attendance_status in ('confirmed', 'maybe')),
  snapshotted_at timestamptz not null default now(),
  primary key (match_id, athlete_id),
  foreign key (match_id, team_id)
    references public.event_matches (id, team_id)
    on delete cascade,
  foreign key (athlete_id, team_id)
    references public.athletes (id, team_id)
    on delete restrict
);

revoke all on private.craque_vote_salts
  from public, anon, authenticated;
revoke all on private.craque_vote_eligibility
  from public, anon, authenticated;

-- Não existe leitura direta de cédulas. Resultado e recibo terão RPCs mínimas
-- em fatias posteriores; RLS sem policy continua como segunda barreira.
revoke all on public.craque_votes from public, anon, authenticated;
revoke all on public.craque_vote_receipts from public, anon, authenticated;

-- Congela a elegibilidade no encerramento somente para times que já ativaram a
-- flag canônica `voting`. Sem a flag, nenhuma identidade adicional é copiada.
create or replace function public.finalize_event_match(
  requested_match_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_match public.event_matches%rowtype;
  target_event public.events%rowtype;
  voting_closes_at timestamptz;
begin
  select match.*
  into target_match
  from public.event_matches match
  where match.id = requested_match_id
  for update;

  if target_match.id is null
    or current_user_id is null
    or not private.is_team_staff(target_match.team_id)
  then
    raise exception 'Not allowed to finalize' using errcode = '42501';
  end if;

  if target_match.status = 'finalized' then
    return;
  end if;
  if target_match.status = 'void' then
    raise exception 'Void match cannot be finalized' using errcode = '55000';
  end if;

  select event.*
  into target_event
  from public.events event
  where event.id = target_match.event_id
    and event.team_id = target_match.team_id;

  update public.event_matches
  set
    status = 'finalized'::public.match_status,
    finalized_at = now(),
    finalized_by = current_user_id,
    updated_at = now()
  where id = target_match.id;

  if private.is_team_feature_enabled(
    target_match.team_id,
    'voting'::public.feature_key
  ) then
    voting_closes_at := target_event.ends_at + interval '12 hours';

    update public.event_matches
    set craque_voting_closes_at = voting_closes_at
    where id = target_match.id;

    insert into private.craque_vote_salts (match_id, team_id, salt)
    values (
      target_match.id,
      target_match.team_id,
      extensions.gen_random_bytes(32)
    )
    on conflict (match_id) do nothing;

    insert into private.craque_vote_eligibility (
      match_id,
      team_id,
      athlete_id,
      attendance_status
    )
    select
      target_match.id,
      target_match.team_id,
      attendance.athlete_id,
      attendance.status
    from public.event_attendance attendance
    join public.athletes athlete
      on athlete.id = attendance.athlete_id
      and athlete.team_id = attendance.team_id
    where attendance.event_id = target_match.event_id
      and attendance.team_id = target_match.team_id
      and attendance.status in ('confirmed', 'maybe')
      and athlete.status = 'active'
      and athlete.removed_at is null
    on conflict (match_id, athlete_id) do nothing;
  end if;
end;
$$;

revoke all on function public.finalize_event_match(uuid)
  from public, anon, authenticated;
grant execute on function public.finalize_event_match(uuid)
  to authenticated;

-- A assinatura insegura permanece apenas para compatibilidade de catálogo e
-- perde EXECUTE. Nenhum app publicado a consome.
revoke all on function public.cast_craque_vote(uuid, uuid, text, text)
  from public, anon, authenticated;

create or replace function public.cast_craque_vote(
  requested_match_id uuid,
  requested_candidate_athlete_id uuid
)
returns table (
  vote_id uuid,
  receipt_token text,
  receipt_expires_at timestamptz
)
language plpgsql
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
  receipt_secret bytea;
  derived_receipt_hash text;
  new_vote_id uuid;
  new_receipt_expires_at timestamptz := now() + interval '7 days';
begin
  if current_user_id is null then
    raise exception 'Voting identity required' using errcode = '42501';
  end if;

  select match.*
  into target_match
  from public.event_matches match
  where match.id = requested_match_id
  for update;

  if target_match.id is null
    or not private.is_team_feature_enabled(
      target_match.team_id,
      'voting'::public.feature_key
    )
  then
    raise exception 'Voting unavailable' using errcode = '55000';
  end if;

  if target_match.status <> 'finalized'
    or target_match.craque_voting_closes_at is null
    or now() >= target_match.craque_voting_closes_at
  then
    raise exception 'Voting window closed' using errcode = '55000';
  end if;

  select athlete.id
  into voter_athlete_id
  from public.athletes athlete
  join private.craque_vote_eligibility eligibility
    on eligibility.athlete_id = athlete.id
    and eligibility.team_id = athlete.team_id
    and eligibility.match_id = target_match.id
  where athlete.team_id = target_match.team_id
    and athlete.user_id = current_user_id
    and athlete.status = 'active'
    and athlete.removed_at is null;

  if voter_athlete_id is null then
    raise exception 'Athlete not eligible to vote' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.match_participations participation
    where participation.match_id = target_match.id
      and participation.team_id = target_match.team_id
      and participation.athlete_id = requested_candidate_athlete_id
  ) then
    raise exception 'Candidate not eligible' using errcode = '42501';
  end if;

  select salt.salt
  into vote_salt
  from private.craque_vote_salts salt
  where salt.match_id = target_match.id
    and salt.team_id = target_match.team_id;

  if vote_salt is null then
    raise exception 'Voting unavailable' using errcode = '55000';
  end if;

  derived_voter_hash := encode(
    extensions.digest(
      vote_salt || pg_catalog.convert_to(voter_athlete_id::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
  receipt_secret := extensions.gen_random_bytes(32);
  derived_receipt_hash := encode(
    extensions.digest(receipt_secret, 'sha256'),
    'hex'
  );

  insert into public.craque_votes (
    match_id,
    team_id,
    voter_hash,
    candidate_athlete_id,
    receipt_token_hash
  )
  values (
    target_match.id,
    target_match.team_id,
    derived_voter_hash,
    requested_candidate_athlete_id,
    derived_receipt_hash
  )
  returning id into new_vote_id;

  insert into public.craque_vote_receipts (
    token_hash,
    vote_id,
    expires_at
  )
  values (
    derived_receipt_hash,
    new_vote_id,
    new_receipt_expires_at
  );

  return query
  select
    new_vote_id,
    encode(receipt_secret, 'hex'),
    new_receipt_expires_at;
exception
  when unique_violation then
    raise exception 'Already voted' using errcode = '23505';
end;
$$;

revoke all on function public.cast_craque_vote(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.cast_craque_vote(uuid, uuid)
  to authenticated;

comment on function public.cast_craque_vote(uuid, uuid) is
  'R05: voto único; eleitor e hashes derivados no banco, candidato participante, snapshot SIM/TALVEZ, flag voting e janela máxima de 12h.';
comment on table private.craque_vote_eligibility is
  'Snapshot privado de SIM/TALVEZ no encerramento da partida, usado somente para autorizar o voto R05.';
comment on table private.craque_vote_salts is
  'Salt privado e aleatório por partida; impede hashes escolhidos pelo cliente e correlação na interface administrativa.';
