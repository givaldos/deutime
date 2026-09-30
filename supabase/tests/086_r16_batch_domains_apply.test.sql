begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(20);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
values ('00000000-0000-0000-0000-000000000000','fb160000-0000-4000-8000-000000000001','authenticated','authenticated','batch-domains@example.test','',now(),'{}','{}',now(),now(),'','','','');
insert into public.teams(id,name,slug,timezone,created_by)
values ('fb161000-0000-4000-8000-000000000001','Lote Domínios','lote-dominios','America/Sao_Paulo','fb160000-0000-4000-8000-000000000001');
insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('fb161000-0000-4000-8000-000000000001','batch_operations',true,'fb160000-0000-4000-8000-000000000001'),
  ('fb161000-0000-4000-8000-000000000001','event_control',true,'fb160000-0000-4000-8000-000000000001'),
  ('fb161000-0000-4000-8000-000000000001','professional_scheduling',true,'fb160000-0000-4000-8000-000000000001'),
  ('fb161000-0000-4000-8000-000000000001','recognizable_roster',true,'fb160000-0000-4000-8000-000000000001');
insert into public.venues(id,team_id,name,address) values
  ('fb163000-0000-4000-8000-000000000001','fb161000-0000-4000-8000-000000000001','Arena A','Rua A'),
  ('fb163000-0000-4000-8000-000000000002','fb161000-0000-4000-8000-000000000001','Arena B','Rua B');
insert into public.event_series(id,team_id,title,kind,organization_mode,sport_format,recurrence_rule,
  starts_on,ends_on,local_start_time,timezone,duration_minutes,venue_id,created_by)
values ('fb164000-0000-4000-8000-000000000001','fb161000-0000-4000-8000-000000000001','Série A','training','single_squad','society','FREQ=WEEKLY;COUNT=2',current_date+10,current_date+20,'20:00','America/Sao_Paulo',60,'fb163000-0000-4000-8000-000000000001','fb160000-0000-4000-8000-000000000001');
insert into public.events(id,team_id,series_id,series_position,title,kind,organization_mode,sport_format,
  starts_at,ends_at,attendance_deadline,venue_id,status,created_by) values
  ('fb162000-0000-4000-8000-000000000001','fb161000-0000-4000-8000-000000000001','fb164000-0000-4000-8000-000000000001',1,'Série 1','training','single_squad','society',now()+interval '10 days',now()+interval '10 days 1 hour',now()+interval '9 days','fb163000-0000-4000-8000-000000000001','scheduled','fb160000-0000-4000-8000-000000000001'),
  ('fb162000-0000-4000-8000-000000000002','fb161000-0000-4000-8000-000000000001','fb164000-0000-4000-8000-000000000001',2,'Série 2','training','single_squad','society',now()+interval '17 days',now()+interval '17 days 1 hour',now()+interval '16 days','fb163000-0000-4000-8000-000000000001','scheduled','fb160000-0000-4000-8000-000000000001'),
  ('fb162000-0000-4000-8000-000000000003','fb161000-0000-4000-8000-000000000001',null,null,'Avulso','friendly','single_squad','society',now()+interval '12 days',now()+interval '12 days 1 hour',now()+interval '11 days','fb163000-0000-4000-8000-000000000001','scheduled','fb160000-0000-4000-8000-000000000001');
insert into public.athletes(id,team_id,full_name,preferred_name,status,created_by) values
  ('fb166000-0000-4000-8000-000000000001','fb161000-0000-4000-8000-000000000001','Atleta Um','Um','pending','fb160000-0000-4000-8000-000000000001'),
  ('fb166000-0000-4000-8000-000000000002','fb161000-0000-4000-8000-000000000001','Atleta Dois','Dois','pending','fb160000-0000-4000-8000-000000000001'),
  ('fb166000-0000-4000-8000-000000000003','fb161000-0000-4000-8000-000000000001','Atleta Três','Três','pending','fb160000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','fb160000-0000-4000-8000-000000000001',true);

create temporary table venue_preview as select public.preview_event_batch_operation(
  'fb161000-0000-4000-8000-000000000001',array['fb162000-0000-4000-8000-000000000003'::uuid],
  'set_venue','{"venue_id":"fb163000-0000-4000-8000-000000000002"}','selected'
) || jsonb_build_object('payload','{"venue_id":"fb163000-0000-4000-8000-000000000002"}'::jsonb) payload;
select is((public.apply_event_batch_operation('fb161000-0000-4000-8000-000000000001',(select payload from venue_preview),'fb165000-0000-4000-8000-000000000001')->>'applied_count')::integer,1,'aplica local uniforme');
select is((select venue_id from public.events where id='fb162000-0000-4000-8000-000000000003'),'fb163000-0000-4000-8000-000000000002'::uuid,'altera o local');

create temporary table series_preview as select public.preview_event_batch_operation(
  'fb161000-0000-4000-8000-000000000001',array['fb162000-0000-4000-8000-000000000001'::uuid],
  'postpone','{}','this_and_future'
) || jsonb_build_object('payload','{}'::jsonb) payload;
select is(((select payload from series_preview)->>'item_count')::integer,2,'prévia resolve a série futura');
select is((public.apply_event_batch_operation('fb161000-0000-4000-8000-000000000001',(select payload from series_preview),'fb165000-0000-4000-8000-000000000002')->>'applied_count')::integer,2,'adia a série atomicamente');
select is((select count(*) from public.events where series_id='fb164000-0000-4000-8000-000000000001' and professional_schedule_state='postponed'),2::bigint,'atualiza todas as ocorrências');
select is((public.apply_event_batch_operation('fb161000-0000-4000-8000-000000000001',(select payload from series_preview),'fb165000-0000-4000-8000-000000000002')->>'replayed')::boolean,true,'replay da série não reaplica');

create temporary table cancel_preview as select public.preview_event_batch_operation(
  'fb161000-0000-4000-8000-000000000001',array['fb162000-0000-4000-8000-000000000003'::uuid],
  'cancel','{}','selected'
) || jsonb_build_object('payload','{}'::jsonb) payload;
select is((public.apply_event_batch_operation('fb161000-0000-4000-8000-000000000001',(select payload from cancel_preview),'fb165000-0000-4000-8000-000000000003')->>'applied_count')::integer,1,'cancela evento avulso');
select is((select status from public.events where id='fb162000-0000-4000-8000-000000000003'),'cancelled'::public.event_status,'preserva o evento cancelado');
select is((select count(*) from public.notification_outbox where team_id='fb161000-0000-4000-8000-000000000001'),0::bigint,'transições não criam comunicação');

create temporary table athlete_preview as select public.preview_athlete_review_batch(
  'fb161000-0000-4000-8000-000000000001',array['fb166000-0000-4000-8000-000000000001'::uuid,'fb166000-0000-4000-8000-000000000002'::uuid],'approve'
) || jsonb_build_object('payload','{"decision":"approve"}'::jsonb) payload;
select is((public.apply_athlete_review_batch('fb161000-0000-4000-8000-000000000001',(select payload from athlete_preview),'fb167000-0000-4000-8000-000000000001')->>'applied_count')::integer,2,'aprova dois cadastros');
select is((select count(*) from public.athletes where id in ('fb166000-0000-4000-8000-000000000001','fb166000-0000-4000-8000-000000000002') and status='active'),2::bigint,'ativa os dois atletas');
select is((select count(*) from public.event_attendance where athlete_id in ('fb166000-0000-4000-8000-000000000001','fb166000-0000-4000-8000-000000000002')),4::bigint,'inclui aprovados nos jogos futuros ainda agendados');
select is((public.apply_athlete_review_batch('fb161000-0000-4000-8000-000000000001',(select payload from athlete_preview),'fb167000-0000-4000-8000-000000000001')->>'replayed')::boolean,true,'replay de atletas não reaplica');
reset role;
select is((select count(*) from private.athlete_batch_commands where team_id='fb161000-0000-4000-8000-000000000001'),1::bigint,'ledger privado registra um comando');
select is((select count(*) from public.audit_logs where team_id='fb161000-0000-4000-8000-000000000001' and action='batch.athletes.reviewed'),1::bigint,'auditoria agregada não registra nomes');
set local role authenticated;
select set_config('request.jwt.claim.sub','fb160000-0000-4000-8000-000000000001',true);

create temporary table stale_athlete_preview as select public.preview_athlete_review_batch(
  'fb161000-0000-4000-8000-000000000001',array['fb166000-0000-4000-8000-000000000003'::uuid],'reject'
) || jsonb_build_object('payload','{"decision":"reject"}'::jsonb) payload;
reset role;
set local session_replication_role = replica;
update public.athletes set updated_at=now()+interval '1 second' where id='fb166000-0000-4000-8000-000000000003';
set local session_replication_role = origin;
set local role authenticated;
select set_config('request.jwt.claim.sub','fb160000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.apply_athlete_review_batch('fb161000-0000-4000-8000-000000000001',(select payload from stale_athlete_preview),'fb167000-0000-4000-8000-000000000002')$$,'55000','O cadastro mudou desde a prévia','versão obsoleta bloqueia atletas');
select is((select status from public.athletes where id='fb166000-0000-4000-8000-000000000003'),'pending'::public.athlete_status,'falha mantém cadastro pendente');

reset role;
update public.team_feature_flags set enabled=false where team_id='fb161000-0000-4000-8000-000000000001' and feature='batch_operations';
set local role authenticated;
select set_config('request.jwt.claim.sub','fb160000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.apply_athlete_review_batch('fb161000-0000-4000-8000-000000000001',(select payload from stale_athlete_preview),'fb167000-0000-4000-8000-000000000003')$$,'42501','Operações em lote indisponíveis','kill switch bloqueia atletas');
select is((select count(*) from public.audit_logs where team_id='fb161000-0000-4000-8000-000000000001' and action='batch.events.applied'),3::bigint,'três operações válidas de eventos foram auditadas');
select is((select count(*) from public.event_changes where team_id='fb161000-0000-4000-8000-000000000001'),4::bigint,'cada jogo alterado tem mudança versionada');

select * from finish();
rollback;
