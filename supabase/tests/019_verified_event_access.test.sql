begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(14);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'e1000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'verified-owner@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e1000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'verified-player@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e1000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'verified-outsider@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  );

insert into public.teams (id, name, slug, created_by)
values (
  'e2000000-0000-4000-8000-000000000001',
  'Acesso verificado',
  'acesso-verificado',
  'e1000000-0000-4000-8000-000000000001'
);

insert into public.events (
  id, public_id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, created_by
)
values
  (
    'e3000000-0000-4000-8000-000000000001',
    'e4000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000001',
    'Evento reconhecido',
    'weekly_match',
    'split_teams',
    'society',
    now() + interval '2 days',
    now() + interval '2 days 90 minutes',
    now() + interval '1 day',
    'scheduled',
    'e1000000-0000-4000-8000-000000000001'
  ),
  (
    'e3000000-0000-4000-8000-000000000002',
    'e4000000-0000-4000-8000-000000000002',
    'e2000000-0000-4000-8000-000000000001',
    'Evento sem chamada',
    'training',
    'single_squad',
    'society',
    now() + interval '3 days',
    now() + interval '3 days 60 minutes',
    now() + interval '2 days',
    'scheduled',
    'e1000000-0000-4000-8000-000000000001'
  );

insert into public.athletes (
  id, team_id, user_id, full_name, preferred_name, status, created_by
)
values (
  'e5000000-0000-4000-8000-000000000001',
  'e2000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000002',
  'Atleta reconhecido',
  'Reconhecido',
  'active',
  'e1000000-0000-4000-8000-000000000001'
);

insert into public.event_attendance (event_id, team_id, athlete_id)
values (
  'e3000000-0000-4000-8000-000000000001',
  'e2000000-0000-4000-8000-000000000001',
  'e5000000-0000-4000-8000-000000000001'
);

insert into public.team_feature_flags (
  team_id, feature, enabled, updated_by
)
values
  (
    'e2000000-0000-4000-8000-000000000001',
    'public_event_page',
    true,
    'e1000000-0000-4000-8000-000000000001'
  ),
  (
    'e2000000-0000-4000-8000-000000000001',
    'event_capability_exchange',
    true,
    'e1000000-0000-4000-8000-000000000001'
  );

insert into auth.sessions (id, user_id, created_at, updated_at)
values
  (
    'e6000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000002',
    now(),
    now()
  ),
  (
    'e6000000-0000-4000-8000-000000000002',
    'e1000000-0000-4000-8000-000000000003',
    now(),
    now()
  );

select ok(
  has_function_privilege(
    'authenticated',
    'public.resolve_event_access_for_verified_session(uuid)',
    'EXECUTE'
  ),
  'sessão autenticada possui a RPC de contexto verificado'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.resolve_event_access_for_verified_session(uuid)',
    'EXECUTE'
  ),
  'anon não apresenta identidade como sessão verificada'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'e1000000-0000-4000-8000-000000000002',
    'session_id', 'e6000000-0000-4000-8000-000000000001'
  )::text,
  true
);

select is(
  (
    select count(*)
    from public.resolve_event_access_for_verified_session(
      'e4000000-0000-4000-8000-000000000001'
    )
  ),
  0::bigint,
  'controle global desligado preserva a página pública'
);

reset role;
set local role service_role;
select lives_ok(
  $$ select public.set_runtime_control('event_capability_exchange', true) $$,
  'operação habilita o caminho verificado independentemente'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'e1000000-0000-4000-8000-000000000002',
    'session_id', 'e6000000-0000-4000-8000-000000000001'
  )::text,
  true
);

select is(
  (
    select athlete_display_name
    from public.resolve_event_access_for_verified_session(
      'e4000000-0000-4000-8000-000000000001'
    )
  ),
  'Reconhecido',
  'aparelho verificado recupera o atleta do próprio evento'
);
select is(
  (
    select attendance_status
    from public.resolve_event_access_for_verified_session(
      'e4000000-0000-4000-8000-000000000001'
    )
  ),
  'pending'::public.attendance_status,
  'contexto retorna somente a própria presença'
);
select is(
  (
    select can_respond
    from public.resolve_event_access_for_verified_session(
      'e4000000-0000-4000-8000-000000000001'
    )
  ),
  false,
  'RSVP continua independente e desligado'
);
select is(
  (
    select count(*)
    from public.resolve_event_access_for_verified_session(
      'e4000000-0000-4000-8000-000000000002'
    )
  ),
  0::bigint,
  'sessão não acessa evento sem chamada'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'e1000000-0000-4000-8000-000000000003',
    'session_id', 'e6000000-0000-4000-8000-000000000002'
  )::text,
  true
);
select is(
  (
    select count(*)
    from public.resolve_event_access_for_verified_session(
      'e4000000-0000-4000-8000-000000000001'
    )
  ),
  0::bigint,
  'identidade sem vínculo não atravessa o evento'
);

reset role;
insert into public.team_feature_flags (
  team_id, feature, enabled, updated_by
)
values (
  'e2000000-0000-4000-8000-000000000001',
  'event_capability_rsvp',
  true,
  'e1000000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'e1000000-0000-4000-8000-000000000002',
    'session_id', 'e6000000-0000-4000-8000-000000000001'
  )::text,
  true
);
select is(
  (
    select can_respond
    from public.resolve_event_access_for_verified_session(
      'e4000000-0000-4000-8000-000000000001'
    )
  ),
  true,
  'fase e flag podem habilitar a escrita futura sem implementá-la'
);

reset role;
select is(
  (
    select count(*)
    from public.verified_device_sessions
    where user_id = 'e1000000-0000-4000-8000-000000000002'
      and revoked_at is null
  ),
  1::bigint,
  'acessos repetidos convergem no inventário do mesmo session_id'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'e1000000-0000-4000-8000-000000000002',
    'session_id', 'e6000000-0000-4000-8000-000000000001'
  )::text,
  true
);
select is(
  public.revoke_verified_device_session(
    'e6000000-0000-4000-8000-000000000001'
  ),
  true,
  'usuário revoga o aparelho reconhecido'
);
select throws_ok(
  $$
    select *
    from public.resolve_event_access_for_verified_session(
      'e4000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  null,
  'tombstone retira imediatamente o acesso verificado'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'e1000000-0000-4000-8000-000000000002',
    'session_id', 'e6000000-0000-4000-8000-000000000099'
  )::text,
  true
);
select throws_ok(
  $$
    select *
    from public.resolve_event_access_for_verified_session(
      'e4000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  null,
  'session_id ausente em auth.sessions falha fechado'
);

select * from finish();
rollback;
