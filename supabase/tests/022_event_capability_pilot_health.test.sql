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
  'a1000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'pilot-health@example.test', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
);

insert into public.teams (id, name, slug, created_by)
values
  (
    'a2000000-0000-4000-8000-000000000001',
    'Piloto observado',
    'piloto-observado',
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a2000000-0000-4000-8000-000000000002',
    'Outro piloto',
    'outro-piloto',
    'a1000000-0000-4000-8000-000000000001'
  );

insert into public.events (
  id, public_id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, created_by
)
values
  (
    'a3000000-0000-4000-8000-000000000001',
    'a4000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    'Evento observado',
    'weekly_match', 'single_squad', 'society',
    now() + interval '2 days',
    now() + interval '2 days 90 minutes',
    now() + interval '1 day',
    'scheduled',
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a3000000-0000-4000-8000-000000000002',
    'a4000000-0000-4000-8000-000000000002',
    'a2000000-0000-4000-8000-000000000002',
    'Evento de outro time',
    'weekly_match', 'single_squad', 'society',
    now() + interval '2 days',
    now() + interval '2 days 90 minutes',
    now() + interval '1 day',
    'scheduled',
    'a1000000-0000-4000-8000-000000000001'
  );

insert into public.athletes (
  id, team_id, full_name, preferred_name, status, created_by
)
values
  (
    'a5000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    'Atleta observado',
    'Observado',
    'active',
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a5000000-0000-4000-8000-000000000002',
    'a2000000-0000-4000-8000-000000000002',
    'Atleta de outro time',
    'Outro',
    'active',
    'a1000000-0000-4000-8000-000000000001'
  );

insert into public.event_attendance (event_id, team_id, athlete_id)
values
  (
    'a3000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    'a5000000-0000-4000-8000-000000000001'
  ),
  (
    'a3000000-0000-4000-8000-000000000002',
    'a2000000-0000-4000-8000-000000000002',
    'a5000000-0000-4000-8000-000000000002'
  );

insert into public.team_feature_flags (
  team_id, feature, enabled, updated_by
)
values
  (
    'a2000000-0000-4000-8000-000000000001',
    'event_capability_exchange',
    true,
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a2000000-0000-4000-8000-000000000001',
    'event_capability_rsvp',
    true,
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a2000000-0000-4000-8000-000000000002',
    'event_capability_exchange',
    false,
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a2000000-0000-4000-8000-000000000002',
    'event_capability_rsvp',
    false,
    'a1000000-0000-4000-8000-000000000001'
  );

update public.runtime_controls
set enabled = true
where control = 'event_capability_exchange';

insert into public.event_access_credentials (
  id, team_id, event_id, athlete_id, secret_hash, issued_by,
  expires_at, revoked_at, created_at, last_exchanged_at, exchange_count
)
values
  (
    'a7000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    'a3000000-0000-4000-8000-000000000001',
    'a5000000-0000-4000-8000-000000000001',
    extensions.digest(repeat('A', 43), 'sha256'),
    'a1000000-0000-4000-8000-000000000001',
    now() + interval '7 days',
    null,
    now() - interval '2 hours',
    now() - interval '10 minutes',
    2
  ),
  (
    'a7000000-0000-4000-8000-000000000002',
    'a2000000-0000-4000-8000-000000000001',
    'a3000000-0000-4000-8000-000000000001',
    'a5000000-0000-4000-8000-000000000001',
    extensions.digest(repeat('B', 43), 'sha256'),
    'a1000000-0000-4000-8000-000000000001',
    now() + interval '7 days',
    now() - interval '1 hour',
    now() - interval '2 days',
    null,
    0
  ),
  (
    'a7000000-0000-4000-8000-000000000003',
    'a2000000-0000-4000-8000-000000000002',
    'a3000000-0000-4000-8000-000000000002',
    'a5000000-0000-4000-8000-000000000002',
    extensions.digest(repeat('C', 43), 'sha256'),
    'a1000000-0000-4000-8000-000000000001',
    now() + interval '7 days',
    null,
    now() - interval '3 hours',
    now() - interval '20 minutes',
    1
  );

insert into public.event_capability_sessions (
  id, credential_id, team_id, event_id, athlete_id, secret_hash,
  created_at, last_seen_at, idle_expires_at, absolute_expires_at,
  revoked_at, revocation_reason
)
values
  (
    'a8000000-0000-4000-8000-000000000001',
    'a7000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    'a3000000-0000-4000-8000-000000000001',
    'a5000000-0000-4000-8000-000000000001',
    extensions.digest(repeat('D', 43), 'sha256'),
    now() - interval '1 hour',
    now() - interval '5 minutes',
    now() + interval '7 days',
    now() + interval '8 days',
    null,
    null
  ),
  (
    'a8000000-0000-4000-8000-000000000002',
    'a7000000-0000-4000-8000-000000000002',
    'a2000000-0000-4000-8000-000000000001',
    'a3000000-0000-4000-8000-000000000001',
    'a5000000-0000-4000-8000-000000000001',
    extensions.digest(repeat('E', 43), 'sha256'),
    now() - interval '2 hours',
    now() - interval '2 hours',
    now() + interval '7 days',
    now() + interval '8 days',
    now() - interval '1 hour',
    'credential_revoked'
  ),
  (
    'a8000000-0000-4000-8000-000000000003',
    'a7000000-0000-4000-8000-000000000003',
    'a2000000-0000-4000-8000-000000000002',
    'a3000000-0000-4000-8000-000000000002',
    'a5000000-0000-4000-8000-000000000002',
    extensions.digest(repeat('F', 43), 'sha256'),
    now() - interval '1 hour',
    now() - interval '5 minutes',
    now() + interval '7 days',
    now() + interval '8 days',
    null,
    null
  );

insert into public.audit_logs (
  team_id, action, entity_type, entity_id, created_at
)
values
  (
    'a2000000-0000-4000-8000-000000000001',
    'event_attendance.responded_via_access',
    'event_attendance',
    'observed-current',
    now() - interval '30 minutes'
  ),
  (
    'a2000000-0000-4000-8000-000000000001',
    'event_attendance.responded_via_access',
    'event_attendance',
    'observed-old',
    now() - interval '2 days'
  ),
  (
    'a2000000-0000-4000-8000-000000000002',
    'feature_flag.changed',
    'team_feature_flag',
    'other-team',
    now() - interval '15 minutes'
  );

select ok(
  to_regprocedure(
    'public.get_event_capability_pilot_health(uuid)'
  ) is not null,
  'sonda operacional existe'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.get_event_capability_pilot_health(uuid)',
    'EXECUTE'
  ),
  'service_role pode consultar a sonda'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_event_capability_pilot_health(uuid)',
    'EXECUTE'
  ),
  'anon não consulta métricas operacionais'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.get_event_capability_pilot_health(uuid)',
    'EXECUTE'
  ),
  'authenticated não consulta métricas operacionais'
);
select is(
  (
    select count(*)
    from public.get_event_capability_pilot_health(
      'a2000000-0000-4000-8000-000000000099'
    )
  ),
  0::bigint,
  'time inexistente não produz linha'
);
select is(
  (
    select global_exchange_enabled
    from public.get_event_capability_pilot_health(
      'a2000000-0000-4000-8000-000000000001'
    )
  ),
  true,
  'sonda expõe o gate global'
);
select is(
  (
    select team_exchange_enabled
    from public.get_event_capability_pilot_health(
      'a2000000-0000-4000-8000-000000000001'
    )
  ),
  true,
  'sonda expõe o gate de troca do time'
);
select is(
  (
    select team_rsvp_enabled
    from public.get_event_capability_pilot_health(
      'a2000000-0000-4000-8000-000000000001'
    )
  ),
  true,
  'sonda expõe o gate de RSVP do time'
);
select is(
  (
    select active_credentials
    from public.get_event_capability_pilot_health(
      'a2000000-0000-4000-8000-000000000001'
    )
  ),
  1::bigint,
  'credencial revogada não entra no total ativo'
);
select is(
  (
    select active_capability_sessions
    from public.get_event_capability_pilot_health(
      'a2000000-0000-4000-8000-000000000001'
    )
  ),
  1::bigint,
  'capability revogada não entra no total ativo'
);
select is(
  (
    select capability_sessions_created_24h
    from public.get_event_capability_pilot_health(
      'a2000000-0000-4000-8000-000000000001'
    )
  ),
  2::bigint,
  'janela conta sessões criadas nas últimas 24 horas'
);
select is(
  (
    select capability_sessions_revoked_24h
    from public.get_event_capability_pilot_health(
      'a2000000-0000-4000-8000-000000000001'
    )
  ),
  1::bigint,
  'janela conta revogações recentes'
);
select is(
  (
    select rsvp_writes_24h
    from public.get_event_capability_pilot_health(
      'a2000000-0000-4000-8000-000000000001'
    )
  ),
  1::bigint,
  'janela ignora respostas antigas'
);
select ok(
  (
    select last_exchange_at is not null
    from public.get_event_capability_pilot_health(
      'a2000000-0000-4000-8000-000000000001'
    )
  ),
  'última troca é observável sem expor segredo'
);
select ok(
  (
    select last_rsvp_at is not null
    from public.get_event_capability_pilot_health(
      'a2000000-0000-4000-8000-000000000001'
    )
  ),
  'último RSVP é observável sem expor atleta'
);
select results_eq(
  $$
    select
      team_exchange_enabled,
      team_rsvp_enabled,
      rsvp_writes_24h
    from public.get_event_capability_pilot_health(
      'a2000000-0000-4000-8000-000000000002'
    )
  $$,
  $$ values (false, false, 0::bigint) $$,
  'agregados e gates permanecem isolados por time'
);

select * from finish();
rollback;
