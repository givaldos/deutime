-- Duas conexões reais disputam o mesmo request_id. A fixture é sintética e
-- precisa ser confirmada para ficar visível às duas sessões do dblink.
create extension if not exists pgtap with schema extensions;
create extension if not exists dblink;
set search_path = public, extensions;

begin;
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
values ('00000000-0000-0000-0000-000000000000','fd160000-0000-4000-8000-000000000001','authenticated','authenticated','batch-concurrency@example.test','',now(),'{}','{}',now(),now(),'','','','');
insert into public.teams(id,name,slug,timezone,created_by)
values ('fd161000-0000-4000-8000-000000000001','Lote Concorrente','lote-concorrente','America/Sao_Paulo','fd160000-0000-4000-8000-000000000001');
insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('fd161000-0000-4000-8000-000000000001','batch_operations',true,'fd160000-0000-4000-8000-000000000001'),
  ('fd161000-0000-4000-8000-000000000001','event_control',true,'fd160000-0000-4000-8000-000000000001'),
  ('fd161000-0000-4000-8000-000000000001','professional_scheduling',true,'fd160000-0000-4000-8000-000000000001'),
  ('fd161000-0000-4000-8000-000000000001','recognizable_roster',true,'fd160000-0000-4000-8000-000000000001');
insert into public.events(id,team_id,title,kind,organization_mode,sport_format,
  starts_at,ends_at,attendance_deadline,status,created_by)
values ('fd162000-0000-4000-8000-000000000001','fd161000-0000-4000-8000-000000000001',
  'Jogo concorrente','friendly','single_squad','society',now()+interval '30 days',
  now()+interval '30 days 1 hour',now()+interval '29 days','scheduled',
  'fd160000-0000-4000-8000-000000000001');
insert into public.athletes(id,team_id,full_name,preferred_name,status,created_by)
values ('fd163000-0000-4000-8000-000000000001','fd161000-0000-4000-8000-000000000001',
  'Atleta Concorrente','Concorrente','pending','fd160000-0000-4000-8000-000000000001');
commit;

begin;
select plan(15);
select has_extension('dblink','duas sessões de banco disponíveis');
select is(dblink_connect('r16_batch_a',
  'host=host.docker.internal port=54322 dbname=postgres user=postgres password=postgres'),
  'OK','primeira sessão conectada');
select is(dblink_connect('r16_batch_b',
  'host=host.docker.internal port=54322 dbname=postgres user=postgres password=postgres'),
  'OK','segunda sessão conectada');

set local role authenticated;
select set_config('request.jwt.claim.sub','fd160000-0000-4000-8000-000000000001',true);
create temporary table r16_batch_previews(domain text primary key, preview jsonb) on commit drop;
insert into r16_batch_previews values (
  'events',public.preview_event_batch_operation(
    'fd161000-0000-4000-8000-000000000001',
    array['fd162000-0000-4000-8000-000000000001'::uuid],
    'shift_time','{"offset_minutes":15}'::jsonb,'selected'
  ) || jsonb_build_object('payload','{"offset_minutes":15}'::jsonb)),
  ('athletes',public.preview_athlete_review_batch(
    'fd161000-0000-4000-8000-000000000001',
    array['fd163000-0000-4000-8000-000000000001'::uuid],'reject'
  ) || jsonb_build_object('payload','{"decision":"reject"}'::jsonb));
reset role;

create function pg_temp.run_batch_race(function_name text, preview_value jsonb,
  request_value uuid)
returns table(first_replayed boolean, second_replayed boolean, second_busy integer)
language plpgsql
as $$
declare
  first_query text;
  second_query text;
  first_result jsonb;
  second_result jsonb;
begin
  first_query := format($query$
    with identity as materialized (
      select set_config('request.jwt.claim.sub',
        'fd160000-0000-4000-8000-000000000001',false)
    ), command as materialized (
      select public.%I('fd161000-0000-4000-8000-000000000001'::uuid,
        %L::jsonb,%L::uuid) as result from identity
    ), held as materialized (select pg_sleep(1) from command)
    select command.result from command cross join held
  $query$, function_name, preview_value::text, request_value::text);
  second_query := format($query$
    with identity as materialized (
      select set_config('request.jwt.claim.sub',
        'fd160000-0000-4000-8000-000000000001',false)
    )
    select public.%I('fd161000-0000-4000-8000-000000000001'::uuid,
      %L::jsonb,%L::uuid) as result from identity
  $query$, function_name, preview_value::text, request_value::text);

  perform dblink_send_query('r16_batch_a', first_query);
  perform pg_sleep(0.1);
  perform dblink_send_query('r16_batch_b', second_query);
  perform pg_sleep(0.1);
  second_busy := dblink_is_busy('r16_batch_b');
  select result into first_result from dblink_get_result('r16_batch_a') as response(result jsonb);
  select result into second_result from dblink_get_result('r16_batch_b') as response(result jsonb);
  first_replayed := (first_result->>'replayed')::boolean;
  second_replayed := (second_result->>'replayed')::boolean;
  return next;
end;
$$;

create temporary table r16_batch_races(domain text primary key,
  first_replayed boolean, second_replayed boolean, second_busy integer) on commit drop;
insert into r16_batch_races
select 'events', race.* from pg_temp.run_batch_race('apply_event_batch_operation',
  (select preview from r16_batch_previews where domain='events'),
  'fd164000-0000-4000-8000-000000000001') race;
select is((select second_busy from r16_batch_races where domain='events'),1,
  'segunda sessão de jogos espera enquanto a primeira ainda executa');
select results_eq($$select first_replayed,second_replayed from r16_batch_races where domain='events'$$,
  $$select false,true$$,'jogos convergem em aplicação e replay');
select is((select count(*) from public.event_changes where team_id='fd161000-0000-4000-8000-000000000001'),
  1::bigint,'jogo é alterado uma vez');
select is((select count(*) from public.event_commands where team_id='fd161000-0000-4000-8000-000000000001'
  and request_id='fd164000-0000-4000-8000-000000000001'),1::bigint,'jogos têm um comando');
select is((select count(*) from dblink_get_result('r16_batch_a') as response(result jsonb)),
  0::bigint,'primeira sessão de jogos liberou o resultado assíncrono');
select is((select count(*) from dblink_get_result('r16_batch_b') as response(result jsonb)),
  0::bigint,'segunda sessão de jogos liberou o resultado assíncrono');

insert into r16_batch_races
select 'athletes', race.* from pg_temp.run_batch_race('apply_athlete_review_batch',
  (select preview from r16_batch_previews where domain='athletes'),
  'fd164000-0000-4000-8000-000000000002') race;
select is((select second_busy from r16_batch_races where domain='athletes'),1,
  'segunda sessão de atletas espera enquanto a primeira ainda executa');
select results_eq($$select first_replayed,second_replayed from r16_batch_races where domain='athletes'$$,
  $$select false,true$$,'atletas convergem em aplicação e replay');
select is((select status from public.athletes where id='fd163000-0000-4000-8000-000000000001'),
  'rejected'::public.athlete_status,'cadastro recebe uma decisão');
select is((select count(*) from private.athlete_batch_commands where team_id='fd161000-0000-4000-8000-000000000001'),
  1::bigint,'atletas têm um comando');
select is(dblink_disconnect('r16_batch_a'),'OK','primeira sessão encerrada');
select is(dblink_disconnect('r16_batch_b'),'OK','segunda sessão encerrada');

delete from public.event_changes where team_id='fd161000-0000-4000-8000-000000000001';
delete from public.event_commands where team_id='fd161000-0000-4000-8000-000000000001';
delete from private.athlete_batch_commands where team_id='fd161000-0000-4000-8000-000000000001';
delete from public.audit_logs where team_id='fd161000-0000-4000-8000-000000000001';
delete from public.athletes where team_id='fd161000-0000-4000-8000-000000000001';
delete from public.events where team_id='fd161000-0000-4000-8000-000000000001';
delete from public.team_feature_flags where team_id='fd161000-0000-4000-8000-000000000001';
alter table public.team_memberships disable trigger protect_last_team_owner;
delete from public.team_memberships where team_id='fd161000-0000-4000-8000-000000000001';
alter table public.team_memberships enable trigger protect_last_team_owner;
delete from public.teams where id='fd161000-0000-4000-8000-000000000001';
delete from auth.users where id='fd160000-0000-4000-8000-000000000001';
select * from finish();
drop extension dblink;
commit;
