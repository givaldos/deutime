begin;

create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
set search_path = public, extensions;
select plan(42);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','f2100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-r13-pilot@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f2100000-0000-4000-8000-000000000002','authenticated','authenticated','other-r13-pilot@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,created_by) values
  ('f2200000-0000-4000-8000-000000000001','Piloto R13','piloto-r13','f2100000-0000-4000-8000-000000000001'),
  ('f2200000-0000-4000-8000-000000000002','Outro R13','outro-r13','f2100000-0000-4000-8000-000000000002');

insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('f2200000-0000-4000-8000-000000000001','professional_scheduling',true,'f2100000-0000-4000-8000-000000000001'),
  ('f2200000-0000-4000-8000-000000000001','whatsapp_delivery',true,'f2100000-0000-4000-8000-000000000001');
update public.runtime_controls set enabled=true where control='integration_produce';
update public.runtime_controls set enabled=false where control='integration_consume';

insert into public.team_squad_presets(
  id,team_id,name,color,badge_key,sort_order,created_by,updated_by
) values
  ('f2300000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','Casa','#047857','stripes',1,'f2100000-0000-4000-8000-000000000001','f2100000-0000-4000-8000-000000000001'),
  ('f2300000-0000-4000-8000-000000000002','f2200000-0000-4000-8000-000000000001','Visitante','#1D4ED8','sash',2,'f2100000-0000-4000-8000-000000000001','f2100000-0000-4000-8000-000000000001');
insert into public.team_professional_scheduling_settings(
  team_id,default_home_team_id,default_away_team_id,created_by,updated_by
) values (
  'f2200000-0000-4000-8000-000000000001',
  'f2300000-0000-4000-8000-000000000001',
  'f2300000-0000-4000-8000-000000000002',
  'f2100000-0000-4000-8000-000000000001',
  'f2100000-0000-4000-8000-000000000001'
);

insert into public.events(
  id,team_id,title,kind,organization_mode,sport_format,starts_at,ends_at,
  status,professional_schedule_state,created_by
) values
  ('f2400000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','Confirmado','friendly','split_teams','society',now()+interval '5 days',now()+interval '5 days 1 hour','scheduled','scheduled','f2100000-0000-4000-8000-000000000001'),
  ('f2400000-0000-4000-8000-000000000002','f2200000-0000-4000-8000-000000000001','Em revisão','friendly','split_teams','society',now()+interval '6 days',now()+interval '6 days 1 hour','scheduled','pending_review','f2100000-0000-4000-8000-000000000001'),
  ('f2400000-0000-4000-8000-000000000003','f2200000-0000-4000-8000-000000000001','Sem data','friendly','split_teams','society',now()+interval '7 days',now()+interval '7 days 1 hour','scheduled','date_tbd','f2100000-0000-4000-8000-000000000001'),
  ('f2400000-0000-4000-8000-000000000004','f2200000-0000-4000-8000-000000000001','Adiado','friendly','split_teams','society',now()+interval '8 days',now()+interval '8 days 1 hour','scheduled','postponed','f2100000-0000-4000-8000-000000000001');

insert into public.event_schedule_conflicts(
  id,team_id,event_id,other_event_id,kind,severity,status,
  detected_schedule_version
) values
  ('f2500000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2400000-0000-4000-8000-000000000002','f2400000-0000-4000-8000-000000000001','internal_team_overlap','hard','pending',1),
  ('f2500000-0000-4000-8000-000000000002','f2200000-0000-4000-8000-000000000001','f2400000-0000-4000-8000-000000000002','f2400000-0000-4000-8000-000000000001','athlete_overlap','warning','pending',1);

insert into private.event_schedule_commands(
  id,team_id,request_id,actor_id,kind,payload_hash,result
) values (
  'f2600000-0000-4000-8000-000000000001',
  'f2200000-0000-4000-8000-000000000001',
  'f2610000-0000-4000-8000-000000000001',
  'f2100000-0000-4000-8000-000000000001',
  'resolve_conflict',repeat('a',64),'{}'
);
insert into public.professional_scheduling_commands(
  team_id,request_id,actor_id,kind,payload_hash,result
) values (
  'f2200000-0000-4000-8000-000000000001',
  'f2610000-0000-4000-8000-000000000002',
  'f2100000-0000-4000-8000-000000000001',
  'create_event',repeat('b',64),'{}'
);
insert into public.event_schedule_decisions(
  team_id,command_id,event_id,decision,scope,schedule_version,
  justification,actor_id
) values (
  'f2200000-0000-4000-8000-000000000001',
  'f2600000-0000-4000-8000-000000000001',
  'f2400000-0000-4000-8000-000000000002',
  'accept_exception','single_event',1,'Exceção sintética observável',
  'f2100000-0000-4000-8000-000000000001'
);

insert into public.notification_outbox(
  team_id,channel,template_key,recipient,payload,status,dedupe_key,processed_at
) values
  ('f2200000-0000-4000-8000-000000000001','whatsapp','event_schedule_change','+551199990001','{}','pending','r13-pilot-pending',null),
  ('f2200000-0000-4000-8000-000000000001','whatsapp','event_schedule_change','+551199990002','{}','processing','r13-pilot-processing',null),
  ('f2200000-0000-4000-8000-000000000001','whatsapp','event_schedule_change','+551199990003','{}','failed','r13-pilot-failed',now()),
  ('f2200000-0000-4000-8000-000000000001','whatsapp','event_schedule_change','+551199990004','{}','sent','r13-pilot-sent',now());

insert into public.audit_logs(
  team_id,actor_id,action,entity_type,entity_id,metadata
) values (
  'f2200000-0000-4000-8000-000000000001',
  'f2100000-0000-4000-8000-000000000001',
  'feature_flag.changed','team_feature_flag','professional_scheduling',
  '{"enabled":true}'
);

select has_function('public','get_r13_pilot_health',array['uuid'],'sonda R13 existe');
select ok(has_function_privilege('service_role','public.get_r13_pilot_health(uuid)','EXECUTE'),'service role executa sonda');
select ok(not has_function_privilege('anon','public.get_r13_pilot_health(uuid)','EXECUTE'),'anon não executa sonda');
select ok(not has_function_privilege('authenticated','public.get_r13_pilot_health(uuid)','EXECUTE'),'sessão comum não executa sonda');
select ok(not has_function_privilege('public','private.lock_professional_schedule_team()','EXECUTE'),'lock interno não é público');
select has_trigger('public','events','events_lock_professional_schedule_team','evento serializa agenda por time');
select has_trigger('public','event_attendance','event_attendance_lock_professional_schedule_team','RSVP serializa revisão por time');
select is((select count(*) from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000099')),0::bigint,'time ausente não produz linha');
select is((select team_open from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),true,'coorte está aberta');
select is((select professional_scheduling_enabled from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),true,'flag profissional observada');
select is((select whatsapp_delivery_enabled from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),true,'flag WhatsApp observada');
select is((select integration_produce_enabled from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),true,'produção da integração observada');
select is((select integration_consume_enabled from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),false,'consumo desligado é observável');
select is((select configuration_complete from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),true,'duas equipes padrão válidas completam a configuração');
select is((select active_internal_teams from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),2::bigint,'quantidade de equipes é agregada');
select is((select upcoming_events from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),4::bigint,'janela futura é agregada');
select results_eq(
  $$select scheduled_events,pending_review_events,date_tbd_events,postponed_events from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')$$,
  $$values (1::bigint,1::bigint,1::bigint,1::bigint)$$,
  'estados profissionais são diferenciados'
);
select is((select pending_conflicts from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),2::bigint,'pendências são agregadas');
select is((select hard_conflicts from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),1::bigint,'bloqueios são agregados');
select is((select warning_conflicts from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),1::bigint,'alertas são agregados');
select is((select stale_conflicts from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),0::bigint,'projeção começa atual');
select is((select schedule_state_mismatches from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),0::bigint,'estado e pendências começam consistentes');
select is((select accepted_exceptions_24h from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),1::bigint,'exceção recente é agregada');
select is((select commands_24h from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),2::bigint,'comandos dos dois contratos são agregados');
select results_eq(
  $$select notifications_pending,notifications_processing,notifications_failed,notifications_sent_24h from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')$$,
  $$values (1::bigint,1::bigint,1::bigint,1::bigint)$$,
  'outbox diferencia fila, processamento, falha e envio'
);
select ok((select last_flag_change_at is not null and last_decision_at is not null from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),'marcos operacionais são observáveis');
select is((select count(*) from unnest((select proargnames from pg_proc where oid='public.get_r13_pilot_health(uuid)'::regprocedure)) field where field ~ '(name|title|address|recipient|actor|phone|email)'),0::bigint,'contrato da sonda não expõe PII');
select results_eq(
  $$select professional_scheduling_enabled,upcoming_events,pending_conflicts from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000002')$$,
  $$values (false,0::bigint,0::bigint)$$,
  'outro tenant permanece desligado e isolado'
);

update public.events set schedule_version=2
where id='f2400000-0000-4000-8000-000000000002';
select is((select stale_conflicts from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),2::bigint,'revisão antiga fica visível como divergência');
select is((select schedule_state_mismatches from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),1::bigint,'estado sem projeção atual exige intervenção');
update public.events set schedule_version=1
where id='f2400000-0000-4000-8000-000000000002';

update public.team_feature_flags set enabled=false
where team_id='f2200000-0000-4000-8000-000000000001'
  and feature='professional_scheduling';
select is((select professional_scheduling_enabled from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),false,'rollback desliga somente a flag');
select is((select upcoming_events from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),4::bigint,'rollback preserva agenda e histórico');

select has_function('public','set_professional_scheduling_pilot_state',array['uuid','boolean'],'RPC dedicada controla o piloto');
select ok(not has_function_privilege('anon','public.set_professional_scheduling_pilot_state(uuid,boolean)','EXECUTE'),'anônimo não controla o piloto');
select ok(has_function_privilege('authenticated','public.set_professional_scheduling_pilot_state(uuid,boolean)','EXECUTE'),'sessão autenticada chama a RPC protegida');
set local role authenticated;
select set_config('request.jwt.claim.sub','f2100000-0000-4000-8000-000000000002',true);
select throws_ok(
  $$select public.set_professional_scheduling_pilot_state('f2200000-0000-4000-8000-000000000002',true)$$,
  '55000',null,'coorte sem duas equipes padrão não pode ser ativada'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','f2100000-0000-4000-8000-000000000001',true);
select lives_ok(
  $$select public.set_professional_scheduling_pilot_state('f2200000-0000-4000-8000-000000000001',true)$$,
  'owner ativa coorte completa pela RPC auditada'
);
reset role;
select is((select professional_scheduling_enabled from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),true,'sonda confirma ativação controlada');
set local role authenticated;
select set_config('request.jwt.claim.sub','f2100000-0000-4000-8000-000000000001',true);
select lives_ok(
  $$select public.set_professional_scheduling_pilot_state('f2200000-0000-4000-8000-000000000001',false)$$,
  'owner executa rollback pela mesma RPC'
);
reset role;
select is((select professional_scheduling_enabled from public.get_r13_pilot_health('f2200000-0000-4000-8000-000000000001')),false,'sonda confirma rollback controlado');

do $$
begin
  perform extensions.dblink_connect(
    'r13_lock_a',
    'host=host.docker.internal port=54322 dbname=postgres user=postgres password=postgres'
  );
  perform extensions.dblink_connect(
    'r13_lock_b',
    'host=host.docker.internal port=54322 dbname=postgres user=postgres password=postgres'
  );
  perform extensions.dblink_exec('r13_lock_a', 'begin');
  perform extensions.dblink_exec('r13_lock_a', $remote$
    do $inner$ begin
      perform pg_advisory_xact_lock(hashtextextended(
        'f2900000-0000-4000-8000-000000000001', 1305
      ));
    end $inner$
  $remote$);
  perform extensions.dblink_send_query('r13_lock_b', $remote$
    with locked as materialized (
      select pg_advisory_xact_lock(hashtextextended(
        'f2900000-0000-4000-8000-000000000001', 1305
      ))
    ) select count(*)::integer as acquired from locked
  $remote$);
  perform pg_sleep(0.1);
end
$$;

select is(extensions.dblink_is_busy('r13_lock_b'),1,'segunda sessão do mesmo time aguarda o lock transacional');
do $$ begin
  perform extensions.dblink_exec('r13_lock_a', 'commit');
end $$;
select results_eq(
  $$select acquired from extensions.dblink_get_result('r13_lock_b') as result(acquired integer)$$,
  $$values (1)$$,
  'segunda sessão prossegue somente depois do commit da primeira'
);

do $$
begin
  perform extensions.dblink_disconnect('r13_lock_a');
  perform extensions.dblink_disconnect('r13_lock_b');
end
$$;

select * from finish();
rollback;
