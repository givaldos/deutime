---
id: R08M
type: vertical
status: completed
outcome: "Compartilhar a mesma URL do evento com identidade e cartão coerentes da chamada ao resultado, e comprovar o ciclo completo do MVP em um time piloto."
depends_on: [R02, R03, R03R, R04, R05, R06, R07]
baseline:
  - BASE-TENANCY
  - BASE-ATTENDANCE
  - BASE-MATCH-REPORT
  - BASE-PUBLIC
  - BASE-WRITES
  - BASE-DELIVERY
verified_at: "009a09f"
decisions:
  - DEC-EVENT-PUBLIC-MINIMUM
  - DEC-PUBLIC-PRIVACY
  - DEC-STABLE-EVENT-LINK
  - DEC-EVENT-SHARE-PHASE
invariants:
  - INV-MOBILE-WHATSAPP-FIRST
  - INV-RLS-MULTI-TIME
  - INV-DEPLOY-COMPATIBLE
  - INV-CANONICAL-EVENT-URL
  - INV-PRIVATE-BY-DEFAULT
  - INV-MANUAL-FALLBACK
---

# R08M — Fechamento do MVP compartilhável

## Resultado demonstrável

Uma pessoa compartilha sempre `/e/{public_id}` e o preview mostra o escudo e o
contexto público correto da chamada, escalação, partida, votação ou resultado.
O time piloto percorre o ciclo completo em Android, iPhone e navegador interno
do WhatsApp, mantendo caminhos manuais quando cada automação ou o cartão
evolutivo estiver desligado.

## Três tempos

### Passado a preservar

- R02 estabeleceu a URL pública aleatória e estável, `noindex`, `no-referrer` e
  a separação entre página anônima e capability pessoal;
- R04 publica somente partidas autorizadas e fatos esportivos por lado;
- R05 mantém voto individual anônimo e disponibiliza resultado agregado somente
  depois do fechamento;
- R07 já mostra o escudo do time na página e em `convite.png`, com fallback da
  marca, e limita a escalação publicada a primeiros nomes;
- metadata atual usa o contexto esportivo mínimo e a revisão publicada, sem
  consultar sessão nem acesso pessoal.

### Presente a resolver

- metadata e imagem ainda não escolhem placar, votação e resultado por uma
  regra única;
- a leitura pública de partidas não oferece um estado mínimo consolidado para
  preview e o resultado do Craque da Galera continua restrito à jornada
  autenticada;
- o roadmap ainda precisa de um gate integrado que prove o MVP inteiro com
  automações, falhas e fallbacks reais.

### Futuro compatível

- campeonatos poderão reutilizar a projeção por fase sem criar outra URL para o
  evento;
- novos tipos de cartão deverão entrar pela mesma projeção anônima e pela matriz
  de privacidade;
- indexação pública, perfis de atleta, campeonatos, marketplace e migração para
  a API direta da Meta ficam fora desta release.

## Escopo

### Incluído

- projeção pública mínima e determinística da fase compartilhável;
- flag `event_share_card`, desligada por padrão;
- escudo específico do time com fallback seguro na página, metadata e imagem;
- Open Graph e cartão de imagem para chamada, escalação, partida pública,
  votação aberta e resultado fechado;
- versão pública para invalidação sem colocar ID interno, capability ou PII na
  URL;
- preview real no WhatsApp e navegador interno em Android/iPhone, com
  conferência adicional em Instagram, Telegram e iMessage;
- piloto integrado do ciclo do MVP, falhas relevantes, suporte e rollback.

### Fora

- tornar a página indexável ou incluí-la em sitemap;
- publicar endereço, lista de presença, resposta, identidade sem consentimento,
  voto individual ou comentário;
- alterar a URL canônica ou remover `convite.png`;
- automatizar E2E de todos os dispositivos e crawlers;
- iniciar R09 ou qualquer frente pós-MVP.

## Contratos e decisões

- [`DEC-EVENT-SHARE-PHASE`](../decisions/DEC-EVENT-SHARE-PHASE.md) define a
  precedência e o conteúdo de cada fase;
- [`DEC-EVENT-PUBLIC-MINIMUM`](../decisions/DEC-EVENT-PUBLIC-MINIMUM.md) mantém
  a rota anônima mínima e estável;
- [`DEC-PUBLIC-PRIVACY`](../decisions/DEC-PUBLIC-PRIVACY.md) governa placar,
  primeiros nomes, consentimento e dados proibidos;
- `public_event_share_state` é uma projeção conceitual, não uma nova fonte de
  verdade; evento, revisão, súmula e votos continuam autoritativos nos seus
  domínios;
- a expansão deve retornar somente dados já públicos, sem reutilizar a RPC
  autenticada de apuração nem conceder leitura das tabelas-base;
- metadata, HTML e imagem usam o mesmo resolvedor e nunca variam por cookie,
  capability ou papel da sessão;
- a flag nova é conferida no servidor; desligada ou em N−1, preserva o cartão
  atual e a lista pública utilizável.

## Entry points

- `app/app/[teamSlug]/settings/page.tsx`: mostra o controle operacional somente
  para a coorte cujo UUID está em `EVENT_SHARE_PILOT_TEAM_ID`;
- `app/app/[teamSlug]/settings/event-share-pilot-actions.ts`: autentica, deriva
  o time pelo slug, confere a coorte no servidor e delega ativação/rollback à
  RPC `set_team_feature_flag`;
- `lib/features/public-event/pilot-config.ts`: valida a configuração server-only
  e mantém a superfície inerte quando a coorte não está configurada.

- código:
  - `app/e/[publicId]/page.tsx`;
  - `app/e/[publicId]/convite.png/route.tsx`;
  - `lib/data/public-event-share.ts`;
  - `scripts/event-share-pilot-health.mjs`;
  - `scripts/smoke.mjs`;
- migrations:
  - `supabase/migrations/202608120001_r08m_event_share_feature.sql`;
  - `supabase/migrations/202608120002_r08m_public_event_share_state.sql`;
  - `supabase/migrations/202608120003_r08m_event_share_pilot_health.sql`;
- testes:
  - `app/e/[publicId]/page.test.tsx`;
  - `app/e/[publicId]/convite.png/route.test.tsx`;
  - `lib/data/public-event-share.test.ts`;
  - `supabase/tests/043_r08m_public_event_share_state.test.sql`;
  - `supabase/tests/044_r08m_event_share_pilot_health.test.sql`;
- documentação:
  - `docs/decisions/DEC-EVENT-SHARE-PHASE.md`;
  - `docs/releases/evidence/R08M.md`;
  - `docs/runbook.md`;
  - `docs/work/current.md`.

## Pacotes de trabalho

| Pacote | Critérios | Entry points principais | Validação |
|---|---|---|---|
| `WP-R08M-01` — projeção inerte | `AC-R08M-01` a `08` | migration nova, tipos e adapter server-only | `VAL-DB` + `VAL-PUBLIC`, N/N−1 |
| `WP-R08M-02` — cartão evolutivo | `AC-R08M-01` a `10` | página, metadata, `convite.png` e testes focados | `VAL-APP` + `VAL-PUBLIC` |
| `WP-R08M-03` — previews e piloto | `AC-R08M-09` a `12` | coorte, telemetria e runbook | Android/iPhone + WhatsApp + smoke/rollback |
| `WP-R08M-04` — gate integrado | `AC-R08M-11` a `14` | roteiro operacional e evidências | ciclo MVP, falhas e fallbacks |

## Critérios de aceite

- [x] `AC-R08M-01` — Página, metadata e imagem usam o escudo do time somente pelo caminho público autorizado e aplicam fallback da marca sem assinar objeto arbitrário.
- [x] `AC-R08M-02` — A mesma URL canônica evolui por estado determinístico entre cancelamento, partida ao vivo, votação, resultado, placar final, escalação e chamada.
- [x] `AC-R08M-03` — Chamada expõe somente time, modalidade, título, data, horário e estado público, sem local privado ou identidade vinculada à capability.
- [x] `AC-R08M-04` — Escalação aparece somente após publicação explícita, com primeiros nomes e revisão, sem resposta à chamada, telefone, foto, sobrenome ou ID.
- [x] `AC-R08M-05` — Placar e súmula respeitam `public_mode`, usam nomes dos lados e fatos autorizados e não inferem presença nem autoria sem consentimento.
- [x] `AC-R08M-06` — Votação aberta é anunciada sem candidato ou eleitor; resultado identifica apenas vencedor único consentido e mostra votos, percentual e total válidos, usando fallback agregado em empate ou ausência de consentimento.
- [x] `AC-R08M-07` — Cookie, sessão, query personalizada, capability encaminhada e papel autenticado não alteram metadata, imagem ou canonical e não chegam a logs, analytics ou `Referer`.
- [x] `AC-R08M-08` — Flag desligada, schema N−1, projeção ausente ou falha preservam a página e o cartão atual sem erro público nem leitura cross-tenant.
- [x] `AC-R08M-09` — Mudança de publicação, fase, placar, janela ou consentimento invalida o preview por versão opaca sem incluir ID interno ou PII; `noindex`, `nofollow` e `no-referrer` permanecem.
- [x] `AC-R08M-10` — Metadata, HTML e imagem concordam sobre a fase e possuem testes de privacidade, cache, fallback, acessibilidade e largura mobile.
- [x] `AC-R08M-11` — Previews reais foram conferidos no WhatsApp e navegador interno em Android/iPhone e também em Instagram, Telegram e iMessage, registrando limitações de cache de cada crawler.
- [x] `AC-R08M-12` — Piloto prova ativação isolada, telemetria redigida, alerta, suporte, smoke anônimo e rollback por flag sem quebrar o link existente.
- [x] `AC-R08M-13` — Um time piloto conclui criação, chamada, confirmação, lembretes, escalação, partida, súmula, voto, resultado e conversa nos três contextos móveis definidos.
- [x] `AC-R08M-14` — Cancelamento, remarcação, opt-out, link encaminhado, retry, falha do provedor, tempo real indisponível e automações desligadas mantêm caminhos manuais e recuperação operacional comprovados.

## Riscos e controles

| Risco | Controle | Evidência |
|---|---|---|
| Capability ou PII entra no preview | projeção anônima única, snapshots negativos e `no-referrer` | pgTAP, testes de metadata/imagem e inspeção de resposta |
| Fase errada ou divergente | resolvedor único e precedência do ADR | matriz de estados no app e banco |
| Resultado identifica atleta sem consentimento | projeção recalculada, vencedor único e fallback agregado | casos sem consentimento, revogação e empate |
| Cache externo mantém estado antigo | versão pública opaca, TTL e roteiro por crawler | previews reais antes/depois da transição |
| Cliente novo depende de schema novo | fallback em N−1 e expansão publicada primeiro | matriz N/N−1 |
| Rollout quebra compartilhamento existente | flag independente e preservação de `/convite.png` | smoke com flag ligada/desligada |
| Gate integrado produz efeito duplicado | dados piloto, idempotência existente e roteiro com limites | IDs agregados de execução e custos |

## Validação

```bash
npm test -- 'app/e/[publicId]/page.test.tsx' 'app/e/[publicId]/convite.png/route.test.tsx'
npm run typecheck
npm run db:reset
npm run db:lint
npm run db:test
npm run db:types
git diff --exit-code -- lib/database.types.ts
npm run verify
npm run security:audit
```

O pgTAP cobre sucesso, negação, cross-tenant, consentimento, empate, flags e
compatibilidade. O gate físico registra a URL pública sem capability, fase
esperada, plataforma, horário, resultado do preview, cache observado e fallback
usado, sem copiar dados pessoais para a evidência.

## Rollout, fallback e rollback

- flag tipada, desligada por padrão e conferida server-side:
  `event_share_card` por time; `public_event_page` permanece o gate raiz;
- piloto: somente coorte demo após schema e consumidor verdes;
- controle operacional: página autenticada para owner/admin, renderizada apenas
  quando `team.id = EVENT_SHARE_PILOT_TEAM_ID`; a action não aceita `team_id` ou
  chave de flag do cliente e a RPC reaplica autorização e auditoria;
- telemetria: fase, fallback, duração e erro agregados, sem `public_id`, nome,
  capability, endereço ou conteúdo individual;
- fallback: metadata/cartão atual, página pública, cópia da URL e jornadas
  manuais já comprovadas;
- kill switches independentes: flags existentes de WhatsApp, lembretes,
  divisão, votação e comentários, além de `event_share_card`;
- smoke de produção somente leitura: `GET` e `HEAD` anônimos, headers, canonical,
  imagem e ausência de segredo;
- smoke de staging: eventos sintéticos por fase, sem destinatário real e com
  limpeza explícita;
- isolamento de staging: dados demo, chaves próprias, origem e callbacks
  separados;
- rollback ensaiado: desligar `event_share_card`, repetir preview e confirmar o
  cartão anterior sem mudar a URL;
- compatibilidade N/N−1: app novo tolera projeção ausente; app antigo ignora a
  expansão e a flag nova permanece desligada.

## Evidências e checkpoint

### `DP-R08M-01` — CP0 concluído

- R07 foi concluída e o roadmap prioriza identidade compartilhável antes do
  gate integrado e de R09;
- baseline `d00db82` confirmou escudo/fallback, metadata mínima, escalação
  publicada e os dois testes principais da superfície;
- os testes focados de página pública e `convite.png` passaram com 18 casos, e
  `npm run context:brief` reconheceu `R08M` em `CP0/ready`;
- a inspeção local encontrou as lacunas de fase, placar consolidado e resultado
  público, sem exigir mudança na URL canônica;
- `DEC-EVENT-SHARE-PHASE` foi aceita com projeção anônima, precedência, flag,
  fallback e reversão definidos;
- dependências estão concluídas, não há decisão bloqueadora e `R08M` satisfaz a
  Definition of Ready;
- próxima ação: `WP-R08M-01`, criar a expansão forward-only de
  `event_share_card` e da projeção pública mínima, com pgTAP positivo, negativo,
  consentimento, empate e cross-tenant.

### `WP-R08M-01` — CP1 concluído

- a expansão isolou `event_share_card` em uma migration própria e não criou
  linha habilitada para nenhum time;
- `get_public_event_share_state(public_id)` exige `public_event_page` e a nova
  flag, seleciona a fase pública por precedência e não concede `SELECT` novo em
  tabela-base;
- partidas respeitam `event_matches`, `public_mode` e o maior ordinal
  aplicável; placar deriva de gol, gol contra e ajuste, e os fatos omitem
  autoria, notas e identificadores;
- escalação reutiliza a revisão ativa mínima; votação e resultado respeitam o
  kill switch `voting`, empate e ausência/revogação de
  `public_sports_activity` sem escolher ou identificar vencedor indevido;
- o adapter `server-only` valida um DTO estrito, rejeita chave inesperada ou
  fase divergente e transforma RPC/tabela ausente em fallback para schema N−1;
- pgTAP focado: 40/40 casos verdes; suíte completa: 43 arquivos e 1.055 testes
  verdes, incluindo flag desligada, cancelamento, precedência, placar,
  consentimento, revogação, empate e cross-tenant;
- gates verdes: duas reconstruções limpas do banco, lint sem aviso novo, tipos
  gerados apenas com RPC/enum esperados, TypeScript, 61 arquivos/335 testes
  Vitest, build de produção com Webpack e auditoria com zero vulnerabilidades;
- o build Turbopack local não abriu a porta interna no sandbox; o build Webpack
  equivalente passou, e o workflow CI permanece como gate obrigatório do PR;
- `event_share_card` continua desligada em todos os times. Próxima ação:
  `WP-R08M-02`, consumir o DTO em metadata, HTML e `convite.png`, mantendo o
  cartão atual quando a flag ou o schema novo não estiverem disponíveis.

### `WP-R08M-02` — CP2 concluído

- um resolvedor server-only transforma o DTO em rótulo, título, descrição e
  tom únicos para cancelamento, partida ao vivo, votação, resultado, placar,
  escalação, encerramento e chamada;
- metadata, HTML e `convite.png` consomem a mesma projeção e deixam as leituras
  anteriores condicionadas à flag desligada, schema N−1 ou projeção
  indisponível;
- a URL canônica permanece `/e/{public_id}`; a imagem recebe uma versão opaca
  de 12 caracteres derivada apenas de fase, horários, revisão, placar, fatos e
  agregados, sem nome, ID, capability ou outro dado pessoal na query;
- revogação de consentimento altera a versão, remove o vencedor e mantém o
  resultado agregado; empate não escolhe atleta, e votação aberta não expõe
  candidato ou eleitor;
- o HTML móvel mostra placar, fatos públicos e escalação mínima sem consultar
  partidas/escalação legadas quando a projeção nova existe; metadata e imagem
  ignoram sessão, capability e query personalizada;
- a imagem mantém escudo pelo caminho público autorizado, fallback da marca,
  cache público versionado e headers `noindex`, `nofollow`, `noimageindex` e
  `no-referrer`; o fallback antigo de escalação conserva `private, no-store`;
- testes focados: 38 casos verdes nas três fronteiras, incluindo as oito fases,
  fallback N−1, falha redigida, privacidade, consentimento revogado, empate,
  cache, largura móvel e consumo real dos bytes PNG do `ImageResponse`;
- gates verdes: ESLint, TypeScript, 61 arquivos/347 testes Vitest, build de
  produção Next.js 16.3 com Webpack e auditoria com zero vulnerabilidades;
- o build Turbopack local continuou impedido de abrir a porta interna no
  sandbox; o build Webpack equivalente passou, e o workflow CI permanece como
  gate obrigatório do PR;
- o PR `#180` aprovou qualidade, banco, CodeQL, dependências, Terraform e
  preview; o conteúdo foi integrado em `main` pelo merge commit `bbb1f86`;
- `event_share_card` permanece desligada para todos os times. Próxima ação:
  `WP-R08M-03`, preparar coorte demo, telemetria redigida, runbook, previews
  físicos e smoke/rollback antes de qualquer piloto.

### `WP-R08M-03` — CP5 concluído

- a coorte operacional disponível foi confirmada por leitura agregada como
  `demo-campo`, com um owner/admin ativo e 16 eventos agendados; nenhum UUID ou
  operador foi versionado;
- `get_event_share_card_pilot_health(team_id)` é restrita a `service_role` e
  retorna somente flags, contagens por fase numa janela de 30 dias passados a
  90 dias futuros e horários agregados;
- a sonda falha se eventos projetados, fallback e soma das fases divergirem, e
  o script exige explicitamente a flag ligada durante o piloto ou desligada no
  ensaio de rollback;
- a telemetria `public_event_share_state.observed` registra somente fase,
  fallback, duração limitada e categoria de erro; testes negativos confirmam
  ausência de `public_id`, time, nome ou conteúdo da exceção;
- o smoke anônimo agora valida canonical, ausência de segredo, versão opaca
  quando esperada, GET e HEAD do PNG, cache e headers `noindex`, `nofollow`,
  `noimageindex`, `no-referrer` e `nosniff`;
- o runbook fixa ordem de ativação, sinais de interrupção, matriz de previews
  físicos e rollback pela mesma RPC auditada, sem alterar os demais gates;
- ensaio local da sonda com flag desligada confirmou um evento na janela, zero
  projeções e um fallback; pgTAP focado passou 25/25 casos e a suíte completa
  passou 44 arquivos/1.080 assertions;
- gates de aplicação: 62 arquivos/355 testes Vitest, ESLint, TypeScript, build
  Next.js 16.3 com Webpack e auditoria com zero vulnerabilidades;
- o build Turbopack local continuou limitado pela porta interna do sandbox; o
  workflow CI permanece obrigatório;
- o PR `#182` foi integrado em `main` pelo merge commit `498f356`; a migration
  foi aplicada em produção e a sonda com expectativa `false` confirmou 16
  eventos no fallback, zero projetados e `public_event_page` preservada;
- o primeiro smoke operacional encontrou duas signed URLs de logo no HTML
  público; o PR `#183` substituiu a URL temporária pelo PNG incorporado no
  servidor e foi integrado pelo merge commit `15ab54e`, sem expor token;
- o fallback nominal já usava corretamente `private, no-store`; o PR `#184`
  ensinou o smoke a aceitar essa política somente com a flag desligada e a
  continuar exigindo cache público no cartão ativo, integrado pelo merge
  commit `35f9e03`;
- o pós-merge da preparação aprovou CI, Database, CodeQL, Terraform e smoke
  somente leitura em produção com `event_share_card` ainda desligada;
- o PR `#187` adicionou a superfície operacional autenticada e foi integrado em
  `main` pelo merge commit `4e54835`; a interface só aparece para a coorte
  configurada, deriva o time da rota e mantém autorização e auditoria na RPC;
- `EVENT_SHARE_PILOT_TEAM_ID` foi configurada como variável sensível somente em
  Production e o redeploy do merge concluiu antes de qualquer escrita na flag;
- a sonda pré-ativação confirmou `public_event_page=true`, 16 eventos no
  fallback e zero projeções; após a ativação autenticada, confirmou os dois
  gates ligados, 16 projeções e zero fallback;
- o smoke de produção com expectativa ativa passou nas execuções
  `31637255535` e `31637397456`, incluindo canonical, versão opaca, GET/HEAD do
  PNG, cache e headers de privacidade, sem versionar o evento usado;
- o rollback pela mesma superfície devolveu 16 eventos ao fallback e zero
  projeções; a reativação final restaurou 16 projeções, zero fallback e deixou
  a coorte `demo-campo` ativa;
- a observação de produção mostrou fase `lineup`, `fallback=false`, duração
  limitada e erro `none`; a imagem registrou somente fase/fallback, as mudanças
  da flag registraram apenas o booleano e não houve warning, error ou fatal na
  janela observada;
- o responsável confirmou a revisão integral das evidências físicas em iPhone
  e Android, incluindo o navegador interno do WhatsApp; com a matriz móvel e o
  ensaio operacional aceitos, `AC-R08M-11` e `AC-R08M-12` foram concluídos;
- próxima ação: `WP-R08M-04`, executar o gate integrado do ciclo completo e os
  cenários de falha/fallback de `AC-R08M-13` e `AC-R08M-14`.

### `WP-R08M-04` — CP6 concluído

- a matriz duradoura em `docs/releases/evidence/R08M.md` liga cada etapa do
  ciclo às evidências aprovadas de R01–R07 e aos sinais agregados atuais da
  mesma coorte, sem versionar evento, atleta, operador ou destinatário;
- as sondas finais confirmaram RSVP, página pública, divisão e cartão ativos:
  havia 16 eventos projetados, zero fallback, 209 respostas, duas revisões de
  escalação, quatro equipes publicadas e 26 atribuições;
- a leitura agregada do ciclo encontrou 32 cotas de lembrete, nove entregas,
  quatro partidas, três fatos, uma súmula e cinco comentários preservados;
  votação e conversa permanecem nos fallbacks definidos após seus rollbacks;
- duas entregas exigiram uma segunda tentativa, uma falha permanente ficou
  isolada sem revisão pendente e duas cotas manuais provaram recuperação sem
  duplicar a automação;
- cancelamento/remarcação, opt-out, link encaminhado, retry, falha do provedor,
  polling sem tempo real e kill switches foram ligados às provas positivas e
  negativas das releases de origem; nenhum novo envio externo foi necessário;
- os testes focados do gate passaram em 49 casos e o smoke final somente
  leitura `31638690026` aprovou canonical, imagem, cache, privacidade e estado
  evolutivo ativo;
- o gate final passou por ESLint, TypeScript, 65 arquivos/368 testes Vitest,
  build Next.js 16.3 com Webpack, integridade de migrations e auditoria npm com
  zero vulnerabilidades; o Turbopack local permaneceu limitado somente pela
  proibição do sandbox de abrir a porta interna;
- a confirmação humana já registrada cobre a revisão integral em iPhone,
  Android e navegador interno do WhatsApp; estados removidos por rollback ou
  retenção continuam comprovados pela evidência duradoura, não por PII atual;
- os 14 critérios de aceite possuem evidência, `event_share_card` permanece
  ativo somente em `demo-campo`, o rollback segue disponível na área
  autenticada e R08M encerra com checkpoint limpo.
