begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(35);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','fe160000-0000-4000-8000-000000000001','authenticated','authenticated','owner-batch-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fe160000-0000-4000-8000-000000000002','authenticated','authenticated','manager-batch-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fe160000-0000-4000-8000-000000000003','authenticated','authenticated','owner-batch-b@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,timezone,created_by) values
  ('fe161000-0000-4000-8000-000000000001','Lote A','lote-a','America/Sao_Paulo','fe160000-0000-4000-8000-000000000001'),
  ('fe161000-0000-4000-8000-000000000002','Lote B','lote-b','America/Sao_Paulo','fe160000-0000-4000-8000-000000000003');
insert into public.team_memberships(team_id,user_id,role,status,invited_by) values (
  'fe161000-0000-4000-8000-000000000001','fe160000-0000-4000-8000-000000000002',
  'manager','active','fe160000-0000-4000-8000-000000000001'
);

select ok('batch_operations' = any(enum_range(null::public.feature_key)::text[]),
  'flag tipada de operações em lote existe');
select ok(not 'batch_operations' = any(array(
  select feature::text from private.product_feature_keys() feature
)), 'flag inerte não integra a herança global');
select is((select count(*) from public.team_feature_flags
  where feature='batch_operations'),0::bigint,
  'expansão não ativa a flag em nenhum time');

select has_function('public','preview_event_batch_operation',
  array['uuid','uuid[]','text','jsonb','text'], 'prévia de jogos existe');
select has_function('public','preview_athlete_review_batch',
  array['uuid','uuid[]','text'], 'prévia de atletas existe');
select has_function('public','apply_event_batch_operation',
  array['uuid','jsonb','uuid'], 'assinatura de confirmação de jogos existe');
select has_function('public','apply_athlete_review_batch',
  array['uuid','jsonb','uuid'], 'assinatura de confirmação de atletas existe');
select ok(has_function_privilege('authenticated',
  'public.preview_event_batch_operation(uuid,uuid[],text,jsonb,text)','execute'),
  'authenticated pode chamar a prévia protegida de jogos');
select ok(not has_function_privilege('anon',
  'public.preview_event_batch_operation(uuid,uuid[],text,jsonb,text)','execute'),
  'anônimo não chama a prévia de jogos');
select ok(has_function_privilege('authenticated',
  'public.preview_athlete_review_batch(uuid,uuid[],text)','execute'),
  'authenticated pode chamar a prévia protegida de atletas');
select ok(not has_function_privilege('anon',
  'public.preview_athlete_review_batch(uuid,uuid[],text)','execute'),
  'anônimo não chama a prévia de atletas');

select throws_ok($$select public.preview_event_batch_operation(
  'fe161000-0000-4000-8000-000000000001',
  array['fe162000-0000-4000-8000-000000000001'::uuid],
  'postpone'
)$$,'42501','Operações em lote indisponíveis','sessão ausente falha fechado');

set local role authenticated;
select set_config('request.jwt.claim.sub','fe160000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.preview_event_batch_operation(
  'fe161000-0000-4000-8000-000000000001',
  array['fe162000-0000-4000-8000-000000000001'::uuid],
  'postpone'
)$$,'42501','Operações em lote indisponíveis','flag desligada mantém edição individual');
reset role;

insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('fe161000-0000-4000-8000-000000000001','batch_operations',true,'fe160000-0000-4000-8000-000000000001'),
  ('fe161000-0000-4000-8000-000000000001','event_control',true,'fe160000-0000-4000-8000-000000000001'),
  ('fe161000-0000-4000-8000-000000000001','professional_scheduling',true,'fe160000-0000-4000-8000-000000000001'),
  ('fe161000-0000-4000-8000-000000000001','recognizable_roster',true,'fe160000-0000-4000-8000-000000000001'),
  ('fe161000-0000-4000-8000-000000000002','batch_operations',true,'fe160000-0000-4000-8000-000000000003'),
  ('fe161000-0000-4000-8000-000000000002','event_control',true,'fe160000-0000-4000-8000-000000000003'),
  ('fe161000-0000-4000-8000-000000000002','professional_scheduling',true,'fe160000-0000-4000-8000-000000000003'),
  ('fe161000-0000-4000-8000-000000000002','recognizable_roster',true,'fe160000-0000-4000-8000-000000000003');

insert into public.venues(id,team_id,name,address) values
  ('fe163000-0000-4000-8000-000000000001','fe161000-0000-4000-8000-000000000001','Campo A','Rua A'),
  ('fe163000-0000-4000-8000-000000000002','fe161000-0000-4000-8000-000000000002','Campo B','Rua B');
insert into public.events(
  id,team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,
  venue_id,status,created_by,cancelled_at,cancelled_by
) values
  ('fe162000-0000-4000-8000-000000000001','fe161000-0000-4000-8000-000000000001','Jogo elegível','friendly','single_squad','society',now()+interval '10 days',now()+interval '10 days 1 hour','fe163000-0000-4000-8000-000000000001','scheduled','fe160000-0000-4000-8000-000000000001',null,null),
  ('fe162000-0000-4000-8000-000000000002','fe161000-0000-4000-8000-000000000001','Jogo cancelado','friendly','single_squad','society',now()+interval '11 days',now()+interval '11 days 1 hour','fe163000-0000-4000-8000-000000000001','cancelled','fe160000-0000-4000-8000-000000000001',now(),'fe160000-0000-4000-8000-000000000001'),
  ('fe162000-0000-4000-8000-000000000003','fe161000-0000-4000-8000-000000000002','Segredo B','friendly','single_squad','society',now()+interval '12 days',now()+interval '12 days 1 hour','fe163000-0000-4000-8000-000000000002','scheduled','fe160000-0000-4000-8000-000000000003',null,null);
insert into public.athletes(
  id,team_id,full_name,preferred_name,status,registration_source,created_by
) values
  ('fe164000-0000-4000-8000-000000000001','fe161000-0000-4000-8000-000000000001','Ana Pendente','Ana','pending','admin','fe160000-0000-4000-8000-000000000001'),
  ('fe164000-0000-4000-8000-000000000002','fe161000-0000-4000-8000-000000000001','Bia Ativa','Bia','active','admin','fe160000-0000-4000-8000-000000000001'),
  ('fe164000-0000-4000-8000-000000000003','fe161000-0000-4000-8000-000000000002','Segredo B','Segredo','pending','admin','fe160000-0000-4000-8000-000000000003');

set local role authenticated;
select set_config('request.jwt.claim.sub','fe160000-0000-4000-8000-000000000001',true);
create temporary table event_batch_preview as select public.preview_event_batch_operation(
  'fe161000-0000-4000-8000-000000000001',
  array[
    'fe162000-0000-4000-8000-000000000001'::uuid,
    'fe162000-0000-4000-8000-000000000002'::uuid
  ], 'shift_time', '{"offset_minutes":60}', 'selected'
) payload;

select is((payload->>'item_count')::integer,2,'prévia resolve dois jogos') from event_batch_preview;
select is((payload->>'blocked_count')::integer,1,'prévia informa um impedimento') from event_batch_preview;
select is((payload->'items'->0->>'eligible')::boolean,true,'jogo futuro permanece elegível') from event_batch_preview;
select is(payload->'items'->1->>'blocker_code','not_upcoming','cancelado fica impedido') from event_batch_preview;
select is(char_length(payload->>'selection_hash'),64,'prévia devolve hash canônico') from event_batch_preview;
select ok((payload->>'expires_at')::timestamptz between
  (payload->>'previewed_at')::timestamptz + interval '14 minutes 59 seconds'
  and (payload->>'previewed_at')::timestamptz + interval '15 minutes 1 second',
  'prévia expira em quinze minutos') from event_batch_preview;
select is((select count(*) from public.event_changes),0::bigint,
  'prévia não grava alteração de evento');
select is((select starts_at from public.events where id='fe162000-0000-4000-8000-000000000001'),
  (select (payload->'items'->0->'before'->>'starts_at')::timestamptz from event_batch_preview),
  'prévia preserva o horário armazenado');
select ok(not (select payload::text like '%Segredo B%' from event_batch_preview),
  'prévia não expõe outro time');

select throws_ok($$select public.preview_event_batch_operation(
  'fe161000-0000-4000-8000-000000000001',
  array[
    'fe162000-0000-4000-8000-000000000001'::uuid,
    'fe162000-0000-4000-8000-000000000001'::uuid
  ], 'postpone'
)$$,'22023','A seleção contém registros repetidos','seleção repetida falha');
select throws_ok($$select public.preview_event_batch_operation(
  'fe161000-0000-4000-8000-000000000001',
  array(select gen_random_uuid() from generate_series(1,51)), 'postpone'
)$$,'22023','Seleção ou ação do lote inválida','mais de cinquenta falha');
select throws_ok($$select public.preview_event_batch_operation(
  'fe161000-0000-4000-8000-000000000001',
  array['fe162000-0000-4000-8000-000000000003'::uuid], 'postpone'
)$$,'42501','Seleção de eventos indisponível','evento cross-tenant falha fechado');
select throws_ok($$select public.preview_event_batch_operation(
  'fe161000-0000-4000-8000-000000000001',
  array['fe162000-0000-4000-8000-000000000001'::uuid],
  'set_venue','{"venue_id":"fe163000-0000-4000-8000-000000000002"}'
)$$,'22023','Local inválido','local cross-tenant falha fechado');
select throws_ok($$select public.preview_event_batch_operation(
  'fe161000-0000-4000-8000-000000000001',
  array['fe162000-0000-4000-8000-000000000001'::uuid],
  'postpone','{}','this_and_future'
)$$,'55000','Ocorrência não pertence a uma série','alcance de série exige série');
select throws_ok($$select public.apply_event_batch_operation(
  'fe161000-0000-4000-8000-000000000001',
  (select payload from event_batch_preview),
  'fe165000-0000-4000-8000-000000000001'
)$$,
  '22023','Prévia do lote inválida',
  'confirmação rejeita a prévia CP1 sem payload validado');

create temporary table athlete_batch_preview as select public.preview_athlete_review_batch(
  'fe161000-0000-4000-8000-000000000001',
  array[
    'fe164000-0000-4000-8000-000000000001'::uuid,
    'fe164000-0000-4000-8000-000000000002'::uuid
  ], 'approve'
) payload;
select is((payload->>'item_count')::integer,2,'prévia resolve dois atletas') from athlete_batch_preview;
select is((payload->>'blocked_count')::integer,1,'atleta fora de pending fica impedido') from athlete_batch_preview;
select is(payload->'items'->0->'after'->>'status','active','aprovação mostra estado futuro') from athlete_batch_preview;
select is((select status from public.athletes where id='fe164000-0000-4000-8000-000000000001'),
  'pending'::public.athlete_status,'prévia não aprova o cadastro');
select throws_ok($$select public.preview_athlete_review_batch(
  'fe161000-0000-4000-8000-000000000001',
  array['fe164000-0000-4000-8000-000000000003'::uuid], 'approve'
)$$,'42501','Seleção de atletas indisponível','atleta cross-tenant falha fechado');
select throws_ok($$select public.apply_athlete_review_batch(
  'fe161000-0000-4000-8000-000000000001',
  (select payload from athlete_batch_preview),
  'fe165000-0000-4000-8000-000000000002'
)$$,
  '22023','Prévia do lote inválida',
  'confirmação rejeita a prévia sem decisão validada');

select set_config('request.jwt.claim.sub','fe160000-0000-4000-8000-000000000002',true);
select is((public.preview_event_batch_operation(
  'fe161000-0000-4000-8000-000000000001',
  array['fe162000-0000-4000-8000-000000000001'::uuid],
  'set_duration','{"duration_minutes":90}'
)->>'item_count')::integer,1,'manager ativo usa a prévia sem ampliar papel');
reset role;

select * from finish();
rollback;
