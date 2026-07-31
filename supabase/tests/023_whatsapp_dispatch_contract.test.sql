begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(60);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'a3100000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'owner-wa-a@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a3100000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'owner-wa-b@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  );

insert into public.teams (id, name, slug, created_by)
values
  (
    'a3200000-0000-4000-8000-000000000001',
    'WhatsApp A',
    'whatsapp-a',
    'a3100000-0000-4000-8000-000000000001'
  ),
  (
    'a3200000-0000-4000-8000-000000000002',
    'WhatsApp B',
    'whatsapp-b',
    'a3100000-0000-4000-8000-000000000002'
  );

insert into public.events (
  id, public_id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, schedule_version, created_by
)
values
  (
    'a3300000-0000-4000-8000-000000000001',
    'a3400000-0000-4000-8000-000000000001',
    'a3200000-0000-4000-8000-000000000001',
    'Racha de sexta',
    'weekly_match',
    'split_teams',
    'society',
    now() + interval '2 days',
    now() + interval '2 days 90 minutes',
    now() + interval '1 day',
    'scheduled',
    3,
    'a3100000-0000-4000-8000-000000000001'
  ),
  (
    'a3300000-0000-4000-8000-000000000002',
    'a3400000-0000-4000-8000-000000000002',
    'a3200000-0000-4000-8000-000000000002',
    'Racha de outro time',
    'weekly_match',
    'split_teams',
    'society',
    now() + interval '3 days',
    now() + interval '3 days 90 minutes',
    now() + interval '2 days',
    'scheduled',
    1,
    'a3100000-0000-4000-8000-000000000002'
  );

insert into public.athletes (
  id, team_id, full_name, preferred_name, status, created_by
)
values
  (
    'a3500000-0000-4000-8000-000000000001',
    'a3200000-0000-4000-8000-000000000001',
    'Atleta consentido',
    'Consentido',
    'active',
    'a3100000-0000-4000-8000-000000000001'
  ),
  (
    'a3500000-0000-4000-8000-000000000002',
    'a3200000-0000-4000-8000-000000000001',
    'Atleta sem consentimento',
    'Sem consentimento',
    'active',
    'a3100000-0000-4000-8000-000000000001'
  ),
  (
    'a3500000-0000-4000-8000-000000000003',
    'a3200000-0000-4000-8000-000000000002',
    'Atleta de outro time',
    'Outro time',
    'active',
    'a3100000-0000-4000-8000-000000000002'
  );

insert into public.athlete_private (
  athlete_id, team_id, phone_e164, privacy_terms_version,
  privacy_terms_accepted_at
)
values
  (
    'a3500000-0000-4000-8000-000000000001',
    'a3200000-0000-4000-8000-000000000001',
    '+5511999991001', 'v1', now()
  ),
  (
    'a3500000-0000-4000-8000-000000000002',
    'a3200000-0000-4000-8000-000000000001',
    '+5511999991002', 'v1', now()
  ),
  (
    'a3500000-0000-4000-8000-000000000003',
    'a3200000-0000-4000-8000-000000000002',
    '+5511999991003', 'v1', now()
  );

insert into public.event_attendance (event_id, team_id, athlete_id)
values
  (
    'a3300000-0000-4000-8000-000000000001',
    'a3200000-0000-4000-8000-000000000001',
    'a3500000-0000-4000-8000-000000000001'
  ),
  (
    'a3300000-0000-4000-8000-000000000001',
    'a3200000-0000-4000-8000-000000000001',
    'a3500000-0000-4000-8000-000000000002'
  ),
  (
    'a3300000-0000-4000-8000-000000000002',
    'a3200000-0000-4000-8000-000000000002',
    'a3500000-0000-4000-8000-000000000003'
  );

insert into public.communication_consents (
  athlete_id, team_id, channel, status, evidence, granted_at
)
values
  (
    'a3500000-0000-4000-8000-000000000001',
    'a3200000-0000-4000-8000-000000000001',
    'whatsapp', 'granted', 'teste automatizado R03', now()
  ),
  (
    'a3500000-0000-4000-8000-000000000003',
    'a3200000-0000-4000-8000-000000000002',
    'whatsapp', 'granted', 'teste automatizado R03', now()
  );

insert into public.team_feature_flags (
  team_id, feature, enabled, updated_by
)
values
  (
    'a3200000-0000-4000-8000-000000000001',
    'whatsapp_delivery', true,
    'a3100000-0000-4000-8000-000000000001'
  ),
  (
    'a3200000-0000-4000-8000-000000000002',
    'whatsapp_delivery', true,
    'a3100000-0000-4000-8000-000000000002'
  );

select ok(
  (select relrowsecurity from pg_class
    where oid = 'public.notification_delivery_attempts'::regclass),
  'tentativas usam RLS'
);
select ok(
  (select relrowsecurity from pg_class
    where oid = 'public.notification_delivery_events'::regclass),
  'eventos de entrega usam RLS'
);
select ok(
  not has_table_privilege(
    'anon', 'public.notification_delivery_attempts', 'SELECT'
  ),
  'anon não lê tentativas'
);
select ok(
  not has_table_privilege(
    'authenticated', 'public.notification_delivery_events', 'SELECT'
  ),
  'cliente autenticado não lê eventos internos'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.enqueue_event_whatsapp_call(uuid,text,text)',
    'EXECUTE'
  ),
  'anon não cria chamadas'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.claim_notification_batch(integer,integer)',
    'EXECUTE'
  ),
  'cliente autenticado não reivindica a fila'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.prepare_whatsapp_dispatch(uuid,uuid)',
    'EXECUTE'
  ),
  'worker possui somente a RPC de servidor'
);
select is(
  (select enabled from public.runtime_controls
    where control = 'integration_produce'),
  false,
  'produção continua desligada após a expansão'
);
select is(
  (select enabled from public.runtime_controls
    where control = 'integration_consume'),
  false,
  'consumo continua desligado após a expansão'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'a3100000-0000-4000-8000-000000000001',
  true
);
select throws_ok(
  $$
    select * from public.enqueue_event_whatsapp_call(
      'a3300000-0000-4000-8000-000000000001',
      'event_call',
      'v1'
    )
  $$,
  '55000',
  null,
  'kill switch de produção falha fechado'
);

reset role;
set local role service_role;
select lives_ok(
  $$select public.set_runtime_control('integration_produce', true)$$,
  'operação habilita produção para o teste'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'a3100000-0000-4000-8000-000000000001',
  true
);
select is(
  (
    select count(*)
    from public.enqueue_event_whatsapp_call(
      'a3300000-0000-4000-8000-000000000001',
      'event_call',
      'v1'
    )
    where inserted
  ),
  1::bigint,
  'enqueue inclui somente o atleta ativo, presente e consentido'
);
select is(
  (
    select count(*)
    from public.notification_outbox
    where event_id = 'a3300000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'nenhuma intenção nasce para atleta sem consentimento'
);
select is(
  (
    select count(*)
    from public.enqueue_event_whatsapp_call(
      'a3300000-0000-4000-8000-000000000001',
      'event_call',
      'v1'
    )
    where inserted
  ),
  0::bigint,
  'repetição da mesma versão é idempotente'
);
select is(
  (
    select count(*)
    from public.notification_outbox
    where event_id = 'a3300000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'dedupe preserva uma única intenção'
);
select throws_ok(
  $$
    select * from public.enqueue_event_whatsapp_call(
      'a3300000-0000-4000-8000-000000000002',
      'event_call',
      'v1'
    )
  $$,
  '42501',
  null,
  'owner não cria chamada para outro time'
);

reset role;
select ok(
  not exists (
    select 1
    from public.notification_outbox
    where payload::text ~* '(credential|secret|resposta|address)'
  ),
  'payload não persiste credencial, resposta ou endereço'
);

set local role service_role;
select lives_ok(
  $$select public.set_runtime_control('integration_consume', true)$$,
  'operação habilita consumo para o teste'
);
select lives_ok(
  $$
    select
      set_config('test.outbox_id', claimed.outbox_id::text, true),
      set_config('test.lease_token', claimed.lease_token::text, true),
      set_config('test.attempt_number', claimed.attempt_number::text, true)
    from public.claim_notification_batch(1, 60) claimed
  $$,
  'worker reivindica uma intenção elegível'
);
select is(
  current_setting('test.attempt_number'),
  '1',
  'claim incrementa a tentativa uma única vez'
);
select is(
  (select count(*) from public.claim_notification_batch(1, 60)),
  0::bigint,
  'claim concorrente não recebe item já reivindicado'
);
select lives_ok(
  $$
    select
      set_config('test.attempt_id', prepared.attempt_id::text, true),
      set_config('test.credential_secret', prepared.credential_secret, true),
      set_config('test.callback_token', prepared.callback_token, true)
    from public.prepare_whatsapp_dispatch(
      current_setting('test.outbox_id')::uuid,
      current_setting('test.lease_token')::uuid
    ) prepared
  $$,
  'preparo emite credencial e token somente após revalidar elegibilidade'
);
select is(
  char_length(current_setting('test.credential_secret')),
  43,
  'credencial possui 256 bits em base64url'
);
select is(
  char_length(current_setting('test.callback_token')),
  43,
  'token de callback possui 256 bits em base64url'
);
select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'notification_outbox',
        'notification_delivery_attempts',
        'notification_delivery_events'
      )
      and data_type = 'text'
      and column_name ~ '(credential|secret|callback_token)$'
  ),
  0::bigint,
  'dispatch não cria coluna textual para segredo ou token'
);
select throws_ok(
  format(
    'select * from public.prepare_whatsapp_dispatch(%L, %L)',
    current_setting('test.outbox_id'),
    current_setting('test.lease_token')
  ),
  '55000',
  null,
  'mesmo lease não revela o segredo uma segunda vez'
);
select is(
  public.record_notification_callback(
    repeat('x', 43),
    'SM-invalid',
    'accepted',
    null
  ),
  false,
  'token desconhecido não resolve tentativa'
);
select is(
  public.record_notification_callback(
    current_setting('test.callback_token'),
    'SM-r03-001',
    'accepted',
    null
  ),
  true,
  'callback pode chegar antes do ack do worker'
);
select is(
  public.record_notification_callback(
    current_setting('test.callback_token'),
    'SM-r03-001',
    'accepted',
    null
  ),
  true,
  'replay idêntico é aceito de forma idempotente'
);

reset role;
select is(
  (
    select count(*)
    from public.notification_delivery_events
    where attempt_id = current_setting('test.attempt_id')::uuid
      and delivery_status = 'accepted'
  ),
  1::bigint,
  'replay não duplica evento de entrega'
);

set local role service_role;
select is(
  public.ack_notification_sent(
    current_setting('test.outbox_id')::uuid,
    current_setting('test.lease_token')::uuid,
    current_setting('test.attempt_id')::uuid,
    'SM-r03-001'
  ),
  true,
  'ack concilia callback antecipado com o mesmo SID'
);

reset role;
select is(
  (
    select status
    from public.notification_outbox
    where id = current_setting('test.outbox_id')::uuid
  ),
  'sent'::public.message_status,
  'aceite do provedor conclui o estado grosso da outbox'
);

set local role service_role;
select is(
  public.record_notification_callback(
    current_setting('test.callback_token'),
    'SM-r03-001',
    'delivered',
    null
  ),
  true,
  'callback avança para entregue'
);
select is(
  public.record_notification_callback(
    current_setting('test.callback_token'),
    'SM-r03-001',
    'queued',
    null
  ),
  false,
  'callback fora de ordem não regride o estado'
);
select is(
  public.record_notification_callback(
    current_setting('test.callback_token'),
    'SM-r03-001',
    'failed',
    'late_failure'
  ),
  false,
  'falha tardia não regride uma entrega já confirmada'
);

reset role;
select is(
  (
    select delivery_status
    from public.notification_delivery_attempts
    where id = current_setting('test.attempt_id')::uuid
  ),
  'delivered',
  'tentativa preserva o maior estado observado'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'a3100000-0000-4000-8000-000000000001',
  true
);
select lives_ok(
  $$
    select * from public.enqueue_event_whatsapp_call(
      'a3300000-0000-4000-8000-000000000001',
      'event_call_retry',
      'v1'
    )
  $$,
  'uma nova chave de template cria outra intenção'
);

reset role;
set local role service_role;
select lives_ok(
  $$
    select
      set_config('test.retry_outbox', claimed.outbox_id::text, true),
      set_config('test.retry_lease', claimed.lease_token::text, true)
    from public.claim_notification_batch(1, 60) claimed
  $$,
  'worker reivindica a segunda intenção'
);

reset role;
update public.notification_outbox
set lease_expires_at = now() - interval '1 second'
where id = current_setting('test.retry_outbox')::uuid;

set local role service_role;
select is(
  (
    select safe_retry_count
    from public.recover_expired_notification_leases()
  ),
  1,
  'lease vencido antes do efeito volta para retry seguro'
);
select is(
  (
    select review_count
    from public.recover_expired_notification_leases()
  ),
  0,
  'recuperação segura não cria revisão manual'
);
select lives_ok(
  $$
    select
      set_config('test.retry_lease_2', claimed.lease_token::text, true),
      set_config('test.retry_attempt_number', claimed.attempt_number::text, true)
    from public.claim_notification_batch(1, 60) claimed
  $$,
  'intenção anterior ao efeito pode ser reivindicada novamente'
);
select is(
  current_setting('test.retry_attempt_number'),
  '2',
  'nova reivindicação incrementa a tentativa'
);
select lives_ok(
  $$
    select
      set_config('test.retry_attempt', prepared.attempt_id::text, true)
    from public.prepare_whatsapp_dispatch(
      current_setting('test.retry_outbox')::uuid,
      current_setting('test.retry_lease_2')::uuid
    ) prepared
  $$,
  'segunda tentativa cruza a barreira de efeito'
);

reset role;
update public.notification_outbox
set lease_expires_at = now() - interval '1 second'
where id = current_setting('test.retry_outbox')::uuid;

set local role service_role;
select is(
  (
    select review_count
    from public.recover_expired_notification_leases()
  ),
  1,
  'lease vencido após o efeito exige revisão manual'
);

reset role;
select is(
  (
    select requires_review
    from public.notification_outbox
    where id = current_setting('test.retry_outbox')::uuid
  ),
  true,
  'resultado ambíguo fica explicitamente em revisão'
);

set local role service_role;
select is(
  (select count(*) from public.claim_notification_batch(10, 60)),
  0::bigint,
  'item ambíguo nunca participa de retry automático'
);

reset role;
select ok(
  not exists (
    select 1
    from public.audit_logs
    where metadata::text like
      '%' || current_setting('test.credential_secret') || '%'
  ),
  'auditoria não registra a credencial'
);
select ok(
  not exists (
    select 1
    from public.notification_outbox
    where payload::text like
      '%' || current_setting('test.credential_secret') || '%'
  ),
  'outbox não registra a credencial'
);
select is(
  (
    select count(*)
    from public.notification_delivery_attempts
    where callback_token_hash = private.hash_access_secret(
      current_setting('test.callback_token')
    )
  ),
  1::bigint,
  'callback é resolvido somente pelo hash persistido'
);
select is(
  (
    select count(*)
    from public.notification_outbox
    where team_id = 'a3200000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'fluxo completo não criou dados cross-tenant'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'a3100000-0000-4000-8000-000000000001',
  true
);
select lives_ok(
  $$
    select * from public.enqueue_event_whatsapp_call(
      'a3300000-0000-4000-8000-000000000001',
      'event_call_nack',
      'v1'
    )
  $$,
  'nova intenção prepara o cenário de rejeição explícita'
);

reset role;
set local role service_role;
select lives_ok(
  $$
    select
      set_config('test.nack_outbox', claimed.outbox_id::text, true),
      set_config('test.nack_lease', claimed.lease_token::text, true)
    from public.claim_notification_batch(1, 60) claimed
  $$,
  'worker reivindica a intenção que será rejeitada'
);
select lives_ok(
  $$
    select
      set_config('test.nack_attempt', prepared.attempt_id::text, true)
    from public.prepare_whatsapp_dispatch(
      current_setting('test.nack_outbox')::uuid,
      current_setting('test.nack_lease')::uuid
    ) prepared
  $$,
  'rejeição conhecida ocorre depois da barreira'
);
select is(
  public.nack_notification(
    current_setting('test.nack_outbox')::uuid,
    current_setting('test.nack_lease')::uuid,
    current_setting('test.nack_attempt')::uuid,
    'transient',
    'provider_rejected'
  ),
  true,
  'rejeição transitória explícita agenda retry seguro'
);

reset role;
select is(
  (
    select concat_ws(
      ':', status::text, failure_class, requires_review::text,
      (effect_started_at is null)::text
    )
    from public.notification_outbox
    where id = current_setting('test.nack_outbox')::uuid
  ),
  'failed:transient:false:true',
  'nack transitório limpa a barreira e não exige revisão'
);

update public.notification_outbox
set available_at = now() - interval '1 second'
where id = current_setting('test.nack_outbox')::uuid;

set local role service_role;
select is(
  (
    select attempt_number
    from public.claim_notification_batch(1, 60)
  ),
  2::smallint,
  'rejeição conhecida pode ser reivindicada novamente'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'a3100000-0000-4000-8000-000000000001',
  true
);
select lives_ok(
  $$
    select * from public.enqueue_event_whatsapp_call(
      'a3300000-0000-4000-8000-000000000001',
      'event_call_optout',
      'v1'
    )
  $$,
  'intenção nasce enquanto o consentimento está vigente'
);

reset role;
update public.communication_consents
set status = 'revoked', revoked_at = now()
where athlete_id = 'a3500000-0000-4000-8000-000000000001'
  and channel = 'whatsapp';

set local role service_role;
select lives_ok(
  $$
    select
      set_config('test.optout_outbox', claimed.outbox_id::text, true),
      set_config('test.optout_lease', claimed.lease_token::text, true)
    from public.claim_notification_batch(1, 60) claimed
  $$,
  'worker reivindica intenção criada antes do opt-out'
);
select is(
  (
    select count(*)
    from public.prepare_whatsapp_dispatch(
      current_setting('test.optout_outbox')::uuid,
      current_setting('test.optout_lease')::uuid
    )
  ),
  0::bigint,
  'preparo revalida consentimento e não revela segredo após opt-out'
);

reset role;
select is(
  (
    select status
    from public.notification_outbox
    where id = current_setting('test.optout_outbox')::uuid
  ),
  'cancelled'::public.message_status,
  'opt-out cancela a intenção antes do efeito externo'
);

select * from finish();
rollback;
