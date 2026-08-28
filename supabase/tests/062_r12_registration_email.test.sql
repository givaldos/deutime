begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(42);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','ae100000-0000-4000-8000-000000000001','authenticated','authenticated','email-owner@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','ae100000-0000-4000-8000-000000000002','authenticated','authenticated','email-admin@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-8000-000000000003','ae100000-0000-4000-8000-000000000003','authenticated','authenticated','email-manager@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','ae100000-0000-4000-8000-000000000004','authenticated','authenticated','email-inactive@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','ae100000-0000-4000-8000-000000000005','authenticated','authenticated','email-new-admin@example.test','',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','ae100000-0000-4000-8000-000000000006','authenticated','authenticated','email-other@example.test','',now(),'{}','{}',now(),now(),'','','','');

insert into public.teams(id,name,slug,created_by) values
  ('ae200000-0000-4000-8000-000000000001','Avisos FC','avisos-fc','ae100000-0000-4000-8000-000000000001'),
  ('ae200000-0000-4000-8000-000000000002','Outro Aviso','outro-aviso','ae100000-0000-4000-8000-000000000006');

insert into public.team_memberships(team_id,user_id,role,status) values
  ('ae200000-0000-4000-8000-000000000001','ae100000-0000-4000-8000-000000000002','admin','active'),
  ('ae200000-0000-4000-8000-000000000001','ae100000-0000-4000-8000-000000000003','manager','active'),
  ('ae200000-0000-4000-8000-000000000001','ae100000-0000-4000-8000-000000000004','admin','suspended');

select ok(not (select enabled from public.runtime_controls where control='registration_email_alerts'),'produção nasce desligada');
select ok(not (select enabled from public.runtime_controls where control='registration_email_delivery'),'consumo nasce desligado');
select ok(not has_table_privilege('authenticated','public.registration_email_preferences','SELECT'),'preferência não permite leitura direta');
select ok(not has_table_privilege('authenticated','private.registration_email_events','SELECT'),'evento interno não é exposto');
select ok(not has_function_privilege('anon','public.get_my_registration_email_preference(uuid)','EXECUTE'),'anônimo não lê preferência');

set local role authenticated;
select set_config('request.jwt.claim.sub','ae100000-0000-4000-8000-000000000001',true);
select ok(public.get_my_registration_email_preference('ae200000-0000-4000-8000-000000000001'),'owner nasce com aviso ligado por padrão');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','ae100000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.get_my_registration_email_preference('ae200000-0000-4000-8000-000000000001')$$,'42501',null,'manager não administra aviso');
select throws_ok($$select public.set_my_registration_email_preference('ae200000-0000-4000-8000-000000000002',false)$$,'42501',null,'pessoa não altera preferência cross-tenant');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','ae100000-0000-4000-8000-000000000001',true);
select is(public.set_my_registration_email_preference('ae200000-0000-4000-8000-000000000001',false),false,'owner desliga somente o próprio aviso');
select ok(not public.get_my_registration_email_preference('ae200000-0000-4000-8000-000000000001'),'leitura reflete preferência desligada');
select is(public.set_my_registration_email_preference('ae200000-0000-4000-8000-000000000001',true),true,'owner religa o aviso');
reset role;

insert into public.athletes(id,team_id,full_name,status,registration_source,created_by)
values ('ae300000-0000-4000-8000-000000000001','ae200000-0000-4000-8000-000000000001','Sem produção','pending','public_form','ae100000-0000-4000-8000-000000000001');
select is((select count(*) from private.registration_email_events),0::bigint,'flag desligada não produz evento');

update public.runtime_controls set enabled=true where control='registration_email_alerts';
insert into public.athletes(id,team_id,full_name,status,registration_source,created_by)
values ('ae300000-0000-4000-8000-000000000002','ae200000-0000-4000-8000-000000000001','Cadastro interno','pending','admin','ae100000-0000-4000-8000-000000000001');
select is((select count(*) from private.registration_email_events),0::bigint,'cadastro administrativo não produz aviso');

insert into public.athletes(id,team_id,full_name,status,registration_source,created_by)
values ('ae300000-0000-4000-8000-000000000003','ae200000-0000-4000-8000-000000000001','Atleta confidencial','pending','public_form','ae100000-0000-4000-8000-000000000001');
select is((select count(*) from private.registration_email_events),1::bigint,'novo pending público produz um evento mínimo');
update public.athletes set preferred_name='Privado' where id='ae300000-0000-4000-8000-000000000003';
select is((select count(*) from private.registration_email_events),1::bigint,'atualização sem transição não duplica evento');
select is((select metadata from public.audit_logs where action='registration_email.queued' order by id desc limit 1),'{"source":"public_form","status":"pending"}'::jsonb,'auditoria de produção não contém PII');

set local role authenticated;
select set_config('request.jwt.claim.sub','ae100000-0000-4000-8000-000000000002',true);
select is(public.set_my_registration_email_preference('ae200000-0000-4000-8000-000000000001',false),false,'admin silencia apenas o próprio aviso');
reset role;

insert into public.team_memberships(team_id,user_id,role,status)
values ('ae200000-0000-4000-8000-000000000001','ae100000-0000-4000-8000-000000000005','admin','active');
select ok(exists(select 1 from public.team_memberships where user_id='ae100000-0000-4000-8000-000000000005'),'novo admin entra depois do evento e antes do consumo');

update public.runtime_controls set enabled=true where control='registration_email_delivery';
select is((select count(*) from public.claim_registration_email_batch(10,90)),2::bigint,'consumo recalcula e reivindica somente owner e novo admin elegíveis');
select is((select count(*) from private.registration_email_outbox),2::bigint,'dedupe cria no máximo uma linha por evento e destinatário');
select is((select count(*) from private.registration_email_outbox where recipient_user_id='ae100000-0000-4000-8000-000000000002'),0::bigint,'preferência desligada exclui admin');
select is((select count(*) from private.registration_email_outbox where recipient_user_id='ae100000-0000-4000-8000-000000000003'),0::bigint,'manager nunca recebe');
select is((select count(*) from private.registration_email_outbox where recipient_user_id='ae100000-0000-4000-8000-000000000006'),0::bigint,'outro time nunca recebe');
select hasnt_column('private','registration_email_outbox','recipient_email','outbox não persiste e-mail do destinatário');
select hasnt_column('private','registration_email_outbox','payload','outbox não possui payload capaz de carregar PII do atleta');

select is(
  (select recipient_email from public.prepare_registration_email_dispatch(
    (select outbox_id from private.registration_email_outbox where recipient_user_id='ae100000-0000-4000-8000-000000000001'),
    (select lease_token from private.registration_email_outbox where recipient_user_id='ae100000-0000-4000-8000-000000000001')
  )),
  'email-owner@example.test',
  'preparo resolve somente e-mail confirmado no último instante'
);
select is(
  (select team_name from public.prepare_registration_email_dispatch(
    (select outbox_id from private.registration_email_outbox where recipient_user_id='ae100000-0000-4000-8000-000000000001'),
    (select lease_token from private.registration_email_outbox where recipient_user_id='ae100000-0000-4000-8000-000000000001')
  )),
  'Avisos FC',
  'template recebe apenas identidade do time'
);

update public.team_memberships set status='suspended'
where team_id='ae200000-0000-4000-8000-000000000001' and user_id='ae100000-0000-4000-8000-000000000005';
select is((select count(*) from public.prepare_registration_email_dispatch(
  (select outbox_id from private.registration_email_outbox where recipient_user_id='ae100000-0000-4000-8000-000000000005'),
  (select lease_token from private.registration_email_outbox where recipient_user_id='ae100000-0000-4000-8000-000000000005')
)),0::bigint,'destinatário que perdeu papel antes do envio é recalculado e removido');
select is((select status from private.registration_email_outbox where recipient_user_id='ae100000-0000-4000-8000-000000000005'),'cancelled','perda de elegibilidade cancela somente aquela entrega');

select ok(public.ack_registration_email_sent(
  (select outbox_id from private.registration_email_outbox where recipient_user_id='ae100000-0000-4000-8000-000000000001'),
  (select lease_token from private.registration_email_outbox where recipient_user_id='ae100000-0000-4000-8000-000000000001'),
  (select current_attempt_id from private.registration_email_outbox where recipient_user_id='ae100000-0000-4000-8000-000000000001'),
  '<provider-message-1@example.test>'
),'ack conclui a entrega aceita');
select ok(not public.ack_registration_email_sent(
  (select outbox_id from private.registration_email_outbox where recipient_user_id='ae100000-0000-4000-8000-000000000001'),
  gen_random_uuid(),gen_random_uuid(),'<replay@example.test>'
),'ack repetido não duplica efeito');
select is((select status from private.registration_email_outbox where recipient_user_id='ae100000-0000-4000-8000-000000000001'),'sent','entrega aceita fica enviada uma única vez');

update public.athletes set status='rejected' where id='ae300000-0000-4000-8000-000000000003';
update public.athletes set status='pending' where id='ae300000-0000-4000-8000-000000000003';
select is((select count(*) from private.registration_email_events),2::bigint,'nova transição real para pending cria novo evento');
select is((select count(*) from public.claim_registration_email_batch(10,90)),1::bigint,'nova transição reivindica somente owner ainda elegível');
select is(public.nack_registration_email(
  (select outbox_id from private.registration_email_outbox where status='processing'),
  (select lease_token from private.registration_email_outbox where status='processing'),
  (select current_attempt_id from private.registration_email_outbox where status='processing'),
  'transient','smtp_421'
),'failed','falha transitória agenda retry');
select is((select last_error_code from private.registration_email_outbox where status='failed'),'smtp_421','fila guarda apenas código redigido');
update private.registration_email_outbox set available_at=now()-interval '1 second' where status='failed';
select is((select max(attempt_number) from public.claim_registration_email_batch(10,90)),2::smallint,'retry usa nova tentativa sem criar novo destinatário');
select is(public.nack_registration_email(
  (select outbox_id from private.registration_email_outbox where status='processing'),
  (select lease_token from private.registration_email_outbox where status='processing'),
  (select current_attempt_id from private.registration_email_outbox where status='processing'),
  'ambiguous','smtp_network_unknown'
),'review','resultado incerto nunca volta ao retry automático');

update public.athletes set status='rejected' where id='ae300000-0000-4000-8000-000000000003';
update public.athletes set status='pending' where id='ae300000-0000-4000-8000-000000000003';
update public.runtime_controls set enabled=false where control='registration_email_delivery';
select is((select count(*) from public.claim_registration_email_batch(10,90)),0::bigint,'kill switch de consumo bloqueia reivindicação');
select is((select count(*) from private.registration_email_events where status='pending'),1::bigint,'kill switch preserva fila autenticada para retomada');
select is((select review_count from public.get_registration_email_health()),1::bigint,'telemetria agregada expõe revisão sem PII');
select ok((select metadata::text not like '%@%' from public.audit_logs where action='registration_email.sent' order by id desc limit 1),'auditoria de envio não grava endereço');

select * from finish();
rollback;
