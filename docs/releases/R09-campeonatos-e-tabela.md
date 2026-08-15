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

### `WP-R09-02` — CP2 concluído

- owner/admin cria no celular um rascunho de pontos corridos com pontuação e
  catálogo fechado de desempates; participantes internos preservam o snapshot
  do time da casa e adversários externos não recebem identidade nem acesso;
- `generate_league_fixtures` usa o algoritmo round-robin de turno único sob lock,
  produz uma grade determinística e revisável e preserva os mesmos confrontos no
  replay da mesma intenção;
- `publish_league_championship` valida quantidade, dois lados e unicidade de cada
  par antes de promover toda a grade; publicações concorrentes convergem para um
  único estado e deixam recibos idempotentes;
- manager, owner e admin vinculam uma partida ainda sem fatos ao confronto
  publicado. A RPC revalida tenant, congela os snapshots nos lados e mantém o
  vínculo 1:1 fora de `event_matches`;
- `get_championship_standings` reconstrói pontos, jogos, vitórias, empates,
  derrotas, gols, saldo, confronto direto e posições compartilhadas somente a
  partir de partidas finalizadas; anulação retira o resultado sem contador
  esportivo independente;
- o pgTAP focado aprovou 31 casos de flag, papel, geração, replay, publicação,
  vínculo, placar, anulação e cross-tenant; a suíte completa aprovou 46 arquivos
  e 1.155 testes;
- ESLint, TypeScript, 67 arquivos e 381 testes Vitest passaram; o build Webpack
  compilou as duas rotas novas. O Turbopack local permaneceu limitado pelo bind
  de porta do ambiente, sem erro de aplicação;
- a jornada foi exercitada ponta a ponta em 390×844 e 360×800, com alvos novos
  de 48–56 px, sem overflow da página e com rolagem própria na tabela. Após o
  ensaio, a flag foi desligada, o atalho sumiu e a rota voltou a falhar fechada;
- o checkpoint avançou para CP2 sem ativar organização. Próxima ação:
  `WP-R09-03`, acrescentar grupos e mata-mata sobre o mesmo contrato, sem iniciar
  página pública ou piloto.

### `WP-R09-03` — CP2 concluído

- a criação mobile aceita os três formatos; grupos exigem distribuição explícita
  e quantidade de classificados válida, enquanto o mata-mata direto preserva a
  ordem dos seeds;
- a geração transacional produz rodadas independentes por grupo ou uma chave de
  potência de dois, com byes auditados e slots das fases seguintes derivados dos
  vencedores, sem duplicar confrontos no replay;
- a classificação de grupo é reconstruída da súmula e posição absolutamente
  empatada exige escolha e motivo antes do avanço. Classificados alimentam uma
  única chave eliminatória sob lock;
- placar não empatado decide o vencedor; empate, pênaltis, W.O., regulamento e
  decisão administrativa exigem vencedor e motivo explícitos sem criar gols. A
  correção propaga a snapshots futuros limpos e falha fechada depois do primeiro
  fato da dependência;
- confronto futuro ainda sem fatos ou participação pode ser liberado para outro
  agendamento. Retirada preserva partidas concluídas, anula somente o futuro e
  promove o adversário no mata-mata por decisão administrativa auditada;
- o pgTAP novo aprovou 63 casos; a suíte completa aprovou 47 arquivos e 1.218
  testes, incluindo papéis, replay, RLS, cross-tenant, flag desligada e ausência
  de contador esportivo paralelo;
- ESLint, TypeScript, 67 arquivos e 391 testes Vitest, build de produção Webpack,
  integridade forward-only das migrations e auditoria com zero vulnerabilidades
  passaram. O lint do banco manteve somente dois avisos legados fora do escopo;
- a jornada de criação, grupos, publicação, classificação e fallback foi exercida
  no navegador; as evidências móveis em iPhone e Android foram revisadas pelo
  responsável. A flag voltou a ficar desligada e nenhum time foi ativado;
- o checkpoint permanece em CP2. Próxima ação: `WP-R09-04`, criar a projeção
  anônima mínima e a página compartilhável sem ampliar a audiência dos eventos.

### `WP-R09-04` — CP2 concluído

- `get_public_championship` entrega ao papel anônimo somente quatro blocos
  estritos — regulamento, participantes, classificação e confrontos — sem IDs
  internos, atletas, endereço, autoria ou motivo administrativo;
- a classificação continua derivada de todas as súmulas finalizadas. Placar e
  link para `/e/{public_id}` só entram na projeção quando a própria partida e a
  página pública do evento já os autorizam, sem ampliação por sessão autenticada;
- owner/admin publica ou recolhe a página por RPC transacional e idempotente.
  Rascunho, manager, outro tenant, flag desligada e publicação recolhida falham
  fechados, preservando campeonato, agenda, partidas e histórico;
- `/c/{public_id}` mostra regulamento, identidades visuais, tabela ou chave e
  compartilhamento manual pronto para WhatsApp. Metadados e headers mantêm
  `noindex`, `nofollow`, `no-referrer` e `private, no-store`;
- o cliente valida a projeção com schema estrito e tolera schema N−1, função
  ausente ou indisponibilidade retornando o mesmo estado não público, sem
  consultar tabelas-base nem expor um erro privilegiado;
- o pgTAP novo aprovou 41 casos; a suíte completa aprovou 48 arquivos e 1.259
  testes, incluindo grants, RLS, cross-tenant, flag, três formatos, byes,
  classificação fiel e condicionamento de placar/link;
- ESLint, TypeScript, 70 arquivos e 404 testes Vitest, build de produção Webpack,
  integridade forward-only das migrations e auditoria com zero vulnerabilidades
  passaram. O lint do banco manteve somente dois avisos legados fora do escopo;
- a rota foi exercitada em 390×844 e 360×800, sem overflow global, com rolagem
  própria na tabela, alvo de compartilhamento de 48 px e console limpo. O cenário
  local foi removido e nenhum time ou flag permaneceu ativado;
- o checkpoint permanece em CP2. Próxima ação: `WP-R09-05`, acrescentar
  robustez, telemetria, runbook e executar o piloto controlado até CP6, incluindo
  a evidência física em Android, iPhone e navegador interno do WhatsApp.

### `WP-R09-05` — CP5 concluído; CP6 pendente

- `get_championship_pilot_health` entrega exclusivamente a `service_role` uma
  leitura agregada e sem PII de flags, formatos, estados, projeções, comandos e
  reconstrução da classificação. `anon` e `authenticated` não recebem grant;
  time ausente ou fora da coorte observada não amplia a leitura;
- a sonda `pilot:championship:health` valida UUID, coerência dos agregados, estado
  esperado da flag, projeção completa, fallback e divergência de reconstrução,
  sem imprimir segredo, identificador de time, nome ou corpo bruto de erro;
- concorrência real em duas sessões confirmou um único efeito e um único recibo
  para geração e publicação simultâneas. A suíte focada aprovou 36 casos da
  sonda e 22 casos de concorrência; o gate completo aprovou 50 arquivos e 1.317
  testes pgTAP, mantendo apenas dois avisos legados no lint do banco;
- a projeção pública emite telemetria apenas com formato, contagens, fallback,
  duração limitada e erro grosseiro. O smoke anônimo cobre a página `/c` ativa e
  o mesmo endereço em rollback 404, incluindo headers privados e ausência de
  IDs internos, campos privados e segredos;
- o controle operacional aparece somente para o único `team_id` configurado,
  exige confirmação explícita e delega a escrita à RPC auditada da flag. Sem
  configuração ele fica inerte; valor inválido falha fechado;
- o runbook define pré-sonda, ativação, observação, limiares de parada, smoke,
  suporte, reconstrução, fallback manual e rollback. R09 continua sem outbox ou
  efeito externo automático; compartilhamento segue manual e local;
- o ciclo sintético em 390×844 confirmou ausência de overflow global, alvo de
  48 px, isolamento da coorte, ativação, sonda verde, agenda preservada e
  rollback. A flag terminou desligada e nenhuma organização real foi ativada;
- ESLint, TypeScript, 75 arquivos e 426 testes Vitest, build de produção Webpack,
  integridade forward-only das migrations, tipos regenerados e auditoria com
  zero vulnerabilidades passaram;
- a revisão física desta versão cobriu em Android e iPhone os dois cenários
  sintéticos, pontos corridos e mata-mata, por toque, leitor de tela,
  compartilhamento real e navegador interno do WhatsApp. O responsável aprovou
  ambos os aparelhos sem registrar falha;
- a origem HTTP privada revelou três lacunas antes do gate: senha do seed abaixo
  do mínimo atual, CSP/origem de desenvolvimento sem o host LAN configurado e
  `crypto.randomUUID` indisponível fora de contexto seguro. A correção mantém
  produção fechada, aceita somente origem HTTP privada configurada e usa UUID v4
  por `getRandomValues` quando necessário;
- o rollback desligou a flag pela RPC auditada. A sonda confirmou dois
  campeonatos, quatro participantes e dois confrontos preservados, ambas as
  páginas em fallback, zero projeções ativas e zero divergências. Os dois
  cenários exclusivamente locais foram então removidos e o seed neutro foi
  reconstruído;
- smoke ativo da tabela e smoke 404 pós-rollback das páginas de tabela e chave
  passaram com headers privados. O gate final aprovou 50 arquivos e 1.317 testes
  pgTAP, mantendo apenas os dois avisos legados do banco;
- o checkpoint avança a CP4 sem ativar organização real. Próxima ação: executar
  CP5 em uma única organização demo com deploy isolado, pré-sonda, ativação,
  smoke, observação, alerta, fallback e rollback; depois sincronizar CP6.
- o commit `764d175` foi redeployado com a coorte demo configurada como variável
  sensível somente em Production. O deployment ficou `Ready` em 1m23s, o smoke
  inicial passou em 18s e a pré-sonda permaneceu desligada e sem divergências;
- após confirmação explícita, a RPC auditada ativou somente a coorte demo. Um
  campeonato sintético de pontos corridos publicou dois participantes, um
  confronto e uma página. A sonda exigiu projeção completa 1/1, sem fallback ou
  divergência, e o smoke público `31740181134` passou em 15s;
- a telemetria observada expôs apenas formato, contagens, fallback, duração e
  categoria de erro. Duas leituras ficaram abaixo de 310ms, com
  `fallback=false` e `error=none`; as mudanças de flag registraram somente os
  booleanos `true` e `false`;
- uma partida sintética foi vinculada e concluída pela jornada existente. A
  sonda confirmou um vínculo e reconstrução sem divergência. A transição após
  publicar o formato exibiu uma única página 404 transitória no detalhe
  administrativo, recuperada no primeiro reload e sem repetição; corrigir essa
  experiência é a ação de endurecimento anterior a CP6;
- o rollback desligou a flag e preservou um campeonato, dois participantes, um
  confronto e o vínculo no fallback. A sonda confirmou projeção 0/1 e zero
  divergências; o smoke `31740889363` exigiu 404 na mesma página pública e
  passou em 12s. Agenda, partida e súmula permaneceram utilizáveis e os atalhos
  de campeonato desapareceram;
- CP5 termina com `championships` desligada. A variável de coorte permanece
  server-only em Production e o smoke contínuo conserva o identificador público
  sintético apenas no Environment `production`, com expectativa desligada.
- a causa do 404 transitório foi isolada no timeout fail-closed da leitura da
  flag durante o re-render concorrente da Server Action. O gate específico de
  campeonatos agora exige duas leituras negativas consecutivas; uma segunda
  leitura positiva recupera a rota e registra somente
  `championship_feature_lookup.recovered`, sem identificador;
- a regressão cobre resposta positiva imediata, negativa transitória recuperada
  e duas negativas preservando o estado desligado. Passaram 2 arquivos/17
  testes focados, TypeScript, lint, 76 arquivos/429 testes Vitest, build de
  produção Webpack e auditoria sem vulnerabilidades. Production permanece com
  a flag desligada, projeção 0/1, fallback 1/1 e zero divergências até a
  promoção do artefato corretivo.
- o PR #199 publicou a correção isolada sobre `dev`. Qualidade, banco, CodeQL,
  dependências, Terraform e Vercel Preview passaram; banco concluiu em 2m54s e
  qualidade em 1m23s. Smoke e Supabase Preview foram ignorados pelas condições
  dos workflows. Após confirmação, o PR foi integrado por squash no commit
  `4cea6bb`. Promoção a `main`, deployment e nova ativação controlada permanecem
  checkpoints separados; a flag segue desligada.
- o PR #200 promove o mesmo artefato para `main`. A ancestralidade divergente do
  squash anterior foi reconciliada em `f368757` sem mudança de conteúdo; o PR
  ficou `MERGEABLE/CLEAN`, com oito checks aprovados e dois condicionais
  ignorados. Após confirmação, o PR foi integrado por squash em `f24a0f9`; o
  deployment Vercel, CI, CodeQL, banco e Terraform passaram. O smoke automático
  `31743568341` exigiu `championships=false` e validou evento e campeonato
  públicos em cerca de 13s. A pré-sonda agregada ainda deve ser executada no
  contexto protegido que possui a variável sensível da coorte; nenhuma ativação
  ocorreu.
- com Production declarada como ambiente de homologação, o controle autenticado
  e auditado reativou `championships` somente em `demo-campo`. Página pública do
  time, cartão evolutivo, equipes internas e lembretes já estavam ativos. A rota
  administrativa exibiu o campeonato publicado sem 404 e a projeção pública
  mostrou dois participantes, um confronto, classificação, canonical próprio e
  `noindex, nofollow, nocache`. Os kill switches globais de produção e consumo
  externo permaneceram desligados, nenhuma outra organização foi alterada e a
  sonda agregada pós-ativação ficou pendente por indisponibilidade do executor
  protegido; o rollback auditado continua visível no controle operacional.
- após revisão da homologação, o hero de `/c` foi alinhado ao padrão de `/t`:
  capa ou gradiente, escudo, selo `Página oficial`, nome e link do time, além de
  marca e status mantidos na mesma linha no celular. O branding é carregado
  server-side somente para campeonato publicado de um time já público; caminhos
  privados não chegam ao HTML, a mídia usa rota same-origin com assinatura
  mantida somente no servidor e qualquer falha preserva a projeção esportiva
  com fallback. Passaram 2 arquivos/12 testes
  focados, TypeScript, ESLint e build Webpack. A revisão com dados reais ficou
  para o Preview porque o executor local não alcançou o Supabase remoto.
- o PR #202 integrou o branding de `/c` em `dev` no commit `ed6cd09`, mas o PR
  #201 já havia atualizado o smoke em `main` no commit `122e843`; a divergência
  deixou o PR #203 conflitante. A sincronização de `main` em `dev` preserva os
  dois conjuntos de mudanças, mantém o smoke ativo por padrão com rollback
  explícito e remove marcadores de conflito literais que haviam entrado nestes
  documentos pelo PR #202. Passaram 3 arquivos/15 testes focados, ESLint,
  TypeScript, 76 arquivos/432 testes Vitest e build Webpack; o Turbopack foi
  bloqueado somente pela porta interna proibida do executor.
- o PR #204 sincronizou `main` em `dev` com oito checks aplicáveis verdes. O PR
  #203 reabriu `MERGEABLE`, repetiu os oito checks e atualizou `main` no merge
  commit `0b4117f`; `dev` avançou ao mesmo commit, preservando ancestralidade. O
  smoke pós-deploy `31910553453` detectou `token=` da mídia assinada no HTML e
  falhou fechado. O hotfix substitui essas URLs por um proxy same-origin que
  revalida publicação, aceita apenas JPEG/PNG/WebP, aplica headers privados e
  mantém assinatura e caminho somente no servidor. Passaram 4 arquivos/26
  testes focados, 77 arquivos/436 testes completos, TypeScript, ESLint e build
  Webpack; o HTML não contém token nem storage path.
- o PR #205 integrou o proxy em `dev` no merge commit `405bc94`, e o PR #206 o
  promoveu para `main` no merge commit `5a14bdb`. Cada PR passou oito checks
  aplicáveis. CI, CodeQL, banco e Terraform pós-push também passaram; o smoke
  ativo `31911184612` validou evento e campeonato públicos em produção sem
  token ou identificador interno. O conflito está encerrado e CP6 volta a
  depender somente da sonda agregada no executor operacional protegido.
