begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(52);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '06000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'comments-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '06000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'comments-confirmed@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '06000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'comments-maybe@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '06000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'comments-pending@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '06000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'comments-outsider@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');

insert into public.player_profiles (
  user_id, handle, display_name, preferred_name, phone_verified_at
)
values
  ('06000000-0000-4000-8000-000000000002', 'comments-confirmed', 'Jogador Confirmado', 'Confirmado', now()),
  ('06000000-0000-4000-8000-000000000003', 'comments-maybe', 'Jogador Talvez', 'Talvez', now()),
  ('06000000-0000-4000-8000-000000000004', 'comments-pending', 'Jogador Pendente', 'Pendente', now()),
  ('06000000-0000-4000-8000-000000000005', 'comments-outsider', 'Jogador de Fora', 'De Fora', now());

insert into public.teams (id, name, slug, created_by)
values
  ('06100000-0000-4000-8000-000000000001', 'Conversa A', 'conversa-a', '06000000-0000-4000-8000-000000000001'),
  ('06100000-0000-4000-8000-000000000002', 'Conversa B', 'conversa-b', '06000000-0000-4000-8000-000000000005');

insert into public.athletes (
  id, team_id, user_id, full_name, preferred_name, status, registration_source
)
values
  ('06200000-0000-4000-8000-000000000001', '06100000-0000-4000-8000-000000000001', '06000000-0000-4000-8000-000000000002', 'Jogador Confirmado', 'Confirmado', 'active', 'public_form'),
  ('06200000-0000-4000-8000-000000000002', '06100000-0000-4000-8000-000000000001', '06000000-0000-4000-8000-000000000003', 'Jogador Talvez', 'Talvez', 'active', 'public_form'),
  ('06200000-0000-4000-8000-000000000003', '06100000-0000-4000-8000-000000000001', '06000000-0000-4000-8000-000000000004', 'Jogador Pendente', 'Pendente', 'active', 'public_form'),
  ('06200000-0000-4000-8000-000000000004', '06100000-0000-4000-8000-000000000002', '06000000-0000-4000-8000-000000000005', 'Jogador de Fora', 'De Fora', 'active', 'public_form');

insert into public.events (
  id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, created_by
)
values
  ('06300000-0000-4000-8000-000000000001', '06100000-0000-4000-8000-000000000001', 'Partida da conversa', 'weekly_match', 'split_teams', 'society', now() - interval '2 hours', now() - interval '30 minutes', now() - interval '3 hours', 'scheduled', '06000000-0000-4000-8000-000000000001'),
  ('06300000-0000-4000-8000-000000000002', '06100000-0000-4000-8000-000000000002', 'Outra partida', 'weekly_match', 'split_teams', 'society', now() - interval '2 hours', now() - interval '30 minutes', now() - interval '3 hours', 'scheduled', '06000000-0000-4000-8000-000000000005');

insert into public.event_attendance (event_id, team_id, athlete_id, status)
values
  ('06300000-0000-4000-8000-000000000001', '06100000-0000-4000-8000-000000000001', '06200000-0000-4000-8000-000000000001', 'confirmed'),
  ('06300000-0000-4000-8000-000000000001', '06100000-0000-4000-8000-000000000001', '06200000-0000-4000-8000-000000000002', 'maybe'),
  ('06300000-0000-4000-8000-000000000001', '06100000-0000-4000-8000-000000000001', '06200000-0000-4000-8000-000000000003', 'pending'),
  ('06300000-0000-4000-8000-000000000002', '06100000-0000-4000-8000-000000000002', '06200000-0000-4000-8000-000000000004', 'confirmed');

insert into public.team_feature_flags (team_id, feature, enabled, updated_by)
values
  ('06100000-0000-4000-8000-000000000001', 'comments', true, '06000000-0000-4000-8000-000000000001'),
  ('06100000-0000-4000-8000-000000000002', 'comments', true, '06000000-0000-4000-8000-000000000005');

insert into public.event_matches (
  id, event_id, team_id, ordinal, status, public_mode, created_by
)
values
  ('06400000-0000-4000-8000-000000000001', '06300000-0000-4000-8000-000000000001', '06100000-0000-4000-8000-000000000001', 1, 'scheduled', 'private', '06000000-0000-4000-8000-000000000001'),
  ('06400000-0000-4000-8000-000000000002', '06300000-0000-4000-8000-000000000002', '06100000-0000-4000-8000-000000000002', 1, 'scheduled', 'private', '06000000-0000-4000-8000-000000000005');

set local role authenticated;
select set_config('request.jwt.claim.sub', '06000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.finalize_event_match('06400000-0000-4000-8000-000000000001')$$,
  'staff finaliza partida e congela audiência da conversa'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '06000000-0000-4000-8000-000000000005', true);
select lives_ok(
  $$select public.finalize_event_match('06400000-0000-4000-8000-000000000002')$$,
  'outro time finaliza sua própria partida'
);
reset role;

select ok(
  (select relrowsecurity from pg_class where oid = 'public.match_comments'::regclass),
  'comentários usam RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.match_comment_reports'::regclass),
  'denúncias usam RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.match_conversation_eligibility'::regclass),
  'snapshot privado usa RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.match_comments', 'SELECT'),
  'authenticated não lê comentários diretamente'
);
select ok(
  not has_table_privilege('authenticated', 'public.match_comments', 'INSERT'),
  'authenticated não insere comentários diretamente'
);
select ok(
  not has_table_privilege('authenticated', 'public.match_comment_reports', 'SELECT'),
  'authenticated não lê denúncias diretamente'
);
select ok(
  not has_table_privilege('authenticated', 'private.match_conversation_eligibility', 'SELECT'),
  'authenticated não lê identidade do snapshot'
);
select ok(
  not has_function_privilege('anon', 'public.get_match_conversation(uuid)', 'EXECUTE'),
  'anon não consulta conversa'
);
select ok(
  has_function_privilege('authenticated', 'public.get_match_conversation(uuid)', 'EXECUTE'),
  'authenticated acessa apenas a projeção segura'
);
select ok(
  not has_function_privilege('anon', 'public.get_match_conversation_state(uuid)', 'EXECUTE'),
  'anon não consulta estado da conversa'
);
select ok(
  has_function_privilege('authenticated', 'public.get_match_conversation_state(uuid)', 'EXECUTE'),
  'authenticated consulta somente estado mínimo'
);
select ok(
  not has_function_privilege('anon', 'public.create_match_comment(uuid,text,uuid,uuid)', 'EXECUTE'),
  'anon não cria comentário'
);
select ok(
  has_function_privilege('authenticated', 'public.create_match_comment(uuid,text,uuid,uuid)', 'EXECUTE'),
  'authenticated usa RPC de escrita'
);
select ok(
  not has_function_privilege('anon', 'public.report_match_comment(uuid,text)', 'EXECUTE'),
  'anon não denuncia comentário'
);
select is(
  (select count(*) from private.match_conversation_eligibility where match_id = '06400000-0000-4000-8000-000000000001'),
  2::bigint,
  'snapshot inclui somente SIM e TALVEZ ativos'
);
select is(
  (select count(*) from private.match_conversation_eligibility where match_id = '06400000-0000-4000-8000-000000000001' and athlete_id = '06200000-0000-4000-8000-000000000003'),
  0::bigint,
  'PENDENTE não entra no snapshot'
);
select ok(
  position(
    'user_id' in pg_get_function_result(
      'public.get_match_conversation(uuid)'::regprocedure
    )
  ) = 0,
  'projeção comum não expõe user_id'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '06000000-0000-4000-8000-000000000002', true);
select is(
  (select count(*) from public.get_match_conversation('06400000-0000-4000-8000-000000000001')),
  0::bigint,
  'SIM acessa a conversa inicialmente vazia'
);
select is(
  (select accessible from public.get_match_conversation_state('06400000-0000-4000-8000-000000000001')),
  true,
  'estado mínimo confirma acesso do SIM'
);
select is(
  (select writable from public.get_match_conversation_state('06400000-0000-4000-8000-000000000001')),
  true,
  'estado mínimo abre escrita dentro da janela'
);
select ok(
  (select closes_at is not null from public.get_match_conversation_state('06400000-0000-4000-8000-000000000001')),
  'estado mínimo informa fechamento para pessoa autorizada'
);
select lives_ok(
  $$select set_config(
    'test.root_comment_id',
    public.create_match_comment('06400000-0000-4000-8000-000000000001', 'Grande jogo, pessoal!', '06600000-0000-4000-8000-000000000001')::text,
    true
  )$$,
  'SIM cria comentário identificado'
);
select lives_ok(
  $$select public.create_match_comment('06400000-0000-4000-8000-000000000001', 'payload repetido ignorado', '06600000-0000-4000-8000-000000000001')$$,
  'replay com a mesma chave é idempotente'
);
select is(
  (select count(*) from public.get_match_conversation('06400000-0000-4000-8000-000000000001')),
  1::bigint,
  'replay não duplica comentário'
);
select is(
  (select author_display_name from public.get_match_conversation('06400000-0000-4000-8000-000000000001')),
  'Confirmado'::text,
  'autoria usa nome verificado do vínculo atual'
);
select throws_ok(
  $$select public.create_match_comment('06400000-0000-4000-8000-000000000001', 'Veja https://example.test', '06600000-0000-4000-8000-000000000002')$$,
  '22023', null,
  'links são recusados no servidor'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '06000000-0000-4000-8000-000000000003', true);
select lives_ok(
  $$select set_config(
    'test.reply_comment_id',
    public.create_match_comment(
      '06400000-0000-4000-8000-000000000001',
      'Também gostei!',
      '06600000-0000-4000-8000-000000000003',
      current_setting('test.root_comment_id')::uuid
    )::text,
    true
  )$$,
  'TALVEZ responde ao comentário raiz'
);
select throws_ok(
  $$select public.create_match_comment(
    '06400000-0000-4000-8000-000000000001',
    'Resposta de segundo nível',
    '06600000-0000-4000-8000-000000000004',
    current_setting('test.reply_comment_id')::uuid
  )$$,
  '22023', null,
  'resposta de segundo nível é recusada'
);
select lives_ok(
  $$select public.report_match_comment(
    current_setting('test.root_comment_id')::uuid,
    'Conteúdo inadequado'
  )$$,
  'participante denuncia comentário de outra pessoa'
);
select lives_ok(
  $$select public.report_match_comment(
    current_setting('test.root_comment_id')::uuid,
    'tentativa duplicada'
  )$$,
  'segunda denúncia da mesma pessoa é idempotente'
);
reset role;

select is(
  (select count(*) from public.match_comment_reports),
  1::bigint,
  'uma pessoa gera somente uma denúncia por comentário'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '06000000-0000-4000-8000-000000000004', true);
select is(
  (select count(*) from public.get_match_conversation('06400000-0000-4000-8000-000000000001')),
  0::bigint,
  'PENDENTE não lê a conversa'
);
select is(
  (select accessible from public.get_match_conversation_state('06400000-0000-4000-8000-000000000001')),
  false,
  'estado mínimo não autoriza PENDENTE'
);
select throws_ok(
  $$select public.create_match_comment('06400000-0000-4000-8000-000000000001', 'Não deveria entrar', '06600000-0000-4000-8000-000000000005')$$,
  '42501', null,
  'PENDENTE não escreve na conversa'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '06000000-0000-4000-8000-000000000005', true);
select lives_ok(
  $$do $rate_limit$
  declare
    item integer;
  begin
    for item in 1..5 loop
      perform public.create_match_comment(
        '06400000-0000-4000-8000-000000000002',
        'Mensagem controlada ' || item,
        ('06700000-0000-4000-8000-' || lpad(item::text, 12, '0'))::uuid
      );
    end loop;
  end
  $rate_limit$;$$,
  'staff cria até cinco comentários por minuto'
);
select throws_ok(
  $$select public.create_match_comment(
    '06400000-0000-4000-8000-000000000002',
    'Sexta mensagem no mesmo minuto',
    '06700000-0000-4000-8000-000000000006'
  )$$,
  '54000', null,
  'sexta escrita por minuto é bloqueada'
);
select is(
  (select count(*) from public.get_match_conversation('06400000-0000-4000-8000-000000000002')),
  5::bigint,
  'bloqueio antiabuso não persiste a sexta escrita'
);
select is(
  (select count(*) from public.get_match_conversation('06400000-0000-4000-8000-000000000001')),
  0::bigint,
  'outro time não lê conversa cross-tenant'
);
select throws_ok(
  $$select public.create_match_comment('06400000-0000-4000-8000-000000000001', 'Cross tenant', '06600000-0000-4000-8000-000000000006')$$,
  '42501', null,
  'outro time não escreve cross-tenant'
);
reset role;

update public.athletes
set removed_at = now(), removed_by = '06000000-0000-4000-8000-000000000001'
where id = '06200000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '06000000-0000-4000-8000-000000000003', true);
select is(
  (select count(*) from public.get_match_conversation('06400000-0000-4000-8000-000000000001')),
  0::bigint,
  'remoção atual revoga imediatamente a leitura do elegível congelado'
);
reset role;

update public.athletes
set removed_at = null, removed_by = null
where id = '06200000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '06000000-0000-4000-8000-000000000002', true);
select is(
  public.delete_my_match_comment(
    current_setting('test.root_comment_id')::uuid
  ),
  true,
  'autor remove o próprio comentário'
);
select is(
  (select body from public.get_match_conversation('06400000-0000-4000-8000-000000000001') where parent_comment_id is null),
  null::text,
  'texto removido não volta na projeção comum'
);
select is(
  (select count(*) from public.get_match_conversation('06400000-0000-4000-8000-000000000001')),
  2::bigint,
  'resposta permanece após remoção da raiz'
);
reset role;

update public.event_matches
set finalized_at = now() - interval '8 days'
where id = '06400000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '06000000-0000-4000-8000-000000000002', true);
select is(
  (select count(*) from public.get_match_conversation('06400000-0000-4000-8000-000000000001')),
  2::bigint,
  'leitura continua depois da janela de sete dias'
);
select is(
  (select writable from public.get_match_conversation_state('06400000-0000-4000-8000-000000000001')),
  false,
  'estado mínimo fecha escrita depois de sete dias'
);
select throws_ok(
  $$select public.create_match_comment('06400000-0000-4000-8000-000000000001', 'Fora da janela', '06600000-0000-4000-8000-000000000007')$$,
  '55000', null,
  'escrita encerra após sete dias'
);
reset role;

update public.team_feature_flags
set enabled = false
where team_id = '06100000-0000-4000-8000-000000000001'
  and feature = 'comments';

set local role authenticated;
select set_config('request.jwt.claim.sub', '06000000-0000-4000-8000-000000000001', true);
select is(
  (select count(*) from public.get_match_conversation('06400000-0000-4000-8000-000000000001')),
  0::bigint,
  'kill switch remove a conversa da projeção'
);
select is(
  (select accessible from public.get_match_conversation_state('06400000-0000-4000-8000-000000000001')),
  false,
  'kill switch também revoga o estado mínimo'
);
select throws_ok(
  $$select public.create_match_comment('06400000-0000-4000-8000-000000000001', 'Flag desligada', '06600000-0000-4000-8000-000000000008')$$,
  '42501', null,
  'kill switch bloqueia nova escrita'
);
reset role;

select is(
  (select count(*) from public.match_comments where match_id = '06400000-0000-4000-8000-000000000001'),
  2::bigint,
  'kill switch preserva o histórico para recuperação'
);

select * from finish();
rollback;
