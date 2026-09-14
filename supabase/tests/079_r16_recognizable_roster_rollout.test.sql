begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(31);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000001','authenticated','authenticated','seed-owner-roster-rollout@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fc160000-0000-4000-8000-000000000001','authenticated','authenticated','owner-roster-rollout-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fc160000-0000-4000-8000-000000000002','authenticated','authenticated','manager-roster-rollout-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fc160000-0000-4000-8000-000000000003','authenticated','authenticated','owner-roster-rollout-b@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fc160000-0000-4000-8000-000000000004','authenticated','authenticated','player-roster-rollout@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fc160000-0000-4000-8000-000000000005','authenticated','authenticated','owner-roster-rollout-c@example.test','',now(),'{}','{}',now(),now(),'','','','');

select has_function('public','set_recognizable_roster_rollout',array['boolean','uuid'],
  'kill switch específico do elenco existe');
select ok(has_function_privilege('service_role',
  'public.set_recognizable_roster_rollout(boolean,uuid)','execute'),
  'service role opera o rollout');
select ok(not has_function_privilege('authenticated',
  'public.set_recognizable_roster_rollout(boolean,uuid)','execute'),
  'authenticated não opera o rollout');
select ok(not has_function_privilege('anon',
  'public.set_recognizable_roster_rollout(boolean,uuid)','execute'),
  'anônimo não opera o rollout');
select has_function('public','get_recognizable_roster_health',array['uuid'],
  'sonda agregada do elenco existe');
select ok(has_function_privilege('service_role',
  'public.get_recognizable_roster_health(uuid)','execute'),
  'service role consulta a sonda');
select ok(not has_function_privilege('authenticated',
  'public.get_recognizable_roster_health(uuid)','execute'),
  'authenticated não consulta a sonda');
select ok(not has_function_privilege('anon',
  'public.get_recognizable_roster_health(uuid)','execute'),
  'anônimo não consulta a sonda');
select ok('recognizable_roster' = any(array(
  select feature::text from private.product_feature_keys() feature
)), 'elenco integra a herança do produto');
select is((select count(*) from private.product_feature_keys()),19::bigint,
  'catálogo possui dezenove capacidades');

update private.product_rollout_state set enabled = false where singleton;
insert into public.teams(id,name,slug,created_by) values
  ('fc161000-0000-4000-8000-000000000001','Elenco Rollout A','elenco-rollout-a','fc160000-0000-4000-8000-000000000001'),
  ('fc161000-0000-4000-8000-000000000002','Elenco Rollout B','elenco-rollout-b','fc160000-0000-4000-8000-000000000003');
insert into public.team_memberships(team_id,user_id,role,status,invited_by) values (
  'fc161000-0000-4000-8000-000000000001','fc160000-0000-4000-8000-000000000002',
  'manager','active','fc160000-0000-4000-8000-000000000001'
);
insert into public.player_profiles(user_id,handle,display_name,photo_path,phone_verified_at) values (
  'fc160000-0000-4000-8000-000000000004','roster-rollout-player','Atleta Rollout',
  'fc160000-0000-4000-8000-000000000004/profile/fc164000-0000-4000-8000-000000000001.webp',now()
);
insert into public.athletes(
  id,team_id,user_id,full_name,preferred_name,status,photo_path,created_by
) values
  ('fc162000-0000-4000-8000-000000000001','fc161000-0000-4000-8000-000000000001','fc160000-0000-4000-8000-000000000004','Atleta Reivindicado','Atleta','active',null,'fc160000-0000-4000-8000-000000000001'),
  ('fc162000-0000-4000-8000-000000000002','fc161000-0000-4000-8000-000000000001',null,'Atleta Pendente',null,'pending','fc161000-0000-4000-8000-000000000001/fc164000-0000-4000-8000-000000000002.jpg','fc160000-0000-4000-8000-000000000001');
insert into public.athlete_private(athlete_id,team_id,phone_e164,email) values (
  'fc162000-0000-4000-8000-000000000001','fc161000-0000-4000-8000-000000000001','+5511999999999','privado@example.test'
);

create temporary table expected_roster_teams as select count(*)::integer value from public.teams;
create temporary table roster_pilot as select * from public.set_recognizable_roster_rollout(
  true,'fc161000-0000-4000-8000-000000000001'
);
select is((select teams_seen from roster_pilot),1,'piloto observa só o time escolhido');
select is((select flags_changed from roster_pilot),1,'piloto altera uma flag');
select is((select recognizable_roster_enabled from public.get_recognizable_roster_health(
  'fc161000-0000-4000-8000-000000000001')),true,'sonda confirma o piloto ativo');
select results_eq(
  $$select current_athletes,active_athletes,pending_athletes,claimed_athletes,athletes_with_photo_source from public.get_recognizable_roster_health('fc161000-0000-4000-8000-000000000001')$$,
  $$values (2::bigint,1::bigint,1::bigint,1::bigint,2::bigint)$$,
  'sonda agrega o elenco sem expor pessoas'
);
select is((select count(*) from public.get_recognizable_roster_health(
  'fc161000-0000-4000-8000-000000000099')),0::bigint,
  'time ausente não produz linha');
select is((select count(*) from unnest((select proargnames from pg_proc where oid=
  'public.get_recognizable_roster_health(uuid)'::regprocedure)) field
  where field ~ '(name|email|phone|path|search|query|actor|user)'),0::bigint,
  'sonda não expõe conteúdo, mídia ou PII');
select ok(not exists(select 1 from public.team_feature_flags where
  team_id='fc161000-0000-4000-8000-000000000002' and feature='recognizable_roster'),
  'piloto não ativa outro time');

create temporary table roster_activation as
select * from public.set_recognizable_roster_rollout(true,null);
select is((select teams_seen from roster_activation),(select value from expected_roster_teams),
  'ativação observa todos os times');
select is((select count(*)::integer from public.team_feature_flags
  where feature='recognizable_roster' and enabled),(select value from expected_roster_teams),
  'ativação habilita todos os times');
create temporary table roster_replay as
select * from public.set_recognizable_roster_rollout(true,null);
select is((select flags_changed from roster_replay),0,'reexecução é idempotente');
select throws_ok($$select * from public.set_recognizable_roster_rollout(null,null)$$,
  '22023',null,'estado ausente falha fechado');
select throws_ok($$select * from public.set_recognizable_roster_rollout(true,'fc16ffff-0000-4000-8000-000000000000')$$,
  'P0002',null,'time inexistente falha fechado');

set local role authenticated;
select set_config('request.jwt.claim.sub','fc160000-0000-4000-8000-000000000002',true);
select throws_ok($$select * from public.set_recognizable_roster_rollout(false,null)$$,
  '42501',null,'manager não executa rollout');
reset role;

create temporary table roster_rollback as
select * from public.set_recognizable_roster_rollout(false,null);
select is((select flags_changed from roster_rollback),(select value from expected_roster_teams),
  'rollback desliga todos os times');
select results_eq(
  $$select recognizable_roster_enabled,current_athletes,pending_athletes from public.get_recognizable_roster_health('fc161000-0000-4000-8000-000000000001')$$,
  $$values (false,2::bigint,1::bigint)$$,
  'rollback preserva vínculos do elenco'
);
select is((select count(*) from public.athlete_private where team_id=
  'fc161000-0000-4000-8000-000000000001'),1::bigint,
  'rollback preserva os dados privados protegidos');
create temporary table roster_restore as
select * from public.set_recognizable_roster_rollout(true,null);
select is((select flags_changed from roster_restore),(select value from expected_roster_teams),
  'restauração reativa todos os times');
select is((select count(*)::integer from public.audit_logs where
  action='feature_flag.changed' and entity_id='recognizable_roster'
  and metadata->>'source'='recognizable_roster_rollout'),
  (select value*3 from expected_roster_teams),
  'piloto, ativação, rollback e restauração ficam auditados');

update private.product_rollout_state set enabled = true where singleton;
insert into public.teams(id,name,slug,created_by) values (
  'fc161000-0000-4000-8000-000000000003','Elenco Rollout C','elenco-rollout-c',
  'fc160000-0000-4000-8000-000000000005'
);
select is((select enabled from public.team_feature_flags where
  team_id='fc161000-0000-4000-8000-000000000003' and feature='recognizable_roster'),
  true,'novo time herda o elenco reconhecível ativo');
select is((select count(*) from public.team_feature_flags where
  team_id='fc161000-0000-4000-8000-000000000003' and enabled),19::bigint,
  'novo time herda o catálogo completo');
select ok((select last_flag_change_at is not null from public.get_recognizable_roster_health(
  'fc161000-0000-4000-8000-000000000001')),
  'sonda expõe o marco operacional da flag');

select * from finish();
rollback;
