begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(39);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','fa160000-0000-4000-8000-000000000001','authenticated','authenticated','owner-roster-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fa160000-0000-4000-8000-000000000002','authenticated','authenticated','manager-roster-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fa160000-0000-4000-8000-000000000003','authenticated','authenticated','owner-roster-b@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fa160000-0000-4000-8000-000000000004','authenticated','authenticated','player-roster-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fa160000-0000-4000-8000-000000000005','authenticated','authenticated','player-roster-b@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,timezone,default_sport_format,created_by) values
  ('fa161000-0000-4000-8000-000000000001','Elenco A','elenco-a','America/Sao_Paulo','society','fa160000-0000-4000-8000-000000000001'),
  ('fa161000-0000-4000-8000-000000000002','Elenco B','elenco-b','America/Sao_Paulo','society','fa160000-0000-4000-8000-000000000003');

insert into public.team_memberships(team_id,user_id,role,status,invited_by) values
  ('fa161000-0000-4000-8000-000000000001','fa160000-0000-4000-8000-000000000002','manager','active','fa160000-0000-4000-8000-000000000001');

insert into public.player_profiles(
  user_id,handle,display_name,preferred_name,photo_path,phone_verified_at
) values
  ('fa160000-0000-4000-8000-000000000004','jogador-coracao','José Coração','Zé Coração','fa160000-0000-4000-8000-000000000004/profile/fa164000-0000-4000-8000-000000000001.webp',now()),
  ('fa160000-0000-4000-8000-000000000005','jogador-secreto','Jogador Secreto','Segredo','fa160000-0000-4000-8000-000000000005/profile/fa164000-0000-4000-8000-000000000002.webp',now());

insert into public.athletes(
  id,team_id,user_id,full_name,preferred_name,shirt_number,status,photo_path,created_by
) values
  ('fa162000-0000-4000-8000-000000000001','fa161000-0000-4000-8000-000000000001','fa160000-0000-4000-8000-000000000004','José da Silva','José',10,'active',null,'fa160000-0000-4000-8000-000000000001'),
  ('fa162000-0000-4000-8000-000000000002','fa161000-0000-4000-8000-000000000001',null,'Ana Provisória','Ana',11,'active','fa161000-0000-4000-8000-000000000001/fa164000-0000-4000-8000-000000000003.jpg','fa160000-0000-4000-8000-000000000001'),
  ('fa162000-0000-4000-8000-000000000003','fa161000-0000-4000-8000-000000000001',null,'Foto Inválida',null,12,'active','fa161000-0000-4000-8000-000000000001/fora/avatar.gif','fa160000-0000-4000-8000-000000000001'),
  ('fa162000-0000-4000-8000-000000000004','fa161000-0000-4000-8000-000000000001',null,'Pessoa Pendente',null,null,'pending',null,'fa160000-0000-4000-8000-000000000001'),
  ('fa162000-0000-4000-8000-000000000005','fa161000-0000-4000-8000-000000000002','fa160000-0000-4000-8000-000000000005','Atleta do Outro Time','Segredo',9,'active',null,'fa160000-0000-4000-8000-000000000003'),
  ('fa162000-0000-4000-8000-000000000006','fa161000-0000-4000-8000-000000000001',null,'Pessoa Removida',null,13,'active','fa161000-0000-4000-8000-000000000001/fa164000-0000-4000-8000-000000000004.jpg','fa160000-0000-4000-8000-000000000001');

update public.athletes
set removed_at = now(), removed_by = 'fa160000-0000-4000-8000-000000000001'
where id = 'fa162000-0000-4000-8000-000000000006';

insert into public.athletes(team_id,full_name,preferred_name,status,created_by)
select
  'fa161000-0000-4000-8000-000000000001',
  'Atleta Teste ' || lpad(item::text, 3, '0'),
  case when item in (1, 2) then 'Mesmo Nome' else null end,
  'active',
  'fa160000-0000-4000-8000-000000000001'
from generate_series(1,225) item;

insert into public.player_position_preferences(user_id,sport_format,position_code,priority)
values ('fa160000-0000-4000-8000-000000000004','society','PIVOT',1);
insert into public.athlete_position_preferences(
  athlete_id,team_id,sport_format,position_code,priority
) values
  ('fa162000-0000-4000-8000-000000000002','fa161000-0000-4000-8000-000000000001','society','ALA',1),
  ('fa162000-0000-4000-8000-000000000003','fa161000-0000-4000-8000-000000000001','society','GK',1);

insert into storage.objects(bucket_id,name) values
  ('athlete_avatars','fa160000-0000-4000-8000-000000000004/profile/fa164000-0000-4000-8000-000000000001.webp'),
  ('athlete_avatars','fa160000-0000-4000-8000-000000000005/profile/fa164000-0000-4000-8000-000000000002.webp'),
  ('athlete_avatars','fa161000-0000-4000-8000-000000000001/fa164000-0000-4000-8000-000000000003.jpg'),
  ('athlete_avatars','fa169000-0000-4000-8000-000000000001/profile/fa164000-0000-4000-8000-000000000009.webp');

select ok('recognizable_roster' = any(enum_range(null::public.feature_key)::text[]),
  'flag tipada do elenco reconhecível existe');
select ok(not ('recognizable_roster' = any(array(
  select feature::text from private.product_feature_keys() feature
))), 'flag permanece fora do catálogo global');
select is((select count(*) from public.team_feature_flags
  where feature = 'recognizable_roster'),0::bigint,
  'expansão não materializa a flag em nenhum time');
select has_function('public','list_management_athletes',array[
  'uuid','athlete_status','text','text','integer','jsonb'
], 'read model privado do elenco existe');
select has_function('private','can_read_management_athlete_avatar',array['text'],
  'autorização estreita da foto existe');
select has_index('public','athletes','athletes_management_roster_idx',
  'índice de ordenação do elenco existe');
select has_index('public','athletes','athletes_management_search_idx',
  'índice de busca do elenco existe');
select has_index('public','athlete_position_preferences',
  'athlete_positions_management_filter_idx','índice de posição provisória existe');
select ok(has_function_privilege('authenticated',
  'public.list_management_athletes(uuid,public.athlete_status,text,text,integer,jsonb)',
  'execute'), 'authenticated pode chamar a RPC protegida');
select ok(not has_function_privilege('anon',
  'public.list_management_athletes(uuid,public.athlete_status,text,text,integer,jsonb)',
  'execute'), 'anônimo não chama a RPC');
select ok(has_function_privilege('authenticated',
  'private.can_read_management_athlete_avatar(text)','execute'),
  'política de storage pode executar o helper fora do schema exposto');

set local role authenticated;
select set_config('request.jwt.claim.sub','fa160000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001'
)$$, 'P0001', 'Elenco reconhecível indisponível',
  'flag desligada mantém o fallback atual');
select is((select count(*) from storage.objects where bucket_id='athlete_avatars'
  and name like 'fa160000-0000-4000-8000-000000000004/%'),0::bigint,
  'flag desligada não libera a foto reivindicada ao staff');
reset role;

insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('fa161000-0000-4000-8000-000000000001','recognizable_roster',true,'fa160000-0000-4000-8000-000000000001'),
  ('fa161000-0000-4000-8000-000000000002','recognizable_roster',true,'fa160000-0000-4000-8000-000000000003');

set local role authenticated;
select set_config('request.jwt.claim.sub','fa160000-0000-4000-8000-000000000001',true);
create temporary table first_roster_page as
select public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001'
) as payload;
select is((payload->>'filtered_count')::integer,228,
  'lista cobre mais de 220 vínculos ativos sem truncar') from first_roster_page;
select is((payload->>'pending_count')::integer,1,
  'contador de pendências independe do filtro ativo') from first_roster_page;
select is(jsonb_array_length(payload->'items'),24,
  'página padrão contém 24 atletas') from first_roster_page;
select ok(payload->'next_cursor' is not null,
  'primeira página devolve cursor composto') from first_roster_page;
create temporary table second_roster_page as
select public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001',
  requested_cursor => (select payload->'next_cursor' from first_roster_page)
) as payload;
select is(jsonb_array_length(payload->'items'),24,
  'cursor composto acessa a página seguinte') from second_roster_page;
select ok(not exists (
  select 1 from first_roster_page first_page, second_roster_page second_page,
    jsonb_array_elements(first_page.payload->'items') first_item,
    jsonb_array_elements(second_page.payload->'items') second_item
  where first_item->>'id' = second_item->>'id'
), 'paginação não repete atleta mesmo com nomes empatados');
select is((public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001',requested_search => 'ze coracao'
)->>'filtered_count')::integer,1,
  'busca combina perfil e vínculo ignorando acentos');
select is((public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001',requested_position_code => 'pivot'
)->>'filtered_count')::integer,1,
  'posição reivindicada vem da identidade do atleta');
select is((public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001',requested_position_code => 'ala'
)->>'filtered_count')::integer,1,
  'posição provisória vem do cadastro do time');
select is((public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001','pending'
)->>'filtered_count')::integer,1,
  'filtro de situação retorna somente pendências');
select is((public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001',requested_search => 'foto invalida'
)->'items'->0->'photo_path')::text,'null',
  'caminho de foto inválido vira placeholder');
select ok((public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001',requested_search => 'ze coracao'
)->'items'->0->>'photo_path') like 'fa160000-0000-4000-8000-000000000004/profile/%',
  'projeção reivindicada usa o caminho canônico global');
select ok(position('phone_e164' in public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001'
)::text) = 0, 'lista não projeta telefone');
select ok(position('email' in public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001'
)::text) = 0, 'lista não projeta e-mail');
select throws_ok($$select public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001',requested_search => 'x'
)$$, '22023', 'Busca deve ter entre 2 e 80 caracteres',
  'busca curta falha sem ampliar consulta');
select throws_ok($$select public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001',requested_position_code => 'CB'
)$$, '22023', 'Posição inválida para a modalidade do time',
  'posição de outra modalidade falha');
select throws_ok($$select public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001',requested_limit => 51
)$$, '22023', 'Filtros de atletas inválidos',
  'limite acima de 50 falha');
select throws_ok($$select public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001',
  requested_cursor => '{"sort_name":"Ana","id":"x"}'
)$$, '22023', 'Cursor de atletas inválido',
  'cursor adulterado não reinicia a lista');
select performs_ok($$select public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001'
)$$,300,'read model fica abaixo do alvo local com mais de 220 vínculos');
select is((select count(*) from storage.objects where bucket_id='athlete_avatars'),2::bigint,
  'owner lê apenas a foto reivindicada e a provisória do próprio time');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fa160000-0000-4000-8000-000000000002',true);
select is((public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001',requested_search => 'ze coracao'
)->'items'->0->'allowed_actions'->>'can_edit')::boolean,false,
  'manager lê a lista sem ganhar permissão de edição');
select is((select count(*) from storage.objects where bucket_id='athlete_avatars'),2::bigint,
  'manager ativo lê somente fotos vinculadas ao próprio time');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fa160000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001'
)$$, '42501', 'Lista de atletas indisponível',
  'owner de outro time falha fechado sem total');
select is((select count(*) from storage.objects where bucket_id='athlete_avatars'
  and name like 'fa160000-0000-4000-8000-000000000004/%'),0::bigint,
  'owner de outro time não lê foto reivindicada alheia');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fa160000-0000-4000-8000-000000000004',true);
select throws_ok($$select public.list_management_athletes(
  'fa161000-0000-4000-8000-000000000001'
)$$, '42501', 'Lista de atletas indisponível',
  'atleta autenticado não acessa a lista administrativa');
select is((select count(*) from storage.objects where bucket_id='athlete_avatars'),1::bigint,
  'atleta continua vendo somente sua própria foto');
reset role;

select * from finish();
rollback;
