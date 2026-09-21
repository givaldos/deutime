begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(31);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000001','authenticated','authenticated','seed-owner-followup-rollout@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fb160000-0000-4000-8000-000000000001','authenticated','authenticated','owner-followup-rollout-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fb160000-0000-4000-8000-000000000002','authenticated','authenticated','manager-followup-rollout-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-8000-000000000000','fb160000-0000-4000-8000-000000000003','authenticated','authenticated','owner-followup-rollout-b@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fb160000-0000-4000-8000-000000000004','authenticated','authenticated','owner-followup-rollout-c@example.test','',now(),'{}','{}',now(),now(),'','','','');

select has_function('public','set_championship_followup_rollout',array['boolean','uuid'],
  'kill switch específico do acompanhamento existe');
select ok(has_function_privilege('service_role',
  'public.set_championship_followup_rollout(boolean,uuid)','execute'),
  'service role opera o rollout');
select ok(not has_function_privilege('authenticated',
  'public.set_championship_followup_rollout(boolean,uuid)','execute'),
  'authenticated não opera o rollout');
select ok(not has_function_privilege('anon',
  'public.set_championship_followup_rollout(boolean,uuid)','execute'),
  'anônimo não opera o rollout');
select has_function('public','get_championship_followup_health',array['uuid'],
  'sonda agregada do acompanhamento existe');
select ok(has_function_privilege('service_role',
  'public.get_championship_followup_health(uuid)','execute'),
  'service role consulta a sonda');
select ok(not has_function_privilege('authenticated',
  'public.get_championship_followup_health(uuid)','execute'),
  'authenticated não consulta a sonda');
select ok(not has_function_privilege('anon',
  'public.get_championship_followup_health(uuid)','execute'),
  'anônimo não consulta a sonda');
select ok('clear_championship_workspace' = any(array(
  select feature::text from private.product_feature_keys() feature
)), 'acompanhamento integra a herança do produto');
select is((select count(*) from private.product_feature_keys()),20::bigint,
  'catálogo possui vinte capacidades');

update private.product_rollout_state set enabled = false where singleton;
insert into public.teams(id,name,slug,created_by) values
  ('fb161000-0000-4000-8000-000000000001','Acompanhamento Rollout A','acompanhamento-rollout-a','fb160000-0000-4000-8000-000000000001'),
  ('fb161000-0000-4000-8000-000000000002','Acompanhamento Rollout B','acompanhamento-rollout-b','fb160000-0000-4000-8000-000000000003');
insert into public.team_memberships(team_id,user_id,role,status,invited_by) values (
  'fb161000-0000-4000-8000-000000000001','fb160000-0000-4000-8000-000000000002',
  'manager','active','fb160000-0000-4000-8000-000000000001'
);
insert into public.championships(
  id,team_id,name,format,status,published_at,published_by,created_by,updated_by
) values
  ('fb162000-0000-4000-8000-000000000001','fb161000-0000-4000-8000-000000000001','Copa em configuração','league','draft',null,null,'fb160000-0000-4000-8000-000000000001','fb160000-0000-4000-8000-000000000001'),
  ('fb162000-0000-4000-8000-000000000002','fb161000-0000-4000-8000-000000000001','Copa publicada','league','draft',null,null,'fb160000-0000-4000-8000-000000000001','fb160000-0000-4000-8000-000000000001');
update public.championships
set status='published',published_at=now(),published_by='fb160000-0000-4000-8000-000000000001'
where id='fb162000-0000-4000-8000-000000000002';
insert into public.championship_fixtures(
  id,championship_id,team_id,stage,status,round_number,ordinal,created_by,updated_by
) values
  ('fb163000-0000-4000-8000-000000000001','fb162000-0000-4000-8000-000000000002','fb161000-0000-4000-8000-000000000001','league','scheduled',1,1,'fb160000-0000-4000-8000-000000000001','fb160000-0000-4000-8000-000000000001'),
  ('fb163000-0000-4000-8000-000000000002','fb162000-0000-4000-8000-000000000002','fb161000-0000-4000-8000-000000000001','league','scheduled',1,2,'fb160000-0000-4000-8000-000000000001','fb160000-0000-4000-8000-000000000001');

create temporary table expected_followup_teams as select count(*)::integer value from public.teams;
create temporary table followup_pilot as select * from public.set_championship_followup_rollout(
  true,'fb161000-0000-4000-8000-000000000001'
);
select is((select teams_seen from followup_pilot),1,'piloto observa só o time escolhido');
select is((select flags_changed from followup_pilot),1,'piloto altera uma flag');
select is((select clear_championship_workspace_enabled from public.get_championship_followup_health(
  'fb161000-0000-4000-8000-000000000001')),true,'sonda confirma o piloto ativo');
select results_eq(
  $$select total_championships,followup_championships,configuration_championships,total_fixtures,linked_fixtures from public.get_championship_followup_health('fb161000-0000-4000-8000-000000000001')$$,
  $$values (2::bigint,1::bigint,1::bigint,2::bigint,0::bigint)$$,
  'sonda agrega campeonatos e confrontos sem expor conteúdo'
);
select is((select count(*) from public.get_championship_followup_health(
  'fb161000-0000-4000-8000-000000000099')),0::bigint,
  'time ausente não produz linha');
select is((select count(*) from unnest((select proargnames from pg_proc where oid=
  'public.get_championship_followup_health(uuid)'::regprocedure)) field
  where field ~ '(name|email|phone|url|score|actor|user|championship_id|fixture_id)'),0::bigint,
  'sonda não expõe conteúdo esportivo, identificadores ou PII');
select ok(not exists(select 1 from public.team_feature_flags where
  team_id='fb161000-0000-4000-8000-000000000002' and feature='clear_championship_workspace'),
  'piloto não ativa outro time');

create temporary table followup_activation as
select * from public.set_championship_followup_rollout(true,null);
select is((select teams_seen from followup_activation),(select value from expected_followup_teams),
  'ativação observa todos os times');
select is((select count(*)::integer from public.team_feature_flags
  where feature='clear_championship_workspace' and enabled),(select value from expected_followup_teams),
  'ativação habilita todos os times');
create temporary table followup_replay as
select * from public.set_championship_followup_rollout(true,null);
select is((select flags_changed from followup_replay),0,'reexecução é idempotente');
select throws_ok($$select * from public.set_championship_followup_rollout(null,null)$$,
  '22023',null,'estado ausente falha fechado');
select throws_ok($$select * from public.set_championship_followup_rollout(true,'fb16ffff-0000-4000-8000-000000000000')$$,
  'P0002',null,'time inexistente falha fechado');

set local role authenticated;
select set_config('request.jwt.claim.sub','fb160000-0000-4000-8000-000000000002',true);
select throws_ok($$select * from public.set_championship_followup_rollout(false,null)$$,
  '42501',null,'manager não executa rollout');
reset role;

create temporary table followup_rollback as
select * from public.set_championship_followup_rollout(false,null);
select is((select flags_changed from followup_rollback),(select value from expected_followup_teams),
  'rollback desliga todos os times');
select results_eq(
  $$select clear_championship_workspace_enabled,total_championships,total_fixtures from public.get_championship_followup_health('fb161000-0000-4000-8000-000000000001')$$,
  $$values (false,2::bigint,2::bigint)$$,
  'rollback preserva as contagens esportivas'
);
select is((select count(*) from public.championships where team_id=
  'fb161000-0000-4000-8000-000000000001'),2::bigint,
  'rollback preserva campeonatos');
select is((select count(*) from public.championship_fixtures where team_id=
  'fb161000-0000-4000-8000-000000000001'),2::bigint,
  'rollback preserva confrontos');
create temporary table followup_restore as
select * from public.set_championship_followup_rollout(true,null);
select is((select flags_changed from followup_restore),(select value from expected_followup_teams),
  'restauração reativa todos os times');
select is((select count(*)::integer from public.audit_logs where
  action='feature_flag.changed' and entity_id='clear_championship_workspace'
  and metadata->>'source'='championship_followup_rollout'),
  (select value*3 from expected_followup_teams),
  'piloto, ativação, rollback e restauração ficam auditados');

update private.product_rollout_state set enabled = true where singleton;
insert into public.teams(id,name,slug,created_by) values (
  'fb161000-0000-4000-8000-000000000003','Acompanhamento Rollout C','acompanhamento-rollout-c',
  'fb160000-0000-4000-8000-000000000004'
);
select is((select enabled from public.team_feature_flags where
  team_id='fb161000-0000-4000-8000-000000000003'
  and feature='clear_championship_workspace'),true,
  'novo time herda o acompanhamento ativo');
select is((select count(*) from public.team_feature_flags where
  team_id='fb161000-0000-4000-8000-000000000003' and enabled),20::bigint,
  'novo time herda o catálogo completo');

select * from finish();
rollback;
