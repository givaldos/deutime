begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(42);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','fa170000-0000-4000-8000-000000000001','authenticated','authenticated','owner-followup-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fa170000-0000-4000-8000-000000000002','authenticated','authenticated','manager-followup-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fa170000-0000-4000-8000-000000000003','authenticated','authenticated','owner-followup-b@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fa170000-0000-4000-8000-000000000004','authenticated','authenticated','athlete-followup-a@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,timezone,created_by) values
  ('fa171000-0000-4000-8000-000000000001','Acompanhamento A','acompanhamento-a','America/Sao_Paulo','fa170000-0000-4000-8000-000000000001'),
  ('fa171000-0000-4000-8000-000000000002','Acompanhamento B','acompanhamento-b','America/Sao_Paulo','fa170000-0000-4000-8000-000000000003');

insert into public.team_memberships(team_id,user_id,role,status,invited_by) values
  ('fa171000-0000-4000-8000-000000000001','fa170000-0000-4000-8000-000000000002','manager','active','fa170000-0000-4000-8000-000000000001');

insert into public.athletes(
  id,team_id,user_id,full_name,preferred_name,status,created_by
) values (
  'fa172000-0000-4000-8000-000000000001','fa171000-0000-4000-8000-000000000001',
  'fa170000-0000-4000-8000-000000000004','Atleta Privado','Atleta','active',
  'fa170000-0000-4000-8000-000000000001'
);

select ok('clear_championship_workspace' = any(
  enum_range(null::public.feature_key)::text[]
), 'flag tipada do acompanhamento existe');
select ok('clear_championship_workspace' = any(array(
  select feature::text from private.product_feature_keys() feature
)), 'flag integra o catálogo global após o contrato de rollout');
select is((select count(*) from public.team_feature_flags
  where feature = 'clear_championship_workspace'), 0::bigint,
  'expansão não materializa a flag em nenhum time');
select has_type('public','championship_fixture_view',
  'filtro tipado de confrontos existe');
select has_function('public','get_championship_followup_summary',array['uuid','uuid'],
  'RPC privada de resumo existe');
select has_function('public','list_championship_followup_fixtures',array[
  'uuid','uuid','championship_fixture_stage','smallint','smallint',
  'championship_fixture_view','integer','jsonb'
], 'RPC paginada de confrontos existe');
select ok(has_function_privilege('authenticated',
  'public.get_championship_followup_summary(uuid,uuid)','execute'),
  'authenticated pode chamar o resumo protegido');
select ok(has_function_privilege('authenticated',
  'public.list_championship_followup_fixtures(uuid,uuid,public.championship_fixture_stage,smallint,smallint,public.championship_fixture_view,integer,jsonb)','execute'),
  'authenticated pode chamar a lista protegida');
select ok(not has_function_privilege('anon',
  'public.get_championship_followup_summary(uuid,uuid)','execute'),
  'anônimo não chama o resumo');
select ok(not has_function_privilege('anon',
  'public.list_championship_followup_fixtures(uuid,uuid,public.championship_fixture_stage,smallint,smallint,public.championship_fixture_view,integer,jsonb)','execute'),
  'anônimo não chama a lista');

insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('fa171000-0000-4000-8000-000000000001','championships',true,'fa170000-0000-4000-8000-000000000001'),
  ('fa171000-0000-4000-8000-000000000001','clear_championship_workspace',true,'fa170000-0000-4000-8000-000000000001'),
  ('fa171000-0000-4000-8000-000000000002','championships',true,'fa170000-0000-4000-8000-000000000003');

insert into public.championships(
  id,team_id,name,format,status,created_by,updated_by
) values
  ('fa173000-0000-4000-8000-000000000001','fa171000-0000-4000-8000-000000000001','Liga com 32 equipes','league','draft','fa170000-0000-4000-8000-000000000001','fa170000-0000-4000-8000-000000000001'),
  ('fa173000-0000-4000-8000-000000000002','fa171000-0000-4000-8000-000000000002','Liga privada B','league','draft','fa170000-0000-4000-8000-000000000003','fa170000-0000-4000-8000-000000000003');

insert into public.championship_participants(
  id,championship_id,team_id,kind,status,internal_team_id,snapshot_name,
  snapshot_color,snapshot_badge_key,seed,created_by,updated_by
)
select
  (md5('followup-participant-' || item))::uuid,
  'fa173000-0000-4000-8000-000000000001',
  'fa171000-0000-4000-8000-000000000001',
  'external','active',null,'Equipe ' || item,'#2563EB','shield',item,
  'fa170000-0000-4000-8000-000000000001','fa170000-0000-4000-8000-000000000001'
from generate_series(1,32) item;

insert into public.championship_fixtures(
  id,championship_id,team_id,stage,status,round_number,ordinal,
  created_by,updated_by
)
select
  (md5('followup-fixture-' || item))::uuid,
  'fa173000-0000-4000-8000-000000000001',
  'fa171000-0000-4000-8000-000000000001',
  'league',case when item = 4 then 'finalized'::public.championship_fixture_status
    else 'scheduled'::public.championship_fixture_status end,
  ceil(item / 16.0)::smallint,item::smallint,
  'fa170000-0000-4000-8000-000000000001','fa170000-0000-4000-8000-000000000001'
from generate_series(1,496) item;

insert into public.championship_fixture_slots(
  fixture_id,championship_id,team_id,side_index,kind,participant_id
) values
  ((md5('followup-fixture-1'))::uuid,'fa173000-0000-4000-8000-000000000001','fa171000-0000-4000-8000-000000000001',1,'participant',(md5('followup-participant-1'))::uuid),
  ((md5('followup-fixture-1'))::uuid,'fa173000-0000-4000-8000-000000000001','fa171000-0000-4000-8000-000000000001',2,'participant',(md5('followup-participant-2'))::uuid);

insert into public.events(
  id,team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,
  status,professional_schedule_state,created_by
)
select
  (md5('followup-event-' || item))::uuid,
  'fa171000-0000-4000-8000-000000000001','Rodada futura ' || item,
  'championship','split_teams','society',
  now() + item * interval '1 day',now() + item * interval '1 day' + interval '1 hour',
  'scheduled','scheduled','fa170000-0000-4000-8000-000000000001'
from generate_series(1,3) item;

insert into public.event_matches(
  id,event_id,team_id,ordinal,status,created_by
)
select
  (md5('followup-match-' || item))::uuid,
  (md5('followup-event-' || item))::uuid,
  'fa171000-0000-4000-8000-000000000001',1,'scheduled',
  'fa170000-0000-4000-8000-000000000001'
from generate_series(1,3) item;

update public.championship_fixtures fixture
set match_id = (md5('followup-match-' || fixture.ordinal))::uuid,
  linked_at = now(),linked_by = 'fa170000-0000-4000-8000-000000000001'
where fixture.championship_id = 'fa173000-0000-4000-8000-000000000001'
  and fixture.ordinal between 1 and 3;

update public.championships
set status = 'published',published_at = now(),
  published_by = 'fa170000-0000-4000-8000-000000000001'
where id = 'fa173000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','fa170000-0000-4000-8000-000000000001',true);

create temporary table followup_summary as
select public.get_championship_followup_summary(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001'
) as payload;
select is(payload->'championship'->>'id','fa173000-0000-4000-8000-000000000001',
  'resumo devolve somente o campeonato solicitado') from followup_summary;
select is((payload->'progress'->>'planned_matches')::integer,496,
  'progresso conta os 496 confrontos planejados') from followup_summary;
select is((payload->'progress'->>'completed_matches')::integer,1,
  'progresso conta confrontos encerrados') from followup_summary;
select is((payload->'progress'->>'scheduled_matches')::integer,3,
  'progresso conta jogos futuros agendados') from followup_summary;
select is((payload->'progress'->>'unscheduled_matches')::integer,492,
  'progresso separa confrontos a agendar') from followup_summary;
select is(jsonb_array_length(payload->'next_games'),3,
  'resumo limita próximos jogos a três') from followup_summary;
select is(payload->'next_action'->>'kind','schedule_matches',
  'ação prioritária indica os confrontos sem agenda') from followup_summary;
select is((payload->>'active_participants')::integer,32,
  'resumo conta somente participantes esportivos ativos') from followup_summary;
select is(payload->'next_games'->0->>'side_a','Equipe 1',
  'próximo jogo usa o snapshot esportivo da equipe') from followup_summary;

create temporary table first_fixture_page as
select public.list_championship_followup_fixtures(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001'
) as payload;
select is((payload->>'filtered_count')::integer,496,
  'lista cobre os 496 confrontos') from first_fixture_page;
select is(jsonb_array_length(payload->'items'),24,
  'página padrão contém 24 confrontos') from first_fixture_page;
select ok(payload->'next_cursor' is not null,
  'primeira página devolve cursor esportivo') from first_fixture_page;

create temporary table second_fixture_page as
select public.list_championship_followup_fixtures(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001',
  requested_cursor => (select payload->'next_cursor' from first_fixture_page)
) as payload;
select is(jsonb_array_length(payload->'items'),24,
  'cursor carrega a página seguinte') from second_fixture_page;
select ok(not exists (
  select 1
  from first_fixture_page first_page, second_fixture_page second_page,
    jsonb_array_elements(first_page.payload->'items') first_item,
    jsonb_array_elements(second_page.payload->'items') second_item
  where first_item->>'id' = second_item->>'id'
), 'paginação não repete confronto');
select is((public.list_championship_followup_fixtures(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001',
  requested_view => 'upcoming'
)->>'filtered_count')::integer,3, 'filtro Próximos usa agenda futura válida');
select is((public.list_championship_followup_fixtures(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001',
  requested_view => 'completed'
)->>'filtered_count')::integer,1, 'filtro Encerrados usa fatos do confronto');
select is((public.list_championship_followup_fixtures(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001',
  requested_view => 'unscheduled'
)->>'filtered_count')::integer,492, 'filtro A agendar inclui apenas pendências');
select is((public.list_championship_followup_fixtures(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001',
  requested_stage => 'league',requested_round_number => 1::smallint
)->>'filtered_count')::integer,16, 'fase e rodada são aplicadas no banco');
select is(jsonb_array_length(public.list_championship_followup_fixtures(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001',requested_limit => 50
)->'items'),50, 'limite máximo aceito é 50');
select throws_ok($$select public.list_championship_followup_fixtures(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001',requested_group_number => 1::smallint
)$$, '22023','Filtros de confrontos inválidos',
  'grupo sem fase de grupos é rejeitado');
select throws_ok($$select public.list_championship_followup_fixtures(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001',
  requested_cursor => '{"id":"inválido"}'
)$$, '22023','Cursor de confrontos inválido',
  'cursor inválido não reinicia a lista');
select performs_ok($$select public.get_championship_followup_summary(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001'
)$$,300,'resumo de 496 confrontos fica abaixo do alvo local');
select performs_ok($$select public.list_championship_followup_fixtures(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001'
)$$,300,'página de 496 confrontos fica abaixo do alvo local');
select ok((select payload::text !~ 'email|athlete|photo|media'
  from followup_summary), 'resumo não inclui PII nem mídia');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fa170000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.get_championship_followup_summary(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001'
)$$, 'manager ativo lê o resumo privado');
select lives_ok($$select public.list_championship_followup_fixtures(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001'
)$$, 'manager ativo lê os confrontos');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fa170000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.get_championship_followup_summary(
  'fa171000-0000-4000-8000-000000000002',
  'fa173000-0000-4000-8000-000000000002'
)$$, 'P0001','Acompanhamento de campeonato indisponível',
  'flag desligada mantém o fallback do próprio time');
select throws_ok($$select public.get_championship_followup_summary(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001'
)$$, '42501','Campeonato indisponível',
  'owner de outro time não lê o resumo');
select throws_ok($$select public.list_championship_followup_fixtures(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001'
)$$, '42501','Campeonato indisponível',
  'owner de outro time não lê os confrontos');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fa170000-0000-4000-8000-000000000004',true);
select throws_ok($$select public.get_championship_followup_summary(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000001'
)$$, '42501','Campeonato indisponível',
  'atleta não recebe a projeção privada');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fa170000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.get_championship_followup_summary(
  'fa171000-0000-4000-8000-000000000001',
  'fa173000-0000-4000-8000-000000000099'
)$$, '42501','Campeonato indisponível',
  'ID ausente não permite enumerar campeonatos');
reset role;

select has_index('public','championship_fixtures','championship_fixtures_followup_idx',
  'índice do acompanhamento começa pelo tenant e campeonato');

select * from finish();
rollback;
