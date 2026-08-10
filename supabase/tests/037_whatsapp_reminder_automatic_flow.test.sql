begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(30);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', 'd9100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'automatic-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd9100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'automatic-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');

insert into public.teams (id, name, slug, timezone, created_by)
values
  ('d9200000-0000-4000-8000-000000000001', 'Automático A', 'automatico-a', 'America/Sao_Paulo', 'd9100000-0000-4000-8000-000000000001'),
  ('d9200000-0000-4000-8000-000000000002', 'Automático B', 'automatico-b', 'America/Recife', 'd9100000-0000-4000-8000-000000000002');

insert into public.events (
  id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, created_by
)
values
  ('d9300000-0000-4000-8000-000000000001', 'd9200000-0000-4000-8000-000000000001', 'Automático normal', 'weekly_match', 'split_teams', 'society', now() + interval '4 days', now() + interval '4 days 90 minutes', now() + interval '3 days', 'scheduled', 'd9100000-0000-4000-8000-000000000001'),
  ('d9300000-0000-4000-8000-000000000002', 'd9200000-0000-4000-8000-000000000001', 'Automático vazio', 'weekly_match', 'split_teams', 'society', now() + interval '5 days', now() + interval '5 days 90 minutes', now() + interval '4 days', 'scheduled', 'd9100000-0000-4000-8000-000000000001'),
  ('d9300000-0000-4000-8000-000000000003', 'd9200000-0000-4000-8000-000000000001', 'Automático atrasado', 'weekly_match', 'split_teams', 'society', now() + interval '4 days', now() + interval '4 days 90 minutes', now() + interval '3 days', 'scheduled', 'd9100000-0000-4000-8000-000000000001'),
  ('d9300000-0000-4000-8000-000000000004', 'd9200000-0000-4000-8000-000000000001', 'Automático prazo', 'weekly_match', 'split_teams', 'society', now() + interval '4 days', now() + interval '4 days 90 minutes', now() - interval '1 hour', 'scheduled', 'd9100000-0000-4000-8000-000000000001'),
  ('d9300000-0000-4000-8000-000000000005', 'd9200000-0000-4000-8000-000000000001', 'Automático duas cotas', 'weekly_match', 'split_teams', 'society', now() + interval '4 days', now() + interval '4 days 90 minutes', now() + interval '3 days', 'scheduled', 'd9100000-0000-4000-8000-000000000001'),
  ('d9300000-0000-4000-8000-000000000006', 'd9200000-0000-4000-8000-000000000002', 'Feature desligada', 'weekly_match', 'split_teams', 'society', now() + interval '4 days', now() + interval '4 days 90 minutes', now() + interval '3 days', 'scheduled', 'd9100000-0000-4000-8000-000000000002');

insert into public.athletes (id, team_id, full_name, preferred_name, status, created_by)
values
  ('d9400000-0000-4000-8000-000000000001', 'd9200000-0000-4000-8000-000000000001', 'Pendente automático', 'Pendente', 'active', 'd9100000-0000-4000-8000-000000000001'),
  ('d9400000-0000-4000-8000-000000000002', 'd9200000-0000-4000-8000-000000000001', 'Respondido automático', 'Respondido', 'active', 'd9100000-0000-4000-8000-000000000001'),
  ('d9400000-0000-4000-8000-000000000003', 'd9200000-0000-4000-8000-000000000001', 'Sem consentimento automático', 'Sem consentimento', 'active', 'd9100000-0000-4000-8000-000000000001');

insert into public.athlete_private (athlete_id, team_id, phone_e164, privacy_terms_version, privacy_terms_accepted_at)
values
  ('d9400000-0000-4000-8000-000000000001', 'd9200000-0000-4000-8000-000000000001', '+5511999999201', 'v1', now()),
  ('d9400000-0000-4000-8000-000000000002', 'd9200000-0000-4000-8000-000000000001', '+5511999999202', 'v1', now()),
  ('d9400000-0000-4000-8000-000000000003', 'd9200000-0000-4000-8000-000000000001', '+5511999999203', 'v1', now());

insert into public.communication_consents (athlete_id, team_id, channel, status, evidence, granted_at)
values
  ('d9400000-0000-4000-8000-000000000001', 'd9200000-0000-4000-8000-000000000001', 'whatsapp', 'granted', 'teste automático', now()),
  ('d9400000-0000-4000-8000-000000000002', 'd9200000-0000-4000-8000-000000000001', 'whatsapp', 'granted', 'teste automático', now());

insert into public.event_attendance (event_id, team_id, athlete_id, status)
values
  ('d9300000-0000-4000-8000-000000000001', 'd9200000-0000-4000-8000-000000000001', 'd9400000-0000-4000-8000-000000000001', 'pending'),
  ('d9300000-0000-4000-8000-000000000001', 'd9200000-0000-4000-8000-000000000001', 'd9400000-0000-4000-8000-000000000002', 'confirmed'),
  ('d9300000-0000-4000-8000-000000000001', 'd9200000-0000-4000-8000-000000000001', 'd9400000-0000-4000-8000-000000000003', 'pending'),
  ('d9300000-0000-4000-8000-000000000003', 'd9200000-0000-4000-8000-000000000001', 'd9400000-0000-4000-8000-000000000001', 'pending'),
  ('d9300000-0000-4000-8000-000000000004', 'd9200000-0000-4000-8000-000000000001', 'd9400000-0000-4000-8000-000000000001', 'pending'),
  ('d9300000-0000-4000-8000-000000000005', 'd9200000-0000-4000-8000-000000000001', 'd9400000-0000-4000-8000-000000000001', 'pending');

insert into public.team_feature_flags (team_id, feature, enabled, updated_by)
values
  ('d9200000-0000-4000-8000-000000000001', 'whatsapp_delivery', true, 'd9100000-0000-4000-8000-000000000001'),
  ('d9200000-0000-4000-8000-000000000001', 'whatsapp_reminders', true, 'd9100000-0000-4000-8000-000000000001');

select ok(not has_function_privilege('anon', 'public.produce_due_event_whatsapp_reminders(integer)', 'EXECUTE'), 'anon não executa produtor');
select ok(not has_function_privilege('authenticated', 'public.produce_due_event_whatsapp_reminders(integer)', 'EXECUTE'), 'cliente autenticado não executa produtor');
select ok(has_function_privilege('service_role', 'public.produce_due_event_whatsapp_reminders(integer)', 'EXECUTE'), 'somente worker executa produtor');
select has_trigger('public', 'notification_outbox', 'reminder_outbox_attach_timezone', 'outbox possui trigger de fuso');

set local role service_role;
select is((select scanned_slots from public.produce_due_event_whatsapp_reminders(25)), 0, 'kill switch desligado não examina cotas');
select throws_ok($$select public.produce_due_event_whatsapp_reminders(101)$$, '22023', null, 'limite inválido falha fechado');
reset role;

update public.runtime_controls set enabled = true where control = 'integration_produce';
update public.event_whatsapp_reminder_slots
set scheduled_for = now() - interval '1 hour', status = 'scheduled', consumed_at = null, status_reason = null
where event_id = 'd9300000-0000-4000-8000-000000000001' and slot_key = 'reminder_1';

set local role service_role;
select is((select enqueued_slots from public.produce_due_event_whatsapp_reminders(25)), 1, 'cota devida é enfileirada automaticamente');
reset role;
select is((select count(*) from public.notification_outbox where event_id = 'd9300000-0000-4000-8000-000000000001'), 1::bigint, 'somente um pendente elegível entra no outbox');
select is((select athlete_id from public.notification_outbox where event_id = 'd9300000-0000-4000-8000-000000000001'), 'd9400000-0000-4000-8000-000000000001'::uuid, 'respondido e sem consentimento ficam fora');
select is((select template_version from public.notification_outbox where event_id = 'd9300000-0000-4000-8000-000000000001'), 'first_card_v2', 'primeira cota escolhe primeiro lembrete');
select is((select payload ->> 'event_timezone' from public.notification_outbox where event_id = 'd9300000-0000-4000-8000-000000000001'), 'America/Sao_Paulo', 'payload recebe fuso sem expor PII');
select is((select triggered_manually from public.event_whatsapp_reminder_slots where event_id = 'd9300000-0000-4000-8000-000000000001' and slot_key = 'reminder_1'), false, 'cota registra origem automática');

set local role service_role;
select is((select scanned_slots from public.produce_due_event_whatsapp_reminders(25)), 0, 'reexecução sem nova cota devida é inerte');
reset role;

update public.event_whatsapp_reminder_slots
set scheduled_for = now() - interval '30 minutes'
where event_id = 'd9300000-0000-4000-8000-000000000001' and slot_key = 'reminder_2';
set local role service_role;
select lives_ok($$select public.produce_due_event_whatsapp_reminders(25)$$, 'segunda cota pode vencer em execução posterior');
reset role;
select is((select count(*) from public.notification_outbox where event_id = 'd9300000-0000-4000-8000-000000000001'), 2::bigint, 'evento nunca ultrapassa as duas cotas');
select is((select count(*) from public.notification_outbox where event_id = 'd9300000-0000-4000-8000-000000000001' and template_version = 'last_card_v2'), 1::bigint, 'segunda cota escolhe última chamada');

update public.event_whatsapp_reminder_slots
set scheduled_for = now() - interval '1 hour'
where event_id = 'd9300000-0000-4000-8000-000000000002' and slot_key = 'reminder_1';
set local role service_role;
select is((select empty_slots from public.produce_due_event_whatsapp_reminders(25)), 1, 'automático vazio é contabilizado');
reset role;
select is((select status_reason from public.event_whatsapp_reminder_slots where event_id = 'd9300000-0000-4000-8000-000000000002' and slot_key = 'reminder_1'), 'automatic_empty', 'automático vazio consome como skipped');
select is((select count(*) from public.notification_outbox where event_id = 'd9300000-0000-4000-8000-000000000002'), 0::bigint, 'automático vazio não cria efeito');

update public.event_whatsapp_reminder_slots
set scheduled_for = now() - interval '7 hours'
where event_id = 'd9300000-0000-4000-8000-000000000003' and slot_key = 'reminder_1';
set local role service_role;
select lives_ok($$select public.produce_due_event_whatsapp_reminders(25)$$, 'produtor encerra cota muito atrasada');
reset role;
select is((select status_reason from public.event_whatsapp_reminder_slots where event_id = 'd9300000-0000-4000-8000-000000000003' and slot_key = 'reminder_1'), 'automatic_window_expired', 'atraso acima de seis horas expira');

update public.event_whatsapp_reminder_slots
set scheduled_for = now() - interval '30 minutes', status = 'scheduled', consumed_at = null, status_reason = null
where event_id = 'd9300000-0000-4000-8000-000000000004' and slot_key = 'reminder_1';
set local role service_role;
select lives_ok($$select public.produce_due_event_whatsapp_reminders(25)$$, 'produtor encerra cota depois do prazo');
reset role;
select is((select status_reason from public.event_whatsapp_reminder_slots where event_id = 'd9300000-0000-4000-8000-000000000004' and slot_key = 'reminder_1'), 'deadline_closed', 'prazo fechado não envia');

update public.event_whatsapp_reminder_slots
set scheduled_for = case slot_key when 'reminder_1' then now() - interval '1 hour' else now() - interval '30 minutes' end
where event_id = 'd9300000-0000-4000-8000-000000000005';
set local role service_role;
select is((select scanned_slots from public.produce_due_event_whatsapp_reminders(25)), 1, 'uma execução examina somente uma cota por evento');
reset role;
select is((select count(*) from public.event_whatsapp_reminder_slots where event_id = 'd9300000-0000-4000-8000-000000000005' and status = 'scheduled'), 1::bigint, 'segunda cota aguarda próxima execução');
set local role service_role;
select lives_ok($$select public.produce_due_event_whatsapp_reminders(25)$$, 'próxima execução consome a segunda cota');
reset role;
select is((select count(*) from public.notification_outbox where event_id = 'd9300000-0000-4000-8000-000000000005'), 2::bigint, 'as duas execuções mantêm dedupe por atleta e cota');

update public.event_whatsapp_reminder_slots
set scheduled_for = now() - interval '30 minutes'
where event_id = 'd9300000-0000-4000-8000-000000000006' and slot_key = 'reminder_1';
set local role service_role;
select is((select scanned_slots from public.produce_due_event_whatsapp_reminders(25)), 0, 'time sem feature permanece fora do produtor');
reset role;
select is((select status from public.event_whatsapp_reminder_slots where event_id = 'd9300000-0000-4000-8000-000000000006' and slot_key = 'reminder_1'), 'scheduled'::public.event_reminder_slot_status, 'feature desligada preserva a cota');
select is((select count(*) from public.audit_logs where action like 'whatsapp.reminder.automatic_%' and metadata::text like '%+55%'), 0::bigint, 'auditoria automática permanece sem telefone');

select * from finish();
rollback;
