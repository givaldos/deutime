begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(46);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','fd160000-0000-4000-8000-000000000001','authenticated','authenticated','owner-list-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fd160000-0000-4000-8000-000000000002','authenticated','authenticated','manager-list-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fd160000-0000-4000-8000-000000000003','authenticated','authenticated','owner-list-b@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fd160000-0000-4000-8000-000000000004','authenticated','authenticated','player-list-a@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,timezone,created_by) values
  ('fd161000-0000-4000-8000-000000000001','Listas A','listas-a','America/Sao_Paulo','fd160000-0000-4000-8000-000000000001'),
  ('fd161000-0000-4000-8000-000000000002','Listas B','listas-b','America/Sao_Paulo','fd160000-0000-4000-8000-000000000003');

insert into public.team_memberships(team_id,user_id,role,status,invited_by) values
  ('fd161000-0000-4000-8000-000000000001','fd160000-0000-4000-8000-000000000002','manager','active','fd160000-0000-4000-8000-000000000001');

insert into public.athletes(
  id,team_id,user_id,full_name,preferred_name,status,created_by
) values (
  'fd162000-0000-4000-8000-000000000001','fd161000-0000-4000-8000-000000000001',
  'fd160000-0000-4000-8000-000000000004','Jogador Lista','Jogador','active',
  'fd160000-0000-4000-8000-000000000001'
);

select ok('complete_management_lists' = any(enum_range(null::public.feature_key)::text[]),
  'flag tipada das listas existe');
select ok(not ('complete_management_lists' = any(array(
  select feature::text from private.product_feature_keys() feature
))), 'flag permanece fora do catálogo global');
select is((select count(*) from public.team_feature_flags
  where feature = 'complete_management_lists'), 0::bigint,
  'expansão não materializa a flag em nenhum time');
select has_function('public','list_management_events',array[
  'uuid','management_event_view','text','date','date','event_kind','uuid','uuid',
  'integer','jsonb'
], 'read model de jogos existe');
select has_function('public','list_management_championships',array[
  'uuid','championship_status','text','championship_format','date','date','integer','jsonb'
], 'read model de campeonatos existe');
select ok(has_function_privilege('authenticated',
  'public.list_management_events(uuid,public.management_event_view,text,date,date,public.event_kind,uuid,uuid,integer,jsonb)',
  'execute'), 'authenticated pode chamar a RPC protegida de jogos');
select ok(has_function_privilege('authenticated',
  'public.list_management_championships(uuid,public.championship_status,text,public.championship_format,date,date,integer,jsonb)',
  'execute'), 'authenticated pode chamar a RPC protegida de campeonatos');
select ok(not has_function_privilege('anon',
  'public.list_management_events(uuid,public.management_event_view,text,date,date,public.event_kind,uuid,uuid,integer,jsonb)',
  'execute'), 'anônimo não chama a lista de jogos');
select ok(not has_function_privilege('anon',
  'public.list_management_championships(uuid,public.championship_status,text,public.championship_format,date,date,integer,jsonb)',
  'execute'), 'anônimo não chama a lista de campeonatos');
select is(private.normalize_management_search(E'  Coração\n   SÃO  '), 'coracao sao',
  'busca remove acentos, controles e espaços excedentes');

set local role authenticated;
select set_config('request.jwt.claim.sub','fd160000-0000-4000-8000-000000000001',true);
select throws_ok($$
  select public.list_management_events(
    'fd161000-0000-4000-8000-000000000001','upcoming'
  )
$$, 'P0001', 'Listas completas indisponíveis',
  'flag desligada mantém o fallback da lista atual');
reset role;

insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('fd161000-0000-4000-8000-000000000001','complete_management_lists',true,'fd160000-0000-4000-8000-000000000001'),
  ('fd161000-0000-4000-8000-000000000002','complete_management_lists',true,'fd160000-0000-4000-8000-000000000003');

insert into public.events(
  team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,status,created_by
)
select
  'fd161000-0000-4000-8000-000000000001',
  'Histórico ' || item,
  'friendly','single_squad','society',
  now() - interval '400 days' + item * interval '1 hour',
  now() - interval '400 days' + item * interval '1 hour' + interval '1 hour',
  'completed','fd160000-0000-4000-8000-000000000001'
from generate_series(1,230) item;

insert into public.events(
  team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,status,created_by
)
select
  'fd161000-0000-4000-8000-000000000001',
  'Próximo ' || item,
  'training','single_squad','society',
  now() + interval '30 days' + item * interval '1 day',
  now() + interval '30 days 1 hour' + item * interval '1 day',
  'scheduled','fd160000-0000-4000-8000-000000000001'
from generate_series(1,30) item;

insert into public.events(
  id,team_id,title,opponent_name,kind,organization_mode,sport_format,
  starts_at,ends_at,status,professional_schedule_state,created_by,updated_at
) values
  ('fd163000-0000-4000-8000-000000000001','fd161000-0000-4000-8000-000000000001','Copa Coração 100%_','São Bento','championship','split_teams','society',
    (((now() at time zone 'America/Sao_Paulo')::date + 1) + time '00:30') at time zone 'America/Sao_Paulo',
    ((((now() at time zone 'America/Sao_Paulo')::date + 1) + time '00:30') at time zone 'America/Sao_Paulo') + interval '1 hour',
    'scheduled','scheduled','fd160000-0000-4000-8000-000000000001',now() - interval '2 hours'),
  ('fd163000-0000-4000-8000-000000000002','fd161000-0000-4000-8000-000000000001','Horário vencido',null,'championship','split_teams','society',
    now() - interval '1 day',now() - interval '23 hours','scheduled','scheduled',
    'fd160000-0000-4000-8000-000000000001',now() - interval '1 hour'),
  ('fd163000-0000-4000-8000-000000000003','fd161000-0000-4000-8000-000000000001','Jogo adiado',null,'championship','split_teams','society',
    now() + interval '10 days',now() + interval '10 days 1 hour','scheduled','postponed',
    'fd160000-0000-4000-8000-000000000001',now()),
  ('fd163000-0000-4000-8000-000000000004','fd161000-0000-4000-8000-000000000002','Segredo do outro time',null,'championship','single_squad','society',
    now() + interval '5 days',now() + interval '5 days 1 hour','scheduled','scheduled',
    'fd160000-0000-4000-8000-000000000003',now());

insert into public.team_squad_presets(
  id,team_id,name,color,badge_key,sort_order,created_by,updated_by
) values (
  'fd164000-0000-4000-8000-000000000001','fd161000-0000-4000-8000-000000000001',
  'Equipe Azul','#2563EB','shield',1,
  'fd160000-0000-4000-8000-000000000001','fd160000-0000-4000-8000-000000000001'
);
insert into public.event_squads(
  id,event_id,team_id,sport_format,name,color,sort_order,source_internal_team_id
) values (
  'fd165000-0000-4000-8000-000000000001','fd163000-0000-4000-8000-000000000001',
  'fd161000-0000-4000-8000-000000000001','society','Equipe Azul','#2563EB',1,
  'fd164000-0000-4000-8000-000000000001'
);

insert into public.championships(
  id,team_id,name,format,status,created_by,updated_by,created_at,updated_at,
  group_count,qualifiers_per_group
)
select
  gen_random_uuid(),'fd161000-0000-4000-8000-000000000001','Campeonato ' || item,
  case item % 3 when 0 then 'league'::public.championship_format
    when 1 then 'knockout'::public.championship_format
    else 'groups_knockout'::public.championship_format end,
  'draft','fd160000-0000-4000-8000-000000000001','fd160000-0000-4000-8000-000000000001',
  '2026-01-01 12:00:00+00'::timestamptz + item * interval '1 day',
  '2026-08-01 12:00:00+00'::timestamptz + item * interval '1 hour',
  case when item % 3 = 2 then 2 else null end,
  case when item % 3 = 2 then 1 else null end
from generate_series(1,30) item;

insert into public.championships(
  id,team_id,name,format,status,published_at,published_by,created_by,updated_by,
  created_at,updated_at,group_count,qualifiers_per_group
) values
  ('fd166000-0000-4000-8000-000000000001','fd161000-0000-4000-8000-000000000001','Copa Coração 100%_','league','draft',null,null,'fd160000-0000-4000-8000-000000000001','fd160000-0000-4000-8000-000000000001','2026-09-10 02:30:00+00','2026-09-10 10:00:00+00',null,null),
  ('fd166000-0000-4000-8000-000000000002','fd161000-0000-4000-8000-000000000001','Copa Publicada','knockout','draft',null,null,'fd160000-0000-4000-8000-000000000001','fd160000-0000-4000-8000-000000000001','2026-08-01','2026-09-09',null,null),
  ('fd166000-0000-4000-8000-000000000003','fd161000-0000-4000-8000-000000000001','Liga Ativa','league','draft',null,null,'fd160000-0000-4000-8000-000000000001','fd160000-0000-4000-8000-000000000001','2026-07-01','2026-09-08',null,null),
  ('fd166000-0000-4000-8000-000000000004','fd161000-0000-4000-8000-000000000001','Copa Encerrada','groups_knockout','draft',null,null,'fd160000-0000-4000-8000-000000000001','fd160000-0000-4000-8000-000000000001','2026-06-01','2026-09-07',2,1),
  ('fd166000-0000-4000-8000-000000000005','fd161000-0000-4000-8000-000000000001','Liga Arquivada','league','draft',null,null,'fd160000-0000-4000-8000-000000000001','fd160000-0000-4000-8000-000000000001','2026-05-01','2026-09-06',null,null),
  ('fd166000-0000-4000-8000-000000000006','fd161000-0000-4000-8000-000000000002','Campeonato Secreto','league','draft',null,null,'fd160000-0000-4000-8000-000000000003','fd160000-0000-4000-8000-000000000003','2026-09-01','2026-09-10',null,null);

update public.championships
set status = 'published', published_at = '2026-08-01',
  published_by = 'fd160000-0000-4000-8000-000000000001'
where id in (
  'fd166000-0000-4000-8000-000000000002',
  'fd166000-0000-4000-8000-000000000003',
  'fd166000-0000-4000-8000-000000000004',
  'fd166000-0000-4000-8000-000000000005'
);
update public.championships set status = 'active'
where id = 'fd166000-0000-4000-8000-000000000003';
update public.championships set status = 'completed'
where id = 'fd166000-0000-4000-8000-000000000004';
update public.championships set status = 'archived'
where id = 'fd166000-0000-4000-8000-000000000005';

insert into public.event_matches(
  id,event_id,team_id,ordinal,status,created_by
) values (
  'fd167000-0000-4000-8000-000000000001','fd163000-0000-4000-8000-000000000001',
  'fd161000-0000-4000-8000-000000000001',1,'scheduled','fd160000-0000-4000-8000-000000000001'
);
insert into public.championship_fixtures(
  id,championship_id,team_id,stage,status,round_number,ordinal,match_id,
  linked_at,linked_by,created_by,updated_by
) values (
  'fd168000-0000-4000-8000-000000000001','fd166000-0000-4000-8000-000000000001',
  'fd161000-0000-4000-8000-000000000001','league','scheduled',1,1,
  'fd167000-0000-4000-8000-000000000001',now(),'fd160000-0000-4000-8000-000000000001',
  'fd160000-0000-4000-8000-000000000001','fd160000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','fd160000-0000-4000-8000-000000000001',true);
create temporary table first_event_page as
select public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','upcoming'
) as payload;
select is((payload->>'filtered_count')::integer,31,
  'mais de 200 antigos não ocultam os 31 jogos futuros') from first_event_page;
select is(jsonb_array_length(payload->'items'),24,
  'página padrão contém 24 jogos') from first_event_page;
select ok(payload->'next_cursor' is not null,
  'primeira página devolve cursor composto') from first_event_page;
create temporary table second_event_page as
select public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','upcoming',
  requested_cursor => (select payload->'next_cursor' from first_event_page)
) as payload;
select is(jsonb_array_length(payload->'items'),7,
  'cursor acessa todos os futuros restantes') from second_event_page;
select ok(not exists (
  select 1 from first_event_page first_page, second_event_page second_page,
    jsonb_array_elements(first_page.payload->'items') first_item,
    jsonb_array_elements(second_page.payload->'items') second_item
  where first_item->>'id' = second_item->>'id'
), 'paginação estável não repete jogo entre páginas');
select is((public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','upcoming','coracao 100%_'
)->>'filtered_count')::integer,1,
  'busca ignora acento e trata percent e sublinhado literalmente');
select is((public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','upcoming',
  requested_period_start => ((now() at time zone 'America/Sao_Paulo')::date + 1),
  requested_period_end => ((now() at time zone 'America/Sao_Paulo')::date + 1)
)->>'filtered_count')::integer,1,
  'período respeita a virada do dia no fuso do time');
select is((public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','reschedule'
)->>'filtered_count')::integer,2,
  'a reagendar reúne adiamento explícito e horário vencido');
select is((public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','reschedule'
)->'items'->0->>'reschedule_reason'),'Horário passou sem encerramento',
  'horário vencido aparece primeiro com motivo operacional');
select is((public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','upcoming',
  requested_internal_team_id => 'fd164000-0000-4000-8000-000000000001'
)->>'filtered_count')::integer,1,
  'filtro de equipe interna é aplicado no banco');
select is((public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','upcoming',
  requested_championship_id => 'fd166000-0000-4000-8000-000000000001'
)->>'filtered_count')::integer,1,
  'filtro de campeonato é aplicado no banco');
select is((public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','completed'
)->>'filtered_count')::integer,230,
  'histórico completo permanece pesquisável');
create temporary table first_championship_page as
select public.list_management_championships(
  'fd161000-0000-4000-8000-000000000001'
) as payload;
select is((payload->>'filtered_count')::integer,35,
  'total filtrado de campeonatos cobre todo o conjunto') from first_championship_page;
select is(jsonb_array_length(payload->'items'),24,
  'página padrão contém 24 campeonatos') from first_championship_page;
select ok(payload->'next_cursor' is not null,
  'campeonatos devolvem cursor composto') from first_championship_page;
select is(jsonb_array_length(public.list_management_championships(
  'fd161000-0000-4000-8000-000000000001',
  requested_cursor => (select payload->'next_cursor' from first_championship_page)
)->'items'),11, 'segunda página contém os campeonatos restantes');
select is((public.list_management_championships(
  'fd161000-0000-4000-8000-000000000001',requested_search => 'coracao 100%_'
)->>'filtered_count')::integer,1,
  'busca de campeonato ignora acento e preserva literais');
select is((public.list_management_championships(
  'fd161000-0000-4000-8000-000000000001',requested_status => 'active'
)->>'filtered_count')::integer,1, 'filtro de situação usa estado interno tipado');
select is((public.list_management_championships(
  'fd161000-0000-4000-8000-000000000001',requested_created_start => '2026-09-09',
  requested_created_end => '2026-09-09'
)->>'filtered_count')::integer,1, 'criação usa período no fuso do time');
select lives_ok($$select public.list_management_championships(
  'fd161000-0000-4000-8000-000000000001',requested_format => 'league'
)$$, 'filtro tipado de formato é aceito');
select throws_ok($$select public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','upcoming','x'
)$$, '22023', 'Busca deve ter entre 2 e 80 caracteres', 'busca curta falha com validação');
select throws_ok($$select public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','upcoming',requested_limit => 51
)$$, '22023', 'Filtros de jogos inválidos', 'limite acima de 50 falha');
select throws_ok($$select public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','upcoming',
  requested_cursor => '{"id":"inválido"}'
)$$, '22023', 'Cursor de jogos inválido', 'cursor de jogos inválido não reinicia a lista');
select throws_ok($$select public.list_management_championships(
  'fd161000-0000-4000-8000-000000000001',requested_cursor => '{"sort_at":"ontem","id":"x"}'
)$$, '22023', 'Cursor de campeonatos inválido', 'cursor de campeonato inválido falha');
select throws_ok($$select public.list_management_championships(
  'fd161000-0000-4000-8000-000000000001',
  requested_created_start => '2026-09-10',requested_created_end => '2026-09-09'
)$$, '22023', 'Período de campeonatos inválido', 'intervalo invertido falha');
select performs_ok($$select public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','completed'
)$$, 500, 'lista de jogos fica abaixo do limite bloqueante local');
select performs_ok($$select public.list_management_championships(
  'fd161000-0000-4000-8000-000000000001'
)$$, 500, 'lista de campeonatos fica abaixo do limite bloqueante local');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fd160000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','upcoming'
)$$, 'manager ativo lê a lista administrativa');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fd160000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','upcoming'
)$$, '42501', 'Lista de jogos indisponível', 'owner de outro time não lê jogos');
select throws_ok($$select public.list_management_championships(
  'fd161000-0000-4000-8000-000000000001'
)$$, '42501', 'Lista de campeonatos indisponível', 'owner de outro time não lê campeonatos');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fd160000-0000-4000-8000-000000000004',true);
select throws_ok($$select public.list_management_events(
  'fd161000-0000-4000-8000-000000000001','upcoming'
)$$, '42501', 'Lista de jogos indisponível', 'atleta não recebe read model privado');
reset role;

select has_index('public','events','events_management_upcoming_idx',
  'índice de próximos começa pelo tenant');
select has_index('public','events','events_management_reschedule_idx',
  'índice de reagendamento acompanha a ordenação');
select has_index('public','championships','championships_management_list_idx',
  'índice de campeonatos acompanha situação e ordenação');
select has_index('public','championships','championships_management_search_idx',
  'campeonatos possuem índice de busca normalizada');

select * from finish();
rollback;
