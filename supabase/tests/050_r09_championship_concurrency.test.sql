-- Este ensaio usa duas conexões reais contra o Supabase local. Os IDs são
-- sintéticos e a limpeza explícita ocorre antes do commit final.

create extension if not exists pgtap with schema extensions;
create extension if not exists dblink;
set search_path = public, extensions;

begin;
insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'e9100000-0000-4000-8000-000000000001','authenticated','authenticated',
  'owner-r09-concurrency@example.test','',now(),'{}','{}',now(),now(),
  '','','',''
);
insert into public.teams(id,name,slug,created_by) values (
  'e9200000-0000-4000-8000-000000000001','R09 Concorrência',
  'r09-concorrencia','e9100000-0000-4000-8000-000000000001'
);
insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values (
  'e9200000-0000-4000-8000-000000000001','championships',true,
  'e9100000-0000-4000-8000-000000000001'
);
insert into public.championships(
  id,team_id,name,format,created_by,updated_by
) values (
  'e9300000-0000-4000-8000-000000000001',
  'e9200000-0000-4000-8000-000000000001','Liga Concorrente','league',
  'e9100000-0000-4000-8000-000000000001',
  'e9100000-0000-4000-8000-000000000001'
);
insert into public.championship_participants(
  id,championship_id,team_id,kind,snapshot_name,snapshot_color,
  snapshot_badge_key,seed,created_by,updated_by
) values
  ('e9310000-0000-4000-8000-000000000001','e9300000-0000-4000-8000-000000000001','e9200000-0000-4000-8000-000000000001','external','Seed Um','#059669','shield',1,'e9100000-0000-4000-8000-000000000001','e9100000-0000-4000-8000-000000000001'),
  ('e9310000-0000-4000-8000-000000000002','e9300000-0000-4000-8000-000000000001','e9200000-0000-4000-8000-000000000001','external','Seed Dois','#2563EB','stripes',2,'e9100000-0000-4000-8000-000000000001','e9100000-0000-4000-8000-000000000001'),
  ('e9310000-0000-4000-8000-000000000003','e9300000-0000-4000-8000-000000000001','e9200000-0000-4000-8000-000000000001','external','Seed Três','#D97706','diamond',3,'e9100000-0000-4000-8000-000000000001','e9100000-0000-4000-8000-000000000001'),
  ('e9310000-0000-4000-8000-000000000004','e9300000-0000-4000-8000-000000000001','e9200000-0000-4000-8000-000000000001','external','Seed Quatro','#7C3AED','quarters',4,'e9100000-0000-4000-8000-000000000001','e9100000-0000-4000-8000-000000000001');
commit;

begin;
select plan(22);
select has_extension('dblink','dblink disponível para concorrência real');
select is(dblink_connect(
  'r09_concurrency_a',
  'host=host.docker.internal port=54322 dbname=postgres user=postgres password=postgres'
),'OK','primeira sessão conectada');
select is(dblink_connect(
  'r09_concurrency_b',
  'host=host.docker.internal port=54322 dbname=postgres user=postgres password=postgres'
),'OK','segunda sessão conectada');

select is(dblink_send_query('r09_concurrency_a',$query$
  with identity as materialized (
    select set_config('request.jwt.claim.sub','e9100000-0000-4000-8000-000000000001',false)
  ), command as materialized (
    select (public.generate_league_fixtures(
      'e9300000-0000-4000-8000-000000000001',
      'e9400000-0000-4000-8000-000000000001'
    )).replayed as replayed from identity
  ), held as materialized (
    select pg_sleep(1) from command
  )
  select command.replayed from command cross join held
$query$),1,'primeira geração enviada sem bloquear a sessão de teste');
select is(dblink_send_query('r09_concurrency_b',$query$
  with identity as materialized (
    select set_config('request.jwt.claim.sub','e9100000-0000-4000-8000-000000000001',false)
  )
  select (public.generate_league_fixtures(
    'e9300000-0000-4000-8000-000000000001',
    'e9400000-0000-4000-8000-000000000001'
  )).replayed from identity
$query$),1,'segunda geração enviada enquanto a primeira mantém o lock');

create temporary table r09_concurrency_results(
  phase text not null,
  connection_name text not null,
  replayed boolean not null
) on commit drop;
insert into r09_concurrency_results
select 'generate','a',result.replayed
from dblink_get_result('r09_concurrency_a') as result(replayed boolean);
insert into r09_concurrency_results
select 'generate','b',result.replayed
from dblink_get_result('r09_concurrency_b') as result(replayed boolean);
select is((select count(*) from dblink_get_result(
  'r09_concurrency_a'
) as result(replayed boolean)),0::bigint,'primeira sessão liberou o resultado assíncrono');
select is((select count(*) from dblink_get_result(
  'r09_concurrency_b'
) as result(replayed boolean)),0::bigint,'segunda sessão liberou o resultado assíncrono');

select results_eq(
  $$select count(*) filter (where not replayed),count(*) filter (where replayed) from r09_concurrency_results where phase='generate'$$,
  $$select 1::bigint,1::bigint$$,
  'geração concorrente converge em uma execução e um replay'
);
select is((select count(*) from public.championship_fixtures
  where championship_id='e9300000-0000-4000-8000-000000000001'),
  6::bigint,'grade concorrente possui somente seis confrontos');
select is((select count(*) from public.championship_fixture_slots
  where championship_id='e9300000-0000-4000-8000-000000000001'),
  12::bigint,'grade concorrente possui somente dois lados por confronto');
select is((select count(*) from public.championship_commands
  where team_id='e9200000-0000-4000-8000-000000000001'
    and request_id='e9400000-0000-4000-8000-000000000001'),
  1::bigint,'geração concorrente mantém um recibo');

select is(dblink_send_query('r09_concurrency_a',$query$
  with identity as materialized (
    select set_config('request.jwt.claim.sub','e9100000-0000-4000-8000-000000000001',false)
  ), command as materialized (
    select (public.publish_league_championship(
      'e9300000-0000-4000-8000-000000000001',
      'e9400000-0000-4000-8000-000000000002'
    )).replayed as replayed from identity
  ), held as materialized (
    select pg_sleep(1) from command
  )
  select command.replayed from command cross join held
$query$),1,'primeira publicação enviada sem bloquear a sessão de teste');
select is(dblink_send_query('r09_concurrency_b',$query$
  with identity as materialized (
    select set_config('request.jwt.claim.sub','e9100000-0000-4000-8000-000000000001',false)
  )
  select (public.publish_league_championship(
    'e9300000-0000-4000-8000-000000000001',
    'e9400000-0000-4000-8000-000000000002'
  )).replayed from identity
$query$),1,'segunda publicação enviada durante o lock');

insert into r09_concurrency_results
select 'publish','a',result.replayed
from dblink_get_result('r09_concurrency_a') as result(replayed boolean);
insert into r09_concurrency_results
select 'publish','b',result.replayed
from dblink_get_result('r09_concurrency_b') as result(replayed boolean);
select is((select count(*) from dblink_get_result(
  'r09_concurrency_a'
) as result(replayed boolean)),0::bigint,'primeira publicação liberou a sessão');
select is((select count(*) from dblink_get_result(
  'r09_concurrency_b'
) as result(replayed boolean)),0::bigint,'segunda publicação liberou a sessão');

select results_eq(
  $$select count(*) filter (where not replayed),count(*) filter (where replayed) from r09_concurrency_results where phase='publish'$$,
  $$select 1::bigint,1::bigint$$,
  'publicação concorrente converge em uma execução e um replay'
);
select is((select status from public.championships
  where id='e9300000-0000-4000-8000-000000000001'),
  'published'::public.championship_status,'campeonato termina publicado uma vez');
select is((select count(*) from public.championship_fixtures
  where championship_id='e9300000-0000-4000-8000-000000000001'
    and status='scheduled'),6::bigint,'uma única grade é promovida');
select is((select count(*) from public.championship_commands
  where team_id='e9200000-0000-4000-8000-000000000001'
    and request_id='e9400000-0000-4000-8000-000000000002'),
  1::bigint,'publicação concorrente mantém um recibo');
select is(dblink_disconnect('r09_concurrency_a'),'OK','primeira sessão encerrada');
select is(dblink_disconnect('r09_concurrency_b'),'OK','segunda sessão encerrada');
select is((select enabled from public.team_feature_flags
  where team_id='e9200000-0000-4000-8000-000000000001'
    and feature='championships'),true,'concorrência não altera o rollout');

delete from public.championship_commands
where team_id='e9200000-0000-4000-8000-000000000001';
delete from public.championship_fixture_slots
where team_id='e9200000-0000-4000-8000-000000000001';
delete from public.championship_fixtures
where team_id='e9200000-0000-4000-8000-000000000001';
delete from public.championship_participants
where team_id='e9200000-0000-4000-8000-000000000001';
delete from public.championships
where team_id='e9200000-0000-4000-8000-000000000001';
delete from public.team_feature_flags
where team_id='e9200000-0000-4000-8000-000000000001';
alter table public.team_memberships disable trigger protect_last_team_owner;
delete from public.team_memberships
where team_id='e9200000-0000-4000-8000-000000000001';
alter table public.team_memberships enable trigger protect_last_team_owner;
delete from public.audit_logs
where team_id='e9200000-0000-4000-8000-000000000001';
delete from public.teams where id='e9200000-0000-4000-8000-000000000001';
delete from auth.users where id='e9100000-0000-4000-8000-000000000001';

select * from finish();
drop extension dblink;
commit;
