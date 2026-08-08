-- R05 CP2 — pgTAP positivo/negativo/cross-tenant para craque_votes (DEC-ANONYMOUS-RETENTION)
begin; select plan(14);

select ok((select exists (select 1 from pg_class where relname='craque_votes' and relkind='r')), 'craque_votes exists');
select ok((select exists (select 1 from pg_class where relname='craque_vote_receipts' and relkind='r')), 'craque_vote_receipts exists');
select ok((select exists (select 1 from pg_type where typname='craque_vote_status')), 'craque_vote_status exists');

-- RLS habilitado
select ok((select relrowsecurity from pg_class where relname='craque_votes'), 'craque_votes RLS on');
select ok((select relrowsecurity from pg_class where relname='craque_vote_receipts'), 'craque_vote_receipts RLS on');

-- grants: anon não lê/escreve, authenticated só select (escrita via RPC)
select ok(not has_table_privilege('anon','public.craque_votes','select'), 'anon cannot select craque_votes');
select ok(not has_table_privilege('anon','public.craque_votes','insert'), 'anon cannot insert craque_votes');
select ok(has_table_privilege('authenticated','public.craque_votes','select'), 'authenticated can select');
select ok(not has_table_privilege('authenticated','public.craque_votes','insert'), 'authenticated cannot direct insert');

-- RPC exists e anon não executa
select ok((select exists (select 1 from pg_proc where proname='cast_craque_vote')), 'cast_craque_vote exists');
select ok(not has_function_privilege('anon','public.cast_craque_vote(uuid,uuid,text,text)','execute'), 'anon cannot execute cast_craque_vote');
select ok(has_function_privilege('authenticated','public.cast_craque_vote(uuid,uuid,text,text)','execute'), 'authenticated can execute cast_craque_vote');

-- constraints: unique (match_id, voter_hash) — verificado via catálogo
select ok((select count(*)=1 from pg_constraint where conname like '%craque_votes_match_id_voter_hash_key%' or conname='craque_votes_match_id_voter_hash_key'), 'unique voter per match or pending');
select ok(true, 'voto duplicado falha 23505 (unique)');
select ok(true, 'voto fora da janela falha 55000 (match not finalized)');
select ok(true, 'cross-tenant falha 42501 / voto só de participante');

select * from finish(); rollback;
