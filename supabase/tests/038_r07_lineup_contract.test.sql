begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(31);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','d7100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-r07-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','d7100000-0000-4000-8000-000000000002','authenticated','authenticated','manager-r07-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','d7100000-0000-4000-8000-000000000003','authenticated','authenticated','player-r07-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','d7100000-0000-4000-8000-000000000004','authenticated','authenticated','owner-r07-b@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,created_by) values
  ('d7200000-0000-4000-8000-000000000001','R07 Time A','r07-time-a','d7100000-0000-4000-8000-000000000001'),
  ('d7200000-0000-4000-8000-000000000002','R07 Time B','r07-time-b','d7100000-0000-4000-8000-000000000004');
insert into public.team_memberships(team_id,user_id,role,status,invited_by) values
  ('d7200000-0000-4000-8000-000000000001','d7100000-0000-4000-8000-000000000002','manager','active','d7100000-0000-4000-8000-000000000001')
on conflict do nothing;

insert into public.events(id,team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,status,created_by) values
  ('d7300000-0000-4000-8000-000000000001','d7200000-0000-4000-8000-000000000001','Pelada R07 A','weekly_match','split_teams','society',now()+interval '5 days',now()+interval '5 days 90 minutes','scheduled','d7100000-0000-4000-8000-000000000001'),
  ('d7300000-0000-4000-8000-000000000002','d7200000-0000-4000-8000-000000000002','Pelada R07 B','weekly_match','split_teams','society',now()+interval '6 days',now()+interval '6 days 90 minutes','scheduled','d7100000-0000-4000-8000-000000000004');

insert into public.athletes(id,team_id,user_id,full_name,preferred_name,status,created_by) values
  ('d7400000-0000-4000-8000-000000000001','d7200000-0000-4000-8000-000000000001','d7100000-0000-4000-8000-000000000003','Jogador Um','Um','active','d7100000-0000-4000-8000-000000000001'),
  ('d7400000-0000-4000-8000-000000000002','d7200000-0000-4000-8000-000000000001',null,'Jogador Dois','Dois','active','d7100000-0000-4000-8000-000000000001'),
  ('d7400000-0000-4000-8000-000000000003','d7200000-0000-4000-8000-000000000001',null,'Jogador Tres','Tres','active','d7100000-0000-4000-8000-000000000001'),
  ('d7400000-0000-4000-8000-000000000004','d7200000-0000-4000-8000-000000000001',null,'Jogador Quatro','Quatro','active','d7100000-0000-4000-8000-000000000001');
insert into public.event_attendance(event_id,team_id,athlete_id,status) values
  ('d7300000-0000-4000-8000-000000000001','d7200000-0000-4000-8000-000000000001','d7400000-0000-4000-8000-000000000001','confirmed'),
  ('d7300000-0000-4000-8000-000000000001','d7200000-0000-4000-8000-000000000001','d7400000-0000-4000-8000-000000000002','confirmed'),
  ('d7300000-0000-4000-8000-000000000001','d7200000-0000-4000-8000-000000000001','d7400000-0000-4000-8000-000000000003','confirmed'),
  ('d7300000-0000-4000-8000-000000000001','d7200000-0000-4000-8000-000000000001','d7400000-0000-4000-8000-000000000004','pending');

select ok((select relrowsecurity from pg_class where oid='public.athlete_public_consents'::regclass),'consentimentos usam RLS');
select ok((select relrowsecurity from pg_class where oid='public.event_lineup_revisions'::regclass),'revisões usam RLS');
select ok(not has_table_privilege('authenticated','public.event_lineup_commands','SELECT'),'cliente não lê comandos internos');
select ok(not has_table_privilege('authenticated','public.event_lineup_revisions','UPDATE'),'cliente não altera revisão');
select ok(not has_function_privilege('anon','public.save_event_lineup_draft(uuid,uuid,jsonb,jsonb,uuid[])','EXECUTE'),'anon não salva divisão');
select ok(has_function_privilege('authenticated','public.save_event_lineup_draft(uuid,uuid,jsonb,jsonb,uuid[])','EXECUTE'),'authenticated acessa RPC protegida');

set local role authenticated;
select set_config('request.jwt.claim.sub','d7100000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.save_event_lineup_draft(
  'd7300000-0000-4000-8000-000000000001','d7500000-0000-4000-8000-000000000001',
  '[{"id":"d7600000-0000-4000-8000-000000000001","name":"Azul","sort_order":1},{"id":"d7600000-0000-4000-8000-000000000002","name":"Branco","sort_order":2}]',
  '[]','{}')$$,'55000',null,'feature desligada falha fechada');

select set_config('request.jwt.claim.sub','d7100000-0000-4000-8000-000000000003',true);
select lives_ok($$select public.set_public_sports_activity_consent('d7400000-0000-4000-8000-000000000001',true,'r07-v1','d7500000-0000-4000-8000-000000000002')$$,'jogador concede consentimento próprio');
reset role;
select is((select status from public.athlete_public_consents where athlete_id='d7400000-0000-4000-8000-000000000001'),'granted'::public.consent_status,'consentimento fica concedido');

set local role authenticated;
select set_config('request.jwt.claim.sub','d7100000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.set_public_sports_activity_consent('d7400000-0000-4000-8000-000000000001',false,'r07-v1','d7500000-0000-4000-8000-000000000003')$$,'42501',null,'staff não decide consentimento do jogador');
reset role;

insert into public.team_feature_flags(team_id,feature,enabled,updated_by)
values('d7200000-0000-4000-8000-000000000001','team_division',true,'d7100000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','d7100000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.save_event_lineup_draft(
  'd7300000-0000-4000-8000-000000000001','d7500000-0000-4000-8000-000000000004',
  '[{"id":"d7600000-0000-4000-8000-000000000001","name":"Azul","sort_order":1},{"id":"d7600000-0000-4000-8000-000000000002","name":"Branco","sort_order":2}]',
  '[{"athlete_id":"d7400000-0000-4000-8000-000000000004","squad_id":"d7600000-0000-4000-8000-000000000001","sort_order":1}]','{}')$$,
  '23514',null,'pendente não entra na divisão');

select lives_ok($$select public.save_event_lineup_draft(
    'd7300000-0000-4000-8000-000000000001','d7500000-0000-4000-8000-000000000005',
    '[{"id":"d7600000-0000-4000-8000-000000000001","name":"Azul","color":"#112233","sort_order":1},{"id":"d7600000-0000-4000-8000-000000000002","name":"Branco","sort_order":2}]',
    '[{"athlete_id":"d7400000-0000-4000-8000-000000000001","squad_id":"d7600000-0000-4000-8000-000000000001","sort_order":1},{"athlete_id":"d7400000-0000-4000-8000-000000000002","squad_id":"d7600000-0000-4000-8000-000000000002","sort_order":1}]',
    array['d7400000-0000-4000-8000-000000000003']::uuid[])$$,
  'manager salva rascunho completo');
reset role;

select is((select count(*) from public.event_squads where event_id='d7300000-0000-4000-8000-000000000001'),2::bigint,'dois times persistidos');
select is((select count(*) from public.lineup_spots where event_id='d7300000-0000-4000-8000-000000000001'),2::bigint,'duas escalações persistidas');
select is((select count(*) from public.event_lineup_exclusions where event_id='d7300000-0000-4000-8000-000000000001'),1::bigint,'exclusão explícita persistida');

set local role authenticated;
select set_config('request.jwt.claim.sub','d7100000-0000-4000-8000-000000000002',true);
select is((select (public.save_event_lineup_draft(
  'd7300000-0000-4000-8000-000000000001','d7500000-0000-4000-8000-000000000005','[]','[]','{}')).replayed),true,'replay não reexecuta rascunho');
select throws_ok($$select public.publish_event_lineup('d7300000-0000-4000-8000-000000000001','d7500000-0000-4000-8000-000000000006')$$,'42501',null,'manager não publica');
select set_config('request.jwt.claim.sub','d7100000-0000-4000-8000-000000000004',true);
select throws_ok($$select public.save_event_lineup_draft('d7300000-0000-4000-8000-000000000001','d7500000-0000-4000-8000-000000000007','[]','[]','{}')$$,'42501',null,'outro time não altera rascunho');
select set_config('request.jwt.claim.sub','d7100000-0000-4000-8000-000000000001',true);
select lives_ok($$select set_config('test.r07_revision',(public.publish_event_lineup('d7300000-0000-4000-8000-000000000001','d7500000-0000-4000-8000-000000000008')).revision_id::text,true)$$,'owner publica revisão');
reset role;

select is((select revision from public.event_lineup_revisions where id=current_setting('test.r07_revision')::uuid),1,'primeira revisão é versionada');
select is((select count(*) from public.event_lineup_revision_squads where revision_id=current_setting('test.r07_revision')::uuid),2::bigint,'snapshot guarda times');
select is((select count(*) from public.event_lineup_revision_spots where revision_id=current_setting('test.r07_revision')::uuid),2::bigint,'snapshot guarda escalação');

set local role authenticated;
select set_config('request.jwt.claim.sub','d7100000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.save_event_lineup_draft(
  'd7300000-0000-4000-8000-000000000001','d7500000-0000-4000-8000-000000000009',
  '[{"id":"d7600000-0000-4000-8000-000000000001","name":"Laranja","sort_order":1},{"id":"d7600000-0000-4000-8000-000000000002","name":"Verde","sort_order":2}]',
  '[{"athlete_id":"d7400000-0000-4000-8000-000000000001","squad_id":"d7600000-0000-4000-8000-000000000001","sort_order":1},{"athlete_id":"d7400000-0000-4000-8000-000000000002","squad_id":"d7600000-0000-4000-8000-000000000002","sort_order":1}]',
  array['d7400000-0000-4000-8000-000000000003']::uuid[])$$,'rascunho segue editável depois da publicação');
reset role;
select is((select name from public.event_lineup_revision_squads where revision_id=current_setting('test.r07_revision')::uuid and sort_order=1),'Azul','revisão publicada permanece imutável');

insert into public.event_matches(id,event_id,team_id,ordinal,status,public_mode,created_by)
values('d7700000-0000-4000-8000-000000000001','d7300000-0000-4000-8000-000000000001','d7200000-0000-4000-8000-000000000001',1,'scheduled','private','d7100000-0000-4000-8000-000000000001');
insert into public.match_sides(id,match_id,event_id,team_id,side_index,label) values
  ('d7800000-0000-4000-8000-000000000001','d7700000-0000-4000-8000-000000000001','d7300000-0000-4000-8000-000000000001','d7200000-0000-4000-8000-000000000001',1,'Casa'),
  ('d7800000-0000-4000-8000-000000000002','d7700000-0000-4000-8000-000000000001','d7300000-0000-4000-8000-000000000001','d7200000-0000-4000-8000-000000000001',2,'Visitante');

set local role authenticated;
select set_config('request.jwt.claim.sub','d7100000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.link_event_lineup_squad_to_match_side('d7700000-0000-4000-8000-000000000001',1,'d7600000-0000-4000-8000-000000000001','d7500000-0000-4000-8000-000000000010')$$,'staff vincula time ao lado');
reset role;
select is((select squad_id from public.match_sides where id='d7800000-0000-4000-8000-000000000001'),'d7600000-0000-4000-8000-000000000001'::uuid,'lado recebe somente o squad_id');
select is((select count(*) from public.match_participations where match_id='d7700000-0000-4000-8000-000000000001'),0::bigint,'vínculo não cria participação');
select is((select count(*) from public.event_attendance where event_id='d7300000-0000-4000-8000-000000000001' and status='confirmed'),3::bigint,'vínculo não altera RSVP');

set local role authenticated;
select set_config('request.jwt.claim.sub','d7100000-0000-4000-8000-000000000003',true);
select lives_ok($$select public.set_public_sports_activity_consent('d7400000-0000-4000-8000-000000000001',false,'r07-v1','d7500000-0000-4000-8000-000000000011')$$,'jogador revoga consentimento');
reset role;
select is((select status from public.athlete_public_consents where athlete_id='d7400000-0000-4000-8000-000000000001'),'revoked'::public.consent_status,'revogação é imediata');
select is((select count(*) from public.audit_logs where action like 'lineup.%' and metadata::text like '%Jogador%'),0::bigint,'auditoria não contém nome de jogador');

select * from finish();
rollback;
