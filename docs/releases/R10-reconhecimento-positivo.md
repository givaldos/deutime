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
verified_at: "85d805f"
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
- [ ] `AC-R10-08` — A visão privada explica a origem sem pontos, nota, série ou
  comparação e preserva estatísticas e Craque atuais quando flag, schema ou
  projeção estiverem indisponíveis.
- [ ] `AC-R10-09` — `public_recognition_summary_v1` nasce desligado, só pode ser
  concedido ou revogado pelo titular e retira imediatamente a fatia pública sem
  reduzir qualquer acesso privado.
- [x] `AC-R10-10` — O perfil público soma somente categorias consentidas por
  vínculo, sem expor partida, data, voto, colocação, identificador interno ou
  time sem consentimento, mesmo diante de sessão ou capability.
- [x] `AC-R10-11` — RPCs, RLS e grants mínimos derivam pessoa e tenant da sessão
  e cobrem sucesso, negação, concorrência e isolamento cross-tenant em pgTAP.
- [ ] `AC-R10-12` — Visão privada, consentimento e resumo público funcionam por
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
