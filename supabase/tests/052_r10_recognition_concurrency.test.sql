-- Duas conexões reais exercitam a ativação e o consentimento simultâneos.
-- Os IDs são sintéticos e a limpeza explícita ocorre antes do commit final.

create extension if not exists pgtap with schema extensions;
create extension if not exists dblink;
set search_path = public, extensions;

begin;
insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'c1100000-0000-4000-8000-000000000001','authenticated','authenticated',
    'owner-r10-concurrency@example.test','',now(),'{}','{}',now(),now(),
    '','','',''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c1100000-0000-4000-8000-000000000002','authenticated','authenticated',
    'athlete-r10-concurrency@example.test','',now(),'{}','{}',now(),now(),
    '','','',''
  );

insert into public.teams(id,name,slug,created_by) values (
  'c1200000-0000-4000-8000-000000000001','R10 Concorrência',
  'r10-concorrencia','c1100000-0000-4000-8000-000000000001'
);

insert into public.athletes(
  id,team_id,user_id,full_name,preferred_name,status,registration_source,created_by
) values (
  'c1300000-0000-4000-8000-000000000001',
  'c1200000-0000-4000-8000-000000000001',
  'c1100000-0000-4000-8000-000000000002',
  'Atleta Concorrente','Concorrente','active','public_form',
  'c1100000-0000-4000-8000-000000000001'
);
commit;

begin;
select plan(22);
select has_extension('dblink','dblink disponível para concorrência real');
select is(dblink_connect(
  'r10_concurrency_a',
  'host=host.docker.internal port=54322 dbname=postgres user=postgres password=postgres'
),'OK','primeira sessão conectada');
select is(dblink_connect(
  'r10_concurrency_b',
  'host=host.docker.internal port=54322 dbname=postgres user=postgres password=postgres'
),'OK','segunda sessão conectada');

select is(dblink_send_query('r10_concurrency_a',$query$
  with identity as materialized (
    select set_config('request.jwt.claim.sub','c1100000-0000-4000-8000-000000000001',false)
  ), command as materialized (
    select (public.set_team_feature_flag(
      'c1200000-0000-4000-8000-000000000001','recognition',true
    )).enabled from identity
  ), held as materialized (
    select pg_sleep(1) from command
  )
  select command.enabled from command cross join held
$query$),1,'primeira ativação enviada sem bloquear o ensaio');
select is(dblink_send_query('r10_concurrency_b',$query$
  with identity as materialized (
    select set_config('request.jwt.claim.sub','c1100000-0000-4000-8000-000000000001',false)
  )
  select (public.set_team_feature_flag(
    'c1200000-0000-4000-8000-000000000001','recognition',true
  )).enabled from identity
$query$),1,'segunda ativação enviada enquanto a primeira mantém o lock');

create temporary table r10_concurrency_results(
  phase text not null,
  connection_name text not null,
  result text not null
) on commit drop;
insert into r10_concurrency_results
select 'activation','a',result.enabled::text
from dblink_get_result('r10_concurrency_a') as result(enabled boolean);
insert into r10_concurrency_results
select 'activation','b',result.enabled::text
from dblink_get_result('r10_concurrency_b') as result(enabled boolean);
select is((select count(*) from dblink_get_result(
  'r10_concurrency_a'
) as result(enabled boolean)),0::bigint,'primeira ativação liberou a sessão');
select is((select count(*) from dblink_get_result(
  'r10_concurrency_b'
) as result(enabled boolean)),0::bigint,'segunda ativação liberou a sessão');
select results_eq(
  $$select count(*),count(*) filter (where result='true') from r10_concurrency_results where phase='activation'$$,
  $$select 2::bigint,2::bigint$$,
  'as duas ativações convergem no estado ligado'
);
select is((select count(*) from public.team_feature_flags
  where team_id='c1200000-0000-4000-8000-000000000001'
    and feature='recognition'),1::bigint,'ativação concorrente mantém uma flag');
select is((select count(*) from private.team_recognition_activations
  where team_id='c1200000-0000-4000-8000-000000000001'),
  1::bigint,'ativação concorrente mantém um único marco não retroativo');

select is(dblink_send_query('r10_concurrency_a',$query$
  with identity as materialized (
    select set_config('request.jwt.claim.sub','c1100000-0000-4000-8000-000000000002',false)
  ), command as materialized (
    select (public.set_public_recognition_summary_consent(
      'c1300000-0000-4000-8000-000000000001',true,'r10-v1',
      'c1400000-0000-4000-8000-000000000001'
    )).status::text as status from identity
  ), held as materialized (
    select pg_sleep(1) from command
  )
  select command.status from command cross join held
$query$),1,'primeiro consentimento enviado sem bloquear o ensaio');
select is(dblink_send_query('r10_concurrency_b',$query$
  with identity as materialized (
    select set_config('request.jwt.claim.sub','c1100000-0000-4000-8000-000000000002',false)
  )
  select (public.set_public_recognition_summary_consent(
    'c1300000-0000-4000-8000-000000000001',true,'r10-v1',
    'c1400000-0000-4000-8000-000000000002'
  )).status::text from identity
$query$),1,'segundo consentimento enviado durante o lock do vínculo');

insert into r10_concurrency_results
select 'consent','a',result.status
from dblink_get_result('r10_concurrency_a') as result(status text);
insert into r10_concurrency_results
select 'consent','b',result.status
from dblink_get_result('r10_concurrency_b') as result(status text);
select is((select count(*) from dblink_get_result(
  'r10_concurrency_a'
) as result(status text)),0::bigint,'primeiro consentimento liberou a sessão');
select is((select count(*) from dblink_get_result(
  'r10_concurrency_b'
) as result(status text)),0::bigint,'segundo consentimento liberou a sessão');
select results_eq(
  $$select count(*),count(*) filter (where result='granted') from r10_concurrency_results where phase='consent'$$,
  $$select 2::bigint,2::bigint$$,
  'os dois comandos convergem no consentimento concedido'
);
select is((select count(*) from public.athlete_public_consents
  where athlete_id='c1300000-0000-4000-8000-000000000001'
    and purpose='public_recognition_summary_v1'),
  1::bigint,'concorrência mantém uma única finalidade por vínculo');
select is((select status from public.athlete_public_consents
  where athlete_id='c1300000-0000-4000-8000-000000000001'
    and purpose='public_recognition_summary_v1'),
  'granted'::public.consent_status,'estado final permanece concedido');
select is((select count(*) from public.audit_logs
  where team_id='c1200000-0000-4000-8000-000000000001'
    and action='privacy.recognition_summary.granted'),
  2::bigint,'cada intenção concorrente preserva sua auditoria');
select is((select count(*) from private.team_recognition_activations
  where team_id='c1200000-0000-4000-8000-000000000001'),
  1::bigint,'consentimento concorrente não altera o marco de ativação');
select is(dblink_disconnect('r10_concurrency_a'),'OK','primeira sessão encerrada');
select is(dblink_disconnect('r10_concurrency_b'),'OK','segunda sessão encerrada');
select is((select enabled from public.team_feature_flags
  where team_id='c1200000-0000-4000-8000-000000000001'
    and feature='recognition'),true,'concorrência não altera o rollout');

delete from public.audit_logs
where team_id='c1200000-0000-4000-8000-000000000001';
delete from public.athlete_public_consents
where team_id='c1200000-0000-4000-8000-000000000001';
delete from public.team_feature_flags
where team_id='c1200000-0000-4000-8000-000000000001';
delete from public.athletes
where team_id='c1200000-0000-4000-8000-000000000001';
alter table public.team_memberships disable trigger protect_last_team_owner;
delete from public.team_memberships
where team_id='c1200000-0000-4000-8000-000000000001';
alter table public.team_memberships enable trigger protect_last_team_owner;
delete from public.teams where id='c1200000-0000-4000-8000-000000000001';
delete from auth.users where id in (
  'c1100000-0000-4000-8000-000000000001',
  'c1100000-0000-4000-8000-000000000002'
);

select * from finish();
drop extension dblink;
commit;
