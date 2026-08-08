begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select no_plan();

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '07000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'moderation-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '07000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'moderation-player@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '07000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'moderation-outsider@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');

insert into public.player_profiles (
  user_id, handle, display_name, preferred_name, phone_verified_at
)
values
  ('07000000-0000-4000-8000-000000000002', 'moderation-player', 'Jogador da Moderação', 'Jogador', now()),
  ('07000000-0000-4000-8000-000000000003', 'moderation-outsider', 'Pessoa de Fora', 'De Fora', now());

insert into public.teams (id, name, slug, created_by)
values
  ('07100000-0000-4000-8000-000000000001', 'Moderação A', 'moderacao-a', '07000000-0000-4000-8000-000000000001'),
  ('07100000-0000-4000-8000-000000000002', 'Moderação B', 'moderacao-b', '07000000-0000-4000-8000-000000000003');

insert into public.athletes (
  id, team_id, user_id, full_name, preferred_name, status, registration_source
)
values
  ('07200000-0000-4000-8000-000000000001', '07100000-0000-4000-8000-000000000001', '07000000-0000-4000-8000-000000000002', 'Jogador da Moderação', 'Jogador', 'active', 'public_form');

insert into public.events (
  id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, created_by
)
values
  ('07300000-0000-4000-8000-000000000001', '07100000-0000-4000-8000-000000000001', 'Evento moderado', 'weekly_match', 'split_teams', 'society', now() - interval '3 hours', now() - interval '2 hours', now() - interval '4 hours', 'completed', '07000000-0000-4000-8000-000000000001'),
  ('07300000-0000-4000-8000-000000000002', '07100000-0000-4000-8000-000000000002', 'Evento externo', 'weekly_match', 'split_teams', 'society', now() - interval '3 hours', now() - interval '2 hours', now() - interval '4 hours', 'completed', '07000000-0000-4000-8000-000000000003');

insert into public.team_feature_flags (team_id, feature, enabled, updated_by)
values
  ('07100000-0000-4000-8000-000000000001', 'comments', true, '07000000-0000-4000-8000-000000000001'),
  ('07100000-0000-4000-8000-000000000002', 'comments', true, '07000000-0000-4000-8000-000000000003');

insert into public.event_matches (
  id, event_id, team_id, ordinal, status, public_mode,
  finalized_at, finalized_by, created_by
)
values
  ('07400000-0000-4000-8000-000000000001', '07300000-0000-4000-8000-000000000001', '07100000-0000-4000-8000-000000000001', 1, 'finalized', 'private', now() - interval '1 day', '07000000-0000-4000-8000-000000000001', '07000000-0000-4000-8000-000000000001'),
  ('07400000-0000-4000-8000-000000000002', '07300000-0000-4000-8000-000000000001', '07100000-0000-4000-8000-000000000001', 2, 'finalized', 'private', now() - interval '2 years 1 day', '07000000-0000-4000-8000-000000000001', '07000000-0000-4000-8000-000000000001'),
  ('07400000-0000-4000-8000-000000000003', '07300000-0000-4000-8000-000000000002', '07100000-0000-4000-8000-000000000002', 1, 'finalized', 'private', now() - interval '1 day', '07000000-0000-4000-8000-000000000003', '07000000-0000-4000-8000-000000000003');

insert into private.match_conversation_eligibility (
  match_id, team_id, athlete_id, attendance_status
)
values
  ('07400000-0000-4000-8000-000000000001', '07100000-0000-4000-8000-000000000001', '07200000-0000-4000-8000-000000000001', 'confirmed'),
  ('07400000-0000-4000-8000-000000000002', '07100000-0000-4000-8000-000000000001', '07200000-0000-4000-8000-000000000001', 'confirmed');

insert into public.match_comments (
  id, match_id, team_id, author_user_id, author_display_name, body,
  idempotency_key
)
values
  ('07500000-0000-4000-8000-000000000001', '07400000-0000-4000-8000-000000000001', '07100000-0000-4000-8000-000000000001', '07000000-0000-4000-8000-000000000001', 'Equipe técnica', 'Conteúdo em revisão', '07600000-0000-4000-8000-000000000001'),
  ('07500000-0000-4000-8000-000000000002', '07400000-0000-4000-8000-000000000002', '07100000-0000-4000-8000-000000000001', '07000000-0000-4000-8000-000000000002', 'Jogador', 'Conteúdo vencido e identificável', '07600000-0000-4000-8000-000000000002'),
  ('07500000-0000-4000-8000-000000000003', '07400000-0000-4000-8000-000000000003', '07100000-0000-4000-8000-000000000002', '07000000-0000-4000-8000-000000000003', 'De Fora', 'Conteúdo de outro time', '07600000-0000-4000-8000-000000000003');

insert into public.match_comment_reports (
  id, comment_id, match_id, team_id, reporter_user_id, reason,
  status, resolved_at, resolved_by, resolution_reason
)
values
  ('07700000-0000-4000-8000-000000000001', '07500000-0000-4000-8000-000000000001', '07400000-0000-4000-8000-000000000001', '07100000-0000-4000-8000-000000000001', '07000000-0000-4000-8000-000000000002', 'Mensagem desrespeitosa', 'open', null, null, null),
  ('07700000-0000-4000-8000-000000000002', '07500000-0000-4000-8000-000000000002', '07400000-0000-4000-8000-000000000002', '07100000-0000-4000-8000-000000000001', '07000000-0000-4000-8000-000000000001', 'Denúncia vencida', 'resolved', now() - interval '2 years', '07000000-0000-4000-8000-000000000001', 'Revisada no prazo');

insert into public.audit_logs (
  team_id, actor_id, action, entity_type, entity_id, metadata
)
values
  ('07100000-0000-4000-8000-000000000001', '07000000-0000-4000-8000-000000000002', 'match_comments.author_deleted', 'match_comments', '07500000-0000-4000-8000-000000000002', jsonb_build_object('match_id', '07400000-0000-4000-8000-000000000002')),
  ('07100000-0000-4000-8000-000000000002', '07000000-0000-4000-8000-000000000003', 'match_comments.author_deleted', 'match_comments', '07500000-0000-4000-8000-000000000003', jsonb_build_object('match_id', '07400000-0000-4000-8000-000000000003'));

select ok(
  not has_function_privilege('anon', 'public.get_match_conversation_moderation(uuid)', 'EXECUTE'),
  'anônimo não lê a fila de moderação'
);
select ok(
  has_function_privilege('authenticated', 'public.get_match_conversation_moderation(uuid)', 'EXECUTE'),
  'staff autenticado pode usar a projeção moderada'
);
select ok(
  not has_function_privilege('authenticated', 'public.cleanup_match_conversation_retention(integer)', 'EXECUTE'),
  'cliente autenticado não executa retenção'
);
select ok(
  has_function_privilege('service_role', 'public.cleanup_match_conversation_retention(integer)', 'EXECUTE'),
  'somente service role recebe a rotina de retenção'
);
select ok(
  position('user_id' in pg_get_function_result('public.get_match_conversation_moderation(uuid)'::regprocedure)) = 0,
  'projeção da fila não expõe user_id'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '07000000-0000-4000-8000-000000000001', true);
select is(
  (select count(*) from public.get_match_conversation_moderation('07300000-0000-4000-8000-000000000001')),
  1::bigint,
  'staff vê somente denúncia aberta do próprio evento'
);
select is(
  (select report_count from public.get_match_conversation_moderation('07300000-0000-4000-8000-000000000001')),
  1::bigint,
  'fila agrega a quantidade de denúncias sem revelar denunciante'
);
select is(
  (select report_reasons[1] from public.get_match_conversation_moderation('07300000-0000-4000-8000-000000000001')),
  'Mensagem desrespeitosa'::text,
  'staff recebe o motivo necessário para decidir'
);
select throws_ok(
  $$select public.moderate_match_comment('07500000-0000-4000-8000-000000000003', 'Tentativa cross-tenant')$$,
  '42501', null,
  'staff não modera comentário cross-tenant'
);
select is(
  public.moderate_match_comment(
    '07500000-0000-4000-8000-000000000001',
    '<b>Ocultar</b>' || chr(10) || 'agora'
  ),
  true,
  'staff oculta comentário com motivo obrigatório'
);
reset role;

select is(
  (select status from public.match_comments where id = '07500000-0000-4000-8000-000000000001'),
  'moderated'::public.match_comment_status,
  'comentário fica oculto pela moderação'
);
select is(
  (select status from public.match_comment_reports where id = '07700000-0000-4000-8000-000000000001'),
  'resolved'::public.match_comment_report_status,
  'ocultação resolve a denúncia aberta'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '07000000-0000-4000-8000-000000000001', true);
select is(
  (select body from public.get_match_conversation('07400000-0000-4000-8000-000000000001') where comment_id = '07500000-0000-4000-8000-000000000001'),
  null::text,
  'projeção comum nunca devolve corpo ocultado'
);
reset role;
select is(
  (select metadata ->> 'reason' from public.audit_logs where action = 'match_comments.moderated' and entity_id = '07500000-0000-4000-8000-000000000001'),
  'Ocultar agora'::text,
  'auditoria guarda somente motivo sanitizado'
);
select ok(
  not exists (
    select 1 from public.audit_logs
    where action = 'match_comments.moderated'
      and entity_id = '07500000-0000-4000-8000-000000000001'
      and (metadata ? 'body' or metadata::text like '%Conteúdo em revisão%')
  ),
  'auditoria não contém corpo integral'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '07000000-0000-4000-8000-000000000001', true);
select is(
  public.restore_match_comment(
    '07500000-0000-4000-8000-000000000001',
    'Revisão concluída'
  ),
  true,
  'staff restaura comentário com motivo obrigatório'
);
select is(
  (select count(*) from public.get_match_conversation_moderation('07300000-0000-4000-8000-000000000001')),
  0::bigint,
  'item restaurado sai da fila quando a denúncia foi encerrada'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '07000000-0000-4000-8000-000000000001', true);
select is(
  (select body from public.get_match_conversation('07400000-0000-4000-8000-000000000001') where comment_id = '07500000-0000-4000-8000-000000000001'),
  'Conteúdo em revisão'::text,
  'restauração devolve o corpo à projeção autorizada'
);
reset role;
select is(
  (select status from public.match_comment_reports where id = '07700000-0000-4000-8000-000000000001'),
  'dismissed'::public.match_comment_report_status,
  'restauração encerra a denúncia como descartada'
);
select ok(
  exists (
    select 1 from public.audit_logs
    where action = 'match_comments.restored'
      and entity_id = '07500000-0000-4000-8000-000000000001'
      and metadata ->> 'reason' = 'Revisão concluída'
      and not metadata ? 'body'
  ),
  'restauração é auditada sem o corpo'
);

update public.match_comment_reports
set status = 'open', resolved_at = null, resolved_by = null, resolution_reason = null
where id = '07700000-0000-4000-8000-000000000001';
update public.team_feature_flags
set enabled = false
where team_id = '07100000-0000-4000-8000-000000000001'
  and feature = 'comments';

set local role authenticated;
select set_config('request.jwt.claim.sub', '07000000-0000-4000-8000-000000000001', true);
select is(
  (select count(*) from public.get_match_conversation_moderation('07300000-0000-4000-8000-000000000001')),
  0::bigint,
  'flag desligada remove imediatamente a fila administrativa'
);
select throws_ok(
  $$select public.moderate_match_comment('07500000-0000-4000-8000-000000000001', 'Flag desligada')$$,
  '42501', null,
  'flag desligada bloqueia moderação'
);
reset role;

update public.team_feature_flags
set enabled = true
where team_id = '07100000-0000-4000-8000-000000000001'
  and feature = 'comments';

select throws_ok(
  $$select public.cleanup_match_conversation_retention(0)$$,
  '22023', null,
  'retenção rejeita lote fora do limite operacional'
);

set local role service_role;
select is(
  public.cleanup_match_conversation_retention(500),
  jsonb_build_object(
    'deletedMatches', 1,
    'deletedComments', 1,
    'deletedReports', 1,
    'deletedEligibility', 1,
    'deletedAuditLogs', 1
  ),
  'retenção elimina toda informação da conversa vencida em uma transação'
);
reset role;

select is(
  (select count(*) from public.match_comments where id = '07500000-0000-4000-8000-000000000002'),
  0::bigint,
  'corpo e autoria vencidos são eliminados'
);
select is(
  (select count(*) from public.match_comment_reports where id = '07700000-0000-4000-8000-000000000002'),
  0::bigint,
  'denúncia vencida é eliminada'
);
select is(
  (select count(*) from private.match_conversation_eligibility where match_id = '07400000-0000-4000-8000-000000000002'),
  0::bigint,
  'snapshot identificável vencido é eliminado'
);
select is(
  (select count(*) from public.audit_logs where entity_id = '07500000-0000-4000-8000-000000000002'),
  0::bigint,
  'evidência de auditoria vencida é eliminada'
);
select is(
  (select count(*) from public.match_comments where id = '07500000-0000-4000-8000-000000000001'),
  1::bigint,
  'lote preserva conversa ainda dentro da retenção'
);

set local role service_role;
select is(
  public.cleanup_match_conversation_retention(500),
  jsonb_build_object(
    'deletedMatches', 0,
    'deletedComments', 0,
    'deletedReports', 0,
    'deletedEligibility', 0,
    'deletedAuditLogs', 0
  ),
  'retenção pode ser repetida com segurança'
);
reset role;

select * from finish();
rollback;
