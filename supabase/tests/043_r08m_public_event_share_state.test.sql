begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(40);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','f8100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-r08m@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f8100000-0000-4000-8000-000000000002','authenticated','authenticated','player-a-r08m@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f8100000-0000-4000-8000-000000000003','authenticated','authenticated','player-b-r08m@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f8100000-0000-4000-8000-000000000004','authenticated','authenticated','owner-other-r08m@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams (id, name, slug, created_by) values
  ('f8200000-0000-4000-8000-000000000001','R08M Público','r08m-publico','f8100000-0000-4000-8000-000000000001'),
  ('f8200000-0000-4000-8000-000000000002','Outro Time Secreto','outro-time-r08m','f8100000-0000-4000-8000-000000000004');

insert into public.events (
  id, public_id, team_id, title, kind, organization_mode, sport_format,
  starts_at, ends_at, status, created_by
) values
  ('f8300000-0000-4000-8000-000000000001','f8310000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001','Pelada Pública R08M','weekly_match','split_teams','society',now()+interval '5 days',now()+interval '5 days 90 minutes','scheduled','f8100000-0000-4000-8000-000000000001'),
  ('f8300000-0000-4000-8000-000000000002','f8310000-0000-4000-8000-000000000002','f8200000-0000-4000-8000-000000000002','Evento Secreto de Outro Time','weekly_match','split_teams','society',now()+interval '6 days',now()+interval '6 days 90 minutes','scheduled','f8100000-0000-4000-8000-000000000004');

insert into public.athletes (
  id, team_id, user_id, full_name, preferred_name, status, created_by
) values
  ('f8400000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001','f8100000-0000-4000-8000-000000000002','Neymar da Silva Consentido','Neymar Craque','active','f8100000-0000-4000-8000-000000000001'),
  ('f8400000-0000-4000-8000-000000000002','f8200000-0000-4000-8000-000000000001','f8100000-0000-4000-8000-000000000003','Rival Sem Consentimento','Rival Privado','active','f8100000-0000-4000-8000-000000000001'),
  ('f8400000-0000-4000-8000-000000000003','f8200000-0000-4000-8000-000000000002',null,'Atleta de Outro Time','Outro Atleta','active','f8100000-0000-4000-8000-000000000004');

select ok(
  'event_share_card' = any(enum_range(null::public.feature_key)::text[]),
  'flag event_share_card existe no enum'
);
select has_function(
  'public',
  'get_public_event_share_state',
  array['uuid'],
  'projeção compartilhável existe'
);
select ok(
  has_function_privilege('anon','public.get_public_event_share_state(uuid)','EXECUTE'),
  'anon executa somente a projeção estreita'
);
select ok(
  has_function_privilege('authenticated','public.get_public_event_share_state(uuid)','EXECUTE'),
  'authenticated recebe a mesma projeção anônima'
);
select ok(
  not has_table_privilege('anon','public.craque_votes','SELECT'),
  'anon não lê cédulas diretamente'
);
select ok(
  not has_table_privilege('anon','public.event_lineup_revisions','SELECT'),
  'anon não lê revisões diretamente'
);
select is(
  (select count(*) from public.team_feature_flags where feature = 'event_share_card'),
  0::bigint,
  'migration não habilita nenhum time'
);
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001'),
  null::jsonb,
  'todas as flags desligadas falham fechado'
);

insert into public.team_feature_flags (team_id, feature, enabled, updated_by)
values ('f8200000-0000-4000-8000-000000000001','public_event_page',true,'f8100000-0000-4000-8000-000000000001');
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001'),
  null::jsonb,
  'página pública sem event_share_card preserva fallback'
);

insert into public.team_feature_flags (team_id, feature, enabled, updated_by)
values ('f8200000-0000-4000-8000-000000000001','event_share_card',true,'f8100000-0000-4000-8000-000000000001');
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->>'phase',
  'call',
  'evento agendado começa na chamada'
);
select is(
  (select count(*) from jsonb_object_keys(
    public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'event'
  )),
  8::bigint,
  'evento expõe somente oito campos públicos'
);
select ok(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')::text not like '%team_id%'
  and public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')::text not like '%event_id%'
  and public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')::text not like '%capability%'
  and public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')::text not like '%address%',
  'chamada omite IDs, capability e endereço'
);

insert into public.team_feature_flags (team_id, feature, enabled, updated_by)
values ('f8200000-0000-4000-8000-000000000001','team_division',true,'f8100000-0000-4000-8000-000000000001');
insert into public.event_lineup_revisions (
  id, event_id, team_id, revision, published_by
) values (
  'f8500000-0000-4000-8000-000000000001','f8300000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001',1,'f8100000-0000-4000-8000-000000000001'
);
insert into public.event_lineup_revision_squads (
  id, revision_id, event_id, team_id, name, color, sort_order
) values
  ('f8510000-0000-4000-8000-000000000001','f8500000-0000-4000-8000-000000000001','f8300000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001','Verde','#0D9488',1),
  ('f8510000-0000-4000-8000-000000000002','f8500000-0000-4000-8000-000000000001','f8300000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001','Azul','#2563EB',2);
insert into public.event_lineup_revision_spots (
  revision_id, revision_squad_id, event_id, team_id, athlete_id, slot_kind, sort_order
) values (
  'f8500000-0000-4000-8000-000000000001','f8510000-0000-4000-8000-000000000001','f8300000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001','f8400000-0000-4000-8000-000000000001','starter',1
);
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->>'phase',
  'lineup',
  'publicação explícita prevalece sobre a chamada'
);
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'lineup'->'squads'->0->'athletes'->0->>'name',
  'Neymar',
  'escalação mantém somente o primeiro nome'
);
select ok(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')::text not like '%da Silva%'
  and public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')::text not like '%f8400000%',
  'escalação omite sobrenome e ID do atleta'
);

update public.events
set status = 'cancelled',
  cancelled_at = now(),
  cancelled_by = 'f8100000-0000-4000-8000-000000000001'
where id = 'f8300000-0000-4000-8000-000000000001';
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->>'phase',
  'cancelled',
  'cancelamento tem precedência máxima'
);
update public.events
set status = 'scheduled', cancelled_at = null, cancelled_by = null
where id = 'f8300000-0000-4000-8000-000000000001';

insert into public.team_feature_flags (team_id, feature, enabled, updated_by)
values ('f8200000-0000-4000-8000-000000000001','event_matches',true,'f8100000-0000-4000-8000-000000000001');
insert into public.event_matches (
  id, event_id, team_id, ordinal, status, public_mode, created_by
) values (
  'f8600000-0000-4000-8000-000000000001','f8300000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001',1,'live','live','f8100000-0000-4000-8000-000000000001'
);
insert into public.match_sides (
  id, match_id, event_id, team_id, side_index, label
) values
  ('f8610000-0000-4000-8000-000000000001','f8600000-0000-4000-8000-000000000001','f8300000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001',1,'Verde'),
  ('f8610000-0000-4000-8000-000000000002','f8600000-0000-4000-8000-000000000001','f8300000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001',2,'Azul');
insert into public.match_events (
  id, match_id, event_id, team_id, kind, side_id, athlete_id, minute, delta, notes, created_by
) values
  ('f8620000-0000-4000-8000-000000000001','f8600000-0000-4000-8000-000000000001','f8300000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001','goal','f8610000-0000-4000-8000-000000000001','f8400000-0000-4000-8000-000000000001',12,null,'Gol com autoria privada','f8100000-0000-4000-8000-000000000001'),
  ('f8620000-0000-4000-8000-000000000002','f8600000-0000-4000-8000-000000000001','f8300000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001','score_adjustment','f8610000-0000-4000-8000-000000000001',null,13,1,'Ajuste privado','f8100000-0000-4000-8000-000000000001'),
  ('f8620000-0000-4000-8000-000000000003','f8600000-0000-4000-8000-000000000001','f8300000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001','yellow_card','f8610000-0000-4000-8000-000000000002','f8400000-0000-4000-8000-000000000002',18,null,'Cartão com autoria privada','f8100000-0000-4000-8000-000000000001');

insert into public.event_matches (
  id, event_id, team_id, ordinal, status, public_mode, finalized_at, finalized_by, craque_voting_closes_at, created_by
) values (
  'f8600000-0000-4000-8000-000000000002','f8300000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001',2,'finalized','final_result',now(), 'f8100000-0000-4000-8000-000000000001',now()+interval '1 hour','f8100000-0000-4000-8000-000000000001'
);
insert into public.match_sides (
  id, match_id, event_id, team_id, side_index, label
) values
  ('f8610000-0000-4000-8000-000000000003','f8600000-0000-4000-8000-000000000002','f8300000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001',1,'Verde'),
  ('f8610000-0000-4000-8000-000000000004','f8600000-0000-4000-8000-000000000002','f8300000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001',2,'Azul');

select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->>'phase',
  'live',
  'partida ao vivo prevalece sobre finalizada de ordinal maior'
);
select is(
  (public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'match'->>'ordinal')::integer,
  1,
  'fase ao vivo seleciona a partida pública correta'
);
select is(
  (public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'match'->'sides'->0->>'score')::integer,
  2,
  'placar agrega gol e ajuste do lado'
);
select is(
  jsonb_array_length(public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'match'->'events'),
  3,
  'timeline inclui somente três fatos públicos por lado'
);
select ok(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')::text not like '%athlete_id%'
  and public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')::text not like '%autoria privada%'
  and public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')::text not like '%f8400000%',
  'placar e fatos omitem autoria, notas e IDs'
);

update public.event_matches set public_mode = 'private'
where id = 'f8600000-0000-4000-8000-000000000001';
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->>'phase',
  'score',
  'partida privada é ignorada e placar final público prevalece'
);
update public.event_matches
set status = 'finalized', public_mode = 'final_result', finalized_at = now(), finalized_by = 'f8100000-0000-4000-8000-000000000001'
where id = 'f8600000-0000-4000-8000-000000000001';

insert into public.team_feature_flags (team_id, feature, enabled, updated_by)
values ('f8200000-0000-4000-8000-000000000001','voting',true,'f8100000-0000-4000-8000-000000000001');
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->>'phase',
  'voting',
  'janela aberta da partida finalizada mais recente anuncia votação'
);
select ok(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'voting'->>'closes_at' is not null,
  'votação expõe somente o fechamento público'
);

update public.team_feature_flags set enabled = false
where team_id = 'f8200000-0000-4000-8000-000000000001' and feature = 'voting';
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->>'phase',
  'score',
  'kill switch de votação preserva o placar'
);
update public.team_feature_flags set enabled = true
where team_id = 'f8200000-0000-4000-8000-000000000001' and feature = 'voting';
update public.event_matches set craque_voting_closes_at = now()-interval '1 second'
where id = 'f8600000-0000-4000-8000-000000000002';
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->>'phase',
  'score',
  'janela fechada sem votos mantém o placar'
);

insert into public.craque_votes (
  match_id, team_id, voter_hash, candidate_athlete_id, receipt_token_hash
) values
  ('f8600000-0000-4000-8000-000000000002','f8200000-0000-4000-8000-000000000001',repeat('a',64),'f8400000-0000-4000-8000-000000000001',repeat('d',64)),
  ('f8600000-0000-4000-8000-000000000002','f8200000-0000-4000-8000-000000000001',repeat('b',64),'f8400000-0000-4000-8000-000000000002',repeat('e',64));
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->>'phase',
  'result',
  'votos fechados promovem resultado'
);
select is(
  (public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'result'->>'tied')::boolean,
  true,
  'empate não escolhe vencedor arbitrário'
);
select is(
  (public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'result'->>'total_votes')::integer,
  2,
  'empate preserva somente o total agregado'
);
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'result'->>'winner_name',
  null::text,
  'empate omite identidade'
);
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'result'->>'vote_count',
  null::text,
  'empate omite contagem do candidato'
);

insert into public.craque_votes (
  match_id, team_id, voter_hash, candidate_athlete_id, receipt_token_hash
) values (
  'f8600000-0000-4000-8000-000000000002','f8200000-0000-4000-8000-000000000001',repeat('c',64),'f8400000-0000-4000-8000-000000000001',repeat('f',64)
);
select is(
  (public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'result'->>'tied')::boolean,
  false,
  'resultado reconhece vencedor único sem identificá-lo'
);
select is(
  (public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'result'->>'total_votes')::integer,
  3,
  'resultado único preserva total válido'
);
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'result'->>'winner_name',
  null::text,
  'ausência de consentimento omite vencedor'
);

insert into public.athlete_public_consents (
  athlete_id, team_id, purpose, status, terms_version, evidence,
  granted_at, updated_by
) values (
  'f8400000-0000-4000-8000-000000000001','f8200000-0000-4000-8000-000000000001','public_sports_activity','granted','r08m-v1','self-service',now(),'f8100000-0000-4000-8000-000000000002'
);
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'result'->>'winner_name',
  'Neymar',
  'consentimento vigente libera somente o primeiro nome do vencedor'
);
select is(
  (public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'result'->>'vote_count')::integer,
  2,
  'vencedor consentido recebe contagem agregada'
);
select is(
  (public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'result'->>'vote_percentage')::numeric,
  66.7::numeric,
  'vencedor consentido recebe percentual agregado'
);

update public.athlete_public_consents
set status = 'revoked', revoked_at = now()
where athlete_id = 'f8400000-0000-4000-8000-000000000001'
  and purpose = 'public_sports_activity';
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')->'result'->>'winner_name',
  null::text,
  'revogação remove identidade na leitura seguinte'
);

insert into public.team_feature_flags (team_id, feature, enabled, updated_by) values
  ('f8200000-0000-4000-8000-000000000002','public_event_page',true,'f8100000-0000-4000-8000-000000000004'),
  ('f8200000-0000-4000-8000-000000000002','event_share_card',true,'f8100000-0000-4000-8000-000000000004');
select ok(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')::text not like '%Outro Time Secreto%'
  and public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')::text not like '%Evento Secreto de Outro Time%'
  and public.get_public_event_share_state('f8310000-0000-4000-8000-000000000001')::text not like '%Outro Atleta%',
  'projeção não mistura outro tenant'
);
select is(
  public.get_public_event_share_state('f8310000-0000-4000-8000-000000000099'),
  null::jsonb,
  'public_id inexistente falha fechado'
);

select * from finish();
rollback;
