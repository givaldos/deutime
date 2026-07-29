begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(16);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  'f1000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'robust-owner@example.test', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
);

insert into public.teams (id, name, slug, created_by)
values (
  'f2000000-0000-4000-8000-000000000001',
  'Robustez capability',
  'robustez-capability',
  'f1000000-0000-4000-8000-000000000001'
);

insert into public.events (
  id, public_id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, created_by
)
values (
  'f3000000-0000-4000-8000-000000000001',
  'f4000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'Evento sob replay',
  'weekly_match',
  'split_teams',
  'society',
  now() + interval '2 days',
  now() + interval '2 days 90 minutes',
  now() + interval '1 day',
  'scheduled',
  'f1000000-0000-4000-8000-000000000001'
);

insert into public.athletes (
  id, team_id, full_name, preferred_name, status, created_by
)
values (
  'f5000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'Atleta sob replay',
  'Replay',
  'active',
  'f1000000-0000-4000-8000-000000000001'
);

insert into public.event_attendance (event_id, team_id, athlete_id)
values (
  'f3000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'f5000000-0000-4000-8000-000000000001'
);

insert into public.team_feature_flags (
  team_id, feature, enabled, updated_by
)
values
  (
    'f2000000-0000-4000-8000-000000000001',
    'public_event_page',
    true,
    'f1000000-0000-4000-8000-000000000001'
  ),
  (
    'f2000000-0000-4000-8000-000000000001',
    'event_capability_exchange',
    true,
    'f1000000-0000-4000-8000-000000000001'
  ),
  (
    'f2000000-0000-4000-8000-000000000001',
    'event_capability_rsvp',
    true,
    'f1000000-0000-4000-8000-000000000001'
  );

insert into public.event_access_credentials (
  id, team_id, event_id, athlete_id, secret_hash, issued_by, expires_at
)
values (
  'f7000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000001',
  'f5000000-0000-4000-8000-000000000001',
  extensions.digest(repeat('R', 43), 'sha256'),
  'f1000000-0000-4000-8000-000000000001',
  now() + interval '9 days'
);

set local role service_role;
select lives_ok(
  $$ select public.set_runtime_control('event_capability_exchange', true) $$,
  'operação habilita o caminho somente dentro do teste'
);

reset role;
select has_trigger(
  'public',
  'event_capability_sessions',
  'enforce_event_capability_session_quota',
  'cota transacional protege toda inserção de capability'
);
select ok(
  position(
    'for update of credential' in lower(
      pg_get_functiondef(
        'public.exchange_event_access_credential(uuid,text)'::regprocedure
      )
    )
  ) > 0,
  'trocas concorrentes serializam na linha da credencial'
);

set local role anon;
select lives_ok(
  $$
    do $replay$
    declare
      current_secret text;
      exchange_number integer;
    begin
      for exchange_number in 1 .. 40 loop
        select exchanged.capability_secret
        into current_secret
        from public.exchange_event_access_credential(
          'f4000000-0000-4000-8000-000000000001',
          repeat('R', 43)
        ) exchanged;
      end loop;

      perform set_config('test.latest_capability', current_secret, true);
    end
    $replay$;
  $$,
  'replay sequencial converge sem erro nem ampliação de escopo'
);

reset role;
select is(
  (
    select exchange_count
    from public.event_access_credentials
    where id = 'f7000000-0000-4000-8000-000000000001'
  ),
  40,
  'tentativas válidas permanecem observáveis sem registrar segredos'
);
select is(
  (
    select count(*)
    from public.event_capability_sessions
    where credential_id = 'f7000000-0000-4000-8000-000000000001'
      and revoked_at is null
      and idle_expires_at > now()
      and absolute_expires_at > now()
  ),
  8::bigint,
  'no máximo oito navegadores permanecem ativos por credencial'
);
select is(
  (
    select count(*)
    from public.event_capability_sessions
    where credential_id = 'f7000000-0000-4000-8000-000000000001'
  ),
  32::bigint,
  'histórico recente permanece limitado a 32 capabilities'
);
select is(
  (
    select count(*)
    from public.event_capability_sessions
    where credential_id = 'f7000000-0000-4000-8000-000000000001'
      and revocation_reason = 'active_session_limit'
  ),
  24::bigint,
  'overflow é revogado com motivo operacional não secreto'
);
select ok(
  not exists (
    select 1
    from public.audit_logs
    where metadata::text like '%' || repeat('R', 43) || '%'
      or metadata::text like
        '%' || current_setting('test.latest_capability') || '%'
  ),
  'auditoria não contém credencial nem capability'
);

update public.events
set
  status = 'cancelled',
  cancelled_at = now(),
  cancelled_by = 'f1000000-0000-4000-8000-000000000001'
where id = 'f3000000-0000-4000-8000-000000000001';

set local role anon;
select is(
  (
    select event_status
    from public.resolve_event_capability(
      'f4000000-0000-4000-8000-000000000001',
      current_setting('test.latest_capability')
    )
  ),
  'cancelled'::public.event_status,
  'cancelamento preserva o contexto autorizado'
);
select is(
  (
    select can_respond
    from public.resolve_event_capability(
      'f4000000-0000-4000-8000-000000000001',
      current_setting('test.latest_capability')
    )
  ),
  false,
  'evento cancelado bloqueia qualquer escrita futura'
);

reset role;
set local role service_role;
select lives_ok(
  $$ select public.set_runtime_control('event_capability_exchange', false) $$,
  'kill switch pode interromper o acesso imediatamente'
);

reset role;
set local role anon;
select is(
  (
    select count(*)
    from public.resolve_event_capability(
      'f4000000-0000-4000-8000-000000000001',
      current_setting('test.latest_capability')
    )
  ),
  0::bigint,
  'kill switch falha fechado sem revogar ou expor a capability'
);

reset role;
set local role service_role;
select lives_ok(
  $$ select public.set_runtime_control('event_capability_exchange', true) $$,
  'recuperação operacional reabilita o caminho sem nova credencial'
);

reset role;
set local role anon;
select is(
  (
    select event_status
    from public.resolve_event_capability(
      'f4000000-0000-4000-8000-000000000001',
      current_setting('test.latest_capability')
    )
  ),
  'cancelled'::public.event_status,
  'capability volta ao mesmo escopo após recuperação'
);

reset role;
update public.team_feature_flags
set enabled = false
where team_id = 'f2000000-0000-4000-8000-000000000001'
  and feature = 'event_capability_exchange';

set local role anon;
select is(
  (
    select count(*)
    from public.resolve_event_capability(
      'f4000000-0000-4000-8000-000000000001',
      current_setting('test.latest_capability')
    )
  ),
  0::bigint,
  'flag do time também falha fechado'
);

select * from finish();
rollback;
