begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(28);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','e1100000-0000-4000-8000-000000000001','authenticated','authenticated','owner-r10-health@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','e1100000-0000-4000-8000-000000000002','authenticated','authenticated','athlete-r10-health@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,created_by) values
  ('e1200000-0000-4000-8000-000000000001','R10 Piloto','r10-piloto-health','e1100000-0000-4000-8000-000000000001'),
  ('e1200000-0000-4000-8000-000000000002','R10 Outro','r10-outro-health','e1100000-0000-4000-8000-000000000001');

insert into public.player_profiles(
  user_id, handle, display_name, preferred_name, is_public, phone_verified_at
) values (
  'e1100000-0000-4000-8000-000000000002','atleta-r10-health',
  'Atleta Sintético','Atleta',true,now()
);

insert into public.athletes(
  id, team_id, user_id, full_name, preferred_name, status,
  registration_source, created_by
) values (
  'e1300000-0000-4000-8000-000000000001',
  'e1200000-0000-4000-8000-000000000001',
  'e1100000-0000-4000-8000-000000000002',
  'Atleta Sintético','Atleta','active','public_form',
  'e1100000-0000-4000-8000-000000000001'
);

select has_function(
  'public','get_recognition_pilot_health',array['uuid'],
  'sonda agregada de reconhecimento existe'
);
select ok(has_function_privilege(
  'service_role','public.get_recognition_pilot_health(uuid)','execute'
), 'service role executa a sonda');
select ok(not has_function_privilege(
  'anon','public.get_recognition_pilot_health(uuid)','execute'
), 'anon não executa a sonda');
select ok(not has_function_privilege(
  'authenticated','public.get_recognition_pilot_health(uuid)','execute'
), 'authenticated não executa a sonda');
select is((select count(*) from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000099'
)),0::bigint,'time ausente não produz linha');
select is((select recognition_enabled from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)),false,'reconhecimento nasce desligado');
select is((select activation_captured from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)),false,'marco não nasce implicitamente');
select is((select active_claimed_athletes from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)),1::bigint,'sonda conta somente vínculos ativos reivindicados');
select results_eq(
  $$select source_cards,source_goal_cards,source_assist_cards,source_crowd_star_cards from public.get_recognition_pilot_health('e1200000-0000-4000-8000-000000000001')$$,
  $$select 0::bigint,0::bigint,0::bigint,0::bigint$$,
  'nenhuma fonte esportiva é inventada'
);
select is((select projected_cards from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)),0::bigint,'flag desligada não projeta cartões');
select is((select public_cards from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)),0::bigint,'flag desligada não publica cartões');
select is((select reconstruction_mismatches from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)),0::bigint,'estado inerte não cria divergência');

set local role authenticated;
select set_config('request.jwt.claim.sub','e1100000-0000-4000-8000-000000000001',true);
select public.set_team_feature_flag(
  'e1200000-0000-4000-8000-000000000001','recognition',true
);
reset role;

select is((select recognition_enabled from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)),true,'sonda observa a flag ativa');
select is((select activation_captured from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)),true,'primeira ativação captura o marco');
select ok((select activated_at is not null from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)), 'sonda expõe somente o horário agregado da ativação');
select ok((select last_flag_change_at is not null from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)), 'alteração da flag possui marco operacional');

set local role authenticated;
select set_config('request.jwt.claim.sub','e1100000-0000-4000-8000-000000000002',true);
select public.set_public_recognition_summary_consent(
  'e1300000-0000-4000-8000-000000000001',true,'r10-v1',
  'e1800000-0000-4000-8000-000000000001'
);
reset role;

select is((select granted_consents from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)),1::bigint,'consentimento concedido aparece somente como contagem');
select is((select consent_commands_24h from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)),1::bigint,'comando recente aparece somente como contagem');
select ok((select last_consent_command_at is not null from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)), 'consentimento possui somente marco temporal agregado');

set local role authenticated;
select set_config('request.jwt.claim.sub','e1100000-0000-4000-8000-000000000002',true);
select public.set_public_recognition_summary_consent(
  'e1300000-0000-4000-8000-000000000001',false,'r10-v1',
  'e1800000-0000-4000-8000-000000000002'
);
reset role;

select is((select granted_consents from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)),0::bigint,'revogação retira a concessão agregada');
select is((select revoked_consents from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)),1::bigint,'revogação aparece somente como contagem');
select is((select consent_commands_24h from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)),2::bigint,'concessão e revogação ficam auditadas');
select is((select active_claimed_athletes from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000002'
)),0::bigint,'outro time não recebe contagens da coorte');
select results_eq(
  $$select recognition_enabled,activation_captured,projected_cards,public_cards from public.get_recognition_pilot_health('e1200000-0000-4000-8000-000000000002')$$,
  $$select false,false,0::bigint,0::bigint$$,
  'outro time permanece inerte e isolado'
);
select ok(not exists (
  select 1 from information_schema.columns column_info
  where column_info.table_schema='public'
    and column_info.table_name='get_recognition_pilot_health'
    and column_info.column_name in (
      'team_id','athlete_id','user_id','source_id','match_id','event_id',
      'handle','name','title','vote','reason','error'
    )
), 'contrato da sonda não contém identificador, conteúdo ou erro bruto');

set local role authenticated;
select set_config('request.jwt.claim.sub','e1100000-0000-4000-8000-000000000001',true);
select public.set_team_feature_flag(
  'e1200000-0000-4000-8000-000000000001','recognition',false
);
reset role;

select results_eq(
  $$select recognition_enabled,activation_captured,projected_cards,public_cards from public.get_recognition_pilot_health('e1200000-0000-4000-8000-000000000001')$$,
  $$select false,true,0::bigint,0::bigint$$,
  'rollback fecha projeções e preserva o marco'
);
select is((select count(*) from public.audit_logs
  where team_id='e1200000-0000-4000-8000-000000000001'
    and action='feature_flag.changed' and entity_id='recognition'),
  2::bigint,'ativação e rollback ficam auditados');
select ok((select observed_at <= now() from public.get_recognition_pilot_health(
  'e1200000-0000-4000-8000-000000000001'
)), 'sonda informa o horário agregado da observação');

select * from finish();
rollback;
