begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(36);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','d9100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-r09-health@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','d9100000-0000-4000-8000-000000000002','authenticated','authenticated','owner-other-r09-health@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,created_by) values
  ('d9200000-0000-4000-8000-000000000001','R09 Piloto','r09-piloto-health','d9100000-0000-4000-8000-000000000001'),
  ('d9200000-0000-4000-8000-000000000002','R09 Outro','r09-outro-health','d9100000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000001',true);
select public.set_team_feature_flag(
  'd9200000-0000-4000-8000-000000000001','championships',true
);
select public.create_championship_draft(
  'd9200000-0000-4000-8000-000000000001',
  'd9300000-0000-4000-8000-000000000001','Liga da Sonda','league',
  3::smallint,1::smallint,0::smallint,
  array['wins','goal_difference']::public.championship_tiebreak_key[],
  null::smallint,null::smallint
);
select public.add_championship_participant(
  (select id from public.championships where name='Liga da Sonda'),
  'd9300000-0000-4000-8000-000000000002',1::smallint,null::smallint,
  null,'Verde Sintético','#059669','shield'
);
select public.add_championship_participant(
  (select id from public.championships where name='Liga da Sonda'),
  'd9300000-0000-4000-8000-000000000003',2::smallint,null::smallint,
  null,'Azul Sintético','#2563EB','stripes'
);
select public.generate_league_fixtures(
  (select id from public.championships where name='Liga da Sonda'),
  'd9300000-0000-4000-8000-000000000004'
);
select public.publish_league_championship(
  (select id from public.championships where name='Liga da Sonda'),
  'd9300000-0000-4000-8000-000000000005'
);
select public.set_championship_public_mode(
  (select id from public.championships where name='Liga da Sonda'),
  'd9300000-0000-4000-8000-000000000006','public'
);
reset role;
select set_config('test.r09_health_public_id',(
  select public_id::text from public.championships where name='Liga da Sonda'
),true);

select has_function(
  'public','get_championship_pilot_health',array['uuid'],
  'sonda agregada de campeonatos existe'
);
select ok(has_function_privilege(
  'service_role','public.get_championship_pilot_health(uuid)','execute'
), 'service role executa a sonda');
select ok(not has_function_privilege(
  'anon','public.get_championship_pilot_health(uuid)','execute'
), 'anon não executa a sonda');
select ok(not has_function_privilege(
  'authenticated','public.get_championship_pilot_health(uuid)','execute'
), 'authenticated não executa a sonda');
select is((select count(*) from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000099'
)),0::bigint,'time ausente não produz linha');
select is((select championships_enabled from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),true,'flag do piloto observada');
select is((select public_event_page_enabled from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),false,'gate de evento público observado sem ampliação');
select is((select championships_total from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),1::bigint,'sonda conta somente o campeonato da coorte');
select results_eq(
  $$select draft_championships,published_championships,active_championships,completed_championships,archived_championships from public.get_championship_pilot_health('d9200000-0000-4000-8000-000000000001')$$,
  $$select 0::bigint,1::bigint,0::bigint,0::bigint,0::bigint$$,
  'estados agregados são coerentes'
);
select results_eq(
  $$select league_championships,groups_knockout_championships,knockout_championships from public.get_championship_pilot_health('d9200000-0000-4000-8000-000000000001')$$,
  $$select 1::bigint,0::bigint,0::bigint$$,
  'formatos agregados não expõem conteúdo'
);
select is((select page_candidates from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),1::bigint,'uma página é candidata');
select is((select projected_championships from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),1::bigint,'página pública é projetada');
select is((select fallback_championships from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),0::bigint,'piloto ativo não usa fallback');
select is((select participants_total from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),2::bigint,'participantes são somente uma contagem');
select is((select fixtures_total from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),1::bigint,'confrontos são somente uma contagem');
select is((select linked_fixtures from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),0::bigint,'nenhum vínculo é inventado');
select is((select finalized_fixtures from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),0::bigint,'nenhuma finalização é inventada');
select is((select void_fixtures from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),0::bigint,'nenhuma anulação é inventada');
select is((select resolved_fixtures from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),0::bigint,'nenhuma decisão é inventada');
select is((select projected_participants from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),2::bigint,'projeção contém dois snapshots');
select is((select projected_fixtures from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),1::bigint,'projeção contém a grade publicada');
select is((select projected_standings from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),2::bigint,'classificação reconstruída contém duas linhas');
select is((select reconstruction_mismatches from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),0::bigint,'projeção e fontes reconstruídas não divergem');
select is((select commands_24h from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),6::bigint,'recibos recentes são agregados');
select ok((select last_command_at is not null and last_flag_change_at is not null
  from public.get_championship_pilot_health(
    'd9200000-0000-4000-8000-000000000001'
  )), 'sonda expõe somente marcos temporais operacionais');
select is((select championships_total from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000002'
)),0::bigint,'outro time não recebe contagens da coorte');
select is((select championships_enabled from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000002'
)),false,'outro time permanece desligado');
select is((select projected_championships from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000002'
)),0::bigint,'outro time não recebe projeção');
select ok(not exists (
  select 1 from information_schema.columns column_info
  where column_info.table_schema='public'
    and column_info.table_name='get_championship_pilot_health'
    and column_info.column_name in (
      'team_id','championship_id','public_id','participant_id','fixture_id',
      'event_id','name','title','reason','error'
    )
), 'contrato da sonda não contém identificador, conteúdo ou erro bruto');

set local role authenticated;
select set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000001',true);
select public.set_team_feature_flag(
  'd9200000-0000-4000-8000-000000000001','championships',false
);
reset role;

select is((select championships_enabled from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),false,'rollback desliga a capacidade');
select is((select projected_championships from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),0::bigint,'rollback remove a projeção ativa');
select is((select fallback_championships from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)),1::bigint,'rollback devolve a página ao fallback');
select results_eq(
  $$select championships_total,participants_total,fixtures_total from public.get_championship_pilot_health('d9200000-0000-4000-8000-000000000001')$$,
  $$select 1::bigint,2::bigint,1::bigint$$,
  'rollback preserva fatos e histórico'
);
set local role anon;
select is(public.get_public_championship(
  current_setting('test.r09_health_public_id')::uuid
),null::jsonb,'rollback fecha a página anônima');
reset role;
select is((select count(*) from public.audit_logs
  where team_id='d9200000-0000-4000-8000-000000000001'
    and action='feature_flag.changed' and entity_id='championships'),
  2::bigint,'ativação e rollback ficam auditados');
select ok((select observed_at <= now() from public.get_championship_pilot_health(
  'd9200000-0000-4000-8000-000000000001'
)), 'sonda informa o horário agregado da observação');

select * from finish();
rollback;
