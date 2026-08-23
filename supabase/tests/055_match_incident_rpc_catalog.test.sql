begin;

select plan(4);

select is(
  (
    select count(*)::integer
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'add_match_incident_as_staff'
  ),
  1,
  'a súmula legada expõe uma única assinatura ao PostgREST'
);

select has_function(
  'public',
  'add_match_incident_as_staff',
  array['uuid', 'public.match_incident_kind', 'uuid', 'uuid', 'integer', 'integer', 'text'],
  'a assinatura canônica da súmula existe'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.add_match_incident_as_staff(uuid,public.match_incident_kind,uuid,uuid,integer,integer,text)',
    'EXECUTE'
  ),
  'authenticated pode executar a RPC guardada'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.add_match_incident_as_staff(uuid,public.match_incident_kind,uuid,uuid,integer,integer,text)',
    'EXECUTE'
  ),
  'anon não pode executar a RPC guardada'
);

select * from finish();

rollback;
