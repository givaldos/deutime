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
values (
  '00000000-0000-0000-0000-000000000000',
  'd8100000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'callback-attempt@example.test', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
);

insert into public.teams (id, name, slug, created_by)
values (
  'd8200000-0000-4000-8000-000000000001',
  'Callback por tentativa', 'callback-por-tentativa',
  'd8100000-0000-4000-8000-000000000001'
);

insert into public.notification_outbox (
  id, team_id, channel, template_key, template_version, intent_version,
  requested_by, recipient, payload, dedupe_key, status, attempts
)
values (
  'd8300000-0000-4000-8000-000000000001',
  'd8200000-0000-4000-8000-000000000001',
  'whatsapp', 'event_call', 'v1', 1,
  'd8100000-0000-4000-8000-000000000001',
  '+5511999998001', '{}'::jsonb, 'callback-attempt:one', 'processing', 1
);

insert into public.notification_delivery_attempts (
  id, outbox_id, team_id, attempt_number, callback_token_hash,
  delivery_status
)
values (
  'd8400000-0000-4000-8000-000000000001',
  'd8300000-0000-4000-8000-000000000001',
  'd8200000-0000-4000-8000-000000000001',
  1, extensions.digest('callback-attempt-token', 'sha256'), 'prepared'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.record_notification_callback_by_attempt_id(uuid,text,text,text)',
    'EXECUTE'
  ),
  'anon não registra callback por tentativa'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.record_notification_callback_by_attempt_id(uuid,text,text,text)',
    'EXECUTE'
  ),
  'cliente autenticado não registra callback de qualquer time'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.record_notification_callback_by_attempt_id(uuid,text,text,text)',
    'EXECUTE'
  ),
  'somente o webhook server-side recebe o contrato estreito'
);

set local role service_role;
select is(
  public.record_notification_callback_by_attempt_id(
    'd8400000-0000-4000-8000-000000000099',
    'SM0123456789abcdef0123456789abcdef', 'accepted', null
  ),
  false,
  'tentativa desconhecida falha sem revelar dados'
);
select is(
  public.record_notification_callback_by_attempt_id(
    'd8400000-0000-4000-8000-000000000001',
    'SM0123456789abcdef0123456789abcdef', 'accepted', null
  ),
  true,
  'callback antecipado resolve a tentativa pelo UUID'
);

reset role;
update public.notification_outbox
set
  status = 'failed',
  failure_class = 'ambiguous',
  requires_review = true,
  last_error = 'lease_expired_after_effect',
  processed_at = now()
where id = 'd8300000-0000-4000-8000-000000000001';

set local role service_role;
select is(
  public.record_notification_callback_by_attempt_id(
    'd8400000-0000-4000-8000-000000000001',
    'SM0123456789abcdef0123456789abcdef', 'accepted', null
  ),
  true,
  'replay idêntico permanece idempotente'
);

reset role;
select is(
  (
    select concat_ws(
      ':',
      status::text,
      coalesce(failure_class, 'none'),
      requires_review::text,
      coalesce(last_error, 'none')
    )
    from public.notification_outbox
    where id = 'd8300000-0000-4000-8000-000000000001'
  ),
  'sent:none:false:none',
  'replay confirmado reprojeta e libera a quarentena sem retry'
);
select is(
  (
    select count(*)
    from public.notification_delivery_events
    where attempt_id = 'd8400000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'replay não duplica evento'
);

set local role service_role;
select is(
  public.record_notification_callback_by_attempt_id(
    'd8400000-0000-4000-8000-000000000001',
    'SM0123456789abcdef0123456789abcdef', 'delivered', null
  ),
  true,
  'estado avança de forma monotônica'
);
select is(
  public.record_notification_callback_by_attempt_id(
    'd8400000-0000-4000-8000-000000000001',
    'SM0123456789abcdef0123456789abcdef', 'queued', null
  ),
  false,
  'estado fora de ordem não regride a tentativa'
);

reset role;
select is(
  (
    select delivery_status
    from public.notification_delivery_attempts
    where id = 'd8400000-0000-4000-8000-000000000001'
  ),
  'delivered',
  'tentativa conserva o maior estado observado'
);
select is(
  (
    select status
    from public.notification_outbox
    where id = 'd8300000-0000-4000-8000-000000000001'
  ),
  'sent'::public.message_status,
  'outbox é conciliada sem depender do ack anterior'
);

select * from finish();
rollback;
