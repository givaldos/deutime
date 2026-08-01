begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'c5100000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'callback-owner-a@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c5100000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'callback-owner-b@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  );

insert into public.teams (id, name, slug, created_by)
values
  (
    'c5200000-0000-4000-8000-000000000001',
    'Callback A', 'callback-a',
    'c5100000-0000-4000-8000-000000000001'
  ),
  (
    'c5200000-0000-4000-8000-000000000002',
    'Callback B', 'callback-b',
    'c5100000-0000-4000-8000-000000000002'
  );

insert into public.notification_outbox (
  id, team_id, channel, template_key, template_version, intent_version,
  requested_by, recipient, payload, dedupe_key, status, attempts
)
values
  (
    'c5300000-0000-4000-8000-000000000001',
    'c5200000-0000-4000-8000-000000000001',
    'whatsapp', 'event_call', 'v1', 1,
    'c5100000-0000-4000-8000-000000000001',
    '+5511999993001', '{"private":"body-a"}'::jsonb,
    'callback-operation:a', 'sent', 1
  ),
  (
    'c5300000-0000-4000-8000-000000000002',
    'c5200000-0000-4000-8000-000000000002',
    'whatsapp', 'event_call', 'v1', 1,
    'c5100000-0000-4000-8000-000000000002',
    '+5511999993002', '{"private":"body-b"}'::jsonb,
    'callback-operation:b', 'sent', 1
  );

insert into public.notification_delivery_attempts (
  id, outbox_id, team_id, attempt_number, callback_token_hash,
  provider_message_id, delivery_status, provider_error_code
)
values
  (
    'c5400000-0000-4000-8000-000000000001',
    'c5300000-0000-4000-8000-000000000001',
    'c5200000-0000-4000-8000-000000000001',
    1, extensions.digest('callback-a', 'sha256'),
    'SM0123456789abcdef0123456789abcdef', 'delivered', null
  ),
  (
    'c5400000-0000-4000-8000-000000000002',
    'c5300000-0000-4000-8000-000000000002',
    'c5200000-0000-4000-8000-000000000002',
    1, extensions.digest('callback-b', 'sha256'),
    'SMabcdef0123456789abcdef0123456789', 'failed', 'twilio_63016'
  );

select ok(
  not has_function_privilege(
    'anon',
    'public.list_whatsapp_delivery_operation(uuid,integer)',
    'EXECUTE'
  ),
  'anon não consulta a operação'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.list_whatsapp_delivery_operation(uuid,integer)',
    'EXECUTE'
  ),
  'cliente autenticado pode chamar a projeção autorizada'
);
select ok(
  not has_table_privilege(
    'authenticated', 'public.notification_delivery_attempts', 'SELECT'
  ),
  'cliente não lê tentativa bruta'
);
select ok(
  not has_table_privilege(
    'authenticated', 'public.notification_delivery_events', 'SELECT'
  ),
  'cliente não lê evento bruto'
);
select ok(
  position(
    'recipient' in pg_get_function_result(
      'public.list_whatsapp_delivery_operation(uuid,integer)'::regprocedure
    )::text
  ) = 0,
  'contrato não retorna destinatário'
);
select ok(
  position(
    'payload' in pg_get_function_result(
      'public.list_whatsapp_delivery_operation(uuid,integer)'::regprocedure
    )::text
  ) = 0,
  'contrato não retorna corpo'
);
select ok(
  position(
    'provider_message_id' in pg_get_function_result(
      'public.list_whatsapp_delivery_operation(uuid,integer)'::regprocedure
    )::text
  ) = 0,
  'contrato não retorna SID do provedor'
);
select ok(
  position(
    'token' in pg_get_function_result(
      'public.list_whatsapp_delivery_operation(uuid,integer)'::regprocedure
    )::text
  ) = 0,
  'contrato não retorna token'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'c5100000-0000-4000-8000-000000000001',
  true
);
select is(
  (
    select count(*)
    from public.list_whatsapp_delivery_operation(
      'c5200000-0000-4000-8000-000000000001', 50
    )
  ),
  1::bigint,
  'owner enxerga somente a operação do próprio time'
);
select is(
  (
    select delivery_status
    from public.list_whatsapp_delivery_operation(
      'c5200000-0000-4000-8000-000000000001', 50
    )
  ),
  'delivered',
  'projeção expõe o último estado normalizado'
);
select throws_ok(
  $$
    select * from public.list_whatsapp_delivery_operation(
      'c5200000-0000-4000-8000-000000000002', 50
    )
  $$,
  '42501',
  null,
  'owner não consulta operação cross-tenant'
);
select throws_ok(
  $$
    select * from public.list_whatsapp_delivery_operation(
      'c5200000-0000-4000-8000-000000000001', 101
    )
  $$,
  '22023',
  null,
  'limite inválido falha fechado'
);

select * from finish();
rollback;
