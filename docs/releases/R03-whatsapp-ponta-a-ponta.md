---
id: R03
type: vertical
status: active
outcome: "Enviar uma chamada real pelo WhatsApp, com consentimento, retry, entrega observável e retorno pelo link estável do evento."
depends_on:
  - R01
  - R02
baseline:
  - BASE-ATTENDANCE
  - BASE-WRITES
  - BASE-DELIVERY
verified_at: "codex/r03-whatsapp-sandbox-pilot"
decisions:
  - DEC-WHATSAPP-PROVIDER
  - DEC-WHATSAPP-DISPATCH-SAFETY
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
retry seguro não duplica mensagens, callbacks atualizam entrega de forma
idempotente e o atleta responde na página estável da R02. Se a automação falhar
ou estiver desligada, a diretoria continua copiando e enviando o link
manualmente.

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

A criação das intenções e seu registro auditável são atômicos. Se uma mudança de
domínio futura também originar mensagem, ambos devem compartilhar a mesma
transação. O worker é o único consumidor com permissão de claim/ack; Actions
validam e delegam. Callback não recebe autorização de domínio: valida a
assinatura, correlaciona uma tentativa já criada e só avança a máquina de
estados permitida.

O template inicial não promete entrega nem confirmação e não expõe a resposta
atual. O link personalizado é conhecido pelo provedor, como registrado no
threat model; nenhuma credencial entra em log, métrica ou auditoria.

[`DEC-WHATSAPP-DISPATCH-SAFETY`](../decisions/DEC-WHATSAPP-DISPATCH-SAFETY.md)
fecha o contrato de concorrência. A credencial R02 nasce na preparação
transacional e só existe em claro na memória do worker. Antes da barreira de
efeito, retry é automático; depois dela, timeout, queda do worker ou resposta
incerta exigem reconciliação manual e nunca são reenviados automaticamente.
Entrega exatamente uma vez não é prometida.

### Contrato CP1 de `WP-R03-01`

#### Intenção e elegibilidade

- `enqueue_event_whatsapp_call` deriva a pessoa e o time da sessão owner/admin;
- cria uma intenção por atleta ativo do mesmo time, com telefone E.164,
  consentimento `granted`, chamada futura e prazo aberto;
- revalida `whatsapp_delivery` e `integration_produce` no servidor;
- a dedupe key é
  `whatsapp:event-call:{team}:{event}:{athlete}:{schedule-version}:{template}:{template-version}`;
- repetição da mesma chamada retorna o item existente; remarcação gera nova
  versão e não reescreve histórico;
- `payload` contém somente IDs internos e variáveis mínimas do template. O link,
  a credencial, a resposta e o endereço privado não são persistidos nele.

#### Claim, preparo e conclusão

| Operação | Pré-condição | Efeito transacional |
|---|---|---|
| `claim_notification_batch` | consume ligado; item disponível e sem revisão | lease exclusivo, incremento da tentativa e `processing` |
| `prepare_whatsapp_dispatch` | lease válido; elegibilidade ainda vigente | emite/rotaciona credencial, grava hash e `effect_started_at`; devolve segredo e token de callback uma vez |
| `ack_notification_sent` | mesmo lease e SID válido | associa SID uma vez, marca `sent` e concilia callback antecipado |
| `nack_notification` | mesmo lease e classe conhecida | agenda retry seguro, encerra permanentemente ou exige revisão |
| `record_notification_callback_by_attempt_id` | assinatura validada e UUID de tentativa válido | acrescenta evento monotônico/idempotente sem ampliar autorização |
| `recover_expired_notification_leases` | lease vencido | reabre somente se não houve barreira; caso contrário marca revisão |

O retry automático aceita no máximo cinco tentativas, backoff exponencial com
jitter e nunca ultrapassa o prazo útil do evento. Erro transitório explicitamente
rejeitado pelo provedor pode ser refeito; erro permanente encerra; timeout ou
resultado ambíguo após a barreira fica `failed` e `requires_review = true`.

#### Expansão de dados e autorização

- ampliar `notification_outbox` sem alterar `message_status`, adicionando lease,
  `effect_started_at`, classe de falha, revisão e versão explícita da intenção;
- criar tentativa e histórico de entrega append-only, além do hash do token de
  callback; nenhuma tabela armazena o segredo R02 em claro;
- owner/admin enxerga somente projeção redigida do próprio time; `anon` e
  `authenticated` não escrevem nas estruturas de entrega;
- worker e webhook usam RPCs estreitas de servidor; callback exige assinatura
  Twilio no Route Handler e correlaciona um UUID não secreto já criado. O
  contrato por token opaco permanece somente para URLs legadas;
- cancelamento, remarcação, opt-out e remoção cancelam o que ainda não cruzou a
  barreira. Efeito já iniciado é preservado para conclusão ou reconciliação;
- expansão nasce inerte. App N e N−1 preservam o compartilhamento manual quando
  RPC/coluna não existe ou qualquer kill switch está desligado.

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
- [x] `AC-R03-02` — Um comando de chamada nasce atomicamente e possui dedupe estável por evento, atleta, versão da agenda e versão do template.
- [x] `AC-R03-03` — Somente atleta ativo, com telefone e consentimento vigente, entra na outbox do próprio time.
- [x] `AC-R03-04` — Claims concorrentes não executam a mesma intenção; retry anterior ao efeito é seguro e resultado ambíguo nunca é reenviado automaticamente.
- [x] `AC-R03-05` — Callback com assinatura e token válidos atualiza somente a tentativa vinculada; inválido, repetido, fora de ordem e cross-tenant falham fechado.
- [ ] `AC-R03-06` — Template aprovado contém contexto mínimo e o link personalizado, sem resposta, PII extra ou endereço privado.
- [x] `AC-R03-07` — Kill switches de produzir e consumir funcionam independentemente e preservam a distribuição manual.
- [x] `AC-R03-08` — Operação observa pendente, aceito, enviado, entregue, lido e falho sem registrar telefone, corpo ou credencial.
- [ ] `AC-R03-09` — Sandbox passa com dados demo em Android e iPhone; sender próprio e template ficam aprovados antes de atletas reais.
- [ ] `AC-R03-10` — Cancelamento, remarcação, opt-out e remoção impedem novos envios incompatíveis sem reescrever histórico.

## Riscos e controles

| Risco | Controle | Evidência |
|---|---|---|
| envio duplicado | dedupe transacional, lease e ack idempotente | concorrência e retry |
| efeito externo ambíguo | barreira antes do envio, sem retry automático e reconciliação manual | timeout e lease expirado |
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
- o executor unitário tolera até 3 s para consultar o kill switch no Supabase,
  permanecendo fail-closed em timeout ou erro;
- adapter e callback aceitam os Message SIDs oficiais `SM` e `MM`, ambos com
  32 dígitos hexadecimais;
- callbacks novos usam o UUID não secreto da tentativa no caminho, pois o
  Sandbox não preservou a query no replay operacional. A assinatura oficial e
  a URL canônica continuam obrigatórias; o endpoint por token permanece
  compatível com mensagens já emitidas;
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
- resultado integrado em `e611666`; a continuidade está registrada no CP1 de
  `WP-R03-01` abaixo.

### `WP-R03-01` — CP1

- contrato de enqueue, dedupe, claim, preparo, ack, nack, callback e recuperação
  fechado sem depender de nomes ou estados da Twilio;
- segredo R02 permanece apenas como hash no banco e em claro somente na memória
  do worker durante uma tentativa;
- barreira de efeito separa retry seguro de resultado ambíguo; lease expirado
  depois dela exige revisão manual;
- permissões, estados, revalidações, concorrência, compatibilidade N/N−1 e
  cancelamento/remarcação estão definidos;
- a expansão foi implementada em
  `202607310001_whatsapp_dispatch_contract.sql`, sem ativar flag ou controle;
- `023_whatsapp_dispatch_contract.test.sql` cobre 60 casos de RLS, grants,
  elegibilidade, cross-tenant, dedupe, claim, segredo, replay, reorder, nack,
  opt-out e recuperação anterior/posterior ao efeito;
- banco recomposto integralmente; 23 arquivos e 570 testes pgTAP passaram;
- tipos foram regenerados e `npm run verify` passou após o build repetir com
  acesso às fontes externas;
- `db:lint` não apresentou alerta novo; permanece apenas o aviso legado de
  variável sombreada em `create_event_as_staff`;
- nenhuma chamada externa, template ou flag foi ativada;
- próxima ação: implementar `WP-R03-02` com adapter e worker em dry-run,
  consumindo as RPCs sem habilitar efeitos externos.

### `WP-R03-02` — CP2

- contrato provider-neutral valida a saída da RPC e monta o link R02 no
  fragmento `#c=`, sem incluir segredo em resumo ou telemetria;
- adapter Twilio traduz template/variáveis para Programmable Messaging, aceita
  somente SID válido e classifica rejeição transitória, permanente e resultado
  ambíguo sem persistir corpo de erro;
- worker coordena recovery, claim, prepare, adapter, ack e nack por dependências
  injetadas; falha incerta depois do preparo fica para recuperação ambígua;
- executor `POST /api/internal/whatsapp/worker` exige bearer server-only,
  respeita `integration_consume` e está codificado exclusivamente em dry-run;
- `release_notification_claim` desfaz somente claim anterior à barreira e
  restaura o contador, permitindo exercitar fila sem credencial ou envio;
- 23 testes focados cobrem contrato, adapter, timeout/rejeição, worker, bearer e
  executor; o pgTAP adiciona 10 casos de grants, liberação e barreira;
- banco recomposto, 24 arquivos e 580 pgTAPs passaram; lint, typecheck, 176
  testes Vitest e build passaram;
- nenhuma configuração Twilio foi lida e nenhuma chamada externa foi feita;
  `whatsapp_delivery`, `integration_produce` e `integration_consume` continuam
  desligados;
- próxima ação: implementar `WP-R03-03` com callback assinado, endpoint de
  status e visão operacional redigida antes de expor qualquer modo live.

### `WP-R03-03` — CP3

- `POST /api/integrations/twilio/whatsapp/status` aceita somente formulário
  URL-encoded de até 16 KiB, exige token opaco único e valida
  `X-Twilio-Signature` com o SDK oficial contra `APP_URL` e todos os parâmetros;
- o Route Handler extrai somente Message SID, estado e código numérico,
  normaliza estados Twilio e delega à RPC server-only já idempotente e
  monotônica; replay, reorder e SID divergente não alteram a tentativa;
- respostas válidas não funcionam como oráculo de token: conhecido ou não,
  recebem `204`, enquanto assinatura, mídia e payload inválidos falham antes da
  RPC;
- `list_whatsapp_delivery_operation` permite somente owner/admin do próprio
  time e devolve estado, tentativas, revisão e código sanitizado, sem telefone,
  corpo, URL, SID ou token;
- o pgTAP adiciona 12 casos de grants, projeção redigida, autorização e
  cross-tenant; o banco recomposto passou em 25 arquivos e 592 testes;
- 10 testes Vitest focados cobrem assinatura oficial, campos futuros, URL
  canônica, normalização e limites; `db:lint` mantém apenas o aviso legado em
  `create_event_as_staff`;
- lint, typecheck e 186 testes Vitest passaram; o build de produção passou ao
  repetir com acesso às fontes externas;
- nenhuma credencial externa foi configurada, nenhum callback real foi
  processado e o modo live continua sem entrypoint. Flags e controles
  permanecem desligados;
- próxima ação: implementar `WP-R03-04`, começando pelo contrato e aprovação do
  template mínimo no Sandbox antes de habilitar qualquer envio.

### `WP-R03-04` — CP4a, contrato e prontidão

- a documentação oficial confirmou que o Sandbox aceita somente templates
  pré-aprovados da Twilio; template customizado exige sender próprio;
- `EVENT_CALL_TEMPLATE_V1` define o conteúdo definitivo `pt_BR`, categoria
  `UTILITY` e amostras para título, horário e link. Não contém resposta atual,
  endereço privado, telefone, escalação ou dado pessoal adicional;
- o adapter ganhou perfis explícitos: `sandbox_appointment` usa as duas
  variáveis do Appointment Reminders; `event_call_v1` usa as três variáveis do
  template definitivo sem alterar o contrato de domínio;
- a expansão `202608010002_whatsapp_template_context.sql` anexa somente o fuso
  autoritativo do time à intenção; App N-1 ignora a nova chave e App N aceita o
  payload anterior usando ISO como fallback;
- a configuração do piloto aceita apenas o sender compartilhado
  `+14155238886`, SID completo e perfil Sandbox. `off` continua sendo o padrão
  e nenhum entrypoint live consome essa configuração;
- 19 testes focados cobrem conteúdo mínimo, PII proibida, perfis, fuso,
  compatibilidade e falha fechada; sete pgTAPs cobrem grants, autoridade,
  minimização e imutabilidade histórica;
- banco recomposto; 26 arquivos e 599 pgTAPs passaram. Nenhuma chamada Twilio,
  criação de template, mudança de flag ou envio foi executado;
- lint, typecheck e 197 testes Vitest passaram; o build de produção passou ao
  repetir com acesso às fontes externas;
- `AC-R03-06` permanece aberto até aprovação do template definitivo e
  `AC-R03-09` permanece aberto até a prova física Android/iPhone;
- próxima ação: configurar as credenciais server-only e o Content SID
  pré-aprovado, implementar um entrypoint live limitado a uma única intenção
  demo e executar o checklist acompanhado do Sandbox.

### `WP-R03-04` — CP4b, executor Sandbox unitário

- `POST /api/internal/whatsapp/pilot` exige bearer forte, JSON estrito, modo
  Sandbox válido e kill switch de consumo antes de construir adapter ou acessar
  a outbox;
- ambiente allowlista um time UUID, um telefone E.164, o sender compartilhado,
  o Content SID e o perfil de duas variáveis. Configuração parcial ou sender
  divergente retorna indisponível sem detalhes;
- `claim_notification_for_sandbox_pilot` reivindica somente a combinação
  outbox/time/telefone solicitada, exige `event_call:v1`, flag do time, estado
  seguro e ausência da barreira; nunca varre nem recupera a fila global;
- o worker roda live com lote 1 e reaproveita preparo, segredo em memória,
  adapter, ack/nack e callback já testados. Resultado ambíguo continua sem
  retry automático;
- 21 testes focados cobrem autorização, modo/consumo desligados, corpo estrito,
  lote unitário, redaction, adapter e worker; 11 pgTAPs cobrem grants, kill
  switch, allowlist, replay e preservação de uma segunda intenção;
- banco recomposto; 27 arquivos e 610 pgTAPs passaram. Nenhuma variável externa,
  flag, controle, outbox ou mensagem real foi alterada durante a implementação;
- próxima ação: configurar os segredos diretamente na Vercel, selecionar um
  único evento/atleta demo, enfileirar uma intenção e executar a prova física
  acompanhada, desligando consumo imediatamente depois.

### `WP-R03-04` — CP5a, correlação real do callback

- a primeira tentativa real foi preservada como ambígua e não será reenviada;
  a Twilio aceitou SID `MM`, mas o replay operacional chegou sem a query usada
  para correlação;
- callbacks novos carregam o UUID aleatório e não secreto da tentativa no
  caminho. O Route Handler ainda valida a assinatura oficial contra `APP_URL`
  e todos os campos antes de chamar a RPC exclusiva de `service_role`;
- `record_notification_callback_by_attempt_id` mantém replay idempotente,
  ordem monotônica, callback anterior ao ack e falha fechada para tentativa ou
  SID divergente. O endpoint anterior continua ativo para mensagens emitidas;
- a migration forward-only `202608010004` adiciona somente a nova RPC; nenhum
  enum, dado histórico, flag ou controle foi alterado;
- 19 testes Vitest focados passaram; o banco local foi recomposto e 28 arquivos
  com 621 pgTAPs passaram. O lint de banco mantém apenas o aviso legado em
  `create_event_as_staff`;
- próxima ação: publicar banco antes do app, executar um único envio novo dentro
  da janela de 24 horas e confirmar `accepted/delivered/read` sem reutilizar a
  outbox ambígua.

### `WP-R03-04` — CP5b, primeira entrega física

- banco, app e smoke foram publicados em `main`; `dev` foi alinhada ao mesmo
  merge;
- uma nova intenção demo, isolada da tentativa ambígua, foi executada uma única
  vez dentro da janela ativa do Sandbox. O worker registrou `accepted = 1`, sem
  rejeição ou ambiguidade, e a mensagem chegou fisicamente pelo número Twilio;
- a correlação nova processou a sequência
  `accepted > sent > delivered > read`; a tentativa terminou em `read`, a
  outbox ficou `sent`, sem revisão, e o consumo foi desligado após a prova;
- a prova revelou uma divergência de configuração: o Content SID customizado
  usa três variáveis (`nome`, `data`, `link`), enquanto a Vercel ainda seleciona
  `sandbox_appointment`, que combina nome e data e envia somente duas;
- o piloto passa a aceitar também `event_call_v1`, mantendo sender, time,
  destinatário, Content SID, bearer e kill switch allowlisted. Perfil ausente ou
  desconhecido continua falhando fechado;
- próxima ação: publicar o suporte ao perfil, configurar
  `TWILIO_TEMPLATE_PROFILE=event_call_v1` na Vercel e validar o conteúdo em um
  único novo envio, sem alterar o template aprovado nesta etapa.
