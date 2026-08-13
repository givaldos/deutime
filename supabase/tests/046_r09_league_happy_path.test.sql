begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(31);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','d9100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-league-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','d9100000-0000-4000-8000-000000000002','authenticated','authenticated','manager-league-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','d9100000-0000-4000-8000-000000000003','authenticated','authenticated','owner-league-b@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id, name, slug, created_by) values
  ('d9200000-0000-4000-8000-000000000001','Liga A','liga-a','d9100000-0000-4000-8000-000000000001'),
  ('d9200000-0000-4000-8000-000000000002','Liga B','liga-b','d9100000-0000-4000-8000-000000000003');

insert into public.team_memberships(team_id, user_id, role, status, invited_by)
values (
  'd9200000-0000-4000-8000-000000000001',
  'd9100000-0000-4000-8000-000000000002',
  'manager', 'active', 'd9100000-0000-4000-8000-000000000001'
);

insert into public.team_squad_presets(
  id, team_id, name, color, badge_key, sort_order, created_by, updated_by
) values (
  'd9300000-0000-4000-8000-000000000001',
  'd9200000-0000-4000-8000-000000000001',
  'Time da Casa', '#0D9488', 'stripes', 1,
  'd9100000-0000-4000-8000-000000000001',
  'd9100000-0000-4000-8000-000000000001'
);

insert into public.team_feature_flags(team_id, feature, enabled, updated_by) values
  ('d9200000-0000-4000-8000-000000000001','championships',true,'d9100000-0000-4000-8000-000000000001'),
  ('d9200000-0000-4000-8000-000000000002','championships',true,'d9100000-0000-4000-8000-000000000003');

select ok(
  not has_function_privilege(
    'anon', 'public.generate_league_fixtures(uuid,uuid)', 'execute'
  ),
  'anon não gera confrontos'
);
select ok(
  not has_function_privilege(
    'anon', 'public.publish_league_championship(uuid,uuid)', 'execute'
  ),
  'anon não publica campeonato'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.create_championship_draft(
    'd9200000-0000-4000-8000-000000000001',
    'd9400000-0000-4000-8000-000000000001',
    'Liga da Vila', 'league', 3::smallint, 1::smallint, 0::smallint,
    array['wins','goal_difference','goals_for','head_to_head']::public.championship_tiebreak_key[],
    null::smallint, null::smallint
  )
$$, 'owner cria campeonato de pontos corridos');

select lives_ok($$
  select public.add_championship_participant(
    (select id from public.championships where name = 'Liga da Vila'),
    'd9400000-0000-4000-8000-000000000002', 1::smallint,
    null::smallint, 'd9300000-0000-4000-8000-000000000001',
    null, null, null
  )
$$, 'adiciona equipe interna por snapshot');
select lives_ok($$
  select public.add_championship_participant(
    (select id from public.championships where name = 'Liga da Vila'),
    'd9400000-0000-4000-8000-000000000003', 2::smallint,
    null::smallint, null, 'Visitante A', '#2563EB', 'shield'
  )
$$, 'adiciona primeiro adversário externo');
select lives_ok($$
  select public.add_championship_participant(
    (select id from public.championships where name = 'Liga da Vila'),
    'd9400000-0000-4000-8000-000000000004', 3::smallint,
    null::smallint, null, 'Visitante B', '#D97706', 'diamond'
  )
$$, 'adiciona segundo adversário externo');
select lives_ok($$
  select public.add_championship_participant(
    (select id from public.championships where name = 'Liga da Vila'),
    'd9400000-0000-4000-8000-000000000005', 4::smallint,
    null::smallint, null, 'Visitante C', '#7C3AED', 'quarters'
  )
$$, 'adiciona terceiro adversário externo');
reset role;

update public.team_feature_flags
set enabled = false, updated_by = 'd9100000-0000-4000-8000-000000000001'
where team_id = 'd9200000-0000-4000-8000-000000000001'
  and feature = 'championships';

set local role authenticated;
select set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000001',true);
select throws_ok($$
  select public.generate_league_fixtures(
    (select id from public.championships where name = 'Liga da Vila'),
    'd9400000-0000-4000-8000-000000000016'
  )
$$, '55000', null, 'flag desligada preserva o rascunho sem gerar grade');
reset role;

update public.team_feature_flags
set enabled = true, updated_by = 'd9100000-0000-4000-8000-000000000001'
where team_id = 'd9200000-0000-4000-8000-000000000001'
  and feature = 'championships';

set local role authenticated;
select set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000002',true);
select throws_ok($$
  select public.generate_league_fixtures(
    (select id from public.championships where name = 'Liga da Vila'),
    'd9400000-0000-4000-8000-000000000006'
  )
$$, '42501', null, 'manager não gera grade nem altera regulamento');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.generate_league_fixtures(
    (select id from public.championships where name = 'Liga da Vila'),
    'd9400000-0000-4000-8000-000000000007'
  )
$$, 'owner gera grade determinística');
reset role;

select is(
  (select count(*) from public.championship_fixtures),
  6::bigint,
  'quatro participantes geram seis confrontos'
);
select is(
  (select count(distinct round_number) from public.championship_fixtures),
  3::bigint,
  'quatro participantes geram três rodadas'
);
select is(
  (select count(*) from (
    select least(a.participant_id, b.participant_id),
           greatest(a.participant_id, b.participant_id)
    from public.championship_fixtures fixture
    join public.championship_fixture_slots a
      on a.fixture_id = fixture.id and a.side_index = 1
    join public.championship_fixture_slots b
      on b.fixture_id = fixture.id and b.side_index = 2
    group by least(a.participant_id, b.participant_id),
             greatest(a.participant_id, b.participant_id)
  ) pairs),
  6::bigint,
  'cada par aparece exatamente uma vez'
);
select ok(
  not exists (
    select 1 from public.championship_fixtures fixture
    left join public.championship_fixture_slots slot on slot.fixture_id = fixture.id
    group by fixture.id having count(slot.*) <> 2
  ),
  'todo confronto possui exatamente dois lados'
);

create temporary table generated_fixture_snapshot as
select array_agg(id order by ordinal) as fixture_ids
from public.championship_fixtures;

set local role authenticated;
select set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000001',true);
select is(
  (public.generate_league_fixtures(
    (select id from public.championships where name = 'Liga da Vila'),
    'd9400000-0000-4000-8000-000000000007'
  )).replayed,
  true,
  'retry da geração retorna replay'
);
reset role;

select is(
  (select array_agg(id order by ordinal) from public.championship_fixtures),
  (select fixture_ids from generated_fixture_snapshot),
  'retry preserva os mesmos confrontos'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.publish_league_championship(
    (select id from public.championships where name = 'Liga da Vila'),
    'd9400000-0000-4000-8000-000000000008'
  )
$$, 'owner publica a grade completa');
reset role;

select is(
  (select status::text from public.championships where name = 'Liga da Vila'),
  'published',
  'campeonato fica publicado'
);
select is(
  (select count(*) from public.championship_fixtures where status = 'scheduled'),
  6::bigint,
  'publicação promove uma única grade'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000001',true);
select is(
  (public.publish_league_championship(
    (select id from public.championships where name = 'Liga da Vila'),
    'd9400000-0000-4000-8000-000000000009'
  )).replayed,
  true,
  'segunda publicação converge sem duplicar grade'
);
reset role;

insert into public.events(
  id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, status, created_by
) values (
  'd9500000-0000-4000-8000-000000000001',
  'd9200000-0000-4000-8000-000000000001',
  'Rodada da Liga', 'championship', 'split_teams', 'society',
  now() - interval '2 hours', now() - interval '1 hour', 'completed',
  'd9100000-0000-4000-8000-000000000001'
);
insert into public.event_matches(
  id, event_id, team_id, ordinal, status, public_mode, created_by
) values (
  'd9600000-0000-4000-8000-000000000001',
  'd9500000-0000-4000-8000-000000000001',
  'd9200000-0000-4000-8000-000000000001',
  1, 'scheduled', 'private', 'd9100000-0000-4000-8000-000000000001'
);
insert into public.match_sides(match_id, event_id, team_id, side_index, label)
values
  ('d9600000-0000-4000-8000-000000000001','d9500000-0000-4000-8000-000000000001','d9200000-0000-4000-8000-000000000001',1,'Lado A'),
  ('d9600000-0000-4000-8000-000000000001','d9500000-0000-4000-8000-000000000001','d9200000-0000-4000-8000-000000000001',2,'Lado B');

set local role authenticated;
select set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000002',true);
select lives_ok($$
  select public.link_championship_fixture_match(
    (select id from public.championship_fixtures order by ordinal limit 1),
    'd9400000-0000-4000-8000-000000000010',
    'd9600000-0000-4000-8000-000000000001'
  )
$$, 'manager vincula partida ao confronto publicado');
select lives_ok($$
  select public.record_match_event(
    'd9600000-0000-4000-8000-000000000001'::uuid,
    'goal'::public.match_event_kind, 1::smallint,
    null::uuid, null::uuid, 10::smallint, null::smallint, null::text
  )
$$, 'primeiro gol entra na fonte da súmula');
select lives_ok($$
  select public.record_match_event(
    'd9600000-0000-4000-8000-000000000001'::uuid,
    'goal'::public.match_event_kind, 1::smallint,
    null::uuid, null::uuid, 20::smallint, null::smallint, null::text
  )
$$, 'segundo gol entra na fonte da súmula');
select lives_ok($$
  select public.finalize_event_match('d9600000-0000-4000-8000-000000000001')
$$, 'encerramento torna o resultado classificável');

select is(
  (select points::text || ':' || goals_for::text || ':' || goals_against::text
   from public.get_championship_standings(
     (select id from public.championships where name = 'Liga da Vila')
   ) standing
   join public.championship_fixture_slots slot
     on slot.participant_id = standing.participant_id
   join public.championship_fixtures fixture
     on fixture.id = slot.fixture_id
   where fixture.match_id = 'd9600000-0000-4000-8000-000000000001'
     and slot.side_index = 1),
  '3:2:0',
  'classificação deriva pontos e gols da partida finalizada'
);
select is(
  (select count(*) from public.get_championship_standings(
    (select id from public.championships where name = 'Liga da Vila')
  )),
  4::bigint,
  'manager lê todos os participantes pela projeção privada'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000003',true);
select throws_ok($$
  select * from public.get_championship_standings(
    (select id from public.championships where name = 'Liga da Vila')
  )
$$, '42501', null, 'outro tenant não acessa a classificação');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000002',true);
select lives_ok($$
  select public.void_event_match(
    'd9600000-0000-4000-8000-000000000001',
    'Súmula anulada para teste'
  )
$$, 'anulação preserva a partida e retira o resultado da tabela');
select is(
  (select count(*) from public.get_championship_standings(
    (select id from public.championships where name = 'Liga da Vila')
  ) where rank_position = 1 and played = 0),
  4::bigint,
  'anulação reconstrói empate absoluto com posição compartilhada'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000003',true);
select is(
  (select count(*) from public.championship_fixtures),
  0::bigint,
  'RLS oculta a grade do outro tenant'
);
reset role;

select ok(
  not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'championship_standings'
  ),
  'classificação não cria contador esportivo independente'
);

select * from finish();
rollback;
