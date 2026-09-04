begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(21);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000001','authenticated','authenticated','owner-seed-rollout@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fb130000-0000-4000-8000-000000000001','authenticated','authenticated','owner-rollout-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fb130000-0000-4000-8000-000000000002','authenticated','authenticated','owner-rollout-b@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fb130000-0000-4000-8000-000000000003','authenticated','authenticated','owner-rollout-c@example.test','',now(),'{}','{}',now(),now(),'','','','');

select has_function(
  'private', 'ensure_professional_scheduling_defaults', array['uuid', 'uuid'],
  'helper transacional de configuração mínima existe'
);
select ok(not has_function_privilege(
  'authenticated',
  'private.ensure_professional_scheduling_defaults(uuid,uuid)', 'execute'
), 'cliente autenticado não executa o helper de rollout');
select ok(not has_function_privilege(
  'anon', 'public.set_all_product_features(boolean)', 'execute'
), 'anônimo não opera o rollout global');
select ok(has_function_privilege(
  'service_role', 'public.set_all_product_features(boolean)', 'execute'
), 'somente a operação de serviço promove o catálogo');

insert into public.teams(id, name, slug, created_by) values
  ('fb131000-0000-4000-8000-000000000001','Rollout A','rollout-a','fb130000-0000-4000-8000-000000000001'),
  ('fb131000-0000-4000-8000-000000000002','Rollout B','rollout-b','fb130000-0000-4000-8000-000000000002');

select is((select count(*) from public.team_squad_presets
  where team_id in (
    'fb131000-0000-4000-8000-000000000001',
    'fb131000-0000-4000-8000-000000000002'
  )), 0::bigint, 'antes da ativação a expansão permanece inerte');

create temporary table first_activation as
select * from public.set_all_product_features(true);

select is((select count(*) from private.product_feature_keys()), 16::bigint,
  'catálogo global possui dezesseis capacidades');
select is((select count(*) from public.runtime_controls where enabled), 6::bigint,
  'seis controles operacionais ficam ativos');
select is((select count(*) from public.team_squad_presets
  where team_id in (
    'fb131000-0000-4000-8000-000000000001',
    'fb131000-0000-4000-8000-000000000002'
  ) and is_active), 4::bigint, 'padrões neutros completam somente times vazios');
select is((select count(*) from public.team_professional_scheduling_settings
  where team_id in (
    'fb131000-0000-4000-8000-000000000001',
    'fb131000-0000-4000-8000-000000000002'
  )), 2::bigint, 'configuração profissional nasce completa');
select is((select count(*) from public.team_feature_flags
  where team_id in (
    'fb131000-0000-4000-8000-000000000001',
    'fb131000-0000-4000-8000-000000000002'
  ) and feature = 'professional_scheduling' and enabled), 2::bigint,
  'agenda profissional fica ativa nos times existentes');
select is((select count(*) from public.audit_logs
  where team_id in (
    'fb131000-0000-4000-8000-000000000001',
    'fb131000-0000-4000-8000-000000000002'
  ) and action = 'professional.defaults.seeded'
    and metadata ->> 'source' = 'product_rollout'), 2::bigint,
  'configuração automática registra auditoria sem PII');

create temporary table replay as
select * from public.set_all_product_features(true);
select results_eq(
  $$select flags_changed, controls_changed from replay$$,
  $$values (0, 0)$$,
  'reexecução ativa é idempotente'
);
select is((select count(*) from public.team_squad_presets
  where team_id in (
    'fb131000-0000-4000-8000-000000000001',
    'fb131000-0000-4000-8000-000000000002'
  ) and is_active), 4::bigint, 'reexecução não duplica equipes internas');

select lives_ok(
  $$select * from public.set_all_product_features(false)$$,
  'kill switch global executa de forma transacional'
);
select is((select count(*) from public.team_feature_flags
  where team_id in (
    'fb131000-0000-4000-8000-000000000001',
    'fb131000-0000-4000-8000-000000000002'
  ) and enabled), 0::bigint, 'rollback desliga flags sem estado parcial');
select is((select count(*) from public.team_professional_scheduling_settings
  where team_id in (
    'fb131000-0000-4000-8000-000000000001',
    'fb131000-0000-4000-8000-000000000002'
  )), 2::bigint, 'rollback preserva configurações esportivas');

select lives_ok(
  $$select * from public.set_all_product_features(true)$$,
  'restauração devolve o catálogo ao estado ativo'
);

insert into public.teams(id, name, slug, created_by) values (
  'fb131000-0000-4000-8000-000000000003','Rollout C','rollout-c',
  'fb130000-0000-4000-8000-000000000003'
);
select is((select count(*) from public.team_feature_flags
  where team_id = 'fb131000-0000-4000-8000-000000000003' and enabled),
  16::bigint, 'novo time herda todo o catálogo ativo');
select is((select count(*) from public.team_squad_presets
  where team_id = 'fb131000-0000-4000-8000-000000000003' and is_active),
  2::bigint, 'novo time herda duas equipes internas editáveis');
select is((select count(*) from public.team_professional_scheduling_settings
  where team_id = 'fb131000-0000-4000-8000-000000000003'),
  1::bigint, 'novo time herda configuração profissional completa');

set local role authenticated;
select set_config('request.jwt.claim.sub','fb130000-0000-4000-8000-000000000001',true);
select is((select count(*) from public.team_professional_scheduling_settings),
  1::bigint, 'RLS mantém isolamento da configuração entre times');
reset role;

select * from finish();
rollback;
