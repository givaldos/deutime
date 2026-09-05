begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(31);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','14000000-0000-4000-8000-000000000001','authenticated','authenticated','invite-open@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','14000000-0000-4000-8000-000000000002','authenticated','authenticated','invite-old@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','14000000-0000-4000-8000-000000000003','authenticated','authenticated','invite-invalid@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','14000000-0000-4000-8000-000000000004','authenticated','authenticated','invite-revoked@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','14000000-0000-4000-8000-000000000005','authenticated','authenticated','invite-expired@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','14000000-0000-4000-8000-000000000006','authenticated','authenticated','invite-valid@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','14000000-0000-4000-8000-000000000007','authenticated','authenticated','invite-replay@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','14000000-0000-4000-8000-000000000008','authenticated','authenticated','invite-rollback@example.test','',now(),'{}','{}',now(),now(),'','','','');

select has_table('public', 'prelaunch_team_invite_codes',
  'códigos de pré-lançamento possuem tabela própria');
select has_table('public', 'prelaunch_team_invite_redemptions',
  'resgates possuem tabela auditável própria');
select is((select enabled from public.runtime_controls
  where control = 'team_creation_invite_only'), false,
  'controle nasce desligado para expansão inerte');
select ok(not has_table_privilege('authenticated',
  'public.prelaunch_team_invite_codes', 'select'),
  'cliente autenticado não lê hashes de convite');
select ok(not has_table_privilege('authenticated',
  'public.prelaunch_team_invite_redemptions', 'select'),
  'cliente autenticado não lê resgates');
select ok(not has_function_privilege('anon',
  'public.issue_prelaunch_team_invite(text,text,integer,timestamp with time zone)',
  'execute'), 'anônimo não emite convite');
select ok(not has_function_privilege('authenticated',
  'public.issue_prelaunch_team_invite(text,text,integer,timestamp with time zone)',
  'execute'), 'cliente autenticado não emite convite');
select ok(has_function_privilege('service_role',
  'public.issue_prelaunch_team_invite(text,text,integer,timestamp with time zone)',
  'execute'), 'service role pode emitir convite');
select ok(has_function_privilege('authenticated',
  'public.is_team_creation_invite_required()', 'execute'),
  'sessão autenticada pode ler somente a política pública');

set local role authenticated;
select set_config('request.jwt.claim.sub','14000000-0000-4000-8000-000000000001',true);
select is(public.create_team_for_current_user(
  'Time Aberto', 'time-aberto-convite', 'society', null
), 'time-aberto-convite', 'controle desligado preserva criação sem código');
reset role;

select is((select count(*) from public.prelaunch_team_invite_redemptions),
  0::bigint, 'expansão inerte não cria resgate');

create temporary table valid_invite as
select public.issue_prelaunch_team_invite(
  'ABCD-EFGH-JKLM-NPQR', 'Convite válido', 1, now() + interval '14 days'
) as id;
create temporary table revoked_invite as
select public.issue_prelaunch_team_invite(
  'REVO-KED1-CODE-0001', 'Convite revogado', 1, now() + interval '14 days'
) as id;
insert into public.prelaunch_team_invite_codes(
  code_hash, label, max_redemptions, created_at, expires_at
) values (
  private.hash_prelaunch_invite_code('EXPI-RED1-CODE-0001'),
  'Convite vencido', 1, now() - interval '2 days', now() - interval '1 day'
);

select lives_ok(
  $$select public.set_runtime_control('team_creation_invite_only', true)$$,
  'ativação explícita usa o controle operacional existente');

set local role authenticated;
select set_config('request.jwt.claim.sub','14000000-0000-4000-8000-000000000002',true);
select is(public.is_team_creation_invite_required(), true,
  'formulário autenticado observa a política ativa');
select throws_ok(
  $$select public.create_team_for_current_user(
    'Cliente Antigo', 'cliente-antigo-convite', 'society'
  )$$, 'P0001', 'Invitation unavailable',
  'assinatura antiga falha fechado depois da ativação');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','14000000-0000-4000-8000-000000000003',true);
select throws_ok(
  $$select public.create_team_for_current_user(
    'Código Inválido', 'codigo-invalido-convite', 'society', 'CODIGO-INVALIDO'
  )$$, 'P0001', 'Invitation unavailable',
  'formato inválido recebe a resposta pública não enumerável');
reset role;

select ok(public.revoke_prelaunch_team_invite((select id from revoked_invite)),
  'operação de serviço revoga convite disponível');

set local role authenticated;
select set_config('request.jwt.claim.sub','14000000-0000-4000-8000-000000000004',true);
select throws_ok(
  $$select public.create_team_for_current_user(
    'Código Revogado', 'codigo-revogado-convite', 'society',
    'REVO-KED1-CODE-0001'
  )$$, 'P0001', 'Invitation unavailable',
  'convite revogado recebe a mesma resposta pública');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','14000000-0000-4000-8000-000000000005',true);
select throws_ok(
  $$select public.create_team_for_current_user(
    'Código Vencido', 'codigo-vencido-convite', 'society',
    'EXPI-RED1-CODE-0001'
  )$$, 'P0001', 'Invitation unavailable',
  'convite vencido recebe a mesma resposta pública');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','14000000-0000-4000-8000-000000000006',true);
select is(public.create_team_for_current_user(
  'Time Convidado', 'time-convidado-valido', 'society',
  'abcd-efgh-jklm-npqr'
), 'time-convidado-valido', 'convite é normalizado e cria o time');
reset role;

select is((select count(*) from public.prelaunch_team_invite_redemptions
  where invite_id = (select id from valid_invite)), 1::bigint,
  'criação válida registra exatamente um resgate');
select is((select redemption_count from public.prelaunch_team_invite_codes
  where id = (select id from valid_invite)), 1,
  'consumo incrementa o contador sob lock');
select ok(not exists(
  select 1 from public.audit_logs audit
  where audit.action in ('prelaunch_invite.issued', 'prelaunch_invite.redeemed')
    and audit.metadata::text ilike '%ABCD-EFGH-JKLM-NPQR%'
), 'auditoria não contém o código em texto puro');

set local role authenticated;
select set_config('request.jwt.claim.sub','14000000-0000-4000-8000-000000000007',true);
select throws_ok(
  $$select public.create_team_for_current_user(
    'Replay Convite', 'replay-convite-valido', 'society',
    'ABCD-EFGH-JKLM-NPQR'
  )$$, 'P0001', 'Invitation unavailable',
  'convite esgotado não pode ser reutilizado');
reset role;

select is((select count(*) from public.teams
  where slug = 'replay-convite-valido'), 0::bigint,
  'falha de resgate não cria tenant parcial');
select is((select invite_only from public.get_prelaunch_team_invite_status()),
  true, 'sonda operacional confirma a política ativa');
select ok(has_function_privilege('service_role',
  'public.get_prelaunch_team_invite_status()', 'execute'),
  'sonda agregada é exclusiva da operação');
select ok(has_function_privilege('service_role',
  'public.revoke_prelaunch_team_invite(uuid)', 'execute'),
  'revogação é exclusiva da operação');

select lives_ok(
  $$select public.set_runtime_control('team_creation_invite_only', false)$$,
  'rollback operacional desliga a exigência sem contração');

set local role authenticated;
select set_config('request.jwt.claim.sub','14000000-0000-4000-8000-000000000008',true);
select is(public.create_team_for_current_user(
  'Time Após Rollback', 'time-apos-rollback', 'society'
), 'time-apos-rollback', 'rollback restaura a criação compatível sem código');
reset role;

select is((select count(*) from public.prelaunch_team_invite_redemptions
  where invite_id = (select id from valid_invite)), 1::bigint,
  'rollback preserva o histórico de resgates');
select is((select count(*) from public.prelaunch_team_invite_codes
  where code_hash = private.hash_prelaunch_invite_code(
    'ABCD-EFGH-JKLM-NPQR'
  )), 1::bigint, 'somente o hash do convite permanece armazenado');

select * from finish();
rollback;
