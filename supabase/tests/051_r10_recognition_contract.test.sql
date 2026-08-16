begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(61);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','b0100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-r10-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','b0100000-0000-4000-8000-000000000002','authenticated','authenticated','athlete-r10-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','b0100000-0000-4000-8000-000000000003','authenticated','authenticated','owner-r10-b@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','b0100000-0000-4000-8000-000000000004','authenticated','authenticated','athlete-r10-b@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id, name, slug, created_by) values
  ('b0200000-0000-4000-8000-000000000001','Reconhecimento A','reconhecimento-a','b0100000-0000-4000-8000-000000000001'),
  ('b0200000-0000-4000-8000-000000000002','Reconhecimento B','reconhecimento-b','b0100000-0000-4000-8000-000000000003');

insert into public.player_profiles(
  user_id, handle, display_name, preferred_name, is_public, phone_verified_at
) values
  ('b0100000-0000-4000-8000-000000000002','atleta-r10-a','Atleta R10 A','Atleta A',true,now()),
  ('b0100000-0000-4000-8000-000000000004','atleta-r10-b','Atleta R10 B','Atleta B',true,now());

insert into public.athletes(
  id, team_id, user_id, full_name, preferred_name, status, registration_source, created_by
) values
  ('b0300000-0000-4000-8000-000000000001','b0200000-0000-4000-8000-000000000001','b0100000-0000-4000-8000-000000000002','Atleta Principal','Principal','active','public_form','b0100000-0000-4000-8000-000000000001'),
  ('b0300000-0000-4000-8000-000000000002','b0200000-0000-4000-8000-000000000001',null,'Atleta Companheiro','Companheiro','active','admin','b0100000-0000-4000-8000-000000000001'),
  ('b0300000-0000-4000-8000-000000000003','b0200000-0000-4000-8000-000000000002','b0100000-0000-4000-8000-000000000004','Atleta Outro Time','Outro Time','active','public_form','b0100000-0000-4000-8000-000000000003'),
  ('b0300000-0000-4000-8000-000000000004','b0200000-0000-4000-8000-000000000002',null,'Companheiro Outro Time','Outro Companheiro','active','admin','b0100000-0000-4000-8000-000000000003');

select ok(
  'recognition' = any(enum_range(null::public.feature_key)::text[]),
  'flag recognition existe no catálogo tipado'
);
select ok(
  'public_recognition_summary_v1' = any(enum_range(null::public.athlete_public_consent_purpose)::text[]),
  'finalidade pública própria existe no catálogo de consentimento'
);
select is_deeply(
  enum_range(null::public.recognition_kind)::text[],
  array['goal_recorded','assist_recorded','crowd_star']::text[],
  'recognition-v1 contém somente três categorias factuais'
);
select is(
  (select count(*) from public.team_feature_flags where feature='recognition'),
  0::bigint,
  'expansão não cria flag para nenhum time'
);
select is(
  (select count(*) from private.team_recognition_activations),
  0::bigint,
  'expansão não ativa reconhecimento implicitamente'
);
select ok(
  not has_function_privilege('anon','public.get_my_recognitions()','execute'),
  'anon não acessa a projeção privada'
);
select ok(
  has_function_privilege('authenticated','public.get_my_recognitions()','execute'),
  'authenticated pode chamar a projeção protegida'
);
select ok(
  has_function_privilege('anon','public.get_public_recognition_summary(text)','execute'),
  'anon pode consultar somente o resumo consentido'
);
select ok(
  not has_function_privilege('anon','public.set_public_recognition_summary_consent(uuid,boolean,text,uuid)','execute'),
  'anon não altera consentimento'
);
select ok(
  has_function_privilege('authenticated','public.set_public_recognition_summary_consent(uuid,boolean,text,uuid)','execute'),
  'authenticated pode chamar a RPC protegida de consentimento'
);
select ok(
  not has_table_privilege('authenticated','private.team_recognition_activations','select'),
  'cliente não lê o marco interno de ativação'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000002',true);
select is(
  (select count(*) from public.get_my_recognitions()),
  0::bigint,
  'flag desligada mantém a projeção privada vazia'
);
select throws_ok(
  $$select public.set_public_recognition_summary_consent('b0300000-0000-4000-8000-000000000001',true,'r10-v1','b0800000-0000-4000-8000-000000000001')$$,
  '55000',
  null,
  'flag desligada impede consentimento antecipado'
);

select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000001',true);
select lives_ok(
  $$select public.set_team_feature_flag('b0200000-0000-4000-8000-000000000001','recognition',true)$$,
  'owner ativa recognition no primeiro time'
);
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000003',true);
select lives_ok(
  $$select public.set_team_feature_flag('b0200000-0000-4000-8000-000000000002','recognition',true)$$,
  'owner ativa recognition no segundo time'
);
reset role;

select is(
  (select count(*) from private.team_recognition_activations),
  2::bigint,
  'cada primeira ativação cria um único marco'
);
select is(
  (select activated_by from private.team_recognition_activations where team_id='b0200000-0000-4000-8000-000000000001'),
  'b0100000-0000-4000-8000-000000000001'::uuid,
  'marco registra o owner que ativou a capacidade'
);

update private.team_recognition_activations
set activated_at = now() - interval '1 hour';
select set_config(
  'test.r10_activation_a',
  (select activated_at::text from private.team_recognition_activations where team_id='b0200000-0000-4000-8000-000000000001'),
  true
);

insert into public.events(
  id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, created_by
) values
  ('b0400000-0000-4000-8000-000000000001','b0200000-0000-4000-8000-000000000001','Jogo reconhecido','weekly_match','split_teams','society',now()-interval '3 hours',now()-interval '2 hours',now()-interval '4 hours','scheduled','b0100000-0000-4000-8000-000000000001'),
  ('b0400000-0000-4000-8000-000000000002','b0200000-0000-4000-8000-000000000001','Jogo anterior','weekly_match','split_teams','society',now()-interval '6 hours',now()-interval '5 hours',now()-interval '7 hours','scheduled','b0100000-0000-4000-8000-000000000001'),
  ('b0400000-0000-4000-8000-000000000003','b0200000-0000-4000-8000-000000000002','Jogo de outro time','weekly_match','split_teams','society',now()-interval '3 hours',now()-interval '2 hours',now()-interval '4 hours','scheduled','b0100000-0000-4000-8000-000000000003'),
  ('b0400000-0000-4000-8000-000000000004','b0200000-0000-4000-8000-000000000001','Craque ainda aberto','weekly_match','split_teams','society',now()-interval '3 hours',now()-interval '2 hours',now()-interval '4 hours','scheduled','b0100000-0000-4000-8000-000000000001');

insert into public.event_matches(
  id, event_id, team_id, ordinal, status, public_mode,
  finalized_at, finalized_by, craque_voting_closes_at, created_by
) values
  ('b0500000-0000-4000-8000-000000000001','b0400000-0000-4000-8000-000000000001','b0200000-0000-4000-8000-000000000001',1,'finalized','private',now()-interval '30 minutes','b0100000-0000-4000-8000-000000000001',now()-interval '10 minutes','b0100000-0000-4000-8000-000000000001'),
  ('b0500000-0000-4000-8000-000000000002','b0400000-0000-4000-8000-000000000002','b0200000-0000-4000-8000-000000000001',1,'finalized','private',now()-interval '2 hours','b0100000-0000-4000-8000-000000000001',null,'b0100000-0000-4000-8000-000000000001'),
  ('b0500000-0000-4000-8000-000000000003','b0400000-0000-4000-8000-000000000003','b0200000-0000-4000-8000-000000000002',1,'finalized','private',now()-interval '30 minutes','b0100000-0000-4000-8000-000000000003',null,'b0100000-0000-4000-8000-000000000003'),
  ('b0500000-0000-4000-8000-000000000004','b0400000-0000-4000-8000-000000000004','b0200000-0000-4000-8000-000000000001',1,'finalized','private',now()-interval '20 minutes','b0100000-0000-4000-8000-000000000001',now()+interval '1 hour','b0100000-0000-4000-8000-000000000001');

insert into public.match_sides(id,match_id,event_id,team_id,side_index,label) values
  ('b0600000-0000-4000-8000-000000000001','b0500000-0000-4000-8000-000000000001','b0400000-0000-4000-8000-000000000001','b0200000-0000-4000-8000-000000000001',1,'Verde'),
  ('b0600000-0000-4000-8000-000000000002','b0500000-0000-4000-8000-000000000001','b0400000-0000-4000-8000-000000000001','b0200000-0000-4000-8000-000000000001',2,'Branco'),
  ('b0600000-0000-4000-8000-000000000003','b0500000-0000-4000-8000-000000000002','b0400000-0000-4000-8000-000000000002','b0200000-0000-4000-8000-000000000001',1,'Antigo A'),
  ('b0600000-0000-4000-8000-000000000004','b0500000-0000-4000-8000-000000000002','b0400000-0000-4000-8000-000000000002','b0200000-0000-4000-8000-000000000001',2,'Antigo B'),
  ('b0600000-0000-4000-8000-000000000005','b0500000-0000-4000-8000-000000000003','b0400000-0000-4000-8000-000000000003','b0200000-0000-4000-8000-000000000002',1,'Outro A'),
  ('b0600000-0000-4000-8000-000000000006','b0500000-0000-4000-8000-000000000003','b0400000-0000-4000-8000-000000000003','b0200000-0000-4000-8000-000000000002',2,'Outro B'),
  ('b0600000-0000-4000-8000-000000000007','b0500000-0000-4000-8000-000000000004','b0400000-0000-4000-8000-000000000004','b0200000-0000-4000-8000-000000000001',1,'Aberto A'),
  ('b0600000-0000-4000-8000-000000000008','b0500000-0000-4000-8000-000000000004','b0400000-0000-4000-8000-000000000004','b0200000-0000-4000-8000-000000000001',2,'Aberto B');

insert into public.match_participations(
  match_id,event_id,team_id,athlete_id,side_id,created_by
) values
  ('b0500000-0000-4000-8000-000000000001','b0400000-0000-4000-8000-000000000001','b0200000-0000-4000-8000-000000000001','b0300000-0000-4000-8000-000000000001','b0600000-0000-4000-8000-000000000001','b0100000-0000-4000-8000-000000000001'),
  ('b0500000-0000-4000-8000-000000000001','b0400000-0000-4000-8000-000000000001','b0200000-0000-4000-8000-000000000001','b0300000-0000-4000-8000-000000000002','b0600000-0000-4000-8000-000000000001','b0100000-0000-4000-8000-000000000001'),
  ('b0500000-0000-4000-8000-000000000002','b0400000-0000-4000-8000-000000000002','b0200000-0000-4000-8000-000000000001','b0300000-0000-4000-8000-000000000001','b0600000-0000-4000-8000-000000000003','b0100000-0000-4000-8000-000000000001'),
  ('b0500000-0000-4000-8000-000000000003','b0400000-0000-4000-8000-000000000003','b0200000-0000-4000-8000-000000000002','b0300000-0000-4000-8000-000000000003','b0600000-0000-4000-8000-000000000005','b0100000-0000-4000-8000-000000000003'),
  ('b0500000-0000-4000-8000-000000000004','b0400000-0000-4000-8000-000000000004','b0200000-0000-4000-8000-000000000001','b0300000-0000-4000-8000-000000000001','b0600000-0000-4000-8000-000000000007','b0100000-0000-4000-8000-000000000001');

insert into public.match_events(
  id,match_id,event_id,team_id,kind,side_id,athlete_id,assist_athlete_id,created_by
) values
  ('b0700000-0000-4000-8000-000000000001','b0500000-0000-4000-8000-000000000001','b0400000-0000-4000-8000-000000000001','b0200000-0000-4000-8000-000000000001','goal','b0600000-0000-4000-8000-000000000001','b0300000-0000-4000-8000-000000000001','b0300000-0000-4000-8000-000000000002','b0100000-0000-4000-8000-000000000001'),
  ('b0700000-0000-4000-8000-000000000002','b0500000-0000-4000-8000-000000000001','b0400000-0000-4000-8000-000000000001','b0200000-0000-4000-8000-000000000001','goal','b0600000-0000-4000-8000-000000000001','b0300000-0000-4000-8000-000000000002','b0300000-0000-4000-8000-000000000001','b0100000-0000-4000-8000-000000000001'),
  ('b0700000-0000-4000-8000-000000000003','b0500000-0000-4000-8000-000000000002','b0400000-0000-4000-8000-000000000002','b0200000-0000-4000-8000-000000000001','goal','b0600000-0000-4000-8000-000000000003','b0300000-0000-4000-8000-000000000001',null,'b0100000-0000-4000-8000-000000000001'),
  ('b0700000-0000-4000-8000-000000000004','b0500000-0000-4000-8000-000000000003','b0400000-0000-4000-8000-000000000003','b0200000-0000-4000-8000-000000000002','goal','b0600000-0000-4000-8000-000000000005','b0300000-0000-4000-8000-000000000003',null,'b0100000-0000-4000-8000-000000000003');

insert into public.craque_votes(
  id,match_id,team_id,voter_hash,candidate_athlete_id,receipt_token_hash
) values
  ('b0900000-0000-4000-8000-000000000001','b0500000-0000-4000-8000-000000000001','b0200000-0000-4000-8000-000000000001',repeat('a',64),'b0300000-0000-4000-8000-000000000001',repeat('b',64)),
  ('b0900000-0000-4000-8000-000000000002','b0500000-0000-4000-8000-000000000004','b0200000-0000-4000-8000-000000000001',repeat('c',64),'b0300000-0000-4000-8000-000000000001',repeat('d',64));

set local role authenticated;
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.get_my_recognitions()),3::bigint,'titular recebe gol, assistência e Craque fechado');
select set_eq(
  $$select kind::text from public.get_my_recognitions()$$,
  $$values ('goal_recorded'),('assist_recorded'),('crowd_star')$$,
  'projeção privada contém somente as três categorias esperadas'
);
select is((select count(distinct catalog_version) from public.get_my_recognitions()),1::bigint,'projeção usa uma única versão de catálogo');
select is((select min(catalog_version) from public.get_my_recognitions()),'recognition-v1','projeção identifica recognition-v1');
select is(
  (select count(*) from (select kind,source_id,count(*) from public.get_my_recognitions() group by kind,source_id having count(*)>1) duplicate),
  0::bigint,
  'fonte e categoria não geram cartão duplicado'
);
select is(
  (select count(*) from public.get_my_recognitions() where source_id='b0700000-0000-4000-8000-000000000003'),
  0::bigint,
  'partida finalizada antes da primeira ativação não é retroativa'
);
select is(
  (select count(*) from public.get_my_recognitions() where team_id='b0200000-0000-4000-8000-000000000002'),
  0::bigint,
  'sessão não recebe reconhecimento de outro tenant'
);
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000004',true);
select is((select count(*) from public.get_my_recognitions()),1::bigint,'atleta do outro tenant recebe somente o próprio gol');
reset role;

update public.match_events
set athlete_id='b0300000-0000-4000-8000-000000000002', assist_athlete_id=null
where id='b0700000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.get_my_recognitions()),2::bigint,'correção da fonte remove o gol do titular');
reset role;
update public.match_events
set athlete_id='b0300000-0000-4000-8000-000000000001', assist_athlete_id='b0300000-0000-4000-8000-000000000002'
where id='b0700000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.get_my_recognitions()),3::bigint,'restauração da fonte recompõe o gol sem duplicar');
reset role;

update public.event_matches set status='void' where id='b0500000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.get_my_recognitions()),0::bigint,'anulação da partida retira todos os cartões derivados');
reset role;
update public.event_matches set status='finalized' where id='b0500000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.get_my_recognitions()),3::bigint,'fonte finalizada recompõe a projeção reconstruível');
select is(
  (select jsonb_agg(to_jsonb(item) order by item.kind,item.source_id) from public.get_my_recognitions() item),
  (select jsonb_agg(to_jsonb(item) order by item.kind,item.source_id) from public.get_my_recognitions() item),
  'replay concorrente da leitura produz o mesmo conjunto'
);
reset role;

set local role anon;
select is((select count(*) from public.get_public_recognition_summary('atleta-r10-a')),0::bigint,'resumo público nasce vazio sem consentimento');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000001',true);
select throws_ok(
  $$select public.set_public_recognition_summary_consent('b0300000-0000-4000-8000-000000000001',true,'r10-v1','b0800000-0000-4000-8000-000000000002')$$,
  '42501',null,'staff não consente pela pessoa atleta'
);
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000004',true);
select throws_ok(
  $$select public.set_public_recognition_summary_consent('b0300000-0000-4000-8000-000000000001',true,'r10-v1','b0800000-0000-4000-8000-000000000003')$$,
  '42501',null,'pessoa de outro tenant não altera o consentimento'
);
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000002',true);
select lives_ok(
  $$select public.set_public_recognition_summary_consent('b0300000-0000-4000-8000-000000000001',true,'r10-v1','b0800000-0000-4000-8000-000000000004')$$,
  'titular concede consentimento próprio'
);
reset role;

select is(
  (select purpose::text from public.athlete_public_consents where athlete_id='b0300000-0000-4000-8000-000000000001' and purpose='public_recognition_summary_v1'),
  'public_recognition_summary_v1',
  'consentimento usa finalidade separada e versionada'
);
select is(
  (select status from public.athlete_public_consents where athlete_id='b0300000-0000-4000-8000-000000000001' and purpose='public_recognition_summary_v1'),
  'granted'::public.consent_status,
  'consentimento fica concedido pelo titular'
);

set local role anon;
select is((select count(*) from public.get_public_recognition_summary('atleta-r10-a')),3::bigint,'resumo consentido publica três categorias agregadas');
select is((select sum(recognition_count) from public.get_public_recognition_summary('atleta-r10-a')),3::numeric,'resumo público soma somente os três cartões consentidos');
select ok(
  not ((select to_jsonb(summary) from public.get_public_recognition_summary('atleta-r10-a') summary limit 1) ?| array['team_id','athlete_id','source_id','match_id','event_id','event_title','recognized_at']),
  'resumo público não contém time, pessoa, partida, evento ou data'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000002',true);
select lives_ok(
  $$select public.set_public_recognition_summary_consent('b0300000-0000-4000-8000-000000000001',false,'r10-v1','b0800000-0000-4000-8000-000000000005')$$,
  'titular revoga consentimento'
);
reset role;
set local role anon;
select is((select count(*) from public.get_public_recognition_summary('atleta-r10-a')),0::bigint,'revogação retira imediatamente o resumo público');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000002',true);
select lives_ok(
  $$select public.set_public_recognition_summary_consent('b0300000-0000-4000-8000-000000000001',true,'r10-v1','b0800000-0000-4000-8000-000000000006')$$,
  'titular pode conceder novamente sem criar outra finalidade'
);
reset role;
update public.player_profiles set is_public=false where user_id='b0100000-0000-4000-8000-000000000002';
set local role anon;
select is((select count(*) from public.get_public_recognition_summary('atleta-r10-a')),0::bigint,'perfil privado não ganha superfície por consentimento isolado');
reset role;
update public.player_profiles set is_public=true where user_id='b0100000-0000-4000-8000-000000000002';
set local role anon;
select is((select count(*) from public.get_public_recognition_summary('atleta-r10-a')),3::bigint,'perfil público recompõe somente o resumo consentido');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000001',true);
select lives_ok(
  $$select public.set_team_feature_flag('b0200000-0000-4000-8000-000000000001','recognition',false)$$,
  'owner desliga recognition como rollback'
);
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.get_my_recognitions()),0::bigint,'rollback pela flag fecha a projeção privada');
reset role;
set local role anon;
select is((select count(*) from public.get_public_recognition_summary('atleta-r10-a')),0::bigint,'rollback pela flag fecha também o resumo público');
reset role;
select is((select count(*) from public.match_events where team_id='b0200000-0000-4000-8000-000000000001'),3::bigint,'rollback preserva fatos esportivos');
select is((select count(*) from public.craque_votes where team_id='b0200000-0000-4000-8000-000000000001'),2::bigint,'rollback preserva votos anônimos');

set local role authenticated;
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000001',true);
select lives_ok(
  $$select public.set_team_feature_flag('b0200000-0000-4000-8000-000000000001','recognition',true)$$,
  'owner reativa recognition'
);
reset role;
select is(
  (select activated_at::text from private.team_recognition_activations where team_id='b0200000-0000-4000-8000-000000000001'),
  current_setting('test.r10_activation_a'),
  'reativação preserva o primeiro marco não retroativo'
);
select is(
  (select count(*) from private.team_recognition_activations where team_id='b0200000-0000-4000-8000-000000000001'),
  1::bigint,
  'retry de ativação não duplica o marco'
);
set local role authenticated;
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.get_my_recognitions()),3::bigint,'reativação recompõe a projeção sem duplicar');
select throws_ok(
  $$select public.set_public_recognition_summary_consent('b0300000-0000-4000-8000-000000000001',true,'versão inválida','b0800000-0000-4000-8000-000000000007')$$,
  '22023',null,'versão de consentimento inválida é rejeitada'
);
select throws_ok(
  $$select public.set_public_recognition_summary_consent('b0300000-0000-4000-8000-000000000001',null,'r10-v1','b0800000-0000-4000-8000-000000000008')$$,
  '22023',null,'estado de consentimento nulo é rejeitado'
);
reset role;
set local role anon;
select is((select count(*) from public.get_public_recognition_summary('handle-inexistente')),0::bigint,'handle inexistente falha fechado sem revelar perfil');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.get_my_recognitions() where kind='crowd_star'),1::bigint,'votação ainda aberta não cria Craque');
reset role;
update public.event_matches set craque_voting_closes_at=now()-interval '1 minute' where id='b0500000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub','b0100000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.get_my_recognitions() where kind='crowd_star'),2::bigint,'fechamento da votação projeta o novo Craque agregado');
select is((select count(*) from public.get_my_recognitions()),4::bigint,'novo resultado fechado acrescenta um único cartão');
reset role;

select is(
  (select count(*) from public.audit_logs where action in ('privacy.recognition_summary.granted','privacy.recognition_summary.revoked')),
  3::bigint,
  'concessões e revogação deixam auditoria sem duplicar comando'
);
select is(
  (select count(*) from public.audit_logs where action like 'privacy.recognition_summary.%' and metadata::text like '%Atleta%'),
  0::bigint,
  'auditoria de consentimento não registra nome da pessoa'
);

select * from finish();
rollback;
