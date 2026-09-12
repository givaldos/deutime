begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(30);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000001','authenticated','authenticated','seed-owner-lists-rollout@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fe160000-0000-4000-8000-000000000001','authenticated','authenticated','owner-lists-rollout-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fe160000-0000-4000-8000-000000000002','authenticated','authenticated','manager-lists-rollout-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fe160000-0000-4000-8000-000000000003','authenticated','authenticated','owner-lists-rollout-b@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fe160000-0000-4000-8000-000000000004','authenticated','authenticated','owner-lists-rollout-c@example.test','',now(),'{}','{}',now(),now(),'','','','');

select has_function('public','set_complete_management_lists_rollout',array['boolean','uuid'],
  'kill switch específico das listas existe');
select ok(has_function_privilege('service_role',
  'public.set_complete_management_lists_rollout(boolean,uuid)','execute'),
  'service role opera o rollout');
select ok(not has_function_privilege('authenticated',
  'public.set_complete_management_lists_rollout(boolean,uuid)','execute'),
  'authenticated não opera o rollout');
select ok(not has_function_privilege('anon',
  'public.set_complete_management_lists_rollout(boolean,uuid)','execute'),
  'anônimo não opera o rollout');
select has_function('public','get_complete_management_lists_health',array['uuid'],
  'sonda agregada existe');
select ok(has_function_privilege('service_role',
  'public.get_complete_management_lists_health(uuid)','execute'),
  'service role consulta a sonda');
select ok(not has_function_privilege('authenticated',
  'public.get_complete_management_lists_health(uuid)','execute'),
  'authenticated não consulta a sonda');
select ok(not has_function_privilege('anon',
  'public.get_complete_management_lists_health(uuid)','execute'),
  'anônimo não consulta a sonda');
select ok('complete_management_lists' = any(array(
  select feature::text from private.product_feature_keys() feature
)), 'listas integram a herança do produto');
select is((select count(*) from private.product_feature_keys()),18::bigint,
  'catálogo possui dezoito capacidades');

update private.product_rollout_state set enabled = false where singleton;
insert into public.teams(id,name,slug,created_by) values
  ('fe161000-0000-4000-8000-000000000001','Listas Rollout A','listas-rollout-a','fe160000-0000-4000-8000-000000000001'),
  ('fe161000-0000-4000-8000-000000000002','Listas Rollout B','listas-rollout-b','fe160000-0000-4000-8000-000000000003');
insert into public.team_memberships(team_id,user_id,role,status,invited_by) values (
  'fe161000-0000-4000-8000-000000000001','fe160000-0000-4000-8000-000000000002',
  'manager','active','fe160000-0000-4000-8000-000000000001'
);
insert into public.events(team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,status,created_by)
values ('fe161000-0000-4000-8000-000000000001','Evento preservado','friendly','single_squad','society',now()+interval '1 day',now()+interval '1 day 1 hour','scheduled','fe160000-0000-4000-8000-000000000001');
insert into public.championships(team_id,name,format,status,created_by,updated_by)
values ('fe161000-0000-4000-8000-000000000001','Campeonato preservado','league','draft','fe160000-0000-4000-8000-000000000001','fe160000-0000-4000-8000-000000000001');

create temporary table expected_list_teams as select count(*)::integer value from public.teams;
create temporary table list_pilot as select * from public.set_complete_management_lists_rollout(
  true,'fe161000-0000-4000-8000-000000000001'
);
select is((select teams_seen from list_pilot),1,'piloto observa só o time escolhido');
select is((select flags_changed from list_pilot),1,'piloto altera uma flag');
select is((select complete_management_lists_enabled from public.get_complete_management_lists_health(
  'fe161000-0000-4000-8000-000000000001')),true,'sonda confirma o piloto ativo');
select results_eq(
  $$select total_events,upcoming_events,total_championships from public.get_complete_management_lists_health('fe161000-0000-4000-8000-000000000001')$$,
  $$values (1::bigint,1::bigint,1::bigint)$$,
  'sonda agrega agenda e campeonatos sem conteúdo'
);
select is((select count(*) from public.get_complete_management_lists_health(
  'fe161000-0000-4000-8000-000000000099')),0::bigint,
  'time ausente não produz linha');
select is((select count(*) from unnest((select proargnames from pg_proc where oid=
  'public.get_complete_management_lists_health(uuid)'::regprocedure)) field
  where field ~ '(name|title|search|query|email|phone|actor|user)'),0::bigint,
  'sonda não expõe conteúdo ou PII');
select ok(not exists(select 1 from public.team_feature_flags where
  team_id='fe161000-0000-4000-8000-000000000002' and feature='complete_management_lists'),
  'piloto não ativa outro time');

create temporary table list_activation as
select * from public.set_complete_management_lists_rollout(true,null);
select is((select teams_seen from list_activation),(select value from expected_list_teams),
  'ativação observa todos os times');
select is((select count(*)::integer from public.team_feature_flags
  where feature='complete_management_lists' and enabled),(select value from expected_list_teams),
  'ativação habilita todos os times');
create temporary table list_replay as
select * from public.set_complete_management_lists_rollout(true,null);
select is((select flags_changed from list_replay),0,'reexecução é idempotente');
select throws_ok($$select * from public.set_complete_management_lists_rollout(null,null)$$,
  '22023',null,'estado ausente falha fechado');
select throws_ok($$select * from public.set_complete_management_lists_rollout(true,'fe16ffff-0000-4000-8000-000000000000')$$,
  'P0002',null,'time inexistente falha fechado');

set local role authenticated;
select set_config('request.jwt.claim.sub','fe160000-0000-4000-8000-000000000002',true);
select throws_ok($$select * from public.set_complete_management_lists_rollout(false,null)$$,
  '42501',null,'manager não executa rollout');
reset role;

create temporary table list_rollback as
select * from public.set_complete_management_lists_rollout(false,null);
select is((select flags_changed from list_rollback),(select value from expected_list_teams),
  'rollback desliga todos os times');
select results_eq(
  $$select complete_management_lists_enabled,total_events,total_championships from public.get_complete_management_lists_health('fe161000-0000-4000-8000-000000000001')$$,
  $$values (false,1::bigint,1::bigint)$$,
  'rollback preserva agenda e campeonatos'
);
create temporary table list_restore as
select * from public.set_complete_management_lists_rollout(true,null);
select is((select flags_changed from list_restore),(select value from expected_list_teams),
  'restauração reativa todos os times');
select is((select count(*)::integer from public.audit_logs where
  action='feature_flag.changed' and entity_id='complete_management_lists'
  and metadata->>'source'='management_lists_rollout'),
  (select value*3 from expected_list_teams),
  'piloto, ativação, rollback e restauração ficam auditados');

update private.product_rollout_state set enabled = true where singleton;
insert into public.teams(id,name,slug,created_by) values (
  'fe161000-0000-4000-8000-000000000003','Listas Rollout C','listas-rollout-c',
  'fe160000-0000-4000-8000-000000000004'
);
select is((select enabled from public.team_feature_flags where
  team_id='fe161000-0000-4000-8000-000000000003' and feature='complete_management_lists'),
  true,'novo time herda as listas ativas');
select is((select count(*) from public.team_feature_flags where
  team_id='fe161000-0000-4000-8000-000000000003' and enabled),18::bigint,
  'novo time herda o catálogo completo');
select ok((select last_flag_change_at is not null from public.get_complete_management_lists_health(
  'fe161000-0000-4000-8000-000000000001')),
  'sonda expõe o marco operacional da flag');

select * from finish();
rollback;
