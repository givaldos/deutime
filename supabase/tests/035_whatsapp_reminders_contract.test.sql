begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(48);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'b8100000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'owner-reminder-a@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b8100000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'admin-reminder-a@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b8100000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'manager-reminder-a@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b8100000-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'owner-reminder-b@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  );

insert into public.teams (id, name, slug, created_by)
values
  (
    'b8200000-0000-4000-8000-000000000001',
    'Lembretes A', 'lembretes-a',
    'b8100000-0000-4000-8000-000000000001'
  ),
  (
    'b8200000-0000-4000-8000-000000000002',
    'Lembretes B', 'lembretes-b',
    'b8100000-0000-4000-8000-000000000004'
  );

insert into public.team_memberships (team_id, user_id, role, status, invited_by)
values
  (
    'b8200000-0000-4000-8000-000000000001',
    'b8100000-0000-4000-8000-000000000002',
    'admin', 'active', 'b8100000-0000-4000-8000-000000000001'
  ),
  (
    'b8200000-0000-4000-8000-000000000001',
    'b8100000-0000-4000-8000-000000000003',
    'manager', 'active', 'b8100000-0000-4000-8000-000000000001'
  );

insert into public.events (
  id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, created_by
)
values
  (
    'b8300000-0000-4000-8000-000000000001',
    'b8200000-0000-4000-8000-000000000001',
    'Evento com lembretes', 'weekly_match', 'split_teams', 'society',
    now() + interval '10 days', now() + interval '10 days 90 minutes',
    now() + interval '9 days', 'scheduled',
    'b8100000-0000-4000-8000-000000000001'
  ),
  (
    'b8300000-0000-4000-8000-000000000002',
    'b8200000-0000-4000-8000-000000000002',
    'Evento de outro time', 'weekly_match', 'split_teams', 'society',
    now() + interval '11 days', now() + interval '11 days 90 minutes',
    now() + interval '10 days', 'scheduled',
    'b8100000-0000-4000-8000-000000000004'
  );

insert into public.athletes (
  id, team_id, full_name, preferred_name, status, created_by
)
values (
  'b8400000-0000-4000-8000-000000000001',
  'b8200000-0000-4000-8000-000000000001',
  'Atleta do lembrete', 'Lembrete', 'active',
  'b8100000-0000-4000-8000-000000000001'
);

select ok(
  'whatsapp_reminders' = any(enum_range(null::public.feature_key)::text[]),
  'feature flag de lembretes existe'
);
select ok(
  (select relrowsecurity from pg_class
    where oid = 'public.team_whatsapp_reminder_settings'::regclass),
  'configuração do time usa RLS'
);
select ok(
  (select relrowsecurity from pg_class
    where oid = 'public.event_whatsapp_reminder_settings'::regclass),
  'configuração do evento usa RLS'
);
select ok(
  (select relrowsecurity from pg_class
    where oid = 'public.event_whatsapp_reminder_slots'::regclass),
  'cotas usam RLS'
);
select ok(
  not has_table_privilege(
    'anon', 'public.team_whatsapp_reminder_settings', 'SELECT'
  ),
  'anon não lê configuração do time'
);
select ok(
  not has_table_privilege(
    'anon', 'public.event_whatsapp_reminder_settings', 'SELECT'
  ),
  'anon não lê configuração do evento'
);
select ok(
  not has_table_privilege(
    'anon', 'public.event_whatsapp_reminder_slots', 'SELECT'
  ),
  'anon não lê cotas'
);
select ok(
  has_table_privilege(
    'authenticated', 'public.team_whatsapp_reminder_settings', 'SELECT'
  ),
  'authenticated recebe somente leitura protegida por RLS'
);
select ok(
  not has_table_privilege(
    'authenticated', 'public.team_whatsapp_reminder_settings', 'INSERT'
  ),
  'authenticated não insere configuração diretamente'
);
select ok(
  not has_table_privilege(
    'authenticated', 'public.event_whatsapp_reminder_slots', 'UPDATE'
  ),
  'authenticated não altera cota diretamente'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.set_team_whatsapp_reminder_settings(uuid,integer,integer)',
    'EXECUTE'
  ),
  'anon não configura lembretes'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.set_team_whatsapp_reminder_settings(uuid,integer,integer)',
    'EXECUTE'
  ),
  'authenticated acessa RPC autorizada do time'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.set_event_whatsapp_reminder_override(uuid,uuid,integer,integer)',
    'EXECUTE'
  ),
  'authenticated acessa RPC autorizada do evento'
);
select is(
  (
    select count(*)
    from public.team_feature_flags
    where feature = 'whatsapp_reminders'
      and enabled
  ),
  0::bigint,
  'expansão não habilita a feature para nenhum time'
);
select results_eq(
  $$
    select first_offset_minutes, second_offset_minutes
    from public.team_whatsapp_reminder_settings
    where team_id = 'b8200000-0000-4000-8000-000000000001'
  $$,
  $$values (4320, 2880)$$,
  'time nasce com defaults T-72h e T-48h'
);
select results_eq(
  $$
    select first_offset_minutes, second_offset_minutes, is_override
    from public.event_whatsapp_reminder_settings
    where event_id = 'b8300000-0000-4000-8000-000000000001'
  $$,
  $$values (4320, 2880, false)$$,
  'evento copia os defaults efetivos sem override'
);
select is(
  (
    select count(*)
    from public.event_whatsapp_reminder_slots
    where event_id = 'b8300000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'evento possui exatamente duas cotas'
);
select is(
  (
    select template_version
    from public.event_whatsapp_reminder_slots
    where event_id = 'b8300000-0000-4000-8000-000000000001'
      and slot_key = 'reminder_1'
  ),
  'first_card_v2',
  'primeira cota fixa o template de primeiro lembrete'
);
select is(
  (
    select template_version
    from public.event_whatsapp_reminder_slots
    where event_id = 'b8300000-0000-4000-8000-000000000001'
      and slot_key = 'reminder_2'
  ),
  'last_card_v2',
  'segunda cota fixa o template de última chamada'
);
select is(
  (
    select scheduled_for
    from public.event_whatsapp_reminder_slots
    where event_id = 'b8300000-0000-4000-8000-000000000001'
      and slot_key = 'reminder_1'
  ),
  (
    select starts_at - interval '72 hours'
    from public.events
    where id = 'b8300000-0000-4000-8000-000000000001'
  ),
  'primeira cota agenda T-72h'
);
select is(
  (
    select scheduled_for
    from public.event_whatsapp_reminder_slots
    where event_id = 'b8300000-0000-4000-8000-000000000001'
      and slot_key = 'reminder_2'
  ),
  (
    select starts_at - interval '48 hours'
    from public.events
    where id = 'b8300000-0000-4000-8000-000000000001'
  ),
  'segunda cota agenda T-48h'
);

select private.materialize_event_whatsapp_reminders(
  'b8300000-0000-4000-8000-000000000001'
);
select is(
  (
    select count(*)
    from public.event_whatsapp_reminder_slots
    where event_id = 'b8300000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'materialização repetida não cria terceira cota'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'b8100000-0000-4000-8000-000000000001',
  true
);
select is(
  (select count(*) from public.event_whatsapp_reminder_slots),
  2::bigint,
  'owner enxerga somente as cotas do próprio time'
);
select is(
  (
    select count(*)
    from public.event_whatsapp_reminder_slots
    where team_id = 'b8200000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'RLS bloqueia cotas cross-tenant'
);
select lives_ok(
  $$
    select public.set_team_whatsapp_reminder_settings(
      'b8200000-0000-4000-8000-000000000001', 5000, 3000
    )
  $$,
  'owner configura os defaults do time'
);
select results_eq(
  $$
    select first_offset_minutes, second_offset_minutes
    from public.team_whatsapp_reminder_settings
    where team_id = 'b8200000-0000-4000-8000-000000000001'
  $$,
  $$values (5000, 3000)$$,
  'novos defaults são persistidos'
);
select results_eq(
  $$
    select first_offset_minutes, second_offset_minutes
    from public.event_whatsapp_reminder_settings
    where event_id = 'b8300000-0000-4000-8000-000000000001'
  $$,
  $$values (4320, 2880)$$,
  'alterar o time não reescreve evento existente'
);
select throws_ok(
  $$
    select public.set_team_whatsapp_reminder_settings(
      'b8200000-0000-4000-8000-000000000001', 3000, 3000
    )
  $$,
  '22023', null,
  'ordem inválida é rejeitada'
);
select throws_ok(
  $$
    select public.set_team_whatsapp_reminder_settings(
      'b8200000-0000-4000-8000-000000000001', 3000, 1440
    )
  $$,
  '22023', null,
  'lembrete do time não invade o fechamento padrão T-24h'
);

select set_config(
  'request.jwt.claim.sub',
  'b8100000-0000-4000-8000-000000000003',
  true
);
select throws_ok(
  $$
    select public.set_team_whatsapp_reminder_settings(
      'b8200000-0000-4000-8000-000000000001', 5100, 3100
    )
  $$,
  '42501', null,
  'manager não altera configurações'
);

select set_config(
  'request.jwt.claim.sub',
  'b8100000-0000-4000-8000-000000000001',
  true
);
select throws_ok(
  $$
    select public.set_event_whatsapp_reminder_override(
      'b8200000-0000-4000-8000-000000000002',
      'b8300000-0000-4000-8000-000000000002',
      5200, 3200
    )
  $$,
  '42501', null,
  'owner não altera evento cross-tenant'
);
select lives_ok(
  $$
    select public.set_event_whatsapp_reminder_override(
      'b8200000-0000-4000-8000-000000000001',
      'b8300000-0000-4000-8000-000000000001',
      4000, 2500
    )
  $$,
  'owner configura override válido do evento'
);
select results_eq(
  $$
    select first_offset_minutes, second_offset_minutes, is_override
    from public.event_whatsapp_reminder_settings
    where event_id = 'b8300000-0000-4000-8000-000000000001'
  $$,
  $$values (4000, 2500, true)$$,
  'override fica explícito no histórico do evento'
);
select is(
  (
    select scheduled_for
    from public.event_whatsapp_reminder_slots
    where event_id = 'b8300000-0000-4000-8000-000000000001'
      and slot_key = 'reminder_1'
  ),
  (
    select starts_at - interval '4000 minutes'
    from public.events
    where id = 'b8300000-0000-4000-8000-000000000001'
  ),
  'override reagenda somente a cota pendente'
);
select lives_ok(
  $$
    select public.set_event_whatsapp_reminder_override(
      'b8200000-0000-4000-8000-000000000001',
      'b8300000-0000-4000-8000-000000000001',
      null, null
    )
  $$,
  'evento pode voltar a herdar os defaults atuais do time'
);
select results_eq(
  $$
    select first_offset_minutes, second_offset_minutes, is_override
    from public.event_whatsapp_reminder_settings
    where event_id = 'b8300000-0000-4000-8000-000000000001'
  $$,
  $$values (5000, 3000, false)$$,
  'remoção do override copia os defaults atuais sem apagar histórico de cotas'
);
select throws_ok(
  $$
    select public.set_event_whatsapp_reminder_override(
      'b8200000-0000-4000-8000-000000000001',
      'b8300000-0000-4000-8000-000000000001',
      2000, 1000
    )
  $$,
  '22023', null,
  'override não pode disparar depois do prazo de confirmação'
);

reset role;
select throws_ok(
  $$
    insert into public.event_whatsapp_reminder_slots (
      event_id, team_id, slot_key, scheduled_for,
      observed_schedule_version, template_key, template_version
    )
    values (
      'b8300000-0000-4000-8000-000000000001',
      'b8200000-0000-4000-8000-000000000001',
      'reminder_1', now() + interval '1 day', 1,
      'event_reminder', 'first_card_v2'
    )
  $$,
  '23505', null,
  'unicidade vitalícia impede recriar a primeira cota'
);
select is(
  (
    select enabled
    from public.team_feature_flags
    where team_id = 'b8200000-0000-4000-8000-000000000001'
      and feature = 'whatsapp_reminders'
  ),
  null::boolean,
  'feature continua fail-closed sem linha habilitada'
);

insert into public.notification_outbox (
  team_id, event_id, athlete_id, channel, template_key, template_version,
  intent_version, recipient, payload, dedupe_key, reminder_slot_id
)
select
  'b8200000-0000-4000-8000-000000000001',
  'b8300000-0000-4000-8000-000000000001',
  'b8400000-0000-4000-8000-000000000001',
  'whatsapp', 'event_reminder', 'first_card_v2', 1,
  '+5511999999001', '{}'::jsonb, 'reminder-dedupe-1', slot.id
from public.event_whatsapp_reminder_slots slot
where slot.event_id = 'b8300000-0000-4000-8000-000000000001'
  and slot.slot_key = 'reminder_1';
select is(
  (
    select count(*)
    from public.notification_outbox
    where dedupe_key = 'reminder-dedupe-1'
  ),
  1::bigint,
  'primeiro outbox da cota é aceito'
);
select throws_ok(
  $$
    insert into public.notification_outbox (
      team_id, event_id, athlete_id, channel, template_key, template_version,
      intent_version, recipient, payload, dedupe_key, reminder_slot_id
    )
    select
      'b8200000-0000-4000-8000-000000000001',
      'b8300000-0000-4000-8000-000000000001',
      'b8400000-0000-4000-8000-000000000001',
      'whatsapp', 'event_reminder', 'first_card_v2', 1,
      '+5511999999001', '{}'::jsonb, 'reminder-dedupe-2', slot.id
    from public.event_whatsapp_reminder_slots slot
    where slot.event_id = 'b8300000-0000-4000-8000-000000000001'
      and slot.slot_key = 'reminder_1'
  $$,
  '23505', null,
  'mesmo atleta não recebe duas mensagens da mesma cota'
);
select lives_ok(
  $$
    insert into public.notification_outbox (
      team_id, event_id, athlete_id, channel, template_key, template_version,
      intent_version, recipient, payload, dedupe_key, reminder_slot_id
    )
    select
      'b8200000-0000-4000-8000-000000000001',
      'b8300000-0000-4000-8000-000000000001',
      'b8400000-0000-4000-8000-000000000001',
      'whatsapp', 'event_reminder', 'last_card_v2', 1,
      '+5511999999001', '{}'::jsonb, 'reminder-dedupe-3', slot.id
    from public.event_whatsapp_reminder_slots slot
    where slot.event_id = 'b8300000-0000-4000-8000-000000000001'
      and slot.slot_key = 'reminder_2'
  $$,
  'o mesmo atleta pode receber a segunda cota'
);

insert into public.events (
  id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, created_by
)
values (
  'b8300000-0000-4000-8000-000000000003',
  'b8200000-0000-4000-8000-000000000001',
  'Evento após novo padrão', 'weekly_match', 'split_teams', 'society',
  now() + interval '12 days', now() + interval '12 days 90 minutes',
  now() + interval '11 days', 'scheduled',
  'b8100000-0000-4000-8000-000000000001'
);
select results_eq(
  $$
    select count(*), min(first_offset_minutes), min(second_offset_minutes)
    from public.event_whatsapp_reminder_settings settings
    join public.event_whatsapp_reminder_slots slot using (event_id, team_id)
    where settings.event_id = 'b8300000-0000-4000-8000-000000000003'
  $$,
  $$values (2::bigint, 5000, 3000)$$,
  'evento novo herda padrão atual e materializa duas cotas'
);

update public.event_whatsapp_reminder_slots
set status = 'enqueued', consumed_at = now(), status_reason = 'manual_test'
where event_id = 'b8300000-0000-4000-8000-000000000003'
  and slot_key = 'reminder_1';
update public.events
set
  starts_at = starts_at + interval '1 day',
  ends_at = ends_at + interval '1 day',
  attendance_deadline = attendance_deadline + interval '1 day',
  schedule_version = schedule_version + 1
where id = 'b8300000-0000-4000-8000-000000000003';
select is(
  (
    select observed_schedule_version
    from public.event_whatsapp_reminder_slots
    where event_id = 'b8300000-0000-4000-8000-000000000003'
      and slot_key = 'reminder_1'
  ),
  1::bigint,
  'remarcação não reescreve cota já consumida'
);
select is(
  (
    select observed_schedule_version
    from public.event_whatsapp_reminder_slots
    where event_id = 'b8300000-0000-4000-8000-000000000003'
      and slot_key = 'reminder_2'
  ),
  2::bigint,
  'remarcação atualiza a versão da cota pendente'
);
select is(
  (
    select scheduled_for
    from public.event_whatsapp_reminder_slots
    where event_id = 'b8300000-0000-4000-8000-000000000003'
      and slot_key = 'reminder_2'
  ),
  (
    select starts_at - interval '3000 minutes'
    from public.events
    where id = 'b8300000-0000-4000-8000-000000000003'
  ),
  'remarcação recalcula o horário da cota pendente'
);

update public.events
set
  status = 'cancelled',
  cancelled_at = now(),
  cancelled_by = 'b8100000-0000-4000-8000-000000000001',
  schedule_version = schedule_version + 1
where id = 'b8300000-0000-4000-8000-000000000003';
select is(
  (
    select status
    from public.event_whatsapp_reminder_slots
    where event_id = 'b8300000-0000-4000-8000-000000000003'
      and slot_key = 'reminder_2'
  ),
  'cancelled'::public.event_reminder_slot_status,
  'cancelamento consome a cota pendente sem envio'
);
select is(
  (
    select status
    from public.event_whatsapp_reminder_slots
    where event_id = 'b8300000-0000-4000-8000-000000000003'
      and slot_key = 'reminder_1'
  ),
  'enqueued'::public.event_reminder_slot_status,
  'cancelamento preserva estado histórico da cota consumida'
);

select * from finish();
rollback;
