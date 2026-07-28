begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(20);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  'b1000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'public-event-owner@example.test', '',
  now(), '{}'::jsonb, '{"display_name":"Public Event Owner"}'::jsonb,
  now(), now(), '', '', '', ''
);

insert into public.teams (
  id, name, slug, timezone, default_sport_format, is_public, created_by
)
values
  (
    'b2000000-0000-4000-8000-000000000001',
    'Evento Público Ativo',
    'evento-publico-ativo',
    'America/Sao_Paulo',
    'society',
    true,
    'b1000000-0000-4000-8000-000000000001'
  ),
  (
    'b2000000-0000-4000-8000-000000000002',
    'Perfil Privado com Evento',
    'perfil-privado-evento',
    'America/Recife',
    'futsal',
    false,
    'b1000000-0000-4000-8000-000000000001'
  ),
  (
    'b2000000-0000-4000-8000-000000000003',
    'Evento Público Desligado',
    'evento-publico-desligado',
    'America/Manaus',
    'field',
    true,
    'b1000000-0000-4000-8000-000000000001'
  );

insert into public.team_feature_flags (
  team_id, feature, enabled, updated_by
)
values
  (
    'b2000000-0000-4000-8000-000000000001',
    'public_event_page',
    true,
    'b1000000-0000-4000-8000-000000000001'
  ),
  (
    'b2000000-0000-4000-8000-000000000002',
    'public_event_page',
    true,
    'b1000000-0000-4000-8000-000000000001'
  );

insert into public.events (
  id, public_id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, opponent_name, status, created_by,
  cancelled_at, cancelled_by
)
values
  (
    'b3000000-0000-4000-8000-000000000001',
    'b4000000-0000-4000-8000-000000000001',
    'b2000000-0000-4000-8000-000000000001',
    'Próximo racha',
    'weekly_match',
    'split_teams',
    'society',
    now() + interval '2 days',
    now() + interval '2 days 90 minutes',
    null,
    'scheduled',
    'b1000000-0000-4000-8000-000000000001',
    null,
    null
  ),
  (
    'b3000000-0000-4000-8000-000000000002',
    'b4000000-0000-4000-8000-000000000002',
    'b2000000-0000-4000-8000-000000000001',
    'Evento cancelado',
    'friendly',
    'single_squad',
    'society',
    now() + interval '3 days',
    now() + interval '3 days 90 minutes',
    'Adversário',
    'cancelled',
    'b1000000-0000-4000-8000-000000000001',
    now(),
    'b1000000-0000-4000-8000-000000000001'
  ),
  (
    'b3000000-0000-4000-8000-000000000003',
    'b4000000-0000-4000-8000-000000000003',
    'b2000000-0000-4000-8000-000000000001',
    'Evento concluído',
    'championship',
    'single_squad',
    'society',
    now() - interval '3 days',
    now() - interval '3 days' + interval '90 minutes',
    'Finalista',
    'completed',
    'b1000000-0000-4000-8000-000000000001',
    null,
    null
  ),
  (
    'b3000000-0000-4000-8000-000000000004',
    'b4000000-0000-4000-8000-000000000004',
    'b2000000-0000-4000-8000-000000000002',
    'Evento de perfil privado',
    'training',
    'single_squad',
    'futsal',
    now() + interval '1 day',
    now() + interval '1 day 60 minutes',
    null,
    'scheduled',
    'b1000000-0000-4000-8000-000000000001',
    null,
    null
  ),
  (
    'b3000000-0000-4000-8000-000000000005',
    'b4000000-0000-4000-8000-000000000005',
    'b2000000-0000-4000-8000-000000000003',
    'Evento sem flag',
    'other',
    'single_squad',
    'field',
    now() + interval '1 day',
    now() + interval '1 day 90 minutes',
    null,
    'scheduled',
    'b1000000-0000-4000-8000-000000000001',
    null,
    null
  ),
  (
    'b3000000-0000-4000-8000-000000000006',
    default,
    'b2000000-0000-4000-8000-000000000001',
    'Evento com identificador gerado',
    'training',
    'single_squad',
    'society',
    now() + interval '4 days',
    now() + interval '4 days 90 minutes',
    null,
    'scheduled',
    'b1000000-0000-4000-8000-000000000001',
    null,
    null
  );

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'public_id'
      and data_type = 'uuid'
      and is_nullable = 'NO'
      and column_default like '%gen_random_uuid%'
  ),
  'events has a required generated UUID public identifier'
);
select ok(
  exists (
    select 1
    from pg_constraint constraint_row
    join pg_attribute attribute_row
      on attribute_row.attrelid = constraint_row.conrelid
      and attribute_row.attnum = any (constraint_row.conkey)
    where constraint_row.conrelid = 'public.events'::regclass
      and constraint_row.contype = 'u'
      and attribute_row.attname = 'public_id'
  ),
  'public event identifiers are unique'
);
select ok(
  (
    select public_id is not null and public_id <> id
    from public.events
    where id = 'b3000000-0000-4000-8000-000000000006'
  ),
  'new events receive a public identifier distinct from the internal id'
);
select throws_ok(
  $$
    insert into public.events (
      public_id, team_id, title, kind, sport_format, starts_at, ends_at,
      created_by
    )
    values (
      'b4000000-0000-4000-8000-000000000001',
      'b2000000-0000-4000-8000-000000000001',
      'Identificador duplicado',
      'other',
      'society',
      now() + interval '8 days',
      now() + interval '8 days 90 minutes',
      'b1000000-0000-4000-8000-000000000001'
    )
  $$,
  '23505',
  null,
  'a public identifier cannot be reused'
);
select throws_ok(
  $$
    update public.events
    set public_id = 'b4000000-0000-4000-8000-000000000099'
    where id = 'b3000000-0000-4000-8000-000000000001'
  $$,
  '22023',
  null,
  'the canonical public identifier is immutable'
);
select is(
  (
    select array_agg(enum_value order by enum_value)
    from (
      select unnest(enum_range(null::public.feature_key))::text as enum_value
    ) values_list
    where enum_value in (
      'public_event_page',
      'event_capability_exchange',
      'event_capability_rsvp'
    )
  ),
  array[
    'event_capability_exchange',
    'event_capability_rsvp',
    'public_event_page'
  ]::text[],
  'R02 capabilities have independent feature flags'
);
select ok(
  has_table_privilege('anon', 'public.public_event_directory', 'SELECT'),
  'anonymous visitors may read the minimal event projection'
);
select ok(
  has_table_privilege('authenticated', 'public.public_event_directory', 'SELECT'),
  'authenticated visitors may read the same minimal event projection'
);
select ok(
  not has_table_privilege('anon', 'public.public_event_directory', 'INSERT'),
  'anonymous visitors cannot write through the event projection'
);
select is(
  (
    select array_agg(column_name::text order by ordinal_position)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_event_directory'
  ),
  array[
    'public_id',
    'team_name',
    'team_timezone',
    'title',
    'kind',
    'sport_format',
    'starts_at',
    'ends_at',
    'opponent_name',
    'status'
  ]::text[],
  'the anonymous projection exposes only the approved contract'
);
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_event_directory'
      and column_name in (
        'id',
        'team_id',
        'team_slug',
        'venue_id',
        'address',
        'attendance_deadline',
        'athlete_id',
        'created_by',
        'cancelled_by'
      )
  ),
  'internal ids, venue, attendance, athlete and audit fields stay private'
);

set local role anon;

select is(
  (
    select count(*)
    from public.public_event_directory
    where team_name = 'Evento Público Ativo'
  ),
  4::bigint,
  'an enabled team publishes events from every lifecycle phase'
);
select is(
  (
    select count(*)
    from public.public_event_directory
    where team_name = 'Evento Público Desligado'
  ),
  0::bigint,
  'a team without the page flag remains hidden'
);
select is(
  (
    select count(*)
    from public.public_event_directory
    where team_name = 'Perfil Privado com Evento'
  ),
  1::bigint,
  'event publication is independent from the team profile visibility'
);
select is(
  (
    select status
    from public.public_event_directory
    where public_id = 'b4000000-0000-4000-8000-000000000001'
  ),
  'scheduled'::public.event_status,
  'the public projection reports a scheduled event'
);
select is(
  (
    select status
    from public.public_event_directory
    where public_id = 'b4000000-0000-4000-8000-000000000002'
  ),
  'cancelled'::public.event_status,
  'a cancelled event remains publicly informative'
);
select is(
  (
    select status
    from public.public_event_directory
    where public_id = 'b4000000-0000-4000-8000-000000000003'
  ),
  'completed'::public.event_status,
  'a completed event remains available at the same identifier'
);
select is(
  (
    select team_timezone
    from public.public_event_directory
    where public_id = 'b4000000-0000-4000-8000-000000000004'
  ),
  'America/Recife'::text,
  'the public contract carries the authoritative team timezone'
);
select is(
  (
    select count(*)
    from public.public_event_directory
    where public_id = 'b3000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'the internal event id is not accepted as a public identifier'
);
select is(
  (
    select count(*)
    from public.public_team_upcoming_events
    where event_id = 'b3000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'the legacy public schedule remains compatible during expansion'
);

select * from finish();
rollback;
