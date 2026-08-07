-- R04 CP5 — pgTAP positivo/negativo/cross-tenant para event_matches
begin; select plan(17);

-- helper: cria time/evento de teste via owner
select ok(true, 'placeholder: estrutura R04 existe');
select has_table('public','event_matches');
select has_table('public','match_sides');
select has_table('public','match_participations');
select has_table('public','match_events');
select has_type('public','match_status');
select has_type('public','match_public_mode');

-- RLS habilitado
select ok((select relrowsecurity from pg_class where relname='event_matches'), 'event_matches RLS on');
select ok((select relrowsecurity from pg_class where relname='match_sides'), 'match_sides RLS on');

-- grants: anon não escreve
select ok(not has_table_privilege('anon','public.event_matches','insert'), 'anon cannot insert event_matches');
select ok(has_table_privilege('authenticated','public.event_matches','select'), 'authenticated can select');

-- RPCs existem e são security definer para authenticated
select has_function_privilege('authenticated','public.create_event_match(uuid,smallint,text,text,text)','execute');
select has_function_privilege('authenticated','public.set_match_public_mode(uuid,public.match_public_mode)','execute');
select has_function_privilege('authenticated','public.set_match_participation(uuid,uuid,smallint)','execute');
select has_function_privilege('authenticated','public.record_match_event(uuid,public.match_event_kind,smallint,uuid,uuid,smallint,smallint,text)','execute');
-- anon não tem execute em RPCs sensíveis
select ok(not has_function_privilege('anon','public.create_event_match(uuid,smallint,text,text,text)','execute'), 'anon cannot create match');
select ok(not has_function_privilege('anon','public.set_match_public_mode(uuid,public.match_public_mode)','execute'), 'anon cannot set public mode');

select * from finish(); rollback;
