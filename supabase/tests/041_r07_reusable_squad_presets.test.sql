begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(19);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','a8100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-preset-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a8100000-0000-4000-8000-000000000002','authenticated','authenticated','manager-preset-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a8100000-0000-4000-8000-000000000003','authenticated','authenticated','owner-preset-b@example.test','',now(),'{}','{}',now(),now(),'','','','');
insert into public.teams(id,name,slug,created_by) values
  ('a8200000-0000-4000-8000-000000000001','Preset A','preset-a','a8100000-0000-4000-8000-000000000001'),
  ('a8200000-0000-4000-8000-000000000002','Preset B','preset-b','a8100000-0000-4000-8000-000000000003');
insert into public.team_memberships(team_id,user_id,role,status,invited_by) values
  ('a8200000-0000-4000-8000-000000000001','a8100000-0000-4000-8000-000000000002','manager','active','a8100000-0000-4000-8000-000000000001');
insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('a8200000-0000-4000-8000-000000000001','team_division',true,'a8100000-0000-4000-8000-000000000001'),
  ('a8200000-0000-4000-8000-000000000002','team_division',true,'a8100000-0000-4000-8000-000000000003');
insert into public.events(id,team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,status,created_by) values
  ('a8300000-0000-4000-8000-000000000001','a8200000-0000-4000-8000-000000000001','Evento preservado','weekly_match','split_teams','society',now()+interval '3 days',now()+interval '3 days 1 hour','scheduled','a8100000-0000-4000-8000-000000000001');
insert into public.event_squads(id,event_id,team_id,sport_format,name,color,sort_order) values
  ('a8600000-0000-4000-8000-000000000001','a8300000-0000-4000-8000-000000000001','a8200000-0000-4000-8000-000000000001','society','Evento Azul','#111111',1),
  ('a8600000-0000-4000-8000-000000000002','a8300000-0000-4000-8000-000000000001','a8200000-0000-4000-8000-000000000001','society','Evento Branco','#EEEEEE',2);

select has_table('public','team_squad_presets','tabela de modelos existe');
select ok((select relrowsecurity from pg_class where oid='public.team_squad_presets'::regclass),'modelos usam RLS');
select ok(has_function_privilege('authenticated','public.replace_team_squad_presets(uuid,uuid,jsonb)','EXECUTE'),'authenticated acessa RPC protegida');
select ok(not has_function_privilege('anon','public.replace_team_squad_presets(uuid,uuid,jsonb)','EXECUTE'),'anon não acessa RPC');
select ok(not has_table_privilege('authenticated','public.team_squad_presets','INSERT'),'cliente não escreve tabela');
select ok(not has_table_privilege('authenticated','public.team_squad_preset_commands','SELECT'),'comandos internos não são legíveis');

set local role authenticated;
select set_config('request.jwt.claim.sub','a8100000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.replace_team_squad_presets(
  'a8200000-0000-4000-8000-000000000001','a8500000-0000-4000-8000-000000000001',
  '[{"id":"a8400000-0000-4000-8000-000000000001","name":"Verde","color":"#0D9488","sort_order":1},{"id":"a8400000-0000-4000-8000-000000000002","name":"Azul","color":"#2563EB","sort_order":2}]'
)$$,'42501',null,'manager não altera modelos permanentes');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a8100000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.replace_team_squad_presets(
  'a8200000-0000-4000-8000-000000000001','a8500000-0000-4000-8000-000000000002',
  '[{"id":"a8400000-0000-4000-8000-000000000001","name":"Verde","color":"#0D9488","sort_order":1},{"id":"a8400000-0000-4000-8000-000000000002","name":"Azul","color":"#2563EB","sort_order":2}]'
)$$,'owner salva modelos válidos');
select is((select preset_count from public.replace_team_squad_presets(
  'a8200000-0000-4000-8000-000000000001','a8500000-0000-4000-8000-000000000002',
  '[{"id":"a8400000-0000-4000-8000-000000000001","name":"Ignorado","color":"#000000","sort_order":1},{"id":"a8400000-0000-4000-8000-000000000002","name":"Também","color":"#FFFFFF","sort_order":2}]'
)),2,'replay devolve resultado original');
select is((select replayed from public.replace_team_squad_presets(
  'a8200000-0000-4000-8000-000000000001','a8500000-0000-4000-8000-000000000002','[]'
)),true,'replay é sinalizado sem revalidar payload');
reset role;

select is((select count(*) from public.team_squad_presets where team_id='a8200000-0000-4000-8000-000000000001'),2::bigint,'dois modelos persistidos');
select is((select name from public.team_squad_presets where id='a8400000-0000-4000-8000-000000000001'),'Verde','replay não altera modelo');
select is((select count(*) from public.event_squads where event_id='a8300000-0000-4000-8000-000000000001' and name like 'Evento %'),2::bigint,'modelo não reescreve evento histórico');
select is((select count(*) from public.audit_logs where team_id='a8200000-0000-4000-8000-000000000001' and action='lineup.presets.replaced'),1::bigint,'auditoria agregada é única');

set local role authenticated;
select set_config('request.jwt.claim.sub','a8100000-0000-4000-8000-000000000003',true);
select is((select count(*) from public.team_squad_presets where team_id='a8200000-0000-4000-8000-000000000001'),0::bigint,'outro time não lê modelos');
select throws_ok($$select public.replace_team_squad_presets(
  'a8200000-0000-4000-8000-000000000002','a8500000-0000-4000-8000-000000000003',
  '[{"id":"a8400000-0000-4000-8000-000000000001","name":"Cruzado","color":"#111111","sort_order":1},{"id":"a8400000-0000-4000-8000-000000000003","name":"Outro","color":"#222222","sort_order":2}]'
)$$,'22023',null,'ID de modelo de outro time é recusado');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a8100000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.replace_team_squad_presets(
  'a8200000-0000-4000-8000-000000000001','a8500000-0000-4000-8000-000000000004',
  '[{"id":"a8400000-0000-4000-8000-000000000004","name":"Mesmo","color":"#111111","sort_order":1},{"id":"a8400000-0000-4000-8000-000000000005","name":"mesmo","color":"#222222","sort_order":2}]'
)$$,'22023',null,'nomes duplicados são recusados');
reset role;

select is((select count(*) from public.team_squad_preset_commands where team_id='a8200000-0000-4000-8000-000000000001'),1::bigint,'uma intenção idempotente persistida');
select ok((select metadata = '{"preset_count": 2}'::jsonb from public.audit_logs where action='lineup.presets.replaced' and team_id='a8200000-0000-4000-8000-000000000001'),'auditoria não contém nomes ou atletas');

select * from finish();
rollback;
