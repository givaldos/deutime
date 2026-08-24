begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(9);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'f2400000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'perfil-um@example.test', '', now(),
    '{}', '{"display_name":"Perfil Um"}', now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-8000-000000000000',
    'f2400000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'perfil-dois@example.test', '', now(),
    '{}', '{"display_name":"Perfil Dois"}', now(), now(), '', '', '', ''
  );

insert into public.player_profiles (
  user_id, handle, display_name, phone_verified_at
) values (
  'f2400000-0000-4000-8000-000000000001',
  'perfil-pos-login', 'Perfil Um', now()
);

select has_function(
  'public', 'update_my_account_profile', array['text'],
  'a atualização transacional do perfil existe'
);

select ok(has_function_privilege(
  'authenticated', 'public.update_my_account_profile(text)', 'execute'
), 'authenticated pode atualizar o próprio perfil');

select ok(not has_function_privilege(
  'anon', 'public.update_my_account_profile(text)', 'execute'
), 'anon não pode executar a atualização');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'f2400000-0000-4000-8000-000000000001',
  true
);

select is(
  public.update_my_account_profile('  Nome Atualizado  '),
  'Nome Atualizado',
  'o nome é normalizado e devolvido para a sessão atual'
);
reset role;

select is((
  select display_name from public.profiles
  where user_id = 'f2400000-0000-4000-8000-000000000001'
), 'Nome Atualizado', 'o perfil da conta é atualizado');

select is((
  select display_name from public.player_profiles
  where user_id = 'f2400000-0000-4000-8000-000000000001'
), 'Nome Atualizado', 'a identidade esportiva vinculada permanece sincronizada');

select is((
  select display_name from public.profiles
  where user_id = 'f2400000-0000-4000-8000-000000000002'
), 'Perfil Dois', 'o perfil de outra pessoa não é alterado');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'f2400000-0000-4000-8000-000000000001',
  true
);
select throws_ok(
  $$select public.update_my_account_profile('A')$$,
  '22023', null,
  'nome inválido falha fechado'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select public.update_my_account_profile('Sem sessão')$$,
  '42501', null,
  'sessão ausente falha fechado'
);
reset role;

select * from finish();
rollback;
