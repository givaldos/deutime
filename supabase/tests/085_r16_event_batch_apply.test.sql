begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(18);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','fa160000-0000-4000-8000-000000000001','authenticated','authenticated','batch-apply-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fa160000-0000-4000-8000-000000000002','authenticated','authenticated','batch-apply-b@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,timezone,created_by) values
  ('fa161000-0000-4000-8000-000000000001','Lote Apply A','lote-apply-a','America/Sao_Paulo','fa160000-0000-4000-8000-000000000001'),
  ('fa161000-0000-4000-8000-000000000002','Lote Apply B','lote-apply-b','America/Sao_Paulo','fa160000-0000-4000-8000-000000000002');
insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('fa161000-0000-4000-8000-000000000001','batch_operations',true,'fa160000-0000-4000-8000-000000000001'),
  ('fa161000-0000-4000-8000-000000000001','event_control',true,'fa160000-0000-4000-8000-000000000001'),
  ('fa161000-0000-4000-8000-000000000001','professional_scheduling',true,'fa160000-0000-4000-8000-000000000001'),
  ('fa161000-0000-4000-8000-000000000002','batch_operations',true,'fa160000-0000-4000-8000-000000000002'),
  ('fa161000-0000-4000-8000-000000000002','event_control',true,'fa160000-0000-4000-8000-000000000002'),
  ('fa161000-0000-4000-8000-000000000002','professional_scheduling',true,'fa160000-0000-4000-8000-000000000002');

insert into public.events(
  id,team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,
  attendance_deadline,status,created_by
) values
  ('fa162000-0000-4000-8000-000000000001','fa161000-0000-4000-8000-000000000001','Jogo A1','friendly','single_squad','society',now()+interval '10 days',now()+interval '10 days 1 hour',now()+interval '9 days','scheduled','fa160000-0000-4000-8000-000000000001'),
  ('fa162000-0000-4000-8000-000000000002','fa161000-0000-4000-8000-000000000001','Jogo A2','friendly','single_squad','society',now()+interval '11 days',now()+interval '11 days 1 hour',now()+interval '10 days','scheduled','fa160000-0000-4000-8000-000000000001'),
  ('fa162000-0000-4000-8000-000000000003','fa161000-0000-4000-8000-000000000002','Jogo B','friendly','single_squad','society',now()+interval '12 days',now()+interval '12 days 1 hour',now()+interval '11 days','scheduled','fa160000-0000-4000-8000-000000000002');

create temporary table original_batch_events as
select id, starts_at, ends_at from public.events
where team_id='fa161000-0000-4000-8000-000000000001';
grant select on original_batch_events to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub','fa160000-0000-4000-8000-000000000001',true);

create temporary table shift_preview as
select public.preview_event_batch_operation(
  'fa161000-0000-4000-8000-000000000001',
  array[
    'fa162000-0000-4000-8000-000000000001'::uuid,
    'fa162000-0000-4000-8000-000000000002'::uuid
  ], 'shift_time', '{"offset_minutes":60}', 'selected'
) || jsonb_build_object('payload','{"offset_minutes":60}'::jsonb) payload;

create temporary table shift_result as
select public.apply_event_batch_operation(
  'fa161000-0000-4000-8000-000000000001',
  (select payload from shift_preview),
  'fa165000-0000-4000-8000-000000000001'
) payload;

select is((payload->>'applied_count')::integer,2,'aplica os dois jogos') from shift_result;
select is((payload->>'replayed')::boolean,false,'primeira aplicação não é replay') from shift_result;
select is((select starts_at from public.events where id='fa162000-0000-4000-8000-000000000001'),
  (select starts_at+interval '60 minutes' from original_batch_events where id='fa162000-0000-4000-8000-000000000001'),
  'desloca o primeiro horário');
select is((select starts_at from public.events where id='fa162000-0000-4000-8000-000000000002'),
  (select starts_at+interval '60 minutes' from original_batch_events where id='fa162000-0000-4000-8000-000000000002'),
  'desloca o segundo horário');
select is((select count(*) from public.events where team_id='fa161000-0000-4000-8000-000000000001' and schedule_version=2),2::bigint,
  'incrementa a versão de todos os jogos');
select is((select count(*) from public.event_changes where team_id='fa161000-0000-4000-8000-000000000001'),2::bigint,
  'grava uma mudança versionada por jogo');
select is((select count(*) from public.audit_logs where team_id='fa161000-0000-4000-8000-000000000001' and action='event.batch_updated'),1::bigint,
  'grava auditoria agregada sem nomes');
select is((select count(*) from public.notification_outbox where team_id='fa161000-0000-4000-8000-000000000001'),0::bigint,
  'não cria comunicação implícita');

select is((public.apply_event_batch_operation(
  'fa161000-0000-4000-8000-000000000001',
  (select payload from shift_preview),
  'fa165000-0000-4000-8000-000000000001'
)->>'replayed')::boolean,true,'replay devolve o resultado gravado');
select is((select count(*) from public.event_changes where team_id='fa161000-0000-4000-8000-000000000001'),2::bigint,
  'replay não duplica mudanças');

create temporary table duration_preview as
select public.preview_event_batch_operation(
  'fa161000-0000-4000-8000-000000000001',
  array['fa162000-0000-4000-8000-000000000001'::uuid],
  'set_duration','{"duration_minutes":90}','selected'
) || jsonb_build_object('payload','{"duration_minutes":90}'::jsonb) payload;
select is((public.apply_event_batch_operation(
  'fa161000-0000-4000-8000-000000000001',
  (select payload from duration_preview),
  'fa165000-0000-4000-8000-000000000002'
)->>'applied_count')::integer,1,'aplica duração uniforme');
select is((select ends_at-starts_at from public.events where id='fa162000-0000-4000-8000-000000000001'),
  interval '90 minutes','preserva início e define duração');

select throws_ok($$select public.apply_event_batch_operation(
  'fa161000-0000-4000-8000-000000000001',
  (select jsonb_set(payload,'{payload,duration_minutes}','120'::jsonb) from duration_preview),
  'fa165000-0000-4000-8000-000000000002'
)$$,'22023','Request id já usado com outro conteúdo','request id não aceita conteúdo diferente');

create temporary table stale_preview as
select public.preview_event_batch_operation(
  'fa161000-0000-4000-8000-000000000001',
  array[
    'fa162000-0000-4000-8000-000000000001'::uuid,
    'fa162000-0000-4000-8000-000000000002'::uuid
  ], 'shift_time', '{"offset_minutes":30}', 'selected'
) || jsonb_build_object('payload','{"offset_minutes":30}'::jsonb) payload;
reset role;
update public.events set schedule_version=schedule_version+1
where id='fa162000-0000-4000-8000-000000000002';
create temporary table before_stale_apply as
select id,starts_at from public.events where team_id='fa161000-0000-4000-8000-000000000001';
grant select on before_stale_apply to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','fa160000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.apply_event_batch_operation(
  'fa161000-0000-4000-8000-000000000001',
  (select payload from stale_preview),
  'fa165000-0000-4000-8000-000000000003'
)$$,'55000','A agenda mudou; confira uma nova prévia','versão divergente bloqueia o lote');
select is((select starts_at from public.events where id='fa162000-0000-4000-8000-000000000001'),
  (select starts_at from before_stale_apply where id='fa162000-0000-4000-8000-000000000001'),
  'falha preserva o primeiro jogo atomicamente');

select throws_ok($$select public.preview_event_batch_operation(
  'fa161000-0000-4000-8000-000000000001',
  array['fa162000-0000-4000-8000-000000000003'::uuid],
  'shift_time','{"offset_minutes":30}','selected'
)$$,'42501','Seleção de eventos indisponível','prévia cross-tenant falha fechado');

reset role;
update public.team_feature_flags set enabled=false
where team_id='fa161000-0000-4000-8000-000000000001' and feature='batch_operations';
set local role authenticated;
select set_config('request.jwt.claim.sub','fa160000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.apply_event_batch_operation(
  'fa161000-0000-4000-8000-000000000001',
  (select payload from duration_preview),
  'fa165000-0000-4000-8000-000000000004'
)$$,'42501','Operações em lote indisponíveis','kill switch bloqueia nova confirmação');
select is((select count(*) from public.audit_logs where team_id='fa161000-0000-4000-8000-000000000001' and action='event.batch_updated'),2::bigint,
  'somente aplicações válidas geram auditoria');

select * from finish();
rollback;
