---
id: R03
type: vertical
status: discovery
outcome: "Enviar uma chamada real pelo WhatsApp, com consentimento, retry, entrega observável e retorno pelo link estável do evento."
depends_on:
  - R01
  - R02
baseline:
  - BASE-ATTENDANCE
  - BASE-WRITES
  - BASE-DELIVERY
verified_at: "3d0b1b1"
decisions:
  - DEC-WHATSAPP-PROVIDER
  - DEC-PERSISTENT-ACCESS
invariants:
  - INV-MOBILE-WHATSAPP-FIRST
  - INV-RLS-MULTI-TIME
  - INV-DEPLOY-COMPATIBLE
  - INV-CANONICAL-EVENT-URL
  - INV-PRIVATE-BY-DEFAULT
  - INV-MANUAL-FALLBACK
---

# R03 — WhatsApp ponta a ponta

## Resultado demonstrável

Uma pessoa administradora dispara a chamada de um evento para atletas ativos e
consentidos. O worker envia um template pelo WhatsApp com o link personalizado,
retry não duplica mensagens, callbacks atualizam entrega de forma idempotente e
o atleta responde na página estável da R02. Se a automação falhar ou estiver
desligada, a diretoria continua copiando e enviando o link manualmente.

## Três tempos

### Passado a preservar

- R01 mantém evento, fuso, cancelamento e remarcação autoritativos;
- R02 mantém URL pública, capability atleta-evento, revogação e RSVP;
- `communication_consents` e `notification_outbox` já existem com RLS,
  destinatário, payload, tentativas, disponibilidade, status e dedupe;
- `integration_produce` e `integration_consume` existem desligados e falham
  fechados;
- compartilhamento manual e smoke de produção continuam como fallback.

### Presente a resolver

- fechar o contrato provider-neutral do worker, retries e callbacks;
- aprovar template em português e validar o Sandbox com participantes demo;
- impedir envio sem consentimento, telefone, vínculo ativo ou chamada elegível;
- tornar enqueue, claim, envio, status e falha observáveis sem registrar PII ou
  credenciais;
- registrar sender próprio e template antes de atletas reais.

### Futuro compatível

- reminders, outros templates e outro BSP podem reutilizar a outbox e o adapter;
- respostas livres e bot conversacional ficam fora desta release;
- SMS, e-mail, marketing, campanhas, escalação e auto-divisão ficam fora;
- entrega/leitura do WhatsApp não altera RSVP nem presença real.

## Escopo

### Incluído

- disparo administrativo de uma chamada;
- outbox transacional, dedupe, claim concorrente, lease, retry e dead letter;
- adapter Twilio Programmable Messaging e Content API;
- template utilitário em português com conteúdo mínimo e link R02;
- callback assinado de status e normalização de estados;
- painel/telemetria mínima da operação e recuperação manual;
- piloto `Demo Campo` no Sandbox e preparação do sender de produção.

### Fora

- receber comandos de RSVP por texto ou botão no WhatsApp;
- automação de lembrete, marketing ou broadcast geral;
- mídia, localização exata, escalação ou resposta atual no template;
- substituir o WhatsApp usado pelo Supabase Auth para OTP;
- desativar o compartilhamento manual.

## Contratos e decisões

[`DEC-WHATSAPP-PROVIDER`](../decisions/DEC-WHATSAPP-PROVIDER.md) seleciona
Twilio Programmable Messaging + Content API atrás de adapter. O domínio conhece
somente template interno, variáveis validadas, destinatário E.164, chave de
dedupe e estados normalizados.

A escrita de enqueue e a mudança do evento que a origina devem ser atômicas. O
worker é o único consumidor com permissão de claim/ack; Actions validam e
delegam. Callback não recebe autorização de domínio: valida assinatura, resolve
o Message SID já conhecido e só avança a máquina de estados permitida.

O template inicial não promete entrega nem confirmação e não expõe a resposta
atual. O link personalizado é conhecido pelo provedor, como registrado no
threat model; nenhuma credencial entra em log, métrica ou auditoria.

## Entry points

- código: `lib/features/delivery/capabilities.ts` e futuros adapters/workers em
  `lib/features/delivery/`;
- banco: `communication_consents`, `notification_outbox`,
  `runtime_controls`, `team_feature_flags` e migrations forward-only novas;
- integração: Route Handler de callback e executor autenticado do worker;
- testes: `lib/features/delivery/capabilities.test.ts`,
  `supabase/tests/013_delivery_foundation.test.sql` e novos testes focados;
- documentação: ADR do provedor, `docs/architecture.md`, `docs/security.md` e
  este pacote.

## Pacotes de trabalho

| Pacote | Critérios | Entry points principais | Validação |
|---|---|---|---|
| `DP-R03-01` — provedor e threat model | `AC-R03-01`, `02`, `08` | ADR, arquitetura, segurança, protótipo Sandbox | revisão documental + prova manual |
| `WP-R03-01` — enqueue e claim | `AC-R03-02` a `05` | migration nova, RPCs, outbox e pgTAP | `VAL-DB`, concorrência e N/N−1 |
| `WP-R03-02` — adapter e worker | `AC-R03-03` a `07` | `lib/features/delivery/`, executor e testes | `VAL-APP`, timeout/retry/falha |
| `WP-R03-03` — callback e operação | `AC-R03-05` a `08` | Route Handler, status, métricas e runbook | assinatura, replay e observabilidade |
| `WP-R03-04` — piloto e sender | `AC-R03-07` a `10` | template, Sandbox, sender e rollout | `VAL-INFRA`, Android/iPhone e rollback |

## Critérios de aceite

- [x] `AC-R03-01` — Provedor e fronteira do adapter estão decididos sem acoplar o domínio à Twilio.
- [ ] `AC-R03-02` — Um comando de chamada nasce atomicamente e possui dedupe estável por evento, atleta e versão do template.
- [ ] `AC-R03-03` — Somente atleta ativo, com telefone e consentimento vigente, entra na outbox do próprio time.
- [ ] `AC-R03-04` — Claims concorrentes, retry e recuperação não enviam a mesma intenção duas vezes.
- [ ] `AC-R03-05` — Callback com assinatura válida atualiza somente Message SID conhecido; inválido, repetido, fora de ordem e cross-tenant falham fechado.
- [ ] `AC-R03-06` — Template aprovado contém contexto mínimo e o link personalizado, sem resposta, PII extra ou endereço privado.
- [ ] `AC-R03-07` — Kill switches de produzir e consumir funcionam independentemente e preservam a distribuição manual.
- [ ] `AC-R03-08` — Operação observa pendente, aceito, enviado, entregue, lido e falho sem registrar telefone, corpo ou credencial.
- [ ] `AC-R03-09` — Sandbox passa com dados demo em Android e iPhone; sender próprio e template ficam aprovados antes de atletas reais.
- [ ] `AC-R03-10` — Cancelamento, remarcação, opt-out e remoção impedem novos envios incompatíveis sem reescrever histórico.

## Riscos e controles

| Risco | Controle | Evidência |
|---|---|---|
| envio duplicado | dedupe transacional, lease e ack idempotente | concorrência e retry |
| envio sem consentimento | regra autoritativa no enqueue e revalidação no claim | pgTAP negativo e cross-tenant |
| callback forjado | validação oficial de `X-Twilio-Signature` | assinatura válida/inválida |
| callback repetido ou fora de ordem | máquina de estados monotônica e idempotente | replay e reorder |
| segredo em logs | payload mínimo, redaction e testes de observabilidade | busca em logs e auditoria |
| indisponibilidade do provedor | retry limitado, dead letter, kill switch e link manual | falha/timeout/rollback |
| Sandbox usado como produção | gate explícito de sender/template | checklist CP5/CP6 |

## Validação

```bash
npm run lint
npm run typecheck
npm test
npm run db:test
npm run smoke:production
```

Mudança persistida exige migration nova, pgTAP positivo/negativo/cross-tenant,
imutabilidade do merge-base e matriz app/schema N/N−1. Integração exige testes
de timeout, retry, assinatura, replay, status fora de ordem e kill switches.

## Rollout, fallback e rollback

- feature `whatsapp_delivery` nasce desligada e é conferida server-side;
- `integration_produce` e `integration_consume` permanecem desligados até o
  piloto;
- piloto: somente `Demo Campo` e participantes do Sandbox;
- telemetria: enqueue, claim, tentativa, aceito, enviado, entregue, lido, falho,
  dead letter e tempo até RSVP;
- fallback: copiar e compartilhar manualmente o link da R02;
- rollback: desligar consumo, preservar outbox e usar distribuição manual;
- produção real: sender próprio, template aprovado, callbacks definitivos,
  consentimento e registro de fornecedor revisados;
- compatibilidade: expansão de banco antes do worker; app e worker toleram
  colunas/RPCs ausentes até o rollout.

## Evidências e checkpoint

### `DP-R03-01` — CP0

- Twilio escolhido como provider operacional atrás de adapter;
- Sandbox, templates, Message SID, callbacks de status, webhook e assinatura
  foram confrontados com a documentação oficial vigente em 31/07/2026;
- OTP do Supabase e mensagens operacionais permanecem separados;
- conteúdo mínimo, dados proibidos, fallback, rollout e gates estão definidos;
- nenhuma migration, chamada ao provedor, template ou flag foi alterada;
- próxima ação: revisar e integrar a decisão; implementação aguarda a validação
  temporal final de `AC-R02-09` e o CP1 de `WP-R03-01`.
