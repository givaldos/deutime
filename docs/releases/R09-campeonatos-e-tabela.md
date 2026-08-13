---
id: R09
type: vertical
status: active
outcome: "Permitir que a diretoria organize campeonatos em pontos corridos, grupos com mata-mata ou mata-mata, vincule partidas e compartilhe tabela ou chaveamento atualizados sem perder o histórico."
depends_on: [R04, R07, R08M]
baseline:
  - BASE-TENANCY
  - BASE-MATCH-REPORT
  - BASE-PUBLIC
  - BASE-WRITES
verified_at: "b4b8e1c"
decisions:
  - DEC-EVENT-MATCH
  - DEC-PUBLIC-PRIVACY
  - DEC-INTERNAL-SQUAD-IDENTITY
  - DEC-CHAMPIONSHIP-MODEL
invariants:
  - INV-MOBILE-WHATSAPP-FIRST
  - INV-RLS-MULTI-TIME
  - INV-DEPLOY-COMPATIBLE
  - INV-HISTORICAL-EVENTS
  - INV-PRIVATE-BY-DEFAULT
  - INV-SINGLE-SOURCE
  - INV-MANUAL-FALLBACK
---

# R09 — Campeonatos e tabela

## Resultado demonstrável

No celular, owner/admin cria um campeonato em pontos corridos, grupos com
mata-mata ou mata-mata, escolhe participantes internos ou externos e publica os
confrontos. A diretoria agenda cada confronto em uma partida já conhecida pelo
DeuTime. Ao encerrar ou corrigir a súmula, tabela e chaveamento são recalculados
sem apagar o histórico. A galera acompanha uma página segura e compartilhável
pelo WhatsApp; com a capacidade desligada, as partidas continuam acessíveis.

## Três tempos

### Passado a preservar

- `events` continua sendo ocorrência de agenda e dono da URL do jogo;
- `event_matches` representa zero ou muitas partidas por evento, com dois lados,
  participação real, fatos esportivos e correções auditadas;
- equipes internas são persistentes, enquanto evento e partida guardam
  snapshots que não mudam quando nome, cor ou escudo forem editados;
- amistosos, partidas sem campeonato, súmula, conversa, votação e
  compartilhamento atuais continuam funcionando sem a R09;
- páginas públicas são mínimas, privadas por padrão e nunca são ampliadas por
  sessão, capability ou identidade sem consentimento.

### Presente a resolver

- partidas encerradas são fatos isolados e não existe campeonato, regulamento,
  rodada, grupo, classificação nem chaveamento no produto;
- organizar uma temporada exige controle externo e correção manual duplicada;
- não há vínculo estável entre participante do campeonato e lado da partida;
- anulação ou correção de súmula não possui recálculo transacional de tabela;
- não existe uma página agregada mobile-first para compartilhar a competição.

### Futuro compatível

- o contrato aceita novos formatos por expansão, sem transformar evento em
  campeonato nem trocar a identidade das partidas existentes;
- uma liga multi-organização futura poderá compor permissões próprias sem usar
  referência cross-tenant implícita da R09;
- ida e volta, séries, inscrição de elenco, transferência, arbitragem,
  pagamentos, ranking individual e mensagens automáticas ficam fora da release.

## Escopo

### Incluído

- campeonato de uma organização com 2 a 32 participantes;
- participantes ligados a equipes internas ou snapshots de adversários externos;
- pontos corridos em turno único, grupos em turno único seguidos de mata-mata e
  mata-mata em jogo único, incluindo byes por seed;
- pontos por vitória/empate/derrota e ordem fechada de critérios de desempate;
- geração em rascunho, revisão e publicação idempotente dos confrontos;
- vínculo opcional entre confronto e partida, sem transformar campeonato em
  recorrência do evento;
- classificação e chaveamento reconstruíveis somente de partidas finalizadas,
  decisões auditadas e regras publicadas;
- remarcação, anulação, W.O., retirada e correção com motivo e recálculo sob lock;
- página `/c/{public_id}` estável, anônima, `noindex` e sem dados pessoais;
- compartilhamento manual por ação nativa ou cópia, com navegação mobile-first;
- flag `championships` desligada por padrão, telemetria agregada, piloto,
  fallback, rollback e compatibilidade N/N−1.

### Fora

- campeonato que compartilha autorização ou escrita entre tenants;
- conta, elenco, atleta ou convite para adversário externo;
- returno, ida e volta, melhor de séries, rebaixamento, bônus ou script de regra;
- importar tabela externa, cobrança, prêmio, arbitragem ou reserva de quadra;
- ranking individual, artilharia pública, escalação ou autoria de gol agregada;
- indexação pública, descoberta aberta ou disparo automático pelo WhatsApp;
- apagar partida concluída ou reescrever confronto histórico.

## Contratos e decisões

- [`DEC-CHAMPIONSHIP-MODEL`](../decisions/DEC-CHAMPIONSHIP-MODEL.md) fecha
  participantes, formatos, pontuação, desempate, geração, empate eliminatório,
  vínculo, publicação, autorização e compatibilidade;
- [`DEC-EVENT-MATCH`](../decisions/DEC-EVENT-MATCH.md) mantém evento como agenda
  e partida como fonte dos fatos esportivos;
- `championship`, participante e confronto carregam `team_id`; cada confronto
  aceita no máximo uma partida e cada partida no máximo um confronto;
- classificação e chaveamento são projeções reconstruíveis. Nenhum contador
  independente vira fonte de verdade;
- owner/admin altera regulamento e publicação; manager agenda e opera confronto
  publicado; identidade e tenant derivam da sessão verificada;
- empate absoluto na tabela preserva posição compartilhada. Desempate necessário
  para vaga e vencedor eliminatório exige escolha administrativa com motivo;
- a página do campeonato não amplia a projeção de evento, partida ou atleta;
- Actions validam e delegam para RPCs transacionais; escrita direta permanece
  revogada; toda migration é forward-only e aditiva.

## Entry points

- código existente:
  - `app/app/[teamSlug]/events/[eventId]/matches/page.tsx`;
  - `lib/data/matches.ts`;
  - `app/e/[publicId]/page.tsx`;
- expansão planejada:
  - `app/app/[teamSlug]/championships/page.tsx`;
  - `app/app/[teamSlug]/championships/[championshipId]/page.tsx`;
  - `app/c/[publicId]/page.tsx`;
  - `lib/features/championships/` — domínio novo concentrado, justificado pelos
    três formatos e sem ampliar Actions de evento;
- migrations:
  - próxima migration `*_r09_championship_contract.sql`, sem editar R04/R07;
- testes existentes:
  - `supabase/tests/031_r04_match_expansion.test.sql`;
  - `app/app/[teamSlug]/events/lineup-actions.test.ts`;
- testes planejados:
  - `supabase/tests/*_r09_championship_contract.test.sql`;
  - `lib/features/championships/rules.test.ts`;
  - `app/c/[publicId]/page.test.tsx`;
- documentação:
  - `docs/decisions/DEC-CHAMPIONSHIP-MODEL.md`;
  - `docs/runbook.md`;
  - `docs/work/current.md`.

## Pacotes de trabalho

| Pacote | Critérios | Entry points principais | Validação |
|---|---|---|---|
| `WP-R09-01` — expansão inerte | `AC-R09-01` a `04`, `11`, `12` | flag, tabelas, RLS, RPCs e tipos | `VAL-DB`, censo e N/N−1 |
| `WP-R09-02` — pontos corridos | `AC-R09-01` a `06`, `08` | domínio de regras, criação mobile e vínculo | `VAL-APP` + `VAL-DB` |
| `WP-R09-03` — grupos e mata-mata | `AC-R09-01`, `03`, `06` a `09` | geração, avanço, byes e correção | `VAL-APP` + `VAL-DB` |
| `WP-R09-04` — página compartilhável | `AC-R09-10`, `12`, `13` | projeção anônima, `/c` e compartilhamento | `VAL-PUBLIC` + `VAL-APP` |
| `WP-R09-05` — robustez e piloto | `AC-R09-08` a `14` | concorrência, telemetria, runbook e coorte | CP3–CP6 + Android/iPhone |

## Critérios de aceite

- [ ] `AC-R09-01` — Owner/admin cria campeonato válido nos três formatos, com limites, pontos e desempates validados server-side; manager e atleta não alteram regulamento.
- [ ] `AC-R09-02` — Participante referencia somente equipe interna do mesmo tenant ou snapshot externo, sem conceder acesso nem reescrever histórico após edição da equipe.
- [ ] `AC-R09-03` — Geração de confrontos é reproduzível, revisável antes da publicação e idempotente diante de retry; publicação concorrente produz uma única grade.
- [ ] `AC-R09-04` — Confronto e partida possuem vínculo um-para-um dentro do mesmo tenant; amistoso permanece desvinculado e o primeiro fato esportivo congela os lados.
- [ ] `AC-R09-05` — Encerrar partida atualiza a classificação transacionalmente a partir do placar e regulamento, sem contador esportivo independente.
- [ ] `AC-R09-06` — Pontos, jogos, vitórias, empates, derrotas, gols pró, gols contra, saldo e desempates permanecem corretos em empate absoluto, anulação e correção.
- [ ] `AC-R09-07` — Grupos classificam a quantidade publicada e alimentam o mata-mata; byes e avanço nunca criam confronto duplicado.
- [ ] `AC-R09-08` — Empate eliminatório, W.O. ou vaga ainda empatada exigem decisão explícita, motivo e auditoria, sem inventar gols no placar.
- [ ] `AC-R09-09` — Cancelamento futuro libera confronto para remarcação; retirada e correção preservam partidas concluídas e falham fechadas quando um confronto dependente já começou.
- [ ] `AC-R09-10` — `/c/{public_id}` mostra somente regulamento, participantes, placares autorizados, tabela e chaveamento, sem PII, endereço privado, ID interno ou ampliação por sessão/capability.
- [ ] `AC-R09-11` — Tabelas, chaves, RLS, grants e RPCs impedem leitura e escrita cross-tenant e cobrem sucesso, negação e concorrência em pgTAP.
- [ ] `AC-R09-12` — Flag desligada, schema N−1 ou falha da projeção preservam agenda, partidas, súmula, página do evento e histórico existentes.
- [ ] `AC-R09-13` — Criação, revisão, tabela, chaveamento e compartilhamento funcionam por toque, teclado e leitor de tela em larguras móveis, Android, iPhone e navegador interno do WhatsApp.
- [ ] `AC-R09-14` — Piloto isolado comprova telemetria sem PII, smoke, alerta, suporte, reconstrução da classificação, fallback e rollback por flag.

## Riscos e controles

| Risco | Controle | Evidência |
|---|---|---|
| tabela diverge da súmula | fatos finalizados como fonte, recálculo sob lock e verificador de reconstrução | pgTAP de finalização/correção + sonda agregada |
| participante atravessa tenant | snapshot externo sem FK cross-tenant, chaves compostas e RLS | casos negativos e cross-tenant |
| correção muda chave já iniciada | dependências explícitas, auditoria e falha fechada | cenários de correção antes/depois do início |
| retry duplica grade ou avanço | request ID, unicidade estrutural e RPC idempotente | concorrência e replay |
| página agrega dado privado | projeção anônima mínima sem atletas/local e link condicional ao evento | pgTAP, snapshots e smoke anônimo |
| release ampla oculta fallback | pacotes verticais, flag única server-side e partidas independentes | matriz N/N−1 e rollback ensaiado |
| regra configurável fica ambígua | catálogo fechado, regulamento imutável após publicação e motivo auditado | testes de validação e revisão mobile |

## Validação

```bash
npm test -- 'lib/features/championships/rules.test.ts' 'app/c/[publicId]/page.test.tsx'
npm run typecheck
npm run db:reset
npm run db:lint
npm run db:test
npm run db:types
git diff --exit-code -- lib/database.types.ts
npm run verify
npm run security:audit
```

O gate de banco inclui imutabilidade das migrations aplicadas, censo dinâmico
de RLS/grants e matriz app/schema N/N−1. O gate físico usa dados sintéticos e
registra formato, estado, largura e resultado, sem nome de atleta ou endereço.

## Rollout, fallback e rollback

- flag tipada, desligada por padrão e conferida server-side: `championships`;
- piloto: uma organização demo, sem adversário que dependa de outro tenant;
- telemetria: formato, quantidade de participantes/confrontos, duração,
  recálculo e erro agregados, sem nomes, `public_id` ou conteúdo de motivo;
- fallback: agenda, partidas, súmula e histórico atuais, além de tabela manual
  fora do DeuTime durante o piloto;
- efeitos externos: R09 não produz outbox; compartilhamento permanece manual;
- smoke de produção somente leitura: flag, projeção anônima, headers, tabela e
  reconstrução agregada sem expor identificadores;
- staging: campeonato sintético isolado, idempotente e com limpeza explícita;
- rollback: desligar `championships`; expansão e fatos permanecem preservados;
- compatibilidade N/N−1: app novo tolera schema ausente; app antigo ignora a
  expansão e banco novo não exige vínculo de campeonato nas partidas.

## Evidências e checkpoint

### `DP-R09-01` — CP0 concluído

- R09 foi selecionada antes da R10 por fechar a continuidade entre partidas já
  comprovadas e uma competição, reutilizando os contratos de R04 e R07;
- baseline `b4b8e1c` confirmou partida explícita, vínculo opcional de equipe
  interna, fatos esportivos finalizados e projeção pública do evento;
- `DEC-CHAMPIONSHIP-MODEL` resolveu participantes, limites, três formatos,
  pontuação, desempate, geração, empate eliminatório, correção, autorização,
  publicação e compatibilidade;
- dependências R04, R07 e R08M estão concluídas; amistoso e operação atual são o
  fallback, e nenhuma integração externa nova foi introduzida;
- entrypoints, riscos, critérios, rollout e comandos de validação foram
  localizados; a R09 satisfaz a Definition of Ready;
- próxima ação: `WP-R09-01`, adicionar a expansão inerte da flag, tabelas,
  RLS, grants e RPCs sem criar consumidor nem ativar organização.

### `WP-R09-01` — CP1 concluído

- a flag tipada `championships` foi adicionada em migration isolada e nenhum
  registro de `team_feature_flags` foi criado pela expansão;
- `championships`, `championship_participants`, `championship_fixtures` e
  `championship_fixture_slots` carregam `team_id`, RLS e grants mínimos;
- o vínculo 1:1 pertence a `championship_fixtures.match_id` e referencia a chave
  composta da partida. `event_matches` não recebeu coluna nem dependência nova;
- participantes internos preservam snapshot da equipe do mesmo tenant;
  adversários externos não criam conta, atleta, vínculo ou acesso cross-tenant;
- `create_championship_draft`, `add_championship_participant` e
  `link_championship_fixture_match` validam papéis e flag, delegam escritas
  transacionais e mantêm recibos idempotentes invisíveis ao cliente;
- o pgTAP focado aprovou 44 casos dos três formatos, regras inválidas, flag desligada, papéis,
  replay, snapshots, RLS, cross-tenant, vínculo, grants e auditoria redigida;
- `db:reset`, censo dinâmico, lint, tipos e suíte completa confirmaram expansão
  forward-only, sem consumidor e compatível com app/schema N/N−1;
- o checkpoint avançou para CP1 sem ativar time. Próxima ação: `WP-R09-02`,
  entregar o caminho fino de pontos corridos atrás da flag e manter a agenda,
  partidas e súmula atuais como fallback.
