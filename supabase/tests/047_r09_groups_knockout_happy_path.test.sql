begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(63);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','f9100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-bracket-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f9100000-0000-4000-8000-000000000002','authenticated','authenticated','manager-bracket-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f9100000-0000-4000-8000-000000000003','authenticated','authenticated','owner-bracket-b@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id, name, slug, created_by) values
  ('f9200000-0000-4000-8000-000000000001','Chaves A','chaves-a','f9100000-0000-4000-8000-000000000001'),
  ('f9200000-0000-4000-8000-000000000002','Chaves B','chaves-b','f9100000-0000-4000-8000-000000000003');
insert into public.team_memberships(team_id, user_id, role, status, invited_by)
values ('f9200000-0000-4000-8000-000000000001','f9100000-0000-4000-8000-000000000002','manager','active','f9100000-0000-4000-8000-000000000001');
insert into public.team_feature_flags(team_id, feature, enabled, updated_by) values
  ('f9200000-0000-4000-8000-000000000001','championships',true,'f9100000-0000-4000-8000-000000000001'),
  ('f9200000-0000-4000-8000-000000000002','championships',true,'f9100000-0000-4000-8000-000000000003');

select ok(not has_function_privilege(
  'anon', 'public.generate_championship_fixtures(uuid,uuid)', 'execute'
), 'anon não gera grupos nem chave');
select ok(not has_function_privilege(
  'anon', 'public.publish_championship_format(uuid,uuid)', 'execute'
), 'anon não publica formatos eliminatórios');
select ok(not has_function_privilege(
  'anon', 'public.resolve_championship_knockout_fixture(uuid,uuid,uuid,public.championship_fixture_resolution,text)', 'execute'
), 'anon não decide vencedor');
select ok(not has_function_privilege(
  'anon', 'public.release_championship_fixture_match(uuid,uuid,text)', 'execute'
), 'anon não libera partida para remarcação');
select ok(not has_function_privilege(
  'anon', 'public.withdraw_championship_participant(uuid,uuid,text)', 'execute'
), 'anon não retira participante');
select ok(not has_table_privilege(
  'authenticated', 'public.championship_qualification_decisions', 'insert'
), 'decisão de vaga não aceita escrita direta');

set local role authenticated;
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.create_championship_draft(
    'f9200000-0000-4000-8000-000000000001',
    'f9400000-0000-4000-8000-000000000001',
    'Copa dos Grupos', 'groups_knockout', 3::smallint, 1::smallint, 0::smallint,
    array['wins','goal_difference','goals_for','head_to_head']::public.championship_tiebreak_key[],
    2::smallint, 1::smallint
  )
$$, 'owner cria campeonato com dois grupos');
select lives_ok($$
  select public.add_championship_participant((select id from public.championships where name='Copa dos Grupos'),'f9400000-0000-4000-8000-000000000002',1::smallint,1::smallint,null,'Grupo A 1','#059669','shield');
  select public.add_championship_participant((select id from public.championships where name='Copa dos Grupos'),'f9400000-0000-4000-8000-000000000003',2::smallint,1::smallint,null,'Grupo A 2','#2563EB','stripes');
  select public.add_championship_participant((select id from public.championships where name='Copa dos Grupos'),'f9400000-0000-4000-8000-000000000004',3::smallint,2::smallint,null,'Grupo B 1','#D97706','diamond');
  select public.add_championship_participant((select id from public.championships where name='Copa dos Grupos'),'f9400000-0000-4000-8000-000000000005',4::smallint,2::smallint,null,'Grupo B 2','#7C3AED','quarters');
$$, 'participantes recebem grupo explícito no banco');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000002',true);
select throws_ok($$
  select public.generate_championship_fixtures(
    (select id from public.championships where name='Copa dos Grupos'),
    'f9400000-0000-4000-8000-000000000006'
  )
$$, '42501', null, 'manager não gera fase nem altera regulamento');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.generate_championship_fixtures(
    (select id from public.championships where name='Copa dos Grupos'),
    'f9400000-0000-4000-8000-000000000007'
  )
$$, 'owner gera fase de grupos reproduzível');
reset role;
select is((select count(*) from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa dos Grupos'),2::bigint,'dois grupos de dois geram dois jogos');
select is((select count(distinct fixture.group_number) from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa dos Grupos'),2::bigint,'cada grupo mantém grade independente');

set local role authenticated;
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000001',true);
select is((public.generate_championship_fixtures((select id from public.championships where name='Copa dos Grupos'),'f9400000-0000-4000-8000-000000000007')).replayed,true,'retry da geração de grupos preserva a grade');
select lives_ok($$
  select public.publish_championship_format((select id from public.championships where name='Copa dos Grupos'),'f9400000-0000-4000-8000-000000000008')
$$, 'publicação valida a fase completa');
reset role;

insert into public.events(id,team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,status,created_by)
values ('fa500000-0000-4000-8000-000000000001','f9200000-0000-4000-8000-000000000001','Grupos','championship','split_teams','society',now()-interval '2 hours',now()-interval '1 hour','completed','f9100000-0000-4000-8000-000000000001');
insert into public.event_matches(id,event_id,team_id,ordinal,status,public_mode,created_by) values
  ('fa600000-0000-4000-8000-000000000001','fa500000-0000-4000-8000-000000000001','f9200000-0000-4000-8000-000000000001',1,'scheduled','private','f9100000-0000-4000-8000-000000000001'),
  ('fa600000-0000-4000-8000-000000000002','fa500000-0000-4000-8000-000000000001','f9200000-0000-4000-8000-000000000001',2,'scheduled','private','f9100000-0000-4000-8000-000000000001');
insert into public.match_sides(match_id,event_id,team_id,side_index,label) values
  ('fa600000-0000-4000-8000-000000000001','fa500000-0000-4000-8000-000000000001','f9200000-0000-4000-8000-000000000001',1,'A'),
  ('fa600000-0000-4000-8000-000000000001','fa500000-0000-4000-8000-000000000001','f9200000-0000-4000-8000-000000000001',2,'B'),
  ('fa600000-0000-4000-8000-000000000002','fa500000-0000-4000-8000-000000000001','f9200000-0000-4000-8000-000000000001',1,'A'),
  ('fa600000-0000-4000-8000-000000000002','fa500000-0000-4000-8000-000000000001','f9200000-0000-4000-8000-000000000001',2,'B');

set local role authenticated;
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000002',true);
select lives_ok($$
  select public.link_championship_fixture_match((select fixture.id from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa dos Grupos' order by fixture.ordinal limit 1),'f9400000-0000-4000-8000-000000000009','fa600000-0000-4000-8000-000000000001');
  select public.link_championship_fixture_match((select fixture.id from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa dos Grupos' order by fixture.ordinal offset 1 limit 1),'f9400000-0000-4000-8000-000000000010','fa600000-0000-4000-8000-000000000002');
  select public.finalize_event_match('fa600000-0000-4000-8000-000000000001');
  select public.finalize_event_match('fa600000-0000-4000-8000-000000000002');
$$, 'manager vincula e encerra os jogos dos grupos');
select is((select count(*) from public.get_championship_group_standings((select id from public.championships where name='Copa dos Grupos')) where rank_position=1),4::bigint,'empates absolutos compartilham posição em cada grupo');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000001',true);
select throws_ok($$
  select public.advance_championship_groups((select id from public.championships where name='Copa dos Grupos'),'f9400000-0000-4000-8000-000000000011')
$$, '22023', null, 'vaga absolutamente empatada falha fechada sem decisão');
select lives_ok($$
  select public.decide_championship_qualifier((select id from public.championships where name='Copa dos Grupos'),'f9400000-0000-4000-8000-000000000012',1::smallint,1::smallint,(select id from public.championship_participants where snapshot_name='Grupo A 1'),'Confronto de desempate definido pela organização')
$$, 'owner registra classificado do grupo A com motivo');
select lives_ok($$
  select public.decide_championship_qualifier((select id from public.championships where name='Copa dos Grupos'),'f9400000-0000-4000-8000-000000000013',2::smallint,1::smallint,(select id from public.championship_participants where snapshot_name='Grupo B 1'),'Confronto de desempate definido pela organização')
$$, 'owner registra classificado do grupo B com motivo');
select lives_ok($$
  select public.advance_championship_groups((select id from public.championships where name='Copa dos Grupos'),'f9400000-0000-4000-8000-000000000014')
$$, 'classificados alimentam uma chave eliminatória');
reset role;
select is((select count(*) from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa dos Grupos' and fixture.stage='knockout'),1::bigint,'dois classificados geram final única');

set local role authenticated;
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000001',true);
select is((public.advance_championship_groups((select id from public.championships where name='Copa dos Grupos'),'f9400000-0000-4000-8000-000000000015')).replayed,true,'segundo avanço converge sem duplicar chave');
select lives_ok($$
  select public.create_championship_draft('f9200000-0000-4000-8000-000000000001','f9400000-0000-4000-8000-000000000016','Copa Eliminatória','knockout',3::smallint,1::smallint,0::smallint,array['wins','goal_difference','goals_for','head_to_head']::public.championship_tiebreak_key[],null::smallint,null::smallint)
$$, 'owner cria mata-mata direto');
select lives_ok($$
  select public.add_championship_participant((select id from public.championships where name='Copa Eliminatória'),'f9400000-0000-4000-8000-000000000017',1::smallint,null::smallint,null,'Seed 1','#059669','shield');
  select public.add_championship_participant((select id from public.championships where name='Copa Eliminatória'),'f9400000-0000-4000-8000-000000000018',2::smallint,null::smallint,null,'Seed 2','#2563EB','stripes');
  select public.add_championship_participant((select id from public.championships where name='Copa Eliminatória'),'f9400000-0000-4000-8000-000000000019',3::smallint,null::smallint,null,'Seed 3','#D97706','diamond');
  select public.add_championship_participant((select id from public.championships where name='Copa Eliminatória'),'f9400000-0000-4000-8000-000000000020',4::smallint,null::smallint,null,'Seed 4','#7C3AED','quarters');
  select public.add_championship_participant((select id from public.championships where name='Copa Eliminatória'),'f9400000-0000-4000-8000-000000000021',5::smallint,null::smallint,null,'Seed 5','#DC2626','circle');
$$, 'cinco seeds entram no mata-mata');
select lives_ok($$
  select public.generate_championship_fixtures((select id from public.championships where name='Copa Eliminatória'),'f9400000-0000-4000-8000-000000000022')
$$, 'geração cria chave completa com byes');
reset role;
select is((select count(*) from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa Eliminatória'),7::bigint,'cinco participantes ocupam chave de oito com sete confrontos');
select is((select count(*) from public.championship_fixture_slots slot join public.championships championship on championship.id=slot.championship_id where championship.name='Copa Eliminatória' and slot.kind='bye'),3::bigint,'três byes completam a primeira fase');
select is((select count(*) from public.championship_fixture_slots slot join public.championships championship on championship.id=slot.championship_id where championship.name='Copa Eliminatória' and slot.kind='winner'),6::bigint,'rodadas seguintes dependem de seis vencedores sem duplicar confronto');

set local role authenticated;
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.publish_championship_format((select id from public.championships where name='Copa Eliminatória'),'f9400000-0000-4000-8000-000000000023')
$$, 'publicação mantém byes como avanço auditado');
reset role;
select is((select count(*) from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa Eliminatória' and fixture.status='finalized'),3::bigint,'somente os três byes nascem finalizados');

insert into public.events(id,team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,status,created_by)
values ('fb500000-0000-4000-8000-000000000001','f9200000-0000-4000-8000-000000000001','Mata-mata','championship','split_teams','society',now()-interval '2 hours',now()+interval '1 hour','scheduled','f9100000-0000-4000-8000-000000000001');
insert into public.event_matches(id,event_id,team_id,ordinal,status,public_mode,created_by) values
  ('fb600000-0000-4000-8000-000000000001','fb500000-0000-4000-8000-000000000001','f9200000-0000-4000-8000-000000000001',1,'scheduled','private','f9100000-0000-4000-8000-000000000001'),
  ('fb600000-0000-4000-8000-000000000002','fb500000-0000-4000-8000-000000000001','f9200000-0000-4000-8000-000000000001',2,'scheduled','private','f9100000-0000-4000-8000-000000000001'),
  ('fb600000-0000-4000-8000-000000000003','fb500000-0000-4000-8000-000000000001','f9200000-0000-4000-8000-000000000001',3,'scheduled','private','f9100000-0000-4000-8000-000000000001');
insert into public.match_sides(match_id,event_id,team_id,side_index,label)
select match.id, match.event_id, match.team_id, side_index, 'Lado '||side_index
from public.event_matches match cross join generate_series(1,2) side_index
where match.event_id='fb500000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.link_championship_fixture_match((select fixture.id from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa Eliminatória' and fixture.round_number=1 and fixture.winner_participant_id is null),'f9400000-0000-4000-8000-000000000024','fb600000-0000-4000-8000-000000000001');
  select public.record_match_event('fb600000-0000-4000-8000-000000000001','goal',1::smallint,null,null,10::smallint,null,null);
  select public.finalize_event_match('fb600000-0000-4000-8000-000000000001');
  select public.resolve_championship_knockout_fixture((select fixture.id from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa Eliminatória' and fixture.match_id='fb600000-0000-4000-8000-000000000001'),'f9400000-0000-4000-8000-000000000025',null,null,null);
$$, 'placar não empatado resolve o vencedor sem escolha do navegador');
select is((select resolution::text from public.championship_fixtures where match_id='fb600000-0000-4000-8000-000000000001'),'score','resultado comum mantém o placar como resolução');

select lives_ok($$
  select public.link_championship_fixture_match((select dependent.id from public.championship_fixture_slots source_slot join public.championship_fixtures source_fixture on source_fixture.id=source_slot.source_fixture_id join public.championship_fixtures dependent on dependent.id=source_slot.fixture_id where source_fixture.match_id='fb600000-0000-4000-8000-000000000001'),'f9400000-0000-4000-8000-000000000026','fb600000-0000-4000-8000-000000000002');
  select public.finalize_event_match('fb600000-0000-4000-8000-000000000002');
$$, 'vencedor anterior libera o confronto dependente');
select throws_ok($$
  select public.resolve_championship_knockout_fixture((select id from public.championship_fixtures where match_id='fb600000-0000-4000-8000-000000000002'),'f9400000-0000-4000-8000-000000000027',null,null,null)
$$, '22023', null, 'empate eliminatório não avança implicitamente');
select lives_ok($$
  select public.resolve_championship_knockout_fixture(
    (select id from public.championship_fixtures where match_id='fb600000-0000-4000-8000-000000000002'),
    'f9400000-0000-4000-8000-000000000028',
    (select source.winner_participant_id from public.championship_fixture_slots slot join public.championship_fixtures source on source.id=slot.source_fixture_id where slot.fixture_id=(select id from public.championship_fixtures where match_id='fb600000-0000-4000-8000-000000000002') order by slot.side_index limit 1),
    'penalties','Vitória por pênaltis registrada pela organização')
$$, 'empate avança somente com vencedor e motivo');
select is((select count(*) from public.match_events where match_id='fb600000-0000-4000-8000-000000000002'),0::bigint,'decisão por pênaltis não inventa gols na súmula');

select lives_ok($$
  select public.resolve_championship_knockout_fixture(
    (select fixture.id from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa Eliminatória' and fixture.round_number=2 and fixture.match_id is null),
    'f9400000-0000-4000-8000-000000000029',
    (select source.winner_participant_id from public.championship_fixture_slots slot join public.championship_fixtures source on source.id=slot.source_fixture_id where slot.fixture_id=(select fixture.id from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa Eliminatória' and fixture.round_number=2 and fixture.match_id is null) order by slot.side_index limit 1),
    'walkover','Adversário não compareceu no horário publicado')
$$, 'W.O. avança com motivo sem criar placar');
select is((select resolution::text from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa Eliminatória' and fixture.round_number=2 and fixture.match_id is null),'walkover','W.O. permanece decisão explícita');

select lives_ok($$
  select public.link_championship_fixture_match((select fixture.id from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa Eliminatória' and fixture.round_number=3),'f9400000-0000-4000-8000-000000000030','fb600000-0000-4000-8000-000000000003')
$$, 'dois vencedores liberam a final');
select lives_ok($$
  select public.resolve_championship_knockout_fixture(
    (select id from public.championship_fixtures where match_id='fb600000-0000-4000-8000-000000000002'),
    'f9400000-0000-4000-8000-000000000031',
    (select source.winner_participant_id from public.championship_fixture_slots slot join public.championship_fixtures source on source.id=slot.source_fixture_id where slot.fixture_id=(select id from public.championship_fixtures where match_id='fb600000-0000-4000-8000-000000000002') and source.winner_participant_id<>(select winner_participant_id from public.championship_fixtures where match_id='fb600000-0000-4000-8000-000000000002') limit 1),
    'penalties','Retificação da disputa por pênaltis antes da final')
$$, 'correção propaga enquanto a final ainda não começou');
select ok((select bool_or(side.label=(select participant.snapshot_name from public.championship_fixtures semifinal join public.championship_participants participant on participant.id=semifinal.winner_participant_id where semifinal.match_id='fb600000-0000-4000-8000-000000000002')) from public.match_sides side where side.match_id='fb600000-0000-4000-8000-000000000003'),'snapshot da final acompanha correção segura');
select lives_ok($$
  select public.record_match_event('fb600000-0000-4000-8000-000000000003','goal',1::smallint,null,null,20::smallint,null,null)
$$, 'primeiro fato esportivo inicia a final');
select throws_ok($$
  select public.resolve_championship_knockout_fixture(
    (select id from public.championship_fixtures where match_id='fb600000-0000-4000-8000-000000000002'),
    'f9400000-0000-4000-8000-000000000032',
    (select source.winner_participant_id from public.championship_fixture_slots slot join public.championship_fixtures source on source.id=slot.source_fixture_id where slot.fixture_id=(select id from public.championship_fixtures where match_id='fb600000-0000-4000-8000-000000000002') and source.winner_participant_id<>(select winner_participant_id from public.championship_fixtures where match_id='fb600000-0000-4000-8000-000000000002') limit 1),
    'penalties','Tentativa tardia de mudar a semifinal')
$$, '55000', null, 'correção falha fechada depois que a dependência começou');
reset role;

insert into public.events(id,team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,status,created_by)
values ('fc500000-0000-4000-8000-000000000001','f9200000-0000-4000-8000-000000000001','Final dos grupos','championship','split_teams','society',now()+interval '2 hours',now()+interval '3 hours','scheduled','f9100000-0000-4000-8000-000000000001');
insert into public.event_matches(id,event_id,team_id,ordinal,status,public_mode,created_by) values
  ('fc600000-0000-4000-8000-000000000001','fc500000-0000-4000-8000-000000000001','f9200000-0000-4000-8000-000000000001',1,'scheduled','private','f9100000-0000-4000-8000-000000000001'),
  ('fc600000-0000-4000-8000-000000000002','fc500000-0000-4000-8000-000000000001','f9200000-0000-4000-8000-000000000001',2,'scheduled','private','f9100000-0000-4000-8000-000000000001');
insert into public.match_sides(match_id,event_id,team_id,side_index,label)
select match.id, match.event_id, match.team_id, side_index, 'Lado '||side_index
from public.event_matches match cross join generate_series(1,2) side_index
where match.event_id='fc500000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.link_championship_fixture_match(
    (select fixture.id from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa dos Grupos' and fixture.stage='knockout'),
    'f9400000-0000-4000-8000-000000000033','fc600000-0000-4000-8000-000000000001')
$$, 'final futura recebe a primeira partida');
select throws_ok($$
  select public.release_championship_fixture_match(
    (select fixture.id from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa dos Grupos' and fixture.stage='knockout'),
    'f9400000-0000-4000-8000-000000000038','x')
$$, '55000', null, 'remarcação exige motivo suficiente também na RPC');
select lives_ok($$
  select public.release_championship_fixture_match(
    (select fixture.id from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa dos Grupos' and fixture.stage='knockout'),
    'f9400000-0000-4000-8000-000000000034','Data alterada em acordo com as equipes')
$$, 'owner libera vínculo ainda futuro e sem fatos');
select is((select fixture.match_id from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa dos Grupos' and fixture.stage='knockout'),null::uuid,'remarcação desliga somente a partida do confronto');
select is((select count(*) from public.match_sides where match_id='fc600000-0000-4000-8000-000000000001' and label in ('Time A','Time B') and external_snapshot is null),2::bigint,'partida liberada perde snapshots do campeonato');
select is((public.release_championship_fixture_match(
  (select fixture.id from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa dos Grupos' and fixture.stage='knockout'),
  'f9400000-0000-4000-8000-000000000034','Data alterada em acordo com as equipes')).replayed,true,'retry da remarcação reutiliza o recibo');
select lives_ok($$
  select public.link_championship_fixture_match(
    (select fixture.id from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id where championship.name='Copa dos Grupos' and fixture.stage='knockout'),
    'f9400000-0000-4000-8000-000000000035','fc600000-0000-4000-8000-000000000002')
$$, 'final aceita novo agendamento depois da liberação');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000002',true);
select throws_ok($$
  select public.withdraw_championship_participant(
    (select id from public.championship_participants where snapshot_name='Grupo A 1'),
    'f9400000-0000-4000-8000-000000000036','Equipe desistiu da competição')
$$, '42501', null, 'manager não retira participante publicado');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000001',true);
select throws_ok($$
  select public.withdraw_championship_participant(
    (select id from public.championship_participants where snapshot_name='Grupo A 1'),
    'f9400000-0000-4000-8000-000000000039','x')
$$, '55000', null, 'retirada exige motivo suficiente também na RPC');
select lives_ok($$
  select public.withdraw_championship_participant(
    (select id from public.championship_participants where snapshot_name='Grupo A 1'),
    'f9400000-0000-4000-8000-000000000037','Equipe desistiu da competição')
$$, 'owner registra retirada antes do início da final');
select is((select status::text from public.championship_participants where snapshot_name='Grupo A 1'),'withdrawn','participante fica retirado sem ser apagado');
select is((select status::text from public.event_matches where id='fc600000-0000-4000-8000-000000000002'),'void','partida futura ligada fica anulada sem placar');
select is((select winner.snapshot_name from public.championship_fixtures fixture join public.championships championship on championship.id=fixture.championship_id join public.championship_participants winner on winner.id=fixture.winner_participant_id where championship.name='Copa dos Grupos' and fixture.stage='knockout'),'Grupo B 1','adversário avança por decisão administrativa de retirada');
select is((select count(*) from public.event_matches where id in ('fa600000-0000-4000-8000-000000000001','fa600000-0000-4000-8000-000000000002') and status='finalized'),2::bigint,'retirada preserva os dois resultados já concluídos dos grupos');
select is((select count(*) from public.match_events where match_id='fc600000-0000-4000-8000-000000000002'),0::bigint,'retirada não inventa ocorrência ou gol na partida futura');
select is((public.withdraw_championship_participant(
  (select id from public.championship_participants where snapshot_name='Grupo A 1'),
  'f9400000-0000-4000-8000-000000000037','Equipe desistiu da competição')).replayed,true,'retry da retirada reutiliza o recibo');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000003',true);
select throws_ok($$ select * from public.get_championship_group_standings((select id from public.championships where name='Copa dos Grupos')) $$,'42501',null,'outro tenant não lê classificação dos grupos');
select is((select count(*) from public.championship_qualification_decisions),0::bigint,'RLS oculta decisões do outro tenant');
reset role;

update public.team_feature_flags set enabled=false,updated_by='f9100000-0000-4000-8000-000000000001' where team_id='f9200000-0000-4000-8000-000000000001' and feature='championships';
set local role authenticated;
select set_config('request.jwt.claim.sub','f9100000-0000-4000-8000-000000000001',true);
select throws_ok($$ select * from public.get_championship_group_standings((select id from public.championships where name='Copa dos Grupos')) $$,'55000',null,'flag desligada fecha a projeção nova');
reset role;
select ok(not exists(select 1 from information_schema.tables where table_schema='public' and table_name in ('championship_group_standings','championship_brackets')),'grupos e chave não criam contador esportivo independente');

select * from finish();
rollback;
