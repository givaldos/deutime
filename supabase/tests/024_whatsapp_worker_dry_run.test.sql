begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(10);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  'b4100000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'worker-dry-run@example.test', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
);

insert into public.teams (id, name, slug, created_by)
values (
  'b4200000-0000-4000-8000-000000000001',
  'Worker dry-run',
  'worker-dry-run',
  'b4100000-0000-4000-8000-000000000001'
);

insert into public.notification_outbox (
  id, team_id, channel, template_key, template_version, intent_version,
  requested_by, recipient, payload, dedupe_key
)
values (
  'b4300000-0000-4000-8000-000000000001',
  'b4200000-0000-4000-8000-000000000001',
  'whatsapp', 'event_call', 'v1', 1,
  'b4100000-0000-4000-8000-000000000001',
  '+5511999992001', '{}'::jsonb, 'worker-dry-run:first'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.release_notification_claim(uuid,uuid)',
    'EXECUTE'
  ),
  'anon não libera claim'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.release_notification_claim(uuid,uuid)',
    'EXECUTE'
  ),
  'cliente autenticado não libera claim'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.release_notification_claim(uuid,uuid)',
    'EXECUTE'
  ),
  'somente worker possui a RPC de liberação'
);

set local role service_role;
select public.set_runtime_control('integration_consume', true);
select lives_ok(
  $$
    select
      set_config('test.dry_outbox', claimed.outbox_id::text, true),
      set_config('test.dry_lease', claimed.lease_token::text, true)
    from public.claim_notification_batch(1, 60) claimed
  $$,
  'dry-run reivindica item pelo mesmo claim do worker real'
);
select is(
  public.release_notification_claim(
    current_setting('test.dry_outbox')::uuid,
    current_setting('test.dry_lease')::uuid
  ),
  true,
  'lease correto é liberado antes do efeito'
);

reset role;
select is(
  (
    select concat_ws(
      ':', status::text, attempts::text,
      (lease_token is null)::text,
      (effect_started_at is null)::text
    )
    from public.notification_outbox
    where id = current_setting('test.dry_outbox')::uuid
  ),
  'pending:0:true:true',
  'dry-run restaura fila sem consumir tentativa'
);

set local role service_role;
select is(
  public.release_notification_claim(
    current_setting('test.dry_outbox')::uuid,
    current_setting('test.dry_lease')::uuid
  ),
  false,
  'lease já liberado não produz segunda alteração'
);
select lives_ok(
  $$
    select
      set_config('test.live_lease', claimed.lease_token::text, true)
    from public.claim_notification_batch(1, 60) claimed
  $$,
  'item pode ser reivindicado novamente depois do dry-run'
);

reset role;
update public.notification_outbox
set effect_started_at = now()
where id = current_setting('test.dry_outbox')::uuid;

set local role service_role;
select is(
  public.release_notification_claim(
    current_setting('test.dry_outbox')::uuid,
    current_setting('test.live_lease')::uuid
  ),
  false,
  'claim não é liberado depois da barreira de efeito'
);

reset role;
select is(
  (
    select status
    from public.notification_outbox
    where id = current_setting('test.dry_outbox')::uuid
  ),
  'processing'::public.message_status,
  'efeito iniciado permanece para ack, nack ou recuperação ambígua'
);

select * from finish();
rollback;
