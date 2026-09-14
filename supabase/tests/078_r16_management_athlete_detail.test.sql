begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(25);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','fb160000-0000-4000-8000-000000000001','authenticated','authenticated','owner-detail-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fb160000-0000-4000-8000-000000000002','authenticated','authenticated','manager-detail-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fb160000-0000-4000-8000-000000000003','authenticated','authenticated','owner-detail-b@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fb160000-0000-4000-8000-000000000004','authenticated','authenticated','player-detail-a@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,timezone,default_sport_format,created_by) values
  ('fb161000-0000-4000-8000-000000000001','Detalhe A','detalhe-a','America/Sao_Paulo','society','fb160000-0000-4000-8000-000000000001'),
  ('fb161000-0000-4000-8000-000000000002','Detalhe B','detalhe-b','America/Sao_Paulo','society','fb160000-0000-4000-8000-000000000003');

insert into public.team_memberships(team_id,user_id,role,status,invited_by) values
  ('fb161000-0000-4000-8000-000000000001','fb160000-0000-4000-8000-000000000002','manager','active','fb160000-0000-4000-8000-000000000001');

insert into public.player_profiles(
  user_id,handle,display_name,preferred_name,photo_path,phone_verified_at
) values (
  'fb160000-0000-4000-8000-000000000004','atleta-detalhe','João Detalhe',
  'Jota','fb160000-0000-4000-8000-000000000004/profile/fb164000-0000-4000-8000-000000000001.webp',now()
);

insert into public.athletes(
  id,team_id,user_id,full_name,preferred_name,shirt_number,status,photo_path,
  joined_on,created_by
) values
  ('fb162000-0000-4000-8000-000000000001','fb161000-0000-4000-8000-000000000001','fb160000-0000-4000-8000-000000000004','João da Silva','João',10,'active',null,'2026-01-10','fb160000-0000-4000-8000-000000000001'),
  ('fb162000-0000-4000-8000-000000000002','fb161000-0000-4000-8000-000000000001',null,'Ana Provisória','Ana',11,'pending','fb161000-0000-4000-8000-000000000001/fb164000-0000-4000-8000-000000000002.jpg',null,'fb160000-0000-4000-8000-000000000001'),
  ('fb162000-0000-4000-8000-000000000003','fb161000-0000-4000-8000-000000000002',null,'Outro Tenant',null,9,'active',null,null,'fb160000-0000-4000-8000-000000000003'),
  ('fb162000-0000-4000-8000-000000000004','fb161000-0000-4000-8000-000000000001',null,'Pessoa Removida',null,8,'active',null,null,'fb160000-0000-4000-8000-000000000001');

update public.athletes set removed_at=now(),removed_by='fb160000-0000-4000-8000-000000000001'
where id='fb162000-0000-4000-8000-000000000004';

insert into public.athlete_private(
  athlete_id,team_id,birth_date,phone_e164,email,notes
) values
  ('fb162000-0000-4000-8000-000000000001','fb161000-0000-4000-8000-000000000001','1990-05-20','+5511999999999','jota@example.test','Contato somente no detalhe'),
  ('fb162000-0000-4000-8000-000000000002','fb161000-0000-4000-8000-000000000001','1995-07-15','+5511888888888','ana@example.test','Cadastro provisório');

insert into public.player_position_preferences(user_id,sport_format,position_code,priority)
values ('fb160000-0000-4000-8000-000000000004','society','PIVOT',1);
insert into public.athlete_position_preferences(
  athlete_id,team_id,sport_format,position_code,priority
) values ('fb162000-0000-4000-8000-000000000002','fb161000-0000-4000-8000-000000000001','society','ALA',1);

insert into public.events(
  id,team_id,title,kind,sport_format,starts_at,ends_at,status,created_by
) values (
  'fb165000-0000-4000-8000-000000000001','fb161000-0000-4000-8000-000000000001',
  'Amistoso encerrado','friendly','society','2026-09-01 18:00:00+00',
  '2026-09-01 19:00:00+00','completed','fb160000-0000-4000-8000-000000000001'
);
insert into public.event_attendance(event_id,team_id,athlete_id,status,source)
values ('fb165000-0000-4000-8000-000000000001','fb161000-0000-4000-8000-000000000001','fb162000-0000-4000-8000-000000000001','confirmed','admin');
insert into public.event_squads(id,event_id,team_id,sport_format,name,is_official)
values ('fb166000-0000-4000-8000-000000000001','fb165000-0000-4000-8000-000000000001','fb161000-0000-4000-8000-000000000001','society','Time A',true);
insert into public.lineup_spots(
  id,squad_id,event_id,team_id,athlete_id,sport_format,position_code,slot_kind
) values ('fb167000-0000-4000-8000-000000000001','fb166000-0000-4000-8000-000000000001','fb165000-0000-4000-8000-000000000001','fb161000-0000-4000-8000-000000000001','fb162000-0000-4000-8000-000000000001','society','PIVOT','starter');

select has_function('public','get_management_athlete_detail',array['uuid','uuid'],
  'read model privado do detalhe existe');
select has_index('public','event_attendance','event_attendance_management_athlete_idx',
  'participações do detalhe possuem índice por time e atleta');
select ok(has_function_privilege('authenticated',
  'public.get_management_athlete_detail(uuid,uuid)','execute'),
  'authenticated pode chamar a RPC protegida');
select ok(not has_function_privilege('anon',
  'public.get_management_athlete_detail(uuid,uuid)','execute'),
  'anônimo não chama a RPC');

set local role authenticated;
select set_config('request.jwt.claim.sub','fb160000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.get_management_athlete_detail(
  'fb161000-0000-4000-8000-000000000001','fb162000-0000-4000-8000-000000000001'
)$$,'P0001','Elenco reconhecível indisponível','flag desligada não expõe o detalhe');
reset role;

insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('fb161000-0000-4000-8000-000000000001','recognizable_roster',true,'fb160000-0000-4000-8000-000000000001'),
  ('fb161000-0000-4000-8000-000000000002','recognizable_roster',true,'fb160000-0000-4000-8000-000000000003');

set local role authenticated;
select set_config('request.jwt.claim.sub','fb160000-0000-4000-8000-000000000001',true);
create temporary table claimed_detail as select public.get_management_athlete_detail(
  'fb161000-0000-4000-8000-000000000001','fb162000-0000-4000-8000-000000000001'
) payload;
select is(payload->>'display_name','Jota','identidade reivindicada usa o perfil global') from claimed_detail;
select is(payload->'contact'->>'phone_e164','+5511999999999','telefone aparece somente na projeção privada') from claimed_detail;
select is(payload->'contact'->>'email','jota@example.test','e-mail autorizado aparece no detalhe') from claimed_detail;
select is(payload->'contact'->>'notes','Contato somente no detalhe','observação autorizada aparece no detalhe') from claimed_detail;
select is(payload->'positions'->0->>'code','PIVOT','posição reivindicada vem do perfil global') from claimed_detail;
select ok((payload->>'photo_path') like 'fb160000-0000-4000-8000-000000000004/profile/%','foto reivindicada usa caminho canônico') from claimed_detail;
select is(jsonb_array_length(payload->'recent_participations'),1,'participações existentes são projetadas sem agregação') from claimed_detail;
select is((payload->'recent_participations'->0->>'in_lineup')::boolean,true,'participação informa convocação factual') from claimed_detail;
select is((payload->>'sports_statistics_available')::boolean,false,'estatística indisponível não é improvisada') from claimed_detail;
select is((payload->'allowed_actions'->>'can_edit')::boolean,true,'owner preserva ação de edição') from claimed_detail;
select performs_ok($$select public.get_management_athlete_detail(
  'fb161000-0000-4000-8000-000000000001','fb162000-0000-4000-8000-000000000001'
)$$,300,'detalhe privado responde abaixo do alvo local de 300 ms');

create temporary table provisional_detail as select public.get_management_athlete_detail(
  'fb161000-0000-4000-8000-000000000001','fb162000-0000-4000-8000-000000000002'
) payload;
select is((payload->>'claimed')::boolean,false,'vínculo provisório permanece identificado') from provisional_detail;
select is(payload->'positions'->0->>'code','ALA','posição provisória vem do cadastro do time') from provisional_detail;
select is(payload->>'photo_source','team_registration','foto provisória mantém sua fonte') from provisional_detail;
select is((payload->'allowed_actions'->>'can_review')::boolean,true,'owner pode revisar vínculo pendente') from provisional_detail;
select throws_ok($$select public.get_management_athlete_detail(
  'fb161000-0000-4000-8000-000000000001','fb162000-0000-4000-8000-000000000004'
)$$,'42501','Detalhe do atleta indisponível','registro removido falha sem revelar existência');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fb160000-0000-4000-8000-000000000002',true);
select is((public.get_management_athlete_detail(
  'fb161000-0000-4000-8000-000000000001','fb162000-0000-4000-8000-000000000001'
)->'allowed_actions'->>'can_edit')::boolean,false,'manager lê detalhe sem ganhar escrita');
select is(public.get_management_athlete_detail(
  'fb161000-0000-4000-8000-000000000001','fb162000-0000-4000-8000-000000000001'
)->'contact'->>'birth_date','1990-05-20','manager ativo preserva a leitura privada já autorizada');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fb160000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.get_management_athlete_detail(
  'fb161000-0000-4000-8000-000000000001','fb162000-0000-4000-8000-000000000001'
)$$,'42501','Detalhe do atleta indisponível','owner de outro time falha fechado');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fb160000-0000-4000-8000-000000000004',true);
select throws_ok($$select public.get_management_athlete_detail(
  'fb161000-0000-4000-8000-000000000001','fb162000-0000-4000-8000-000000000001'
)$$,'42501','Detalhe do atleta indisponível','atleta autenticado não acessa detalhe administrativo');
reset role;

select * from finish();
rollback;
