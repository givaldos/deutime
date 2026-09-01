begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(13);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','fa130000-0000-4000-8000-000000000001','authenticated','authenticated','owner-r13-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fa130000-0000-4000-8000-000000000002','authenticated','authenticated','manager-r13-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','fa130000-0000-4000-8000-000000000003','authenticated','authenticated','owner-r13-b@example.test','',now(),'{}','{}',now(),now(),'','','','');

select ok(
  'professional_scheduling' = any(enum_range(null::public.feature_key)::text[]),
  'flag da agenda profissional existe no catálogo tipado'
);
select ok(
  'professional_scheduling' <> all(array(
    select feature::text from private.product_feature_keys() feature
  )),
  'capacidade futura não entra no catálogo global já validado'
);
select is(
  (select count(*) from public.team_feature_flags
   where feature = 'professional_scheduling'),
  0::bigint,
  'expansão não ativa nem materializa a flag para times existentes'
);
select has_function(
  'public', 'is_team_feature_enabled', array['uuid', 'public.feature_key'],
  'leitura server-side reutiliza o contrato tipado existente'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.set_team_feature_flag(uuid,public.feature_key,boolean)',
    'execute'
  ),
  'anônimo não altera a capacidade'
);

update private.product_rollout_state set enabled = true where singleton;

insert into public.teams (id, name, slug, created_by) values
  ('fa131000-0000-4000-8000-000000000001','Agenda R13 A','agenda-r13-a','fa130000-0000-4000-8000-000000000001'),
  ('fa131000-0000-4000-8000-000000000002','Agenda R13 B','agenda-r13-b','fa130000-0000-4000-8000-000000000003');

insert into public.team_memberships(team_id, user_id, role, status, invited_by)
values (
  'fa131000-0000-4000-8000-000000000001',
  'fa130000-0000-4000-8000-000000000002',
  'manager',
  'active',
  'fa130000-0000-4000-8000-000000000001'
);

select is(
  (select count(*) from public.team_feature_flags
   where team_id in (
     'fa131000-0000-4000-8000-000000000001',
     'fa131000-0000-4000-8000-000000000002'
   ) and feature = 'professional_scheduling'),
  0::bigint,
  'times criados após o rollout também permanecem sem a capacidade futura'
);
select is(
  (select count(*) from public.team_feature_flags
   where team_id = 'fa131000-0000-4000-8000-000000000001' and enabled),
  15::bigint,
  'catálogo anterior continua sendo aplicado sem regressão'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','fa130000-0000-4000-8000-000000000001',true);
select is(
  public.is_team_feature_enabled(
    'fa131000-0000-4000-8000-000000000001',
    'professional_scheduling'
  ),
  false,
  'ausência de configuração falha fechada para o owner'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fa130000-0000-4000-8000-000000000002',true);
select throws_ok($$
  select public.set_team_feature_flag(
    'fa131000-0000-4000-8000-000000000001',
    'professional_scheduling',
    true
  )
$$, '42501', null, 'manager não ativa a capacidade futura');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fa130000-0000-4000-8000-000000000001',true);
select lives_ok($$
  select public.set_team_feature_flag(
    'fa131000-0000-4000-8000-000000000001',
    'professional_scheduling',
    true
  )
$$, 'owner pode ativar a capacidade no piloto explícito');
select is(
  public.is_team_feature_enabled(
    'fa131000-0000-4000-8000-000000000001',
    'professional_scheduling'
  ),
  true,
  'owner lê a capacidade ativa do próprio time'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fa130000-0000-4000-8000-000000000003',true);
select is(
  public.is_team_feature_enabled(
    'fa131000-0000-4000-8000-000000000001',
    'professional_scheduling'
  ),
  false,
  'owner de outro tenant não observa a ativação'
);
select is(
  (select count(*) from public.team_feature_flags
   where feature = 'professional_scheduling'),
  0::bigint,
  'RLS não expõe a linha da capacidade de outro tenant'
);
reset role;

select * from finish();
rollback;
