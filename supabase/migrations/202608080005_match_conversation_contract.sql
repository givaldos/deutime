-- R06 CP1 — contrato privado e inerte da conversa da súmula.
-- A flag `comments` permanece desligada por padrão. Não há grants diretos nas
-- tabelas; toda leitura e escrita passa por RPCs que recalculam a audiência.

create type public.match_comment_status as enum (
  'active',
  'author_deleted',
  'moderated'
);

create type public.match_comment_report_status as enum (
  'open',
  'resolved',
  'dismissed'
);

create table private.match_conversation_eligibility (
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

create table public.match_comments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  team_id uuid not null,
  parent_comment_id uuid,
  author_user_id uuid references auth.users (id) on delete set null,
  author_athlete_id uuid,
  author_display_name text not null
    check (char_length(author_display_name) between 2 and 100),
  body text not null check (char_length(body) between 1 and 1000),
  status public.match_comment_status not null default 'active',
  idempotency_key uuid not null,
  deleted_at timestamptz,
  moderated_at timestamptz,
  moderated_by uuid references auth.users (id) on delete set null,
  moderation_reason text check (
    moderation_reason is null
    or char_length(moderation_reason) between 2 and 500
  ),
  created_at timestamptz not null default now(),
  unique (id, match_id, team_id),
  unique (match_id, author_user_id, idempotency_key),
  foreign key (match_id, team_id)
    references public.event_matches (id, team_id)
    on delete cascade,
  foreign key (author_athlete_id, team_id)
    references public.athletes (id, team_id)
    on delete restrict,
  foreign key (parent_comment_id, match_id, team_id)
    references public.match_comments (id, match_id, team_id)
    on delete cascade,
  check (parent_comment_id is null or parent_comment_id <> id),
  check (
    (status = 'active' and deleted_at is null and moderated_at is null
      and moderated_by is null and moderation_reason is null)
    or (status = 'author_deleted' and deleted_at is not null
      and moderated_at is null and moderated_by is null
      and moderation_reason is null)
    or (status = 'moderated' and moderated_at is not null
      and moderated_by is not null and moderation_reason is not null)
  )
);

create table public.match_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null,
  match_id uuid not null,
  team_id uuid not null,
  reporter_user_id uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(reason) between 2 and 500),
  status public.match_comment_report_status not null default 'open',
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  resolution_reason text check (
    resolution_reason is null
    or char_length(resolution_reason) between 2 and 500
  ),
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_user_id),
  foreign key (comment_id, match_id, team_id)
    references public.match_comments (id, match_id, team_id)
    on delete cascade,
  check (
    (status = 'open' and resolved_at is null and resolved_by is null
      and resolution_reason is null)
    or (status in ('resolved', 'dismissed') and resolved_at is not null
      and resolved_by is not null and resolution_reason is not null)
  )
);

create index match_comments_match_created_idx
  on public.match_comments (match_id, created_at, id);
create index match_comments_parent_idx
  on public.match_comments (parent_comment_id, created_at)
  where parent_comment_id is not null;
create index match_comments_author_rate_idx
  on public.match_comments (match_id, author_user_id, created_at desc);
create index match_comment_reports_team_status_idx
  on public.match_comment_reports (team_id, status, created_at);

alter table private.match_conversation_eligibility enable row level security;
alter table public.match_comments enable row level security;
alter table public.match_comment_reports enable row level security;

revoke all on private.match_conversation_eligibility
  from public, anon, authenticated;
revoke all on public.match_comments
  from public, anon, authenticated;
revoke all on public.match_comment_reports
  from public, anon, authenticated;

create or replace function private.can_access_match_conversation(
  requested_match_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_matches match
    where match.id = requested_match_id
      and match.status = 'finalized'
      and private.is_team_feature_enabled(
        match.team_id,
        'comments'::public.feature_key
      )
      and (
        private.is_team_staff(match.team_id)
        or exists (
          select 1
          from private.match_conversation_eligibility eligibility
          join public.athletes athlete
            on athlete.id = eligibility.athlete_id
            and athlete.team_id = eligibility.team_id
          join public.player_profiles profile
            on profile.user_id = athlete.user_id
          where eligibility.match_id = match.id
            and eligibility.team_id = match.team_id
            and athlete.user_id = (select auth.uid())
            and athlete.status = 'active'
            and athlete.removed_at is null
        )
      )
  );
$$;

revoke all on function private.can_access_match_conversation(uuid)
  from public, anon, authenticated;

create or replace function public.get_match_conversation(
  requested_match_id uuid
)
returns table (
  comment_id uuid,
  parent_comment_id uuid,
  author_display_name text,
  body text,
  status public.match_comment_status,
  created_at timestamptz,
  can_delete boolean
)
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
begin
  if (select auth.uid()) is null
    or not private.can_access_match_conversation(requested_match_id)
  then
    return;
  end if;

  return query
  select
    comment.id,
    comment.parent_comment_id,
    comment.author_display_name,
    case when comment.status = 'active' then comment.body else null end,
    comment.status,
    comment.created_at,
    comment.status = 'active'
      and comment.author_user_id = (select auth.uid())
  from public.match_comments comment
  where comment.match_id = requested_match_id
  order by comment.created_at, comment.id;
end;
$$;

create or replace function public.create_match_comment(
  requested_match_id uuid,
  requested_body text,
  requested_idempotency_key uuid,
  requested_parent_comment_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_match public.event_matches%rowtype;
  target_parent public.match_comments%rowtype;
  current_athlete_id uuid;
  current_display_name text;
  normalized_body text := btrim(requested_body);
  existing_comment_id uuid;
  new_comment_id uuid;
begin
  if current_user_id is null then
    raise exception 'Identidade verificada obrigatória'
      using errcode = '42501';
  end if;

  select match.*
  into target_match
  from public.event_matches match
  where match.id = requested_match_id;

  if target_match.id is null
    or not private.can_access_match_conversation(target_match.id)
  then
    raise exception 'Conversa indisponível'
      using errcode = '42501';
  end if;

  -- Serializa as escritas da mesma pessoa na mesma partida. Isso torna tanto o
  -- replay quanto o rate limit determinísticos sob cliques concorrentes.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_match.id::text || ':' || current_user_id::text,
      0
    )
  );

  select comment.id
  into existing_comment_id
  from public.match_comments comment
  where comment.match_id = target_match.id
    and comment.author_user_id = current_user_id
    and comment.idempotency_key = requested_idempotency_key;

  if existing_comment_id is not null then
    return existing_comment_id;
  end if;

  if target_match.finalized_at is null
    or now() >= target_match.finalized_at + interval '7 days'
  then
    raise exception 'Janela de comentários encerrada'
      using errcode = '55000';
  end if;

  if normalized_body is null
    or char_length(normalized_body) not between 1 and 1000
  then
    raise exception 'Comentário deve ter entre 1 e 1000 caracteres'
      using errcode = '22023';
  end if;

  if normalized_body ~* '(https?://|www\.)'
    or normalized_body ~ '<[^>]+>'
  then
    raise exception 'Links e HTML não são permitidos'
      using errcode = '22023';
  end if;

  if (
    select count(*) >= 5
    from public.match_comments comment
    where comment.match_id = target_match.id
      and comment.author_user_id = current_user_id
      and comment.created_at > now() - interval '1 minute'
  ) or (
    select count(*) >= 100
    from public.match_comments comment
    where comment.match_id = target_match.id
      and comment.author_user_id = current_user_id
  ) then
    raise exception 'Limite de comentários atingido'
      using errcode = '54000';
  end if;

  if requested_parent_comment_id is not null then
    select comment.*
    into target_parent
    from public.match_comments comment
    where comment.id = requested_parent_comment_id
      and comment.match_id = target_match.id
      and comment.team_id = target_match.team_id;

    if target_parent.id is null
      or target_parent.parent_comment_id is not null
      or target_parent.status <> 'active'
    then
      raise exception 'Resposta inválida'
        using errcode = '22023';
    end if;
  end if;

  select athlete.id, coalesce(athlete.preferred_name, athlete.full_name)
  into current_athlete_id, current_display_name
  from public.athletes athlete
  where athlete.team_id = target_match.team_id
    and athlete.user_id = current_user_id
    and athlete.status = 'active'
    and athlete.removed_at is null
  limit 1;

  if current_display_name is null then
    select coalesce(profile.preferred_name, profile.display_name)
    into current_display_name
    from public.player_profiles profile
    where profile.user_id = current_user_id;
  end if;

  if current_display_name is null then
    select profile.display_name
    into current_display_name
    from public.profiles profile
    where profile.user_id = current_user_id;
  end if;

  current_display_name := coalesce(current_display_name, 'Equipe técnica');

  begin
    insert into public.match_comments (
      match_id,
      team_id,
      parent_comment_id,
      author_user_id,
      author_athlete_id,
      author_display_name,
      body,
      idempotency_key
    )
    values (
      target_match.id,
      target_match.team_id,
      requested_parent_comment_id,
      current_user_id,
      current_athlete_id,
      current_display_name,
      normalized_body,
      requested_idempotency_key
    )
    returning id into new_comment_id;
  exception
    when unique_violation then
      select comment.id
      into new_comment_id
      from public.match_comments comment
      where comment.match_id = target_match.id
        and comment.author_user_id = current_user_id
        and comment.idempotency_key = requested_idempotency_key;

      if new_comment_id is null then
        raise;
      end if;
  end;

  return new_comment_id;
end;
$$;

create or replace function public.delete_my_match_comment(
  requested_comment_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_comment public.match_comments%rowtype;
begin
  if current_user_id is null then
    raise exception 'Identidade verificada obrigatória'
      using errcode = '42501';
  end if;

  select comment.*
  into target_comment
  from public.match_comments comment
  where comment.id = requested_comment_id
    and comment.author_user_id = current_user_id
  for update;

  if target_comment.id is null then
    raise exception 'Comentário indisponível'
      using errcode = '42501';
  end if;

  if target_comment.status = 'author_deleted' then
    return true;
  end if;

  if target_comment.status <> 'active' then
    raise exception 'Comentário já foi moderado'
      using errcode = '55000';
  end if;

  update public.match_comments
  set status = 'author_deleted', deleted_at = now()
  where id = target_comment.id;

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    target_comment.team_id,
    current_user_id,
    'match_comments.author_deleted',
    'match_comments',
    target_comment.id::text,
    jsonb_build_object('match_id', target_comment.match_id)
  );

  return true;
end;
$$;

create or replace function public.report_match_comment(
  requested_comment_id uuid,
  requested_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_comment public.match_comments%rowtype;
  normalized_reason text := btrim(requested_reason);
  report_id uuid;
begin
  if current_user_id is null then
    raise exception 'Identidade verificada obrigatória'
      using errcode = '42501';
  end if;

  select comment.*
  into target_comment
  from public.match_comments comment
  where comment.id = requested_comment_id;

  if target_comment.id is null
    or target_comment.status <> 'active'
    or target_comment.author_user_id = current_user_id
    or not private.can_access_match_conversation(target_comment.match_id)
  then
    raise exception 'Comentário indisponível para denúncia'
      using errcode = '42501';
  end if;

  if normalized_reason is null
    or char_length(normalized_reason) not between 2 and 500
  then
    raise exception 'Motivo deve ter entre 2 e 500 caracteres'
      using errcode = '22023';
  end if;

  insert into public.match_comment_reports (
    comment_id, match_id, team_id, reporter_user_id, reason
  ) values (
    target_comment.id,
    target_comment.match_id,
    target_comment.team_id,
    current_user_id,
    normalized_reason
  )
  on conflict (comment_id, reporter_user_id) do update
    set reason = public.match_comment_reports.reason
  returning id into report_id;

  return report_id;
end;
$$;

revoke all on function public.get_match_conversation(uuid)
  from public, anon, authenticated;
revoke all on function public.create_match_comment(uuid, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.delete_my_match_comment(uuid)
  from public, anon, authenticated;
revoke all on function public.report_match_comment(uuid, text)
  from public, anon, authenticated;

grant execute on function public.get_match_conversation(uuid)
  to authenticated;
grant execute on function public.create_match_comment(uuid, text, uuid, uuid)
  to authenticated;
grant execute on function public.delete_my_match_comment(uuid)
  to authenticated;
grant execute on function public.report_match_comment(uuid, text)
  to authenticated;

-- Mantém o contrato R05 e acrescenta o snapshot independente da conversa.
-- Partidas já finalizadas não recebem backfill: somente finalizações futuras
-- com `comments` ativa criam audiência.
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

  if private.is_team_feature_enabled(
    target_match.team_id,
    'comments'::public.feature_key
  ) then
    insert into private.match_conversation_eligibility (
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

comment on table private.match_conversation_eligibility is
  'R06: audiência SIM/TALVEZ congelada na finalização, sem backfill e sem acesso do cliente.';
comment on table public.match_comments is
  'R06: comentários e respostas identificados da súmula; conteúdo só é projetado por RPC.';
comment on table public.match_comment_reports is
  'R06: denúncias privadas, uma por pessoa e comentário; identidade não aparece na projeção comum.';
comment on function public.get_match_conversation(uuid) is
  'R06: projeção mínima da conversa sem user_id, denúncias ou texto removido.';
