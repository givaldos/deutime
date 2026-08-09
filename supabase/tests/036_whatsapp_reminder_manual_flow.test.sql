begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(31);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', 'c9100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner-flow-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c9100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'manager-flow-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c9100000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'owner-flow-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');

insert into public.teams (id, name, slug, created_by)
values
  ('c9200000-0000-4000-8000-000000000001', 'Fluxo A', 'fluxo-a', 'c9100000-0000-4000-8000-000000000001'),
  ('c9200000-0000-4000-8000-000000000002', 'Fluxo B', 'fluxo-b', 'c9100000-0000-4000-8000-000000000003');

insert into public.team_memberships (team_id, user_id, role, status, invited_by)
values ('c9200000-0000-4000-8000-000000000001', 'c9100000-0000-4000-8000-000000000002', 'manager', 'active', 'c9100000-0000-4000-8000-000000000001');

insert into public.events (
  id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, created_by
)
values
  ('c9300000-0000-4000-8000-000000000001', 'c9200000-0000-4000-8000-000000000001', 'Evento manual', 'weekly_match', 'split_teams', 'society', now() + interval '10 days', now() + interval '10 days 90 minutes', now() + interval '9 days', 'scheduled', 'c9100000-0000-4000-8000-000000000001'),
  ('c9300000-0000-4000-8000-000000000002', 'c9200000-0000-4000-8000-000000000001', 'Evento vazio', 'weekly_match', 'split_teams', 'society', now() + interval '11 days', now() + interval '11 days 90 minutes', now() + interval '10 days', 'scheduled', 'c9100000-0000-4000-8000-000000000001'),
  ('c9300000-0000-4000-8000-000000000003', 'c9200000-0000-4000-8000-000000000001', 'Evento corrida', 'weekly_match', 'split_teams', 'society', now() + interval '12 days', now() + interval '12 days 90 minutes', now() + interval '11 days', 'scheduled', 'c9100000-0000-4000-8000-000000000001'),
  ('c9300000-0000-4000-8000-000000000004', 'c9200000-0000-4000-8000-000000000002', 'Evento B', 'weekly_match', 'split_teams', 'society', now() + interval '10 days', now() + interval '10 days 90 minutes', now() + interval '9 days', 'scheduled', 'c9100000-0000-4000-8000-000000000003');

insert into public.athletes (id, team_id, full_name, preferred_name, status, created_by)
values
  ('c9400000-0000-4000-8000-000000000001', 'c9200000-0000-4000-8000-000000000001', 'Pendente elegível', 'Elegível', 'active', 'c9100000-0000-4000-8000-000000000001'),
  ('c9400000-0000-4000-8000-000000000002', 'c9200000-0000-4000-8000-000000000001', 'Já respondeu', 'Respondido', 'active', 'c9100000-0000-4000-8000-000000000001'),
  ('c9400000-0000-4000-8000-000000000003', 'c9200000-0000-4000-8000-000000000001', 'Sem consentimento', 'Sem consentimento', 'active', 'c9100000-0000-4000-8000-000000000001');

insert into public.athlete_private (athlete_id, team_id, phone_e164, privacy_terms_version, privacy_terms_accepted_at)
values
  ('c9400000-0000-4000-8000-000000000001', 'c9200000-0000-4000-8000-000000000001', '+5511999999101', 'v1', now()),
  ('c9400000-0000-4000-8000-000000000002', 'c9200000-0000-4000-8000-000000000001', '+5511999999102', 'v1', now()),
  ('c9400000-0000-4000-8000-000000000003', 'c9200000-0000-4000-8000-000000000001', '+5511999999103', 'v1', now());

insert into public.communication_consents (athlete_id, team_id, channel, status, evidence, granted_at)
values
  ('c9400000-0000-4000-8000-000000000001', 'c9200000-0000-4000-8000-000000000001', 'whatsapp', 'granted', 'teste manual', now()),
  ('c9400000-0000-4000-8000-000000000002', 'c9200000-0000-4000-8000-000000000001', 'whatsapp', 'granted', 'teste manual', now());

insert into public.event_attendance (event_id, team_id, athlete_id, status)
values
  ('c9300000-0000-4000-8000-000000000001', 'c9200000-0000-4000-8000-000000000001', 'c9400000-0000-4000-8000-000000000001', 'pending'),
  ('c9300000-0000-4000-8000-000000000001', 'c9200000-0000-4000-8000-000000000001', 'c9400000-0000-4000-8000-000000000002', 'confirmed'),
  ('c9300000-0000-4000-8000-000000000001', 'c9200000-0000-4000-8000-000000000001', 'c9400000-0000-4000-8000-000000000003', 'pending'),
  ('c9300000-0000-4000-8000-000000000003', 'c9200000-0000-4000-8000-000000000001', 'c9400000-0000-4000-8000-000000000001', 'pending');

select ok((select relrowsecurity from pg_class where oid = 'public.event_whatsapp_reminder_commands'::regclass), 'comandos usam RLS');
select ok(not has_table_privilege('authenticated', 'public.event_whatsapp_reminder_commands', 'SELECT'), 'cliente não lê comandos internos');
select ok(not has_function_privilege('anon', 'public.enqueue_next_event_whatsapp_reminder(uuid,uuid)', 'EXECUTE'), 'anon não envia lembrete');
select ok(has_function_privilege('authenticated', 'public.enqueue_next_event_whatsapp_reminder(uuid,uuid)', 'EXECUTE'), 'authenticated acessa RPC autorizada');
select ok(has_function_privilege('authenticated', 'public.get_event_whatsapp_reminder_state(uuid)', 'EXECUTE'), 'authenticated acessa projeção agregada');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c9100000-0000-4000-8000-000000000001', true);
select throws_ok($$select public.enqueue_next_event_whatsapp_reminder('c9300000-0000-4000-8000-000000000001', 'c9500000-0000-4000-8000-000000000001')$$, '55000', null, 'feature desligada falha fechada');
select throws_ok($$select * from public.get_event_whatsapp_reminder_state('c9300000-0000-4000-8000-000000000001')$$, '42501', null, 'projeção também falha fechada');

reset role;
insert into public.team_feature_flags (team_id, feature, enabled, updated_by)
values
  ('c9200000-0000-4000-8000-000000000001', 'whatsapp_delivery', true, 'c9100000-0000-4000-8000-000000000001'),
  ('c9200000-0000-4000-8000-000000000001', 'whatsapp_reminders', true, 'c9100000-0000-4000-8000-000000000001');
update public.runtime_controls set enabled = true where control in ('integration_produce', 'integration_consume');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c9100000-0000-4000-8000-000000000001', true);
select is((select max(eligible_count) from public.get_event_whatsapp_reminder_state('c9300000-0000-4000-8000-000000000001')), 1, 'prévia inclui somente pendente elegível');
select is((select count(*) from public.get_event_whatsapp_reminder_state('c9300000-0000-4000-8000-000000000001')), 2::bigint, 'projeção retorna as duas cotas');

select set_config('request.jwt.claim.sub', 'c9100000-0000-4000-8000-000000000002', true);
select throws_ok($$select public.enqueue_next_event_whatsapp_reminder('c9300000-0000-4000-8000-000000000001', 'c9500000-0000-4000-8000-000000000002')$$, '42501', null, 'manager não envia lembrete');

select set_config('request.jwt.claim.sub', 'c9100000-0000-4000-8000-000000000001', true);
select throws_ok($$select public.enqueue_next_event_whatsapp_reminder('c9300000-0000-4000-8000-000000000004', 'c9500000-0000-4000-8000-000000000003')$$, '42501', null, 'owner não envia cross-tenant');
select results_eq($$select (public.enqueue_next_event_whatsapp_reminder('c9300000-0000-4000-8000-000000000001', 'c9500000-0000-4000-8000-000000000004')).slot_key$$, $$values ('reminder_1'::public.event_reminder_slot_key)$$, 'primeiro envio consome reminder_1');

reset role;
select is((select count(*) from public.notification_outbox where event_id = 'c9300000-0000-4000-8000-000000000001'), 1::bigint, 'somente uma mensagem é preparada');
select is((select athlete_id from public.notification_outbox where event_id = 'c9300000-0000-4000-8000-000000000001'), 'c9400000-0000-4000-8000-000000000001'::uuid, 'somente o pendente elegível entra no outbox');
select is((select template_version from public.notification_outbox where event_id = 'c9300000-0000-4000-8000-000000000001'), 'first_card_v2', 'primeira cota escolhe primeiro template');
select ok(not ((select payload from public.notification_outbox where event_id = 'c9300000-0000-4000-8000-000000000001') ? 'phone'), 'payload não expõe telefone');
select is((select status from public.event_whatsapp_reminder_slots where event_id = 'c9300000-0000-4000-8000-000000000001' and slot_key = 'reminder_1'), 'enqueued'::public.event_reminder_slot_status, 'cota consumida vira enqueued');
select is((select status from public.event_whatsapp_reminder_slots where event_id = 'c9300000-0000-4000-8000-000000000001' and slot_key = 'reminder_2'), 'scheduled'::public.event_reminder_slot_status, 'segunda cota permanece agendada');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c9100000-0000-4000-8000-000000000001', true);
select is((select (public.enqueue_next_event_whatsapp_reminder('c9300000-0000-4000-8000-000000000001', 'c9500000-0000-4000-8000-000000000004')).replayed), true, 'mesmo request id retorna replay');
reset role;
select is((select count(*) from public.notification_outbox where event_id = 'c9300000-0000-4000-8000-000000000001'), 1::bigint, 'replay não duplica outbox nem consome segunda cota');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c9100000-0000-4000-8000-000000000001', true);
select results_eq($$select (public.enqueue_next_event_whatsapp_reminder('c9300000-0000-4000-8000-000000000001', 'c9500000-0000-4000-8000-000000000005')).slot_key$$, $$values ('reminder_2'::public.event_reminder_slot_key)$$, 'nova solicitação consome reminder_2');
select throws_ok($$select public.enqueue_next_event_whatsapp_reminder('c9300000-0000-4000-8000-000000000001', 'c9500000-0000-4000-8000-000000000006')$$, '55000', null, 'terceiro lembrete é impossível');
select results_eq($$select (result).eligible_count, (result).inserted_count from (select public.enqueue_next_event_whatsapp_reminder('c9300000-0000-4000-8000-000000000002', 'c9500000-0000-4000-8000-000000000007') result) command$$, $$values (0, 0)$$, 'evento vazio retorna zero sem erro');
reset role;
select is((select count(*) from public.event_whatsapp_reminder_slots where event_id = 'c9300000-0000-4000-8000-000000000002' and status = 'scheduled'), 2::bigint, 'zero destinatários preserva a cota');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c9100000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.enqueue_next_event_whatsapp_reminder('c9300000-0000-4000-8000-000000000003', 'c9500000-0000-4000-8000-000000000008')$$, 'prepara cota para testar resposta concorrente');
reset role;

update public.notification_outbox
set status = 'processing', attempts = 1, lease_token = 'c9600000-0000-4000-8000-000000000001', lease_expires_at = now() + interval '1 minute'
where event_id = 'c9300000-0000-4000-8000-000000000003';
update public.event_attendance
set status = 'confirmed', responded_at = now()
where event_id = 'c9300000-0000-4000-8000-000000000003'
  and athlete_id = 'c9400000-0000-4000-8000-000000000001';
select set_config(
  'test.reminder_outbox_id',
  (select id::text from public.notification_outbox where event_id = 'c9300000-0000-4000-8000-000000000003'),
  true
);

set local role service_role;
select is((select count(*) from public.prepare_whatsapp_dispatch(current_setting('test.reminder_outbox_id')::uuid, 'c9600000-0000-4000-8000-000000000001')), 0::bigint, 'resposta antes do efeito cancela o dispatch');
reset role;
select is((select status from public.notification_outbox where event_id = 'c9300000-0000-4000-8000-000000000003'), 'cancelled'::public.message_status, 'outbox inelegível termina cancelado');
select is((select count(*) from public.notification_delivery_attempts attempt join public.notification_outbox outbox on outbox.id = attempt.outbox_id where outbox.event_id = 'c9300000-0000-4000-8000-000000000003'), 0::bigint, 'nenhuma tentativa externa nasce após a resposta');
select is((select count(*) from public.audit_logs where action = 'whatsapp.reminder.enqueued' and metadata::text like '%+55%'), 0::bigint, 'auditoria agregada não contém telefone');
select is((select sum(outbox_count)::integer from public.get_event_whatsapp_reminder_state('c9300000-0000-4000-8000-000000000001')), 2, 'projeção agrega as duas mensagens sem PII');
select is((select count(*) from public.event_whatsapp_reminder_commands where event_id = 'c9300000-0000-4000-8000-000000000001'), 2::bigint, 'replay não cria comando adicional');

select * from finish();
rollback;
