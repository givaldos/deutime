begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(15);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  'fa100000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'delivery-removal@example.test', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
);

insert into public.teams (id, name, slug, created_by)
values (
  'fa200000-0000-4000-8000-000000000001',
  'Histórico de Entrega', 'historico-entrega',
  'fa100000-0000-4000-8000-000000000001'
);

insert into public.athletes (
  id, team_id, full_name, preferred_name, status, created_by
)
values
  (
    'fa300000-0000-4000-8000-000000000001',
    'fa200000-0000-4000-8000-000000000001',
    'Atleta com entrega', 'Entrega', 'active',
    'fa100000-0000-4000-8000-000000000001'
  ),
  (
    'fa300000-0000-4000-8000-000000000002',
    'fa200000-0000-4000-8000-000000000001',
    'Atleta sem histórico', 'Sem histórico', 'active',
    'fa100000-0000-4000-8000-000000000001'
  );

insert into public.athlete_private (
  athlete_id, team_id, phone_e164, privacy_terms_accepted_at
)
values (
  'fa300000-0000-4000-8000-000000000001',
  'fa200000-0000-4000-8000-000000000001',
  '+5511992362273', now()
);

insert into public.events (
  id, public_id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, schedule_version, created_by
)
values (
  'fa400000-0000-4000-8000-000000000001',
  'fa410000-0000-4000-8000-000000000001',
  'fa200000-0000-4000-8000-000000000001',
  'Evento futuro', 'weekly_match', 'single_squad', 'society',
  now() + interval '2 days', now() + interval '2 days 90 minutes',
  now() + interval '1 day', 'scheduled', 1,
  'fa100000-0000-4000-8000-000000000001'
);

insert into public.event_attendance (
  event_id, team_id, athlete_id, status, source
)
values (
  'fa400000-0000-4000-8000-000000000001',
  'fa200000-0000-4000-8000-000000000001',
  'fa300000-0000-4000-8000-000000000001',
  'pending', 'admin'
);

insert into public.communication_consents (
  athlete_id, team_id, channel, status, evidence, granted_at
)
values (
  'fa300000-0000-4000-8000-000000000001',
  'fa200000-0000-4000-8000-000000000001',
  'whatsapp', 'granted', 'teste de remoção', now()
);

insert into public.notification_outbox (
  id, team_id, event_id, athlete_id, channel, template_key,
  template_version, intent_version, requested_by, recipient, payload,
  status, attempts, lease_token, lease_expires_at, effect_started_at,
  failure_class, provider_message_id, processed_at, dedupe_key
)
values
  (
    'fa500000-0000-4000-8000-000000000001',
    'fa200000-0000-4000-8000-000000000001',
    'fa400000-0000-4000-8000-000000000001',
    'fa300000-0000-4000-8000-000000000001',
    'whatsapp', 'event_call', 'v1', 1,
    'fa100000-0000-4000-8000-000000000001',
    '+5511992362273', '{}'::jsonb, 'pending', 0,
    null, null, null, null, null, null, 'removal:pending'
  ),
  (
    'fa500000-0000-4000-8000-000000000002',
    'fa200000-0000-4000-8000-000000000001',
    'fa400000-0000-4000-8000-000000000001',
    'fa300000-0000-4000-8000-000000000001',
    'whatsapp', 'event_call', 'v1', 1,
    'fa100000-0000-4000-8000-000000000001',
    '+5511992362273', '{}'::jsonb, 'failed', 1,
    null, null, null, 'transient', null, null, 'removal:failed'
  ),
  (
    'fa500000-0000-4000-8000-000000000003',
    'fa200000-0000-4000-8000-000000000001',
    'fa400000-0000-4000-8000-000000000001',
    'fa300000-0000-4000-8000-000000000001',
    'whatsapp', 'event_call', 'v1', 1,
    'fa100000-0000-4000-8000-000000000001',
    '+5511992362273', '{}'::jsonb, 'processing', 1,
    'fa600000-0000-4000-8000-000000000003', now() + interval '1 minute',
    null, null, null, null, 'removal:processing-safe'
  ),
  (
    'fa500000-0000-4000-8000-000000000004',
    'fa200000-0000-4000-8000-000000000001',
    'fa400000-0000-4000-8000-000000000001',
    'fa300000-0000-4000-8000-000000000001',
    'whatsapp', 'event_call', 'v1', 1,
    'fa100000-0000-4000-8000-000000000001',
    '+5511992362273', '{}'::jsonb, 'processing', 1,
    'fa600000-0000-4000-8000-000000000004', now() + interval '1 minute',
    now(), null, null, null, 'removal:processing-effect'
  ),
  (
    'fa500000-0000-4000-8000-000000000005',
    'fa200000-0000-4000-8000-000000000001',
    'fa400000-0000-4000-8000-000000000001',
    'fa300000-0000-4000-8000-000000000001',
    'whatsapp', 'event_call', 'v1', 1,
    'fa100000-0000-4000-8000-000000000001',
    '+5511992362273', '{}'::jsonb, 'sent', 1,
    null, null, now(), null,
    'MM11111111111111111111111111111111', now(), 'removal:sent'
  );

insert into public.notification_delivery_attempts (
  id, outbox_id, team_id, attempt_number, callback_token_hash,
  provider_message_id, delivery_status
)
values (
  'fa700000-0000-4000-8000-000000000001',
  'fa500000-0000-4000-8000-000000000004',
  'fa200000-0000-4000-8000-000000000001', 1,
  decode(repeat('ab', 32), 'hex'),
  'MM22222222222222222222222222222222', 'accepted'
);

insert into public.notification_delivery_events (
  attempt_id, outbox_id, team_id, delivery_status, provider_message_id
)
values (
  'fa700000-0000-4000-8000-000000000001',
  'fa500000-0000-4000-8000-000000000004',
  'fa200000-0000-4000-8000-000000000001',
  'accepted', 'MM22222222222222222222222222222222'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'fa100000-0000-4000-8000-000000000001',
  true
);

select is(
  (
    select removal_outcome
    from public.remove_athlete_from_team(
      'fa300000-0000-4000-8000-000000000001'
    )
  ),
  'archived',
  'histórico de entrega transforma a remoção física em arquivamento'
);

reset role;

select ok(
  (
    select status = 'inactive' and removed_at is not null
    from public.athletes
    where id = 'fa300000-0000-4000-8000-000000000001'
  ),
  'vínculo com histórico permanece arquivado e inativo'
);
select is(
  (
    select count(*)
    from public.notification_outbox
    where athlete_id = 'fa300000-0000-4000-8000-000000000001'
  ),
  5::bigint,
  'remoção não apaga nenhuma intenção histórica'
);
select is(
  (
    select string_agg(status::text, '|' order by id)
    from public.notification_outbox
    where athlete_id = 'fa300000-0000-4000-8000-000000000001'
  ),
  'cancelled|cancelled|cancelled|processing|sent',
  'somente intenções anteriores à barreira são canceladas'
);
select is(
  (
    select count(*)
    from public.notification_outbox
    where athlete_id = 'fa300000-0000-4000-8000-000000000001'
      and status = 'cancelled'
      and lease_token is null
      and lease_expires_at is null
      and effect_started_at is null
      and requires_review is false
  ),
  3::bigint,
  'cancelamento seguro limpa leases e revisão sem criar efeito'
);
select ok(
  (
    select status = 'processing' and effect_started_at is not null
    from public.notification_outbox
    where id = 'fa500000-0000-4000-8000-000000000004'
  ),
  'efeito externo iniciado permanece intacto para reconciliação'
);
select is(
  (
    select status
    from public.notification_outbox
    where id = 'fa500000-0000-4000-8000-000000000005'
  ),
  'sent'::public.message_status,
  'envio concluído permanece no histórico'
);
select is(
  (
    select count(*)
    from public.notification_delivery_attempts
    where outbox_id = 'fa500000-0000-4000-8000-000000000004'
  ),
  1::bigint,
  'tentativa iniciada não é apagada em cascata'
);
select is(
  (
    select count(*)
    from public.notification_delivery_events
    where outbox_id = 'fa500000-0000-4000-8000-000000000004'
  ),
  1::bigint,
  'evento do provedor não é apagado em cascata'
);
select is(
  (
    select count(*)
    from public.event_attendance
    where athlete_id = 'fa300000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'remoção elimina a participação esportiva futura'
);
select is(
  (
    select count(*)
    from public.athlete_private
    where athlete_id = 'fa300000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'remoção continua eliminando os dados privados correntes'
);
select is(
  (
    select count(*)
    from public.communication_consents
    where athlete_id = 'fa300000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'remoção elimina o consentimento corrente'
);

set local role service_role;
select public.set_runtime_control('integration_consume', true);
select is(
  (select count(*) from public.claim_notification_batch(10, 60)),
  0::bigint,
  'nenhuma intenção incompatível volta à fila após a remoção'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'fa100000-0000-4000-8000-000000000001',
  true
);
select is(
  (
    select removal_outcome
    from public.remove_athlete_from_team(
      'fa300000-0000-4000-8000-000000000002'
    )
  ),
  'deleted',
  'vínculo sem histórico continua elegível para exclusão física'
);

reset role;
select is(
  (
    select count(*)
    from public.athletes
    where id = 'fa300000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'exclusão física sem histórico permanece compatível'
);

select * from finish();
rollback;
