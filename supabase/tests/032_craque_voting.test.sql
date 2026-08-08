begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(27);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '05000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'craque-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '05000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'craque-confirmed@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '05000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'craque-maybe@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '05000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'craque-pending@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '05000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'craque-outsider@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');

insert into public.teams (id, name, slug, created_by)
values
  ('05100000-0000-4000-8000-000000000001', 'Craque A', 'craque-a', '05000000-0000-4000-8000-000000000001'),
  ('05100000-0000-4000-8000-000000000002', 'Craque B', 'craque-b', '05000000-0000-4000-8000-000000000005');

insert into public.athletes (
  id, team_id, user_id, full_name, preferred_name, status, registration_source
)
values
  ('05200000-0000-4000-8000-000000000001', '05100000-0000-4000-8000-000000000001', '05000000-0000-4000-8000-000000000002', 'Craque Confirmado', 'Confirmado', 'active', 'public_form'),
  ('05200000-0000-4000-8000-000000000002', '05100000-0000-4000-8000-000000000001', '05000000-0000-4000-8000-000000000003', 'Craque Talvez', 'Talvez', 'active', 'public_form'),
  ('05200000-0000-4000-8000-000000000003', '05100000-0000-4000-8000-000000000001', '05000000-0000-4000-8000-000000000004', 'Craque Pendente', 'Pendente', 'active', 'public_form'),
  ('05200000-0000-4000-8000-000000000004', '05100000-0000-4000-8000-000000000001', null, 'Participante sem voto', 'Candidato', 'active', 'admin'),
  ('05200000-0000-4000-8000-000000000005', '05100000-0000-4000-8000-000000000001', null, 'Não participante', 'Fora', 'active', 'admin'),
  ('05200000-0000-4000-8000-000000000006', '05100000-0000-4000-8000-000000000002', '05000000-0000-4000-8000-000000000005', 'Outro Time', 'Outro', 'active', 'public_form');

insert into public.events (
  id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, attendance_deadline, status, created_by
)
values (
  '05300000-0000-4000-8000-000000000001',
  '05100000-0000-4000-8000-000000000001',
  'Partida do Craque',
  'weekly_match',
  'split_teams',
  'society',
  now() - interval '2 hours',
  now() - interval '30 minutes',
  now() - interval '3 hours',
  'scheduled',
  '05000000-0000-4000-8000-000000000001'
);

insert into public.event_attendance (event_id, team_id, athlete_id, status)
values
  ('05300000-0000-4000-8000-000000000001', '05100000-0000-4000-8000-000000000001', '05200000-0000-4000-8000-000000000001', 'confirmed'),
  ('05300000-0000-4000-8000-000000000001', '05100000-0000-4000-8000-000000000001', '05200000-0000-4000-8000-000000000002', 'maybe'),
  ('05300000-0000-4000-8000-000000000001', '05100000-0000-4000-8000-000000000001', '05200000-0000-4000-8000-000000000003', 'pending'),
  ('05300000-0000-4000-8000-000000000001', '05100000-0000-4000-8000-000000000001', '05200000-0000-4000-8000-000000000004', 'confirmed');

insert into public.team_feature_flags (team_id, feature, enabled, updated_by)
values (
  '05100000-0000-4000-8000-000000000001',
  'voting',
  true,
  '05000000-0000-4000-8000-000000000001'
);

insert into public.event_matches (
  id, event_id, team_id, ordinal, status, public_mode, created_by
)
values (
  '05400000-0000-4000-8000-000000000001',
  '05300000-0000-4000-8000-000000000001',
  '05100000-0000-4000-8000-000000000001',
  1,
  'scheduled',
  'private',
  '05000000-0000-4000-8000-000000000001'
);

insert into public.match_sides (
  id, match_id, event_id, team_id, side_index, label
)
values
  ('05500000-0000-4000-8000-000000000001', '05400000-0000-4000-8000-000000000001', '05300000-0000-4000-8000-000000000001', '05100000-0000-4000-8000-000000000001', 1, 'Verde'),
  ('05500000-0000-4000-8000-000000000002', '05400000-0000-4000-8000-000000000001', '05300000-0000-4000-8000-000000000001', '05100000-0000-4000-8000-000000000001', 2, 'Branco');

insert into public.match_participations (
  match_id, event_id, team_id, athlete_id, side_id, created_by
)
values
  ('05400000-0000-4000-8000-000000000001', '05300000-0000-4000-8000-000000000001', '05100000-0000-4000-8000-000000000001', '05200000-0000-4000-8000-000000000001', '05500000-0000-4000-8000-000000000001', '05000000-0000-4000-8000-000000000001'),
  ('05400000-0000-4000-8000-000000000001', '05300000-0000-4000-8000-000000000001', '05100000-0000-4000-8000-000000000001', '05200000-0000-4000-8000-000000000004', '05500000-0000-4000-8000-000000000002', '05000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '05000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.finalize_event_match('05400000-0000-4000-8000-000000000001')$$,
  'staff finaliza e congela elegibilidade'
);
reset role;

select ok(
  (select relrowsecurity from pg_class where oid = 'public.craque_votes'::regclass),
  'cédulas usam RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.craque_vote_receipts'::regclass),
  'recibos usam RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.craque_votes', 'SELECT'),
  'authenticated não lê cédulas diretamente'
);
select ok(
  not has_table_privilege('authenticated', 'public.craque_votes', 'INSERT'),
  'authenticated não insere cédulas diretamente'
);
select ok(
  not has_table_privilege('authenticated', 'private.craque_vote_eligibility', 'SELECT'),
  'authenticated não lê o snapshot privado'
);
select ok(
  not has_function_privilege('anon', 'public.cast_craque_vote(uuid,uuid)', 'EXECUTE'),
  'anon não executa voto'
);
select ok(
  has_function_privilege('authenticated', 'public.cast_craque_vote(uuid,uuid)', 'EXECUTE'),
  'authenticated usa somente a RPC segura'
);
select ok(
  not has_function_privilege('authenticated', 'public.cast_craque_vote(uuid,uuid,text,text)', 'EXECUTE'),
  'assinatura que aceitava hashes do cliente foi revogada'
);
select is(
  (select count(*) from private.craque_vote_eligibility where match_id = '05400000-0000-4000-8000-000000000001'),
  3::bigint,
  'snapshot inclui somente SIM e TALVEZ ativos'
);
select is(
  (select count(*) from private.craque_vote_salts where match_id = '05400000-0000-4000-8000-000000000001'),
  1::bigint,
  'partida possui um salt privado'
);
select ok(
  (select craque_voting_closes_at <= event.ends_at + interval '12 hours'
   from public.event_matches match
   join public.events event on event.id = match.event_id
   where match.id = '05400000-0000-4000-8000-000000000001'),
  'janela termina no máximo 12h após o evento'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '05000000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$select * from public.cast_craque_vote('05400000-0000-4000-8000-000000000001', '05200000-0000-4000-8000-000000000001')$$,
  'SIM participante pode votar em si mesmo'
);
select throws_ok(
  $$select * from public.cast_craque_vote('05400000-0000-4000-8000-000000000001', '05200000-0000-4000-8000-000000000001')$$,
  '23505',
  null,
  'segundo voto da mesma pessoa falha'
);
reset role;

select is(
  (select count(*) from public.craque_votes where match_id = '05400000-0000-4000-8000-000000000001'),
  1::bigint,
  'somente uma cédula foi persistida'
);
select ok(
  (select voter_hash ~ '^[0-9a-f]{64}$' and voter_hash <> '05200000-0000-4000-8000-000000000001'
   from public.craque_votes where match_id = '05400000-0000-4000-8000-000000000001'),
  'hash do eleitor é derivado no banco e não contém o UUID'
);
select ok(
  (select receipt_token_hash ~ '^[0-9a-f]{64}$'
   from public.craque_votes where match_id = '05400000-0000-4000-8000-000000000001'),
  'recibo persiste somente como hash'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '05000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$select * from public.cast_craque_vote('05400000-0000-4000-8000-000000000001', '05200000-0000-4000-8000-000000000005')$$,
  '42501',
  null,
  'candidato sem participação real falha'
);
select throws_ok(
  $$select * from public.cast_craque_vote('05400000-0000-4000-8000-000000000001', '05200000-0000-4000-8000-000000000006')$$,
  '42501',
  null,
  'candidato cross-tenant falha'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '05000000-0000-4000-8000-000000000004', true);
select throws_ok(
  $$select * from public.cast_craque_vote('05400000-0000-4000-8000-000000000001', '05200000-0000-4000-8000-000000000004')$$,
  '42501',
  null,
  'PENDENTE não pertence ao snapshot eleitor'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '05000000-0000-4000-8000-000000000005', true);
select throws_ok(
  $$select * from public.cast_craque_vote('05400000-0000-4000-8000-000000000001', '05200000-0000-4000-8000-000000000004')$$,
  '42501',
  null,
  'usuário de outro time não vota'
);
reset role;

update public.team_feature_flags
set enabled = false
where team_id = '05100000-0000-4000-8000-000000000001'
  and feature = 'voting';
set local role authenticated;
select set_config('request.jwt.claim.sub', '05000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$select * from public.cast_craque_vote('05400000-0000-4000-8000-000000000001', '05200000-0000-4000-8000-000000000004')$$,
  '55000',
  null,
  'flag desligada falha fechado'
);
reset role;

update public.team_feature_flags
set enabled = true
where team_id = '05100000-0000-4000-8000-000000000001'
  and feature = 'voting';
update public.event_matches
set craque_voting_closes_at = now() - interval '1 second'
where id = '05400000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '05000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$select * from public.cast_craque_vote('05400000-0000-4000-8000-000000000001', '05200000-0000-4000-8000-000000000004')$$,
  '55000',
  null,
  'janela encerrada falha fechado'
);
reset role;

select ok(
  not has_table_privilege('authenticated', 'public.craque_votes', 'UPDATE'),
  'voto é imutável para o cliente'
);
select ok(
  (select count(*) = 1 from pg_constraint where conname = 'craque_votes_match_team_fkey'),
  'cédula possui FK composta para a partida do time'
);
select ok(
  (select count(*) = 1 from pg_constraint where conname = 'craque_votes_candidate_team_fkey'),
  'candidato possui FK composta para o mesmo time'
);
select ok(
  (select count(*) = 1 from pg_constraint where conname = 'craque_votes_match_id_voter_hash_key'),
  'unicidade por partida e eleitor permanece no banco'
);

select * from finish();
rollback;
