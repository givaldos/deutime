begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(38);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'd1000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'rsvp-owner-a@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd1000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'rsvp-player-a@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd1000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'rsvp-player-b@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd1000000-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'rsvp-outsider@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  );

insert into public.teams (id, name, slug, created_by)
values
  (
    'd2000000-0000-4000-8000-000000000001',
    'RSVP capability A',
    'rsvp-capability-a',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd2000000-0000-4000-8000-000000000002',
    'RSVP capability B',
    'rsvp-capability-b',
    'd1000000-0000-4000-8000-000000000001'
  );

insert into public.events (
  id, public_id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, created_by,
  cancelled_at, cancelled_by
)
values
  (
    'd3000000-0000-4000-8000-000000000001',
    'd4000000-0000-4000-8000-000000000001',
    'd2000000-0000-4000-8000-000000000001',
    'Evento aberto para RSVP',
    'weekly_match',
    'split_teams',
    'society',
    now() + interval '2 days',
    now() + interval '2 days 90 minutes',
    now() + interval '1 day',
    'scheduled',
    'd1000000-0000-4000-8000-000000000001',
    null,
    null
  ),
  (
    'd3000000-0000-4000-8000-000000000002',
    'd4000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000001',
    'Evento com prazo fechado',
    'training',
    'single_squad',
    'society',
    now() + interval '2 days',
    now() + interval '2 days 60 minutes',
    now() - interval '1 minute',
    'scheduled',
    'd1000000-0000-4000-8000-000000000001',
    null,
    null
  ),
  (
    'd3000000-0000-4000-8000-000000000003',
    'd4000000-0000-4000-8000-000000000003',
    'd2000000-0000-4000-8000-000000000001',
    'Evento cancelado',
    'friendly',
    'single_squad',
    'society',
    now() + interval '3 days',
    now() + interval '3 days 60 minutes',
    now() + interval '2 days',
    'cancelled',
    'd1000000-0000-4000-8000-000000000001',
    now(),
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd3000000-0000-4000-8000-000000000004',
    'd4000000-0000-4000-8000-000000000004',
    'd2000000-0000-4000-8000-000000000002',
    'Evento de outro time',
    'weekly_match',
    'split_teams',
    'society',
    now() + interval '4 days',
    now() + interval '4 days 90 minutes',
    now() + interval '3 days',
    'scheduled',
    'd1000000-0000-4000-8000-000000000001',
    null,
    null
  );

insert into public.athletes (
  id, team_id, user_id, full_name, preferred_name, status, created_by
)
values
  (
    'd5000000-0000-4000-8000-000000000001',
    'd2000000-0000-4000-8000-000000000001',
    null,
    'Atleta sem conta',
    'Sem Conta',
    'active',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd5000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000002',
    'Atleta reivindicado A',
    'Atleta A',
    'active',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd5000000-0000-4000-8000-000000000003',
    'd2000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000003',
    'Atleta reivindicado B',
    'Atleta B',
    'active',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd5000000-0000-4000-8000-000000000004',
    'd2000000-0000-4000-8000-000000000002',
    'd1000000-0000-4000-8000-000000000004',
    'Atleta de outro time',
    'Outro Time',
    'active',
    'd1000000-0000-4000-8000-000000000001'
  );

insert into public.event_attendance (event_id, team_id, athlete_id)
values
  (
    'd3000000-0000-4000-8000-000000000001',
    'd2000000-0000-4000-8000-000000000001',
    'd5000000-0000-4000-8000-000000000001'
  ),
  (
    'd3000000-0000-4000-8000-000000000001',
    'd2000000-0000-4000-8000-000000000001',
    'd5000000-0000-4000-8000-000000000002'
  ),
  (
    'd3000000-0000-4000-8000-000000000001',
    'd2000000-0000-4000-8000-000000000001',
    'd5000000-0000-4000-8000-000000000003'
  ),
  (
    'd3000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000001',
    'd5000000-0000-4000-8000-000000000001'
  ),
  (
    'd3000000-0000-4000-8000-000000000003',
    'd2000000-0000-4000-8000-000000000001',
    'd5000000-0000-4000-8000-000000000001'
  ),
  (
    'd3000000-0000-4000-8000-000000000004',
    'd2000000-0000-4000-8000-000000000002',
    'd5000000-0000-4000-8000-000000000004'
  );

insert into public.team_feature_flags (
  team_id, feature, enabled, updated_by
)
values
  (
    'd2000000-0000-4000-8000-000000000001',
    'public_event_page',
    true,
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd2000000-0000-4000-8000-000000000001',
    'event_capability_exchange',
    true,
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd2000000-0000-4000-8000-000000000002',
    'public_event_page',
    true,
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd2000000-0000-4000-8000-000000000002',
    'event_capability_exchange',
    true,
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd2000000-0000-4000-8000-000000000002',
    'event_capability_rsvp',
    true,
    'd1000000-0000-4000-8000-000000000001'
  );

insert into auth.sessions (id, user_id, created_at, updated_at)
values
  (
    'd6000000-0000-4000-8000-000000000002',
    'd1000000-0000-4000-8000-000000000002',
    now(),
    now()
  ),
  (
    'd6000000-0000-4000-8000-000000000003',
    'd1000000-0000-4000-8000-000000000003',
    now(),
    now()
  ),
  (
    'd6000000-0000-4000-8000-000000000004',
    'd1000000-0000-4000-8000-000000000004',
    now(),
    now()
  );

insert into public.verified_device_sessions (
  auth_session_id, user_id
)
values
  (
    'd6000000-0000-4000-8000-000000000002',
    'd1000000-0000-4000-8000-000000000002'
  ),
  (
    'd6000000-0000-4000-8000-000000000003',
    'd1000000-0000-4000-8000-000000000003'
  );

insert into public.event_access_credentials (
  id, team_id, event_id, athlete_id, secret_hash,
  athlete_user_id_at_issue, issued_by, expires_at, created_at, revoked_at
)
values
  (
    'd7000000-0000-4000-8000-000000000001',
    'd2000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000001',
    'd5000000-0000-4000-8000-000000000001',
    extensions.digest(repeat('U', 43), 'sha256'),
    null,
    'd1000000-0000-4000-8000-000000000001',
    now() + interval '9 days',
    now(),
    null
  ),
  (
    'd7000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000001',
    'd5000000-0000-4000-8000-000000000002',
    extensions.digest(repeat('C', 43), 'sha256'),
    'd1000000-0000-4000-8000-000000000002',
    'd1000000-0000-4000-8000-000000000001',
    now() + interval '9 days',
    now(),
    null
  ),
  (
    'd7000000-0000-4000-8000-000000000003',
    'd2000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000002',
    'd5000000-0000-4000-8000-000000000001',
    extensions.digest(repeat('D', 43), 'sha256'),
    null,
    'd1000000-0000-4000-8000-000000000001',
    now() + interval '9 days',
    now(),
    null
  ),
  (
    'd7000000-0000-4000-8000-000000000004',
    'd2000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000003',
    'd5000000-0000-4000-8000-000000000001',
    extensions.digest(repeat('X', 43), 'sha256'),
    null,
    'd1000000-0000-4000-8000-000000000001',
    now() + interval '9 days',
    now(),
    null
  ),
  (
    'd7000000-0000-4000-8000-000000000005',
    'd2000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000001',
    'd5000000-0000-4000-8000-000000000003',
    extensions.digest(repeat('E', 43), 'sha256'),
    'd1000000-0000-4000-8000-000000000003',
    'd1000000-0000-4000-8000-000000000001',
    now() - interval '1 day',
    now() - interval '2 days',
    null
  ),
  (
    'd7000000-0000-4000-8000-000000000006',
    'd2000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000001',
    'd5000000-0000-4000-8000-000000000001',
    extensions.digest(repeat('R', 43), 'sha256'),
    null,
    'd1000000-0000-4000-8000-000000000001',
    now() + interval '9 days',
    now(),
    now()
  );

insert into public.event_capability_sessions (
  id, credential_id, team_id, event_id, athlete_id, secret_hash,
  athlete_user_id_at_issue, created_at, last_seen_at,
  idle_expires_at, absolute_expires_at, revoked_at
)
values
  (
    'd8000000-0000-4000-8000-000000000001',
    'd7000000-0000-4000-8000-000000000001',
    'd2000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000001',
    'd5000000-0000-4000-8000-000000000001',
    extensions.digest(repeat('U', 43), 'sha256'),
    null,
    now(),
    now(),
    now() + interval '8 days',
    now() + interval '9 days',
    null
  ),
  (
    'd8000000-0000-4000-8000-000000000002',
    'd7000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000001',
    'd5000000-0000-4000-8000-000000000002',
    extensions.digest(repeat('C', 43), 'sha256'),
    'd1000000-0000-4000-8000-000000000002',
    now(),
    now(),
    now() + interval '8 days',
    now() + interval '9 days',
    null
  ),
  (
    'd8000000-0000-4000-8000-000000000003',
    'd7000000-0000-4000-8000-000000000003',
    'd2000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000002',
    'd5000000-0000-4000-8000-000000000001',
    extensions.digest(repeat('D', 43), 'sha256'),
    null,
    now(),
    now(),
    now() + interval '8 days',
    now() + interval '9 days',
    null
  ),
  (
    'd8000000-0000-4000-8000-000000000004',
    'd7000000-0000-4000-8000-000000000004',
    'd2000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000003',
    'd5000000-0000-4000-8000-000000000001',
    extensions.digest(repeat('X', 43), 'sha256'),
    null,
    now(),
    now(),
    now() + interval '8 days',
    now() + interval '9 days',
    null
  ),
  (
    'd8000000-0000-4000-8000-000000000005',
    'd7000000-0000-4000-8000-000000000005',
    'd2000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000001',
    'd5000000-0000-4000-8000-000000000003',
    extensions.digest(repeat('E', 43), 'sha256'),
    'd1000000-0000-4000-8000-000000000003',
    now() - interval '2 days',
    now() - interval '2 days',
    now() - interval '1 day',
    now() - interval '1 day',
    null
  ),
  (
    'd8000000-0000-4000-8000-000000000006',
    'd7000000-0000-4000-8000-000000000006',
    'd2000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000001',
    'd5000000-0000-4000-8000-000000000001',
    extensions.digest(repeat('R', 43), 'sha256'),
    null,
    now(),
    now(),
    now() + interval '8 days',
    now() + interval '9 days',
    now()
  );

select ok(
  has_function_privilege(
    'anon',
    'public.respond_to_event_from_access(uuid,public.attendance_status,text)',
    'EXECUTE'
  ),
  'anon pode apresentar somente o acesso reconhecido à RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.respond_to_event_from_access(uuid,public.attendance_status,text)',
    'EXECUTE'
  ),
  'sessão autenticada pode usar a mesma RPC estreita'
);
select ok(
  not has_function_privilege(
    'public',
    'private.current_audit_actor()',
    'EXECUTE'
  ),
  'helper de auditoria permanece privado'
);
select ok(
  not has_table_privilege(
    'anon',
    'public.event_attendance',
    'UPDATE'
  ),
  'anon não recebe escrita direta de presença'
);

set local role service_role;
select lives_ok(
  $$ select public.set_runtime_control('event_capability_exchange', true) $$,
  'teste habilita somente o controle global local'
);

reset role;
set local role anon;
select throws_ok(
  $$
    select public.respond_to_event_from_access(
      'd4000000-0000-4000-8000-000000000001',
      'waitlist',
      repeat('U', 43)
    )
  $$,
  '22023',
  null,
  'status fora de SIM/NÃO/TALVEZ é recusado'
);
select throws_ok(
  $$
    select public.respond_to_event_from_access(
      'd4000000-0000-4000-8000-000000000001',
      'confirmed',
      repeat('U', 43)
    )
  $$,
  '42501',
  null,
  'flag de RSVP ausente falha fechado'
);

reset role;
select is(
  (
    select status
    from public.event_attendance
    where event_id = 'd3000000-0000-4000-8000-000000000001'
      and athlete_id = 'd5000000-0000-4000-8000-000000000001'
  ),
  'pending'::public.attendance_status,
  'gate desligado não altera presença'
);

reset role;
insert into public.team_feature_flags (
  team_id, feature, enabled, updated_by
)
values (
  'd2000000-0000-4000-8000-000000000001',
  'event_capability_rsvp',
  true,
  'd1000000-0000-4000-8000-000000000001'
);

set local role anon;
select is(
  public.respond_to_event_from_access(
    'd4000000-0000-4000-8000-000000000001',
    'confirmed',
    repeat('U', 43)
  ),
  'confirmed'::public.attendance_status,
  'capability não reivindicada confirma sem criar identidade'
);

reset role;
select is(
  (
    select status
    from public.event_attendance
    where event_id = 'd3000000-0000-4000-8000-000000000001'
      and athlete_id = 'd5000000-0000-4000-8000-000000000001'
  ),
  'confirmed'::public.attendance_status,
  'resposta atualiza a única fonte de presença'
);
select is(
  (
    select responded_by
    from public.event_attendance
    where event_id = 'd3000000-0000-4000-8000-000000000001'
      and athlete_id = 'd5000000-0000-4000-8000-000000000001'
  ),
  null::uuid,
  'capability sem identidade não inventa responded_by'
);

set local role anon;
select is(
  public.respond_to_event_from_access(
    'd4000000-0000-4000-8000-000000000001',
    'maybe',
    repeat('U', 43)
  ),
  'maybe'::public.attendance_status,
  'resposta repetida pode mudar enquanto a janela está aberta'
);

reset role;
select is(
  (
    select status
    from public.event_attendance
    where event_id = 'd3000000-0000-4000-8000-000000000001'
      and athlete_id = 'd5000000-0000-4000-8000-000000000001'
  ),
  'maybe'::public.attendance_status,
  'última resposta válida permanece autoritativa'
);
select is(
  (
    select count(*)
    from public.event_attendance
    where event_id = 'd3000000-0000-4000-8000-000000000001'
      and athlete_id = 'd5000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'retry não cria resposta paralela'
);
select ok(
  exists (
    select 1
    from public.audit_logs
    where action = 'event_attendance.responded_via_access'
      and entity_id =
        'd3000000-0000-4000-8000-000000000001:'
        || 'd5000000-0000-4000-8000-000000000001'
      and metadata ->> 'access_source' = 'capability'
      and metadata ->> 'capability_session_id' =
        'd8000000-0000-4000-8000-000000000001'
  ),
  'auditoria identifica fonte e capability sem usar o segredo'
);
select ok(
  not exists (
    select 1
    from public.audit_logs
    where metadata::text like '%' || repeat('U', 43) || '%'
  ),
  'auditoria não contém o segredo da capability'
);
select ok(
  not exists (
    select 1
    from public.audit_logs
    where action = 'event_attendance.update'
      and entity_id = 'd5000000-0000-4000-8000-000000000001'
      and actor_id is not null
  ),
  'auditoria genérica também evita atribuição falsa'
);

set local role anon;
select throws_ok(
  $$
    select public.respond_to_event_from_access(
      'd4000000-0000-4000-8000-000000000004',
      'confirmed',
      repeat('U', 43)
    )
  $$,
  '42501',
  null,
  'capability não atravessa evento ou time'
);
select throws_ok(
  $$
    select public.respond_to_event_from_access(
      'd4000000-0000-4000-8000-000000000001',
      'confirmed',
      repeat('R', 43)
    )
  $$,
  '42501',
  null,
  'capability revogada não responde'
);
select throws_ok(
  $$
    select public.respond_to_event_from_access(
      'd4000000-0000-4000-8000-000000000001',
      'confirmed',
      repeat('E', 43)
    )
  $$,
  '42501',
  null,
  'capability expirada não responde'
);
select throws_ok(
  $$
    select public.respond_to_event_from_access(
      'd4000000-0000-4000-8000-000000000002',
      'confirmed',
      repeat('D', 43)
    )
  $$,
  '42501',
  null,
  'prazo fechado preserva consulta sem escrita'
);
select throws_ok(
  $$
    select public.respond_to_event_from_access(
      'd4000000-0000-4000-8000-000000000003',
      'confirmed',
      repeat('X', 43)
    )
  $$,
  '42501',
  null,
  'evento cancelado não aceita resposta'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'd1000000-0000-4000-8000-000000000002',
    'session_id', 'd6000000-0000-4000-8000-000000000002'
  )::text,
  true
);
select is(
  public.respond_to_event_from_access(
    'd4000000-0000-4000-8000-000000000001',
    'confirmed',
    repeat('C', 43)
  ),
  'confirmed'::public.attendance_status,
  'capability do próprio usuário mantém a identidade verificada'
);

reset role;
select is(
  (
    select responded_by
    from public.event_attendance
    where event_id = 'd3000000-0000-4000-8000-000000000001'
      and athlete_id = 'd5000000-0000-4000-8000-000000000002'
  ),
  'd1000000-0000-4000-8000-000000000002'::uuid,
  'mesmo athlete_id recebe responded_by verificado'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'd1000000-0000-4000-8000-000000000003',
    'session_id', 'd6000000-0000-4000-8000-000000000003'
  )::text,
  true
);
select is(
  public.respond_to_event_from_access(
    'd4000000-0000-4000-8000-000000000001',
    'declined',
    repeat('U', 43)
  ),
  'declined'::public.attendance_status,
  'capability válida mantém precedência sobre outra sessão logada'
);

reset role;
select is(
  (
    select responded_by
    from public.event_attendance
    where event_id = 'd3000000-0000-4000-8000-000000000001'
      and athlete_id = 'd5000000-0000-4000-8000-000000000001'
  ),
  null::uuid,
  'link encaminhado não atribui o outro usuário ao atleta'
);
select is(
  (
    select status
    from public.event_attendance
    where event_id = 'd3000000-0000-4000-8000-000000000001'
      and athlete_id = 'd5000000-0000-4000-8000-000000000003'
  ),
  'pending'::public.attendance_status,
  'precedência da capability não altera o atleta da sessão'
);

set local role authenticated;
select is(
  public.respond_to_event_from_access(
    'd4000000-0000-4000-8000-000000000001',
    'maybe',
    repeat('Z', 43)
  ),
  'maybe'::public.attendance_status,
  'capability inválida cai na sessão verificada do próprio atleta'
);

reset role;
select is(
  (
    select responded_by
    from public.event_attendance
    where event_id = 'd3000000-0000-4000-8000-000000000001'
      and athlete_id = 'd5000000-0000-4000-8000-000000000003'
  ),
  'd1000000-0000-4000-8000-000000000003'::uuid,
  'fallback verificado deriva responded_by no banco'
);
select ok(
  exists (
    select 1
    from public.audit_logs
    where action = 'event_attendance.responded_via_access'
      and actor_id = 'd1000000-0000-4000-8000-000000000003'
      and metadata ->> 'access_source' = 'verified_session'
      and not (metadata ? 'capability_session_id')
  ),
  'auditoria distingue a sessão verificada sem identificador falso'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'd1000000-0000-4000-8000-000000000004',
    'session_id', 'd6000000-0000-4000-8000-000000000004'
  )::text,
  true
);
select throws_ok(
  $$
    select public.respond_to_event_from_access(
      'd4000000-0000-4000-8000-000000000001',
      'confirmed',
      null
    )
  $$,
  '42501',
  null,
  'sessão verificada de outro time não atravessa tenant'
);

reset role;
set local role service_role;
select lives_ok(
  $$ select public.set_runtime_control('event_capability_exchange', false) $$,
  'kill switch local interrompe escrita por acesso'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{}'::jsonb::text, true);
select throws_ok(
  $$
    select public.respond_to_event_from_access(
      'd4000000-0000-4000-8000-000000000001',
      'confirmed',
      repeat('U', 43)
    )
  $$,
  '42501',
  null,
  'controle global desligado bloqueia imediatamente'
);

reset role;
set local role service_role;
select public.set_runtime_control('event_capability_exchange', true);

reset role;
update public.team_feature_flags
set enabled = false
where team_id = 'd2000000-0000-4000-8000-000000000001'
  and feature = 'event_capability_exchange';

set local role anon;
select throws_ok(
  $$
    select public.respond_to_event_from_access(
      'd4000000-0000-4000-8000-000000000001',
      'confirmed',
      repeat('U', 43)
    )
  $$,
  '42501',
  null,
  'flag de troca do time também bloqueia escrita'
);

reset role;
update public.team_feature_flags
set enabled = true
where team_id = 'd2000000-0000-4000-8000-000000000001'
  and feature = 'event_capability_exchange';
update public.team_feature_flags
set enabled = false
where team_id = 'd2000000-0000-4000-8000-000000000001'
  and feature = 'public_event_page';

set local role anon;
select throws_ok(
  $$
    select public.respond_to_event_from_access(
      'd4000000-0000-4000-8000-000000000001',
      'confirmed',
      repeat('U', 43)
    )
  $$,
  '42501',
  null,
  'página pública desligada mantém toda a jornada inerte'
);

reset role;
update public.team_feature_flags
set enabled = true
where team_id = 'd2000000-0000-4000-8000-000000000001'
  and feature = 'public_event_page';
update public.team_feature_flags
set enabled = false
where team_id = 'd2000000-0000-4000-8000-000000000001'
  and feature = 'event_capability_rsvp';

set local role anon;
select throws_ok(
  $$
    select public.respond_to_event_from_access(
      'd4000000-0000-4000-8000-000000000001',
      'confirmed',
      repeat('U', 43)
    )
  $$,
  '42501',
  null,
  'flag de RSVP desliga somente a nova escrita'
);

reset role;
update public.team_feature_flags
set enabled = true
where team_id = 'd2000000-0000-4000-8000-000000000001'
  and feature = 'event_capability_rsvp';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'd1000000-0000-4000-8000-000000000003',
    'session_id', 'd6000000-0000-4000-8000-000000000003'
  )::text,
  true
);
select is(
  public.respond_to_event_as_player(
    'd3000000-0000-4000-8000-000000000001',
    'confirmed'
  ),
  'confirmed'::public.attendance_status,
  'confirmação autenticada legada permanece compatível'
);

reset role;
select ok(
  exists (
    select 1
    from public.audit_logs
    where action = 'event_attendance.update'
      and entity_id = 'd5000000-0000-4000-8000-000000000003'
      and actor_id = 'd1000000-0000-4000-8000-000000000003'
      and metadata ->> 'new_status' = 'confirmed'
  ),
  'override de auditoria é restaurado após a RPC nova'
);

select * from finish();
rollback;
