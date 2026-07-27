---
id: R01
status: draft
outcome: "Permitir editar, remarcar e cancelar eventos com horário correto e efeitos previsíveis sobre pessoas, links e notificações."
depends_on:
  - R00
baseline:
  - BASE-SERIES
  - BASE-ATTENDANCE
  - BASE-MATCH-REPORT
verified_at: 77aed23
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

## Entry points

- `components/admin-event-form.tsx`
- `app/app/[teamSlug]/events/actions.ts`
- `app/app/[teamSlug]/events/[eventId]/edit/page.tsx`
- `supabase/migrations/202607200004_event_editing.sql`
- `supabase/tests/007_event_editing.test.sql`
- `lib/validation/operations.ts`
- `lib/validation/operations.test.ts`

Esses caminhos foram conferidos em `77aed23` e devem ser revalidados no CP0.

## Pacotes de trabalho

| Pacote | Critérios | Entry points principais | Validação |
|---|---|---|---|
| `WP-R01-01` — Fuso autoritativo | `AC-R01-01`, `06`, `07` | `admin-event-form.tsx`, validação de operações, Actions de evento, `007_event_editing` | `VAL-APP`, `VAL-DB` |
| `WP-R01-02` — Cancelamento e remarcação | `AC-R01-02`, `03`, `05`, `07` | Actions/página de evento, migration nova, `007_event_editing` | `VAL-APP`, `VAL-DB` |
| `WP-R01-03` — Extensão e cancelamento de série | `AC-R01-02` a `05`, `07` | Actions de evento, `202607200004`, migration nova, pgTAP | `VAL-APP`, `VAL-DB` |

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
