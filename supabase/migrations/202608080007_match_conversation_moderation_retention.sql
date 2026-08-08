-- R06 CP3 — fila privada de moderação e retenção definitiva da conversa.

create or replace function public.get_match_conversation_moderation(
  requested_event_id uuid
)
returns table (
  match_id uuid,
  match_ordinal integer,
  comment_id uuid,
  parent_comment_id uuid,
  author_display_name text,
  body text,
  status public.match_comment_status,
  created_at timestamptz,
  moderation_reason text,
  report_count bigint,
  report_reasons text[]
)
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  target_event public.events%rowtype;
begin
  select event.*
  into target_event
  from public.events event
  where event.id = requested_event_id;

  if target_event.id is null
    or (select auth.uid()) is null
    or not private.is_team_staff(target_event.team_id)
    or not private.is_team_feature_enabled(
      target_event.team_id,
      'comments'::public.feature_key
    )
  then
    return;
  end if;

  return query
  select
    match.id,
    match.ordinal::integer,
    comment.id,
    comment.parent_comment_id,
    comment.author_display_name,
    comment.body,
    comment.status,
    comment.created_at,
    comment.moderation_reason,
    reports.report_count,
    reports.report_reasons
  from public.event_matches match
  join public.match_comments comment
    on comment.match_id = match.id
    and comment.team_id = match.team_id
  cross join lateral (
    select
      count(*)::bigint as report_count,
      coalesce(
        array_agg(report.reason order by report.created_at, report.id),
        '{}'::text[]
      ) as report_reasons,
      count(*) filter (where report.status = 'open')::bigint
        as open_report_count
    from public.match_comment_reports report
    where report.comment_id = comment.id
      and report.match_id = comment.match_id
      and report.team_id = comment.team_id
  ) reports
  where match.event_id = target_event.id
    and match.team_id = target_event.team_id
    and comment.status <> 'author_deleted'
    and (
      comment.status = 'moderated'
      or reports.open_report_count > 0
    )
  order by match.ordinal, comment.created_at, comment.id;
end;
$$;

create or replace function public.moderate_match_comment(
  requested_comment_id uuid,
  requested_reason text
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
  target_match public.event_matches%rowtype;
  normalized_reason text := btrim(
    regexp_replace(
      regexp_replace(coalesce(requested_reason, ''), '<[^>]*>', '', 'g'),
      '[[:cntrl:]]+',
      ' ',
      'g'
    )
  );
begin
  select comment.*
  into target_comment
  from public.match_comments comment
  where comment.id = requested_comment_id
  for update;

  if target_comment.id is null or current_user_id is null then
    raise exception 'Comentário indisponível para moderação'
      using errcode = '42501';
  end if;

  select match.*
  into target_match
  from public.event_matches match
  where match.id = target_comment.match_id
    and match.team_id = target_comment.team_id;

  if target_match.id is null
    or target_match.status <> 'finalized'
    or not private.is_team_staff(target_comment.team_id)
    or not private.is_team_feature_enabled(
      target_comment.team_id,
      'comments'::public.feature_key
    )
  then
    raise exception 'Comentário indisponível para moderação'
      using errcode = '42501';
  end if;

  if char_length(normalized_reason) not between 2 and 500 then
    raise exception 'Motivo deve ter entre 2 e 500 caracteres'
      using errcode = '22023';
  end if;

  if target_comment.status = 'moderated' then
    return true;
  end if;

  if target_comment.status <> 'active' then
    raise exception 'Comentário não pode ser moderado'
      using errcode = '55000';
  end if;

  update public.match_comments
  set
    status = 'moderated',
    moderated_at = now(),
    moderated_by = current_user_id,
    moderation_reason = normalized_reason
  where id = target_comment.id;

  update public.match_comment_reports
  set
    status = 'resolved',
    resolved_at = now(),
    resolved_by = current_user_id,
    resolution_reason = normalized_reason
  where comment_id = target_comment.id
    and status = 'open';

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    target_comment.team_id,
    current_user_id,
    'match_comments.moderated',
    'match_comments',
    target_comment.id::text,
    jsonb_build_object(
      'match_id', target_comment.match_id,
      'reason', normalized_reason
    )
  );

  return true;
end;
$$;

create or replace function public.restore_match_comment(
  requested_comment_id uuid,
  requested_reason text
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
  target_match public.event_matches%rowtype;
  normalized_reason text := btrim(
    regexp_replace(
      regexp_replace(coalesce(requested_reason, ''), '<[^>]*>', '', 'g'),
      '[[:cntrl:]]+',
      ' ',
      'g'
    )
  );
begin
  select comment.*
  into target_comment
  from public.match_comments comment
  where comment.id = requested_comment_id
  for update;

  if target_comment.id is null or current_user_id is null then
    raise exception 'Comentário indisponível para restauração'
      using errcode = '42501';
  end if;

  select match.*
  into target_match
  from public.event_matches match
  where match.id = target_comment.match_id
    and match.team_id = target_comment.team_id;

  if target_match.id is null
    or target_match.status <> 'finalized'
    or not private.is_team_staff(target_comment.team_id)
    or not private.is_team_feature_enabled(
      target_comment.team_id,
      'comments'::public.feature_key
    )
  then
    raise exception 'Comentário indisponível para restauração'
      using errcode = '42501';
  end if;

  if char_length(normalized_reason) not between 2 and 500 then
    raise exception 'Motivo deve ter entre 2 e 500 caracteres'
      using errcode = '22023';
  end if;

  if target_comment.status <> 'moderated' then
    raise exception 'Comentário não está oculto pela moderação'
      using errcode = '55000';
  end if;

  update public.match_comments
  set
    status = 'active',
    moderated_at = null,
    moderated_by = null,
    moderation_reason = null
  where id = target_comment.id;

  update public.match_comment_reports
  set
    status = 'dismissed',
    resolved_at = now(),
    resolved_by = current_user_id,
    resolution_reason = normalized_reason
  where comment_id = target_comment.id
    and status = 'resolved';

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    target_comment.team_id,
    current_user_id,
    'match_comments.restored',
    'match_comments',
    target_comment.id::text,
    jsonb_build_object(
      'match_id', target_comment.match_id,
      'reason', normalized_reason
    )
  );

  return true;
end;
$$;

create or replace function public.cleanup_match_conversation_retention(
  requested_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '30s'
as $$
declare
  retained_match_ids uuid[] := '{}'::uuid[];
  retained_comment_ids text[] := '{}'::text[];
  deleted_matches integer := 0;
  deleted_comments integer := 0;
  deleted_reports integer := 0;
  deleted_eligibility integer := 0;
  deleted_audit_logs integer := 0;
begin
  if requested_limit is null or requested_limit < 1 or requested_limit > 5000 then
    raise exception 'Retention batch limit must be between 1 and 5000'
      using errcode = '22023';
  end if;

  select
    coalesce(array_agg(retained.match_id), '{}'::uuid[]),
    count(*)::integer
  into retained_match_ids, deleted_matches
  from (
    select match.id as match_id
    from public.event_matches match
    where match.finalized_at <= now() - interval '2 years'
      and (
        exists (
          select 1 from public.match_comments comment
          where comment.match_id = match.id
        )
        or exists (
          select 1 from private.match_conversation_eligibility eligibility
          where eligibility.match_id = match.id
        )
      )
    order by match.finalized_at, match.id
    limit requested_limit
    for update skip locked
  ) retained;

  select
    coalesce(array_agg(comment.id::text), '{}'::text[]),
    count(*)::integer
  into retained_comment_ids, deleted_comments
  from public.match_comments comment
  where comment.match_id = any(retained_match_ids);

  select count(*)::integer
  into deleted_reports
  from public.match_comment_reports report
  where report.match_id = any(retained_match_ids);

  delete from public.audit_logs audit
  where audit.entity_type = 'match_comments'
    and audit.entity_id = any(retained_comment_ids);
  get diagnostics deleted_audit_logs = row_count;

  delete from public.match_comments comment
  where comment.match_id = any(retained_match_ids);

  delete from private.match_conversation_eligibility eligibility
  where eligibility.match_id = any(retained_match_ids);
  get diagnostics deleted_eligibility = row_count;

  return jsonb_build_object(
    'deletedMatches', deleted_matches,
    'deletedComments', deleted_comments,
    'deletedReports', deleted_reports,
    'deletedEligibility', deleted_eligibility,
    'deletedAuditLogs', deleted_audit_logs
  );
end;
$$;

revoke all on function public.get_match_conversation_moderation(uuid)
  from public, anon, authenticated;
revoke all on function public.moderate_match_comment(uuid, text)
  from public, anon, authenticated;
revoke all on function public.restore_match_comment(uuid, text)
  from public, anon, authenticated;
revoke all on function public.cleanup_match_conversation_retention(integer)
  from public, anon, authenticated;
grant execute on function public.get_match_conversation_moderation(uuid)
  to authenticated;
grant execute on function public.moderate_match_comment(uuid, text)
  to authenticated;
grant execute on function public.restore_match_comment(uuid, text)
  to authenticated;
grant execute on function public.cleanup_match_conversation_retention(integer)
  to service_role;

comment on function public.get_match_conversation_moderation(uuid) is
  'R06: fila privada de denúncias abertas e comentários ocultos, sem identidade do denunciante.';
comment on function public.cleanup_match_conversation_retention(integer) is
  'R06: elimina conteúdo, identidades, denúncias, snapshot e auditoria da conversa dois anos após a finalização.';
