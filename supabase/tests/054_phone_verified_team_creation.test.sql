begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(8);

insert into auth.users (
  instance_id, id, aud, role, email, phone, encrypted_password,
  email_confirmed_at, phone_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, confirmation_token,
  email_change, email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'f2300000-0000-4000-8000-000000000001',
    'authenticated','authenticated',null,'5511999998801','',null,now(),
    '{}','{}',now(),now(),'','','',''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f2300000-0000-4000-8000-000000000002',
    'authenticated','authenticated','unverified-r10@example.test',
    '5511999998802','',null,null,'{}','{}',now(),now(),'','','',''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f2300000-0000-4000-8000-000000000003',
    'authenticated','authenticated',null,null,'',null,null,
    '{}','{}',now(),now(),'','','',''
  );

insert into public.player_profiles (
  user_id,handle,display_name,is_public,phone_verified_at
) values (
  'f2300000-0000-4000-8000-000000000003',
  'perfil-whatsapp-verificado','Perfil WhatsApp',false,now()
);

select ok(has_function_privilege(
  'authenticated',
  'public.create_team_for_current_user(text,text,public.sport_format)',
  'execute'
), 'authenticated preserva acesso à RPC protegida');
select ok(not has_function_privilege(
  'anon',
  'public.create_team_for_current_user(text,text,public.sport_format)',
  'execute'
), 'anon continua sem acesso à criação');

set local role authenticated;
select set_config('request.jwt.claim.sub','f2300000-0000-4000-8000-000000000001',true);
select is(
  public.create_team_for_current_user(
    'Time WhatsApp Verificado','time-whatsapp-verificado','society'
  ),
  'time-whatsapp-verificado',
  'telefone confirmado cria time pela RPC guardada'
);
reset role;

select is((
  select membership.role::text || ':' || membership.status::text
  from public.team_memberships membership
  join public.teams team on team.id = membership.team_id
  where team.slug = 'time-whatsapp-verificado'
    and membership.user_id = 'f2300000-0000-4000-8000-000000000001'
), 'owner:active', 'criação por telefone estabelece owner ativo');

select is((
  select team.created_by
  from public.teams team
  where team.slug = 'time-whatsapp-verificado'
), 'f2300000-0000-4000-8000-000000000001'::uuid,
  'identidade continua derivada da sessão verificada');

set local role authenticated;
select set_config('request.jwt.claim.sub','f2300000-0000-4000-8000-000000000002',true);
select throws_ok(
  $$select public.create_team_for_current_user(
    'Time Não Verificado','time-nao-verificado','society'
  )$$,
  '42501',null,
  'email e telefone não confirmados continuam negados'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f2300000-0000-4000-8000-000000000003',true);
select is(
  public.create_team_for_current_user(
    'Time Perfil Verificado','time-perfil-verificado','futsal'
  ),
  'time-perfil-verificado',
  'perfil WhatsApp imutável preserva a identidade verificada'
);
reset role;

select is((
  select membership.role::text || ':' || membership.status::text
  from public.team_memberships membership
  join public.teams team on team.id = membership.team_id
  where team.slug = 'time-perfil-verificado'
    and membership.user_id = 'f2300000-0000-4000-8000-000000000003'
), 'owner:active', 'perfil verificado estabelece owner ativo');

select * from finish();
rollback;
