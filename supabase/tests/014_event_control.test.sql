begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(28);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '81000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'control-owner@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Control Owner"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '81000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'control-manager@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Control Manager"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '81000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'control-outsider@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Control Outsider"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.teams (
  id, name, slug, timezone, default_sport_format, created_by
)
values
  (
    '82000000-0000-4000-8000-000000000001',
    'Control Alpha',
    'control-alpha',
    'America/New_York',
    'society',
    '81000000-0000-4000-8000-000000000001'
  ),
  (
    '82000000-0000-4000-8000-000000000002',
    'Control Beta',
    'control-beta',
    'America/Sao_Paulo',
    'futsal',
    '81000000-0000-4000-8000-000000000003'
  );

insert into public.team_memberships (
  team_id, user_id, role, status
)
values (
  '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  'manager',
  'active'
);

select ok(
  not has_table_privilege('authenticated', 'public.event_commands', 'SELECT'),
  'clients cannot read command payload hashes'
);
select ok(
  has_table_privilege('authenticated', 'public.event_changes', 'SELECT'),
  'authenticated staff may read the PII-free change stream through RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.event_changes', 'INSERT'),
  'clients cannot forge event changes'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_event_as_staff_v2(uuid,uuid,timestamp without time zone,text,public.event_kind,public.organization_mode,public.sport_format,integer,integer,integer,text,text,text)',
    'EXECUTE'
  ),
  'authenticated users can reach the guarded v2 workflow'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_event_as_staff_v3(uuid,uuid,timestamp without time zone,text,public.event_kind,public.organization_mode,public.sport_format,integer,integer,integer,text,text,text)',
    'EXECUTE'
  ),
  'authenticated users can reach the guarded v3 create workflow'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.update_event_as_staff_v3(uuid,uuid,uuid,text,timestamp without time zone,text,public.event_kind,public.organization_mode,public.sport_format,integer,integer,text,text,text)',
    'EXECUTE'
  ),
  'authenticated users can reach the guarded v3 update workflow'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000001',
  true
);

select throws_ok(
  $$
    select public.create_event_as_staff_v2(
      '82000000-0000-4000-8000-000000000001',
      '83000000-0000-4000-8000-000000000001',
      '2026-10-25 20:30',
      'Flag desligada',
      'weekly_match',
      'split_teams',
      'society',
      90,
      120,
      1
    )
  $$,
  '42501',
  null,
  'the v2 workflow fails closed while event_control is disabled'
);

select lives_ok(
  $$
    select public.set_team_feature_flag(
      '82000000-0000-4000-8000-000000000001',
      'event_control',
      true
    )
  $$,
  'owner can enable the capability for the pilot team'
);

select lives_ok(
  $$
    select public.create_event_as_staff_v2(
      '82000000-0000-4000-8000-000000000001',
      '83000000-0000-4000-8000-000000000002',
      '2026-10-25 20:30',
      'Série no fuso do time',
      'weekly_match',
      'split_teams',
      'society',
      90,
      120,
      3,
      null,
      'Arena do fuso',
      'Rua civil, 10'
    )
  $$,
  'owner creates a recurring event from a civil date'
);
select is(
  (
    select count(*)
    from public.events e
    where e.team_id = '82000000-0000-4000-8000-000000000001'
  ),
  3::bigint,
  'the command materializes exactly three occurrences'
);
select is(
  (
    select array_agg(
      (e.starts_at at time zone 'America/New_York')::time
      order by e.series_position
    )
    from public.events e
    where e.team_id = '82000000-0000-4000-8000-000000000001'
  ),
  array['20:30'::time, '20:30'::time, '20:30'::time],
  'weekly occurrences keep the same civil time across the DST transition'
);
select isnt(
  (
    select third.starts_at - first.starts_at
    from public.events first
    join public.events third on third.series_id = first.series_id
    where first.team_id = '82000000-0000-4000-8000-000000000001'
      and first.series_position = 1
      and third.series_position = 3
  ),
  interval '14 days',
  'recurrence is based on civil weeks instead of absolute timestamptz weeks'
);
select ok(
  (
    select (public.create_event_as_staff_v2(
      '82000000-0000-4000-8000-000000000001',
      '83000000-0000-4000-8000-000000000002',
      '2026-10-25 20:30',
      'Série no fuso do time',
      'weekly_match',
      'split_teams',
      'society',
      90,
      120,
      3,
      null,
      'Arena do fuso',
      'Rua civil, 10'
    )).replayed
  ),
  'an identical retry returns the persisted result as replay'
);
select is(
  (
    select count(*)
    from public.events e
    where e.team_id = '82000000-0000-4000-8000-000000000001'
  ),
  3::bigint,
  'an identical retry does not duplicate occurrences'
);
select throws_ok(
  $$
    select public.create_event_as_staff_v2(
      '82000000-0000-4000-8000-000000000001',
      '83000000-0000-4000-8000-000000000003',
      '2027-03-14 02:30',
      'Horário inexistente',
      'friendly',
      'single_squad',
      'society',
      90,
      120,
      1
    )
  $$,
  '22023',
  null,
  'a civil time inside a DST gap is rejected'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000002',
  true
);

select lives_ok(
  $$
    select public.update_event_as_staff_v2(
      '82000000-0000-4000-8000-000000000001',
      (
        select e.id
        from public.events e
        where e.team_id = '82000000-0000-4000-8000-000000000001'
          and e.series_position = 1
      ),
      '83000000-0000-4000-8000-000000000004',
      'single_event',
      '2026-10-26 19:00',
      'Evento ajustado pelo manager',
      'weekly_match',
      'split_teams',
      'society',
      90,
      120
    )
  $$,
  'an active manager may update an event through v2'
);
select is(
  (
    select max(e.schedule_version)
    from public.events e
    where e.team_id = '82000000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'an updated occurrence advances its schedule version once'
);
select ok(
  (
    select (public.update_event_as_staff_v2(
      '82000000-0000-4000-8000-000000000001',
      (
        select e.id
        from public.events e
        where e.team_id = '82000000-0000-4000-8000-000000000001'
          and e.series_position = 1
      ),
      '83000000-0000-4000-8000-000000000004',
      'single_event',
      '2026-10-26 19:00',
      'Evento ajustado pelo manager',
      'weekly_match',
      'split_teams',
      'society',
      90,
      120
    )).replayed
  ),
  'an identical update retry returns the persisted result'
);

reset role;

select is(
  (
    select count(*)
    from public.audit_logs audit
    where audit.team_id = '82000000-0000-4000-8000-000000000001'
      and audit.action = 'event.updated_v2'
  ),
  1::bigint,
  'an update retry does not duplicate its command audit'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000003',
  true
);

select throws_ok(
  $$
    select public.update_event_as_staff_v2(
      '82000000-0000-4000-8000-000000000001',
      (
        select e.id
        from public.events e
        where e.team_id = '82000000-0000-4000-8000-000000000001'
        limit 1
      ),
      '83000000-0000-4000-8000-000000000005',
      'single_event',
      '2026-10-27 19:00',
      'Tentativa externa',
      'friendly',
      'single_squad',
      'society',
      90,
      120
    )
  $$,
  '42501',
  null,
  'staff from another tenant cannot update the event'
);
select is(
  (
    select count(*)
    from public.event_changes change
    where change.team_id = '82000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'RLS hides another tenant change stream'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000001',
  true
);

select lives_ok(
  $$
    select public.create_event_as_staff_v3(
      '82000000-0000-4000-8000-000000000001',
      '83000000-0000-4000-8000-000000000006',
      '2027-11-01 20:00',
      'Série com limites compartilhados',
      'weekly_match',
      'split_teams',
      'society',
      480,
      720,
      2
    )
  $$,
  'v3 creates a recurring event at the upper common duration and 12h deadline'
);
select is(
  (
    select count(*)
    from public.events e
    where e.team_id = '82000000-0000-4000-8000-000000000001'
      and e.title = 'Série com limites compartilhados'
  ),
  2::bigint,
  'v3 materializes every requested recurrence'
);
select ok(
  (
    select bool_and(
      e.ends_at - e.starts_at = interval '480 minutes'
      and e.starts_at - e.attendance_deadline = interval '720 minutes'
    )
    from public.events e
    where e.team_id = '82000000-0000-4000-8000-000000000001'
      and e.title = 'Série com limites compartilhados'
  ),
  'every occurrence preserves duration and confirmation deadline'
);
select lives_ok(
  $$
    select public.update_event_as_staff_v3(
      '82000000-0000-4000-8000-000000000001',
      (
        select e.id
        from public.events e
        where e.team_id = '82000000-0000-4000-8000-000000000001'
          and e.title = 'Série com limites compartilhados'
          and e.series_position = 1
      ),
      '83000000-0000-4000-8000-000000000007',
      'this_and_future',
      '2027-11-02 20:00',
      'Série com valor personalizado',
      'weekly_match',
      'split_teams',
      'society',
      15,
      0
    )
  $$,
  'v3 updates this and future occurrences with a custom duration'
);
select ok(
  (
    select count(*) = 2
      and bool_and(
        e.ends_at - e.starts_at = interval '15 minutes'
        and e.attendance_deadline = e.starts_at
      )
    from public.events e
    where e.team_id = '82000000-0000-4000-8000-000000000001'
      and e.title = 'Série com valor personalizado'
  ),
  'the recurring update preserves the custom duration and start-time deadline'
);
select throws_ok(
  $$
    select public.create_event_as_staff_v3(
      '82000000-0000-4000-8000-000000000001',
      '83000000-0000-4000-8000-000000000008',
      '2027-12-01 20:00',
      'Duração inválida',
      'friendly',
      'single_squad',
      'society',
      481,
      120,
      1
    )
  $$,
  '22023',
  null,
  'v3 rejects a duration above 480 minutes'
);
select throws_ok(
  $$
    select public.create_event_as_staff_v3(
      '82000000-0000-4000-8000-000000000001',
      '83000000-0000-4000-8000-000000000009',
      '2027-12-01 20:00',
      'Prazo inválido',
      'friendly',
      'single_squad',
      'society',
      90,
      30,
      1
    )
  $$,
  '22023',
  null,
  'v3 rejects a confirmation deadline outside the shared options'
);

select * from finish();
rollback;
