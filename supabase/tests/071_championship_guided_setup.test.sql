begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(29);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','f1100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-r15-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f1100000-0000-4000-8000-000000000002','authenticated','authenticated','manager-r15-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f1100000-0000-4000-8000-000000000003','authenticated','authenticated','owner-r15-b@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,created_by) values
  ('f1200000-0000-4000-8000-000000000001','Guiado A','guiado-a','f1100000-0000-4000-8000-000000000001'),
  ('f1200000-0000-4000-8000-000000000002','Guiado B','guiado-b','f1100000-0000-4000-8000-000000000003');

insert into public.team_memberships(team_id,user_id,role,status,invited_by) values
  ('f1200000-0000-4000-8000-000000000001','f1100000-0000-4000-8000-000000000002','manager','active','f1100000-0000-4000-8000-000000000001');

insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('f1200000-0000-4000-8000-000000000001','team_division',true,'f1100000-0000-4000-8000-000000000001'),
  ('f1200000-0000-4000-8000-000000000001','event_control',true,'f1100000-0000-4000-8000-000000000001'),
  ('f1200000-0000-4000-8000-000000000001','event_matches',true,'f1100000-0000-4000-8000-000000000001'),
  ('f1200000-0000-4000-8000-000000000001','championships',true,'f1100000-0000-4000-8000-000000000001'),
  ('f1200000-0000-4000-8000-000000000001','professional_scheduling',true,'f1100000-0000-4000-8000-000000000001');

insert into public.team_squad_presets(
  id,team_id,name,color,badge_key,sort_order,created_by,updated_by
) values
  ('f1300000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001','Verde','#0D9488','stripes',1,'f1100000-0000-4000-8000-000000000001','f1100000-0000-4000-8000-000000000001'),
  ('f1300000-0000-4000-8000-000000000002','f1200000-0000-4000-8000-000000000001','Azul','#2563EB','sash',2,'f1100000-0000-4000-8000-000000000001','f1100000-0000-4000-8000-000000000001');

insert into public.athletes(
  id,team_id,full_name,preferred_name,status,created_by
) values
  ('f1500000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001','Atleta Verde','Verde 10','active','f1100000-0000-4000-8000-000000000001'),
  ('f1500000-0000-4000-8000-000000000002','f1200000-0000-4000-8000-000000000001','Atleta Azul','Azul 9','active','f1100000-0000-4000-8000-000000000001'),
  ('f1500000-0000-4000-8000-000000000003','f1200000-0000-4000-8000-000000000001','Atleta Fora','Fora','inactive','f1100000-0000-4000-8000-000000000001'),
  ('f1500000-0000-4000-8000-000000000004','f1200000-0000-4000-8000-000000000002','Atleta Cruzado','Cruzado','active','f1100000-0000-4000-8000-000000000003');

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000001',true);
select public.create_championship_draft_v2(
  'f1200000-0000-4000-8000-000000000001','f1400000-0000-4000-8000-000000000001',
  'Liga Guiada','league',3::smallint,1::smallint,0::smallint,
  array['wins','goal_difference']::public.championship_tiebreak_key[],
  null::smallint,null::smallint,
  array['f1300000-0000-4000-8000-000000000001','f1300000-0000-4000-8000-000000000002']::uuid[]
);
select public.generate_league_fixtures(
  (select id from public.championships where name='Liga Guiada'),
  'f1400000-0000-4000-8000-000000000002'
);
reset role;

select has_table('public','championship_roster_assignments','convocações guiadas existem');
select ok((select relrowsecurity from pg_class where oid='public.championship_roster_assignments'::regclass),'convocações usam RLS');
select ok(has_table_privilege('authenticated','public.championship_roster_assignments','SELECT'),'staff autenticado pode ler por RLS');
select ok(not has_table_privilege('authenticated','public.championship_roster_assignments','INSERT'),'cliente não grava convocação diretamente');
select ok(has_function_privilege('authenticated','public.finish_championship_setup(uuid,uuid,jsonb,jsonb,public.sport_format,integer,integer,text,text)','EXECUTE'),'authenticated chama finalização protegida');
select ok(not has_function_privilege('anon','public.finish_championship_setup(uuid,uuid,jsonb,jsonb,public.sport_format,integer,integer,text,text)','EXECUTE'),'anon não finaliza campeonato');

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000001',true);
select is(public.is_championship_guided_setup_available(),true,'sessão autenticada detecta expansão disponível');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.finish_championship_setup(
  (select id from public.championships where name='Liga Guiada'),
  'f1400000-0000-4000-8000-000000000003',
  '[]','[]','society',90,1440,null,null
)$$,'42501',null,'manager não publica pelo assistente');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.finish_championship_setup(
  (select id from public.championships where name='Liga Guiada'),
  'f1400000-0000-4000-8000-000000000004',
  ('[{"participant_id":"'||(select id::text from public.championship_participants where snapshot_name='Verde')||'","athlete_id":"f1500000-0000-4000-8000-000000000001"}]')::jsonb,
  ('[{"fixture_id":"'||(select id::text from public.championship_fixtures where championship_id=(select id from public.championships where name='Liga Guiada'))||'","starts_at_local":"2030-09-10T19:00"}]')::jsonb,
  'society',90,1440,'Arena R15','Rua Um'
)$$,'22023',null,'todas as equipes internas precisam de convocado');

select throws_ok($$select public.finish_championship_setup(
  (select id from public.championships where name='Liga Guiada'),
  'f1400000-0000-4000-8000-000000000005',
  ('[{"participant_id":"'||(select id::text from public.championship_participants where snapshot_name='Verde')||'","athlete_id":"f1500000-0000-4000-8000-000000000001"},{"participant_id":"'||(select id::text from public.championship_participants where snapshot_name='Azul')||'","athlete_id":"f1500000-0000-4000-8000-000000000004"}]')::jsonb,
  ('[{"fixture_id":"'||(select id::text from public.championship_fixtures where championship_id=(select id from public.championships where name='Liga Guiada'))||'","starts_at_local":"2030-09-10T19:00"}]')::jsonb,
  'society',90,1440,'Arena R15','Rua Um'
)$$,'22023',null,'atleta de outro tenant é recusado');

select throws_ok($$select public.finish_championship_setup(
  (select id from public.championships where name='Liga Guiada'),
  'f1400000-0000-4000-8000-000000000006',
  ('[{"participant_id":"'||(select id::text from public.championship_participants where snapshot_name='Verde')||'","athlete_id":"f1500000-0000-4000-8000-000000000003"},{"participant_id":"'||(select id::text from public.championship_participants where snapshot_name='Azul')||'","athlete_id":"f1500000-0000-4000-8000-000000000002"}]')::jsonb,
  ('[{"fixture_id":"'||(select id::text from public.championship_fixtures where championship_id=(select id from public.championships where name='Liga Guiada'))||'","starts_at_local":"2030-09-10T19:00"}]')::jsonb,
  'society',90,1440,'Arena R15','Rua Um'
)$$,'22023',null,'atleta inativo é recusado');

select lives_ok($$select public.finish_championship_setup(
  (select id from public.championships where name='Liga Guiada'),
  'f1400000-0000-4000-8000-000000000007',
  ('[{"participant_id":"'||(select id::text from public.championship_participants where snapshot_name='Verde')||'","athlete_id":"f1500000-0000-4000-8000-000000000001"},{"participant_id":"'||(select id::text from public.championship_participants where snapshot_name='Azul')||'","athlete_id":"f1500000-0000-4000-8000-000000000002"}]')::jsonb,
  ('[{"fixture_id":"'||(select id::text from public.championship_fixtures where championship_id=(select id from public.championships where name='Liga Guiada'))||'","starts_at_local":"2030-09-10T19:00"}]')::jsonb,
  'society',90,1440,'Arena R15','Rua Um'
)$$,'owner conclui toda a jornada em uma transação');
reset role;

select is((select status::text from public.championships where name='Liga Guiada'),'published','campeonato termina publicado');
select is((select count(*) from public.events where title like 'Liga Guiada ·%'),1::bigint,'agenda recebe um evento');
select is((select count(*) from public.event_matches match join public.events event on event.id=match.event_id where event.title like 'Liga Guiada ·%'),1::bigint,'evento recebe uma partida');
select is((select count(*) from public.championship_fixtures where championship_id=(select id from public.championships where name='Liga Guiada') and match_id is not null),1::bigint,'confronto fica ligado à partida');
select is((select count(*) from public.match_participations participation join public.events event on event.id=participation.event_id where event.title like 'Liga Guiada ·%'),2::bigint,'convocados chegam à partida');
select is((select count(*) from public.event_attendance attendance join public.events event on event.id=attendance.event_id where event.title like 'Liga Guiada ·%'),2::bigint,'chamada contém somente convocados');
select is((select count(*) from public.championship_roster_assignments where championship_id=(select id from public.championships where name='Liga Guiada')),2::bigint,'convocação do campeonato é preservada');
select is((select string_agg(name,',' order by sort_order) from public.event_squads squad join public.events event on event.id=squad.event_id where event.title like 'Liga Guiada ·%'),'Verde,Azul','lados da agenda preservam as equipes');

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000001',true);
select is((public.finish_championship_setup(
  (select id from public.championships where name='Liga Guiada'),
  'f1400000-0000-4000-8000-000000000007',
  ('[{"participant_id":"'||(select id::text from public.championship_participants where snapshot_name='Verde')||'","athlete_id":"f1500000-0000-4000-8000-000000000001"},{"participant_id":"'||(select id::text from public.championship_participants where snapshot_name='Azul')||'","athlete_id":"f1500000-0000-4000-8000-000000000002"}]')::jsonb,
  ('[{"fixture_id":"'||(select id::text from public.championship_fixtures where championship_id=(select id from public.championships where name='Liga Guiada'))||'","starts_at_local":"2030-09-10T19:00"}]')::jsonb,
  'society',90,1440,'Arena R15','Rua Um'
)).replayed,true,'replay idêntico é sinalizado');
reset role;

select is((select count(*) from public.events where title like 'Liga Guiada ·%'),1::bigint,'replay não duplica agenda');

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.finish_championship_setup(
  (select id from public.championships where name='Liga Guiada'),
  'f1400000-0000-4000-8000-000000000007',
  ('[{"participant_id":"'||(select id::text from public.championship_participants where snapshot_name='Verde')||'","athlete_id":"f1500000-0000-4000-8000-000000000001"},{"participant_id":"'||(select id::text from public.championship_participants where snapshot_name='Azul')||'","athlete_id":"f1500000-0000-4000-8000-000000000002"}]')::jsonb,
  ('[{"fixture_id":"'||(select id::text from public.championship_fixtures where championship_id=(select id from public.championships where name='Liga Guiada'))||'","starts_at_local":"2030-09-11T19:00"}]')::jsonb,
  'society',90,1440,'Arena R15','Rua Um'
)$$,'22023',null,'replay com outra agenda é recusado');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000003',true);
select is((select count(*) from public.championship_roster_assignments where team_id='f1200000-0000-4000-8000-000000000001'),0::bigint,'RLS bloqueia leitura cross-tenant');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000001',true);
select public.create_championship_draft_v2(
  'f1200000-0000-4000-8000-000000000001','f1400000-0000-4000-8000-000000000008',
  'Liga Conflitante','league',3::smallint,1::smallint,0::smallint,
  array['wins']::public.championship_tiebreak_key[],null::smallint,null::smallint,
  array['f1300000-0000-4000-8000-000000000001','f1300000-0000-4000-8000-000000000002']::uuid[]
);
select public.generate_league_fixtures(
  (select id from public.championships where name='Liga Conflitante'),
  'f1400000-0000-4000-8000-000000000009'
);
select throws_ok($$select public.finish_championship_setup(
  (select id from public.championships where name='Liga Conflitante'),
  'f1400000-0000-4000-8000-000000000010',
  ('[{"participant_id":"'||(select id::text from public.championship_participants where championship_id=(select id from public.championships where name='Liga Conflitante') and snapshot_name='Verde')||'","athlete_id":"f1500000-0000-4000-8000-000000000001"},{"participant_id":"'||(select id::text from public.championship_participants where championship_id=(select id from public.championships where name='Liga Conflitante') and snapshot_name='Azul')||'","athlete_id":"f1500000-0000-4000-8000-000000000002"}]')::jsonb,
  ('[{"fixture_id":"'||(select id::text from public.championship_fixtures where championship_id=(select id from public.championships where name='Liga Conflitante'))||'","starts_at_local":"2030-09-10T19:00"}]')::jsonb,
  'society',90,1440,'Arena R15','Rua Um'
)$$,'55000',null,'conflito duro aborta a finalização');
reset role;

select is((select status::text from public.championships where name='Liga Conflitante'),'draft','falha devolve campeonato à configuração');
select is((select count(*) from public.events where title like 'Liga Conflitante ·%'),0::bigint,'falha não deixa evento parcial');
select is((select count(*) from public.championship_roster_assignments where championship_id=(select id from public.championships where name='Liga Conflitante')),0::bigint,'falha não deixa convocação parcial');
select is((select count(*) from public.audit_logs where action='championship.setup.finished' and metadata ? 'roster_count' and not metadata ? 'athlete_ids'),1::bigint,'auditoria registra somente contagens');

select * from finish();
rollback;
