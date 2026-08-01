begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  'f8100000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'sandbox-card@example.test', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
);

insert into public.teams (id, name, slug, created_by)
values (
  'f8200000-0000-4000-8000-000000000001',
  'Sandbox Card', 'sandbox-card',
  'f8100000-0000-4000-8000-000000000001'
);

insert into public.athletes (id, team_id, full_name, status, created_by)
values (
  'f8300000-0000-4000-8000-000000000001',
  'f8200000-0000-4000-8000-000000000001',
  'Atleta Card', 'active',
  'f8100000-0000-4000-8000-000000000001'
);

insert into public.events (
  id, public_id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, schedule_version, created_by
)
values (
  'f8400000-0000-4000-8000-000000000001',
  'f8500000-0000-4000-8000-000000000001',
  'f8200000-0000-4000-8000-000000000001',
  'Evento Card', 'weekly_match', 'single_squad', 'society',
  now() + interval '2 days', now() + interval '2 days 90 minutes',
  now() + interval '1 day', 'scheduled', 1,
  'f8100000-0000-4000-8000-000000000001'
);

insert into public.notification_outbox (
  id, team_id, event_id, athlete_id, channel, template_key,
  template_version, intent_version, requested_by, recipient, payload,
  dedupe_key
)
values
  (
    'f8600000-0000-4000-8000-000000000001',
    'f8200000-0000-4000-8000-000000000001',
    'f8400000-0000-4000-8000-000000000001',
    'f8300000-0000-4000-8000-000000000001',
    'whatsapp', 'event_call', 'card_v1', 1,
    'f8100000-0000-4000-8000-000000000001',
    '+5511992362273', '{}'::jsonb, 'sandbox-card:allowed'
  ),
  (
    'f8600000-0000-4000-8000-000000000002',
    'f8200000-0000-4000-8000-000000000001',
    'f8400000-0000-4000-8000-000000000001',
    'f8300000-0000-4000-8000-000000000001',
    'whatsapp', 'event_call', 'future_v2', 1,
    'f8100000-0000-4000-8000-000000000001',
    '+5511992362273', '{}'::jsonb, 'sandbox-card:future'
  );

insert into public.team_feature_flags (team_id, feature, enabled, updated_by)
values (
  'f8200000-0000-4000-8000-000000000001',
  'whatsapp_delivery', true,
  'f8100000-0000-4000-8000-000000000001'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.claim_notification_for_sandbox_pilot(uuid,uuid,text,integer)',
    'EXECUTE'
  ),
  'cliente não reivindica card do Sandbox'
);

set local role service_role;
select public.set_runtime_control('integration_consume', true);

select is(
  (
    select count(*)
    from public.claim_notification_for_sandbox_pilot(
      'f8600000-0000-4000-8000-000000000001',
      'f8200000-0000-4000-8000-000000000001',
      '+5511992362273', 60
    )
  ),
  1::bigint,
  'card_v1 é reivindicado pela combinação allowlisted'
);
select is(
  (
    select count(*)
    from public.claim_notification_for_sandbox_pilot(
      'f8600000-0000-4000-8000-000000000002',
      'f8200000-0000-4000-8000-000000000001',
      '+5511992362273', 60
    )
  ),
  0::bigint,
  'versão futura desconhecida continua inerte'
);

reset role;
select is(
  (
    select status
    from public.notification_outbox
    where id = 'f8600000-0000-4000-8000-000000000001'
  ),
  'processing'::public.message_status,
  'card reivindicado cruza somente para processing'
);
select is(
  (
    select status
    from public.notification_outbox
    where id = 'f8600000-0000-4000-8000-000000000002'
  ),
  'pending'::public.message_status,
  'versão desconhecida permanece pendente'
);
select is(
  (
    select attempts
    from public.notification_outbox
    where id = 'f8600000-0000-4000-8000-000000000001'
  ),
  1::smallint,
  'claim do card incrementa uma única tentativa'
);

select * from finish();
rollback;
