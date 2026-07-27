---
id: R01
status: ready
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

## Critérios de aceite

- [ ] `AC-R01-01` — A mesma data local resulta no mesmo instante independentemente do fuso do aparelho.
- [ ] `AC-R01-02` — Cancelamento preserva registro, presença histórica e súmula existente.
- [ ] `AC-R01-03` — Editar/remarcar informa claramente o alcance antes de confirmar.
- [ ] `AC-R01-04` — Repetir o mesmo comando não duplica ocorrências nem efeitos.
- [ ] `AC-R01-05` — Comandos futuros de notificação podem identificar cancelamento ou novo horário sem heurística.
- [ ] `AC-R01-06` — Fluxos passam em viewport móvel, teclado e leitor de tela.
- [ ] `AC-R01-07` — pgTAP cobre papel permitido, negado e tentativa cross-tenant.

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
