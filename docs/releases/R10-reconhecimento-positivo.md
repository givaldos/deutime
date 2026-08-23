---
id: R10
type: vertical
status: ready
outcome: "Permitir que a pessoa atleta acompanhe reconhecimentos positivos derivados de fatos esportivos confiáveis e escolha, por consentimento, quais agregados aparecem no próprio perfil, sem ranking constrangedor."
depends_on: [R04, R05, R07]
baseline:
  - BASE-IDENTITY
  - BASE-MATCH-REPORT
  - BASE-PUBLIC
  - BASE-WRITES
verified_at: "bc0fa00"
decisions:
  - DEC-CROWD-STAR
  - DEC-POSITIVE-POINTS
  - DEC-PLAYER-EVALUATION
  - DEC-PUBLIC-PRIVACY
  - DEC-ANONYMOUS-RETENTION
  - DEC-RECOGNITION-MODEL
invariants:
  - INV-MOBILE-WHATSAPP-FIRST
  - INV-RLS-MULTI-TIME
  - INV-DEPLOY-COMPATIBLE
  - INV-PRIVATE-BY-DEFAULT
  - INV-SINGLE-SOURCE
  - INV-POSITIVE-GAMIFICATION
  - INV-MANUAL-FALLBACK
---

# R10 — Reconhecimento positivo

## Resultado demonstrável

No celular, a pessoa atleta verificada vê
somente os próprios reconhecimentos positivos, entende de qual fato esportivo
cada item veio e escolhe se um agregado pode aparecer no perfil público. A
diretoria não vê cédula individual, não consente pela pessoa e não cria ranking
de ausência, atraso, derrota ou qualquer comportamento constrangedor.

## Três tempos

### Passado a preservar

- R04 mantém participação real, placar e lances como fatos esportivos
  autoritativos e corrigíveis sem contador paralelo;
- R05 mantém o voto do Craque anônimo e imutável, publicando somente resultado
  agregado após a janela e preservando a súmula quando `voting` está desligada;
- R07 mantém identidade por vínculo, perfil reivindicado e consentimento de
  atividade esportiva revogável por time;
- `/p/{handle}` já publica perfil e estatísticas básicas escolhidas pela pessoa.

### Presente a resolver

- não existe contrato para transformar um fato esportivo ou resultado agregado
  em reconhecimento sem duplicar contadores e sem reidentificar voto;
- `player_profiles.is_public` e o consentimento por vínculo possuem finalidades
  distintas; nenhuma delas autoriza implicitamente publicar reconhecimento;
- não há definição aceita para catálogo, pesos, expiração, correção, disputa ou
  reversão de pontos positivos;
- a homologação ainda não possui uso de votação que justifique implementar um
  sistema de pontuação ou comparação entre pessoas.

### Futuro compatível

- o contrato poderá agregar temporadas e campeonatos sem mudar a fonte dos
  fatos nem atravessar times;
- novas categorias exigirão catálogo versionado e evidência de uso, sem scripts
  livres ou pesos retroativos;
- marketplace, prêmio material, ranking global e recomendação automática ficam
  fora desta release.

## Escopo

### Incluído

- catálogo fechado `recognition-v1` com gol, assistência e resultado agregado
  fechado do Craque, sempre derivados de fatos finalizados;
- projeção privada dos próprios reconhecimentos para a sessão global verificada,
  preservando vínculo e origem por time;
- correção, reversão, replay idempotente e início não retroativo por ativação;
- consentimento próprio `public_recognition_summary_v1`, versionado, desligado
  por padrão e revogável pela pessoa em cada vínculo;
- resumo público somente por categoria consentida, sem partida, data, voto,
  colocação ou detalhe privado;
- flag `recognition` desligada por padrão, telemetria agregada, piloto isolado,
  fallback, rollback e compatibilidade N/N−1.

### Fora

- saldo, pontos, nota, série, nível ou ranking público ou privado entre pessoas;
- reconhecimento manual, alteração de voto ou reidentificação de cédula;
- pontos negativos, ranking de ausência/atraso/derrota ou comparação pública;
- inferência de habilidade, preço, contratação, prêmio ou punição;
- retroatividade para partidas anteriores à ativação, mensagem automática de
  WhatsApp ou qualquer novo efeito externo.

## Contratos e decisões

- `DEC-CROWD-STAR` permite reutilizar somente o resultado agregado fechado; a
  cédula individual e o pseudônimo do eleitor permanecem fora de R10;
- `DEC-POSITIVE-POINTS` permite pontos opcionais apenas para ações positivas;
- `DEC-PLAYER-EVALUATION` impede que características virem ranking público;
- `DEC-PUBLIC-PRIVACY` exige finalidade própria, consentimento específico,
  versionado e revogável para ampliar o perfil público;
- `DEC-ANONYMOUS-RETENTION` continua governando voto e recibo, sem retenção
  adicional criada por reconhecimento;
- `DEC-RECOGNITION-MODEL` está `accepted`: adota cartões factuais derivados de
  gol, assistência e resultado agregado fechado do Craque, sem pontos ou
  ranking, após o protótipo atingir compreensão `3/3` e intenção positiva
  `3/3` na coorte;
- cada item pertence a `athlete_id + team_id`; identidade e vínculos são
  derivados da sessão verificada, e nenhuma Action aceita tenant ou pessoa como
  autoridade fornecida pelo cliente;
- a projeção privada e o resumo público permanecem reconstruíveis. Escritas de
  consentimento ficam em RPC transacional, com grants mínimos e RLS.

## Entry points

- código existente: `lib/data/craque.ts`, `lib/data/public-player.ts` e
  `app/me/perfil/editar/page.tsx`;
- expansão planejada: `lib/features/recognition/`,
  `app/me/reconhecimentos/page.tsx`, projeção de resumo em
  `lib/data/public-player.ts` e controle em `app/me/perfil/editar/page.tsx`;
- banco: próxima migration `*_r10_recognition_contract.sql`, adicionando a flag,
  a finalidade de consentimento e RPCs de projeção sem editar migrations
  aplicadas; fontes existentes em `match_events`, `match_participations`,
  `craque_votes` e `athlete_public_consents`;
- testes planejados: `supabase/tests/*_r10_recognition_contract.test.sql`,
  `lib/features/recognition/rules.test.ts`,
  `app/me/reconhecimentos/page.test.tsx` e `app/p/[handle]/page.test.tsx`;
- documentação: `docs/product-context.md`, decisões de privacidade/retenção,
  roadmap e este pacote.

## Pacotes de trabalho

| Pacote | Critérios | Entry points principais | Validação |
|---|---|---|---|
| `DP-R10-01` — contrato de reconhecimento | `AC-R10-01` a `05` | métricas agregadas, decisões e protótipo descartável | revisão de produto, privacidade e ameaça |
| `WP-R10-01` — expansão inerte | `AC-R10-06`, `07`, `10`, `11` | flag, catálogo, consentimento, RPCs e tipos | `VAL-DB`, censo e N/N−1 |
| `WP-R10-02` — visão privada | `AC-R10-06` a `08`, `12` | projeção por sessão e jornada `/me/reconhecimentos` | `VAL-APP` + `VAL-DB` |
| `WP-R10-03` — resumo consentido | `AC-R10-09` a `12` | controle por vínculo, projeção pública e cache | `VAL-PUBLIC` + `VAL-APP` + `VAL-DB` |
| `WP-R10-04` — robustez e piloto | `AC-R10-07` a `13` | correção, telemetria, runbook, fallback e coorte | CP3–CP6 + Android/iPhone |

## Critérios de aceite

- [x] `AC-R10-01` — Baseline e uso foram inventariados sem expor identidade,
  cédula, vínculo ou identificador interno.
- [x] `AC-R10-02` — A fonte autoritativa e o catálogo fechado de reconhecimento
  estão definidos, incluindo idempotência, correção, reversão e não
  retroatividade.
- [x] `AC-R10-03` — Pertencimento por time e eventual agregação no perfil global
  possuem consentimento, retenção, revogação e isolamento cross-tenant
  explícitos.
- [x] `AC-R10-04` — Um protótipo mobile demonstra compreensão sem comparação
  constrangedora e registra evidência de demanda com pessoas do piloto.
- [x] `AC-R10-05` — A decisão final promove R10 a `ready` ou a estaciona com
  motivo, métrica de reabertura e fallback preservado.
- [x] `AC-R10-06` — A pessoa verificada vê somente os próprios cartões e a
  origem por vínculo ativo; staff, outra pessoa e outro tenant falham fechados.
- [x] `AC-R10-07` — O catálogo `recognition-v1` deriva somente gol, assistência
  e Craque agregado de partida finalizada; replay, concorrência, correção e
  reversão não duplicam nem deixam cartão órfão.
- [x] `AC-R10-08` — A visão privada explica a origem sem pontos, nota, série ou
  comparação e preserva estatísticas e Craque atuais quando flag, schema ou
  projeção estiverem indisponíveis.
- [x] `AC-R10-09` — `public_recognition_summary_v1` nasce desligado, só pode ser
  concedido ou revogado pelo titular e retira imediatamente a fatia pública sem
  reduzir qualquer acesso privado.
- [x] `AC-R10-10` — O perfil público soma somente categorias consentidas por
  vínculo, sem expor partida, data, voto, colocação, identificador interno ou
  time sem consentimento, mesmo diante de sessão ou capability.
- [x] `AC-R10-11` — RPCs, RLS e grants mínimos derivam pessoa e tenant da sessão
  e cobrem sucesso, negação, concorrência e isolamento cross-tenant em pgTAP.
- [x] `AC-R10-12` — Visão privada, consentimento e resumo público funcionam por
  toque, teclado e leitor de tela em larguras móveis, Android, iPhone e
  navegador interno do WhatsApp.
- [ ] `AC-R10-13` — Piloto isolado comprova telemetria sem PII, smoke, alerta,
  correção, revogação, fallback e rollback pela flag.

## Riscos e controles

| Risco | Controle | Evidência exigida |
|---|---|---|
| ponto vira julgamento ou punição | catálogo exclusivamente positivo e nenhuma métrica de ausência/atraso/derrota | revisão de linguagem e casos negativos |
| voto anônimo é reidentificado | consumir somente resultado agregado fechado | threat model e teste sem acesso à cédula |
| reconhecimento cruza times | pertencer ao `athlete_id + team_id`; agregar somente na leitura consentida | matriz cross-tenant e revogação |
| correção duplica pontuação | derivar de fato autoritativo com chave idempotente e reversão auditada | replay, correção e concorrência |
| perfil público amplia finalidade | consentimento próprio, versionado e revogável | concessão, recusa e retirada imediata |
| produto nasce sem demanda | implementar somente após o sinal aceito e pilotar uma coorte antes de expandir | métricas agregadas, uso no piloto e fallback |

## Validação

```bash
npm test -- 'lib/features/craque/validation.test.ts' 'app/p/[handle]/page.test.tsx'
npm run typecheck
```

A implementação exige `VAL-APP`, `VAL-DB` e `VAL-PUBLIC`, incluindo
pgTAP positivo, negativo, concorrente e cross-tenant, consentimento/revogação,
cache público, abuso e experiência Android/iPhone.

## Rollout, fallback e rollback

- flag planejada: `recognition`, tipada e desligada por padrão;
- piloto: uma única organização demo depois de CP4;
- telemetria: categorias e contagens agregadas, nunca pessoa, voto ou motivo;
- fallback: estatísticas básicas e resultado agregado do Craque continuam como
  hoje, sem pontos;
- efeitos externos: nenhum; eventual compartilhamento começa manual e local;
- rollback: desligar `recognition`, invalidar o resumo público e preservar fatos
  esportivos e votos;
- compatibilidade N/N−1: expansão inerte antes de qualquer consumidor.

## Evidências e checkpoint

### `DP-R10-01` — descoberta iniciada; CP0 pendente

- em 2026-08-15, a leitura protegida de homologação encontrou 2 perfis públicos,
  2 partidas finalizadas e 3 participações reais, mas zero consentimentos de
  perfil por vínculo, zero consentimentos de atividade esportiva, zero votos e
  zero times com `voting` ativa;
- as contagens foram produzidas sem imprimir nomes, IDs, cédulas ou conteúdo
  pessoal. O inventário confirmou que os componentes técnicos existem, mas não
  há sinal comportamental suficiente para autorizar pontos ou ranking;
- R10 entra em `discovery`, não em implementação. Próxima ação: fechar as opções
  de `DEC-RECOGNITION-MODEL` e validar um protótipo sem produção com pessoas da
  coorte antes de decidir CP0.

### `DP-R10-01` — modelo proposto; revisão da coorte pendente

- as opções de livro de pontos, elogio manual, cartões factuais e estacionamento
  foram comparadas. `DEC-RECOGNITION-MODEL` recomenda cartões derivados da
  súmula finalizada e do resultado agregado do Craque, sem saldo, nota ou
  ranking;
- `recognition-v1` limita o catálogo a gol, assistência e Craque da Galera. A
  projeção conceitual é idempotente por fonte, pertence a
  `athlete_id + team_id`, começa somente após futura ativação e acompanha
  correção ou reversão da fonte;
- o resumo público exigiria consentimento próprio
  `public_recognition_summary_v1`, desligado por padrão, versionado e revogável
  pelo titular. Staff não publica pela pessoa e voto individual nunca entra na
  projeção;
- um protótipo mobile descartável foi criado com visão privada, consentimento e
  prévia pública. A checagem técnica em 390 px e 360 px confirmou ausência de
  overflow/recorte, alvo mínimo de 44 px e alternância funcional dos estados;
- a base permaneceu íntegra: os dois testes focados somaram 6/6 aprovações e o
  TypeScript passou sem erro;
- essa checagem não é evidência da coorte. `AC-R10-04`, `AC-R10-05` e CP0
  continuam pendentes até três pessoas do piloto revisarem sem explicação, com
  contagens agregadas de compreensão e intenção de uso.

### `DP-R10-01` — primeira revisão da coorte completada

- em 2026-08-15, uma pessoa revisou o protótipo e confirmou, sem identidade ou
  conteúdo pessoal registrado, os quatro limites do modelo: visão privada,
  origem em fatos esportivos finalizados, ausência de ranking e publicação do
  resumo somente por consentimento;
- em 2026-08-16, a mesma avaliação foi completada com a intenção que faltava,
  sem registrar identidade: a pessoa usaria a visão e escolheria publicar o
  resumo;
- contagens agregadas: revisões `1/3`; compreensão dos quatro limites `1/1`;
  consentimento testado desligado `1/1`; intenção de uso respondida `1/1` e
  positiva `1/1`, com escolha de publicação `1/1`;
- `AC-R10-04`, `AC-R10-05` e CP0 permanecem pendentes. Próxima coleta:
  compreensão e intenção de mais duas revisões completas, ainda sem explicação
  prévia.

### `DP-R10-01` — segunda revisão da coorte registrada

- em 2026-08-16, uma segunda pessoa respondeu ao protótipo e confirmou os
  quatro limites do modelo, sem identidade ou conteúdo pessoal registrado;
- a pessoa informou que usaria a visão e escolheria publicar o resumo. Nesta
  avaliação, o consentimento foi testado ligado;
- contagens agregadas: revisões `2/3`; compreensão dos quatro limites `2/2`;
  intenção de uso respondida `2/2` e positiva `2/2`, com escolha de publicação
  `2/2`; estados de consentimento testados: desligado em uma revisão e ligado
  em uma revisão;
- o sinal mínimo de intenção já foi atingido, mas a coorte ainda não está
  completa. `AC-R10-04`, `AC-R10-05` e CP0 permanecem pendentes até a terceira
  revisão, ainda sem explicação prévia.

### `DP-R10-01` — terceira revisão registrada; CP0 concluído

- em 2026-08-16, uma terceira pessoa revisou o protótipo sem explicação prévia e
  confirmou os quatro limites: visão privada, fatos esportivos finalizados,
  ausência de ranking e resumo público somente com consentimento;
- a pessoa usaria a visão e escolheria publicar o resumo. O consentimento foi
  testado ligado, sem registrar identidade ou conteúdo pessoal;
- contagens finais agregadas: revisões `3/3`; compreensão dos quatro limites
  `3/3`; intenção respondida e positiva `3/3`; escolha de publicação `3/3`;
  consentimento testado desligado em uma revisão e ligado em duas;
- o limiar de `DEC-RECOGNITION-MODEL` foi superado: todas as três pessoas
  compreenderam o modelo e pelo menos duas demonstraram intenção de uso. A
  decisão foi aceita, `AC-R10-04` e `AC-R10-05` foram concluídos e a R10 foi
  promovida a `ready`;
- resultado, dependências, decisão, escopo, entrypoints, riscos, critérios,
  validação, rollout, fallback e rollback satisfazem a Definition of Ready;
- a revalidação aprovou 2 arquivos/6 testes focados, lint, TypeScript, 77
  arquivos/436 testes e o build de produção com Webpack. O build Turbopack
  encontrou somente a restrição de porta interna do sandbox (`EPERM`);
- próxima ação: `WP-R10-01`, adicionar a expansão inerte da flag `recognition`,
  catálogo, consentimento, RPCs e tipos, sem consumidor nem ativação de time.

### `WP-R10-01` — CP1 concluído

- as migrations forward-only adicionam a flag tipada `recognition`, a finalidade
  `public_recognition_summary_v1` e o catálogo fechado `recognition-v1`; nenhum
  registro de flag, consentimento ou ativação é criado pela expansão;
- o primeiro instante de ativação por time fica em tabela privada sem grant ao
  cliente e não muda em desligamento, reativação ou retry. A projeção ignora
  partidas anteriores a esse marco e falha fechada enquanto a flag está off;
- `get_my_recognitions()` deriva identidade da sessão e projeta somente gol,
  assistência e resultado agregado fechado do Craque para vínculos ativos e
  participações reais em partidas finalizadas, sem ledger ou contador paralelo;
- `get_public_recognition_summary(handle)` devolve apenas versão, categoria e
  contagem quando perfil e consentimento próprio do vínculo autorizam. Partida,
  data, voto, colocação, pessoa, time e identificadores internos ficam ausentes;
- `set_public_recognition_summary_consent` aceita somente o próprio vínculo
  ativo, exige a capability ligada e registra auditoria redigida. Staff, outra
  pessoa e outro tenant falham fechados;
- uma correção forward-only completou a coluna `match_events.updated_at` já
  esperada pelo trigger da R04, sem ampliar os grants de escrita do cliente;
- o pgTAP focado aprovou 61 casos de contrato e 22 casos em duas conexões reais,
  cobrindo sucesso, negação, não retroatividade, correção, reversão, replay,
  rollback, concorrência, grants e isolamento cross-tenant;
- o workflow Database aprovou reset integral, lint, toda a suíte histórica e a
  comparação exata dos tipos gerados. Lint, TypeScript, 78 arquivos/438 testes,
  build Webpack, audit sem vulnerabilidades, CodeQL e Terraform também passaram;
- app antes do banco continua falhando fechado e banco antes do app permanece
  inerte. O checkpoint avançou para CP1 sem interface, consumidor, time ativado
  ou efeito externo. Próxima ação: `WP-R10-02`, entregar a visão privada móvel
  atrás da flag e preservar o perfil e as estatísticas atuais como fallback.

### `WP-R10-02` — CP2 concluído

- `/me/reconhecimentos` é um Server Component autenticado que consome
  `get_my_recognitions()` somente quando ao menos um vínculo ativo possui a
  flag `recognition`; a RPC continua derivando pessoa e tenant da sessão;
- a navegação mobile e desktop inclui a jornada apenas com a flag ligada. O
  quarto alvo móvel preserva 56 px de altura e rótulo visual abreviado,
  mantendo nome acessível completo e `aria-current` na rota selecionada;
- os cartões usam o catálogo único `recognition-v1`, explicam time, evento,
  partida e tipo da origem e não renderizam IDs internos. A linguagem afirma
  explicitamente que não existem pontos, notas, sequência ou ranking;
- estado vazio explica que somente fatos de partidas encerradas entram. Flag
  desligada, vínculo ausente, schema antigo, RPC indisponível ou payload fora
  do catálogo falham fechados para uma tela que mantém acesso a perfil,
  estatísticas e resultado atual do Craque;
- a lista privada não cria escrita, cache público, telemetria pessoal ou efeito
  externo. Nenhuma organização foi ativada e o resumo público continua sem
  consumidor neste pacote;
- 10 testes novos cobrem disponibilidade por vínculo, validação estrita,
  catálogo inválido, flag/schema/RPC indisponíveis, happy path, origem, estado
  vazio e navegação condicional. O gate local aprovou lint, TypeScript, 81
  arquivos/448 testes, build Webpack e audit com zero vulnerabilidades;
- o PR aprovou Database, tipos gerados, CodeQL, dependency review, Terraform e
  Vercel Preview. Android, iPhone, leitor de tela real e navegador interno do
  WhatsApp permanecem para CP4; `AC-R10-12` continua aberto;
- o checkpoint avançou para CP2 sem ativar time. Próxima ação: `WP-R10-03`,
  entregar consentimento por vínculo e resumo no perfil público com revogação
  imediata, preservando a visão privada independentemente da decisão pública.

### `WP-R10-03` — resumo consentido concluído; checkpoint em `idle`

- o editor de perfil oferece uma escolha independente por vínculo somente para
  times com a flag `recognition` ligada. A finalidade permanece desligada por
  padrão e não herda a autorização de escalação pública;
- a Server Action autentica a sessão, valida vínculo, decisão e idempotência e
  delega a escrita à RPC transacional
  `set_public_recognition_summary_consent()`. A RPC continua sendo a autoridade
  para titularidade, vínculo ativo, tenant, flag, ativação e auditoria;
- concessão e revogação invalidam o perfil público do próprio titular. Revogar
  retira somente a fatia pública; a interface explica que a visão privada e o
  acesso ao time permanecem inalterados;
- `/p/{handle}` consome `get_public_recognition_summary()` e aceita estritamente
  uma linha única por categoria de `recognition-v1`, contendo somente versão,
  categoria e contagem positiva. IDs, time, partida, data, voto e colocação não
  entram no modelo renderizado;
- resumo vazio, RPC/schema indisponível, campo adicional, categoria duplicada
  ou payload fora do catálogo falham fechados sem retirar perfil, estatísticas
  ou posições atuais. App nova antes do banco e banco novo antes da app
  permanecem compatíveis;
- 19 testes focados em cinco arquivos cobrem flag por time, validação estrita,
  concessão, negação, revogação, alvo móvel, linguagem, projeção mínima e
  fallback. O gate aprovou lint, TypeScript, 84 arquivos/460 testes, teste de
  contexto, build de produção Webpack e audit com zero vulnerabilidades;
- o PR #238 aprovou Database com reset/RLS/pgTAP/tipos, CodeQL, dependency
  review, Terraform e Vercel Preview. Nenhuma migration, tipo gerado, time,
  consentimento real ou ativação foi alterado;
- `AC-R10-09` está concluído. Android, iPhone, leitor de tela real, navegador
  interno do WhatsApp, telemetria e piloto permanecem em `AC-R10-12/13`; o
  checkpoint volta a `idle` antes do merge;
- próxima ação: `WP-R10-04`, endurecer abuso, observabilidade, fallback e
  rollback, verificar a experiência CP4 e só então avaliar piloto isolado em
  uma organização demo.

### `WP-R10-04` — robustez técnica concluída em CP3; checkpoint em `idle`

- a sonda `get_recognition_pilot_health(team_id)` é exclusiva do
  `service_role` e devolve somente contagens e horários agregados de ativação,
  fontes esportivas, projeção, divergência, consentimento e publicação. O
  contrato não contém pessoa, vínculo, time, partida, evento, voto, motivo ou
  erro bruto;
- a reconstrução compara a projeção ativa com as fontes elegíveis desde o marco
  imutável da primeira ativação. Flag desligada exige projeção e resumo público
  zerados, preserva o marco histórico e oferece comprovação objetiva do
  rollback sem reverter migration;
- as leituras privada e pública registram somente duração, fallback, categoria
  fechada de erro e contagens por tipo. Handle, IDs, nomes e conteúdo esportivo
  não entram na telemetria;
- o smoke somente leitura ganhou uma jornada opcional para perfil sintético. Ele
  confirma os blocos públicos históricos, exige ou proíbe o resumo consentido
  conforme o estado esperado e rejeita identificadores internos no HTML;
- o runbook define pré-condições, ativação posterior a CP4, sonda pós-ativação,
  consentimento/revogação, limites de parada, rollback pela flag e retorno ao
  último deploy saudável. Produção admite somente a sonda agregada e o smoke
  anonimizado; dados reais não são impressos;
- 24 testes focados em quatro arquivos e 28 casos pgTAP cobrem contrato,
  payload inválido, grants mínimos, isolamento cross-tenant, ativação,
  consentimento, revogação e rollback. O reset integral e a suíte completa do
  banco aprovaram 53 arquivos/1.428 testes;
- lint, TypeScript, 85 arquivos/466 testes, teste de contexto, build de produção
  Webpack e audit com zero vulnerabilidades passaram. O build Turbopack encontrou
  somente a restrição de porta interna do sandbox; o compilador estável aprovou
  o mesmo código;
- nenhuma organização, flag ou consentimento real foi ativado. `AC-R10-12/13`
  continuam abertos, o checkpoint volta a `idle` e a próxima ação é CP4 em
  Android, iPhone, leitor de tela e navegador interno do WhatsApp antes de
  qualquer piloto isolado.

### `WP-R10-04` — pré-check automatizado de CP4 concluído; prova física pendente

- em 2026-08-23, a produção foi verificada com sessão autenticada e viewport de
  360 px, sem alterar dados, flag ou consentimento;
- a rota privada com `recognition` desligada apresentou o fallback esperado,
  preservou perfil, estatísticas e Craque e não exibiu o atalho móvel. Não houve
  overflow horizontal e os controles visíveis mediram entre 44 e 56 px;
- o editor manteve o consentimento de reconhecimento oculto. O perfil público
  preservou estatísticas e posições, não publicou o resumo e não mostrou
  identificadores internos no conteúdo visível;
- o pré-check cobre responsividade e estado inerte, mas não comprova toque,
  VoiceOver/TalkBack, teclado físico, revogação nem navegador interno do
  WhatsApp. `AC-R10-12`, CP4 e o piloto continuam abertos até evidência separada
  em Android e iPhone reais.

### `WP-R10-04` — CP4 concluído por aceite responsivo do produto

- em 2026-08-23, o responsável pelo produto determinou que, para esta release,
  funcionamento correto no navegador responsivo é evidência suficiente para o
  aceite móvel. A decisão substitui a exigência física de Android/iPhone neste
  checkpoint, sem alterar os controles técnicos do piloto;
- o aceite combina o pré-check autenticado de produção em 360 px com 12 testes
  de interface em três arquivos: visão privada e fallback, consentimento
  ligado/desligado e resumo público consentido/ausente. TypeScript também
  passou;
- `AC-R10-12` e CP4 foram concluídos. Nenhum time, consentimento ou fato real foi
  alterado; `AC-R10-13` permanece aberto e a próxima ação é um piloto isolado
  com organização e dados exclusivamente sintéticos.

### `WP-R10-04` — bloqueio WhatsApp-first do CP5 corrigido forward-only

- a primeira tentativa autenticada de criar a organização sintética do CP5
  falhou sem escrita. A causa foi uma divergência histórica: a interface aceita
  sessão confirmada por WhatsApp, enquanto `create_team_for_current_user()`
  exigia somente e-mail confirmado;
- a migration `202608230001` aceita e-mail ou telefone confirmado pela função
  canônica privada. A RPC continua derivando identidade da sessão e preserva
  lock transacional, limite por minuto, teto de ownership, validação do slug,
  criação atômica do owner e grants mínimos;
- 6 novos casos pgTAP aprovam telefone confirmado, owner ativo e identidade da
  sessão, além de negar `anon` e conta sem e-mail/telefone confirmado. O reset
  integral e 54 arquivos/1.434 testes do banco passaram; tipos foram regenerados
  sem diff;
- lint, TypeScript, 85 arquivos/466 testes, teste de contexto e build Webpack
  passaram. A próxima ação é promover a correção e repetir a criação pela mesma
  jornada autenticada antes de qualquer ativação de `recognition`.

### `WP-R10-04` — prova imutável de WhatsApp preservada na criação do piloto

- a repetição da jornada em produção após `202608230001` também falhou fechada e
  sem escrita. A conta do piloto conserva o registro imutável
  `player_profiles.phone_verified_at`, criado pelo cadastro guardado após a
  verificação do WhatsApp, mas já não possui o identificador confirmado no Auth;
- a migration forward-only `202608230002` passa a aceitar também esse perfil
  verificado para o mesmo `auth.uid()`. `authenticated` não possui permissão para
  inserir essa prova; identidade da sessão, lock, limites, validações, owner
  atômico e grants mínimos permanecem inalterados;
- o teste focado foi ampliado para 8 casos, incluindo sucesso com perfil
  imutável e owner ativo, enquanto `anon` e conta sem qualquer prova continuam
  negados. O reset integral, tipos sem diff, lint do banco e 54 arquivos/1.436
  testes passaram;
- nenhum time ou flag foi criado/ativado nas tentativas anteriores. A criação
  será repetida somente após a segunda correção chegar à produção, mantendo
  `AC-R10-13` aberto.

### `WP-R10-04` — coorte sintética criada e controle operacional preparado

- `202608230002` foi aplicada e verificada em produção. A mesma jornada
  autenticada criou `R10 Demo Reconhecimentos`, com owner ativo, sem atletas,
  jogos, fatos ou consentimentos reais;
- a pré-sonda externa recusou um UUID da sessão que não pertencia à coorte e não
  alterou estado. Para eliminar a necessidade de manipular identificadores, o
  painel administrativo ganhou um controle exclusivo do slug sintético;
- a Server Action autentica novamente, valida entrada, restringe a coorte antes
  da consulta, relê o time sob RLS e delega somente à RPC
  `set_team_feature_flag`. Uma pré-sonda agregada server-only exige flag e
  projeções desligadas; a pós-sonda confirma ativação ou rollback, revertendo
  imediatamente uma ativação não confirmada;
- a interface explica que os reconhecimentos são privados, factuais e sem
  pontos/ranking, exige confirmação explícita e oferece rollback preservando os
  fatos esportivos. 9 testes focados, lint, TypeScript, 87 arquivos/475 testes,
  teste de contexto e build Webpack passaram;
- a flag `recognition` permanece desligada. O controle será promovido antes da
  ativação e `AC-R10-13` continua aberto.

### `WP-R10-04` — ativação auditada e identidade sintética server-only

- o controle chegou à produção e mostrou `Desligado` com fallback privado. A
  confirmação explícita executou pré-sonda, `set_team_feature_flag`, captura do
  marco não retroativo e pós-sonda; a interface confirmou `Ativo` somente para
  a coorte sintética;
- uma tentativa de preparar o atleta pelas credenciais locais atingiu outro
  projeto, falhou com `22023` antes de qualquer cadastro esportivo e não alterou
  a coorte de produção. A conta Auth sintética órfã desse projeto externo ficou
  fora do rollout e requer limpeza autorizada separadamente;
- o provisionamento passou a rodar no próprio deploy com chave server-only. A
  ação exige owner/admin ativo e confirmação, valida a sonda ativa, cria ou
  recupera somente a identidade fictícia etiquetada, conclui o cadastro pela
  RPC WhatsApp-first, publica o perfil sintético e aprova o vínculo pela RPC de
  revisão. Senha e identificadores não saem do processo;
- a operação é idempotente e faz pós-sonda sem PII. 12 testes focados, lint,
  TypeScript, 88 arquivos/478 testes, teste de contexto e build Webpack passaram;
- `recognition` está ativa, mas ainda sem fatos, consentimentos ou resumo
  público. `AC-R10-13` continua aberto até a projeção, revogação, smoke e
  rollback finais.

### `WP-R10-04` — autenticação sintética corrigida sem SMS real

- a primeira execução do provisionamento no ambiente correto criou a identidade
  fictícia, mas o login por telefone foi recusado antes do cadastro esportivo;
- a mesma conta conserva telefone confirmado e a RPC continua exigindo essa
  prova WhatsApp-first. A autenticação operacional passa a usar também um e-mail
  reservado e confirmado server-side, sem envio externo ou dado de pessoa real;
- nenhum atleta, perfil esportivo ou fato foi criado na tentativa recusada. A
  operação permanece idempotente e será repetida somente após a correção chegar
  à produção.

### `WP-R10-04` — recuperação idempotente da identidade sintética

- a repetição encontrou a identidade já criada, mas a busca limitada à primeira
  página do Auth não a recuperou e encerrou antes do cadastro esportivo;
- a busca passa a paginar o Auth e aceita somente a etiqueta exclusiva do
  piloto. Telefone e e-mail reservados são reaplicados na mesma conta antes da
  autenticação, sem criar duplicatas ou expor identificadores;
- a coorte segue ativa, porém sem atleta, perfil esportivo ou fatos. A operação
  será repetida após a correção chegar à produção.

### `WP-R10-04` — sessão sintética sem dependência do provedor de senha

- a busca paginada recuperou a identidade correta em produção, mas o provedor
  recusou o login por senha antes do cadastro esportivo;
- a operação tenta a senha e usa como fallback um link administrativo de uso
  único, gerado e verificado inteiramente server-side, sem entrega de e-mail ou
  exposição de credencial. A sessão resultante continua sendo a do atleta
  sintético e atravessa as RPCs e RLS reais;
- falhas registram apenas etapa e código. 7 testes focados e a aplicação
  completa com 88 arquivos/480 testes, lint, TypeScript, contexto e build
  Webpack passaram; a coorte permanece sem fatos até a promoção e repetição.

### `WP-R10-04` — aprovação sintética sob a sessão owner

- o link administrativo iniciou a sessão e concluiu cadastro e perfil em
  produção. A leitura seguinte falhou fechada porque a RLS oculta do próprio
  atleta o vínculo ainda pendente;
- a leitura de estado passa para a sessão owner/admin já validada pela ação. O
  atleta continua executando somente cadastro e perfil, e a aprovação continua
  na RPC de revisão autorizada e auditada;
- 5 testes focados e a aplicação completa com 88 arquivos/480 testes, lint e
  TypeScript passaram. Ainda não há fato esportivo na coorte.
