---
id: R11
type: vertical
status: draft
outcome: "Permitir que a pessoa administradora contrate uma assinatura mensal por time pelo Asaas e libere os benefícios pagos após confirmação verificável, sem acoplar cobrança, onboarding ou automação de WhatsApp ao provedor."
depends_on: [R00, R03, R03R, R08M]
baseline:
  - BASE-TENANCY
  - BASE-WRITES
  - BASE-DELIVERY
verified_at: "a3a5087"
decisions:
  - DEC-SUBSCRIPTION-BILLING
invariants:
  - INV-MOBILE-WHATSAPP-FIRST
  - INV-RLS-MULTI-TIME
  - INV-DEPLOY-COMPATIBLE
  - INV-MANUAL-FALLBACK
---

# R11 — Assinatura do DeuTime pelo Asaas

## Resultado demonstrável

No celular, a pessoa administradora autorizada escolhe o time, consulta a oferta
vigente sincronizada, abre o checkout hospedado do Asaas e acompanha o estado
`Aguardando confirmação`. Somente um evento externo verificado ativa localmente
a assinatura e os benefícios pagos. Atraso, cancelamento ou indisponibilidade do
provedor nunca apagam o time, os atletas, o histórico nem o fallback manual.

## Três tempos

### Passado a preservar

- R00 mantém flags, kill switches, rollout controlado, smoke e rollback;
- R03 e R03R mantêm consentimento, opt-out, idempotência, observabilidade,
  limites, duas cotas e compartilhamento manual no WhatsApp;
- cada time pertence ao próprio tenant e toda identidade administrativa deriva
  da sessão verificada;
- o produto continua utilizável manualmente quando integração ou automação está
  desligada.

### Presente a resolver

- não existe assinatura paga nem projeção local de entitlement por time;
- preço, ciclo, cliente, assinatura e cobranças ainda não possuem fonte comercial;
- automações não podem ser liberadas por retorno do navegador nem por estado
  informado pelo cliente;
- não há política aceita de carência, suspensão, reativação, cancelamento ou
  reconciliação financeira.

### Futuro compatível

- outro provedor poderá substituir o Asaas sem reescrever onboarding,
  entitlement, automação de WhatsApp ou regras de inadimplência;
- novos planos e versões de benefícios poderão ser adicionados por expansão,
  sem alterar silenciosamente contratos existentes;
- cobrança individual de atletas, split, repasse, subcontas e marketplace ficam
  fora da R11 e exigem análise regulatória, contábil e operacional própria.

## Escopo

### Incluído

- assinatura mensal por time, com oferta interna inicial `racha`;
- preço público de referência de R$ 79,90/mês e eventual piloto de R$ 59,90/mês,
  sempre vindos da configuração comercial observada e nunca hard-coded na UI;
- checkout hospedado do Asaas e retorno em estado de espera;
- adapter neutro para oferta, cliente, checkout, assinatura, cancelamento,
  webhook e reconciliação;
- projeção local de assinatura, carência, suspensão e entitlement por time;
- tela administrativa de leitura com plano, provedor, referência externa, preço,
  ciclo, última sincronização, divergência e link para o painel do Asaas;
- webhooks verificados, idempotentes e tolerantes a duplicação, atraso e ordem;
- reconciliação manual e periódica, telemetria redigida e trilha de auditoria;
- liberação e suspensão somente dos benefícios pagos e da automação definida
  pelo plano, preservando consentimento, opt-out, limites e fallback manual;
- flags por time, allowlist de piloto e kill switches separados para criar
  cobrança, consumir eventos e aplicar suspensão.

### Fora

- cobrança individual de atletas, repasse ou split de pagamentos;
- subcontas, marketplace, Pix Automático para mensalidade de atletas;
- cobrança por uso, editor local de preços ou plano anual;
- migração automática de assinaturas antigas para novos preços;
- estorno automático e armazenamento de dados de cartão.

## Contratos e decisões

- Asaas é a fonte comercial de valor, ciclo, cliente, assinatura e cobranças;
- DeuTime é a fonte operacional de time beneficiado, administrador autorizado,
  projeção local, carência, benefícios, suspensão, auditoria e fallback;
- nenhum acesso consulta o Asaas de forma síncrona; entitlement usa a projeção
  local atualizada por webhook e reconciliação;
- `plan_code`, provedor, referência externa, valor/ciclo observados, data de
  sincronização e versão dos benefícios formam um vínculo explícito;
- novo preço vale por padrão apenas para novas assinaturas; migração de contrato
  existente exige política comercial explícita;
- estados externos são normalizados para `pending`, `active`, `past_due`,
  `grace_period`, `suspended`, `canceled` e `expired`;
- o retorno do checkout nunca ativa assinatura ou benefício;
- CP0 deve validar no sandbox o produto efetivamente disponível no Asaas,
  checkout, alteração de preço, assinatura existente, autenticação de webhook,
  cancelamento e reativação antes de fechar os contratos;
- decisões bloqueadoras: modelo da oferta no Asaas, duração/configuração da
  carência, benefícios e limites de `racha`, política de cancelamento,
  grandfathering e responsabilidade de suporte financeiro.

## Interface neutra do provedor

O contrato deverá oferecer operações equivalentes a:

- `resolveOffer(planCode)`;
- `createCustomer()`;
- `createSubscriptionCheckout()`;
- `getSubscription()`;
- `cancelSubscription()`;
- `parseAndVerifyWebhook()`;
- `reconcileSubscription()`.

Objetos, estados e nomes de eventos do Asaas não atravessam o adapter. Trocar o
adapter não pode exigir mudanças no onboarding, entitlement ou WhatsApp.

## Entry points

- `app/app/[teamSlug]/settings/page.tsx`: superfície owner/admin existente para
  oferta, estado projetado, divergência e ações; manager já falha fechado;
- `lib/features/registration-email/contract.ts`: referência de contrato neutro
  com resultados aceito, rejeitado e ambíguo; a R11 terá domínio próprio em
  `lib/features/subscriptions/`, sem importar tipos do Asaas;
- `app/api/integrations/twilio/whatsapp/status/route.ts`: referência de webhook
  server-only com URL canônica, autenticação antes do banco, limite de corpo e
  resposta que não revela correlação; o Asaas terá rota e verificador próprios;
- `supabase/migrations/202607270001_delivery_foundation.sql`: referência de
  flag por time, controles globais, auditoria, RLS e grants mínimos;
- `lib/features/registration-email/ses-adapter.test.ts` e
  `app/api/integrations/twilio/whatsapp/status/route.test.ts`: contratos de
  configuração parcial, falha fechada, efeito ambíguo, autenticação inválida e
  persistência mínima que os testes da R11 devem preservar.

## Pacotes de trabalho

| Pacote | Critérios | Resultado | Validação |
|---|---|---|---|
| `DP-R11-01` — sandbox e contratos | `AC-R11-01`, `02`, `03` | comportamento comercial verificado, decisões aceitas e entrypoints concretos | CP0 |
| `WP-R11-01` — expansão inerte | `AC-R11-03`, `04`, `07`, `08` | modelo local, RLS, RPCs, adapter neutro e flags, sem consumidor ativo | CP1 + `VAL-DB` |
| `WP-R11-02` — checkout e projeção | `AC-R11-01` a `06` | oferta observada, jornada mobile e assinatura local sem ativação pelo retorno | CP2 + `VAL-APP` |
| `WP-R11-03` — eventos e reconciliação | `AC-R11-04` a `10` | webhook, replay, ordem, backoff e reconciliação manual/automática | CP3 + integração sandbox |
| `WP-R11-04` — benefícios pagos | `AC-R11-06`, `09`, `11` | entitlement conecta plano à automação sem quebrar fallback | CP4 + `VAL-APP`/`VAL-DB` |
| `WP-R11-05` — robustez e piloto | `AC-R11-01` a `13` | segurança, telemetria, recuperação, allowlist, piloto e rollback | CP5–CP6 |

## Critérios de aceite

- [ ] `AC-R11-01` — Administrador autorizado sai da oferta e chega à assinatura ativa pelo celular, com preço e ciclo correspondentes ao Asaas.
- [ ] `AC-R11-02` — Nenhum preço comercial fica hard-coded no frontend ou nas regras; divergência aparece na tela somente de leitura.
- [ ] `AC-R11-03` — Adapter e estados normalizados isolam o domínio de objetos, nomes de eventos e estados específicos do Asaas.
- [ ] `AC-R11-04` — Retorno do checkout não ativa acesso; somente evento verificado ou reconciliação autorizada altera a projeção local.
- [ ] `AC-R11-05` — Evento duplicado, atrasado ou fora de ordem não duplica assinatura, cobrança ou benefício nem regride estado indevidamente.
- [ ] `AC-R11-06` — Assinatura ativa libera somente benefícios versionados do plano e preserva consentimento, opt-out, limites, fair use e controle por time.
- [ ] `AC-R11-07` — Sessão, RLS, grants e RPCs impedem leitura, checkout, cancelamento ou alteração cross-tenant e ignoram `team_id`, preço e estado do navegador.
- [ ] `AC-R11-08` — Nenhum dado de cartão é armazenado e logs, auditoria, analytics e telemetria não persistem payload, PII ou segredo desnecessário.
- [ ] `AC-R11-09` — Atraso entra em carência configurada; suspensão afeta apenas recursos pagos, e pagamento confirmado reativa automaticamente.
- [ ] `AC-R11-10` — Reconciliação manual e periódica detecta divergência, usa backoff, alerta e oferece procedimento de recuperação quando o Asaas falha.
- [ ] `AC-R11-11` — Operação manual do time e do WhatsApp continua disponível quando cobrança, eventos, suspensão ou provedor estão desligados.
- [ ] `AC-R11-12` — Telemetria mede funil, confirmação, estados, MRR, conversão, churn, webhooks, divergências, custo de mensagens e consumo por plano sem PII.
- [ ] `AC-R11-13` — Interface, autorização, testes, telemetria, suporte, recuperação, piloto, fallback e rollback estão comprovados antes do rollout.

## Riscos e controles

| Risco | Controle | Evidência exigida |
|---|---|---|
| retorno falso ou pagamento ainda pendente liberar acesso | ativação exclusiva por webhook verificado ou reconciliação autorizada | teste negativo e piloto sandbox |
| preço observado divergir da cobrança | vínculo versionado, leitura de divergência e falha fechada | teste de sincronização e alteração de preço |
| evento duplicado ou fora de ordem regredir estado | inbox idempotente, versão temporal e transação sob lock | concorrência e replay |
| pessoa operar assinatura de outro time | sessão verificada, RLS, FK composta, grants mínimos e RPC | pgTAP cross-tenant |
| falha do Asaas bloquear o racha | projeção local, carência e fallback manual | ensaio de indisponibilidade |
| suspensão apagar fatos ou bloquear o básico | entitlement separado de time, elenco e histórico | teste de suspensão/reativação |
| adapter contaminar o domínio | contrato neutro e teste com adapter substituto | teste de contrato |
| preço novo alterar assinatura existente | grandfathering padrão e migração explícita | sandbox e auditoria |
| webhook ou log vazar PII/segredo | verificação antes do processamento e persistência mínima redigida | testes de segurança e censo de logs |

## Validação

Quando a release for promovida, usar os perfis aplicáveis do playbook e incluir:

```bash
npm run migrations:check -- origin/main HEAD
npm run db:reset
npm run db:lint
npm run db:test
npm run db:types
npm run verify
npm run security:audit
```

Além dos gates locais, CP0–CP6 exigem sandbox Asaas, webhook real assinado,
concorrência, replay, atraso, ordem invertida, cancelamento, carência, reativação,
cross-tenant, compatibilidade N/N−1, jornada mobile e piloto controlado.

## Rollout, fallback e rollback

- release e consumidor nascem desligados, com allowlist de um time piloto;
- kill switches independentes controlam criação comercial, consumo de eventos e
  aplicação de suspensão;
- fallback preserva operação manual e automação já permitida pela política ativa;
- telemetria registra somente funil, contagens, estados normalizados, duração,
  custo agregado e divergência;
- rollback impede novos efeitos, preserva eventos, projeção, auditoria, time,
  elenco e histórico e nunca cancela cobrança externamente por acidente;
- app e banco toleram N/N−1 nas duas ordens de deploy;
- migração para outro provedor exige adapter novo e operação explícita, nunca
  reinterpretação silenciosa de eventos ou assinaturas pendentes.

## Evidências e checkpoint

### `DP-R11-01` — descoberta iniciada em 2026-09-03; CP0 pendente

- `DEC-SUBSCRIPTION-BILLING` registra a fronteira proposta do provedor, o
  threat model inicial, opções, consequências, validação e reversão;
- a documentação oficial confirmou ambientes e chaves independentes, checkout
  recorrente hospedado, retorno não confirmatório, webhook `at least once` com
  token próprio, eventos separados de assinatura/cobrança e atualização de
  preço apenas para cobranças futuras por padrão;
- entrypoints concretos de interface administrativa, adapter, webhook, flags,
  controles e testes foram localizados em `a3a5087`;
- nenhuma API, credencial, migration, tabela, checkout, webhook, flag ou time foi
  criado ou alterado;
- o ambiente local não possui `ASAAS_SANDBOX_API_KEY`. CP0 permanece aberto até
  o ensaio real de oferta, checkout, preço, assinatura existente, webhook,
  cancelamento e reativação com dados sintéticos;
- ainda exigem decisão do responsável do produto: preço inicial, benefícios do
  plano `racha`, carência, cancelamento, grandfathering e suporte financeiro;
- CP1 continua proibido enquanto a decisão estiver `proposed`.
