---
id: R04
type: vertical
status: active
outcome: "Registrar uma ou mais partidas no mesmo evento, acompanhar placar e lances ao vivo e preservar uma súmula final auditável na URL estável."
depends_on:
  - R02
baseline:
  - BASE-ATTENDANCE
  - BASE-MATCH-REPORT
  - BASE-PUBLIC
  - BASE-WRITES
verified_at: "codex/r04-public-privacy-decision"
decisions:
  - DEC-EVENT-MATCH
  - DEC-PUBLIC-PRIVACY
  - DEC-EVENT-PUBLIC-MINIMUM
invariants:
  - INV-MOBILE-WHATSAPP-FIRST
  - INV-RLS-MULTI-TIME
  - INV-DEPLOY-COMPATIBLE
  - INV-HISTORICAL-EVENTS
  - INV-CANONICAL-EVENT-URL
  - INV-PRIVATE-BY-DEFAULT
  - INV-SINGLE-SOURCE
  - INV-MANUAL-FALLBACK
---

# R04 — Partida ao vivo e pós-jogo

## Resultado demonstrável

Na mesma página estável do evento, a diretoria abre e opera um ou mais
confrontos pelo celular, registra participantes reais, placar e lances e encerra
cada súmula. Atletas autorizados acompanham a atualização. Depois do jogo, o
resultado e a cronologia permanecem auditáveis; adversário externo não precisa
de cadastro fictício e a operação manual continua disponível.

## Três tempos

### Passado a preservar

- R01 mantém agenda, chamada, recorrência, cancelamento e remarcação por
  ocorrência;
- R02 mantém `/e/{public_id}` como URL imutável e o GET anônimo mínimo;
- `match_reports` mantém uma súmula por evento e `match_incidents` registra gols
  e cartões de atletas confirmados;
- `event_squads` e `lineup_spots` representam equipes e escalação planejadas;
- estatísticas usam somente súmulas encerradas e o fallback administrativo já
  permite atualização manual.

### Presente a resolver

- separar evento, partida, escalação planejada e participação real;
- permitir zero, um ou vários confrontos, cada um com exatamente dois lados;
- suportar adversário externo, transmissão opcional, placar e cronologia ao
  vivo sem HTML arbitrário;
- tornar correções pós-jogo append-only, motivadas e auditáveis;
- implementar modos públicos do confronto e consentimentos pessoais separados,
  ambos privados por padrão.

### Futuro compatível

- R05 pode usar participantes reais como conjunto elegível ao voto;
- R06 pode vincular conversa ao confronto correto sem criar chat geral;
- R07 pode distribuir atletas por partidas e lados sem redefinir o evento;
- estatísticas e reconhecimentos derivam do mesmo fato finalizado;
- replay de vídeo, arbitragem e integrações de placar ficam fora desta release.

## Escopo

### Incluído

- modelo explícito de partida, dois lados e adversário externo;
- participação real por partida, distinta de RSVP e escalação;
- placar, gols, assistências, cartões, substituições e outros lances previstos
  no contrato da timeline;
- início, acompanhamento, anulação, encerramento e correção auditada;
- transmissão opcional por YouTube ou Vimeo allowlisted;
- operação administrativa mobile e leitura privada autorizada;
- evolução da URL canônica conforme a matriz pública consentida;
- migração compatível da súmula simples existente.

### Fora

- voto de Craque, conversa, pontos e ranking;
- divisão automática ou algoritmo de equilíbrio;
- chat geral, arbitragem, scout avançado ou ingestão automática de vídeo;
- cadastro completo de time ou atleta adversário;
- publicação de identidade sem consentimento resolvido.

## Contratos e decisões

[`DEC-EVENT-MATCH`](../decisions/DEC-EVENT-MATCH.md) mantém `events` como
contêiner da ocorrência e introduz partidas explícitas. Cada partida possui dois
lados, participação real própria e ledger de lances append-only. A URL continua
pertencendo ao evento e apresenta o confronto selecionado sem mudar de endereço.

[`DEC-PUBLIC-PRIVACY`](../decisions/DEC-PUBLIC-PRIVACY.md) separa quatro
audiências e mantém a capability pessoal restrita aos próprios dados. Placar e
fatos por lado podem ser publicados em modo `final_result` ou `live`; identidade
exige consentimento específico de atividade esportiva e, para foto/bio/perfil,
também consentimento de perfil. O fallback continua sendo o mínimo de
[`DEC-EVENT-PUBLIC-MINIMUM`](../decisions/DEC-EVENT-PUBLIC-MINIMUM.md).

Banco e aplicação serão expandidos antes de qualquer consumidor. RPCs legadas
por evento funcionam somente para uma partida padrão; eventos com mais de uma
partida exigem o novo identificador e falham fechado. Toda escrita sensível é
transacional, deriva time e papel da sessão e gera auditoria.

## Entry points

- código: `app/app/[teamSlug]/events/[eventId]/match/`,
  `app/me/agenda/[eventId]/page.tsx` e `lib/data/player-events.ts`;
- banco: `match_reports`, `match_incidents`, `event_squads`, `lineup_spots`,
  `event_attendance` e novas migrations forward-only;
- testes: `supabase/tests/008_match_report.test.sql`, testes de Actions/DAL e
  nova matriz positiva, negativa, concorrente e cross-tenant;
- documentação: `DEC-EVENT-MATCH`, `DEC-PUBLIC-PRIVACY`, arquitetura, segurança
  e este pacote.

## Pacotes de trabalho

| Pacote | Critérios | Entry points principais | Validação |
|---|---|---|---|
| `DP-R04-01` — domínio e privacidade | `AC-R04-01` a `03`, `08` | ADRs, pacote, arquitetura e threat model | revisão documental e matriz pública |
| `WP-R04-01` — expansão de partidas | `AC-R04-01` a `06`, `09`, `10` | migration, RPCs, backfill e pgTAP | `VAL-DB`, concorrência e N/N−1 |
| `WP-R04-02` — operação mobile | `AC-R04-03` a `07`, `10` | súmula administrativa, Actions e telemetria | `VAL-APP`, mobile e fallback |
| `WP-R04-03` — leitura ao vivo | `AC-R04-06` a `08` | DAL privado, URL canônica e streaming | `VAL-PUBLIC`, autorização e atualização |
| `WP-R04-04` — histórico e rollout | `AC-R04-04` a `10` | correções, estatísticas, flag e runbook | `VAL-LINK`, piloto e rollback |

## Critérios de aceite

- [ ] `AC-R04-01` — Um evento aceita zero, uma ou várias partidas sem mudar sua URL ou duplicar chamada e comunicação.
- [ ] `AC-R04-02` — Cada partida possui exatamente dois lados e aceita adversário externo por snapshot, sem atleta fictício.
- [ ] `AC-R04-03` — Participação real é registrada por partida, separada de RSVP e escalação, e é a fonte de autoria e estatísticas.
- [ ] `AC-R04-04` — Lances e correções formam histórico append-only, motivado e auditável; o placar final é reconstruível.
- [ ] `AC-R04-05` — RPCs, RLS, grants e chaves compostas permitem somente staff do próprio time e negam atleta, anônimo e cross-tenant.
- [ ] `AC-R04-06` — Partidas do mesmo evento evoluem de forma independente e encerrar uma não conclui prematuramente as demais.
- [ ] `AC-R04-07` — A operação ao vivo é utilizável no celular, tolera atualização indisponível e preserva a súmula manual.
- [ ] `AC-R04-08` — A projeção pública segue matriz consentida e não expõe identidade, escalação ou presença por padrão.
- [ ] `AC-R04-09` — Súmulas legadas são migradas sem alterar placar ou histórico e app/banco N/N−1 mantêm fallback seguro.
- [ ] `AC-R04-10` — Anulação, cancelamento e correção preservam fatos históricos, auditoria e estatísticas coerentes.

## Riscos e controles

| Risco | Controle | Evidência |
|---|---|---|
| misturar RSVP, escalação e presença | entidades separadas e invariantes no banco | pgTAP negativo e estatísticas |
| placar divergir da timeline | ledger autoritativo e ajuste explícito auditado | reconstrução e concorrência |
| evento com vários jogos usar RPC legada | wrapper falha fechado fora da partida única | contrato N/N−1 |
| publicar atleta sem consentimento | projeção privada por padrão e decisão bloqueadora | matriz pública e threat model |
| cross-tenant em fatos esportivos | FKs compostas, RLS, grants mínimos e RPCs | pgTAP cross-tenant |
| streaming malicioso | provider allowlist e ID validado, sem embed arbitrário | testes de validação e CSP |
| atualização ao vivo indisponível | polling/reload e operação manual | teste de degradação e rollback |

## Validação

```bash
npm run lint
npm run typecheck
npm test
npm run db:test
npm run smoke:production
```

Migration exige integridade contra o merge-base, censo dinâmico de RLS/grants,
backfill verificável, estatísticas antes/depois e matriz app/schema N/N−1. O
piloto físico deve cobrir partida simples, dois confrontos, adversário externo,
correção pós-jogo e celular real.

## Rollout, fallback e rollback

- flag tipada `event_matches`, desligada por padrão e conferida server-side;
- expansão de banco e backfill são publicados antes do app consumidor;
- piloto inicial usa somente time demo e uma partida padrão, depois um evento
  com dois confrontos;
- telemetria registra início, lance, correção, encerramento, falha de atualização
  e uso do fallback sem copiar observações livres;
- fallback mantém a súmula administrativa legada enquanto houver uma única
  partida e permite atualização/reload manual;
- rollback desliga o consumidor novo, preserva tabelas e histórico expandido e
  retorna à projeção pública mínima;
- staging, Terraform e automações adicionais permanecem melhorias técnicas de
  backlog; o MVP valida em dev local e produção com dados demo.

## Evidências e checkpoint

### `DP-R04-01` — CP0 concluído

- o modelo existente e seus consumidores foram confrontados com o roadmap;
- `DEC-EVENT-MATCH` foi aceita com evento 0..N partidas, dois lados, presença
  real separada e timeline append-only;
- `DEC-PUBLIC-PRIVACY` foi aceita com quatro audiências, publicação de fatos por
  lado, consentimentos pessoais separados e capability sem acesso a terceiros;
- migração legada, compatibilidade N/N−1, fallback e reversão estão definidos;
- nenhuma migration, flag, dado ou ambiente foi alterado;
- próxima ação: CP1 de `WP-R04-01`, detalhando tabelas, constraints, RPCs,
  projeções, backfill e matriz de compatibilidade da expansão inerte.
