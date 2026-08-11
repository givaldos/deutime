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
verified_at: "6f80df8"
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
- o convite inicial aprovado e testado permanece identificado por
  `event_call:card_v2`; no Twilio/Meta ele é `event_call_card_v2`, Content SID
  `HX9724ffb03ba01e7280c6d70bbf801ff4`;

### Presente a resolver

- não existem configurações dos dois lembretes no time nem overrides por
  evento;
- não existem cotas materializadas, agendamento automático ou consumo manual
  da próxima cota;
- a RPC de chamada existente não diferencia cota, não filtra somente pendentes
  e não fornece visão operacional por lembrete;
- o worker e o callback são reutilizáveis, mas os templates de primeiro
  lembrete e última chamada ainda não existem no catálogo provider-neutral nem
  estão aprovados no Twilio/Meta.

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
- dois templates utilitários distintos, `event_reminder:first_card_v2` e
  `event_reminder:last_card_v2`, cada um com fallback textual, nome do evento,
  data/hora, link R02 e imagem pública do Open Graph;
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
- o convite inicial usa exclusivamente `event_call:card_v2`, correspondente ao
  template aprovado `event_call_card_v2`; seu Content SID é configuração de
  ambiente em `TWILIO_CONTENT_SID_EVENT_CALL_CARD_V2`, nunca parâmetro da UI,
  do banco ou do chamador;
- `reminder_1` seleciona exclusivamente `event_reminder:first_card_v2`, com
  nome Twilio `event_call_card_first_remember_v2`; `reminder_2` seleciona
  exclusivamente `event_reminder:last_card_v2`, com nome Twilio
  `event_call_card_last_remember_v2`;
- os dois lembretes são `UTILITY`, `pt_BR`, e compartilham o contrato de
  variáveis `{{1}}` evento, `{{2}}` data/hora, `{{3}}` caminho do link estável e
  `{{4}}` caminho público da imagem Open Graph; cada SID entra somente por
  configuração de ambiente após aprovação no Twilio/Meta;
- o primeiro lembrete usa o texto **“Ainda dá tempo de confirmar”**, informa
  que o time está fechando a lista e oferece a ação **“Confirmar presença”**;
  o fallback textual preserva a mesma intenção e o link;
- o segundo usa **“Última chamada”**, informa que a confirmação fecha em breve
  e oferece **“Responder agora”**; o fallback informa que esta é a última
  cobrança automática, sem inventar prazo ou contagem regressiva;
- a escolha do template deriva do tipo imutável da cota dentro do servidor;
  admin, Action, job e payload externo não podem fornecer chave, versão ou SID;
- convite inicial não consome cota de lembrete. Envio manual consome a próxima
  cota pendente e, portanto, usa o template correspondente a ela;
- chave, versão e intenção usadas ficam persistidas no slot/outbox. Trocar uma
  versão aprovada afeta apenas cotas futuras ainda não consumidas e nunca
  reinterpreta ou renderiza novamente um outbox histórico;
- entrega, falha, ambiguidade e custo são agregados separadamente por intenção
  e versão de template;
- toda escrita sensível e decisão de cota fica em RPC transacional; Actions
  validam entrada, delegam e revalidam a página.

### Catálogo de mensagens

| Intenção | Chave e versão internas | Nome Twilio | Estado |
|---|---|---|---|
| convite inicial | `event_call:card_v2` | `event_call_card_v2` | aprovado e testado |
| primeiro lembrete | `event_reminder:first_card_v2` | `event_call_card_first_remember_v2` | aprovado |
| última chamada | `event_reminder:last_card_v2` | `event_call_card_last_remember_v2` | aprovado |

Os dois novos cards usam imagem em `https://deutime.app/{{4}}` e botão URL em
`https://deutime.app/{{3}}`. O corpo do primeiro lembrete é:

```text
⏰ *Ainda dá tempo de confirmar*
O evento *{{1}}* acontece em *{{2}}*.
O time está fechando a lista. Confirme sua presença agora.
```

O botão é **Confirmar presença** e o footer é **Se já respondeu, não enviaremos
outro igual.** O fallback textual usa o mesmo título e contexto, seguido por
`Confirme agora: https://deutime.app/{{3}}`.

O corpo da última chamada é:

```text
🚨 *Última chamada*
O evento *{{1}}* acontece em *{{2}}*.
A confirmação fecha em breve. Registre sua resposta agora.
```

O botão é **Responder agora** e o footer é **Última cobrança automática deste
evento.** O fallback textual usa o mesmo título e contexto, seguido por
`Responda agora: https://deutime.app/{{3}}`.

As amostras submetidas à aprovação devem usar caminhos públicos válidos para o
botão e para uma imagem `.png`; as quatro variáveis são sequenciais, não possuem
quebra de linha e nunca começam ou encerram o corpo.

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

- [x] `AC-R03R-01` — Owner/admin configura dois horários válidos no time; evento herda ou registra override auditado.
- [x] `AC-R03R-02` — Cada evento possui no máximo duas cotas vitalícias, inclusive após remarcação, retry, clique repetido e concorrência.
- [x] `AC-R03R-03` — Destinatários são recalculados no envio e incluem somente pendentes elegíveis com consentimento e telefone válidos.
- [x] `AC-R03R-04` — Envio manual com zero não consome; com destinatários consome somente a próxima cota e cancela seu automático.
- [x] `AC-R03R-05` — Automático vazio termina `skipped` sem adapter; atraso acima de seis horas ou prazo fechado também não envia.
- [x] `AC-R03R-06` — Remarcação, cancelamento, opt-out e remoção cancelam ou rematerializam cotas sem reescrever histórico.
- [x] `AC-R03R-07` — Outbox garante no máximo uma mensagem por atleta/cota durante toda a vida do evento e preserva a barreira de efeito da R03.
- [x] `AC-R03R-08` — Admin vê estados e agregados redigidos de destinatários, entrega, falhas e custo, sem PII ou payload.
- [ ] `AC-R03R-09` — Convite, primeiro lembrete, última chamada e seus fallbacks abrem o link estável em WhatsApp real no iPhone e Android; a cota sempre seleciona a intenção correta sem expor segredo ou SID em preview ou logs.
- [x] `AC-R03R-10` — Flags e kill switches falham fechados; compartilhamento manual funciona e rollback preserva cotas e outbox.

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
| usar convite ou urgência errada | mapeamento servidor-side imutável entre cota e intenção | teste unitário do catálogo e pgTAP do consumo manual/automático |
| alterar histórico ao trocar template | persistir chave e versão no slot/outbox; mudança somente prospectiva | teste N/N−1 e replay de outbox antigo |
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
  automática; cada lembrete exige seu próprio Content SID aprovado e
  configurado antes de habilitar a produção;
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

- CP0 a CP3 estão concluídos; a evidência detalhada foi preservada no
  [arquivo histórico de R03R](evidence/R03R.md).
- CP4 permanece pendente do disparo manual controlado do primeiro e do último
  lembrete, incluindo fallbacks, em Android e iPhone.
- Em 2026-08-10, o rollout contínuo foi autorizado para os três times demo e
  `WHATSAPP_AUTOMATION_ENABLED` passou a `true`; a primeira execução observada
  do workflow `#144` concluiu em cinco segundos sem erro operacional.
- A leitura agregada posterior confirmou 3/3 times habilitados, 2/2 kill
  switches ligados, nenhuma cota vencida e nenhuma mensagem de lembrete na
  outbox. Havia 26 cotas futuras; a próxima estava prevista para
  2026-08-12 10:00 UTC. O rollback imediato continua sendo definir
  `WHATSAPP_AUTOMATION_ENABLED=false`.
- O workflow passou a registrar somente uma projeção explícita dos contadores
  operacionais do worker. Telefone, payload, capability, SID, segredo e campos
  futuros não pertencentes à allowlist são descartados; JSON inválido faz o
  job falhar fechado sem imprimir o corpo bruto.
- A primeira leitura redigida detectou duas revisões antigas de convite
  `event_call/card_v1`: ambas já possuíam ID do provedor e estado final `read`,
  mas o replay idempotente retornava antes de reprojetar a outbox. O agendador
  foi desligado imediatamente, sem nova mensagem aceita ou cota produzida.
- A migration forward-only `202608110001` faz o replay confirmado reprojetar a
  outbox sem duplicar evento, regredir estado ou liberar retry. pgTAP focado:
  12/12; suíte completa: 37 arquivos e 912 testes; lint manteve somente os
  avisos legados e os tipos permaneceram sem diff.
- O estado operacional e a próxima ação ficam em [`docs/work/current.md`](../work/current.md).
