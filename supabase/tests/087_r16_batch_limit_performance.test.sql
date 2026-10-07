begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(8);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
values ('00000000-0000-0000-0000-000000000000','fc160000-0000-4000-8000-000000000001','authenticated','authenticated','batch-limit@example.test','',now(),'{}','{}',now(),now(),'','','','');
insert into public.teams(id,name,slug,timezone,created_by)
values ('fc161000-0000-4000-8000-000000000001','Lote Limite','lote-limite','America/Sao_Paulo','fc160000-0000-4000-8000-000000000001');
insert into public.team_feature_flags(team_id,feature,enabled,updated_by) values
  ('fc161000-0000-4000-8000-000000000001','batch_operations',true,'fc160000-0000-4000-8000-000000000001'),
  ('fc161000-0000-4000-8000-000000000001','event_control',true,'fc160000-0000-4000-8000-000000000001'),
  ('fc161000-0000-4000-8000-000000000001','professional_scheduling',true,'fc160000-0000-4000-8000-000000000001');

create temporary table batch_limit_ids(id uuid primary key);
with inserted as (
  insert into public.events(id,team_id,title,kind,organization_mode,sport_format,
    starts_at,ends_at,attendance_deadline,status,created_by)
  select gen_random_uuid(),'fc161000-0000-4000-8000-000000000001',
    'Jogo ' || ordinal,'friendly','single_squad','society',
    now() + interval '30 days' + ordinal * interval '1 day',
    now() + interval '30 days 1 hour' + ordinal * interval '1 day',
    now() + interval '29 days' + ordinal * interval '1 day',
    'scheduled','fc160000-0000-4000-8000-000000000001'
  from generate_series(1,50) ordinal
  returning id
)
insert into batch_limit_ids select id from inserted;
grant select on batch_limit_ids to authenticated;
select is((select count(*) from batch_limit_ids),50::bigint,'fixture contém o limite de 50 jogos');

set local role authenticated;
select set_config('request.jwt.claim.sub','fc160000-0000-4000-8000-000000000001',true);
create temporary table batch_limit_result(preview jsonb, applied jsonb, preview_ms numeric, apply_ms numeric);
do $$
declare
  started_at timestamptz;
  preview_value jsonb;
  applied_value jsonb;
  preview_duration numeric;
begin
  started_at := clock_timestamp();
  preview_value := public.preview_event_batch_operation(
    'fc161000-0000-4000-8000-000000000001',
    array(select id from batch_limit_ids order by id),
    'shift_time','{"offset_minutes":15}'::jsonb,'selected'
  ) || jsonb_build_object('payload','{"offset_minutes":15}'::jsonb);
  preview_duration := extract(epoch from clock_timestamp() - started_at) * 1000;
  started_at := clock_timestamp();
  applied_value := public.apply_event_batch_operation(
    'fc161000-0000-4000-8000-000000000001',preview_value,
    'fc165000-0000-4000-8000-000000000001'
  );
  insert into batch_limit_result values (
    preview_value, applied_value, preview_duration,
    extract(epoch from clock_timestamp() - started_at) * 1000
  );
end;
$$;
select is(((select preview from batch_limit_result)->>'item_count')::integer,50,'prévia resolve 50 jogos');
select is(((select applied from batch_limit_result)->>'applied_count')::integer,50,'confirmação aplica 50 jogos');
select ok((select preview_ms from batch_limit_result) < 5000,'prévia de 50 jogos abaixo de 5 s no banco local');
select ok((select apply_ms from batch_limit_result) < 8000,'aplicação de 50 jogos abaixo de 8 s no banco local');
select diag(format('50 jogos: prévia %s ms; confirmação %s ms',
  (select round(preview_ms,1) from batch_limit_result),
  (select round(apply_ms,1) from batch_limit_result)));
select is((select count(*) from public.event_changes where team_id='fc161000-0000-4000-8000-000000000001'),50::bigint,'cada jogo recebe uma mudança');
reset role;
select is((select count(*) from public.audit_logs where team_id='fc161000-0000-4000-8000-000000000001' and action='event.batch_updated'),1::bigint,'lote registra uma auditoria');
set local role authenticated;
select set_config('request.jwt.claim.sub','fc160000-0000-4000-8000-000000000001',true);
select is((public.apply_event_batch_operation('fc161000-0000-4000-8000-000000000001',
  (select preview from batch_limit_result),'fc165000-0000-4000-8000-000000000001')->>'replayed')::boolean,
  true,'replay no limite retorna o resultado gravado');

select * from finish();
rollback;
