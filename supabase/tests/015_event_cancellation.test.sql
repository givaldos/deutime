begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(25);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'cancel-owner@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Cancel Owner"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'cancel-manager@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Cancel Manager"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'cancel-outsider@example.test', '', now(),
    '{}'::jsonb, '{"display_name":"Cancel Outsider"}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.teams (
  id, name, slug, timezone, default_sport_format, created_by
)
values
  (
    '92000000-0000-4000-8000-000000000001',
    'Cancel Alpha',
    'cancel-alpha',
    'America/Sao_Paulo',
    'society',
    '91000000-0000-4000-8000-000000000001'
  ),
  (
    '92000000-0000-4000-8000-000000000002',
    'Cancel Beta',
    'cancel-beta',
    'America/Sao_Paulo',
    'futsal',
    '91000000-0000-4000-8000-000000000003'
  );

insert into public.team_memberships (team_id, user_id, role, status)
values (
  '92000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000002',
  'manager',
  'active'
);

insert into public.athletes (
  id, team_id, full_name, status, registration_source
)
values (
  '93000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001',
  'Atleta com histórico',
  'active',
  'admin'
);

insert into public.events (
  id,
  team_id,
  title,
  kind,
  organization_mode,
  sport_format,
  starts_at,
  ends_at,
  status,
  created_by
)
values (
  '94000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000002',
  'Evento com flag desligada',
  'friendly',
  'single_squad',
  'futsal',
  now() + interval '40 days',
  now() + interval '40 days 90 minutes',
  'scheduled',
  '91000000-0000-4000-8000-000000000003'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.cancel_event_as_staff(uuid,uuid,uuid,text)',
    'EXECUTE'
  ),
  'authenticated users can reach the guarded cancellation workflow'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-4000-8000-000000000001',
  true
);

select lives_ok(
  $$
    select public.set_team_feature_flag(
      '92000000-0000-4000-8000-000000000001',
      'event_control',
      true
    )
  $$,
  'owner enables event control for the cancellation test team'
);

select lives_ok(
  $$
    select public.create_event_as_staff_v2(
      '92000000-0000-4000-8000-000000000001',
      '95000000-0000-4000-8000-000000000001',
      '2027-02-04 20:30',
      'Série para cancelamento',
      'weekly_match',
      'split_teams',
      'society',
      90,
      120,
      4,
      null,
      'Arena histórica',
      'Rua da memória, 10'
    )
  $$,
  'owner creates the recurring series used by cancellation tests'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-4000-8000-000000000002',
  true
);

select lives_ok(
  $$
    select public.set_event_attendance_as_staff(
      (
        select e.id
        from public.events e
        where e.team_id = '92000000-0000-4000-8000-000000000001'
          and e.series_position = 2
      ),
      '93000000-0000-4000-8000-000000000001',
      'confirmed'
    )
  $$,
  'manager records attendance before cancellation'
);

reset role;

insert into public.match_reports (
  event_id,
  team_id,
  side_a_label,
  side_b_label,
  side_a_score,
  side_b_score,
  notes,
  created_by
)
select
  e.id,
  e.team_id,
  'Verde',
  'Branco',
  2,
  1,
  'Súmula preservada',
  '91000000-0000-4000-8000-000000000002'
from public.events e
where e.team_id = '92000000-0000-4000-8000-000000000001'
  and e.series_position = 2;

insert into public.event_squads (
  event_id,
  team_id,
  sport_format,
  name,
  sort_order,
  is_official
)
select
  e.id,
  e.team_id,
  e.sport_format,
  'Time Verde',
  1,
  true
from public.events e
where e.team_id = '92000000-0000-4000-8000-000000000001'
  and e.series_position = 2;

insert into public.notification_outbox (
  team_id,
  event_id,
  channel,
  template_key,
  recipient,
  status,
  processed_at,
  dedupe_key
)
select
  e.team_id,
  e.id,
  'email',
  'event.reminder',
  'athlete@example.test',
  message_state.value,
  case when message_state.value = 'sent' then now() else null end,
  'cancel-' || message_state.value::text || '-' || e.id::text
from public.events e
cross join unnest(
  array['pending', 'failed', 'sent']::public.message_status[]
) as message_state(value)
where e.team_id = '92000000-0000-4000-8000-000000000001'
  and e.series_position = 2;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-4000-8000-000000000002',
  true
);

select lives_ok(
  $$
    select public.cancel_event_as_staff(
      '92000000-0000-4000-8000-000000000001',
      (
        select e.id
        from public.events e
        where e.team_id = '92000000-0000-4000-8000-000000000001'
          and e.series_position = 2
      ),
      '95000000-0000-4000-8000-000000000002',
      'single_event'
    )
  $$,
  'manager soft-cancels one occurrence'
);
select ok(
  (
    select
      e.status = 'cancelled'
      and e.cancelled_at is not null
      and e.cancelled_by = '91000000-0000-4000-8000-000000000002'
      and e.schedule_version = 2
      and e.is_series_exception
    from public.events e
    where e.team_id = '92000000-0000-4000-8000-000000000001'
      and e.series_position = 2
  ),
  'single cancellation records actor, time, version and series exception'
);
select is(
  (
    select count(*)
    from public.events e
    where e.team_id = '92000000-0000-4000-8000-000000000001'
      and e.status = 'scheduled'
  ),
  3::bigint,
  'single cancellation leaves the other occurrences scheduled'
);
select ok(
  (
    select series.is_active
    from public.event_series series
    where series.team_id = '92000000-0000-4000-8000-000000000001'
  ),
  'single cancellation keeps the recurring series active'
);
select is(
  (
    select attendance.status
    from public.event_attendance attendance
    join public.events e on e.id = attendance.event_id
    where e.team_id = '92000000-0000-4000-8000-000000000001'
      and e.series_position = 2
      and attendance.athlete_id = '93000000-0000-4000-8000-000000000001'
  ),
  'confirmed'::public.attendance_status,
  'cancellation preserves the attendance response'
);
select is(
  (
    select count(*)
    from public.match_reports report
    join public.events e on e.id = report.event_id
    where e.team_id = '92000000-0000-4000-8000-000000000001'
      and e.series_position = 2
      and report.notes = 'Súmula preservada'
  ),
  1::bigint,
  'cancellation preserves the match report'
);
select is(
  (
    select count(*)
    from public.event_squads squad
    join public.events e on e.id = squad.event_id
    where e.team_id = '92000000-0000-4000-8000-000000000001'
      and e.series_position = 2
  ),
  1::bigint,
  'cancellation preserves assembled squads'
);

reset role;

select is(
  (
    select string_agg(outbox.status::text, '|' order by outbox.dedupe_key)
    from public.notification_outbox outbox
    join public.events e on e.id = outbox.event_id
    where e.team_id = '92000000-0000-4000-8000-000000000001'
      and e.series_position = 2
  ),
  'cancelled|cancelled|sent',
  'pending and failed notifications are cancelled while sent history remains'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-4000-8000-000000000002',
  true
);

select ok(
  (
    select
      change.kind = 'cancelled'
      and change.previous_status = 'scheduled'
      and change.next_status = 'cancelled'
      and change.previous_starts_at = change.next_starts_at
    from public.event_changes change
    join public.events e on e.id = change.event_id
    where e.team_id = '92000000-0000-4000-8000-000000000001'
      and e.series_position = 2
      and change.schedule_version = 2
  ),
  'the change stream identifies cancellation without date heuristics'
);
select ok(
  (
    select (public.cancel_event_as_staff(
      '92000000-0000-4000-8000-000000000001',
      (
        select e.id
        from public.events e
        where e.team_id = '92000000-0000-4000-8000-000000000001'
          and e.series_position = 2
      ),
      '95000000-0000-4000-8000-000000000002',
      'single_event'
    )).replayed
  ),
  'an identical cancellation retry returns the persisted result'
);
select is(
  (
    select count(*)
    from public.event_changes change
    join public.events e on e.id = change.event_id
    where e.team_id = '92000000-0000-4000-8000-000000000001'
      and e.series_position = 2
      and change.kind = 'cancelled'
  ),
  1::bigint,
  'a cancellation retry does not duplicate the change'
);
select throws_ok(
  $$
    select public.cancel_event_as_staff(
      '92000000-0000-4000-8000-000000000001',
      (
        select e.id
        from public.events e
        where e.team_id = '92000000-0000-4000-8000-000000000001'
          and e.series_position = 2
      ),
      '95000000-0000-4000-8000-000000000002',
      'this_and_future'
    )
  $$,
  '22023',
  null,
  'reusing a request id with a different cancellation scope is rejected'
);
select throws_ok(
  $$
    select public.cancel_event_as_staff(
      '92000000-0000-4000-8000-000000000001',
      (
        select e.id
        from public.events e
        where e.team_id = '92000000-0000-4000-8000-000000000001'
          and e.series_position = 2
      ),
      '95000000-0000-4000-8000-000000000003',
      'single_event'
    )
  $$,
  '55000',
  null,
  'a cancelled event rejects a different command'
);

select lives_ok(
  $$
    select public.cancel_event_as_staff(
      '92000000-0000-4000-8000-000000000001',
      (
        select e.id
        from public.events e
        where e.team_id = '92000000-0000-4000-8000-000000000001'
          and e.series_position = 3
      ),
      '95000000-0000-4000-8000-000000000004',
      'this_and_future'
    )
  $$,
  'manager cancels the selected and every future scheduled occurrence'
);
select is(
  (
    select string_agg(e.status::text, '|' order by e.series_position)
    from public.events e
    where e.team_id = '92000000-0000-4000-8000-000000000001'
  ),
  'scheduled|cancelled|cancelled|cancelled',
  'future cancellation preserves the past side and cancels the remaining side'
);
select ok(
  not (
    select series.is_active
    from public.event_series series
    where series.team_id = '92000000-0000-4000-8000-000000000001'
  ),
  'future cancellation deactivates the series'
);
select is(
  (
    select count(*)
    from public.event_changes change
    where change.team_id = '92000000-0000-4000-8000-000000000001'
      and change.kind = 'cancelled'
  ),
  3::bigint,
  'the change stream has one cancellation per affected occurrence'
);
select is(
  (
    select count(*)
    from public.events e
    where e.team_id = '92000000-0000-4000-8000-000000000001'
  ),
  4::bigint,
  'soft cancellation never deletes event occurrences'
);

reset role;
select is(
  (
    select count(*)
    from public.audit_logs audit
    where audit.team_id = '92000000-0000-4000-8000-000000000001'
      and audit.action = 'event.cancelled'
  ),
  2::bigint,
  'each logical cancellation command writes one audit record'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-4000-8000-000000000003',
  true
);

select throws_ok(
  $$
    select public.cancel_event_as_staff(
      '92000000-0000-4000-8000-000000000001',
      (
        select e.id
        from public.events e
        where e.team_id = '92000000-0000-4000-8000-000000000001'
        limit 1
      ),
      '95000000-0000-4000-8000-000000000005',
      'single_event'
    )
  $$,
  '42501',
  null,
  'staff from another tenant cannot cancel the event'
);
select throws_ok(
  $$
    select public.cancel_event_as_staff(
      '92000000-0000-4000-8000-000000000002',
      '94000000-0000-4000-8000-000000000001',
      '95000000-0000-4000-8000-000000000006',
      'single_event'
    )
  $$,
  '42501',
  null,
  'the cancellation workflow fails closed while the feature is disabled'
);

select * from finish();
rollback;
