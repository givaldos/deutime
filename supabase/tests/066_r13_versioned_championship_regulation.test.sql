begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(31);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','e6100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-r13-rules@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','e6100000-0000-4000-8000-000000000002','authenticated','authenticated','manager-r13-rules@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','e6100000-0000-4000-8000-000000000003','authenticated','authenticated','other-r13-rules@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,created_by) values
  ('e6200000-0000-4000-8000-000000000001','Regulamento A','regulamento-a','e6100000-0000-4000-8000-000000000001'),
  ('e6200000-0000-4000-8000-000000000002','Regulamento B','regulamento-b','e6100000-0000-4000-8000-000000000003');

insert into public.team_memberships(team_id,user_id,role,status,invited_by) values
  ('e6200000-0000-4000-8000-000000000001','e6100000-0000-4000-8000-000000000002','manager','active','e6100000-0000-4000-8000-000000000001');

insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('e6200000-0000-4000-8000-000000000001','championships',true,'e6100000-0000-4000-8000-000000000001'),
  ('e6200000-0000-4000-8000-000000000001','professional_scheduling',true,'e6100000-0000-4000-8000-000000000001'),
  ('e6200000-0000-4000-8000-000000000002','championships',true,'e6100000-0000-4000-8000-000000000003'),
  ('e6200000-0000-4000-8000-000000000002','professional_scheduling',true,'e6100000-0000-4000-8000-000000000003');

select has_table('public','championship_regulation_versions','versões de regulamento existem');
select ok((select relrowsecurity from pg_class where oid='public.championship_regulation_versions'::regclass),'versões usam RLS');
select ok(has_function_privilege('authenticated','public.update_championship_regulation(uuid,uuid,smallint,smallint,smallint,public.championship_tiebreak_key[])','EXECUTE'),'authenticated chama atualização protegida');
select ok(not has_function_privilege('anon','public.update_championship_regulation(uuid,uuid,smallint,smallint,smallint,public.championship_tiebreak_key[])','EXECUTE'),'anon não altera regulamento');
select ok(not has_table_privilege('authenticated','public.championship_regulation_versions','INSERT'),'cliente não grava versões diretamente');

set local role authenticated;
select set_config('request.jwt.claim.sub','e6100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.create_championship_draft(
    'e6200000-0000-4000-8000-000000000001',
    'e6300000-0000-4000-8000-000000000001',
    'Liga Versionada','league',3::smallint,1::smallint,0::smallint,
    array['wins','goal_difference','goals_for','head_to_head']::public.championship_tiebreak_key[],
    null::smallint,null::smallint
  );
  select public.add_championship_participant((select id from public.championships where name='Liga Versionada'),'e6300000-0000-4000-8000-000000000002',1::smallint,null::smallint,null,'Time A','#059669','shield');
  select public.add_championship_participant((select id from public.championships where name='Liga Versionada'),'e6300000-0000-4000-8000-000000000003',2::smallint,null::smallint,null,'Time B','#2563EB','stripes');
  select public.add_championship_participant((select id from public.championships where name='Liga Versionada'),'e6300000-0000-4000-8000-000000000004',3::smallint,null::smallint,null,'Time C','#D97706','diamond');
  select public.add_championship_participant((select id from public.championships where name='Liga Versionada'),'e6300000-0000-4000-8000-000000000005',4::smallint,null::smallint,null,'Time D','#7C3AED','quarters');
$$,'owner cria rascunho com quatro participantes');
select set_config('test.r13_regulation_championship_id',(select id::text from public.championships where name='Liga Versionada'),true);

select lives_ok($$select public.update_championship_regulation(
  (select id from public.championships where name='Liga Versionada'),
  'e6300000-0000-4000-8000-000000000006',3::smallint,1::smallint,0::smallint,
  array['wins','goals_for','goal_difference','head_to_head']::public.championship_tiebreak_key[]
)$$,'owner ordena todo o catálogo no rascunho');
select is((public.update_championship_regulation(
  (select id from public.championships where name='Liga Versionada'),
  'e6300000-0000-4000-8000-000000000006',3::smallint,1::smallint,0::smallint,
  array['wins','goals_for','goal_difference','head_to_head']::public.championship_tiebreak_key[]
)).replayed,true,'retry idêntico da edição é sinalizado');
select throws_ok($$select public.update_championship_regulation(
  (select id from public.championships where name='Liga Versionada'),
  'e6300000-0000-4000-8000-000000000006',3::smallint,1::smallint,0::smallint,
  array['head_to_head','wins','goals_for','goal_difference']::public.championship_tiebreak_key[]
)$$,'22023',null,'retry com ordem diferente é recusado');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','e6100000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.update_championship_regulation(
  (select id from public.championships where name='Liga Versionada'),
  'e6300000-0000-4000-8000-000000000007',3::smallint,1::smallint,0::smallint,
  array['wins','goals_for','goal_difference','head_to_head']::public.championship_tiebreak_key[]
)$$,'42501',null,'manager não altera regulamento');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','e6100000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.update_championship_regulation(
  current_setting('test.r13_regulation_championship_id')::uuid,
  'e6300000-0000-4000-8000-000000000008',3::smallint,1::smallint,0::smallint,
  array['wins','goals_for','goal_difference','head_to_head']::public.championship_tiebreak_key[]
)$$,'42501',null,'outro tenant não altera regulamento');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','e6100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.generate_league_fixtures((select id from public.championships where name='Liga Versionada'),'e6300000-0000-4000-8000-000000000009');
  select public.publish_league_championship((select id from public.championships where name='Liga Versionada'),'e6300000-0000-4000-8000-000000000010');
$$,'publicação captura a primeira versão');
reset role;

select is((select count(*) from public.championship_regulation_versions),1::bigint,'primeira publicação cria uma versão');
select is((select version_number from public.championship_regulation_versions),1::smallint,'primeira versão é numerada');
select ok((select regulation_version_id is not null from public.championships where name='Liga Versionada'),'campeonato referencia a versão aplicada');
select is((select tiebreak_order::text from public.championship_regulation_versions),'{wins,goals_for,goal_difference,head_to_head}','versão congela a ordem aplicada');
select throws_ok($$update public.championships set win_points=4 where name='Liga Versionada'$$,'55000',null,'regulamento publicado não sofre mutação silenciosa');

update public.championships set public_mode='public' where name='Liga Versionada';
select is((select concat_ws(':', state->>'format', state->>'win_points', state->>'draw_points', state->>'loss_points', (state->'tiebreak_order')::text)
  from (select public.get_public_championship((select public_id from public.championships where name='Liga Versionada'))->'championship' state) projection),
  'league:3:1:0:["wins", "goals_for", "goal_difference", "head_to_head"]',
  'projeção pública usa formato, pontuação e ordem da versão aplicada');

set local role authenticated;
select set_config('request.jwt.claim.sub','e6100000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.reopen_championship_regulation(
  (select id from public.championships where name='Liga Versionada'),
  'e6300000-0000-4000-8000-000000000011'
)$$,'owner recolhe antes do primeiro fato esportivo');
select is((public.reopen_championship_regulation(
  (select id from public.championships where name='Liga Versionada'),
  'e6300000-0000-4000-8000-000000000011'
)).replayed,true,'retry da reabertura é idempotente');
reset role;

select is((select status::text||':'||public_mode::text from public.championships where name='Liga Versionada'),'draft:private','reabertura recolhe a página e restaura rascunho');
select is((select count(*) from public.championship_regulation_versions),1::bigint,'reabertura preserva a versão anterior');

set local role authenticated;
select set_config('request.jwt.claim.sub','e6100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.update_championship_regulation(
    (select id from public.championships where name='Liga Versionada'),
    'e6300000-0000-4000-8000-000000000012',3::smallint,1::smallint,0::smallint,
    array['goal_difference','head_to_head','wins','goals_for']::public.championship_tiebreak_key[]
  );
  select public.publish_league_championship((select id from public.championships where name='Liga Versionada'),'e6300000-0000-4000-8000-000000000013');
$$,'nova publicação cria outra versão sobre a mesma URL');
reset role;

select is((select count(*) from public.championship_regulation_versions),2::bigint,'duas versões permanecem no histórico');
select is((select tiebreak_order::text from public.championship_regulation_versions where version_number=1),'{wins,goals_for,goal_difference,head_to_head}','versão anterior permanece imutável');
select is((select tiebreak_order::text from public.championship_regulation_versions where version_number=2),'{goal_difference,head_to_head,wins,goals_for}','nova versão recebe a ordem revisada');

-- Quatro equipes terminam com quatro pontos. D tem saldo -3; A, B e C têm
-- saldo +1 e chegam juntas ao confronto direto. O mini-torneio A/B/C dá
-- 4, 3 e 1 ponto, respectivamente.
insert into public.events(
  id,team_id,title,kind,organization_mode,sport_format,
  starts_at,ends_at,status,created_by
) values (
  'e6400000-0000-4000-8000-000000000001',
  'e6200000-0000-4000-8000-000000000001','Rodada completa','championship',
  'split_teams','society',now()-interval '2 hours',now()-interval '1 hour',
  'completed','e6100000-0000-4000-8000-000000000001'
);

create temporary table desired_scores(
  match_id uuid, ordinal smallint, seed_a smallint, seed_b smallint,
  score_a smallint, score_b smallint
) on commit drop;
insert into desired_scores values
  ('e6500000-0000-4000-8000-000000000001',1,1,2,2,0),
  ('e6500000-0000-4000-8000-000000000002',2,1,3,0,0),
  ('e6500000-0000-4000-8000-000000000003',3,2,3,3,0),
  ('e6500000-0000-4000-8000-000000000004',4,1,4,0,1),
  ('e6500000-0000-4000-8000-000000000005',5,2,4,0,0),
  ('e6500000-0000-4000-8000-000000000006',6,3,4,4,0);

insert into public.event_matches(
  id,event_id,team_id,ordinal,status,public_mode,created_by,finalized_at,finalized_by
)
select match_id,'e6400000-0000-4000-8000-000000000001',
  'e6200000-0000-4000-8000-000000000001',ordinal,'finalized','private',
  'e6100000-0000-4000-8000-000000000001',now(),
  'e6100000-0000-4000-8000-000000000001'
from desired_scores;

insert into public.match_sides(match_id,event_id,team_id,side_index,label)
select score.match_id,'e6400000-0000-4000-8000-000000000001',
  'e6200000-0000-4000-8000-000000000001',side_index,
  case side_index when 1 then 'Lado 1' else 'Lado 2' end
from desired_scores score cross join generate_series(1,2) side_index;

update public.championship_fixtures fixture
set match_id = score.match_id,
    linked_at = now(),
    linked_by = 'e6100000-0000-4000-8000-000000000001'
from desired_scores score
join public.championship_participants participant_a
  on participant_a.seed=score.seed_a
  and participant_a.championship_id=(select id from public.championships where name='Liga Versionada')
join public.championship_fixture_slots slot_a
  on slot_a.participant_id=participant_a.id
join public.championship_fixture_slots slot_b
  on slot_b.fixture_id=slot_a.fixture_id
  and slot_b.side_index<>slot_a.side_index
join public.championship_participants participant_b
  on participant_b.id=slot_b.participant_id and participant_b.seed=score.seed_b
where fixture.id=slot_a.fixture_id;

insert into public.match_events(
  match_id,event_id,team_id,kind,side_id,minute,created_by
)
select score.match_id,'e6400000-0000-4000-8000-000000000001',
  'e6200000-0000-4000-8000-000000000001','goal',side.id,goal.minute,
  'e6100000-0000-4000-8000-000000000001'
from desired_scores score
join public.championship_fixtures fixture on fixture.match_id=score.match_id
join public.championship_fixture_slots slot on slot.fixture_id=fixture.id
join public.championship_participants participant on participant.id=slot.participant_id
join public.match_sides side on side.match_id=score.match_id and side.side_index=slot.side_index
cross join lateral generate_series(
  1,
  case when participant.seed=score.seed_a then score.score_a else score.score_b end
) goal(minute);

select is((select string_agg(participant_name||':'||rank_position::text,',' order by rank_position)
  from public.get_championship_standings((select id from public.championships where name='Liga Versionada'))
  where participant_name in ('Time A','Time B','Time C')),
  'Time A:1,Time B:2,Time C:3','confronto direto ordena o mini-torneio de três empatados');

update public.championships set public_mode='public' where name='Liga Versionada';
select is((select string_agg((item->>'name')||':'||(item->>'rank_position'),',' order by (item->>'rank_position')::integer)
  from jsonb_array_elements(public.get_public_championship((select public_id from public.championships where name='Liga Versionada'))->'standings') item
  where item->>'name' in ('Time A','Time B','Time C')),
  'Time A:1,Time B:2,Time C:3','página pública projeta a mesma ordem calculada');

set local role authenticated;
select set_config('request.jwt.claim.sub','e6100000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.reopen_championship_regulation(
  (select id from public.championships where name='Liga Versionada'),
  'e6300000-0000-4000-8000-000000000014'
)$$,'55000',null,'primeiro fato esportivo bloqueia nova edição');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','e6100000-0000-4000-8000-000000000003',true);
select is((select count(*) from public.championship_regulation_versions where team_id='e6200000-0000-4000-8000-000000000001'),0::bigint,'RLS oculta versões cross-tenant');
reset role;

select throws_ok($$update public.championship_regulation_versions set win_points=9$$,'22023',null,'snapshot publicado é fisicamente imutável');

select * from finish();
rollback;
