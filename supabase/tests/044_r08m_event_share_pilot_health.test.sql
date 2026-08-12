begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(25);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','fa100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-r08m-health@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fa100000-0000-4000-8000-000000000002','authenticated','authenticated','owner-other-r08m-health@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams (id, name, slug, created_by) values
  ('fa200000-0000-4000-8000-000000000001','R08M Piloto','r08m-piloto-health','fa100000-0000-4000-8000-000000000001'),
  ('fa200000-0000-4000-8000-000000000002','R08M Outro','r08m-outro-health','fa100000-0000-4000-8000-000000000002');

insert into public.events (
  id, public_id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, status, created_by, cancelled_at, cancelled_by
) values
  ('fa300000-0000-4000-8000-000000000001','fa310000-0000-4000-8000-000000000001','fa200000-0000-4000-8000-000000000001','Chamada piloto','weekly_match','single_squad','society',now()+interval '5 days',now()+interval '5 days 90 minutes','scheduled','fa100000-0000-4000-8000-000000000001',null,null),
  ('fa300000-0000-4000-8000-000000000002','fa310000-0000-4000-8000-000000000002','fa200000-0000-4000-8000-000000000001','Cancelado piloto','weekly_match','single_squad','society',now()+interval '6 days',now()+interval '6 days 90 minutes','cancelled','fa100000-0000-4000-8000-000000000001',now(),'fa100000-0000-4000-8000-000000000001'),
  ('fa300000-0000-4000-8000-000000000003','fa310000-0000-4000-8000-000000000003','fa200000-0000-4000-8000-000000000001','Fora da janela','weekly_match','single_squad','society',now()+interval '120 days',now()+interval '120 days 90 minutes','scheduled','fa100000-0000-4000-8000-000000000001',null,null),
  ('fa300000-0000-4000-8000-000000000004','fa310000-0000-4000-8000-000000000004','fa200000-0000-4000-8000-000000000002','Outro time','weekly_match','single_squad','society',now()+interval '7 days',now()+interval '7 days 90 minutes','scheduled','fa100000-0000-4000-8000-000000000002',null,null);

insert into public.team_feature_flags (team_id,feature,enabled,updated_by) values
  ('fa200000-0000-4000-8000-000000000001','public_event_page',true,'fa100000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','fa100000-0000-4000-8000-000000000001',true);
select public.set_team_feature_flag(
  'fa200000-0000-4000-8000-000000000001',
  'event_share_card',
  true
);
reset role;

select has_function('public','get_event_share_card_pilot_health',array['uuid'],'sonda agregada existe');
select ok(has_function_privilege('service_role','public.get_event_share_card_pilot_health(uuid)','EXECUTE'),'service role executa sonda');
select ok(not has_function_privilege('anon','public.get_event_share_card_pilot_health(uuid)','EXECUTE'),'anon não executa sonda');
select ok(not has_function_privilege('authenticated','public.get_event_share_card_pilot_health(uuid)','EXECUTE'),'authenticated não executa sonda');
select is((select count(*) from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000099')),0::bigint,'time ausente não produz linha');
select is((select event_share_card_enabled from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000001')),true,'gate do cartão observado');
select is((select public_event_page_enabled from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000001')),true,'gate público observado');
select is((select event_matches_enabled from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000001')),false,'gate de partidas observado sem ativar');
select is((select voting_enabled from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000001')),false,'gate de votação observado sem ativar');
select is((select window_events from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000001')),2::bigint,'janela operacional é limitada');
select is((select projected_events from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000001')),2::bigint,'eventos da janela usam a projeção');
select is((select fallback_events from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000001')),0::bigint,'piloto ativo não cai no fallback');
select is((select call_events from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000001')),1::bigint,'chamada agregada');
select is((select cancelled_events from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000001')),1::bigint,'cancelamento agregado');
select results_eq(
  $$select lineup_events,live_events,voting_events,result_events,score_events,completed_events from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000001')$$,
  $$select 0::bigint,0::bigint,0::bigint,0::bigint,0::bigint,0::bigint$$,
  'fases ausentes permanecem zeradas'
);
select ok((select last_flag_change_at is not null from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000001')),'mudança auditada possui marco temporal');
select is((select window_events from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000002')),1::bigint,'outro time tem apenas sua própria contagem');
select is((select event_share_card_enabled from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000002')),false,'outro time permanece desligado');
select is((select projected_events from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000002')),0::bigint,'outro time não recebe projeção por efeito lateral');
select ok(
  not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'get_event_share_card_pilot_health'
      and column_info.column_name in ('team_id','public_id','event_id','athlete_id','name','title')
  ),
  'contrato da sonda não possui identificador ou conteúdo'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','fa100000-0000-4000-8000-000000000001',true);
select public.set_team_feature_flag(
  'fa200000-0000-4000-8000-000000000001',
  'event_share_card',
  false
);
reset role;

select is((select event_share_card_enabled from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000001')),false,'rollback desliga o gate');
select is((select projected_events from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000001')),0::bigint,'rollback remove projeções ativas');
select is((select fallback_events from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000001')),2::bigint,'rollback devolve todos os eventos ao fallback');
select is((select count(*) from public.audit_logs where team_id='fa200000-0000-4000-8000-000000000001' and action='feature_flag.changed' and entity_id='event_share_card'),2::bigint,'ativação e rollback ficam auditados');
select ok((select observed_at <= now() from public.get_event_share_card_pilot_health('fa200000-0000-4000-8000-000000000001')),'sonda informa horário agregado da observação');

select * from finish();
rollback;
