---
id: R10
type: vertical
status: discovery
outcome: "Permitir que a pessoa atleta acompanhe reconhecimentos positivos derivados de fatos esportivos confiáveis e escolha, por consentimento, quais agregados aparecem no próprio perfil, sem ranking constrangedor."
depends_on: [R04, R05, R07]
baseline:
  - BASE-IDENTITY
  - BASE-MATCH-REPORT
  - BASE-PUBLIC
  - BASE-WRITES
verified_at: "acbbeaf"
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

Resultado proposto para validação: no celular, a pessoa atleta verificada vê
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
  fora desta descoberta.

## Escopo

### Incluído

- inventário de Craque, perfis, consentimentos, participação e estatísticas;
- métricas agregadas sem nomes, IDs, cédulas ou conteúdo pessoal;
- opções para fonte, unidade de pertencimento, consentimento, correção,
  retenção, abuso e fallback do reconhecimento;
- decisão explícita de promover, reduzir ou estacionar R10;
- protótipo descartável mobile, se necessário para validar compreensão.

### Fora

- migration, tabela, RPC, Action ou interface de produção;
- ativação de flag, alteração de voto ou publicação automática;
- pontos negativos, ranking de ausência/atraso/derrota ou comparação pública;
- inferência de habilidade, preço, contratação, prêmio ou punição;
- mensagem automática de WhatsApp ou qualquer novo efeito externo.

## Contratos e decisões

- `DEC-CROWD-STAR` permite reutilizar somente o resultado agregado fechado; a
  cédula individual e o pseudônimo do eleitor permanecem fora de R10;
- `DEC-POSITIVE-POINTS` permite pontos opcionais apenas para ações positivas;
- `DEC-PLAYER-EVALUATION` impede que características virem ranking público;
- `DEC-PUBLIC-PRIVACY` exige finalidade própria, consentimento específico,
  versionado e revogável para ampliar o perfil público;
- `DEC-ANONYMOUS-RETENTION` continua governando voto e recibo, sem retenção
  adicional criada por reconhecimento;
- a descoberta deve produzir `DEC-RECOGNITION-MODEL` ou registrar formalmente
  que a vertical permanece estacionada. Antes dessa decisão, schema,
  autorização e superfície pública não estão prontos para implementação.
- `DEC-RECOGNITION-MODEL` está `proposed`: recomenda cartões factuais derivados
  de gol, assistência e resultado agregado fechado do Craque, sem pontos ou
  ranking. A aceitação permanece condicionada à validação humana da coorte.

## Entry points

- código: `lib/data/craque.ts`, `lib/data/public-player.ts` e
  `app/me/perfil/editar/page.tsx`;
- banco: `craque_votes`, `match_participations`, `player_profiles` e
  `athlete_public_consents`, nas migrations `202608070005`, `202608080002`,
  `202608080004` e `202608110002`;
- testes: `lib/features/craque/validation.test.ts` e
  `app/p/[handle]/page.test.tsx`;
- documentação: `docs/product-context.md`, decisões de privacidade/retenção,
  roadmap e este pacote.

## Pacotes de trabalho

Enquanto `status: discovery`, somente o pacote `DP-R10-01` está autorizado.
Pacotes `WP-*` serão definidos depois de uma decisão aceita e de sinal mínimo de
uso; nenhum código de produção começa nesta fase.

| Pacote | Critérios | Entry points principais | Validação |
|---|---|---|---|
| `DP-R10-01` — contrato de reconhecimento | `AC-R10-01` a `05` | métricas agregadas, decisões e protótipo descartável | revisão de produto, privacidade e ameaça |

## Critérios de aceite

- [x] `AC-R10-01` — Baseline e uso foram inventariados sem expor identidade,
  cédula, vínculo ou identificador interno.
- [x] `AC-R10-02` — A fonte autoritativa e o catálogo fechado de reconhecimento
  estão definidos, incluindo idempotência, correção, reversão e não
  retroatividade.
- [x] `AC-R10-03` — Pertencimento por time e eventual agregação no perfil global
  possuem consentimento, retenção, revogação e isolamento cross-tenant
  explícitos.
- [ ] `AC-R10-04` — Um protótipo mobile demonstra compreensão sem comparação
  constrangedora e registra evidência de demanda com pessoas do piloto.
- [ ] `AC-R10-05` — A decisão final promove R10 a `ready` ou a estaciona com
  motivo, métrica de reabertura e fallback preservado.

## Riscos e controles

| Risco | Controle | Evidência exigida |
|---|---|---|
| ponto vira julgamento ou punição | catálogo exclusivamente positivo e nenhuma métrica de ausência/atraso/derrota | revisão de linguagem e casos negativos |
| voto anônimo é reidentificado | consumir somente resultado agregado fechado | threat model e teste sem acesso à cédula |
| reconhecimento cruza times | pertencer ao `athlete_id + team_id`; agregar somente na leitura consentida | matriz cross-tenant e revogação |
| correção duplica pontuação | derivar de fato autoritativo com chave idempotente e reversão auditada | replay, correção e concorrência |
| perfil público amplia finalidade | consentimento próprio, versionado e revogável | concessão, recusa e retirada imediata |
| produto nasce sem demanda | manter `discovery` até existir sinal do piloto | métricas agregadas e entrevista/protótipo |

## Validação

```bash
npm test -- 'lib/features/craque/validation.test.ts' 'app/p/[handle]/page.test.tsx'
npm run typecheck
```

Uma futura implementação exigirá `VAL-APP`, `VAL-DB` e `VAL-PUBLIC`, incluindo
pgTAP positivo, negativo, concorrente e cross-tenant, consentimento/revogação,
cache público, abuso e experiência Android/iPhone.

## Rollout, fallback e rollback

- flag futura: `recognition`, tipada e desligada por padrão; ainda não criada;
- piloto: uma única organização demo após sinal e decisão aceitos;
- telemetria: categorias e contagens agregadas, nunca pessoa, voto ou motivo;
- fallback: estatísticas básicas e resultado agregado do Craque continuam como
  hoje, sem pontos;
- efeitos externos: nenhum nesta descoberta; compartilhamento futuro começa
  manual e local;
- rollback futuro: desligar `recognition`, preservando fatos esportivos e votos;
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
