begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(25);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','fc150000-0000-4000-8000-000000000001','authenticated','authenticated','owner-calendar-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fc150000-0000-4000-8000-000000000002','authenticated','authenticated','manager-calendar-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fc150000-0000-4000-8000-000000000003','authenticated','authenticated','owner-calendar-b@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,timezone,created_by) values
  ('fc151000-0000-4000-8000-000000000001','Calendário A','calendario-a','America/Sao_Paulo','fc150000-0000-4000-8000-000000000001'),
  ('fc151000-0000-4000-8000-000000000002','Calendário B','calendario-b','America/Sao_Paulo','fc150000-0000-4000-8000-000000000003');
insert into public.team_memberships(team_id,user_id,role,status,invited_by) values (
  'fc151000-0000-4000-8000-000000000001','fc150000-0000-4000-8000-000000000002',
  'manager','active','fc150000-0000-4000-8000-000000000001'
);

select ok('calendar_workspace' = any(enum_range(null::public.feature_key)::text[]),
  'flag tipada do calendário existe');
select ok('calendar_workspace' = any(array(
  select feature::text from private.product_feature_keys() feature
)), 'flag integra a herança depois do contrato de rollout');
select is((select count(*) from public.team_feature_flags
  where feature='calendar_workspace'),0::bigint,
  'expansão não ativa a flag em nenhum time');
select has_function('public','get_management_calendar',array[
  'uuid','date','date','text','event_kind','uuid','uuid'
], 'projeção do calendário existe');
select ok(has_function_privilege('authenticated',
  'public.get_management_calendar(uuid,date,date,text,public.event_kind,uuid,uuid)',
  'execute'), 'authenticated pode chamar a RPC protegida');
select ok(not has_function_privilege('anon',
  'public.get_management_calendar(uuid,date,date,text,public.event_kind,uuid,uuid)',
  'execute'), 'anônimo não chama o calendário');
select throws_ok($$select public.get_management_calendar(
  'fc151000-0000-4000-8000-000000000001','2026-09-01','2026-09-07'
)$$,'42501','Calendário indisponível','sessão ausente falha fechado');

set local role authenticated;
select set_config('request.jwt.claim.sub','fc150000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.get_management_calendar(
  'fc151000-0000-4000-8000-000000000001','2026-09-01','2026-09-07'
)$$,'P0001','Calendário indisponível','flag desligada mantém a lista como fallback');
reset role;

insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('fc151000-0000-4000-8000-000000000001','calendar_workspace',true,'fc150000-0000-4000-8000-000000000001'),
  ('fc151000-0000-4000-8000-000000000002','calendar_workspace',true,'fc150000-0000-4000-8000-000000000003');

insert into public.events(
  id,team_id,title,opponent_name,kind,organization_mode,sport_format,
  starts_at,ends_at,status,professional_schedule_state,created_by,cancelled_at,cancelled_by
) values
  ('fc152000-0000-4000-8000-000000000001','fc151000-0000-4000-8000-000000000001','Treino noturno','Visitante','training','single_squad','society','2026-09-22 23:30:00-03','2026-09-23 01:00:00-03','scheduled','scheduled','fc150000-0000-4000-8000-000000000001',null,null),
  ('fc152000-0000-4000-8000-000000000002','fc151000-0000-4000-8000-000000000001','Final regional','Rival','championship','split_teams','society','2026-09-24 20:00:00-03','2026-09-24 21:30:00-03','scheduled','pending_review','fc150000-0000-4000-8000-000000000001',null,null),
  ('fc152000-0000-4000-8000-000000000003','fc151000-0000-4000-8000-000000000001','Sem data','Rival','friendly','single_squad','society','2026-08-01 20:00:00-03','2026-08-01 21:00:00-03','scheduled','date_tbd','fc150000-0000-4000-8000-000000000001',null,null),
  ('fc152000-0000-4000-8000-000000000004','fc151000-0000-4000-8000-000000000001','Cancelado','Rival','friendly','single_squad','society','2026-09-25 20:00:00-03','2026-09-25 21:00:00-03','cancelled','scheduled','fc150000-0000-4000-8000-000000000001',now(),'fc150000-0000-4000-8000-000000000001'),
  ('fc152000-0000-4000-8000-000000000005','fc151000-0000-4000-8000-000000000002','Segredo B','Rival','training','single_squad','society','2026-09-24 20:00:00-03','2026-09-24 21:00:00-03','scheduled','scheduled','fc150000-0000-4000-8000-000000000003',null,null);

insert into public.team_squad_presets(
  id,team_id,name,color,badge_key,sort_order,created_by,updated_by
) values
  ('fc153000-0000-4000-8000-000000000001','fc151000-0000-4000-8000-000000000001','Equipe Azul','#2563EB','shield',1,'fc150000-0000-4000-8000-000000000001','fc150000-0000-4000-8000-000000000001'),
  ('fc153000-0000-4000-8000-000000000002','fc151000-0000-4000-8000-000000000002','Equipe Secreta','#DC2626','shield',1,'fc150000-0000-4000-8000-000000000003','fc150000-0000-4000-8000-000000000003');
insert into public.event_squads(
  id,event_id,team_id,sport_format,name,color,sort_order,source_internal_team_id
) values (
  'fc154000-0000-4000-8000-000000000001','fc152000-0000-4000-8000-000000000002','fc151000-0000-4000-8000-000000000001','society','Equipe Azul','#2563EB',1,'fc153000-0000-4000-8000-000000000001'
);

insert into public.championships(
  id,team_id,name,format,status,created_by,updated_by
) values (
  'fc155000-0000-4000-8000-000000000001','fc151000-0000-4000-8000-000000000001','Copa calendário','league','draft','fc150000-0000-4000-8000-000000000001','fc150000-0000-4000-8000-000000000001'
);
insert into public.event_matches(id,event_id,team_id,ordinal,status,created_by) values (
  'fc156000-0000-4000-8000-000000000001','fc152000-0000-4000-8000-000000000002','fc151000-0000-4000-8000-000000000001',1,'scheduled','fc150000-0000-4000-8000-000000000001'
);
insert into public.championship_fixtures(
  id,championship_id,team_id,stage,status,round_number,ordinal,match_id,
  linked_at,linked_by,created_by,updated_by
) values (
  'fc157000-0000-4000-8000-000000000001','fc155000-0000-4000-8000-000000000001','fc151000-0000-4000-8000-000000000001','league','scheduled',1,1,'fc156000-0000-4000-8000-000000000001',now(),'fc150000-0000-4000-8000-000000000001','fc150000-0000-4000-8000-000000000001','fc150000-0000-4000-8000-000000000001'
);

insert into public.event_schedule_conflicts(
  id,team_id,event_id,other_event_id,kind,severity,status,detected_schedule_version
) values (
  'fc158000-0000-4000-8000-000000000001','fc151000-0000-4000-8000-000000000001','fc152000-0000-4000-8000-000000000002','fc152000-0000-4000-8000-000000000001','travel_buffer','warning','pending',1
);

set local role authenticated;
select set_config('request.jwt.claim.sub','fc150000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.get_management_calendar(
  'fc151000-0000-4000-8000-000000000001','2026-10-01','2026-09-01'
)$$,'22023','Período do calendário inválido','período invertido falha fechado');
select throws_ok($$select public.get_management_calendar(
  'fc151000-0000-4000-8000-000000000001','2026-09-01','2026-10-13'
)$$,'22023','Período do calendário inválido','mais de 42 dias falha fechado');
select throws_ok($$select public.get_management_calendar(
  'fc151000-0000-4000-8000-000000000001','2026-09-01','2026-09-30',
  requested_internal_team_id=>'fc153000-0000-4000-8000-000000000002'
)$$,'22023','Equipe interna inválida','filtro de equipe cross-tenant falha fechado');
select throws_ok($$select public.get_management_calendar(
  'fc151000-0000-4000-8000-000000000001','2026-09-01','2026-09-30',
  requested_championship_id=>'fc155000-0000-4000-8000-000000000099'
)$$,'22023','Campeonato inválido','campeonato inexistente falha fechado');

create temporary table calendar_page as select public.get_management_calendar(
  'fc151000-0000-4000-8000-000000000001','2026-09-21','2026-09-27'
) payload;
select is(jsonb_array_length(payload->'items'),2,'intervalo traz cada ocorrência uma vez') from calendar_page;
select is((payload->'summary'->>'scheduled_count')::integer,2,'resumo conta compromissos') from calendar_page;
select is(jsonb_array_length(payload->'reschedule_items'),1,'data indefinida fica em A reagendar') from calendar_page;
select ok(not payload::text like '%Segredo B%','agenda de outro time não aparece') from calendar_page;
select ok(not payload::text like '%Cancelado%','cancelado não aparece como compromisso futuro') from calendar_page;
select is((payload->'summary'->>'conflict_count')::integer,2,
  'conflito pendente sinaliza os dois compromissos afetados') from calendar_page;
select ok(not payload::text ~* '(athlete|email|phone|details|accepted_by)',
  'projeção não expõe atletas, contatos ou decisão interna') from calendar_page;
select is(jsonb_array_length(public.get_management_calendar(
  'fc151000-0000-4000-8000-000000000001','2026-09-21','2026-09-27',
  requested_search=>'final regional'
)->'items'),1,'busca textual filtra o calendário');
select is(jsonb_array_length(public.get_management_calendar(
  'fc151000-0000-4000-8000-000000000001','2026-09-21','2026-09-27',
  requested_kind=>'training'
)->'items'),1,'tipo filtra o calendário');
select is(jsonb_array_length(public.get_management_calendar(
  'fc151000-0000-4000-8000-000000000001','2026-09-21','2026-09-27',
  requested_internal_team_id=>'fc153000-0000-4000-8000-000000000001'
)->'items'),1,'equipe interna filtra o calendário');
select is(jsonb_array_length(public.get_management_calendar(
  'fc151000-0000-4000-8000-000000000001','2026-09-21','2026-09-27',
  requested_championship_id=>'fc155000-0000-4000-8000-000000000001'
)->'items'),1,'campeonato filtra o calendário sem duplicar evento');
select throws_ok($$select public.get_management_calendar(
  'fc151000-0000-4000-8000-000000000002','2026-09-21','2026-09-27'
)$$,'42501','Calendário indisponível','sessão não consulta outro time');
select performs_ok($$select public.get_management_calendar(
  'fc151000-0000-4000-8000-000000000001','2026-09-01','2026-10-12'
)$$,300,'projeção de 42 dias atende ao limite local');
reset role;

select * from finish();
rollback;
