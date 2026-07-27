begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(23);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'd1000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'owner-r00-a@example.test', '', now(),
    '{}', '{}', now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd1000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'manager-r00@example.test', '', now(),
    '{}', '{}', now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd1000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'owner-r00-b@example.test', '', now(),
    '{}', '{}', now(), now(), '', '', '', ''
  );

insert into public.teams (id, name, slug, created_by)
values
  (
    'd2000000-0000-4000-8000-000000000001',
    'Time local R00',
    'time-local-r00',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd2000000-0000-4000-8000-000000000002',
    'Outro time local R00',
    'outro-time-local-r00',
    'd1000000-0000-4000-8000-000000000003'
  );

insert into public.team_memberships (team_id, user_id, role, status)
values (
  'd2000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000002',
  'manager',
  'active'
);

select is(
  (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  ),
  0::bigint,
  'censo dinâmico: toda tabela pública possui RLS'
);

select is(
  (
    select count(*)
    from information_schema.table_privileges p
    where p.table_schema = 'public'
      and p.grantee = 'anon'
      and p.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ),
  0::bigint,
  'censo dinâmico: anon não possui grants de escrita em tabelas públicas'
);

select is(
  (
    select count(*)
    from information_schema.table_privileges p
    where p.table_schema = 'public'
      and p.table_name in (
        'team_feature_flags',
        'runtime_controls'
      )
      and p.grantee in ('anon', 'authenticated')
      and p.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ),
  0::bigint,
  'tabelas da fundação não expõem escrita direta ao cliente'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.team_feature_flags'::regclass),
  'flags por time usam RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.runtime_controls'::regclass),
  'controles globais usam RLS'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.set_team_feature_flag(uuid,public.feature_key,boolean)',
    'EXECUTE'
  ),
  'anon não altera flags'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.set_runtime_control(public.runtime_control_key,boolean)',
    'EXECUTE'
  ),
  'usuário autenticado não altera kill switch global'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.set_runtime_control(public.runtime_control_key,boolean)',
    'EXECUTE'
  ),
  'somente o papel operacional pode alterar kill switch global'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);

select is(
  public.is_team_feature_enabled(
    'd2000000-0000-4000-8000-000000000001',
    'persistent_event_access'
  ),
  false,
  'capacidade ausente nasce desligada'
);
select is(
  public.delivery_foundation_probe(
    'd2000000-0000-4000-8000-000000000001',
    'persistent_event_access'
  ),
  false,
  'RPC manipulada não aciona capacidade desligada'
);
select lives_ok(
  $$
    select public.set_team_feature_flag(
      'd2000000-0000-4000-8000-000000000001',
      'persistent_event_access',
      true
    )
  $$,
  'owner ativa capacidade do próprio time sem deploy'
);
select is(
  public.delivery_foundation_probe(
    'd2000000-0000-4000-8000-000000000001',
    'persistent_event_access'
  ),
  true,
  'capacidade ativa passa pelo gate server-side'
);
select is(
  public.delivery_foundation_probe(
    'd2000000-0000-4000-8000-000000000002',
    'persistent_event_access'
  ),
  false,
  'gate não atravessa tenant mesmo com team_id manipulado'
);
select is(
  (
    select count(*)
    from public.audit_logs
    where action = 'feature_flag.changed'
      and team_id = 'd2000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'mudança de flag é auditada'
);
select lives_ok(
  $$
    select public.set_team_feature_flag(
      'd2000000-0000-4000-8000-000000000001',
      'persistent_event_access',
      false
    )
  $$,
  'owner desativa capacidade sem deploy'
);
select is(
  public.delivery_foundation_probe(
    'd2000000-0000-4000-8000-000000000001',
    'persistent_event_access'
  ),
  false,
  'desativação tem efeito imediato'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$
    select public.set_team_feature_flag(
      'd2000000-0000-4000-8000-000000000001',
      'persistent_event_access',
      true
    )
  $$,
  '42501',
  null,
  'manager não é operador autorizado de flags'
);
select throws_ok(
  $$
    insert into public.team_feature_flags (
      team_id, feature, enabled, updated_by
    )
    values (
      'd2000000-0000-4000-8000-000000000001',
      'persistent_event_access',
      true,
      'd1000000-0000-4000-8000-000000000002'
    )
  $$,
  '42501',
  null,
  'cliente não contorna a RPC com escrita direta'
);
reset role;
set local role service_role;

select is(
  public.is_runtime_control_enabled('integration_produce'),
  false,
  'produção externa nasce desligada'
);
select is(
  public.is_runtime_control_enabled('integration_consume'),
  false,
  'consumo externo nasce desligado'
);
select lives_ok(
  $$
    select public.set_runtime_control('integration_produce', true)
  $$,
  'operação habilita produção independentemente'
);
select is(
  public.is_runtime_control_enabled('integration_produce'),
  true,
  'produção externa foi habilitada'
);
select is(
  public.is_runtime_control_enabled('integration_consume'),
  false,
  'consumo externo permaneceu desligado'
);

select * from finish();
rollback;
