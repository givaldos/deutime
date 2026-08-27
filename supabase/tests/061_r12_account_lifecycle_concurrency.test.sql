create extension if not exists pgtap with schema extensions;
create extension if not exists dblink;
set search_path = public, extensions;

begin;
insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','ac100000-0000-4000-8000-000000000001','authenticated','authenticated','r12-race-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','ac100000-0000-4000-8000-000000000002','authenticated','authenticated','r12-race-b@example.test','',now(),'{}','{}',now(),now(),'','','','');
insert into public.teams(id,name,slug,created_by) values(
  'ac200000-0000-4000-8000-000000000001','R12 Corrida Owner','r12-corrida-owner','ac100000-0000-4000-8000-000000000001'
);
insert into public.team_memberships(team_id,user_id,role,status) values(
  'ac200000-0000-4000-8000-000000000001','ac100000-0000-4000-8000-000000000002','owner','active'
);
update public.runtime_controls set enabled=true where control='account_autonomy';
create function public.r12_try_leave(team_id uuid, command_id uuid)
returns text language plpgsql as $$
begin
  perform public.leave_my_team(team_id,command_id);
  return 'left';
exception when others then
  return sqlstate;
end;
$$;
commit;

begin;
select plan(10);
select has_extension('dblink','dblink disponível para a corrida de owners');
select is(dblink_connect('r12_owner_a','host=host.docker.internal port=54322 dbname=postgres user=postgres password=postgres'),'OK','primeira sessão conectada');
select is(dblink_connect('r12_owner_b','host=host.docker.internal port=54322 dbname=postgres user=postgres password=postgres'),'OK','segunda sessão conectada');
select is(dblink_send_query('r12_owner_a',$query$
  with identity as materialized (
    select set_config('request.jwt.claim.sub','ac100000-0000-4000-8000-000000000001',false)
  ), command as materialized (
    select public.r12_try_leave('ac200000-0000-4000-8000-000000000001','ac300000-0000-4000-8000-000000000001') as outcome from identity
  ), held as materialized (select pg_sleep(1) from command)
  select command.outcome from command cross join held
$query$),1,'primeira saída mantém o lock do time');
select is(dblink_send_query('r12_owner_b',$query$
  with identity as materialized (
    select set_config('request.jwt.claim.sub','ac100000-0000-4000-8000-000000000002',false)
  )
  select public.r12_try_leave('ac200000-0000-4000-8000-000000000001','ac300000-0000-4000-8000-000000000002') from identity
$query$),1,'segunda saída disputa o mesmo time');

create temporary table r12_owner_results(outcome text) on commit drop;
insert into r12_owner_results select result.outcome
from dblink_get_result('r12_owner_a') as result(outcome text);
insert into r12_owner_results select result.outcome
from dblink_get_result('r12_owner_b') as result(outcome text);
select results_eq(
  $$select outcome,count(*) from r12_owner_results group by outcome order by outcome$$,
  $$values ('23514'::text,1::bigint),('left'::text,1::bigint)$$,
  'somente uma saída vence e a outra encontra a barreira do último owner'
);
select is((select count(*) from public.team_memberships where team_id='ac200000-0000-4000-8000-000000000001' and role='owner' and status='active'),1::bigint,'corrida preserva exatamente um owner ativo');
select is(dblink_disconnect('r12_owner_a'),'OK','primeira sessão encerrada');
select is(dblink_disconnect('r12_owner_b'),'OK','segunda sessão encerrada');
select is((select count(*) from public.audit_logs where team_id='ac200000-0000-4000-8000-000000000001' and action='account_relationship.left'),1::bigint,'somente a saída confirmada é auditada');

delete from public.audit_logs where team_id='ac200000-0000-4000-8000-000000000001';
alter table public.team_memberships disable trigger protect_last_team_owner;
delete from public.team_memberships where team_id='ac200000-0000-4000-8000-000000000001';
alter table public.team_memberships enable trigger protect_last_team_owner;
delete from public.teams where id='ac200000-0000-4000-8000-000000000001';
drop function public.r12_try_leave(uuid,uuid);
delete from auth.users where id in('ac100000-0000-4000-8000-000000000001','ac100000-0000-4000-8000-000000000002');
update public.runtime_controls set enabled=false where control='account_autonomy';
select * from finish();
drop extension dblink;
commit;
