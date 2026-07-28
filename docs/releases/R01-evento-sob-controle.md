---
id: R01
status: active
outcome: "Permitir editar, remarcar e cancelar eventos com horário correto e efeitos previsíveis sobre pessoas, links e notificações."
depends_on:
  - R00
baseline:
  - BASE-SERIES
  - BASE-ATTENDANCE
  - BASE-MATCH-REPORT
verified_at: 0466d04
decisions: []
invariants:
  - INV-MOBILE-WHATSAPP-FIRST
  - INV-RLS-MULTI-TIME
  - INV-HISTORICAL-EVENTS
---

# R01 — Evento sob controle

## Resultado demonstrável

No celular, a diretoria cria ou altera um evento usando o fuso do time e cancela uma ocorrência ou série sem apagar histórico. Toda alteração deixa estado consistente para links e notificações futuras.

## Três tempos

### Passado a preservar

- Eventos avulsos e séries semanais de 2 a 52 ocorrências já são criados atomicamente.
- Uma ocorrência ou ela e as próximas já podem ser editadas preservando respostas e exceções.
- Remarcação básica de evento agendado e futuro já altera data/hora para uma ocorrência ou “esta e futuras”.
- `teams.timezone` e `event_series.timezone` já existem e a exibição usa o fuso do time; o defeito principal está na conversão do campo `datetime-local` pelo navegador.
- O schema já possui evento `cancelled` e série `is_active`; falta o workflow seguro de produto.
- Cada ocorrência possui chamada independente.
- Súmula finalizada já encerra o evento e estatísticas dependem desse encerramento.

### Presente a resolver

- A entrada de data ainda pode usar o fuso do navegador em vez do fuso do time.
- Cancelamento e remarcação não cobrem comunicação, credenciais e todos os efeitos derivados.
- Extensão idempotente da série e cancelamento de série continuam pendentes.

### Futuro compatível

- R02 precisa representar estados aberto, fechado, cancelado e encerrado no mesmo link.
- R03 precisa cancelar ou reagendar comandos de notificação de forma idempotente.
- Histórico passado, presença e súmulas não podem ser recalculados ou apagados.

Ficam fora desta release URL pública por evento, envio automático e limite/lista de espera.

## Escopo

### Incluído

- interpretar data/hora local exclusivamente pelo fuso IANA do time;
- editar ou remarcar uma ocorrência e, quando houver série, “esta e futuras”;
- cancelar ocorrência ou “esta e futuras” sem apagar evento, presença ou
  súmula;
- estender série de forma idempotente sem recriar ocorrências existentes;
- registrar comando e mudança de agenda de forma transacional para retry e
  consumo futuro por R03;
- mostrar alcance e consequência antes da confirmação;
- liberar a jornada por time pela capacidade `event_control`, inicialmente
  desligada.

### Fora

- envio real de WhatsApp, e-mail ou push;
- URL pública estável e confirmação sem login, pertencentes à R02;
- lista de espera, cobrança e alteração retroativa de fatos esportivos;
- edição ou reabertura de evento iniciado, concluído ou cancelado;
- exclusão física de evento, presença, súmula ou série.

## Contratos fechados no CP0

- **Papéis:** owner, admin e manager ativos podem operar; atleta, vínculo
  inativo, usuário externo e outro time são negados na RPC e por RLS.
- **Fuso:** UI envia o valor civil `YYYY-MM-DDTHH:mm` e o identificador do time
  não é confiado do cliente; a RPC deriva o time autorizado e converte usando
  `teams.timezone`. Fuso do aparelho nunca define o instante.
- **Histórico:** cancelamento altera estado, nunca exclui. Presença e súmula
  existentes permanecem ligadas ao mesmo `event_id`.
- **Escopo:** comandos aceitam apenas `single_event` ou `this_and_future`;
  ocorrências anteriores e exceções independentes não são reescritas.
- **Idempotência:** toda mutação nova recebe `request_id` UUID e persiste um
  comando único por time. Retry devolve o resultado anterior sem novo evento,
  ocorrência, auditoria ou efeito.
- **Versão futura:** cada mudança transacional registra tipo, versão da agenda,
  horário anterior/novo e escopo. R03 consumirá esse contrato sem inferir
  cancelamento ou remarcação por comparação de datas.
- **Dados e retenção:** não nasce PII nova; comandos e mudanças retêm somente
  IDs, horários, ator e metadados operacionais mínimos, seguindo a retenção de
  auditoria.
- **Rollout:** `event_control` nasce `false`; quando desligada, criação e edição
  legadas continuam disponíveis e as operações novas ficam ocultas e negadas
  server-side.

## Entry points

- `components/admin-event-form.tsx`
- `app/app/[teamSlug]/events/actions.ts`
- `app/app/[teamSlug]/events/[eventId]/page.tsx`
- `app/app/[teamSlug]/events/[eventId]/edit/page.tsx`
- `app/me/agenda/[eventId]/page.tsx`
- `supabase/migrations/202607200004_event_editing.sql`
- `supabase/tests/007_event_editing.test.sql`
- `lib/features/delivery/capabilities.ts`
- `lib/validation/operations.ts`
- `lib/validation/operations.test.ts`

Esses caminhos foram conferidos em `0466d04`.

## Pacotes de trabalho

| Pacote | Critérios | Entry points principais | Validação |
|---|---|---|---|
| `WP-R01-01` — Fuso autoritativo | `AC-R01-01`, `06`, `07` | `admin-event-form.tsx`, validação de operações, Actions de evento, `007_event_editing` | `VAL-APP`, `VAL-DB` |
| `WP-R01-02` — Cancelamento e remarcação | `AC-R01-02`, `03`, `05`, `07` | Actions/página de evento, migration nova, `007_event_editing` | `VAL-APP`, `VAL-DB` |
| `WP-R01-03` — Extensão e cancelamento de série | `AC-R01-02` a `05`, `07` | Actions de evento, `202607200004`, migration nova, pgTAP | `VAL-APP`, `VAL-DB` |

As mudanças de banco serão forward-only em migration nova. O CP1 define nomes
e assinaturas finais para a capacidade `event_control`, o registro idempotente
de comandos, a versão da agenda e as RPCs; nenhuma migration aplicada será
editada.

## Contrato técnico do CP1

### Expansão de banco

A expansão será dividida em duas migrations para que o novo valor de enum
esteja disponível antes de ser usado:

1. `event_control_feature`: adiciona `event_control` a `feature_key`, sem
   habilitar nenhum time;
2. `event_control_contract`: adiciona tipos, tabelas, colunas e RPCs abaixo.

`events` recebe:

- `schedule_version bigint not null default 1`, incrementada uma vez por comando
  que altere horário ou estado daquela ocorrência;
- `cancelled_at timestamptz` e `cancelled_by uuid`, ambos nulos fora do estado
  `cancelled`.

`event_commands` é o ledger idempotente:

- `id uuid`, `team_id`, `request_id uuid`, ator, tipo do comando, hash do
  payload, IDs opcionais de evento/série, resultado mínimo em `jsonb` e
  `created_at`;
- `unique (team_id, request_id)`;
- o mesmo `request_id` com payload diferente falha; retry igual retorna o
  resultado persistido com `replayed = true`;
- nenhuma escrita direta para `authenticated`; RPCs transacionais são a única
  entrada.

`event_changes` é o contrato consumível por R03:

- uma linha por ocorrência afetada, ligada ao comando;
- `kind` em `created`, `details_updated`, `rescheduled`, `cancelled` ou
  `series_extended`;
- `scope`, `schedule_version`, status anterior/novo, horário anterior/novo e
  `occurred_at`;
- `unique (event_id, schedule_version)`;
- não contém destinatário, telefone, conteúdo de mensagem ou outra PII.

As duas tabelas nascem com RLS, grants mínimos e pgTAP positivo, negativo e
cross-tenant. Staff ativo pode ler mudanças do próprio time; comandos e hashes
não recebem leitura direta pelo cliente.

### RPCs e retornos

As RPCs novas retornam um resultado comum com `request_id`, `event_id`,
`series_id`, `affected_count`, `max_schedule_version` e `replayed`:

- `create_event_as_staff_v2(requested_team_id, request_id,
  starts_at_local timestamp without time zone, ...campos atuais...)`;
- `update_event_as_staff_v2(requested_team_id, requested_event_id, request_id,
  edit_scope, starts_at_local timestamp without time zone, ...campos atuais...)`;
- `cancel_event_as_staff(requested_team_id, requested_event_id, request_id,
  cancel_scope)`;
- `extend_event_series_as_staff(requested_team_id, requested_series_id,
  request_id, additional_occurrences integer)`.

Todas usam `security definer`, `search_path = ''`, timeout, lock das linhas
autoritativas, `private.is_team_staff` e
`private.is_team_feature_enabled(..., 'event_control')`. O servidor não confia
em papel, timezone, série ou time derivados apenas do formulário.

### Fuso e recorrência

- o formulário mantém o texto civil de `datetime-local`; não chama
  `new Date(value)` nem envia ISO calculado no aparelho;
- a Action valida formato e futuro sem converter o fuso e delega à RPC;
- a RPC lê `teams.timezone`, resolve
  `starts_at_local at time zone teams.timezone` e valida round-trip;
- horário inexistente no salto de DST é rejeitado; horário ambíguo usa a
  resolução determinística do PostgreSQL e permanece independente do aparelho;
- ocorrências semanais são materializadas por data civil + `local_start_time`
  + timezone da série, nunca somando semanas ao `timestamptz`;
- edição “esta e futuras” preserva ocorrências anteriores e exceções
  independentes.

### Máquina de estados e efeitos

| Estado atual | Editar/remarcar | Cancelar | Estender série |
|---|---|---|---|
| `scheduled`, futuro | permitido | permitido | permitido para série ativa |
| `scheduled`, iniciado/passado | negado | negado | não altera a ocorrência |
| `cancelled` | negado | replay idempotente do mesmo comando | negado |
| `completed` | negado | negado | negado |

Cancelamento é soft: mantém `event_id`, presença, times montados, lances e
súmula. `single_event` marca apenas a ocorrência como exceção; `this_and_future`
cancela somente ocorrências futuras agendadas, preserva exceções anteriores e
torna a série inativa. Extensão só aceita série ativa, respeita o limite total
de 52 ocorrências e usa posição única para impedir duplicação.

Na mesma transação, comandos de remarcação/cancelamento:

- cancelam linhas `notification_outbox` ainda `pending` ou `failed` para as
  ocorrências afetadas;
- registram `event_changes` com status, versão e horário explícitos;
- escrevem auditoria uma única vez por comando.

Nenhum envio externo nasce na R01.

### Aplicação, rollout e compatibilidade

- `FeatureKey` passa a conhecer `event_control`;
- a UI gera um UUID por tentativa lógica e o mantém durante retries;
- com a flag desligada, criação/edição atuais continuam no fluxo legado;
  cancelamento e extensão não aparecem e as RPCs novas negam execução;
- banco N com app N−1 é apenas expansão inerte;
- app N com banco N−1 consulta a capacidade em fail-closed e usa o fluxo legado;
- primeiro piloto habilita um único time após testes locais de fuso, replay,
  cancelamento e cross-tenant.

### Matriz mínima de testes

- mesmo valor civil com aparelhos em fusos diferentes produz o mesmo
  `timestamptz`;
- horário inválido de DST é rejeitado e recorrência mantém a hora civil;
- retry sequencial e concorrente retorna o mesmo resultado sem duplicar linha,
  ocorrência, mudança ou auditoria;
- cancelamento isolado e futuro preserva presença/súmula e não reescreve
  passado/exceção;
- extensão respeita 52 ocorrências, série inativa e posição única;
- owner/admin/manager ativos passam; atleta, inativo, externo e cross-tenant
  falham;
- flag desligada falha server-side e preserva o fluxo legado.

## Critérios de aceite

- [x] `AC-R01-01` — A mesma data local resulta no mesmo instante independentemente do fuso do aparelho.
- [x] `AC-R01-02` — Cancelamento preserva registro, presença histórica e súmula existente.
- [x] `AC-R01-03` — Editar/remarcar informa claramente o alcance antes de confirmar.
- [x] `AC-R01-04` — Repetir o mesmo comando não duplica ocorrências nem efeitos.
- [x] `AC-R01-05` — Comandos futuros de notificação podem identificar cancelamento ou novo horário sem heurística.
- [x] `AC-R01-06` — Fluxos passam em viewport móvel, teclado e leitor de tela.
- [x] `AC-R01-07` — pgTAP cobre papel permitido, negado e tentativa cross-tenant.

## Riscos e controles

| Risco | Controle | Evidência |
|---|---|---|
| Fuso do aparelho muda o instante | conversão autoritativa pelo fuso do time e testes com fusos distintos | `AC-R01-01` |
| Cancelamento apaga fatos passados | status preservado, migration aditiva e testes com presença/súmula | `AC-R01-02` |
| Retry duplica ocorrência ou efeito | RPC idempotente e chave estável por comando | `AC-R01-04` |
| Remarcação deixa outbox ambígua | evento de domínio com versão/novo horário explícitos | `AC-R01-05` |

## Validação

- todos os WPs usam `VAL-APP` e `VAL-DB`;
- validar datas em pelo menos dois fusos de aparelho para o mesmo fuso do time;
- testar ocorrência isolada, “esta e futuras”, retry e evento já encerrado;

## Rollout, fallback e rollback

- ativar por time após backfill/validação de fuso;
- manter leitura dos estados antigos durante a expansão;
- fallback administrativo é bloquear automações e preservar a página informativa;
- correção de banco é forward-only, sem reabrir evento ou série passada.

## Evidência do CP0

- R00 concluída e produção saudável em `0466d04`;
- baseline e invariantes revalidados no contexto canônico;
- entrypoints existentes localizados e histórico consultado;
- defeito de fuso reproduzido no código: `datetime-local` passa por
  `new Date(value)` no navegador;
- edição atual já preserva presença e exceções, mas não possui cancelamento,
  extensão idempotente, `request_id` nem versão explícita de agenda;
- migration nova, capacidade desligada, papéis, retenção, fallback e perfis
  `VAL-APP`/`VAL-DB` identificados.

## Evidência do CP1

- expansão separada para enum e contrato, compatível nas duas ordens de deploy;
- modelo de estado, ledger idempotente e log consumível por R03 definidos;
- assinaturas das RPCs e retorno comum definidos;
- conversão de fuso e materialização semanal definidas sem dependência do
  aparelho;
- autorização, RLS, efeitos na outbox, fallback, rollout e matriz de testes
  fechados antes do código.

## Evidência do CP2 — WP-R01-01

- migrations `event_control_feature` e `event_control_contract` aplicadas por
  reset local, mantendo a capacidade desligada por padrão;
- criação e edição v2 recebem horário civil, resolvem o instante pelo fuso IANA
  do time e mantêm a hora civil semanal ao atravessar DST;
- ledger idempotente, `schedule_version` e `event_changes` cobrem criação,
  edição, replay e contrato futuro de notificações;
- app consulta a capacidade em fail-closed: flag desligada preserva o payload
  ISO e as RPCs legadas; flag ativa remove `startsAtIso` e usa `requestId`;
- pgTAP completo: 14 arquivos, 306 testes, incluindo flag desligada, owner,
  manager, replay, intervalo inexistente de DST, grants e cross-tenant;
- `npm run verify`: lint, typecheck e 65 testes passaram; build de produção
  passou com acesso às fontes externas;
- viewport móvel 390×844 sem overflow horizontal, controles rotulados,
  descrição de fuso associada, alvo principal de 48 px e navegação por teclado
  preservada.

## Evidência do CP3 — WP-R01-02

- migration forward-only `event_cancellation` adiciona a RPC transacional de
  cancelamento soft com escopos “somente esta” e “esta e futuras”;
- o comando preserva evento, presenças, times montados e súmula, encerra a série
  quando aplicável e cancela somente entregas pendentes ou falhas da outbox;
- ledger idempotente rejeita reutilização divergente do `request_id`, replay
  igual não duplica efeitos e cada ocorrência recebe uma mudança explícita
  `cancelled`;
- Action permanece fina, consulta `event_control` em fail-closed e a interface
  exige confirmação destrutiva explícita antes de enviar;
- pgTAP completo: 15 arquivos, 331 testes, incluindo owner, cross-tenant,
  flag desligada, replay, série, retenção histórica e efeitos na outbox;
- `npm run verify`: lint, typecheck e 73 testes passaram; build de produção
  passou com acesso às fontes externas;
- `npm run security:audit`: nenhuma vulnerabilidade encontrada;
- viewport móvel 390×844 sem overflow horizontal, botão principal de 48 px,
  confirmação obrigatória e estado cancelado previsível; teste local preservou
  as 28 presenças do evento do seed e retirou o formulário após o comando.

## Evidência do CP4 — WP-R01-03

- migration forward-only `series_extension` adiciona a RPC transacional
  `extend_event_series_as_staff`, limitada a séries ativas e futuras;
- extensão usa `ends_on`, `local_start_time` e timezone autoritativos da série,
  preserva a hora civil através de DST e cria posições contíguas únicas;
- cada nova ocorrência nasce com chamada pendente para o elenco ativo,
  `event_change` do tipo `series_extended` e auditoria única do comando;
- o ledger devolve replay persistido sem duplicar ocorrência, mudança ou
  auditoria e rejeita o mesmo `request_id` com quantidade divergente;
- limite total de 52, série inativa, flag desligada e cross-tenant falham no
  banco; owner e manager ativos passam;
- pgTAP completo: 16 arquivos, 359 testes; lint sem novo aviso e apenas a
  advertência legada de `create_event_as_staff`;
- `npm run verify`: lint, typecheck, 74 testes e build de produção passaram;
  `npm run security:audit` encontrou zero vulnerabilidades;
- viewport móvel 390×844 sem overflow, campo e ação principal com 48 px,
  descrição acessível do limite e fluxo local completo de 3 para 5 ocorrências.

## Preparação do CP5 — deploy inerte

- baseline produtiva registrada antes da integração: commit `6551bdb`, GitHub
  deployment `5632906132`, criado em `2026-07-28T02:04:58Z`;
- checks da baseline `quality`, `database`, `dependency-review`, CodeQL,
  `terraform-check`, Supabase Preview e smoke estavam verdes;
- smoke anônimo somente leitura repetido em `2026-07-28`: `/` e `/auth/login`
  retornaram HTML com sucesso em `https://deutime.app`;
- logs estruturados `event_control_operation` distinguem rejeição esperada de
  falha operacional sem incluir time, evento, ator ou PII;
- runbook do piloto define seleção de uma única coorte, ativação/desativação
  auditada, consultas de integridade, limites de alerta, fallback e rollback;
- ensaio local de recuperação concluiu com `event_control=false`,
  `integration_produce=false` e `integration_consume=false`;
- gate da preparação: 13 arquivos/78 testes, build e auditoria com zero
  vulnerabilidades;
- deploy e piloto ainda não executados: a capacidade continua desligada por
  padrão e nenhum merge na `main` ocorreu nesta preparação.
