begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(14);

select has_table('private', 'rate_limit_attempts', 'tabela de tentativas existe');
select ok(
  (select relrowsecurity from pg_class where oid = 'private.rate_limit_attempts'::regclass),
  'tentativas usam RLS'
);
select has_function('private', 'check_rate_limit', array['text', 'text', 'integer', 'integer'], 'helper de teto existe');
select ok(
  (select prosecdef from pg_proc where oid = 'private.check_rate_limit(text,text,integer,integer)'::regprocedure),
  'helper roda como security definer'
);
select ok(
  not has_function_privilege('public', 'private.check_rate_limit(text,text,integer,integer)', 'execute'),
  'helper não é executável pelo public'
);

select lives_ok(
  $$
    select private.check_rate_limit('rl-atleta', 'rl-escopo-a', 2, 3600)
    from generate_series(1, 2)
  $$,
  'chamadas dentro do teto passam'
);
select throws_ok(
  $$ select private.check_rate_limit('rl-atleta', 'rl-escopo-a', 2, 3600) $$,
  '54000',
  null,
  'chamada acima do teto é recusada com 54000'
);
select lives_ok(
  $$ select private.check_rate_limit('rl-atleta', 'rl-escopo-b', 2, 3600) $$,
  'escopos distintos não se contaminam'
);

insert into private.rate_limit_attempts (action, scope, attempted_at)
values ('rl-limpeza', 'rl-escopo', now() - interval '2 hours');
select lives_ok(
  $$ select private.check_rate_limit('rl-limpeza', 'rl-escopo', 5, 3600) $$,
  'janela expirada libera nova tentativa'
);
select is(
  (select count(*) from private.rate_limit_attempts where action = 'rl-limpeza' and scope = 'rl-escopo'),
  1::bigint,
  'linhas fora da janela são podadas'
);

select throws_ok(
  $$ select private.check_rate_limit('rl-invalido', 'rl-escopo', 0, 3600) $$,
  '22023',
  null,
  'configuração inválida é rejeitada'
);

select ok(
  (select prosrc from pg_proc where oid = 'public.complete_verified_athlete_registration(text,text,text,text,boolean,boolean,text[])'::regprocedure)
    like '%check_rate_limit%',
  'conclusão de cadastro impõe teto'
);
select ok(
  (select prosrc from pg_proc where oid = 'public.exchange_event_access_credential(uuid,text)'::regprocedure)
    like '%check_rate_limit%',
  'troca de capability impõe teto'
);

set local role authenticated;
select throws_ok(
  $$ select private.check_rate_limit('rl-direto', 'rl-escopo', 5, 3600) $$,
  '42501',
  null,
  'authenticated não chama o helper diretamente'
);
reset role;

select * from finish();
rollback;
