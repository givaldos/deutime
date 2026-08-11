begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(19);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','f7100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-r07-pilot@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f7100000-0000-4000-8000-000000000002','authenticated','authenticated','player-r07-pilot@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f7100000-0000-4000-8000-000000000003','authenticated','authenticated','other-r07-pilot@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,created_by) values
  ('f7200000-0000-4000-8000-000000000001','R07 Piloto A','r07-piloto-a','f7100000-0000-4000-8000-000000000001'),
  ('f7200000-0000-4000-8000-000000000002','R07 Piloto B','r07-piloto-b','f7100000-0000-4000-8000-000000000003');
insert into public.events(id,team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,status,created_by) values
  ('f7300000-0000-4000-8000-000000000001','f7200000-0000-4000-8000-000000000001','Piloto observado','weekly_match','split_teams','society',now()+interval '5 days',now()+interval '5 days 90 minutes','scheduled','f7100000-0000-4000-8000-000000000001'),
  ('f7300000-0000-4000-8000-000000000002','f7200000-0000-4000-8000-000000000002','Outro time','weekly_match','split_teams','society',now()+interval '6 days',now()+interval '6 days 90 minutes','scheduled','f7100000-0000-4000-8000-000000000003');
insert into public.athletes(id,team_id,user_id,full_name,preferred_name,status,created_by) values
  ('f7400000-0000-4000-8000-000000000001','f7200000-0000-4000-8000-000000000001','f7100000-0000-4000-8000-000000000002','Nome Civil Um','Um','active','f7100000-0000-4000-8000-000000000001'),
  ('f7400000-0000-4000-8000-000000000002','f7200000-0000-4000-8000-000000000001',null,'Nome Civil Dois','Dois','active','f7100000-0000-4000-8000-000000000001'),
  ('f7400000-0000-4000-8000-000000000003','f7200000-0000-4000-8000-000000000001',null,'Nome Civil Tres','Tres','active','f7100000-0000-4000-8000-000000000001');
insert into public.event_attendance(event_id,team_id,athlete_id,status) values
  ('f7300000-0000-4000-8000-000000000001','f7200000-0000-4000-8000-000000000001','f7400000-0000-4000-8000-000000000001','confirmed'),
  ('f7300000-0000-4000-8000-000000000001','f7200000-0000-4000-8000-000000000001','f7400000-0000-4000-8000-000000000002','confirmed'),
  ('f7300000-0000-4000-8000-000000000001','f7200000-0000-4000-8000-000000000001','f7400000-0000-4000-8000-000000000003','confirmed');
insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('f7200000-0000-4000-8000-000000000001','team_division',true,'f7100000-0000-4000-8000-000000000001'),
  ('f7200000-0000-4000-8000-000000000001','public_event_page',true,'f7100000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','f7100000-0000-4000-8000-000000000002',true);
select public.set_public_sports_activity_consent('f7400000-0000-4000-8000-000000000001',true,'r07-v1','f7500000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','f7100000-0000-4000-8000-000000000001',true);
select public.save_event_lineup_draft(
  'f7300000-0000-4000-8000-000000000001','f7500000-0000-4000-8000-000000000002',
  '[{"id":"f7600000-0000-4000-8000-000000000001","name":"Verde","sort_order":1},{"id":"f7600000-0000-4000-8000-000000000002","name":"Azul","sort_order":2}]',
  '[{"athlete_id":"f7400000-0000-4000-8000-000000000001","squad_id":"f7600000-0000-4000-8000-000000000001","sort_order":1},{"athlete_id":"f7400000-0000-4000-8000-000000000002","squad_id":"f7600000-0000-4000-8000-000000000002","sort_order":1}]',
  array['f7400000-0000-4000-8000-000000000003']::uuid[]
);
select public.publish_event_lineup('f7300000-0000-4000-8000-000000000001','f7500000-0000-4000-8000-000000000003');
reset role;

select has_function('public','get_event_lineup_pilot_health',array['uuid'],'sonda agregada existe');
select ok(has_function_privilege('service_role','public.get_event_lineup_pilot_health(uuid)','EXECUTE'),'service role executa sonda');
select ok(not has_function_privilege('anon','public.get_event_lineup_pilot_health(uuid)','EXECUTE'),'anon não executa sonda');
select ok(not has_function_privilege('authenticated','public.get_event_lineup_pilot_health(uuid)','EXECUTE'),'authenticated não executa sonda');
select is((select count(*) from public.get_event_lineup_pilot_health('f7200000-0000-4000-8000-000000000099')),0::bigint,'time ausente não produz linha');
select is((select team_division_enabled from public.get_event_lineup_pilot_health('f7200000-0000-4000-8000-000000000001')),true,'gate de divisão observado');
select is((select public_event_page_enabled from public.get_event_lineup_pilot_health('f7200000-0000-4000-8000-000000000001')),true,'gate público observado');
select is((select scheduled_events from public.get_event_lineup_pilot_health('f7200000-0000-4000-8000-000000000001')),1::bigint,'evento futuro agregado');
select is((select draft_events from public.get_event_lineup_pilot_health('f7200000-0000-4000-8000-000000000001')),1::bigint,'evento com rascunho agregado');
select is((select draft_squads from public.get_event_lineup_pilot_health('f7200000-0000-4000-8000-000000000001')),2::bigint,'times do rascunho agregados');
select is((select draft_assignments from public.get_event_lineup_pilot_health('f7200000-0000-4000-8000-000000000001')),2::bigint,'alocações do rascunho agregadas');
select is((select draft_exclusions from public.get_event_lineup_pilot_health('f7200000-0000-4000-8000-000000000001')),1::bigint,'exclusões agregadas');
select is((select active_revisions from public.get_event_lineup_pilot_health('f7200000-0000-4000-8000-000000000001')),1::bigint,'revisão ativa agregada');
select is((select published_squads from public.get_event_lineup_pilot_health('f7200000-0000-4000-8000-000000000001')),2::bigint,'times publicados agregados');
select is((select published_assignments from public.get_event_lineup_pilot_health('f7200000-0000-4000-8000-000000000001')),2::bigint,'alocações publicadas agregadas');
select is((select consented_published_assignments from public.get_event_lineup_pilot_health('f7200000-0000-4000-8000-000000000001')),1::bigint,'somente consentimentos válidos agregados');
select results_eq($$select publications_24h,withdrawals_24h from public.get_event_lineup_pilot_health('f7200000-0000-4000-8000-000000000001')$$,$$select 1::bigint,0::bigint$$,'auditoria recente agregada');
select ok((select last_draft_at is not null and last_publication_at is not null and last_withdrawal_at is null from public.get_event_lineup_pilot_health('f7200000-0000-4000-8000-000000000001')),'marcos operacionais sem payload sensível');
select results_eq($$select team_division_enabled,public_event_page_enabled,draft_squads,active_revisions from public.get_event_lineup_pilot_health('f7200000-0000-4000-8000-000000000002')$$,$$select false,false,0::bigint,0::bigint$$,'outro time permanece isolado e desligado');

select * from finish();
rollback;
