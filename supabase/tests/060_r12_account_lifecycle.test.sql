begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(40);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','ab100000-0000-4000-8000-000000000001','authenticated','authenticated','r12-life-owner@example.test','',now(),'{}','{"display_name":"Owner R12"}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','ab100000-0000-4000-8000-000000000002','authenticated','authenticated','r12-life-next@example.test','',now(),'{}','{"display_name":"Next R12"}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','ab100000-0000-4000-8000-000000000003','authenticated','authenticated','r12-life-player@example.test','',now(),'{}','{"display_name":"Player R12"}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','ab100000-0000-4000-8000-000000000004','authenticated','authenticated','r12-life-other@example.test','',now(),'{}','{"display_name":"Other R12"}',now(),now(),'','','','');

insert into public.teams(id,name,slug,created_by) values
  ('ab200000-0000-4000-8000-000000000001','R12 Vida A','r12-vida-a','ab100000-0000-4000-8000-000000000001'),
  ('ab200000-0000-4000-8000-000000000002','R12 Vida B','r12-vida-b','ab100000-0000-4000-8000-000000000004'),
  ('ab200000-0000-4000-8000-000000000003','R12 Vida C','r12-vida-c','ab100000-0000-4000-8000-000000000004');

insert into public.team_memberships(team_id,user_id,role,status) values
  ('ab200000-0000-4000-8000-000000000001','ab100000-0000-4000-8000-000000000002','admin','active'),
  ('ab200000-0000-4000-8000-000000000001','ab100000-0000-4000-8000-000000000003','manager','active');

insert into public.athletes(id,team_id,user_id,full_name,status,registration_source,created_by) values
  ('ab300000-0000-4000-8000-000000000001','ab200000-0000-4000-8000-000000000001','ab100000-0000-4000-8000-000000000003','Pedido R12','pending','public_form','ab100000-0000-4000-8000-000000000003'),
  ('ab300000-0000-4000-8000-000000000002','ab200000-0000-4000-8000-000000000002','ab100000-0000-4000-8000-000000000003','Jogador R12','active','public_form','ab100000-0000-4000-8000-000000000003'),
  ('ab300000-0000-4000-8000-000000000003','ab200000-0000-4000-8000-000000000002','ab100000-0000-4000-8000-000000000004','Outro R12','active','public_form','ab100000-0000-4000-8000-000000000004');

insert into public.team_invitations(id,team_id,email,role,token_hash,status,expires_at,invited_by) values
  ('ab400000-0000-4000-8000-000000000001','ab200000-0000-4000-8000-000000000001','r12-life-player@example.test','manager',extensions.digest('r12-life-invite','sha256'),'pending',now()+interval '1 day','ab100000-0000-4000-8000-000000000001'),
  ('ab400000-0000-4000-8000-000000000002','ab200000-0000-4000-8000-000000000002','r12-life-other@example.test','manager',extensions.digest('r12-other-invite','sha256'),'pending',now()+interval '1 day','ab100000-0000-4000-8000-000000000004');

update public.runtime_controls set enabled=true where control='account_autonomy';

select ok(not has_table_privilege('authenticated','public.account_closure_requests','INSERT'),'cliente não cria encerramento por escrita direta');
select ok(not has_function_privilege('authenticated','public.issue_lifecycle_authorization(uuid,uuid,public.lifecycle_authorization_purpose,uuid)','EXECUTE'),'cliente não emite a própria prova de reautenticação');
select ok(not has_function_privilege('anon','public.leave_my_team(uuid,uuid)','EXECUTE'),'anônimo não encerra vínculo');

set local role authenticated;
select set_config('request.jwt.claim.sub','ab100000-0000-4000-8000-000000000003',true);

select is((select count(*) from public.list_my_account_relationships()),4::bigint,'titular vê somente seus dois vínculos, pedido e convite');
select is((select count(*) from public.list_my_account_relationships() where team_id='ab200000-0000-4000-8000-000000000003'),0::bigint,'listagem não vaza time de outro titular');
select throws_ok($$select public.withdraw_my_team_request('ab300000-0000-4000-8000-000000000003','ab500000-0000-4000-8000-000000000001')$$,'42501',null,'titular não retira pedido alheio');
select lives_ok($$select public.withdraw_my_team_request('ab300000-0000-4000-8000-000000000001','ab500000-0000-4000-8000-000000000002')$$,'titular retira o próprio pedido');
select is((select count(*) from public.athletes where id='ab300000-0000-4000-8000-000000000001'),0::bigint,'pedido deixa de autorizar entrada imediatamente');
select is((select count(*) from public.athletes where id='ab300000-0000-4000-8000-000000000003'),1::bigint,'retirada não altera atleta de outro titular');
select throws_ok($$select public.decline_my_team_invitation('ab400000-0000-4000-8000-000000000002','ab500000-0000-4000-8000-000000000003')$$,'42501',null,'titular não recusa convite alheio');
select lives_ok($$select public.decline_my_team_invitation('ab400000-0000-4000-8000-000000000001','ab500000-0000-4000-8000-000000000004')$$,'titular recusa o próprio convite');
reset role;
select is((select status from public.team_invitations where id='ab400000-0000-4000-8000-000000000001'),'declined'::public.team_invitation_status,'convite recusado fica inválido');
set local role authenticated;
select set_config('request.jwt.claim.sub','ab100000-0000-4000-8000-000000000003',true);

select lives_ok($$select public.leave_my_team('ab200000-0000-4000-8000-000000000002','ab500000-0000-4000-8000-000000000005')$$,'titular sai do time em uma transação');
select is((select user_id from public.athletes where id='ab300000-0000-4000-8000-000000000002'),null::uuid,'saída remove identidade do vínculo esportivo');
reset role;
select is((select status from public.athletes where id='ab300000-0000-4000-8000-000000000003'),'active'::public.athlete_status,'saída preserva outro titular do mesmo time');
select is((select count(*) from public.team_memberships where team_id='ab200000-0000-4000-8000-000000000001' and user_id='ab100000-0000-4000-8000-000000000003'),1::bigint,'saída de um time preserva administração em outro');

set local role authenticated;
select set_config('request.jwt.claim.sub','ab100000-0000-4000-8000-000000000004',true);
select throws_ok($$select public.leave_my_team('ab200000-0000-4000-8000-000000000003','ab500000-0000-4000-8000-000000000006')$$,'23514',null,'último owner não consegue sair');
select is((select count(*) from public.team_memberships where team_id='ab200000-0000-4000-8000-000000000003' and role='owner' and status='active'),1::bigint,'falha preserva owner ativo');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','ab100000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.transfer_my_team_ownership('ab200000-0000-4000-8000-000000000001','ab100000-0000-4000-8000-000000000002','ab500000-0000-4000-8000-000000000007')$$,'owner transfere para membro ativo');
select is((select role from public.team_memberships where team_id='ab200000-0000-4000-8000-000000000001' and user_id='ab100000-0000-4000-8000-000000000002'),'owner'::public.team_role,'destinatário vira owner');
select is((select role from public.team_memberships where team_id='ab200000-0000-4000-8000-000000000001' and user_id='ab100000-0000-4000-8000-000000000001'),'admin'::public.team_role,'autor permanece administrador até escolher sair');

select throws_ok($$select public.close_my_team('ab200000-0000-4000-8000-000000000001','R12 Vida A','ab500000-0000-4000-8000-000000000008')$$,'42501',null,'encerramento do time falha sem reautenticação curta');
reset role;
select public.issue_lifecycle_authorization('ab100000-0000-4000-8000-000000000002','ab500000-0000-4000-8000-000000000009','close_team','ab200000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','ab100000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.close_my_team('ab200000-0000-4000-8000-000000000001','nome incorreto','ab500000-0000-4000-8000-000000000009')$$,'22023',null,'nome exato é confirmação humana separada');
select lives_ok($$select public.close_my_team('ab200000-0000-4000-8000-000000000001','R12 Vida A','ab500000-0000-4000-8000-000000000009')$$,'owner reautenticado encerra o time');
reset role;
select ok((select closed_at is not null and not is_public from public.teams where id='ab200000-0000-4000-8000-000000000001'),'time fechado sai da superfície pública');
select is((select count(*) from public.team_memberships where team_id='ab200000-0000-4000-8000-000000000001' and status='active'),0::bigint,'time fechado revoga todos os acessos');
select is((select count(*) from private.team_closure_storage_jobs where request_id='ab500000-0000-4000-8000-000000000009' and status='pending'),1::bigint,'limpeza de arquivos do time fica recuperável');
set local role authenticated;
select set_config('request.jwt.claim.sub','ab100000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.close_my_team('ab200000-0000-4000-8000-000000000001','R12 Vida A','ab500000-0000-4000-8000-000000000009')$$,'42501',null,'autorização consumida não é reutilizável');

reset role;
select public.issue_lifecycle_authorization('ab100000-0000-4000-8000-000000000004','ab500000-0000-4000-8000-000000000010','close_account',null);
set local role authenticated;
select set_config('request.jwt.claim.sub','ab100000-0000-4000-8000-000000000004',true);
select throws_ok($$select public.begin_my_account_closure('ab500000-0000-4000-8000-000000000010')$$,'23514',null,'conta não encerra enquanto for último owner de time aberto');
select ok(not public.is_my_account_blocked(),'falha por owner não bloqueia a conta');

reset role;
select public.issue_lifecycle_authorization('ab100000-0000-4000-8000-000000000003','ab500000-0000-4000-8000-000000000011','close_account',null);
set local role authenticated;
select set_config('request.jwt.claim.sub','ab100000-0000-4000-8000-000000000003',true);
select lives_ok($$select public.begin_my_account_closure('ab500000-0000-4000-8000-000000000011')$$,'conta reautenticada entra em encerramento');
select ok(public.is_my_account_blocked(),'bloqueio passa a valer imediatamente');
reset role;
select is((select count(*) from public.profiles where user_id='ab100000-0000-4000-8000-000000000003'),0::bigint,'perfil pessoal é minimizado');
select is((select count(*) from public.team_memberships where user_id='ab100000-0000-4000-8000-000000000003'),0::bigint,'permissões restantes são revogadas');
select is((select count(*) from public.athletes where user_id='ab100000-0000-4000-8000-000000000003'),0::bigint,'nenhum vínculo mantém identidade recuperável');
select is((select count(*) from public.athletes where id='ab300000-0000-4000-8000-000000000003'),1::bigint,'encerramento preserva vínculo de outro titular');

select lives_ok($$select public.complete_account_closure('ab500000-0000-4000-8000-000000000011',null)$$,'worker conclui etapa Auth idempotente');
select lives_ok($$select public.complete_account_closure('ab500000-0000-4000-8000-000000000011',null)$$,'repetição da conclusão não falha');
select is((select status from public.account_closure_requests where request_id='ab500000-0000-4000-8000-000000000011'),'completed'::public.account_closure_status,'recibo registra conclusão');
select is((select metadata from public.audit_logs where action='account_closure.completed' and request_id='ab500000-0000-4000-8000-000000000011'),'{"result":"completed"}'::jsonb,'auditoria de conclusão não contém PII');

select * from finish();
rollback;
