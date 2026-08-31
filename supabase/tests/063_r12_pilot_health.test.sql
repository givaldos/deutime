begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(20);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','f3100000-0000-4000-8000-000000000001','authenticated','authenticated','r12-pilot-owner@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f3100000-0000-4000-8000-000000000002','authenticated','authenticated','r12-pilot-closure@example.test','',now(),'{}','{}',now(),now(),'','','','');

select has_function(
  'public', 'get_r12_pilot_health', array['uuid'],
  'sonda agregada da R12 existe'
);
select ok(has_function_privilege(
  'service_role', 'public.get_r12_pilot_health(uuid)', 'execute'
), 'service role pode executar a sonda');
select ok(not has_function_privilege(
  'authenticated', 'public.get_r12_pilot_health(uuid)', 'execute'
), 'usuário autenticado não executa a sonda');
select ok(not has_function_privilege(
  'anon', 'public.get_r12_pilot_health(uuid)', 'execute'
), 'anônimo não executa a sonda');

update private.product_rollout_state set enabled = true where singleton;
insert into public.teams (id, name, slug, created_by) values (
  'f3110000-0000-4000-8000-000000000001',
  'Piloto R12',
  'piloto-r12',
  'f3100000-0000-4000-8000-000000000001'
);

select is((
  select count(*) from public.team_feature_flags
  where team_id = 'f3110000-0000-4000-8000-000000000001' and enabled
), 15::bigint, 'time novo herda somente o catálogo global já validado');
select is((select account_autonomy_enabled from public.get_r12_pilot_health(
  'f3110000-0000-4000-8000-000000000001'
)), false, 'autonomia futura não herda rollout global anterior');
select is((select registration_email_alerts_enabled from public.get_r12_pilot_health(
  'f3110000-0000-4000-8000-000000000001'
)), false, 'produção de aviso não herda rollout global anterior');
select is((select registration_email_delivery_enabled from public.get_r12_pilot_health(
  'f3110000-0000-4000-8000-000000000001'
)), false, 'consumo de aviso não herda rollout global anterior');
select is((select count(*) from public.get_r12_pilot_health(
  'f3110000-0000-4000-8000-000000000099'
)), 0::bigint, 'sonda não inventa coorte ausente');

select public.set_runtime_control('account_autonomy', true);
select public.set_runtime_control('registration_email_alerts', true);
select public.set_runtime_control('registration_email_delivery', true);

insert into public.account_closure_requests (request_id, user_id)
values ('f3120000-0000-4000-8000-000000000001','f3100000-0000-4000-8000-000000000002');
insert into private.team_closure_storage_jobs (request_id, team_id)
values ('f3120000-0000-4000-8000-000000000002','f3110000-0000-4000-8000-000000000001');
insert into private.registration_email_events (event_id, team_id, registration_id)
values (
  'f3130000-0000-4000-8000-000000000001',
  'f3110000-0000-4000-8000-000000000001',
  'f3140000-0000-4000-8000-000000000001'
);
insert into private.registration_email_outbox (
  outbox_id, event_id, team_id, registration_id, recipient_user_id
) values (
  'f3150000-0000-4000-8000-000000000001',
  'f3130000-0000-4000-8000-000000000001',
  'f3110000-0000-4000-8000-000000000001',
  'f3140000-0000-4000-8000-000000000001',
  'f3100000-0000-4000-8000-000000000001'
);
insert into public.audit_logs (team_id, actor_id, action, entity_type, entity_id, metadata)
values
  ('f3110000-0000-4000-8000-000000000001',null,'account_relationship.left','account_relationship','redacted','{"result":"pilot"}'),
  ('f3110000-0000-4000-8000-000000000001',null,'registration_email.queued','registration_email_event','redacted','{"result":"pilot"}');

select ok((select account_autonomy_enabled from public.get_r12_pilot_health(
  'f3110000-0000-4000-8000-000000000001'
)), 'sonda observa autonomia ativa');
select ok((select registration_email_alerts_enabled from public.get_r12_pilot_health(
  'f3110000-0000-4000-8000-000000000001'
)), 'sonda observa produção de aviso ativa');
select ok((select registration_email_delivery_enabled from public.get_r12_pilot_health(
  'f3110000-0000-4000-8000-000000000001'
)), 'sonda observa consumo de aviso ativo');
select is((select pending_account_closures from public.get_r12_pilot_health(
  'f3110000-0000-4000-8000-000000000001'
)), 1::bigint, 'sonda agrega encerramentos pendentes sem identidade');
select is((select pending_team_storage_jobs from public.get_r12_pilot_health(
  'f3110000-0000-4000-8000-000000000001'
)), 1::bigint, 'sonda agrega limpeza do time piloto');
select is((select pending_email_events from public.get_r12_pilot_health(
  'f3110000-0000-4000-8000-000000000001'
)), 1::bigint, 'sonda agrega eventos de e-mail do piloto');
select is((select pending_email_deliveries from public.get_r12_pilot_health(
  'f3110000-0000-4000-8000-000000000001'
)), 1::bigint, 'sonda agrega entregas de e-mail do piloto');
select is((select lifecycle_commands_24h from public.get_r12_pilot_health(
  'f3110000-0000-4000-8000-000000000001'
)), 1::bigint, 'sonda conta comandos recentes do ciclo de vida');
select is((select registration_email_commands_24h from public.get_r12_pilot_health(
  'f3110000-0000-4000-8000-000000000001'
)), 1::bigint, 'sonda conta comandos recentes de aviso');
select ok((select last_control_change_at is not null from public.get_r12_pilot_health(
  'f3110000-0000-4000-8000-000000000001'
)), 'sonda informa horário agregado da última alternância');

select public.set_runtime_control('registration_email_delivery', false);
select public.set_runtime_control('registration_email_alerts', false);
select public.set_runtime_control('account_autonomy', false);
select results_eq(
  $$select account_autonomy_enabled, registration_email_alerts_enabled,
      registration_email_delivery_enabled, pending_email_events
    from public.get_r12_pilot_health('f3110000-0000-4000-8000-000000000001')$$,
  $$values (false, false, false, 1::bigint)$$,
  'rollback fecha efeitos e preserva o evento operacional'
);

select * from finish();
rollback;
