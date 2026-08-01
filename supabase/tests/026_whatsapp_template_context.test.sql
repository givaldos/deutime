begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  'd6100000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'template-context@example.test', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
);

insert into public.teams (id, name, slug, timezone, created_by)
values (
  'd6200000-0000-4000-8000-000000000001',
  'Template Context', 'template-context', 'America/Recife',
  'd6100000-0000-4000-8000-000000000001'
);

insert into public.events (
  id, public_id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, schedule_version, created_by
)
values (
  'd6300000-0000-4000-8000-000000000001',
  'd6400000-0000-4000-8000-000000000001',
  'd6200000-0000-4000-8000-000000000001',
  'Evento do template', 'weekly_match', 'single_squad', 'society',
  now() + interval '2 days', now() + interval '2 days 90 minutes',
  now() + interval '1 day', 'scheduled', 1,
  'd6100000-0000-4000-8000-000000000001'
);

select ok(
  not has_function_privilege(
    'anon', 'private.add_whatsapp_template_context()', 'EXECUTE'
  ),
  'anon não executa o enriquecimento diretamente'
);
select ok(
  not has_function_privilege(
    'authenticated', 'private.add_whatsapp_template_context()', 'EXECUTE'
  ),
  'cliente autenticado não executa o enriquecimento diretamente'
);

insert into public.notification_outbox (
  id, team_id, event_id, channel, template_key, template_version,
  intent_version, requested_by, recipient, payload, dedupe_key
)
values (
  'd6500000-0000-4000-8000-000000000001',
  'd6200000-0000-4000-8000-000000000001',
  'd6300000-0000-4000-8000-000000000001',
  'whatsapp', 'event_call', 'v1', 1,
  'd6100000-0000-4000-8000-000000000001', '+5581999990001',
  '{"event_title":"Evento","event_timezone":"UTC"}'::jsonb,
  'template-context:whatsapp'
);

select is(
  (
    select payload ->> 'event_timezone'
    from public.notification_outbox
    where id = 'd6500000-0000-4000-8000-000000000001'
  ),
  'America/Recife',
  'fuso autoritativo do time substitui valor fornecido pelo chamador'
);
select is(
  (
    select payload ->> 'event_title'
    from public.notification_outbox
    where id = 'd6500000-0000-4000-8000-000000000001'
  ),
  'Evento',
  'enriquecimento preserva o contexto mínimo existente'
);
select ok(
  not (
    select payload ?| array['recipient', 'phone', 'address', 'credential']
    from public.notification_outbox
    where id = 'd6500000-0000-4000-8000-000000000001'
  ),
  'enriquecimento não acrescenta telefone, endereço ou credencial'
);

update public.teams
set timezone = 'America/Sao_Paulo'
where id = 'd6200000-0000-4000-8000-000000000001';

select is(
  (
    select payload ->> 'event_timezone'
    from public.notification_outbox
    where id = 'd6500000-0000-4000-8000-000000000001'
  ),
  'America/Recife',
  'mudança futura do time não reescreve contexto histórico da intenção'
);
select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notification_outbox'
      and column_name like '%timezone%'
  ),
  0::bigint,
  'expansão não altera o schema relacional consumido por app N-1'
);

select * from finish();
rollback;
