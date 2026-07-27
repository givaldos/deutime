---
id: R00
type: enabling
status: active
outcome: "Entregar as próximas jornadas com contratos claros, ativação controlada, smoke test e rollback praticável."
depends_on: []
baseline:
  - BASE-DELIVERY
  - BASE-TENANCY
verified_at: 77aed23
decisions:
  - DEC-PERSISTENT-ACCESS
invariants:
  - INV-MOBILE-WHATSAPP-FIRST
  - INV-RLS-MULTI-TIME
  - INV-DEPLOY-COMPATIBLE
---

# R00 — Fundação de entrega

## Resultado demonstrável

Uma feature inerte pode ser implantada em ambiente isolado, habilitada para um único time, verificada por smoke test e desligada sem migration reversa nem indisponibilidade das jornadas atuais.

## Três tempos

### Passado a preservar

- O repositório já separa qualidade, banco, dependências, CodeQL e Terraform em CI.
- O runbook exige migrations forward-only; RLS deny-by-default e pgTAP já cobrem parte importante do isolamento, mas ainda não existe gate contra edição de migration aplicada.
- Aplicação e banco possuem mecanismos independentes de publicação, embora o repositório não comprove que estejam ativos e saudáveis em produção.
- A aplicação atual não possui um sistema de feature flags nem E2E/smoke pós-deploy.

### Presente a resolver

- Formalizar o contrato de credencial reutilizável e sessão duradoura com threat model.
- Registrar cada decisão bloqueadora na release que realmente a consome, sem antecipar modelo de partida, provedor ou moderação.
- Criar ativação por time, kill switches server-side, staging isolado e smoke test mínimo.
- Garantir que deploys de aplicação e banco funcionem em qualquer ordem.

### Futuro compatível

- Flags devem servir a link, WhatsApp, pós-jogo, votação, comentários e divisão sem virar sistema de autorização.
- O smoke test deve crescer por jornada sem acoplar produção a dados mutáveis.

Ficam fora desta release as jornadas finais de confirmação, envio, pós-jogo e divisão.

## Escopo

### Incluído

- processo de ADR e conclusão do threat model de `DEC-PERSISTENT-ACCESS`;
- capacidade tipada por time, desligada por padrão e conferida server-side;
- kill switches globais para integrações e workers;
- controles separados para produzir e consumir a outbox;
- contrato de staging sem reutilizar banco ou segredos de produção;
- smoke de produção somente leitura e smoke de escrita idempotente em tenant sintético de staging;
- gate que impede alterar ou remover migration existente no merge-base;
- censo dinâmico de RLS e grants para novas tabelas públicas;
- expansão inerte publicada antes do consumidor e procedimento de promoção compatível;
- template de release, checkpoint e gates atualizados.

### Fora

- painel sofisticado de flags;
- plataforma genérica de experimentação;
- automação completa de E2E para todas as telas;
- ativação de qualquer mensagem real.

## Entry points

- `.github/workflows/ci.yml`
- `.github/workflows/database.yml`
- `.github/workflows/deploy-database.yml`
- `.github/workflows/terraform.yml`
- `infra/terraform/main.tf`
- `docs/architecture.md`
- `docs/security.md`
- `docs/runbook.md`
- `supabase/tests/001_rls_and_public_api.test.sql`

## Pacotes de trabalho

| Pacote | Tipo e primeiro consumidor | Critérios | Entry points | Validação |
|---|---|---|---|---|
| `DP-R00-01` — concluir ADR e threat model do acesso persistente | descoberta para R02 | `AC-R00-01` | `DEC-PERSISTENT-ACCESS.md`, `security.md`, `architecture.md` | revisão de contrato + threat model |
| `WP-R00-02` — flags e kill switches | habilitador para R02/R03 | `AC-R00-02` a `04`, `11` | nova feature isolada, migration nova e teste pgTAP | `VAL-APP`, `VAL-DB`, falha/timeout |
| `WP-R00-03` — integridade de migrations, RLS e deploy | habilitador para toda release com banco/infra | `AC-R00-05`, `09`, `10`, `13` | workflows de banco/deploy/Terraform e pgTAP global | `VAL-DB`, `VAL-INFRA`, matriz de compatibilidade |
| `WP-R00-04` — staging, smoke e recuperação | habilitador para todos os pilotos | `AC-R00-06` a `08`, `12` | Terraform, workflows e runbook | `VAL-INFRA`, smoke produção/staging |

## Critérios de aceite

- [x] `AC-R00-01` — `DEC-PERSISTENT-ACCESS` possui ADR e threat model aceitos; toda outra decisão aberta tem release consumidora e não bloqueia a R01.
- [x] `AC-R00-02` — Uma capacidade desligada não pode ser acionada por UI, Action ou RPC manipulada.
- [x] `AC-R00-03` — É possível ativar e desativar a capacidade para um único time sem deploy.
- [x] `AC-R00-04` — Produção e consumo de integrações possuem kill switches independentes.
- [ ] `AC-R00-05` — Expansão inerte é publicada e verificada com o app anterior antes de liberar o app consumidor; uma matriz N/N−1 ou evidência equivalente cobre a compatibilidade.
- [ ] `AC-R00-06` — Staging não usa dados, chaves ou callbacks de produção.
- [x] `AC-R00-07` — Smoke test detecta indisponibilidade das jornadas públicas essenciais sem escrever dados pessoais.
- [ ] `AC-R00-08` — Rollback de aplicação e desativação por flag foram ensaiados e documentados.
- [x] `AC-R00-09` — CI falha se migration existente no merge-base for alterada ou removida e o deploy valida o histórico remoto antes de escrever.
- [x] `AC-R00-10` — pgTAP percorre dinamicamente as tabelas elegíveis e falha por RLS ou grant inseguro não allowlisted.
- [x] `AC-R00-11` — Somente operador autorizado altera flags, toda mudança é auditada e falha/timeout desliga apenas a capacidade nova, preservando o fluxo legado.
- [ ] `AC-R00-12` — Staging usa tenant sintético sem PII para testar escrita idempotente, acesso permitido, negação, cross-tenant e limpeza.
- [ ] `AC-R00-13` — Terraform aplica exatamente o artefato de plano revisado sob Environment protegido; `ENABLE_TERRAFORM_APPLY` permanece desligado até esse gate existir.

## Riscos e controles

| Risco | Controle | Evidência |
|---|---|---|
| App consumidor sobe antes do schema | expansão inerte em PR/deploy anterior + matriz N/N−1 | `AC-R00-05` |
| Migration aplicada é reescrita | diff contra merge-base e preflight do histórico remoto | `AC-R00-09` |
| Tabela nasce sem RLS/grant seguro | censo pgTAP dinâmico com allowlist explícita | `AC-R00-10` |
| Serviço de flags falha | fail-closed só para a feature nova e fluxo legado independente | `AC-R00-11` |
| Smoke público passa sem testar autorização | tenant sintético e escrita idempotente em staging | `AC-R00-12` |
| Terraform aplica mudança não revisada | plano imutável aprovado e mesmo artefato no apply protegido | `AC-R00-13` |

## Validação

- `DP-R00-01`: revisão de ADR/threat model com `DEC-PERSISTENT-ACCESS`.
- `WP-R00-02`: `VAL-APP` + `VAL-DB`, incluindo timeout e acesso não autorizado.
- `WP-R00-03`: `VAL-DB`, merge-base imutável e matriz N/N−1.
- `WP-R00-04`: `VAL-INFRA`, smoke somente leitura em produção e escrita sintética em staging.

## Rollout, fallback e rollback

- flags nascem `false`;
- primeiro piloto usa somente time de teste;
- fluxo atual permanece fallback;
- rollback desliga flag, pausa consumidor externo e promove o último deploy conhecido como bom;
- a infraestrutura de flags nasce por expansão própria e não depende da flag que está introduzindo;
- banco recebe apenas expansão compatível; remoção ocorre em release posterior.

## Evidências e checkpoint

Implementação local concluída até CP4:

- `DP-R00-01`: threat model aceito em `DEC-PERSISTENT-ACCESS`, com transporte,
  ciclo de vida, revogação e release consumidora definidos;
- `WP-R00-02`: migration aditiva, tipos gerados, camada server-side fail-closed,
  29 testes pgTAP focados e testes Vitest de erro/timeout/independência;
- `WP-R00-03`: gate de merge-base, preflight remoto, censo dinâmico de RLS e
  grants, correção forward-only de grants anônimos legados e Terraform
  `fmt/validate` válido;
- `WP-R00-04`: workflow de smoke, teste local somente leitura aprovado e
  contrato de staging/rollback registrado no runbook;
- gates locais: lint, typecheck, 64 testes Vitest, 293 testes pgTAP, build de
  produção e auditoria npm com zero vulnerabilidades;
- Terraform aplica o mesmo `tfplan` publicado para revisão; as Actions de
  upload/download foram fixadas nos commits assinados das releases declaradas.

CP5 permanece pendente porque exige estado externo: configurar os Environments
`production-plan`, `production` e `staging`, manter
`ENABLE_TERRAFORM_APPLY=false` até a proteção existir, executar o smoke
sintético, validar app N−1 com schema N, ensaiar promoção do deployment anterior
e anexar os IDs reais. Por isso `AC-R00-05`, `06`, `08`, `12` e `13` ainda não
estão marcados e a release não pode avançar para `done`.
