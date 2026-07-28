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
    'a1000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'extension-owner@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Extension Owner"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'extension-manager@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Extension Manager"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'extension-outsider@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Extension Outsider"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.teams (
  id, name, slug, timezone, default_sport_format, created_by
)
values
  (
    'a2000000-0000-4000-8000-000000000001',
    'Extension Alpha',
    'extension-alpha',
    'America/New_York',
    'society',
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a2000000-0000-4000-8000-000000000002',
    'Extension Beta',
    'extension-beta',
    'America/Sao_Paulo',
    'futsal',
    'a1000000-0000-4000-8000-000000000003'
  );

insert into public.team_memberships (team_id, user_id, role, status)
values (
  'a2000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000002',
  'manager',
  'active'
);

insert into public.athletes (
  id, team_id, full_name, status, registration_source
)
values (
  'a3000000-0000-4000-8000-000000000001',
  'a2000000-0000-4000-8000-000000000001',
  'Atleta da extensão',
  'active',
  'admin'
);

create temporary table test_series_context (
  name text primary key,
  series_id uuid not null
);
grant select, insert on table test_series_context to authenticated;

select ok(
  has_function_privilege(
    'authenticated',
    'public.extend_event_series_as_staff(uuid,uuid,uuid,integer)',
    'EXECUTE'
  ),
  'authenticated users can reach the guarded extension workflow'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000001',
  true
);

select lives_ok(
  $$
    select public.set_team_feature_flag(
      'a2000000-0000-4000-8000-000000000001',
      'event_control',
      true
    )
  $$,
  'owner enables event control for the extension team'
);

select lives_ok(
  $$
    select public.create_event_as_staff_v2(
      'a2000000-0000-4000-8000-000000000001',
      'a4000000-0000-4000-8000-000000000001',
      '2026-10-25 20:30',
      'Série extensível',
      'weekly_match',
      'split_teams',
      'society',
      90,
      120,
      3,
      'Rival local'
    )
  $$,
  'owner creates the initial three-occurrence series'
);

insert into test_series_context (name, series_id)
select
  'primary',
  (
    public.create_event_as_staff_v2(
      'a2000000-0000-4000-8000-000000000001',
      'a4000000-0000-4000-8000-000000000001',
      '2026-10-25 20:30',
      'Série extensível',
      'weekly_match',
      'split_teams',
      'society',
      90,
      120,
      3,
      'Rival local'
    )
  ).series_id;

select is(
  (
    select (
      public.extend_event_series_as_staff(
        'a2000000-0000-4000-8000-000000000001',
        context.series_id,
        'a4000000-0000-4000-8000-000000000002',
        2
      )
    ).affected_count
    from test_series_context context
    where context.name = 'primary'
  ),
  2,
  'owner appends exactly the requested number of occurrences'
);

select is(
  (
    select count(*)
    from public.events event
    join test_series_context context on context.series_id = event.series_id
    where context.name = 'primary'
  ),
  5::bigint,
  'extension materializes five total occurrences'
);

select is(
  (
    select array_agg(event.series_position order by event.series_position)
    from public.events event
    join test_series_context context on context.series_id = event.series_id
    where context.name = 'primary'
  ),
  array[1, 2, 3, 4, 5]::smallint[],
  'new occurrences receive contiguous unique positions'
);

select is(
  (
    select array_agg(
      (event.starts_at at time zone 'America/New_York')::time
      order by event.series_position
    )
    from public.events event
    join test_series_context context on context.series_id = event.series_id
    where context.name = 'primary'
  ),
  array[
    '20:30'::time,
    '20:30'::time,
    '20:30'::time,
    '20:30'::time,
    '20:30'::time
  ],
  'extension preserves civil time across the DST transition'
);

select is(
  (
    select series.ends_on
    from public.event_series series
    join test_series_context context on context.series_id = series.id
    where context.name = 'primary'
  ),
  date '2026-11-22',
  'series end date advances to the final appended occurrence'
);

select is(
  (
    select series.recurrence_rule
    from public.event_series series
    join test_series_context context on context.series_id = series.id
    where context.name = 'primary'
  ),
  'FREQ=WEEKLY;COUNT=5',
  'recurrence metadata reflects the new total'
);

select is(
  (
    select count(*)
    from public.event_changes change
    join test_series_context context on context.series_id = change.series_id
    where context.name = 'primary'
      and change.kind = 'series_extended'
      and change.scope = 'this_and_future'
  ),
  2::bigint,
  'each appended occurrence has an explicit future-consumable change'
);

select is(
  (
    select count(*)
    from public.event_attendance attendance
    join public.events event on event.id = attendance.event_id
    join test_series_context context on context.series_id = event.series_id
    where context.name = 'primary'
      and event.series_position in (4, 5)
      and attendance.athlete_id = 'a3000000-0000-4000-8000-000000000001'
      and attendance.status = 'pending'
  ),
  2::bigint,
  'new occurrences seed pending attendance for active athletes'
);

select is(
  (
    select count(*)
    from public.events event
    join test_series_context context on context.series_id = event.series_id
    where context.name = 'primary'
      and event.series_position <= 3
      and event.schedule_version = 1
  ),
  3::bigint,
  'extension does not rewrite earlier occurrences'
);

select is(
  (
    select count(*)
    from public.audit_logs audit
    where audit.request_id = 'a4000000-0000-4000-8000-000000000002'
      and audit.action = 'event.series_extended'
  ),
  1::bigint,
  'one command audit is recorded for the extension'
);

select ok(
  (
    select (
      public.extend_event_series_as_staff(
        'a2000000-0000-4000-8000-000000000001',
        context.series_id,
        'a4000000-0000-4000-8000-000000000002',
        2
      )
    ).replayed
    from test_series_context context
    where context.name = 'primary'
  ),
  'an identical retry returns the persisted result'
);

select is(
  (
    select count(*)
    from public.events event
    join test_series_context context on context.series_id = event.series_id
    where context.name = 'primary'
  ),
  5::bigint,
  'an identical retry does not duplicate occurrences'
);

select is(
  (
    select count(*)
    from public.event_changes change
    join test_series_context context on context.series_id = change.series_id
    where context.name = 'primary'
      and change.kind = 'series_extended'
  ),
  2::bigint,
  'an identical retry does not duplicate changes'
);

select throws_ok(
  $$
    select public.extend_event_series_as_staff(
      'a2000000-0000-4000-8000-000000000001',
      context.series_id,
      'a4000000-0000-4000-8000-000000000002',
      3
    )
    from test_series_context context
    where context.name = 'primary'
  $$,
  '22023',
  null,
  'the same request id rejects a divergent payload'
);

select lives_ok(
  $$
    select public.extend_event_series_as_staff(
      'a2000000-0000-4000-8000-000000000001',
      context.series_id,
      'a4000000-0000-4000-8000-000000000003',
      47
    )
    from test_series_context context
    where context.name = 'primary'
  $$,
  'a series may be extended up to exactly 52 occurrences'
);

select is(
  (
    select count(*)
    from public.events event
    join test_series_context context on context.series_id = event.series_id
    where context.name = 'primary'
  ),
  52::bigint,
  'the series reaches but does not exceed the total limit'
);

select throws_ok(
  $$
    select public.extend_event_series_as_staff(
      'a2000000-0000-4000-8000-000000000001',
      context.series_id,
      'a4000000-0000-4000-8000-000000000004',
      1
    )
    from test_series_context context
    where context.name = 'primary'
  $$,
  '55000',
  null,
  'the workflow rejects a fifty-third occurrence'
);

select lives_ok(
  $$
    select public.create_event_as_staff_v2(
      'a2000000-0000-4000-8000-000000000001',
      'a4000000-0000-4000-8000-000000000005',
      '2027-02-01 20:30',
      'Série inativa',
      'training',
      'single_squad',
      'society',
      60,
      60,
      2
    )
  $$,
  'owner creates a second series for lifecycle validation'
);

insert into test_series_context (name, series_id)
select
  'inactive',
  (
    public.create_event_as_staff_v2(
      'a2000000-0000-4000-8000-000000000001',
      'a4000000-0000-4000-8000-000000000005',
      '2027-02-01 20:30',
      'Série inativa',
      'training',
      'single_squad',
      'society',
      60,
      60,
      2
    )
  ).series_id;

reset role;
update public.event_series series
set is_active = false
from test_series_context context
where context.name = 'inactive'
  and series.id = context.series_id;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000001',
  true
);

select throws_ok(
  $$
    select public.extend_event_series_as_staff(
      'a2000000-0000-4000-8000-000000000001',
      context.series_id,
      'a4000000-0000-4000-8000-000000000006',
      1
    )
    from test_series_context context
    where context.name = 'inactive'
  $$,
  '55000',
  null,
  'an inactive series cannot be extended'
);

select lives_ok(
  $$
    select public.create_event_as_staff_v2(
      'a2000000-0000-4000-8000-000000000001',
      'a4000000-0000-4000-8000-000000000007',
      '2027-04-05 20:30',
      'Série do manager',
      'friendly',
      'split_teams',
      'society',
      90,
      120,
      2
    )
  $$,
  'owner creates a third active series'
);

insert into test_series_context (name, series_id)
select
  'manager',
  (
    public.create_event_as_staff_v2(
      'a2000000-0000-4000-8000-000000000001',
      'a4000000-0000-4000-8000-000000000007',
      '2027-04-05 20:30',
      'Série do manager',
      'friendly',
      'split_teams',
      'society',
      90,
      120,
      2
    )
  ).series_id;

select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000002',
  true
);

select lives_ok(
  $$
    select public.extend_event_series_as_staff(
      'a2000000-0000-4000-8000-000000000001',
      context.series_id,
      'a4000000-0000-4000-8000-000000000008',
      1
    )
    from test_series_context context
    where context.name = 'manager'
  $$,
  'an active manager may extend a team series'
);

select is(
  (
    select count(*)
    from public.events event
    join test_series_context context on context.series_id = event.series_id
    where context.name = 'manager'
  ),
  3::bigint,
  'the manager extension appends one occurrence'
);

select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000003',
  true
);

select throws_ok(
  $$
    select public.extend_event_series_as_staff(
      'a2000000-0000-4000-8000-000000000001',
      context.series_id,
      'a4000000-0000-4000-8000-000000000009',
      1
    )
    from test_series_context context
    where context.name = 'manager'
  $$,
  '42501',
  null,
  'a user from another team cannot extend the series'
);

select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000001',
  true
);

select lives_ok(
  $$
    select public.set_team_feature_flag(
      'a2000000-0000-4000-8000-000000000001',
      'event_control',
      false
    )
  $$,
  'owner can disable event control after the pilot'
);

select throws_ok(
  $$
    select public.extend_event_series_as_staff(
      'a2000000-0000-4000-8000-000000000001',
      context.series_id,
      'a4000000-0000-4000-8000-000000000010',
      1
    )
    from test_series_context context
    where context.name = 'manager'
  $$,
  '42501',
  null,
  'the extension workflow fails closed when the flag is disabled'
);

select * from finish();
rollback;
