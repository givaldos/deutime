begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(16);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','b8100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-internal-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','b8100000-0000-4000-8000-000000000002','authenticated','authenticated','owner-internal-b@example.test','',now(),'{}','{}',now(),now(),'','','','');
insert into public.teams(id,name,slug,created_by) values
  ('b8200000-0000-4000-8000-000000000001','Interno A','interno-a','b8100000-0000-4000-8000-000000000001'),
  ('b8200000-0000-4000-8000-000000000002','Interno B','interno-b','b8100000-0000-4000-8000-000000000002');
insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('b8200000-0000-4000-8000-000000000001','team_division',true,'b8100000-0000-4000-8000-000000000001'),
  ('b8200000-0000-4000-8000-000000000002','team_division',true,'b8100000-0000-4000-8000-000000000002');
insert into public.events(id,team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,status,created_by) values
  ('b8300000-0000-4000-8000-000000000001','b8200000-0000-4000-8000-000000000001','Evento interno','weekly_match','split_teams','society',now()+interval '3 days',now()+interval '3 days 1 hour','scheduled','b8100000-0000-4000-8000-000000000001');

select has_column('public','team_squad_presets','badge_key','equipe interna possui escudo padronizado');
select has_column('public','team_squad_presets','is_active','equipe interna pode sair de uso sem ser apagada');
select has_column('public','event_squads','internal_team_id','time do evento referencia identidade interna');
select has_column('public','event_squads','badge_key','evento preserva snapshot do escudo');

set local role authenticated;
select set_config('request.jwt.claim.sub','b8100000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.replace_team_squad_presets(
  'b8200000-0000-4000-8000-000000000001','b8500000-0000-4000-8000-000000000001',
  '[{"id":"b8400000-0000-4000-8000-000000000001","name":"Verde","color":"#0D9488","badge_key":"stripes","sort_order":1},{"id":"b8400000-0000-4000-8000-000000000002","name":"Azul","color":"#2563EB","badge_key":"sash","sort_order":2}]'
)$$,'owner salva equipes internas com escudo');
reset role;

select is((select badge_key::text from public.team_squad_presets where id='b8400000-0000-4000-8000-000000000001'),'stripes','catálogo do escudo é persistido');

insert into public.event_squads(id,event_id,team_id,sport_format,name,color,sort_order) values
  ('b8600000-0000-4000-8000-000000000001','b8300000-0000-4000-8000-000000000001','b8200000-0000-4000-8000-000000000001','society','Azul','#2563EB',1);
select is((select internal_team_id from public.event_squads where id='b8600000-0000-4000-8000-000000000001'),'b8400000-0000-4000-8000-000000000002'::uuid,'evento recebe identidade interna automaticamente');
select is((select badge_key::text from public.event_squads where id='b8600000-0000-4000-8000-000000000001'),'sash','evento guarda snapshot do escudo');

set local role authenticated;
select set_config('request.jwt.claim.sub','b8100000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.replace_team_squad_presets(
  'b8200000-0000-4000-8000-000000000001','b8500000-0000-4000-8000-000000000002',
  '[{"id":"b8400000-0000-4000-8000-000000000001","name":"Verde novo","color":"#0D9488","badge_key":"quarters","sort_order":1},{"id":"b8400000-0000-4000-8000-000000000003","name":"Vermelho","color":"#DC2626","badge_key":"diamond","sort_order":2}]'
)$$,'substituição desativa ausente sem apagar histórico');
reset role;

select is((select is_active from public.team_squad_presets where id='b8400000-0000-4000-8000-000000000002'),false,'equipe retirada fica inativa');
select is((select internal_team_id from public.event_squads where id='b8600000-0000-4000-8000-000000000001'),'b8400000-0000-4000-8000-000000000002'::uuid,'evento histórico conserva identidade inativa');
select is((select name from public.event_squads where id='b8600000-0000-4000-8000-000000000001'),'Azul','snapshot histórico não é renomeado');

set local role authenticated;
select set_config('request.jwt.claim.sub','b8100000-0000-4000-8000-000000000001',true);
select is((select count(*) from public.team_squad_presets where team_id='b8200000-0000-4000-8000-000000000001'),2::bigint,'RLS comum mostra somente equipes ativas');
select throws_ok($$select public.replace_team_squad_presets(
  'b8200000-0000-4000-8000-000000000001','b8500000-0000-4000-8000-000000000003',
  '[{"id":"b8400000-0000-4000-8000-000000000004","name":"Um","color":"#111111","badge_key":"inventado","sort_order":1},{"id":"b8400000-0000-4000-8000-000000000005","name":"Dois","color":"#222222","badge_key":"shield","sort_order":2}]'
)$$,'22023',null,'escudo fora do catálogo é recusado');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','b8100000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.team_squad_presets where team_id='b8200000-0000-4000-8000-000000000001'),0::bigint,'outro time não lê equipes internas');
reset role;

select ok((select bool_and(not metadata ? 'name' and not metadata ? 'badge_key') from public.audit_logs where team_id='b8200000-0000-4000-8000-000000000001' and action='lineup.presets.replaced'),'auditoria permanece agregada e redigida');

select * from finish();
rollback;
