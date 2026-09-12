begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(26);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000001','authenticated','authenticated','seed-owner-nav@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fc160000-0000-4000-8000-000000000001','authenticated','authenticated','owner-nav-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fc160000-0000-4000-8000-000000000002','authenticated','authenticated','manager-nav-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fc160000-0000-4000-8000-000000000003','authenticated','authenticated','owner-nav-b@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fc160000-0000-4000-8000-000000000004','authenticated','authenticated','owner-nav-c@example.test','',now(),'{}','{}',now(),now(),'','','','');

select has_function(
  'public', 'set_team_navigation_shell_rollout', array['boolean', 'uuid'],
  'kill switch específico da navegação existe'
);
select ok(has_function_privilege(
  'service_role', 'public.set_team_navigation_shell_rollout(boolean,uuid)', 'execute'
), 'service role opera o rollout da navegação');
select ok(not has_function_privilege(
  'authenticated', 'public.set_team_navigation_shell_rollout(boolean,uuid)', 'execute'
), 'usuário autenticado não opera o rollout global');
select ok(not has_function_privilege(
  'anon', 'public.set_team_navigation_shell_rollout(boolean,uuid)', 'execute'
), 'anônimo não opera o rollout global');
select ok(
  'team_navigation_shell' = any(array(
    select feature::text from private.product_feature_keys() feature
  )),
  'navegação integra a herança do produto'
);
select is((select count(*) from private.product_feature_keys()), 18::bigint,
  'catálogo possui dezoito capacidades');

insert into public.teams(id, name, slug, created_by) values
  ('fc161000-0000-4000-8000-000000000001','Navegação A','navegacao-a','fc160000-0000-4000-8000-000000000001'),
  ('fc161000-0000-4000-8000-000000000002','Navegação B','navegacao-b','fc160000-0000-4000-8000-000000000003');
insert into public.team_memberships(team_id, user_id, role, status, invited_by)
values (
  'fc161000-0000-4000-8000-000000000001',
  'fc160000-0000-4000-8000-000000000002',
  'manager', 'active', 'fc160000-0000-4000-8000-000000000001'
);

create temporary table expected_navigation_teams as
select count(*)::integer as value from public.teams;

create temporary table navigation_pilot as
select * from public.set_team_navigation_shell_rollout(
  true, 'fc161000-0000-4000-8000-000000000001'
);
select is((select teams_seen from navigation_pilot), 1,
  'piloto observa somente o time escolhido');
select is((select flags_changed from navigation_pilot), 1,
  'piloto ativa somente o time escolhido');
select is((
  select enabled from public.team_feature_flags
  where team_id = 'fc161000-0000-4000-8000-000000000001'
    and feature = 'team_navigation_shell'
), true, 'navegação fica ativa no piloto');
select ok(not exists (
  select 1 from public.team_feature_flags
  where team_id = 'fc161000-0000-4000-8000-000000000002'
    and feature = 'team_navigation_shell'
), 'piloto não antecipa a ativação dos demais times');

create temporary table navigation_activation as
select * from public.set_team_navigation_shell_rollout(true, null);

select is(
  (select teams_seen from navigation_activation),
  (select value from expected_navigation_teams),
  'ativação observa todos os times'
);
select is(
  (select flags_changed from navigation_activation),
  (select value - 1 from expected_navigation_teams),
  'ativação global completa os times fora do piloto'
);
select is(
  (select count(*)::integer from public.team_feature_flags
   where feature = 'team_navigation_shell' and enabled),
  (select value from expected_navigation_teams),
  'navegação fica ativa para todos os times existentes'
);

create temporary table navigation_replay as
select * from public.set_team_navigation_shell_rollout(true, null);
select is((select flags_changed from navigation_replay), 0,
  'reexecução é idempotente');
select throws_ok(
  $$select * from public.set_team_navigation_shell_rollout(null, null)$$,
  '22023', null, 'estado ausente falha fechado'
);
select throws_ok(
  $$select * from public.set_team_navigation_shell_rollout(
    true, 'fc16ffff-0000-4000-8000-000000000000'
  )$$,
  'P0002', null, 'piloto inexistente falha sem alterar outro time'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','fc160000-0000-4000-8000-000000000002',true);
select throws_ok(
  $$select * from public.set_team_navigation_shell_rollout(false, null)$$,
  '42501', null, 'manager não executa o rollout'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fc160000-0000-4000-8000-000000000001',true);
select is(
  public.is_team_feature_enabled(
    'fc161000-0000-4000-8000-000000000001', 'team_navigation_shell'
  ), true, 'owner lê a navegação ativa do próprio time'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fc160000-0000-4000-8000-000000000003',true);
select is(
  public.is_team_feature_enabled(
    'fc161000-0000-4000-8000-000000000001', 'team_navigation_shell'
  ), false, 'owner de outro time não observa a capacidade'
);
select is((
  select count(*) from public.team_feature_flags
  where team_id = 'fc161000-0000-4000-8000-000000000001'
    and feature = 'team_navigation_shell'
), 0::bigint, 'RLS não expõe a flag de outro time');
reset role;

create temporary table navigation_rollback as
select * from public.set_team_navigation_shell_rollout(false, null);
select is(
  (select flags_changed from navigation_rollback),
  (select value from expected_navigation_teams),
  'kill switch desliga todos os times sem estado parcial'
);
select ok(not exists (
  select 1 from public.team_feature_flags
  where feature = 'team_navigation_shell' and enabled
), 'rollback restaura o fallback anterior');

create temporary table navigation_restore as
select * from public.set_team_navigation_shell_rollout(true, null);
select is(
  (select flags_changed from navigation_restore),
  (select value from expected_navigation_teams),
  'restauração devolve a navegação validada'
);
select is(
  (select count(*)::integer from public.audit_logs
   where action = 'feature_flag.changed'
     and entity_id = 'team_navigation_shell'
     and metadata ->> 'source' = 'navigation_rollout'),
  (select value * 3 from expected_navigation_teams),
  'ativação, rollback e restauração ficam auditados'
);

update private.product_rollout_state set enabled = true where singleton;
insert into public.teams(id, name, slug, created_by) values (
  'fc161000-0000-4000-8000-000000000003',
  'Navegação C', 'navegacao-c', 'fc160000-0000-4000-8000-000000000004'
);
select is((
  select enabled from public.team_feature_flags
  where team_id = 'fc161000-0000-4000-8000-000000000003'
    and feature = 'team_navigation_shell'
), true, 'novo time herda a navegação ativa');
select is((
  select count(*) from public.team_feature_flags
  where team_id = 'fc161000-0000-4000-8000-000000000003' and enabled
), 18::bigint, 'novo time herda o catálogo completo');

select * from finish();
rollback;
