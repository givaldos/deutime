begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(31);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000001','authenticated','authenticated','seed-owner-calendar-rollout@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fd160000-0000-4000-8000-000000000001','authenticated','authenticated','owner-calendar-rollout-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fd160000-0000-4000-8000-000000000002','authenticated','authenticated','manager-calendar-rollout-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fd160000-0000-4000-8000-000000000003','authenticated','authenticated','owner-calendar-rollout-b@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fd160000-0000-4000-8000-000000000004','authenticated','authenticated','owner-calendar-rollout-c@example.test','',now(),'{}','{}',now(),now(),'','','','');

select has_function('public','set_calendar_workspace_rollout',array['boolean','uuid'],
  'kill switch específico do calendário existe');
select ok(has_function_privilege('service_role',
  'public.set_calendar_workspace_rollout(boolean,uuid)','execute'),
  'service role opera o rollout');
select ok(not has_function_privilege('authenticated',
  'public.set_calendar_workspace_rollout(boolean,uuid)','execute'),
  'authenticated não opera o rollout');
select ok(not has_function_privilege('anon',
  'public.set_calendar_workspace_rollout(boolean,uuid)','execute'),
  'anônimo não opera o rollout');
select has_function('public','get_calendar_workspace_health',array['uuid'],
  'sonda agregada do calendário existe');
select ok(has_function_privilege('service_role',
  'public.get_calendar_workspace_health(uuid)','execute'),
  'service role consulta a sonda');
select ok(not has_function_privilege('authenticated',
  'public.get_calendar_workspace_health(uuid)','execute'),
  'authenticated não consulta a sonda');
select ok(not has_function_privilege('anon',
  'public.get_calendar_workspace_health(uuid)','execute'),
  'anônimo não consulta a sonda');
select ok('calendar_workspace' = any(array(
  select feature::text from private.product_feature_keys() feature
)), 'calendário integra a herança do produto');
select is((select count(*) from private.product_feature_keys()),21::bigint,
  'catálogo possui vinte e uma capacidades');

update private.product_rollout_state set enabled = false where singleton;
insert into public.teams(id,name,slug,created_by) values
  ('fd161000-0000-4000-8000-000000000001','Calendário Rollout A','calendario-rollout-a','fd160000-0000-4000-8000-000000000001'),
  ('fd161000-0000-4000-8000-000000000002','Calendário Rollout B','calendario-rollout-b','fd160000-0000-4000-8000-000000000003');
insert into public.team_memberships(team_id,user_id,role,status,invited_by) values (
  'fd161000-0000-4000-8000-000000000001','fd160000-0000-4000-8000-000000000002',
  'manager','active','fd160000-0000-4000-8000-000000000001'
);
insert into public.events(
  id,team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,status,
  professional_schedule_state,created_by
) values
  ('fd162000-0000-4000-8000-000000000001','fd161000-0000-4000-8000-000000000001','Treino A','training','single_squad','society','2026-09-22 19:00:00-03','2026-09-22 20:30:00-03','scheduled','scheduled','fd160000-0000-4000-8000-000000000001'),
  ('fd162000-0000-4000-8000-000000000002','fd161000-0000-4000-8000-000000000001','Jogo A','friendly','single_squad','society','2026-09-22 20:00:00-03','2026-09-22 21:30:00-03','scheduled','pending_review','fd160000-0000-4000-8000-000000000001'),
  ('fd162000-0000-4000-8000-000000000003','fd161000-0000-4000-8000-000000000001','Sem data A','friendly','single_squad','society','2026-08-01 20:00:00-03','2026-08-01 21:00:00-03','scheduled','date_tbd','fd160000-0000-4000-8000-000000000001');
insert into public.event_schedule_conflicts(
  id,team_id,event_id,other_event_id,kind,severity,status,detected_schedule_version
) values (
  'fd163000-0000-4000-8000-000000000001','fd161000-0000-4000-8000-000000000001',
  'fd162000-0000-4000-8000-000000000002','fd162000-0000-4000-8000-000000000001',
  'internal_team_overlap','hard','pending',1
);

create temporary table expected_calendar_teams as
select count(*)::integer value from public.teams;
create temporary table calendar_pilot as
select * from public.set_calendar_workspace_rollout(
  true,'fd161000-0000-4000-8000-000000000001'
);
select is((select teams_seen from calendar_pilot),1,'piloto observa só o time escolhido');
select is((select flags_changed from calendar_pilot),1,'piloto altera uma flag');
select is((select calendar_workspace_enabled from public.get_calendar_workspace_health(
  'fd161000-0000-4000-8000-000000000001')),true,'sonda confirma o piloto ativo');
select results_eq(
  $$select scheduled_events,reschedule_events,pending_conflicts from public.get_calendar_workspace_health('fd161000-0000-4000-8000-000000000001')$$,
  $$values (2::bigint,1::bigint,1::bigint)$$,
  'sonda agrega agenda e conflitos sem expor conteúdo'
);
select is((select count(*) from public.get_calendar_workspace_health(
  'fd161000-0000-4000-8000-000000000099')),0::bigint,
  'time ausente não produz linha');
select is((select count(*) from unnest((select proargnames from pg_proc where oid=
  'public.get_calendar_workspace_health(uuid)'::regprocedure)) field
  where field ~ '(name|email|phone|url|title|actor|user|event_id|conflict_id)'),0::bigint,
  'sonda não expõe conteúdo esportivo, identificadores ou PII');
select ok(not exists(select 1 from public.team_feature_flags where
  team_id='fd161000-0000-4000-8000-000000000002' and feature='calendar_workspace'),
  'piloto não ativa outro time');

create temporary table calendar_activation as
select * from public.set_calendar_workspace_rollout(true,null);
select is((select teams_seen from calendar_activation),(select value from expected_calendar_teams),
  'ativação observa todos os times');
select is((select count(*)::integer from public.team_feature_flags
  where feature='calendar_workspace' and enabled),(select value from expected_calendar_teams),
  'ativação habilita todos os times');
create temporary table calendar_replay as
select * from public.set_calendar_workspace_rollout(true,null);
select is((select flags_changed from calendar_replay),0,'reexecução é idempotente');
select throws_ok($$select * from public.set_calendar_workspace_rollout(null,null)$$,
  '22023',null,'estado ausente falha fechado');
select throws_ok($$select * from public.set_calendar_workspace_rollout(true,'fd16ffff-0000-4000-8000-000000000000')$$,
  'P0002',null,'time inexistente falha fechado');

set local role authenticated;
select set_config('request.jwt.claim.sub','fd160000-0000-4000-8000-000000000002',true);
select throws_ok($$select * from public.set_calendar_workspace_rollout(false,null)$$,
  '42501',null,'manager não executa rollout');
reset role;

create temporary table calendar_rollback as
select * from public.set_calendar_workspace_rollout(false,null);
select is((select flags_changed from calendar_rollback),(select value from expected_calendar_teams),
  'rollback desliga todos os times');
select results_eq(
  $$select calendar_workspace_enabled,scheduled_events,reschedule_events,pending_conflicts from public.get_calendar_workspace_health('fd161000-0000-4000-8000-000000000001')$$,
  $$values (false,2::bigint,1::bigint,1::bigint)$$,
  'rollback preserva as contagens da agenda'
);
select is((select count(*) from public.events where team_id=
  'fd161000-0000-4000-8000-000000000001'),3::bigint,
  'rollback preserva eventos');
select is((select count(*) from public.event_schedule_conflicts where team_id=
  'fd161000-0000-4000-8000-000000000001'),1::bigint,
  'rollback preserva conflitos');
create temporary table calendar_restore as
select * from public.set_calendar_workspace_rollout(true,null);
select is((select flags_changed from calendar_restore),(select value from expected_calendar_teams),
  'restauração reativa todos os times');
select is((select count(*)::integer from public.audit_logs where
  action='feature_flag.changed' and entity_id='calendar_workspace'
  and metadata->>'source'='calendar_workspace_rollout'),
  (select value*3 from expected_calendar_teams),
  'piloto, ativação, rollback e restauração ficam auditados');

update private.product_rollout_state set enabled = true where singleton;
insert into public.teams(id,name,slug,created_by) values (
  'fd161000-0000-4000-8000-000000000003','Calendário Rollout C','calendario-rollout-c',
  'fd160000-0000-4000-8000-000000000004'
);
select is((select enabled from public.team_feature_flags where
  team_id='fd161000-0000-4000-8000-000000000003'
  and feature='calendar_workspace'),true,
  'novo time herda o calendário ativo');
select is((select count(*) from public.team_feature_flags where
  team_id='fd161000-0000-4000-8000-000000000003' and enabled),21::bigint,
  'novo time herda o catálogo completo');

select * from finish();
rollback;
