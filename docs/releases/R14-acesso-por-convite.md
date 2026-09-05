---
id: R14
type: vertical
status: done
outcome: "Permitir que somente pessoas convidadas concluam a criação de uma nova equipe durante o pré-lançamento, com desligamento operacional imediato no lançamento comercial."
verified_at: "9cf074c"
depends_on:
  - R00
  - R12
baseline:
  - BASE-TENANCY
  - BASE-WRITES
decisions:
  - DEC-PRELAUNCH-INVITE-ACCESS
invariants:
  - INV-MOBILE-WHATSAPP-FIRST
  - INV-RLS-MULTI-TIME
  - INV-DEPLOY-COMPATIBLE
  - INV-SINGLE-SOURCE
---

# R14 — Acesso por convite no pré-lançamento

## Resultado demonstrável

No celular, uma pessoa autenticada informa nome, modalidade, endereço público e
o código recebido. Um convite válido é consumido junto com a criação da equipe;
qualquer código ausente, inválido, vencido, revogado ou já usado mantém a pessoa
na tela com orientação segura. Ao desligar a política, o campo desaparece e a
criação normal volta sem deploy.

## Escopo

### Incluído

- código individual de uso único por padrão, validade, revogação e limite de usos;
- hash sem armazenamento do segredo em texto puro;
- formulário mobile, validação na Action e autorização transacional na RPC;
- emissão operacional exclusiva de `service_role`;
- auditoria redigida de emissão e resgate;
- controle global inerte, ativação explícita, smoke e rollback.

### Fora

- bloquear criação da conta de autenticação antes do login;
- painel administrativo para campanhas, e-mail automático ou atribuição a lead;
- substituir convites de administradores ou atletas de equipes existentes;
- monetização, lista de espera, referral ou ranking de indicações.

## Contratos CP0–CP1

A decisão
[`DEC-PRELAUNCH-INVITE-ACCESS`](../decisions/DEC-PRELAUNCH-INVITE-ACCESS.md)
define segredo bearer, hash, consumo atômico, resposta não enumerável,
compatibilidade de deploy e rollback. A migration nasce inerte e a autorização
é derivada da sessão verificada dentro da RPC.

## Entry points

- `app/app/new-team/page.tsx`;
- `components/create-team-form.tsx`;
- `app/app/new-team/actions.ts`;
- `lib/validation/onboarding.ts`;
- `supabase/migrations/202609050001_prelaunch_invite_enums.sql`;
- `supabase/migrations/202609050002_prelaunch_team_invite_access.sql`;
- `scripts/prelaunch-team-invite.mjs`.

## Critérios de aceite

- [x] controle desligado preserva a criação compatível sem consumir convite;
- [x] controle ligado exige código válido e cria equipe + resgate atomicamente;
- [x] código inválido, vencido, revogado ou esgotado falha com mensagem única;
- [x] concorrência não ultrapassa o limite de resgates;
- [x] `anon` e `authenticated` não leem nem escrevem convites ou resgates;
- [x] UI é acessível em 360 px, não inclui código em URL e evita autocomplete;
- [x] emissão, status e ativação possuem comando operacional sem imprimir hash;
- [x] deploy banco/app funciona nas duas ordens com expansão inicialmente inerte;
- [x] rollback libera criação sem apagar equipes, convites ou resgates;
- [x] testes `VAL-APP`, `VAL-DB`, segurança e smoke produtivo passam.

## Validação

- `npm test -- lib/validation/onboarding.test.ts app/app/new-team/actions.test.ts`;
- `npm run typecheck` e `npm run verify`;
- `npm run db:reset`, `npm run db:lint`, `npm run db:test`, `npm run db:types`;
- `npm run migrations:check -- origin/dev HEAD`;
- `npm run security:audit`;
- smoke produtivo com controle desligado, ligado e restaurado.

## Rollout

1. publicar a expansão inerte;
2. publicar o formulário e a Action compatíveis;
3. emitir um código operacional de prova sem registrar o segredo;
4. ativar `team_creation_invite_only` explicitamente;
5. confirmar negação sem código, consumo válido e impossibilidade de replay;
6. exercitar rollback, restaurar o estado ativo e encerrar CP6.

## Evidências CP2–CP6

- o PR `#393` promoveu a fatia completa para `dev` e o PR `#394` promoveu
  `dev → main` no commit `9cf074c`; CI, Database, CodeQL, Dependency review,
  Terraform e Vercel aprovaram as duas passagens;
- quatro arquivos focados somaram 18 testes de validação, Action, interface e
  gerador; o gate integral aprovou 125 arquivos e 606 testes de aplicação;
- o Database aprovou 70 arquivos e 1.833 testes pgTAP, incluindo 31 cenários da
  R14 para grants, RLS, inércia, código inválido, vencido, revogado, consumo,
  replay, atomicidade, auditoria redigida e rollback;
- a auditoria npm encontrou zero vulnerabilidades; typecheck, lint, integridade
  das migrations e build Webpack passaram. Vercel comprovou o build equivalente;
- o Deploy Supabase `33983401376` aplicou e verificou as duas migrations. O
  Database pós-merge `33983401386`, CI `33983401362`, CodeQL `33983401361`,
  Terraform `33983401378` e smoke produtivo `33983439072` passaram;
- a leitura inicial confirmou política desligada e zero códigos. Um convite
  individual, com um uso e validade de 30 dias, foi emitido sem persistir ou
  registrar o segredo em texto puro;
- o ensaio produtivo confirmou `ativa → desligada → ativa`, mantendo um código
  disponível, zero resgates, zero vencidos e zero revogados em todas as
  transições. O estado final é `invite_only = true`.
