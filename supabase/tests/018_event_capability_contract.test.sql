begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(47);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'owner-capability-a@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c1000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'owner-capability-b@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-8000-000000000000',
    'c1000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'claimed-athlete@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  );

insert into public.teams (id, name, slug, created_by)
values
  (
    'c2000000-0000-4000-8000-000000000001',
    'Capability A',
    'capability-a',
    'c1000000-0000-4000-8000-000000000001'
  ),
  (
    'c2000000-0000-4000-8000-000000000002',
    'Capability B',
    'capability-b',
    'c1000000-0000-4000-8000-000000000002'
  );

insert into public.events (
  id, public_id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, created_by
)
values
  (
    'c3000000-0000-4000-8000-000000000001',
    'c4000000-0000-4000-8000-000000000001',
    'c2000000-0000-4000-8000-000000000001',
    'Evento com capability',
    'weekly_match',
    'split_teams',
    'society',
    now() + interval '2 days',
    now() + interval '2 days 90 minutes',
    now() + interval '1 day',
    'scheduled',
    'c1000000-0000-4000-8000-000000000001'
  ),
  (
    'c3000000-0000-4000-8000-000000000002',
    'c4000000-0000-4000-8000-000000000002',
    'c2000000-0000-4000-8000-000000000002',
    'Evento de outro time',
    'weekly_match',
    'split_teams',
    'society',
    now() + interval '3 days',
    now() + interval '3 days 90 minutes',
    now() + interval '2 days',
    'scheduled',
    'c1000000-0000-4000-8000-000000000002'
  );

insert into public.athletes (
  id, team_id, full_name, preferred_name, status, created_by
)
values
  (
    'c5000000-0000-4000-8000-000000000001',
    'c2000000-0000-4000-8000-000000000001',
    'Atleta sem conta',
    'Sem Conta',
    'active',
    'c1000000-0000-4000-8000-000000000001'
  ),
  (
    'c5000000-0000-4000-8000-000000000002',
    'c2000000-0000-4000-8000-000000000001',
    'Atleta sem consentimento',
    null,
    'active',
    'c1000000-0000-4000-8000-000000000001'
  ),
  (
    'c5000000-0000-4000-8000-000000000003',
    'c2000000-0000-4000-8000-000000000002',
    'Atleta de outro time',
    null,
    'active',
    'c1000000-0000-4000-8000-000000000002'
  );

insert into public.athlete_private (
  athlete_id, team_id, phone_e164, privacy_terms_version,
  privacy_terms_accepted_at
)
values
  (
    'c5000000-0000-4000-8000-000000000001',
    'c2000000-0000-4000-8000-000000000001',
    '+5511999990001',
    'v1',
    now()
  ),
  (
    'c5000000-0000-4000-8000-000000000002',
    'c2000000-0000-4000-8000-000000000001',
    '+5511999990002',
    null,
    null
  ),
  (
    'c5000000-0000-4000-8000-000000000003',
    'c2000000-0000-4000-8000-000000000002',
    '+5511999990003',
    'v1',
    now()
  );

insert into public.event_attendance (event_id, team_id, athlete_id)
values
  (
    'c3000000-0000-4000-8000-000000000001',
    'c2000000-0000-4000-8000-000000000001',
    'c5000000-0000-4000-8000-000000000001'
  ),
  (
    'c3000000-0000-4000-8000-000000000001',
    'c2000000-0000-4000-8000-000000000001',
    'c5000000-0000-4000-8000-000000000002'
  ),
  (
    'c3000000-0000-4000-8000-000000000002',
    'c2000000-0000-4000-8000-000000000002',
    'c5000000-0000-4000-8000-000000000003'
  );

insert into public.team_feature_flags (
  team_id, feature, enabled, updated_by
)
values
  (
    'c2000000-0000-4000-8000-000000000001',
    'public_event_page',
    true,
    'c1000000-0000-4000-8000-000000000001'
  ),
  (
    'c2000000-0000-4000-8000-000000000001',
    'event_capability_exchange',
    true,
    'c1000000-0000-4000-8000-000000000001'
  ),
  (
    'c2000000-0000-4000-8000-000000000002',
    'public_event_page',
    true,
    'c1000000-0000-4000-8000-000000000002'
  ),
  (
    'c2000000-0000-4000-8000-000000000002',
    'event_capability_exchange',
    true,
    'c1000000-0000-4000-8000-000000000002'
  );

select ok(
  'event_capability_exchange' = any (
    enum_range(null::public.runtime_control_key)::text[]
  ),
  'a troca possui controle global independente'
);
select is(
  (
    select enabled
    from public.runtime_controls
    where control = 'event_capability_exchange'
  ),
  false,
  'o controle global de troca nasce desligado'
);
select ok(
  (select relrowsecurity from pg_class
    where oid = 'public.event_access_credentials'::regclass),
  'credenciais usam RLS'
);
select ok(
  (select relrowsecurity from pg_class
    where oid = 'public.event_capability_sessions'::regclass),
  'capabilities usam RLS'
);
select ok(
  (select relrowsecurity from pg_class
    where oid = 'public.verified_device_sessions'::regclass),
  'inventário de aparelhos usa RLS'
);
select ok(
  not has_table_privilege(
    'anon',
    'public.event_access_credentials',
    'SELECT'
  ),
  'anon não lê hashes de credenciais'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.verified_device_sessions',
    'SELECT'
  ),
  'cliente autenticado não lê o inventário diretamente'
);
select ok(
  has_function_privilege(
    'anon',
    'public.exchange_event_access_credential(uuid,text)',
    'EXECUTE'
  ),
  'anon só pode apresentar a credencial à RPC de troca'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.issue_event_access_credential(uuid,uuid)',
    'EXECUTE'
  ),
  'anon não emite credencial'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.issue_event_access_credential(uuid,uuid)',
    'EXECUTE'
  ),
  'operador autenticado possui a RPC de emissão'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'c1000000-0000-4000-8000-000000000001',
  true
);

select lives_ok(
  $$
    select
      set_config('test.credential_id', issued.credential_id::text, true),
      set_config('test.credential_secret', issued.credential_secret, true),
      set_config('test.credential_expiry', issued.expires_at::text, true)
    from public.issue_event_access_credential(
      'c3000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000001'
    ) issued
  $$,
  'owner emite credencial para atleta ativo na chamada e com consentimento'
);
select is(
  char_length(current_setting('test.credential_secret')),
  43,
  'credencial possui 256 bits em base64url sem padding'
);

reset role;
select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'event_access_credentials',
        'event_capability_sessions'
      )
      and (
        column_name = 'secret'
        or column_name = 'token'
        or data_type = 'text' and column_name like '%secret%'
      )
  ),
  0::bigint,
  'nenhuma tabela persiste o segredo reutilizável em texto'
);
select ok(
  not exists (
    select 1
    from public.audit_logs
    where action = 'event_access_credential.issued'
      and metadata::text like
        '%' || current_setting('test.credential_secret') || '%'
  ),
  'auditoria não contém a credencial'
);
select is(
  (
    select expires_at
    from public.event_access_credentials
    where id = current_setting('test.credential_id')::uuid
  ),
  (
    select ends_at + interval '7 days'
    from public.events
    where id = 'c3000000-0000-4000-8000-000000000001'
  ),
  'credencial não ultrapassa sete dias após o evento'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'c1000000-0000-4000-8000-000000000001',
  true
);
select throws_ok(
  $$
    select *
    from public.issue_event_access_credential(
      'c3000000-0000-4000-8000-000000000002',
      'c5000000-0000-4000-8000-000000000003'
    )
  $$,
  '42501',
  null,
  'owner não emite credencial para outro time'
);
select throws_ok(
  $$
    select *
    from public.issue_event_access_credential(
      'c3000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000002'
    )
  $$,
  '42501',
  null,
  'emissão falha sem consentimento registrado'
);

reset role;
set local role anon;
select throws_ok(
  format(
    'select * from public.exchange_event_access_credential(%L, %L)',
    'c4000000-0000-4000-8000-000000000001',
    current_setting('test.credential_secret')
  ),
  '42501',
  null,
  'controle global desligado impede a troca'
);

reset role;
set local role service_role;
select lives_ok(
  $$
    select public.set_runtime_control('event_capability_exchange', true)
  $$,
  'operação habilita a troca global independentemente'
);

reset role;
set local role anon;
select lives_ok(
  $$
    select
      set_config(
        'test.capability_secret',
        exchanged.capability_secret,
        true
      )
    from public.exchange_event_access_credential(
      'c4000000-0000-4000-8000-000000000001',
      current_setting('test.credential_secret')
    ) exchanged
  $$,
  'credencial válida troca por capability sem criar identidade'
);
select is(
  char_length(current_setting('test.capability_secret')),
  43,
  'capability também possui segredo opaco de 256 bits'
);

reset role;
select is(
  (
    select exchange_count
    from public.event_access_credentials
    where id = current_setting('test.credential_id')::uuid
  ),
  1,
  'troca é contabilizada sem registrar o segredo'
);

set local role anon;
select is(
  (
    select count(*)
    from public.resolve_event_capability(
      'c4000000-0000-4000-8000-000000000002',
      current_setting('test.capability_secret')
    )
  ),
  0::bigint,
  'capability não atravessa evento nem time'
);
select is(
  (
    select athlete_display_name
    from public.resolve_event_capability(
      'c4000000-0000-4000-8000-000000000001',
      current_setting('test.capability_secret')
    )
  ),
  'Sem Conta',
  'capability resolve somente o contexto autorizado do atleta'
);
select is(
  (
    select can_respond
    from public.resolve_event_capability(
      'c4000000-0000-4000-8000-000000000001',
      current_setting('test.capability_secret')
    )
  ),
  false,
  'leitura não habilita RSVP enquanto a flag independente está desligada'
);

reset role;
insert into public.team_feature_flags (
  team_id, feature, enabled, updated_by
)
values (
  'c2000000-0000-4000-8000-000000000001',
  'event_capability_rsvp',
  true,
  'c1000000-0000-4000-8000-000000000001'
);

set local role anon;
select is(
  (
    select can_respond
    from public.resolve_event_capability(
      'c4000000-0000-4000-8000-000000000001',
      current_setting('test.capability_secret')
    )
  ),
  true,
  'capability apenas informa escrita possível quando fase e flag permitem'
);
select lives_ok(
  $$
    select *
    from public.exchange_event_access_credential(
      'c4000000-0000-4000-8000-000000000001',
      current_setting('test.credential_secret')
    )
  $$,
  'replay válido cria outra capability do mesmo escopo'
);

reset role;
select is(
  (
    select count(*)
    from public.event_capability_sessions
    where credential_id = current_setting('test.credential_id')::uuid
  ),
  2::bigint,
  'encaminhamento não amplia escopo e permanece inventariado'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'c1000000-0000-4000-8000-000000000001',
  true
);
select lives_ok(
  format(
    'select public.revoke_event_access_credential(%L)',
    current_setting('test.credential_id')
  ),
  'owner revoga credencial e suas capabilities'
);

reset role;
set local role anon;
select is(
  (
    select count(*)
    from public.resolve_event_capability(
      'c4000000-0000-4000-8000-000000000001',
      current_setting('test.capability_secret')
    )
  ),
  0::bigint,
  'revogação tem efeito imediato na leitura'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'c1000000-0000-4000-8000-000000000001',
  true
);
select lives_ok(
  $$
    select
      set_config(
        'test.claim_credential_secret',
        issued.credential_secret,
        true
      )
    from public.issue_event_access_credential(
      'c3000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000001'
    ) issued
  $$,
  'rotação emite nova credencial para o mesmo escopo'
);

reset role;
set local role anon;
select lives_ok(
  $$
    select
      set_config(
        'test.claim_capability_secret',
        exchanged.capability_secret,
        true
      )
    from public.exchange_event_access_credential(
      'c4000000-0000-4000-8000-000000000001',
      current_setting('test.claim_credential_secret')
    ) exchanged
  $$,
  'atleta não reivindicado recebe capability sem usuário'
);

reset role;
update public.athletes
set user_id = 'c1000000-0000-4000-8000-000000000003'
where id = 'c5000000-0000-4000-8000-000000000001';

select is(
  (
    select count(*)
    from public.event_access_credentials
    where athlete_id = 'c5000000-0000-4000-8000-000000000001'
      and revoked_at is null
  ),
  0::bigint,
  'reivindicação por OTP revoga credenciais do estado não reivindicado'
);
set local role anon;
select is(
  (
    select count(*)
    from public.resolve_event_capability(
      'c4000000-0000-4000-8000-000000000001',
      current_setting('test.claim_capability_secret')
    )
  ),
  0::bigint,
  'reivindicação também invalida a capability anterior'
);

reset role;
insert into auth.sessions (id, user_id, created_at, updated_at)
values
  (
    'c6000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001',
    now(),
    now()
  ),
  (
    'c6000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-000000000001',
    now(),
    now()
  ),
  (
    'c6000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-000000000002',
    now(),
    now()
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'c1000000-0000-4000-8000-000000000001',
    'session_id', 'c6000000-0000-4000-8000-000000000001'
  )::text,
  true
);
select lives_ok(
  $$ select * from public.register_or_touch_verified_device_session() $$,
  'session_id verificado é registrado no primeiro acesso de R02'
);
select is(
  (
    select count(*)
    from public.register_or_touch_verified_device_session()
  ),
  1::bigint,
  'toque idempotente reutiliza o inventário existente'
);

reset role;
select is(
  (
    select count(*)
    from public.verified_device_sessions
    where user_id = 'c1000000-0000-4000-8000-000000000001'
      and revoked_at is null
  ),
  1::bigint,
  'inventário contém uma única linha para a sessão'
);
select ok(
  (
    select absolute_expires_at <= first_seen_at + interval '180 days'
    from public.verified_device_sessions
    where auth_session_id = 'c6000000-0000-4000-8000-000000000001'
  ),
  'sessão verificada respeita o limite absoluto de 180 dias'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'c1000000-0000-4000-8000-000000000001',
    'session_id', 'c6000000-0000-4000-8000-000000000001'
  )::text,
  true
);
select throws_ok(
  $$
    select public.revoke_verified_device_session(
      'c6000000-0000-4000-8000-000000000003'
    )
  $$,
  '42501',
  null,
  'usuário não revoga aparelho de outra identidade'
);
select is(
  public.revoke_verified_device_session(
    'c6000000-0000-4000-8000-000000000001'
  ),
  true,
  'usuário revoga o próprio aparelho'
);
select throws_ok(
  $$ select * from public.register_or_touch_verified_device_session() $$,
  '42501',
  null,
  'tombstone impede autorregistro posterior pelo mesmo JWT'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'c1000000-0000-4000-8000-000000000001',
    'session_id', 'c6000000-0000-4000-8000-000000000099'
  )::text,
  true
);
select throws_ok(
  $$ select * from public.register_or_touch_verified_device_session() $$,
  '42501',
  null,
  'session_id ausente em auth.sessions falha fechado'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'c1000000-0000-4000-8000-000000000001',
    'session_id', 'c6000000-0000-4000-8000-000000000002'
  )::text,
  true
);
select lives_ok(
  $$ select * from public.register_or_touch_verified_device_session() $$,
  'novo session_id verificado cria outro item de aparelho'
);
select is(
  public.revoke_all_my_verified_device_sessions(),
  1,
  'revogação global própria alcança os aparelhos ainda ativos'
);

reset role;
select is(
  (
    select count(*)
    from public.verified_device_sessions
    where user_id = 'c1000000-0000-4000-8000-000000000001'
      and revoked_at is null
  ),
  0::bigint,
  'revogação global deixa somente tombstones'
);
select ok(
  not exists (
    select 1
    from public.audit_logs
    where action like 'verified_device_session.%'
      and metadata::text ~
        '(eyJ|refresh_token|access_token|c6000000.*c6000000)'
  ),
  'auditoria de aparelho não contém token ou segredo'
);

set local role authenticated;
select throws_ok(
  $$
    insert into public.event_capability_sessions (
      credential_id, team_id, event_id, athlete_id, secret_hash,
      idle_expires_at, absolute_expires_at
    )
    values (
      extensions.gen_random_uuid(),
      'c2000000-0000-4000-8000-000000000001',
      'c3000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000001',
      extensions.digest('forjado', 'sha256'),
      now() + interval '1 day',
      now() + interval '2 days'
    )
  $$,
  '42501',
  null,
  'cliente não contorna RPCs com escrita direta'
);

select * from finish();
rollback;
