begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(6);

select ok(
  'team_navigation_shell' = any(enum_range(null::public.feature_key)::text[]),
  'flag do invólucro de navegação existe no catálogo tipado'
);
select ok(
  not ('team_navigation_shell' = any(array(
    select feature::text from private.product_feature_keys() feature
  ))),
  'expansão permanece fora do rollout global'
);
select is(
  (select count(*) from public.team_feature_flags
   where feature = 'team_navigation_shell'),
  0::bigint,
  'expansão não ativa nem materializa a flag para times existentes'
);
select has_function(
  'public', 'is_team_feature_enabled', array['uuid', 'public.feature_key'],
  'leitura server-side reutiliza o contrato tipado existente'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.set_team_feature_flag(uuid,public.feature_key,boolean)',
    'execute'
  ),
  'anônimo não altera a capacidade'
);
select is(
  (select count(*) from private.product_feature_keys()),
  16::bigint,
  'catálogo produtivo permanece sem ativação implícita'
);

select * from finish();
rollback;
