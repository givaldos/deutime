-- R10 / WP-R10-01 — contrato inerte de reconhecimento positivo.
-- Não cria ledger pessoal nem consumidor. As leituras são projeções dos fatos
-- esportivos e permanecem vazias enquanto recognition estiver desligada.

create type public.recognition_kind as enum (
  'goal_recorded',
  'assist_recorded',
  'crowd_star'
);

-- R04 já instalou o trigger match_events_set_updated_at, mas a tabela nasceu
-- sem a coluna. A expansão forward-only torna correções internas executáveis;
-- os grants continuam somente de leitura para clientes.
alter table public.match_events
  add column if not exists updated_at timestamptz not null default now();

create table private.team_recognition_activations (
  team_id uuid primary key references public.teams(id) on delete cascade,
  activated_at timestamptz not null default now(),
  activated_by uuid not null references auth.users(id) on delete restrict
);

revoke all on private.team_recognition_activations
  from public, anon, authenticated;

create or replace function private.capture_recognition_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.feature = 'recognition'::public.feature_key and new.enabled then
    if tg_op = 'INSERT' then
      insert into private.team_recognition_activations (
        team_id,
        activated_at,
        activated_by
      ) values (
        new.team_id,
        now(),
        new.updated_by
      )
      on conflict (team_id) do nothing;
    elsif not old.enabled then
      insert into private.team_recognition_activations (
        team_id,
        activated_at,
        activated_by
      ) values (
        new.team_id,
        now(),
        new.updated_by
      )
      on conflict (team_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

create trigger team_feature_flags_capture_recognition_activation
  after insert or update of enabled on public.team_feature_flags
  for each row execute function private.capture_recognition_activation();

create or replace function private.get_recognition_projection(
  requested_user_id uuid
)
returns table (
  athlete_id uuid,
  team_id uuid,
  team_name text,
  kind public.recognition_kind,
  source_id uuid,
  match_id uuid,
  event_id uuid,
  event_title text,
  match_ordinal smallint,
  recognized_at timestamptz
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  with eligible_links as (
    select
      athlete.id as athlete_id,
      athlete.team_id,
      team.name as team_name,
      activation.activated_at
    from public.athletes athlete
    join public.teams team
      on team.id = athlete.team_id
    join public.team_feature_flags flag
      on flag.team_id = athlete.team_id
      and flag.feature = 'recognition'::public.feature_key
      and flag.enabled
    join private.team_recognition_activations activation
      on activation.team_id = athlete.team_id
    where requested_user_id is not null
      and athlete.user_id = requested_user_id
      and athlete.status = 'active'
      and athlete.removed_at is null
  ), eligible_matches as (
    select
      link.athlete_id,
      link.team_id,
      link.team_name,
      match.id as match_id,
      match.event_id,
      event.title as event_title,
      match.ordinal as match_ordinal,
      match.finalized_at,
      match.craque_voting_closes_at
    from eligible_links link
    join public.match_participations participation
      on participation.athlete_id = link.athlete_id
      and participation.team_id = link.team_id
    join public.event_matches match
      on match.id = participation.match_id
      and match.team_id = participation.team_id
    join public.events event
      on event.id = match.event_id
      and event.team_id = match.team_id
    where match.status = 'finalized'
      and match.finalized_at is not null
      and match.finalized_at >= link.activated_at
      and match.finalized_at <= now()
  ), vote_counts as (
    select
      vote.match_id,
      vote.team_id,
      vote.candidate_athlete_id,
      count(*)::bigint as vote_count
    from public.craque_votes vote
    group by vote.match_id, vote.team_id, vote.candidate_athlete_id
  ), ranked_votes as (
    select
      result.*,
      dense_rank() over (
        partition by result.match_id, result.team_id
        order by result.vote_count desc
      ) as rank_position
    from vote_counts result
  ), items as (
    select
      match.athlete_id,
      match.team_id,
      match.team_name,
      'goal_recorded'::public.recognition_kind as kind,
      source.id as source_id,
      match.match_id,
      match.event_id,
      match.event_title,
      match.match_ordinal,
      match.finalized_at as recognized_at
    from eligible_matches match
    join public.match_events source
      on source.match_id = match.match_id
      and source.team_id = match.team_id
      and source.kind = 'goal'
      and source.athlete_id = match.athlete_id

    union all

    select
      match.athlete_id,
      match.team_id,
      match.team_name,
      'assist_recorded'::public.recognition_kind,
      source.id,
      match.match_id,
      match.event_id,
      match.event_title,
      match.match_ordinal,
      match.finalized_at
    from eligible_matches match
    join public.match_events source
      on source.match_id = match.match_id
      and source.team_id = match.team_id
      and source.kind = 'goal'
      and source.assist_athlete_id = match.athlete_id

    union all

    select
      match.athlete_id,
      match.team_id,
      match.team_name,
      'crowd_star'::public.recognition_kind,
      result.match_id,
      match.match_id,
      match.event_id,
      match.event_title,
      match.match_ordinal,
      match.craque_voting_closes_at
    from eligible_matches match
    join ranked_votes result
      on result.match_id = match.match_id
      and result.team_id = match.team_id
      and result.candidate_athlete_id = match.athlete_id
      and result.rank_position = 1
    where match.craque_voting_closes_at is not null
      and match.craque_voting_closes_at <= now()
  )
  select
    item.athlete_id,
    item.team_id,
    item.team_name,
    item.kind,
    item.source_id,
    item.match_id,
    item.event_id,
    item.event_title,
    item.match_ordinal,
    item.recognized_at
  from items item
  order by item.recognized_at desc, item.kind, item.source_id;
$$;

create or replace function public.get_my_recognitions()
returns table (
  catalog_version text,
  kind public.recognition_kind,
  team_id uuid,
  team_name text,
  source_id uuid,
  match_id uuid,
  event_id uuid,
  event_title text,
  match_ordinal smallint,
  recognized_at timestamptz
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  select
    'recognition-v1'::text,
    item.kind,
    item.team_id,
    item.team_name,
    item.source_id,
    item.match_id,
    item.event_id,
    item.event_title,
    item.match_ordinal,
    item.recognized_at
  from private.get_recognition_projection((select auth.uid())) item;
$$;

create or replace function public.get_public_recognition_summary(
  requested_handle text
)
returns table (
  catalog_version text,
  kind public.recognition_kind,
  recognition_count bigint
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  select
    'recognition-v1'::text,
    item.kind,
    count(*)::bigint
  from public.player_profiles profile
  cross join lateral private.get_recognition_projection(profile.user_id) item
  join public.athlete_public_consents consent
    on consent.athlete_id = item.athlete_id
    and consent.team_id = item.team_id
    and consent.purpose = 'public_recognition_summary_v1'::public.athlete_public_consent_purpose
    and consent.status = 'granted'
    and consent.revoked_at is null
  where requested_handle is not null
    and profile.handle = lower(btrim(requested_handle))::extensions.citext
    and profile.is_public
  group by item.kind
  order by item.kind;
$$;

create or replace function public.set_public_recognition_summary_consent(
  requested_athlete_id uuid,
  requested_granted boolean,
  requested_terms_version text,
  request_id uuid
)
returns public.athlete_public_consents
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_athlete public.athletes%rowtype;
  changed_consent public.athlete_public_consents%rowtype;
begin
  if request_id is null
    or requested_granted is null
    or requested_terms_version is null
    or requested_terms_version !~ '^[A-Za-z0-9._-]{1,40}$'
  then
    raise exception 'Solicitação de consentimento inválida'
      using errcode = '22023';
  end if;

  select athlete.* into target_athlete
  from public.athletes athlete
  where athlete.id = requested_athlete_id
  for update;

  if current_user_id is null
    or target_athlete.id is null
    or target_athlete.user_id is distinct from current_user_id
    or target_athlete.status <> 'active'
    or target_athlete.removed_at is not null
  then
    raise exception 'Consentimento indisponível'
      using errcode = '42501';
  end if;

  if not private.is_team_feature_enabled(
    target_athlete.team_id,
    'recognition'::public.feature_key
  ) or not exists (
    select 1
    from private.team_recognition_activations activation
    where activation.team_id = target_athlete.team_id
  ) then
    raise exception 'Reconhecimento indisponível'
      using errcode = '55000';
  end if;

  insert into public.athlete_public_consents (
    athlete_id,
    team_id,
    purpose,
    status,
    terms_version,
    evidence,
    granted_at,
    revoked_at,
    updated_by
  ) values (
    target_athlete.id,
    target_athlete.team_id,
    'public_recognition_summary_v1',
    (case when requested_granted then 'granted' else 'revoked' end)::public.consent_status,
    requested_terms_version,
    'profile_settings:r10',
    case when requested_granted then now() else null end,
    case when requested_granted then null else now() end,
    current_user_id
  )
  on conflict (athlete_id, purpose) do update set
    status = excluded.status,
    terms_version = excluded.terms_version,
    evidence = excluded.evidence,
    granted_at = excluded.granted_at,
    revoked_at = excluded.revoked_at,
    updated_by = excluded.updated_by,
    updated_at = now()
  returning * into changed_consent;

  insert into public.audit_logs (
    team_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata,
    request_id
  ) values (
    target_athlete.team_id,
    current_user_id,
    case when requested_granted then 'privacy.recognition_summary.granted'
      else 'privacy.recognition_summary.revoked' end,
    'athlete_public_consent',
    target_athlete.id::text,
    jsonb_build_object(
      'purpose', 'public_recognition_summary_v1',
      'terms_version', requested_terms_version
    ),
    request_id::text
  );

  return changed_consent;
end;
$$;

revoke all on function private.capture_recognition_activation()
  from public, anon, authenticated;
revoke all on function private.get_recognition_projection(uuid)
  from public, anon, authenticated;
revoke all on function public.get_my_recognitions()
  from public, anon, authenticated;
revoke all on function public.get_public_recognition_summary(text)
  from public, anon, authenticated;
revoke all on function public.set_public_recognition_summary_consent(uuid,boolean,text,uuid)
  from public, anon, authenticated;

grant execute on function public.get_my_recognitions()
  to authenticated;
grant execute on function public.get_public_recognition_summary(text)
  to anon, authenticated;
grant execute on function public.set_public_recognition_summary_consent(uuid,boolean,text,uuid)
  to authenticated;

comment on type public.recognition_kind is
  'R10: catálogo recognition-v1 fechado, factual e sem pontos ou ranking.';
comment on column public.match_events.updated_at is
  'R10: completa o contrato do trigger criado na R04 para correções internas.';
comment on function public.get_my_recognitions() is
  'R10: projeção privada dos próprios reconhecimentos, derivada da sessão.';
comment on function public.get_public_recognition_summary(text) is
  'R10: totais por categoria, somente para vínculos com consentimento próprio.';
comment on function public.set_public_recognition_summary_consent(uuid,boolean,text,uuid) is
  'R10: titular concede ou revoga public_recognition_summary_v1 por vínculo.';
