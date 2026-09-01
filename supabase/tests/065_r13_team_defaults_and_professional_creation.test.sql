begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(36);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','d1100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-r13-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','d1100000-0000-4000-8000-000000000002','authenticated','authenticated','manager-r13-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','d1100000-0000-4000-8000-000000000003','authenticated','authenticated','owner-r13-b@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,created_by) values
  ('d1200000-0000-4000-8000-000000000001','Profissional A','profissional-a','d1100000-0000-4000-8000-000000000001'),
  ('d1200000-0000-4000-8000-000000000002','Profissional B','profissional-b','d1100000-0000-4000-8000-000000000003');

insert into public.team_memberships(team_id,user_id,role,status,invited_by) values
  ('d1200000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000002','manager','active','d1100000-0000-4000-8000-000000000001');

insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('d1200000-0000-4000-8000-000000000001','team_division',true,'d1100000-0000-4000-8000-000000000001'),
  ('d1200000-0000-4000-8000-000000000001','event_control',true,'d1100000-0000-4000-8000-000000000001'),
  ('d1200000-0000-4000-8000-000000000001','championships',true,'d1100000-0000-4000-8000-000000000001'),
  ('d1200000-0000-4000-8000-000000000001','professional_scheduling',true,'d1100000-0000-4000-8000-000000000001'),
  ('d1200000-0000-4000-8000-000000000002','team_division',true,'d1100000-0000-4000-8000-000000000003'),
  ('d1200000-0000-4000-8000-000000000002','professional_scheduling',true,'d1100000-0000-4000-8000-000000000003');

insert into public.team_squad_presets(
  id,team_id,name,color,badge_key,sort_order,created_by,updated_by
) values
  ('d1300000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000001','Time A','#0D9488','stripes',1,'d1100000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000001'),
  ('d1300000-0000-4000-8000-000000000002','d1200000-0000-4000-8000-000000000001','Time B','#2563EB','sash',2,'d1100000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000001'),
  ('d1300000-0000-4000-8000-000000000003','d1200000-0000-4000-8000-000000000001','Time C','#DC2626','diamond',3,'d1100000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000001'),
  ('d1300000-0000-4000-8000-000000000004','d1200000-0000-4000-8000-000000000002','Outro A','#111111','circle',1,'d1100000-0000-4000-8000-000000000003','d1100000-0000-4000-8000-000000000003'),
  ('d1300000-0000-4000-8000-000000000005','d1200000-0000-4000-8000-000000000002','Outro B','#EEEEEE','quarters',2,'d1100000-0000-4000-8000-000000000003','d1100000-0000-4000-8000-000000000003');

insert into public.athletes(
  id,team_id,full_name,preferred_name,status,created_by
) values
  ('d1500000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000001','Atleta Um','Um','active','d1100000-0000-4000-8000-000000000001'),
  ('d1500000-0000-4000-8000-000000000002','d1200000-0000-4000-8000-000000000001','Atleta Dois','Dois','active','d1100000-0000-4000-8000-000000000001');

select has_table('public','team_professional_scheduling_settings','configuração profissional existe');
select ok((select relrowsecurity from pg_class where oid='public.team_professional_scheduling_settings'::regclass),'configuração usa RLS');
select ok((select relrowsecurity from pg_class where oid='public.professional_scheduling_commands'::regclass),'comandos usam RLS');
select ok(has_function_privilege('authenticated','public.replace_team_squad_presets_v2(uuid,uuid,jsonb,uuid,uuid)','EXECUTE'),'authenticated executa configuração protegida');
select ok(not has_function_privilege('anon','public.replace_team_squad_presets_v2(uuid,uuid,jsonb,uuid,uuid)','EXECUTE'),'anon não configura padrões');
select ok(not has_table_privilege('authenticated','public.team_professional_scheduling_settings','INSERT'),'cliente não escreve configuração');
select ok(not has_table_privilege('authenticated','public.professional_scheduling_commands','SELECT'),'cliente não lê comandos internos');
select is((select count(*) from public.team_professional_scheduling_settings where team_id in ('d1200000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000002')),0::bigint,'time criado após expansão nasce incompleto');

set local role authenticated;
select set_config('request.jwt.claim.sub','d1100000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.replace_team_squad_presets_v2(
  'd1200000-0000-4000-8000-000000000001','d1400000-0000-4000-8000-000000000001',
  '[{"id":"d1300000-0000-4000-8000-000000000001","name":"Time A","color":"#0D9488","badge_key":"stripes","sort_order":1},{"id":"d1300000-0000-4000-8000-000000000002","name":"Time B","color":"#2563EB","badge_key":"sash","sort_order":2}]',
  'd1300000-0000-4000-8000-000000000001','d1300000-0000-4000-8000-000000000002'
)$$,'42501',null,'manager não altera padrões persistentes');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','d1100000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.replace_team_squad_presets_v2(
  'd1200000-0000-4000-8000-000000000001','d1400000-0000-4000-8000-000000000002',
  '[{"id":"d1300000-0000-4000-8000-000000000001","name":"Time A","color":"#0D9488","badge_key":"stripes","sort_order":1},{"id":"d1300000-0000-4000-8000-000000000002","name":"Time B","color":"#2563EB","badge_key":"sash","sort_order":2}]',
  'd1300000-0000-4000-8000-000000000001','d1300000-0000-4000-8000-000000000001'
)$$,'22023',null,'padrões iguais são recusados');
select throws_ok($$select public.replace_team_squad_presets_v2(
  'd1200000-0000-4000-8000-000000000001','d1400000-0000-4000-8000-000000000003',
  '[{"id":"d1300000-0000-4000-8000-000000000001","name":"Time A","color":"#0D9488","badge_key":"stripes","sort_order":1},{"id":"d1300000-0000-4000-8000-000000000002","name":"Time B","color":"#2563EB","badge_key":"sash","sort_order":2}]',
  'd1300000-0000-4000-8000-000000000001','d1300000-0000-4000-8000-000000000004'
)$$,'22023',null,'padrão de outro tenant é recusado');
select lives_ok($$select public.replace_team_squad_presets_v2(
  'd1200000-0000-4000-8000-000000000001','d1400000-0000-4000-8000-000000000004',
  '[{"id":"d1300000-0000-4000-8000-000000000001","name":"Time A","color":"#0D9488","badge_key":"stripes","sort_order":1},{"id":"d1300000-0000-4000-8000-000000000002","name":"Time B","color":"#2563EB","badge_key":"sash","sort_order":2},{"id":"d1300000-0000-4000-8000-000000000003","name":"Time C","color":"#DC2626","badge_key":"diamond","sort_order":3}]',
  'd1300000-0000-4000-8000-000000000001','d1300000-0000-4000-8000-000000000002'
)$$,'owner salva 2 a 12 equipes e dois padrões');
select is((public.replace_team_squad_presets_v2(
  'd1200000-0000-4000-8000-000000000001','d1400000-0000-4000-8000-000000000004',
  '[{"id":"d1300000-0000-4000-8000-000000000001","name":"Time A","color":"#0D9488","badge_key":"stripes","sort_order":1},{"id":"d1300000-0000-4000-8000-000000000002","name":"Time B","color":"#2563EB","badge_key":"sash","sort_order":2},{"id":"d1300000-0000-4000-8000-000000000003","name":"Time C","color":"#DC2626","badge_key":"diamond","sort_order":3}]',
  'd1300000-0000-4000-8000-000000000001','d1300000-0000-4000-8000-000000000002'
)).replayed,true,'replay idêntico é sinalizado');
select throws_ok($$select public.replace_team_squad_presets_v2(
  'd1200000-0000-4000-8000-000000000001','d1400000-0000-4000-8000-000000000004',
  '[{"id":"d1300000-0000-4000-8000-000000000001","name":"Mudou","color":"#0D9488","badge_key":"stripes","sort_order":1},{"id":"d1300000-0000-4000-8000-000000000002","name":"Time B","color":"#2563EB","badge_key":"sash","sort_order":2}]',
  'd1300000-0000-4000-8000-000000000001','d1300000-0000-4000-8000-000000000002'
)$$,'22023',null,'replay com payload diferente é recusado');
reset role;

select is((select default_home_team_id from public.team_professional_scheduling_settings where team_id='d1200000-0000-4000-8000-000000000001'),'d1300000-0000-4000-8000-000000000001'::uuid,'primeiro padrão persiste por identidade');
select is((select default_away_team_id from public.team_professional_scheduling_settings where team_id='d1200000-0000-4000-8000-000000000001'),'d1300000-0000-4000-8000-000000000002'::uuid,'segundo padrão persiste por identidade');

set local role authenticated;
select set_config('request.jwt.claim.sub','d1100000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.create_event_as_staff_v4(
  'd1200000-0000-4000-8000-000000000001','d1400000-0000-4000-8000-000000000005',
  '2030-09-10 20:00:00','Série profissional','weekly_match','split_teams','society',
  60,120,2,null,'Arena','Rua Um',
  'd1300000-0000-4000-8000-000000000002','d1300000-0000-4000-8000-000000000001'
)$$,'manager cria série trocando os padrões');
select is((public.create_event_as_staff_v4(
  'd1200000-0000-4000-8000-000000000001','d1400000-0000-4000-8000-000000000005',
  '2030-09-10 20:00:00','Série profissional','weekly_match','split_teams','society',
  60,120,2,null,'Arena','Rua Um',
  'd1300000-0000-4000-8000-000000000002','d1300000-0000-4000-8000-000000000001'
)).replayed,true,'retry do jogo é idempotente');
select throws_ok($$select public.create_event_as_staff_v4(
  'd1200000-0000-4000-8000-000000000001','d1400000-0000-4000-8000-000000000006',
  '2030-09-11 20:00:00','Jogo cruzado','weekly_match','split_teams','society',
  60,120,1,null,null,null,
  'd1300000-0000-4000-8000-000000000001','d1300000-0000-4000-8000-000000000004'
)$$,'22023',null,'jogo recusa lado de outro tenant');
reset role;

select is((select count(*) from public.events where team_id='d1200000-0000-4000-8000-000000000001' and title='Série profissional'),2::bigint,'recorrência cria duas ocorrências');
select is((select count(*) from public.event_squads squad join public.events event on event.id=squad.event_id where event.title='Série profissional'),4::bigint,'cada ocorrência congela dois lados');
select is((select string_agg(squad.name,',' order by squad.sort_order) from public.event_squads squad join public.events event on event.id=squad.event_id where event.title='Série profissional' and event.series_position=1),'Time B,Time A','troca escolhida chega ao snapshot');

set local role authenticated;
select set_config('request.jwt.claim.sub','d1100000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.create_championship_draft_v2(
  'd1200000-0000-4000-8000-000000000001','d1400000-0000-4000-8000-000000000007',
  'Copa Profissional','league',3::smallint,1::smallint,0::smallint,
  array['wins','goal_difference']::public.championship_tiebreak_key[],
  null::smallint,null::smallint,
  array['d1300000-0000-4000-8000-000000000001','d1300000-0000-4000-8000-000000000002','d1300000-0000-4000-8000-000000000003']::uuid[]
)$$,'campeonato nasce com equipes internas pré-selecionadas');
select throws_ok($$select public.create_championship_draft_v2(
  'd1200000-0000-4000-8000-000000000001','d1400000-0000-4000-8000-000000000008',
  'Copa Cruzada','league',3::smallint,1::smallint,0::smallint,
  array['wins']::public.championship_tiebreak_key[],null::smallint,null::smallint,
  array['d1300000-0000-4000-8000-000000000001','d1300000-0000-4000-8000-000000000004']::uuid[]
)$$,'22023',null,'campeonato recusa equipe de outro tenant');
reset role;

select is((select count(*) from public.championship_participants participant join public.championships championship on championship.id=participant.championship_id where championship.name='Copa Profissional'),3::bigint,'todos os participantes selecionados viram snapshots');

update public.team_squad_presets set name='Time A Renomeado',color='#AABBCC'
where id='d1300000-0000-4000-8000-000000000001';
select is((select count(*) from public.event_squads where name='Time A' and color='#0D9488'),2::bigint,'renome não reescreve lados históricos');
select is((select snapshot_name||':'||snapshot_color from public.championship_participants where internal_team_id='d1300000-0000-4000-8000-000000000001'),'Time A:#0D9488','renome não reescreve participante histórico');

set local role authenticated;
select set_config('request.jwt.claim.sub','d1100000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.add_championship_participant(
  (select id from public.championships where name='Copa Profissional'),
  'd1400000-0000-4000-8000-000000000009',4::smallint,null::smallint,
  null,'Visitante','#F97316','circle'
)$$,'adversário externo permanece permitido como snapshot');
reset role;

select is((select count(*) from public.team_squad_presets where team_id='d1200000-0000-4000-8000-000000000001'),3::bigint,'adversário externo não cria equipe persistente');

update public.event_attendance attendance
set status='confirmed'
from public.events event
where event.id=attendance.event_id
  and event.title='Série profissional'
  and event.series_position=1;

set local role authenticated;
select set_config('request.jwt.claim.sub','d1100000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.save_event_lineup_draft(
    (select id from public.events where title='Série profissional' and series_position=1),
    'd1400000-0000-4000-8000-000000000010',
    '[{"id":"d1600000-0000-4000-8000-000000000001","name":"Lado Um","sort_order":1},{"id":"d1600000-0000-4000-8000-000000000002","name":"Lado Dois","sort_order":2}]',
    '[{"athlete_id":"d1500000-0000-4000-8000-000000000001","squad_id":"d1600000-0000-4000-8000-000000000001","sort_order":1},{"athlete_id":"d1500000-0000-4000-8000-000000000002","squad_id":"d1600000-0000-4000-8000-000000000002","sort_order":1}]',
    array[]::uuid[]
  );
  select public.save_event_lineup_draft(
    (select id from public.events where title='Série profissional' and series_position=1),
    'd1400000-0000-4000-8000-000000000011',
    '[{"id":"d1600000-0000-4000-8000-000000000003","name":"Lado Um","sort_order":1},{"id":"d1600000-0000-4000-8000-000000000004","name":"Lado Dois","sort_order":2}]',
    '[{"athlete_id":"d1500000-0000-4000-8000-000000000001","squad_id":"d1600000-0000-4000-8000-000000000004","sort_order":1},{"athlete_id":"d1500000-0000-4000-8000-000000000002","squad_id":"d1600000-0000-4000-8000-000000000003","sort_order":1}]',
    array[]::uuid[]
  );
$$,'atletas podem ser redistribuídos somente no rascunho da partida');
reset role;

select is((select count(*) from public.team_squad_presets where team_id='d1200000-0000-4000-8000-000000000001'),3::bigint,'redistribuição não altera equipes persistentes');
select is((select count(*) from public.event_attendance attendance join public.events event on event.id=attendance.event_id where event.title='Série profissional' and event.series_position=1 and attendance.status='confirmed'),2::bigint,'redistribuição não altera RSVP');
select is((select count(*) from public.championship_participants participant join public.championships championship on championship.id=participant.championship_id where championship.name='Copa Profissional'),4::bigint,'redistribuição não altera participantes nem classificação derivada');
select is((select count(*) from public.audit_logs where team_id='d1200000-0000-4000-8000-000000000001' and action in ('professional.defaults.replaced','professional.event.created','professional.championship.created')),3::bigint,'auditoria profissional é agregada e idempotente');
select ok((select bool_and(not metadata ? 'name') from public.audit_logs where team_id='d1200000-0000-4000-8000-000000000001' and action like 'professional.%'),'auditoria profissional não contém nomes');

set local role authenticated;
select set_config('request.jwt.claim.sub','d1100000-0000-4000-8000-000000000003',true);
select is((select count(*) from public.team_professional_scheduling_settings where team_id='d1200000-0000-4000-8000-000000000001'),0::bigint,'RLS impede leitura cross-tenant');
reset role;

select * from finish();
rollback;
