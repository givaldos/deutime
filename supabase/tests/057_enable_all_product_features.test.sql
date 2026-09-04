begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(24);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000001','authenticated','authenticated','owner-seed-product@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f2500000-0000-4000-8000-000000000001','authenticated','authenticated','owner-product-1@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f2500000-0000-4000-8000-000000000002','authenticated','authenticated','owner-product-2@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f2500000-0000-4000-8000-000000000003','authenticated','authenticated','owner-product-3@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f2500000-0000-4000-8000-000000000004','authenticated','authenticated','owner-product-4@example.test','',now(),'{}','{}',now(),now(),'','','','');

select has_function(
  'public', 'set_all_product_features', array['boolean'],
  'RPC transacional de lançamento existe'
);
select ok(has_function_privilege(
  'service_role', 'public.set_all_product_features(boolean)', 'execute'
), 'service role pode operar o lançamento');
select ok(not has_function_privilege(
  'authenticated', 'public.set_all_product_features(boolean)', 'execute'
), 'usuário autenticado não opera o lançamento global');
select ok(not has_function_privilege(
  'anon', 'public.set_all_product_features(boolean)', 'execute'
), 'anônimo não opera o lançamento global');
select is((select count(*) from private.product_feature_keys()), 16::bigint,
  'catálogo contém as dezesseis capacidades validadas');
select is((select enabled from private.product_rollout_state where singleton), false,
  'ambientes novos permanecem fail-closed até o rollout explícito');

insert into public.teams (id, name, slug, created_by) values
  ('f2510000-0000-4000-8000-000000000001','Produto Um','produto-um','f2500000-0000-4000-8000-000000000001'),
  ('f2510000-0000-4000-8000-000000000002','Produto Dois','produto-dois','f2500000-0000-4000-8000-000000000002');

select is((select count(*) from public.team_feature_flags
  where team_id in (
    'f2510000-0000-4000-8000-000000000001',
    'f2510000-0000-4000-8000-000000000002'
  )), 0::bigint, 'times novos continuam fechados antes do rollout');

create temporary table activation_result as
select * from public.set_all_product_features(true);

select is((select teams_seen from activation_result), 5,
  'lançamento observa todos os times');
select is((select flags_changed from activation_result), 80,
  'lançamento ativa todas as flags inertes');
select is((select controls_changed from activation_result), 6,
  'lançamento ativa todos os controles globais');
select ok(not exists (
  select 1 from public.team_feature_flags where not enabled
), 'todas as flags ficam ativas');
select is((select count(*) from public.runtime_controls where enabled),6::bigint,
  'os seis controles globais validados ficam ativos');
select is((select enabled from public.runtime_controls where control='account_autonomy'),true,
  'autonomia da conta integra o rollout global');
select is((select enabled from public.runtime_controls where control='registration_email_alerts'),true,
  'produção do aviso de cadastro integra o rollout global');
select is((select enabled from public.runtime_controls where control='registration_email_delivery'),true,
  'consumo do aviso de cadastro integra o rollout global');
select is((select enabled from private.product_rollout_state where singleton), true,
  'estado do produto acompanha a ativação');
select is((select count(*) from public.audit_logs
  where action = 'feature_flag.changed'
    and metadata ->> 'source' = 'product_rollout'
), 80::bigint, 'ativação global é auditada sem atribuir ator humano');

set local role authenticated;
select set_config('request.jwt.claim.sub','f2500000-0000-4000-8000-000000000001',true);
select is((select count(*) from public.team_feature_flags), 16::bigint,
  'RLS limita o owner às flags do próprio time');
reset role;

create temporary table replay_result as
select * from public.set_all_product_features(true);
select results_eq(
  $$select flags_changed, controls_changed from replay_result$$,
  $$values (0, 0)$$,
  'reexecução é idempotente'
);

select throws_ok(
  $$select public.set_all_product_features(null)$$,
  '22023', null,
  'estado ausente falha fechado'
);

insert into public.teams (id, name, slug, created_by) values (
  'f2510000-0000-4000-8000-000000000003',
  'Produto Aberto',
  'produto-aberto',
  'f2500000-0000-4000-8000-000000000003'
);
select is((select count(*) from public.team_feature_flags
  where team_id = 'f2510000-0000-4000-8000-000000000003'
    and enabled
), 16::bigint, 'times criados após o rollout recebem o catálogo ativo');

create temporary table rollback_result as
select * from public.set_all_product_features(false);
select results_eq(
  $$select flags_changed, controls_changed from rollback_result$$,
  $$values (96, 6)$$,
  'rollback desativa flags e controles no mesmo comando'
);
select ok(not exists (
  select 1 from public.team_feature_flags where enabled
), 'rollback fecha todas as flags existentes');

insert into public.teams (id, name, slug, created_by) values (
  'f2510000-0000-4000-8000-000000000004',
  'Produto Fechado',
  'produto-fechado',
  'f2500000-0000-4000-8000-000000000004'
);
select is((select count(*) from public.team_feature_flags
  where team_id = 'f2510000-0000-4000-8000-000000000004'
), 0::bigint, 'rollback mantém novos times fechados');

select * from finish();
rollback;
