---
id: R14
type: vertical
status: active
outcome: "Permitir que somente pessoas convidadas concluam a criação de uma nova equipe durante o pré-lançamento, com desligamento operacional imediato no lançamento comercial."
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

- [ ] controle desligado preserva a criação compatível sem consumir convite;
- [ ] controle ligado exige código válido e cria equipe + resgate atomicamente;
- [ ] código inválido, vencido, revogado ou esgotado falha com mensagem única;
- [ ] concorrência não ultrapassa o limite de resgates;
- [ ] `anon` e `authenticated` não leem nem escrevem convites ou resgates;
- [ ] UI é acessível em 360 px, não inclui código em URL e evita autocomplete;
- [ ] emissão, status e ativação possuem comando operacional sem imprimir hash;
- [ ] deploy banco/app funciona nas duas ordens com expansão inicialmente inerte;
- [ ] rollback libera criação sem apagar equipes, convites ou resgates;
- [ ] testes `VAL-APP`, `VAL-DB`, segurança e smoke produtivo passam.

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
