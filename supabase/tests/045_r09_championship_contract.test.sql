begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(44);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','c9100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-champ-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','c9100000-0000-4000-8000-000000000002','authenticated','authenticated','manager-champ-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','c9100000-0000-4000-8000-000000000003','authenticated','authenticated','owner-champ-b@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id, name, slug, created_by) values
  ('c9200000-0000-4000-8000-000000000001','Campeonato A','campeonato-a','c9100000-0000-4000-8000-000000000001'),
  ('c9200000-0000-4000-8000-000000000002','Campeonato B','campeonato-b','c9100000-0000-4000-8000-000000000003');

insert into public.team_memberships(team_id, user_id, role, status, invited_by)
values (
  'c9200000-0000-4000-8000-000000000001',
  'c9100000-0000-4000-8000-000000000002',
  'manager',
  'active',
  'c9100000-0000-4000-8000-000000000001'
);

insert into public.team_squad_presets(
  id, team_id, name, color, badge_key, sort_order,
  created_by, updated_by
) values
  ('c9300000-0000-4000-8000-000000000001','c9200000-0000-4000-8000-000000000001','Verde','#0D9488','stripes',1,'c9100000-0000-4000-8000-000000000001','c9100000-0000-4000-8000-000000000001'),
  ('c9300000-0000-4000-8000-000000000002','c9200000-0000-4000-8000-000000000002','Azul B','#2563EB','sash',1,'c9100000-0000-4000-8000-000000000003','c9100000-0000-4000-8000-000000000003');

select ok(
  'championships' = any(enum_range(null::public.feature_key)::text[]),
  'flag championships existe no catálogo tipado'
);
select has_table('public', 'championships', 'tabela de campeonatos existe');
select has_table('public', 'championship_participants', 'tabela de participantes existe');
select has_table('public', 'championship_fixtures', 'tabela de confrontos existe');
select has_table('public', 'championship_fixture_slots', 'tabela de slots existe');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.championships'::regclass),
  'RLS está habilitada em campeonatos'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.championship_participants'::regclass),
  'RLS está habilitada em participantes'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.championship_fixtures'::regclass),
  'RLS está habilitada em confrontos'
);
select is(
  (select count(*) from public.team_feature_flags where feature = 'championships'),
  0::bigint,
  'a expansão não ativa nenhum time'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_championship_draft(uuid,uuid,text,public.championship_format,smallint,smallint,smallint,public.championship_tiebreak_key[],smallint,smallint)',
    'execute'
  ),
  'anon não executa criação de campeonato'
);
select ok(
  has_table_privilege('authenticated', 'public.championships', 'select')
  and not has_table_privilege('authenticated', 'public.championships', 'insert'),
  'authenticated lê por RLS e não escreve diretamente em campeonatos'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000001',true);
select throws_ok($$
  select public.create_championship_draft(
    'c9200000-0000-4000-8000-000000000001',
    'c9400000-0000-4000-8000-000000000001',
    'Copa sem flag',
    'league',
    3::smallint,
    1::smallint,
    0::smallint,
    array['wins','goal_difference','goals_for','head_to_head']::public.championship_tiebreak_key[],
    null::smallint,
    null::smallint
  )
$$, '55000', null, 'flag desligada falha antes de qualquer escrita');
reset role;

insert into public.team_feature_flags(team_id, feature, enabled, updated_by) values
  ('c9200000-0000-4000-8000-000000000001','championships',true,'c9100000-0000-4000-8000-000000000001'),
  ('c9200000-0000-4000-8000-000000000002','championships',true,'c9100000-0000-4000-8000-000000000003');

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000001',true);
select throws_ok($$
  select public.create_championship_draft(
    'c9200000-0000-4000-8000-000000000001',
    'c9400000-0000-4000-8000-000000000013',
    'Copa duplicada',
    'league',
    3::smallint,
    1::smallint,
    0::smallint,
    array['wins','wins']::public.championship_tiebreak_key[],
    null::smallint,
    null::smallint
  )
$$, '22023', null, 'desempate duplicado é recusado');
select throws_ok($$
  select public.create_championship_draft(
    'c9200000-0000-4000-8000-000000000001',
    'c9400000-0000-4000-8000-000000000014',
    'Copa sem grupos',
    'groups_knockout',
    3::smallint,
    1::smallint,
    0::smallint,
    array['wins']::public.championship_tiebreak_key[],
    null::smallint,
    null::smallint
  )
$$, '22023', null, 'formato de grupos exige configuração fechada');
select lives_ok($$
  select public.create_championship_draft(
    'c9200000-0000-4000-8000-000000000001',
    'c9400000-0000-4000-8000-000000000002',
    'Copa da Vila',
    'league',
    3::smallint,
    1::smallint,
    0::smallint,
    array['wins','goal_difference','goals_for','head_to_head']::public.championship_tiebreak_key[],
    null::smallint,
    null::smallint
  )
$$, 'owner cria rascunho válido');
reset role;

select is(
  (select status::text || ':' || public_mode::text
   from public.championships
   where team_id = 'c9200000-0000-4000-8000-000000000001'),
  'draft:private',
  'campeonato nasce privado e em rascunho'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000001',true);
select is(
  (public.create_championship_draft(
    'c9200000-0000-4000-8000-000000000001',
    'c9400000-0000-4000-8000-000000000002',
    'Copa da Vila',
    'league',
    3::smallint,
    1::smallint,
    0::smallint,
    array['wins','goal_difference','goals_for','head_to_head']::public.championship_tiebreak_key[],
    null::smallint,
    null::smallint
  )).replayed,
  true,
  'retry de criação retorna replay sem duplicar campeonato'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000002',true);
select throws_ok($$
  select public.create_championship_draft(
    'c9200000-0000-4000-8000-000000000001',
    'c9400000-0000-4000-8000-000000000003',
    'Copa do manager',
    'knockout',
    3::smallint,
    1::smallint,
    0::smallint,
    array['wins']::public.championship_tiebreak_key[],
    null::smallint,
    null::smallint
  )
$$, '42501', null, 'manager não cria nem altera regulamento');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.create_championship_draft(
    'c9200000-0000-4000-8000-000000000001',
    'c9400000-0000-4000-8000-000000000011',
    'Copa em grupos',
    'groups_knockout',
    3::smallint,
    1::smallint,
    0::smallint,
    array['wins','goal_difference']::public.championship_tiebreak_key[],
    2::smallint,
    1::smallint
  )
$$, 'owner cria regulamento de grupos com mata-mata');
select lives_ok($$
  select public.create_championship_draft(
    'c9200000-0000-4000-8000-000000000001',
    'c9400000-0000-4000-8000-000000000012',
    'Copa eliminatória',
    'knockout',
    3::smallint,
    1::smallint,
    0::smallint,
    array['wins']::public.championship_tiebreak_key[],
    null::smallint,
    null::smallint
  )
$$, 'owner cria regulamento de mata-mata');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.add_championship_participant(
    (select id from public.championships where name = 'Copa da Vila'),
    'c9400000-0000-4000-8000-000000000004',
    1::smallint,
    null::smallint,
    'c9300000-0000-4000-8000-000000000001',
    null,
    null,
    null
  )
$$, 'owner adiciona equipe interna da própria organização');
reset role;

select is(
  (select snapshot_name || ':' || snapshot_color || ':' || snapshot_badge_key::text
   from public.championship_participants where seed = 1),
  'Verde:#0D9488:stripes',
  'participante interno preserva snapshot histórico completo'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.add_championship_participant(
    (select id from public.championships where name = 'Copa da Vila'),
    'c9400000-0000-4000-8000-000000000005',
    2::smallint,
    null::smallint,
    null,
    'Visitante',
    '#DC2626',
    'diamond'
  )
$$, 'owner adiciona adversário externo sem tenant');
reset role;

select is(
  (select kind::text from public.championship_participants where seed = 2),
  'external',
  'adversário externo não recebe identidade de outro tenant'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000001',true);
select is(
  (public.add_championship_participant(
    (select id from public.championships where name = 'Copa da Vila'),
    'c9400000-0000-4000-8000-000000000005',
    2::smallint,
    null::smallint,
    null,
    'Visitante',
    '#DC2626',
    'diamond'
  )).replayed,
  true,
  'retry do participante retorna replay'
);
select throws_ok($$
  select public.add_championship_participant(
    (select id from public.championships where name = 'Copa da Vila'),
    'c9400000-0000-4000-8000-000000000006',
    3::smallint,
    null::smallint,
    'c9300000-0000-4000-8000-000000000002',
    null,
    null,
    null
  )
$$, '22023', null, 'equipe interna de outro tenant é recusada');
select throws_ok($$
  select public.add_championship_participant(
    (select id from public.championships where name = 'Copa da Vila'),
    'c9400000-0000-4000-8000-000000000007',
    2::smallint,
    null::smallint,
    null,
    'Outro nome',
    '#111111',
    'shield'
  )
$$, '22023', null, 'seed duplicado é recusado antes da constraint');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000003',true);
select throws_ok($$
  select public.add_championship_participant(
    (select id from public.championships where name = 'Copa da Vila'),
    'c9400000-0000-4000-8000-000000000008',
    3::smallint,
    null::smallint,
    null,
    'Intruso',
    '#111111',
    'shield'
  )
$$, '42501', null, 'owner de outro tenant não escreve no campeonato');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000001',true);
select is(
  (select count(*) from public.championships),
  3::bigint,
  'RLS permite que staff leia campeonatos do próprio time'
);
select throws_ok($$
  insert into public.championships(
    team_id, name, format, created_by, updated_by
  ) values (
    'c9200000-0000-4000-8000-000000000001',
    'Escrita direta',
    'league',
    'c9100000-0000-4000-8000-000000000001',
    'c9100000-0000-4000-8000-000000000001'
  )
$$, '42501', null, 'staff não escreve diretamente na tabela');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000003',true);
select is(
  (select count(*) from public.championships),
  0::bigint,
  'RLS oculta campeonato de outro tenant'
);
reset role;

select ok(
  not has_table_privilege('authenticated', 'public.championship_commands', 'select'),
  'recibos idempotentes não são legíveis pelo cliente'
);

update public.championships
set status = 'published',
    published_at = now(),
    published_by = 'c9100000-0000-4000-8000-000000000001',
    updated_by = 'c9100000-0000-4000-8000-000000000001'
where name = 'Copa da Vila';

insert into public.championship_fixtures(
  id, championship_id, team_id, stage, round_number, ordinal,
  created_by, updated_by
) select
  'c9500000-0000-4000-8000-000000000001', id, team_id,
  'league', 1, 1,
  'c9100000-0000-4000-8000-000000000001',
  'c9100000-0000-4000-8000-000000000001'
from public.championships where name = 'Copa da Vila';

insert into public.championship_fixture_slots(
  fixture_id, championship_id, team_id, side_index, kind, participant_id
) select
  'c9500000-0000-4000-8000-000000000001', participant.championship_id,
  participant.team_id, participant.seed, 'participant', participant.id
from public.championship_participants participant
where participant.seed in (1, 2);

insert into public.events(
  id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, status, created_by
) values
  ('c9600000-0000-4000-8000-000000000001','c9200000-0000-4000-8000-000000000001','Rodada 1','championship','split_teams','society',now()+interval '3 days',now()+interval '3 days 1 hour','scheduled','c9100000-0000-4000-8000-000000000001'),
  ('c9600000-0000-4000-8000-000000000002','c9200000-0000-4000-8000-000000000002','Rodada externa','championship','split_teams','society',now()+interval '4 days',now()+interval '4 days 1 hour','scheduled','c9100000-0000-4000-8000-000000000003'),
  ('c9600000-0000-4000-8000-000000000003','c9200000-0000-4000-8000-000000000001','Rodada iniciada','championship','split_teams','society',now()+interval '5 days',now()+interval '5 days 1 hour','scheduled','c9100000-0000-4000-8000-000000000001');

insert into public.event_matches(
  id, event_id, team_id, ordinal, status, public_mode, created_by
) values
  ('c9700000-0000-4000-8000-000000000001','c9600000-0000-4000-8000-000000000001','c9200000-0000-4000-8000-000000000001',1,'scheduled','private','c9100000-0000-4000-8000-000000000001'),
  ('c9700000-0000-4000-8000-000000000002','c9600000-0000-4000-8000-000000000002','c9200000-0000-4000-8000-000000000002',1,'scheduled','private','c9100000-0000-4000-8000-000000000003'),
  ('c9700000-0000-4000-8000-000000000003','c9600000-0000-4000-8000-000000000003','c9200000-0000-4000-8000-000000000001',1,'scheduled','private','c9100000-0000-4000-8000-000000000001');

insert into public.match_sides(
  match_id, event_id, team_id, side_index, label
) values
  ('c9700000-0000-4000-8000-000000000001','c9600000-0000-4000-8000-000000000001','c9200000-0000-4000-8000-000000000001',1,'Time A'),
  ('c9700000-0000-4000-8000-000000000001','c9600000-0000-4000-8000-000000000001','c9200000-0000-4000-8000-000000000001',2,'Time B'),
  ('c9700000-0000-4000-8000-000000000002','c9600000-0000-4000-8000-000000000002','c9200000-0000-4000-8000-000000000002',1,'Time A'),
  ('c9700000-0000-4000-8000-000000000002','c9600000-0000-4000-8000-000000000002','c9200000-0000-4000-8000-000000000002',2,'Time B'),
  ('c9700000-0000-4000-8000-000000000003','c9600000-0000-4000-8000-000000000003','c9200000-0000-4000-8000-000000000001',1,'Time A'),
  ('c9700000-0000-4000-8000-000000000003','c9600000-0000-4000-8000-000000000003','c9200000-0000-4000-8000-000000000001',2,'Time B');

insert into public.match_events(
  match_id, event_id, team_id, kind, notes, created_by
) values (
  'c9700000-0000-4000-8000-000000000003',
  'c9600000-0000-4000-8000-000000000003',
  'c9200000-0000-4000-8000-000000000001',
  'note',
  'partida já iniciada',
  'c9100000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000002',true);
select lives_ok($$
  select public.link_championship_fixture_match(
    'c9500000-0000-4000-8000-000000000001',
    'c9400000-0000-4000-8000-000000000009',
    'c9700000-0000-4000-8000-000000000001'
  )
$$, 'manager vincula confronto publicado a partida ainda sem fatos');
reset role;

select is(
  (select match_id from public.championship_fixtures
   where id = 'c9500000-0000-4000-8000-000000000001'),
  'c9700000-0000-4000-8000-000000000001'::uuid,
  'vínculo 1:1 fica no confronto novo'
);
select is(
  (select string_agg(label, ':' order by side_index)
   from public.match_sides
   where match_id = 'c9700000-0000-4000-8000-000000000001'),
  'Verde:Visitante',
  'partida recebe snapshots esportivos dos participantes'
);
select is(
  (select external_snapshot ->> 'badge_key'
   from public.match_sides
   where match_id = 'c9700000-0000-4000-8000-000000000001'
     and side_index = 2),
  'diamond',
  'snapshot do lado preserva escudo sem criar identidade externa'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000002',true);
select is(
  (public.link_championship_fixture_match(
    'c9500000-0000-4000-8000-000000000001',
    'c9400000-0000-4000-8000-000000000009',
    'c9700000-0000-4000-8000-000000000001'
  )).replayed,
  true,
  'retry do vínculo não altera novamente a partida'
);
reset role;

insert into public.championship_fixtures(
  id, championship_id, team_id, stage, round_number, ordinal,
  created_by, updated_by
) select
  'c9500000-0000-4000-8000-000000000002', id, team_id,
  'league', 1, 2,
  'c9100000-0000-4000-8000-000000000001',
  'c9100000-0000-4000-8000-000000000001'
from public.championships where name = 'Copa da Vila';

insert into public.championship_fixture_slots(
  fixture_id, championship_id, team_id, side_index, kind, participant_id
) select
  'c9500000-0000-4000-8000-000000000002', participant.championship_id,
  participant.team_id, participant.seed, 'participant', participant.id
from public.championship_participants participant
where participant.seed in (1, 2);

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000002',true);
select throws_ok($$
  select public.link_championship_fixture_match(
    'c9500000-0000-4000-8000-000000000002',
    'c9400000-0000-4000-8000-000000000010',
    'c9700000-0000-4000-8000-000000000002'
  )
$$, '22023', null, 'partida de outro tenant não pode ser vinculada');
select throws_ok($$
  select public.link_championship_fixture_match(
    'c9500000-0000-4000-8000-000000000002',
    'c9400000-0000-4000-8000-000000000015',
    'c9700000-0000-4000-8000-000000000003'
  )
$$, '22023', null, 'primeiro fato esportivo congela os lados antes do vínculo');
select throws_ok($$
  update public.championship_fixtures
  set status = 'void'
  where id = 'c9500000-0000-4000-8000-000000000002'
$$, '42501', null, 'manager não atualiza confronto diretamente');
reset role;

select throws_ok($$
  insert into public.championship_fixtures(
    championship_id, team_id, stage, status, round_number, ordinal,
    match_id, linked_at, linked_by, created_by, updated_by
  ) select
    id, team_id, 'league', 'scheduled', 1, 3,
    'c9700000-0000-4000-8000-000000000001', now(),
    'c9100000-0000-4000-8000-000000000001',
    'c9100000-0000-4000-8000-000000000001',
    'c9100000-0000-4000-8000-000000000001'
  from public.championships where name = 'Copa da Vila'
$$, '23505', null, 'a mesma partida não entra em dois confrontos');

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_matches'
      and column_name = 'championship_id'
  ),
  'schema N-1 de partidas permanece sem dependência de campeonato'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','c9100000-0000-4000-8000-000000000003',true);
select is(
  (select count(*) from public.championship_fixtures),
  0::bigint,
  'RLS oculta confrontos de outro tenant'
);
reset role;

select ok(
  (select bool_and(
    not metadata ? 'snapshot_name'
    and not metadata ? 'name'
    and not metadata ? 'resolution_reason'
  )
  from public.audit_logs
  where team_id = 'c9200000-0000-4000-8000-000000000001'
    and entity_type in (
      'championships', 'championship_participants', 'championship_fixtures'
    )),
  'auditoria de domínio permanece agregada e sem nomes ou motivos'
);

select * from finish();
rollback;
