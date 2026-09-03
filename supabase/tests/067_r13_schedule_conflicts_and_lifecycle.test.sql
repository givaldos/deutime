begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(43);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','f1100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-r13-agenda@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f1100000-0000-4000-8000-000000000002','authenticated','authenticated','manager-r13-agenda@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f1100000-0000-4000-8000-000000000003','authenticated','authenticated','other-r13-agenda@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,created_by) values
  ('f1200000-0000-4000-8000-000000000001','Agenda A','agenda-r13-a','f1100000-0000-4000-8000-000000000001'),
  ('f1200000-0000-4000-8000-000000000002','Agenda B','agenda-r13-b','f1100000-0000-4000-8000-000000000003');
insert into public.team_memberships(team_id,user_id,role,status,invited_by) values
  ('f1200000-0000-4000-8000-000000000001','f1100000-0000-4000-8000-000000000002','manager','active','f1100000-0000-4000-8000-000000000001');
insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('f1200000-0000-4000-8000-000000000001','event_control',true,'f1100000-0000-4000-8000-000000000001'),
  ('f1200000-0000-4000-8000-000000000001','professional_scheduling',true,'f1100000-0000-4000-8000-000000000001'),
  ('f1200000-0000-4000-8000-000000000001','whatsapp_delivery',true,'f1100000-0000-4000-8000-000000000001'),
  ('f1200000-0000-4000-8000-000000000002','professional_scheduling',true,'f1100000-0000-4000-8000-000000000003');
update public.runtime_controls set enabled=true where control='integration_produce';

insert into public.team_squad_presets(
  id,team_id,name,color,badge_key,sort_order,created_by,updated_by
) values
  ('f1300000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001','Time A','#047857','stripes',1,'f1100000-0000-4000-8000-000000000001','f1100000-0000-4000-8000-000000000001'),
  ('f1300000-0000-4000-8000-000000000002','f1200000-0000-4000-8000-000000000001','Time B','#1D4ED8','sash',2,'f1100000-0000-4000-8000-000000000001','f1100000-0000-4000-8000-000000000001'),
  ('f1300000-0000-4000-8000-000000000003','f1200000-0000-4000-8000-000000000001','Time C','#B91C1C','diamond',3,'f1100000-0000-4000-8000-000000000001','f1100000-0000-4000-8000-000000000001'),
  ('f1300000-0000-4000-8000-000000000004','f1200000-0000-4000-8000-000000000001','Time D','#7C3AED','quarters',4,'f1100000-0000-4000-8000-000000000001','f1100000-0000-4000-8000-000000000001');

insert into public.venues(id,team_id,name,address,is_exclusive) values
  ('f1400000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001','Arena Exclusiva','Rua Um',true),
  ('f1400000-0000-4000-8000-000000000002','f1200000-0000-4000-8000-000000000001','Arena Dois','Rua Dois',false),
  ('f1400000-0000-4000-8000-000000000003','f1200000-0000-4000-8000-000000000001','Arena Três','Rua Três',false);

insert into public.athletes(id,team_id,full_name,status,created_by) values
  ('f1500000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001','Atleta Agenda','active','f1100000-0000-4000-8000-000000000001');
insert into public.athlete_private(
  athlete_id,team_id,phone_e164,privacy_terms_accepted_at
) values (
  'f1500000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001','+5511999990001',now()
);
insert into public.communication_consents(
  athlete_id,team_id,channel,status,evidence,granted_at
) values (
  'f1500000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001','whatsapp','granted','teste R13',now()
);

select has_table('public','event_schedule_conflicts','projeção de pendências existe');
select has_table('public','event_schedule_decisions','trilha de decisões existe');
select ok((select relrowsecurity from pg_class where oid='public.event_schedule_conflicts'::regclass),'pendências usam RLS');
select ok((select relrowsecurity from pg_class where oid='public.event_schedule_decisions'::regclass),'decisões usam RLS');
select ok(not has_table_privilege('authenticated','public.event_schedule_conflicts','INSERT'),'cliente não cria conflito diretamente');
select ok(not has_table_privilege('authenticated','public.event_schedule_decisions','INSERT'),'cliente não cria decisão diretamente');
select ok(not has_function_privilege('anon','public.resolve_event_schedule_conflict(uuid,uuid,uuid,uuid,text,text)','EXECUTE'),'anon não resolve pendência');
select ok(has_function_privilege('authenticated','public.transition_event_schedule(uuid,uuid,uuid,text,text)','EXECUTE'),'authenticated chama transição protegida');

insert into public.events(
  id,team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,
  venue_id,status,created_by
) values
  ('f1600000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001','Base','friendly','split_teams','society','2031-09-10 20:00+00','2031-09-10 21:00+00','f1400000-0000-4000-8000-000000000001','scheduled','f1100000-0000-4000-8000-000000000001'),
  ('f1600000-0000-4000-8000-000000000002','f1200000-0000-4000-8000-000000000001','Equipe sobreposta','friendly','split_teams','society','2031-09-10 20:30+00','2031-09-10 21:30+00','f1400000-0000-4000-8000-000000000002','scheduled','f1100000-0000-4000-8000-000000000001'),
  ('f1600000-0000-4000-8000-000000000003','f1200000-0000-4000-8000-000000000001','Local sobreposto','friendly','split_teams','society','2031-09-10 20:15+00','2031-09-10 20:45+00','f1400000-0000-4000-8000-000000000001','scheduled','f1100000-0000-4000-8000-000000000001'),
  ('f1600000-0000-4000-8000-000000000004','f1200000-0000-4000-8000-000000000001','Intervalo exato','friendly','split_teams','society','2031-09-10 21:00+00','2031-09-10 22:00+00','f1400000-0000-4000-8000-000000000003','scheduled','f1100000-0000-4000-8000-000000000001'),
  ('f1600000-0000-4000-8000-000000000005','f1200000-0000-4000-8000-000000000001','Atleta sobreposto','friendly','split_teams','society','2031-09-10 20:10+00','2031-09-10 20:50+00','f1400000-0000-4000-8000-000000000003','scheduled','f1100000-0000-4000-8000-000000000001');

insert into public.event_squads(
  event_id,team_id,sport_format,name,color,sort_order,is_official,source_internal_team_id
) values
  ('f1600000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001','society','A','#047857',1,true,'f1300000-0000-4000-8000-000000000001'),
  ('f1600000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001','society','B','#1D4ED8',2,true,'f1300000-0000-4000-8000-000000000002'),
  ('f1600000-0000-4000-8000-000000000002','f1200000-0000-4000-8000-000000000001','society','A2','#047857',1,true,'f1300000-0000-4000-8000-000000000001'),
  ('f1600000-0000-4000-8000-000000000002','f1200000-0000-4000-8000-000000000001','society','C','#B91C1C',2,true,'f1300000-0000-4000-8000-000000000003'),
  ('f1600000-0000-4000-8000-000000000003','f1200000-0000-4000-8000-000000000001','society','C2','#B91C1C',1,true,'f1300000-0000-4000-8000-000000000003'),
  ('f1600000-0000-4000-8000-000000000003','f1200000-0000-4000-8000-000000000001','society','D','#7C3AED',2,true,'f1300000-0000-4000-8000-000000000004'),
  ('f1600000-0000-4000-8000-000000000004','f1200000-0000-4000-8000-000000000001','society','A3','#047857',1,true,'f1300000-0000-4000-8000-000000000001'),
  ('f1600000-0000-4000-8000-000000000004','f1200000-0000-4000-8000-000000000001','society','D2','#7C3AED',2,true,'f1300000-0000-4000-8000-000000000004'),
  ('f1600000-0000-4000-8000-000000000005','f1200000-0000-4000-8000-000000000001','society','C3','#B91C1C',1,true,'f1300000-0000-4000-8000-000000000003'),
  ('f1600000-0000-4000-8000-000000000005','f1200000-0000-4000-8000-000000000001','society','D3','#7C3AED',2,true,'f1300000-0000-4000-8000-000000000004');
insert into public.event_attendance(event_id,team_id,athlete_id,status) values
  ('f1600000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001','f1500000-0000-4000-8000-000000000001','confirmed'),
  ('f1600000-0000-4000-8000-000000000005','f1200000-0000-4000-8000-000000000001','f1500000-0000-4000-8000-000000000001','confirmed');

select lives_ok($$select * from private.refresh_event_schedule_conflicts('f1200000-0000-4000-8000-000000000001','f1600000-0000-4000-8000-000000000002')$$,'recalcula sobreposição de equipe');
select is((select count(*) from public.event_schedule_conflicts where event_id='f1600000-0000-4000-8000-000000000002' and other_event_id='f1600000-0000-4000-8000-000000000001' and kind='internal_team_overlap' and status='pending'),1::bigint,'mesma equipe sobreposta é conflito duro');
select is((select professional_schedule_state::text from public.events where id='f1600000-0000-4000-8000-000000000002'),'pending_review','conflito leva evento à revisão');

select lives_ok($$select * from private.refresh_event_schedule_conflicts('f1200000-0000-4000-8000-000000000001','f1600000-0000-4000-8000-000000000003')$$,'recalcula local exclusivo');
select is((select count(*) from public.event_schedule_conflicts where event_id='f1600000-0000-4000-8000-000000000003' and kind='exclusive_venue_overlap' and severity='hard'),1::bigint,'local exclusivo sobreposto é conflito duro');

select lives_ok($$select * from private.refresh_event_schedule_conflicts('f1200000-0000-4000-8000-000000000001','f1600000-0000-4000-8000-000000000004')$$,'intervalo semiaberto é recalculado');
select is((select count(*) from public.event_schedule_conflicts where event_id='f1600000-0000-4000-8000-000000000004' and other_event_id='f1600000-0000-4000-8000-000000000001' and kind='internal_team_overlap'),0::bigint,'terminar exatamente no início não é sobreposição');
select is((select count(*) from public.event_schedule_conflicts where event_id='f1600000-0000-4000-8000-000000000004' and other_event_id='f1600000-0000-4000-8000-000000000001' and kind='short_interval'),1::bigint,'intervalo zero ainda exige revisão visível');
select is((select count(*) from public.event_schedule_conflicts where event_id='f1600000-0000-4000-8000-000000000004' and other_event_id='f1600000-0000-4000-8000-000000000001' and kind='travel_buffer'),1::bigint,'locais diferentes abaixo de 90 minutos alertam deslocamento');

select lives_ok($$select * from private.refresh_event_schedule_conflicts('f1200000-0000-4000-8000-000000000001','f1600000-0000-4000-8000-000000000005')$$,'recalcula confirmação de atleta');
select is((select (details->>'athlete_count')::integer from public.event_schedule_conflicts where event_id='f1600000-0000-4000-8000-000000000005' and kind='athlete_overlap'),1,'alerta guarda somente contagem agregada de atletas');

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.resolve_event_schedule_conflict(
  'f1200000-0000-4000-8000-000000000001','f1600000-0000-4000-8000-000000000002',
  'f1700000-0000-4000-8000-000000000001',
  (select id from public.event_schedule_conflicts where event_id='f1600000-0000-4000-8000-000000000002' and other_event_id='f1600000-0000-4000-8000-000000000001' and kind='internal_team_overlap' and status='pending'),
  'accept_exception','Conflito aceito pela operação'
)$$,'42501',null,'manager não aceita conflito duro');
select lives_ok($$select public.resolve_event_schedule_conflict(
  'f1200000-0000-4000-8000-000000000001','f1600000-0000-4000-8000-000000000004',
  'f1700000-0000-4000-8000-000000000002',
  (select id from public.event_schedule_conflicts where event_id='f1600000-0000-4000-8000-000000000004' and other_event_id='f1600000-0000-4000-8000-000000000001' and kind='short_interval' and status='pending'),
  'confirm_warning',null
)$$,'manager confirma alerta');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.resolve_event_schedule_conflict(
  'f1200000-0000-4000-8000-000000000001','f1600000-0000-4000-8000-000000000002',
  'f1700000-0000-4000-8000-000000000003',
  (select id from public.event_schedule_conflicts where event_id='f1600000-0000-4000-8000-000000000002' and other_event_id='f1600000-0000-4000-8000-000000000001' and kind='internal_team_overlap' and status='pending'),
  'accept_exception','curta'
)$$,'42501',null,'exceção dura exige justificativa suficiente');
select lives_ok($$select public.resolve_event_schedule_conflict(
  'f1200000-0000-4000-8000-000000000001','f1600000-0000-4000-8000-000000000002',
  'f1700000-0000-4000-8000-000000000004',
  (select id from public.event_schedule_conflicts where event_id='f1600000-0000-4000-8000-000000000002' and other_event_id='f1600000-0000-4000-8000-000000000001' and kind='internal_team_overlap' and status='pending'),
  'accept_exception','Operação excepcional aprovada pela diretoria'
)$$,'owner aceita conflito duro com justificativa');
select is((public.resolve_event_schedule_conflict(
  'f1200000-0000-4000-8000-000000000001','f1600000-0000-4000-8000-000000000002',
  'f1700000-0000-4000-8000-000000000004',
  (select id from public.event_schedule_conflicts where event_id='f1600000-0000-4000-8000-000000000002' and other_event_id='f1600000-0000-4000-8000-000000000001' and kind='internal_team_overlap'),
  'accept_exception','Operação excepcional aprovada pela diretoria'
)->>'replayed')::boolean,true,'retry idêntico da exceção é sinalizado');
select throws_ok($$select public.resolve_event_schedule_conflict(
  'f1200000-0000-4000-8000-000000000001','f1600000-0000-4000-8000-000000000002',
  'f1700000-0000-4000-8000-000000000004',
  (select id from public.event_schedule_conflicts where event_id='f1600000-0000-4000-8000-000000000002' and other_event_id='f1600000-0000-4000-8000-000000000001' and kind='internal_team_overlap'),
  'accept_exception','Conteúdo diferente não pode reutilizar a mesma chave'
)$$,'22023',null,'retry diferente falha fechado');
reset role;

select is((select count(*) from public.event_schedule_decisions where decision='accept_exception'),1::bigint,'decisão sensível possui trilha imutável');
select is((select count(*) from public.audit_logs where action='professional.schedule.conflict_resolved'),2::bigint,'decisões geram auditoria sem PII');

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.transition_event_schedule(
  'f1200000-0000-4000-8000-000000000001','f1600000-0000-4000-8000-000000000001',
  'f1700000-0000-4000-8000-000000000005','postpone','single_event'
)$$,'42501',null,'outro tenant não opera agenda');
select is((select count(*) from public.event_schedule_conflicts),0::bigint,'RLS esconde pendências de outro tenant');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.transition_event_schedule(
  'f1200000-0000-4000-8000-000000000001','f1600000-0000-4000-8000-000000000005',
  'f1700000-0000-4000-8000-000000000006','date_tbd','single_event'
)$$,'manager deixa data a definir');
select is((public.transition_event_schedule(
  'f1200000-0000-4000-8000-000000000001','f1600000-0000-4000-8000-000000000005',
  'f1700000-0000-4000-8000-000000000006','date_tbd','single_event'
)->>'replayed')::boolean,true,'transição é idempotente');
reset role;

select is((select professional_schedule_state::text from public.events where id='f1600000-0000-4000-8000-000000000005'),'date_tbd','estado Data a definir persiste');
select ok((select public_id is not null and starts_at='2031-09-10 20:10+00'::timestamptz from public.events where id='f1600000-0000-4000-8000-000000000005'),'transição preserva URL e horário anterior');
select is((select count(*) from public.event_attendance where event_id='f1600000-0000-4000-8000-000000000005' and status='confirmed'),1::bigint,'transição preserva RSVP');
select is((select count(*) from public.event_squads where event_id='f1600000-0000-4000-8000-000000000005'),2::bigint,'transição preserva equipes');
select is((select count(*) from public.notification_outbox where event_id='f1600000-0000-4000-8000-000000000005' and template_key='event_schedule_change'),1::bigint,'decisão confirmada prepara uma única comunicação');
select is((select payload->>'schedule_state' from public.notification_outbox where event_id='f1600000-0000-4000-8000-000000000005' and template_key='event_schedule_change'),'date_tbd','comunicação carrega o estado confirmado sem expor PII');

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.create_event_as_staff_v5(
  'f1200000-0000-4000-8000-000000000001','f1700000-0000-4000-8000-000000000007',
  '2031-09-11 20:00:00','Série com identidade','weekly_match','split_teams','society',
  60,120,2,null,'Arena Série','Rua Série',
  'f1300000-0000-4000-8000-000000000001','f1300000-0000-4000-8000-000000000002',true
)$$,'v5 cria série e recalcula agenda');
reset role;
select is((select count(*) from public.event_squads squad join public.events event on event.id=squad.event_id where event.title='Série com identidade' and squad.source_internal_team_id is not null),4::bigint,'v5 preserva identidade nos snapshots');
select is((select bool_and(venue.is_exclusive) from public.venues venue join public.events event on event.venue_id=venue.id where event.title='Série com identidade'),true,'owner configura local persistente como exclusivo');

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.create_event_as_staff_v5(
  'f1200000-0000-4000-8000-000000000001','f1700000-0000-4000-8000-000000000009',
  '2031-09-20 20:00:00','Manager preserva local','friendly','split_teams','society',
  60,120,1,null,'Arena Exclusiva','Rua Um',
  'f1300000-0000-4000-8000-000000000001','f1300000-0000-4000-8000-000000000002',null
)$$,'manager cria jogo sem alterar configuração reservada ao owner');
reset role;
select is((select is_exclusive from public.venues where id='f1400000-0000-4000-8000-000000000001'),true,'omissão da exclusividade preserva valor existente');

insert into public.event_matches(id,event_id,team_id,ordinal,status,created_by,finalized_at,finalized_by)
values ('f1800000-0000-4000-8000-000000000001','f1600000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001',1,'finalized','f1100000-0000-4000-8000-000000000001',now(),'f1100000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.transition_event_schedule(
  'f1200000-0000-4000-8000-000000000001','f1600000-0000-4000-8000-000000000001',
  'f1700000-0000-4000-8000-000000000008','cancel','single_event'
)$$,'55000',null,'partida finalizada bloqueia transição destrutiva');
reset role;

select * from finish();
rollback;
