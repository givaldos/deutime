begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(18);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','e7100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-r07-public@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','e7100000-0000-4000-8000-000000000002','authenticated','authenticated','player-r07-public@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,created_by) values
  ('e7200000-0000-4000-8000-000000000001','R07 Público','r07-publico','e7100000-0000-4000-8000-000000000001');
insert into public.events(id,public_id,team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,status,created_by) values
  ('e7300000-0000-4000-8000-000000000001','e7310000-0000-4000-8000-000000000001','e7200000-0000-4000-8000-000000000001','Pelada Pública R07','weekly_match','split_teams','society',now()+interval '5 days',now()+interval '5 days 90 minutes','scheduled','e7100000-0000-4000-8000-000000000001');
insert into public.athletes(id,team_id,user_id,full_name,preferred_name,status,created_by) values
  ('e7400000-0000-4000-8000-000000000001','e7200000-0000-4000-8000-000000000001','e7100000-0000-4000-8000-000000000002','Nome Civil Consentido','Craque Consentido','active','e7100000-0000-4000-8000-000000000001'),
  ('e7400000-0000-4000-8000-000000000002','e7200000-0000-4000-8000-000000000001',null,'Nome Privado Sem Consentimento','Privado Completo','active','e7100000-0000-4000-8000-000000000001');
insert into public.event_attendance(event_id,team_id,athlete_id,status) values
  ('e7300000-0000-4000-8000-000000000001','e7200000-0000-4000-8000-000000000001','e7400000-0000-4000-8000-000000000001','confirmed'),
  ('e7300000-0000-4000-8000-000000000001','e7200000-0000-4000-8000-000000000001','e7400000-0000-4000-8000-000000000002','confirmed');

select has_function('public','get_public_event_lineup',array['uuid'],'projeção pública existe');
select ok(has_function_privilege('anon','public.get_public_event_lineup(uuid)','EXECUTE'),'anon pode consultar projeção estreita');
select ok(not has_table_privilege('anon','public.event_lineup_revisions','SELECT'),'anon não lê revisões diretamente');
select is(public.get_public_event_lineup('e7310000-0000-4000-8000-000000000001'),null::jsonb,'flags desligadas falham fechadas');

insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('e7200000-0000-4000-8000-000000000001','public_event_page',true,'e7100000-0000-4000-8000-000000000001'),
  ('e7200000-0000-4000-8000-000000000001','team_division',true,'e7100000-0000-4000-8000-000000000001');
select is(public.get_public_event_lineup('e7310000-0000-4000-8000-000000000001'),null::jsonb,'sem revisão ativa preserva fallback');

set local role authenticated;
select set_config('request.jwt.claim.sub','e7100000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.save_event_lineup_draft(
  'e7300000-0000-4000-8000-000000000001','e7500000-0000-4000-8000-000000000001',
  '[{"id":"e7600000-0000-4000-8000-000000000001","name":"Verde","color":"#0D9488","sort_order":1},{"id":"e7600000-0000-4000-8000-000000000002","name":"Azul","color":"#2563EB","sort_order":2}]',
  '[{"athlete_id":"e7400000-0000-4000-8000-000000000001","squad_id":"e7600000-0000-4000-8000-000000000001","sort_order":1},{"athlete_id":"e7400000-0000-4000-8000-000000000002","squad_id":"e7600000-0000-4000-8000-000000000002","sort_order":1}]','{}')$$,'owner salva rascunho');
select lives_ok($$select public.publish_event_lineup('e7300000-0000-4000-8000-000000000001','e7500000-0000-4000-8000-000000000002')$$,'owner publica revisão');
reset role;

select is(jsonb_array_length(public.get_public_event_lineup('e7310000-0000-4000-8000-000000000001')->'squads'),2,'projeção mantém os dois times');
select is((public.get_public_event_lineup('e7310000-0000-4000-8000-000000000001')->>'revision')::integer,1,'projeção informa somente número da revisão');
select is(public.get_public_event_lineup('e7310000-0000-4000-8000-000000000001')->'squads'->0->'athletes'->0->>'name','Craque','projeção reduz nome esportivo ao primeiro nome');
select is(public.get_public_event_lineup('e7310000-0000-4000-8000-000000000001')->'squads'->1->'athletes'->0->>'name','Privado','primeiro nome escalado aparece sem depender de consentimento esportivo');

set local role authenticated;
select set_config('request.jwt.claim.sub','e7100000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.set_public_sports_activity_consent('e7400000-0000-4000-8000-000000000001',true,'r07-v1','e7500000-0000-4000-8000-000000000003')$$,'titular concede consentimento');
reset role;

select is(public.get_public_event_lineup('e7310000-0000-4000-8000-000000000001')->'squads'->0->'athletes'->0->>'name','Craque','consentimento não amplia o nome mínimo da escalação');
select ok(public.get_public_event_lineup('e7310000-0000-4000-8000-000000000001')::text not like '%Nome Civil%' and public.get_public_event_lineup('e7310000-0000-4000-8000-000000000001')::text not like '%Completo%' and public.get_public_event_lineup('e7310000-0000-4000-8000-000000000001')::text not like '%Consentido%' and public.get_public_event_lineup('e7310000-0000-4000-8000-000000000001')::text not like '%e7400000%','projeção omite sobrenome, nome civil e IDs');

set local role authenticated;
select set_config('request.jwt.claim.sub','e7100000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.set_public_sports_activity_consent('e7400000-0000-4000-8000-000000000001',false,'r07-v1','e7500000-0000-4000-8000-000000000004')$$,'titular revoga consentimento');
reset role;
select is(public.get_public_event_lineup('e7310000-0000-4000-8000-000000000001')->'squads'->0->'athletes'->0->>'name','Craque','revogação não altera o primeiro nome mínimo da escalação publicada');

set local role authenticated;
select set_config('request.jwt.claim.sub','e7100000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.withdraw_event_lineup_publication('e7300000-0000-4000-8000-000000000001','e7500000-0000-4000-8000-000000000005')$$,'owner retira publicação');
reset role;
select is(public.get_public_event_lineup('e7310000-0000-4000-8000-000000000001'),null::jsonb,'retirada remove a projeção e preserva fallback');

select * from finish();
rollback;
