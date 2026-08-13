begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(41);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','c9100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-public@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','c9100000-0000-4000-8000-000000000002','authenticated','authenticated','manager-public@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','c9100000-0000-4000-8000-000000000003','authenticated','authenticated','outsider-public@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id, name, slug, created_by) values
  ('c9200000-0000-4000-8000-000000000001','Página A','pagina-a','c9100000-0000-4000-8000-000000000001'),
  ('c9200000-0000-4000-8000-000000000002','Página B','pagina-b','c9100000-0000-4000-8000-000000000003');
insert into public.team_memberships(team_id, user_id, role, status, invited_by)
values ('c9200000-0000-4000-8000-000000000001','c9100000-0000-4000-8000-000000000002','manager','active','c9100000-0000-4000-8000-000000000001');
insert into public.team_feature_flags(team_id, feature, enabled, updated_by) values
  ('c9200000-0000-4000-8000-000000000001','championships',true,'c9100000-0000-4000-8000-000000000001'),
  ('c9200000-0000-4000-8000-000000000001','public_event_page',true,'c9100000-0000-4000-8000-000000000001'),
  ('c9200000-0000-4000-8000-000000000001','event_matches',true,'c9100000-0000-4000-8000-000000000001'),
  ('c9200000-0000-4000-8000-000000000002','championships',true,'c9100000-0000-4000-8000-000000000003');

select ok(has_function_privilege(
  'anon', 'public.get_public_championship(uuid)', 'execute'
), 'anon executa somente a projeção pública');
select ok(not has_function_privilege(
  'anon', 'public.set_championship_public_mode(uuid,uuid,public.championship_public_mode)', 'execute'
), 'anon não altera publicação');
select ok(not has_table_privilege(
  'anon', 'public.championships', 'select'
), 'anon não lê a tabela de campeonatos');
select ok(not has_table_privilege(
  'authenticated', 'public.championships', 'update'
), 'authenticated não atualiza modo diretamente');

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.create_championship_draft(
    'c9200000-0000-4000-8000-000000000001','c9400000-0000-4000-8000-000000000001',
    'Liga Pública','league',3::smallint,1::smallint,0::smallint,
    array['wins','goal_difference','goals_for','head_to_head']::public.championship_tiebreak_key[],null::smallint,null::smallint);
  select public.add_championship_participant((select id from public.championships where name='Liga Pública'),'c9400000-0000-4000-8000-000000000002',1::smallint,null::smallint,null,'Verde FC','#059669','shield');
  select public.add_championship_participant((select id from public.championships where name='Liga Pública'),'c9400000-0000-4000-8000-000000000003',2::smallint,null::smallint,null,'Azul EC','#2563EB','stripes');
$$, 'owner cria liga e snapshots públicos estreitos');
select lives_ok($$
  select public.generate_league_fixtures((select id from public.championships where name='Liga Pública'),'c9400000-0000-4000-8000-000000000004');
  select public.publish_league_championship((select id from public.championships where name='Liga Pública'),'c9400000-0000-4000-8000-000000000005');
$$, 'owner gera e publica a grade interna');
reset role;
select set_config('test.league_public_id',(select public_id::text from public.championships where name='Liga Pública'),true);

set local role anon;
select is(public.get_public_championship(current_setting('test.league_public_id')::uuid),null::jsonb,'campeonato nasce sem página pública');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000002',true);
select throws_ok($$
  select public.set_championship_public_mode((select id from public.championships where name='Liga Pública'),'c9400000-0000-4000-8000-000000000006','public')
$$,'42501',null,'manager não publica a página do campeonato');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.set_championship_public_mode((select id from public.championships where name='Liga Pública'),'c9400000-0000-4000-8000-000000000007','public')
$$,'owner publica a página por RPC');
select is((public.set_championship_public_mode((select id from public.championships where name='Liga Pública'),'c9400000-0000-4000-8000-000000000007','public')).replayed,true,'retry da publicação reutiliza o recibo');
reset role;

set local role anon;
select isnt(public.get_public_championship(current_setting('test.league_public_id')::uuid),null::jsonb,'anon recebe campeonato publicado');
select is((select count(*) from jsonb_object_keys(public.get_public_championship(current_setting('test.league_public_id')::uuid))),4::bigint,'projeção possui somente quatro blocos públicos');
select is(jsonb_array_length(public.get_public_championship(current_setting('test.league_public_id')::uuid)->'participants'),2,'projeção mostra dois participantes');
select is(jsonb_array_length(public.get_public_championship(current_setting('test.league_public_id')::uuid)->'standings'),2,'classificação pública nasce com dois participantes');
select is(jsonb_array_length(public.get_public_championship(current_setting('test.league_public_id')::uuid)->'fixtures'),1,'grade pública mostra um confronto');
select ok(public.get_public_championship(current_setting('test.league_public_id')::uuid)::text !~ '"(team_id|championship_id|participant_id|match_id|event_id|internal_team_id|created_by|updated_by|resolution_reason)"','projeção não contém IDs internos nem autoria');
reset role;

insert into public.venues(id,team_id,name,address) values
  ('c9300000-0000-4000-8000-000000000001','c9200000-0000-4000-8000-000000000001','Quadra Segredo','Rua Privada 123');
insert into public.events(id,team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,venue_id,status,created_by)
values ('c9500000-0000-4000-8000-000000000001','c9200000-0000-4000-8000-000000000001','Evento Segredo','championship','split_teams','society',now()-interval '2 hours',now()-interval '1 hour','c9300000-0000-4000-8000-000000000001','completed','c9100000-0000-4000-8000-000000000001');
insert into public.event_matches(id,event_id,team_id,ordinal,status,public_mode,created_by)
values ('c9600000-0000-4000-8000-000000000001','c9500000-0000-4000-8000-000000000001','c9200000-0000-4000-8000-000000000001',1,'scheduled','private','c9100000-0000-4000-8000-000000000001');
insert into public.match_sides(match_id,event_id,team_id,side_index,label) values
  ('c9600000-0000-4000-8000-000000000001','c9500000-0000-4000-8000-000000000001','c9200000-0000-4000-8000-000000000001',1,'A'),
  ('c9600000-0000-4000-8000-000000000001','c9500000-0000-4000-8000-000000000001','c9200000-0000-4000-8000-000000000001',2,'B');
select set_config('test.event_public_id',(select public_id::text from public.events where id='c9500000-0000-4000-8000-000000000001'),true);

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000002',true);
select lives_ok($$
  select public.link_championship_fixture_match((select fixture.id from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Liga Pública'),'c9400000-0000-4000-8000-000000000008','c9600000-0000-4000-8000-000000000001');
  select public.record_match_event('c9600000-0000-4000-8000-000000000001','goal',1::smallint,null,null,10::smallint,null,null);
  select public.finalize_event_match('c9600000-0000-4000-8000-000000000001');
  select public.set_match_public_mode('c9600000-0000-4000-8000-000000000001','final_result');
$$,'manager opera a súmula e autoriza o placar final');
reset role;

set local role anon;
select is(public.get_public_championship(current_setting('test.league_public_id')::uuid)#>>'{fixtures,0,score_one}','1','placar autorizado mostra gols do lado um');
select is(public.get_public_championship(current_setting('test.league_public_id')::uuid)#>>'{fixtures,0,score_two}','0','placar autorizado mostra zero do lado dois');
select is(public.get_public_championship(current_setting('test.league_public_id')::uuid)#>>'{fixtures,0,event_public_id}',current_setting('test.event_public_id'),'link usa somente o ID público do evento');
select is((select max((standing->>'points')::integer) from jsonb_array_elements(public.get_public_championship(current_setting('test.league_public_id')::uuid)->'standings') standing),3,'classificação reflete a súmula finalizada');
select ok(public.get_public_championship(current_setting('test.league_public_id')::uuid)::text !~ 'Rua Privada 123|Evento Segredo|manager-public@example.test','projeção não agrega local, título do evento ou contato');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000002',true);
select lives_ok($$ select public.set_match_public_mode('c9600000-0000-4000-8000-000000000001','private') $$,'manager recolhe o placar sem alterar a súmula');
reset role;
set local role anon;
select is(public.get_public_championship(current_setting('test.league_public_id')::uuid)#>'{fixtures,0,score_one}','null'::jsonb,'partida privada remove o placar da projeção');
select is(public.get_public_championship(current_setting('test.league_public_id')::uuid)#>'{fixtures,0,event_public_id}','null'::jsonb,'partida privada remove o link do evento');
select is((select max((standing->>'points')::integer) from jsonb_array_elements(public.get_public_championship(current_setting('test.league_public_id')::uuid)->'standings') standing),3,'recolher placar não falsifica a classificação publicada');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000002',true);
select public.set_match_public_mode('c9600000-0000-4000-8000-000000000001','final_result');
reset role;
update public.team_feature_flags set enabled=false where team_id='c9200000-0000-4000-8000-000000000001' and feature='public_event_page';
set local role anon;
select is(public.get_public_championship(current_setting('test.league_public_id')::uuid)#>'{fixtures,0,score_one}','null'::jsonb,'flag da página do evento também fecha placar e link');
reset role;
update public.team_feature_flags set enabled=true where team_id='c9200000-0000-4000-8000-000000000001' and feature='public_event_page';

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000003',true);
select is(public.get_public_championship(current_setting('test.league_public_id')::uuid)#>>'{championship,name}','Liga Pública','sessão de outro tenant recebe somente a mesma página anônima');
select is((select count(*) from public.championships),0::bigint,'RLS oculta a tabela-base de outro tenant');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000001',true);
select lives_ok($$ select public.set_championship_public_mode((select id from public.championships where name='Liga Pública'),'c9400000-0000-4000-8000-000000000009','private') $$,'owner recolhe a página');
reset role;
set local role anon;
select is(public.get_public_championship(current_setting('test.league_public_id')::uuid),null::jsonb,'recolhimento remove imediatamente a projeção');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000001',true);
select public.set_championship_public_mode((select id from public.championships where name='Liga Pública'),'c9400000-0000-4000-8000-000000000010','public');
reset role;
update public.team_feature_flags set enabled=false where team_id='c9200000-0000-4000-8000-000000000001' and feature='championships';
set local role anon;
select is(public.get_public_championship(current_setting('test.league_public_id')::uuid),null::jsonb,'flag championships desligada fecha a página anônima');
reset role;
update public.team_feature_flags set enabled=true where team_id='c9200000-0000-4000-8000-000000000001' and feature='championships';

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000001',true);
select lives_ok($$ select public.create_championship_draft('c9200000-0000-4000-8000-000000000001','c9700000-0000-4000-8000-000000000001','Rascunho Privado','knockout',3::smallint,1::smallint,0::smallint,array['wins']::public.championship_tiebreak_key[],null::smallint,null::smallint) $$,'owner cria outro rascunho');
select throws_ok($$ select public.set_championship_public_mode((select id from public.championships where name='Rascunho Privado'),'c9700000-0000-4000-8000-000000000002','public') $$,'55000',null,'rascunho nunca ganha página pública');

select lives_ok($$
  select public.create_championship_draft('c9200000-0000-4000-8000-000000000001','c9700000-0000-4000-8000-000000000003','Copa Pública','knockout',3::smallint,1::smallint,0::smallint,array['wins']::public.championship_tiebreak_key[],null::smallint,null::smallint);
  select public.add_championship_participant((select id from public.championships where name='Copa Pública'),'c9700000-0000-4000-8000-000000000004',1::smallint,null::smallint,null,'Seed Um','#059669','shield');
  select public.add_championship_participant((select id from public.championships where name='Copa Pública'),'c9700000-0000-4000-8000-000000000005',2::smallint,null::smallint,null,'Seed Dois','#2563EB','stripes');
  select public.add_championship_participant((select id from public.championships where name='Copa Pública'),'c9700000-0000-4000-8000-000000000006',3::smallint,null::smallint,null,'Seed Três','#D97706','diamond');
  select public.generate_championship_fixtures((select id from public.championships where name='Copa Pública'),'c9700000-0000-4000-8000-000000000007');
  select public.publish_championship_format((select id from public.championships where name='Copa Pública'),'c9700000-0000-4000-8000-000000000008');
  select public.set_championship_public_mode((select id from public.championships where name='Copa Pública'),'c9700000-0000-4000-8000-000000000009','public');
$$,'mata-mata com três seeds ganha projeção pública');
reset role;
select set_config('test.knockout_public_id',(select public_id::text from public.championships where name='Copa Pública'),true);
set local role anon;
select is(jsonb_array_length(public.get_public_championship(current_setting('test.knockout_public_id')::uuid)->'fixtures'),3,'chave pública mostra três confrontos');
select is((select count(*) from jsonb_array_elements(public.get_public_championship(current_setting('test.knockout_public_id')::uuid)->'fixtures') fixture where fixture->>'side_one_kind'='bye' or fixture->>'side_two_kind'='bye'),1::bigint,'chave pública representa o bye sem ID interno');
select is(jsonb_array_length(public.get_public_championship(current_setting('test.knockout_public_id')::uuid)->'standings'),0,'mata-mata direto não inventa classificação');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.create_championship_draft('c9200000-0000-4000-8000-000000000001','c9800000-0000-4000-8000-000000000001','Grupos Públicos','groups_knockout',3::smallint,1::smallint,0::smallint,array['wins','goal_difference']::public.championship_tiebreak_key[],2::smallint,1::smallint);
  select public.add_championship_participant((select id from public.championships where name='Grupos Públicos'),'c9800000-0000-4000-8000-000000000002',1::smallint,1::smallint,null,'A Um','#059669','shield');
  select public.add_championship_participant((select id from public.championships where name='Grupos Públicos'),'c9800000-0000-4000-8000-000000000003',2::smallint,1::smallint,null,'A Dois','#2563EB','stripes');
  select public.add_championship_participant((select id from public.championships where name='Grupos Públicos'),'c9800000-0000-4000-8000-000000000004',3::smallint,2::smallint,null,'B Um','#D97706','diamond');
  select public.add_championship_participant((select id from public.championships where name='Grupos Públicos'),'c9800000-0000-4000-8000-000000000005',4::smallint,2::smallint,null,'B Dois','#7C3AED','quarters');
  select public.generate_championship_fixtures((select id from public.championships where name='Grupos Públicos'),'c9800000-0000-4000-8000-000000000006');
  select public.publish_championship_format((select id from public.championships where name='Grupos Públicos'),'c9800000-0000-4000-8000-000000000007');
  select public.set_championship_public_mode((select id from public.championships where name='Grupos Públicos'),'c9800000-0000-4000-8000-000000000008','public');
$$,'fase de grupos ganha projeção pública');
reset role;
select set_config('test.groups_public_id',(select public_id::text from public.championships where name='Grupos Públicos'),true);
set local role anon;
select is(jsonb_array_length(public.get_public_championship(current_setting('test.groups_public_id')::uuid)->'standings'),4,'projeção de grupos mostra quatro linhas');
select is((select count(distinct (standing->>'group_number')::integer) from jsonb_array_elements(public.get_public_championship(current_setting('test.groups_public_id')::uuid)->'standings') standing),2::bigint,'classificação pública preserva dois grupos');
reset role;

select * from finish();
rollback;
