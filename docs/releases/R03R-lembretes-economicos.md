---
id: R03R
type: vertical
status: ready
outcome: "Permitir que a diretoria configure e envie no máximo dois lembretes de confirmação pelo WhatsApp, sem cobrar quem já respondeu e sem duplicar mensagens."
depends_on:
  - R01
  - R02
  - R03
baseline:
  - BASE-IDENTITY
  - BASE-ATTENDANCE
  - BASE-WRITES
  - BASE-DELIVERY
verified_at: "82b1fd3"
decisions:
  - DEC-DEFAULT-DEADLINES
  - DEC-PERSISTENT-ACCESS
  - DEC-WHATSAPP-PROVIDER
  - DEC-WHATSAPP-DISPATCH-SAFETY
invariants:
  - INV-MOBILE-WHATSAPP-FIRST
  - INV-RLS-MULTI-TIME
  - INV-DEPLOY-COMPATIBLE
  - INV-HISTORICAL-EVENTS
  - INV-CANONICAL-EVENT-URL
  - INV-PRIVATE-BY-DEFAULT
  - INV-MANUAL-FALLBACK
---

# R03R — Lembretes econômicos pelo WhatsApp

## Resultado demonstrável

Owner ou admin configura dois lembretes de pendência no time, deixa cada evento
herdar ou ajustar os horários e acompanha as duas cotas no celular. O sistema
recalcula os destinatários no envio, exclui quem já respondeu e permite
antecipar somente a próxima cota. Clique repetido, retry, concorrência e
reprocessamento nunca criam um terceiro lembrete nem duplicam atleta e cota.

## Três tempos

### Passado a preservar

- R01 mantém horário, fuso, remarcação, cancelamento e `schedule_version`
  autoritativos;
- R02 mantém o link estável e a resposta SIM/NÃO/TALVEZ com prazo;
- R03 fornece outbox, dedupe, lease, barreira de efeito, adapter Twilio,
  callback assinado, operação redigida e compartilhamento manual;
- `event_attendance.status = 'pending'` é a única fonte de quem ainda não
  respondeu; espera também representa resposta já realizada;
- `whatsapp_delivery`, `integration_produce` e `integration_consume` continuam
  falhando fechados.

### Presente a resolver

- não existem configurações dos dois lembretes no time nem overrides por
  evento;
- não existem cotas materializadas, agendamento automático ou consumo manual
  da próxima cota;
- a RPC de chamada existente não diferencia cota, não filtra somente pendentes
  e não fornece visão operacional por lembrete;
- o worker e o callback são reutilizáveis, mas o template de lembrete ainda não
  existe no catálogo provider-neutral nem no Twilio.

### Futuro compatível

- abertura automática da chamada e lembrete geral de T−1 h podem usar o mesmo
  modelo de slots, sem ampliar as duas cotas desta release;
- escalação publicada, súmula pronta e recado avulso ficam fora;
- outro BSP pode reutilizar o comando provider-neutral e as mesmas chaves de
  idempotência;
- regras de campanhas, marketing e conversa bidirecional ficam fora.

## Escopo

### Incluído

- dois offsets configuráveis no time e override opcional por evento;
- padrões de 72 h e 48 h antes do início, ambos anteriores ao fechamento padrão
  de 24 h; as antecedências obedecem `primeiro > segundo > fechamento > 0` no
  fuso autoritativo do time;
- exatamente duas cotas vitalícias por evento, com identidade estável
  `reminder_1`/`reminder_2` e estados agendada, em processamento, enfileirada,
  ignorada e cancelada;
- execução automática com tolerância máxima de seis horas; depois disso a cota
  expira como `skipped`, sem envio tardio;
- prévia da quantidade atual e ação **Enviar lembrete agora** para a próxima
  cota pendente;
- recálculo transacional dos destinatários no envio e dedupe por
  time/evento/cota/atleta/template;
- reagendamento das cotas pendentes e cancelamento seguro diante de remarcação,
  cancelamento, prazo encerrado, opt-out, telefone inválido ou vínculo removido;
- template utilitário `event_reminder:card_v1`, com fallback textual, nome do
  evento, data/hora, link R02 e imagem pública do Open Graph;
- operação agregada por cota com destinatários, entrega, falhas e custo
  disponível/estimado claramente identificado.

### Fora

- terceiro lembrete, broadcast geral ou recado avulso;
- lembrete geral do evento para quem já respondeu;
- alterar RSVP, lista de espera, presença real ou prazo durante o envio;
- expor telefone, consentimento, resposta, URL personalizada, corpo ou SID na
  interface, telemetria ou auditoria;
- staging, novo provedor, recebimento de mensagens e automação de marketing.

## Contratos e decisões

- configurações pertencem ao time; o evento copia os valores efetivos e marca
  se houve personalização, preservando histórico quando o padrão mudar;
- cotas pertencem ao evento, não à versão da agenda; remarcação atualiza
  `scheduled_for` e a versão observada somente nas cotas ainda pendentes,
  preserva as consumidas e nunca recria `reminder_1` ou `reminder_2`;
- os offsets são minutos antes de `starts_at`; ambos devem ser maiores que a
  antecedência do `attendance_deadline` e o primeiro deve ser maior que o
  segundo;
- materialização tardia marca gatilhos já passados como `skipped`; downtime de
  até seis horas permite recuperação automática somente antes do prazo;
- envio automático sem destinatário consome a cota como `skipped` e não chama
  o adapter; envio manual sem destinatário não consome a cota;
- envio manual bem-sucedido consome a próxima cota pendente e invalida seu
  gatilho automático; nunca cria cota adicional;
- somente `pending`, vínculo ativo, telefone válido e consentimento vigente
  entram no lote; qualquer outro estado de RSVP fica fora;
- `whatsapp_reminders` nasce como flag nova desligada e exige também
  `whatsapp_delivery`, `integration_produce` e `integration_consume` nos pontos
  correspondentes;
- o template definitivo é `deutime_event_reminder_card_v1`, categoria
  `UTILITY`, `pt_BR`, com variáveis `{{1}}` evento, `{{2}}` data/hora, `{{3}}`
  link e `{{4}}` Media URL; aprovação no Twilio é gate do piloto live;
- toda escrita sensível e decisão de cota fica em RPC transacional; Actions
  validam entrada, delegam e revalidam a página.

## Entry points

- código:
  - `app/app/[teamSlug]/settings/page.tsx`;
  - `app/app/[teamSlug]/settings/actions.ts`;
  - `app/app/[teamSlug]/events/[eventId]/page.tsx`;
  - `app/app/[teamSlug]/events/actions.ts`;
  - `lib/features/delivery/supabase-delivery-repository.ts`;
  - `lib/features/delivery/whatsapp-worker.ts`;
  - `lib/features/delivery/whatsapp-template-catalog.ts`;
  - `app/api/internal/whatsapp/worker/route.ts`;
  - `app/api/integrations/twilio/whatsapp/status/callback-handler.ts`;
- migrations:
  - `supabase/migrations/202607270001_delivery_foundation.sql`;
  - `supabase/migrations/202607310001_whatsapp_dispatch_contract.sql`;
  - próxima migration forward-only de configurações, cotas e RPCs;
- testes:
  - `supabase/tests/023_whatsapp_dispatch_contract.test.sql`;
  - próximo pgTAP de lembretes;
  - `lib/features/delivery/whatsapp-worker.test.ts`;
  - `lib/features/delivery/whatsapp-template-catalog.test.ts`;
  - próximos testes de Actions e componentes;
- documentação:
  - `docs/runbook.md`;
  - `docs/product-context.md` pelos IDs do frontmatter;
  - `docs/work/current.md`.

## Pacotes de trabalho

| Pacote | Critérios | Entry points principais | Validação |
|---|---|---|---|
| `WP-R03R-01` — contrato e agenda | `AC-R03R-01`, `02`, `06`, `07`, `10` | migration nova, pgTAP novo, tipos | `VAL-DB`, concorrência e N/N−1 |
| `WP-R03R-02` — experiência e produção | `AC-R03R-01` a `08` | settings, evento, Actions, RPCs | `VAL-APP` + `VAL-DB`, Android/iPhone |
| `WP-R03R-03` — template, operação e piloto | `AC-R03R-07` a `10` | catálogo, worker, callback, runbook | `VAL-WA`, Sandbox/demo e rollback |

## Critérios de aceite

- [ ] `AC-R03R-01` — Owner/admin configura dois horários válidos no time; evento herda ou registra override auditado.
- [ ] `AC-R03R-02` — Cada evento possui no máximo duas cotas vitalícias, inclusive após remarcação, retry, clique repetido e concorrência.
- [ ] `AC-R03R-03` — Destinatários são recalculados no envio e incluem somente pendentes elegíveis com consentimento e telefone válidos.
- [ ] `AC-R03R-04` — Envio manual com zero não consome; com destinatários consome somente a próxima cota e cancela seu automático.
- [ ] `AC-R03R-05` — Automático vazio termina `skipped` sem adapter; atraso acima de seis horas ou prazo fechado também não envia.
- [ ] `AC-R03R-06` — Remarcação, cancelamento, opt-out e remoção cancelam ou rematerializam cotas sem reescrever histórico.
- [ ] `AC-R03R-07` — Outbox garante no máximo uma mensagem por atleta/cota durante toda a vida do evento e preserva a barreira de efeito da R03.
- [ ] `AC-R03R-08` — Admin vê estados e agregados redigidos de destinatários, entrega, falhas e custo, sem PII ou payload.
- [ ] `AC-R03R-09` — Template e fallback abrem o link estável em WhatsApp real no iPhone e Android sem expor segredo em preview ou logs.
- [ ] `AC-R03R-10` — Flags e kill switches falham fechados; compartilhamento manual funciona e rollback preserva cotas e outbox.

## Riscos e controles

| Risco | Controle | Evidência |
|---|---|---|
| cobrar quem acabou de responder | seleção dentro da transação de consumo | pgTAP com resposta concorrente |
| duplicar mensagem ou criar terceira cota | identidade vitalícia da cota e dedupe por atleta | pgTAP concorrente, remarcação e replay |
| enviar horário antigo após remarcação | `schedule_version` e reagendamento atômico das cotas pendentes | matriz remarcação/worker |
| efeito externo ambíguo | reutilizar preparo e barreira da R03, sem retry cego | testes do worker e reconciliação |
| disparo tardio ou depois do prazo | janela de seis horas e checagem do deadline no consumo | relógio controlado e casos negativos |
| vazar PII ou capability | projeções agregadas e payload redigido | testes de contrato, logs e UI |
| custo inesperado | duas cotas máximas, prévia e agregado por cota | piloto demo e limite operacional |
| ordem independente de deploy | expansão inerte e consumidor tolerante a contrato ausente | matriz App/DB N/N−1 |

## Validação

```bash
npm run migrations:check -- origin/main HEAD
npm run db:reset
npm run db:lint
npm run db:test
npm run db:types
npm run verify
npm run security:audit
```

Além dos gates, executar relógio controlado, concorrência, resposta no instante
do claim, remarcação, cancelamento, opt-out, retry, resultado ambíguo, custo
redigido e jornada física Android/iPhone pelo WhatsApp.

## Rollout, fallback e rollback

- flag `whatsapp_reminders` desligada por padrão e conferida na UI, Actions,
  RPCs e consumidor;
- piloto somente no Demo Campo e com pessoas demo, uma cota manual antes da
  automática;
- telemetria: cotas por estado, pendentes atuais, intents criadas, entrega,
  falha, ambiguidade, latência de resposta e custo agregado;
- fallback: copiar o link público e cobrar manualmente pelo WhatsApp;
- kill switches `integration_produce` e `integration_consume` permanecem
  independentes;
- smoke de produção continua anônimo e somente leitura;
- sem staging no MVP: escrita, falhas e cross-tenant são exercitados localmente;
- rollback desliga `whatsapp_reminders`, interrompe produção/consumo quando
  necessário e preserva cotas, outbox, tentativas e auditoria;
- banco N adiciona estruturas opcionais; App N−1 ignora; App N omite a jornada
  quando o contrato ou a flag não estiver disponível.

## Evidências e checkpoint

### `DP-R03R-01` — CP0 concluído

- lacuna, resultado, escopo, defaults, estados, autorização, riscos, entrypoints
  e dez critérios de aceite foram fechados sobre o commit `82b1fd3`;
- R01/R02/R03 fornecem prazo, link, outbox, worker, callback e fallback; nenhuma
  integração externa precisa ser substituída;
- não há decisão bloqueadora aberta: os detalhes de lembrete permitidos por
  `DEC-DEFAULT-DEADLINES` foram fechados neste pacote;
- nenhuma migration, configuração, flag, template ou envio foi alterado;
- próxima ação: `WP-R03R-01`, expansão inerte do contrato e pgTAP com a feature
  desligada.
