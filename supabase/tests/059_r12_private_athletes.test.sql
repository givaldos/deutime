begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(17);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'a1200000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'r12-owner@example.test', '', now(),
    '{}', '{}', now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1200000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'r12-other@example.test', '', now(),
    '{}', '{}', now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1200000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'r12-player@example.test', '', now(),
    '{}', '{}', now(), now(), '', '', '', ''
  );

insert into public.teams (id, name, slug, default_sport_format, created_by)
values
  ('b1200000-0000-4000-8000-000000000001', 'R12 Privado', 'r12-privado', 'society', 'a1200000-0000-4000-8000-000000000001'),
  ('b1200000-0000-4000-8000-000000000002', 'R12 Outro', 'r12-outro', 'society', 'a1200000-0000-4000-8000-000000000002');

insert into public.team_memberships (team_id, user_id, role, status)
values
  ('b1200000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001', 'owner', 'active'),
  ('b1200000-0000-4000-8000-000000000002', 'a1200000-0000-4000-8000-000000000002', 'owner', 'active')
on conflict (team_id, user_id) do nothing;

insert into public.player_profiles (
  user_id, handle, display_name, preferred_name, is_public, phone_verified_at
) values (
  'a1200000-0000-4000-8000-000000000003',
  'r12-player', 'R12 Player', 'Player', true, now()
);

insert into public.athletes (
  id, team_id, user_id, full_name, preferred_name, status,
  registration_source, public_profile, created_by
) values
  (
    'c1200000-0000-4000-8000-000000000001',
    'b1200000-0000-4000-8000-000000000001', null,
    'Legado Administrativo', 'Legado', 'active', 'admin', true,
    'a1200000-0000-4000-8000-000000000001'
  ),
  (
    'c1200000-0000-4000-8000-000000000002',
    'b1200000-0000-4000-8000-000000000001',
    'a1200000-0000-4000-8000-000000000003',
    'R12 Player', 'Player', 'active', 'public_form', true,
    'a1200000-0000-4000-8000-000000000003'
  );

delete from public.athlete_public_consents
where athlete_id = 'c1200000-0000-4000-8000-000000000002'
  and purpose = 'public_player_profile';

select is(
  (select public_profile from public.athletes where id = 'c1200000-0000-4000-8000-000000000001'),
  false,
  'bypass direto permanece privado para atleta não reivindicado'
);
select is(
  (select count(*) from public.public_athlete_directory where team_slug = 'r12-privado'),
  0::bigint,
  'diretório omite atleta não reivindicado e perfil sem consentimento versionado'
);
select is(
  (select count(*) from public.public_player_directory where handle = 'r12-player'),
  0::bigint,
  'perfil ampliado exige consentimento versionado vigente'
);
select is(
  (select count(*) from public.get_public_player_statistics('r12-player')),
  0::bigint,
  'estatísticas ampliadas fecham sem consentimentos vigentes'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1200000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$select public.create_athlete_as_staff(
    'b1200000-0000-4000-8000-000000000001', 'Cliente Antigo', 'Antigo',
    9, null, null, null, true, array['MID']
  )$$,
  'cliente administrativo antigo continua compatível'
);
select is(
  (select public_profile from public.athletes where full_name = 'Cliente Antigo'),
  false,
  'RPC de criação ignora tentativa administrativa de publicação'
);
select lives_ok(
  $$select public.update_athlete_as_admin(
    requested_athlete_id => 'c1200000-0000-4000-8000-000000000001',
    athlete_full_name => 'Legado Atualizado',
    athlete_preferred_name => 'Atualizado',
    athlete_public_profile => true,
    position_codes => array['MID']
  )$$,
  'edição administrativa antiga continua compatível'
);
select is(
  (select public_profile from public.athletes where id = 'c1200000-0000-4000-8000-000000000001'),
  false,
  'RPC de edição mantém identidade provisória privada'
);

select set_config('request.jwt.claim.sub', 'a1200000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.update_athlete_as_admin(
    requested_athlete_id => 'c1200000-0000-4000-8000-000000000001',
    athlete_full_name => 'Ataque cruzado',
    athlete_preferred_name => 'Ataque',
    athlete_public_profile => true,
    position_codes => array['MID']
  )$$,
  '42501',
  'Team owner or admin access required',
  'membro de outro time não altera nem publica o atleta'
);

select set_config('request.jwt.claim.sub', 'a1200000-0000-4000-8000-000000000003', true);
select lives_ok(
  $$select public.update_my_player_profile(
    'r12-player', 'R12 Player', 'Player', '', true,
    array[]::text[], array['MID']::text[], array[]::text[]
  )$$,
  'somente o atleta publica o próprio perfil'
);
select is(
  (select status::text from public.athlete_public_consents
   where athlete_id = 'c1200000-0000-4000-8000-000000000002'
     and purpose = 'public_player_profile'),
  'granted',
  'publicação própria registra consentimento versionado'
);
select is(
  (select count(*) from public.public_athlete_directory where team_slug = 'r12-privado'),
  1::bigint,
  'diretório mostra somente atleta reivindicado e consentido'
);
select is(
  (select count(*) from public.public_player_directory where handle = 'r12-player'),
  1::bigint,
  'perfil próprio aparece com consentimento vigente'
);

select lives_ok(
  $$select public.update_my_player_profile(
    'r12-player', 'R12 Player', 'Player', '', false,
    array[]::text[], array['MID']::text[], array[]::text[]
  )$$,
  'atleta revoga a publicação sem suporte'
);
select is(
  (select status::text from public.athlete_public_consents
   where athlete_id = 'c1200000-0000-4000-8000-000000000002'
     and purpose = 'public_player_profile'),
  'revoked',
  'revogação própria atualiza o consentimento'
);
select is(
  (select count(*) from public.public_athlete_directory where team_slug = 'r12-privado'),
  0::bigint,
  'revogação remove identidade pública sem apagar o vínculo'
);
select ok(
  exists (
    select 1 from public.athletes
    where id = 'c1200000-0000-4000-8000-000000000002'
      and status = 'active' and user_id = 'a1200000-0000-4000-8000-000000000003'
  ),
  'revogação preserva o fato interno e o vínculo esportivo'
);

select * from finish();
rollback;
