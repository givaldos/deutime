begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(5);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'f2600000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'r12-slug@example.test', '', now(),
  '{}', '{}', now(), now(), '', '', '', ''
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'f2600000-0000-4000-8000-000000000001',
  true
);

select is(
  public.create_team_for_current_user(
    'Time R12', ' TIME-R12-VALIDO ', 'society'
  ),
  'time-r12-valido',
  'RPC normaliza letras e preserva hífens internos válidos'
);

select is((
  select membership.role::text || ':' || membership.status::text
  from public.team_memberships membership
  join public.teams team on team.id = membership.team_id
  where team.slug = 'time-r12-valido'
), 'owner:active', 'criação válida mantém o owner transacional');

select throws_ok(
  $$select public.create_team_for_current_user(
    'Time Repetido', 'time--repetido', 'society'
  )$$,
  '22023', null,
  'RPC rejeita hífen repetido antes do limite de criação'
);

select throws_ok(
  $$select public.create_team_for_current_user(
    'Time Extremidade', '-time-extremidade', 'society'
  )$$,
  '22023', null,
  'RPC rejeita hífen na extremidade'
);

reset role;

select throws_ok(
  $$insert into public.teams (
    name, slug, default_sport_format, timezone, created_by
  ) values (
    'Bypass R12', 'bypass--r12', 'society', 'America/Sao_Paulo',
    'f2600000-0000-4000-8000-000000000001'
  )$$,
  '23514', null,
  'constraint rejeita bypass direto com hífen repetido'
);

select * from finish();
rollback;
