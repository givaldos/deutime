begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(11);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  'e7100000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'sandbox-pilot@example.test', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
);

insert into public.teams (id, name, slug, created_by)
values (
  'e7200000-0000-4000-8000-000000000001',
  'Sandbox Pilot', 'sandbox-pilot',
  'e7100000-0000-4000-8000-000000000001'
);

insert into public.athletes (
  id, team_id, full_name, status, created_by
)
values (
  'e7300000-0000-4000-8000-000000000001',
  'e7200000-0000-4000-8000-000000000001',
  'Atleta Sandbox', 'active',
  'e7100000-0000-4000-8000-000000000001'
);

insert into public.events (
  id, public_id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, schedule_version, created_by
)
values (
  'e7400000-0000-4000-8000-000000000001',
  'e7500000-0000-4000-8000-000000000001',
  'e7200000-0000-4000-8000-000000000001',
  'Evento Sandbox', 'weekly_match', 'single_squad', 'society',
  now() + interval '2 days', now() + interval '2 days 90 minutes',
  now() + interval '1 day', 'scheduled', 1,
  'e7100000-0000-4000-8000-000000000001'
);

insert into public.notification_outbox (
  id, team_id, event_id, athlete_id, channel, template_key,
  template_version, intent_version, requested_by, recipient, payload,
  dedupe_key
)
values
  (
    'e7600000-0000-4000-8000-000000000001',
    'e7200000-0000-4000-8000-000000000001',
    'e7400000-0000-4000-8000-000000000001',
    'e7300000-0000-4000-8000-000000000001',
    'whatsapp', 'event_call', 'v1', 1,
    'e7100000-0000-4000-8000-000000000001',
    '+5511992362273', '{}'::jsonb, 'sandbox-pilot:allowed'
  ),
  (
    'e7600000-0000-4000-8000-000000000002',
    'e7200000-0000-4000-8000-000000000001',
    'e7400000-0000-4000-8000-000000000001',
    'e7300000-0000-4000-8000-000000000001',
    'whatsapp', 'event_call', 'v1', 1,
    'e7100000-0000-4000-8000-000000000001',
    '+5511992362273', '{}'::jsonb, 'sandbox-pilot:untouched'
  );

insert into public.team_feature_flags (team_id, feature, enabled, updated_by)
values (
  'e7200000-0000-4000-8000-000000000001',
  'whatsapp_delivery', true,
  'e7100000-0000-4000-8000-000000000001'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.claim_notification_for_sandbox_pilot(uuid,uuid,text,integer)',
    'EXECUTE'
  ),
  'anon não reivindica intenção do piloto'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.claim_notification_for_sandbox_pilot(uuid,uuid,text,integer)',
    'EXECUTE'
  ),
  'cliente autenticado não reivindica intenção do piloto'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.claim_notification_for_sandbox_pilot(uuid,uuid,text,integer)',
    'EXECUTE'
  ),
  'somente serviço possui o claim do piloto'
);

set local role service_role;
select throws_ok(
  $$
    select * from public.claim_notification_for_sandbox_pilot(
      'e7600000-0000-4000-8000-000000000001',
      'e7200000-0000-4000-8000-000000000001',
      '+5511992362273', 60
    )
  $$,
  '55000',
  null,
  'consumo desligado falha fechado'
);
select public.set_runtime_control('integration_consume', true);

select is(
  (
    select count(*)
    from public.claim_notification_for_sandbox_pilot(
      'e7600000-0000-4000-8000-000000000001',
      'e7200000-0000-4000-8000-000000000001',
      '+5511000000000', 60
    )
  ),
  0::bigint,
  'destinatário fora da allowlist não reivindica'
);
select is(
  (
    select count(*)
    from public.claim_notification_for_sandbox_pilot(
      'e7600000-0000-4000-8000-000000000001',
      'e7200000-0000-4000-8000-000000000002',
      '+5511992362273', 60
    )
  ),
  0::bigint,
  'time divergente não reivindica'
);
select is(
  (
    select count(*)
    from public.claim_notification_for_sandbox_pilot(
      'e7600000-0000-4000-8000-000000000001',
      'e7200000-0000-4000-8000-000000000001',
      '+5511992362273', 60
    )
  ),
  1::bigint,
  'combinação exata reivindica uma única intenção'
);

reset role;
select is(
  (
    select concat_ws(':', status::text, attempts::text, (lease_token is not null)::text)
    from public.notification_outbox
    where id = 'e7600000-0000-4000-8000-000000000001'
  ),
  'processing:1:true',
  'claim exato cria lease e consome uma tentativa'
);
select is(
  (
    select status
    from public.notification_outbox
    where id = 'e7600000-0000-4000-8000-000000000002'
  ),
  'pending'::public.message_status,
  'segunda intenção da fila permanece intocada'
);

set local role service_role;
select is(
  (
    select count(*)
    from public.claim_notification_for_sandbox_pilot(
      'e7600000-0000-4000-8000-000000000001',
      'e7200000-0000-4000-8000-000000000001',
      '+5511992362273', 60
    )
  ),
  0::bigint,
  'replay não reivindica intenção já leased'
);
select throws_ok(
  $$
    select * from public.claim_notification_for_sandbox_pilot(
      'e7600000-0000-4000-8000-000000000002',
      'e7200000-0000-4000-8000-000000000001',
      '+5511992362273', 5
    )
  $$,
  '22023',
  null,
  'lease fora do limite falha fechado'
);

select * from finish();
rollback;
