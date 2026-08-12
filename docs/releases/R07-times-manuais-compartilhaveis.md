---
id: R07
type: vertical
status: ready
outcome: "Permitir que a diretoria mantenha equipes internas com escudos padronizados, receba uma divisão automática ajustável por toque, publique a escalação e compartilhe uma imagem segura pelo WhatsApp."
depends_on:
  - R02
  - R04
baseline:
  - BASE-IDENTITY
  - BASE-TENANCY
  - BASE-ATTENDANCE
  - BASE-WRITES
  - BASE-PUBLIC
verified_at: "d750647"
decisions:
  - DEC-EVENT-MATCH
  - DEC-PUBLIC-PRIVACY
  - DEC-STABLE-EVENT-LINK
  - DEC-BALANCE-OBJECTIVE
  - DEC-INTERNAL-SQUAD-IDENTITY
  - DEC-EVENT-SURFACE-FOCUS
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

# R07 — Equipes internas e divisão compartilhável

## Resultado demonstrável

No celular, staff parte de duas a doze equipes internas pré-cadastradas e recebe
automaticamente uma sugestão equilibrada somente com atletas de RSVP **SIM**.
Um toque move a pessoa entre os times; seleção explícita continua como fallback
acessível. Para owner/admin, a jornada mostra uma única ação: salvar a divisão
já publica ou atualiza a revisão. O mesmo link do evento mostra a versão
publicada e oferece uma imagem DeuTime para WhatsApp.

A página aberta permanece focada no jogo: compartilhar usa uma ação única e
lembretes automáticos ficam recolhidos em Editar, fora do fluxo de chamada.
O compartilhamento preserva contexto antes da URL e a escalação explicitamente
publicada mostra somente o primeiro nome, sem foto, contato ou detalhes.
A página e a imagem organizam esses nomes em um campo visual atrativo, sem
inferir posições reais, e usam apenas `Compartilhar` na ação principal.

## Três tempos

### Passado a preservar

- `event_attendance` permanece a única fonte da resposta à chamada;
- `event_squads` e `lineup_spots` já modelam equipes e posições planejadas do
  evento, mas ainda não possuem jornada, RPC transacional ou publicação;
- `match_sides.squad_id` já aceita relacionar uma equipe interna a cada lado de
  uma partida, enquanto `match_participations` continua sendo presença real;
- a flag tipada `team_division` existe e permanece desligada por padrão;
- `/e/{public_id}` é a URL canônica e a imagem atual do convite usa
  `/e/{public_id}/convite.png`;
- escalação e identidade são privadas por padrão. Nome esportivo público exige
  consentimento válido `public_sports_activity` conforme
  `DEC-PUBLIC-PRIVACY`.

### Presente a resolver

- o piloto físico mostrou que a seleção individual por `select` é lenta e
  confusa; ela cumpre o fallback acessível, mas não o caminho primário por toque;
- nomes e cores precisam ser repetidos em cada evento e não há sugestão inicial,
  fazendo o usuário executar manualmente uma decisão mecânica;
- o primeiro redesenho ainda exibiu configuração, salvar padrão, salvar rascunho
  e publicar ao mesmo tempo; isso expôs o modelo técnico e tornou a jornada pior;
- o segundo redesenho separou salvar e publicar em etapas, mas o piloto mostrou
  que a diretoria entende ambas como uma única confirmação da escalação;
- link público e controles de lembrete ainda ocupam espaço demais na página
  aberta, embora notificações sejam automáticas e configuração seja eventual;
- “modelo de time” não representa a entidade real: a galera reconhece equipes
  internas persistentes, com escudo e histórico esportivo acumulável;

- as tabelas legadas permitem escrita direta ampla e não impõem, em uma única
  transação, RSVP SIM, vínculo ativo, isolamento e quantidade de equipes;
- não existe exclusão explícita, revisão publicada, auditoria de publicação ou
  distinção segura entre rascunho e versão compartilhada;
- o consentimento versionado `public_sports_activity` decidido na R04 ainda
  não foi implementado e a diretoria não pode concedê-lo pelo atleta;
- a tela do evento mostra somente a lista de confirmados e não oferece divisão
  manual acessível;
- a página pública e o Open Graph não possuem projeção de escalação nem imagem
  compartilhável com consentimento por pessoa;
- não há operação, telemetria, fallback e rollback próprios da capacidade.

### Futuro compatível

- a sugestão automática usa o mesmo rascunho e nunca substitui edição manual ou
  exclusões; publicação automática acontece somente no salvar de owner/admin;
- camisas permanentes e campeonatos poderão referenciar equipes publicadas sem
  transformar equipe do evento em presença real;
- novas imagens por fase poderão reutilizar a revisão publicada e a projeção
  pública mínima;
- avaliações técnicas subjetivas, histórico de afinidade, campeonato e envio
  automático da escalação ficam fora desta release.

## Escopo

### Incluído

- cadastrar de duas a doze equipes internas por organização, com nome, cor,
  ordem, estado ativo e escudo SVG escolhido de catálogo fechado;
- vincular a equipe planejada do evento à identidade interna e guardar snapshot
  de nome, cor e escudo, sem reescrever eventos já salvos;
- sugerir automaticamente uma divisão reproduzível: somente elegíveis,
  preferência de goleiro distribuída primeiro, diferença de quantidade máxima
  de uma pessoa e ordem estável derivada do evento;
- criar, renomear, colorir, ordenar e remover de duas a doze equipes no evento;
- distribuir somente atletas ativos do mesmo time com RSVP `yes`, mantendo
  lista explícita de confirmados ainda não distribuídos e de quem ficará fora;
- cartões por time e controles por toque para colocar ou mover atleta, além de
  alternativa acessível por seleção; drag and drop nunca é necessário;
- ocultar configuração de equipes da tela do evento e, para owner/admin, usar
  uma única ação que salva a divisão e publica ou atualiza a revisão;
- reduzir compartilhamento a uma ação nativa com fallback de cópia e mover
  configuração/acionamento de lembretes para uma área recolhida em Editar;
- enviar contexto e URL como um único texto compartilhável e limitar a
  projeção da escalação publicada ao primeiro nome no HTML e na imagem;
- apresentar cada time em um campo visual responsivo, distribuindo nomes por
  ordem da escalação sem afirmar formação ou posição esportiva real;
- salvar rascunho idempotente por RPC transacional e auditar agregados sem
  nomes, telefones ou conteúdo integral;
- relacionar opcionalmente equipes aos lados de cada partida do evento, sem
  criar ou alterar `match_participations`;
- revisão publicada imutável e versionada, separada do rascunho; somente
  owner/admin publica ou retira publicação;
- projeções privadas para staff/atleta autorizado e projeção anônima mínima
  somente quando página pública, publicação e consentimento permitirem;
- consentimento `public_sports_activity` específico, versionado, opcional e
  revogável pelo titular verificado, sem reduzir acesso quando recusado;
- imagem determinística com identidade DeuTime, título, data, cores, nomes
  esportivos consentidos e fallback de escudo, sem contato ou capability;
- botão mobile para baixar/compartilhar imagem e copiar o link canônico;
- lista de confirmados como fallback quando a flag estiver desligada, a
  escalação não estiver publicada ou a imagem falhar;
- telemetria agregada, piloto demo, rollback por flag e smoke anônimo.

### Fora

- dividir atletas com `pending`, `no`, `maybe` ou `waitlist`;
- converter escalação planejada em RSVP ou participação real;
- nota técnica, ranking, capitão automático ou afinidade histórica;
- publicar telefone, e-mail, foto, bio, posição, capability ou localização
  privada na página, imagem, metadata, logs ou analytics;
- imagem editável livremente, upload de arte arbitrária ou template externo;
- estatística persistida em contador paralelo; a futura visão por equipe interna
  será derivada somente de partidas encerradas e seus fatos esportivos;
- disparo automático da escalação pelo WhatsApp;
- editar fatos de partida finalizada a partir da escalação.

## Contratos e decisões

- `events` continua dono de chamada, escalação e URL; `event_squads` continua
  sendo a identidade estável das equipes planejadas;
- `team_squad_presets` evolui de modelo descartável para identidade persistente
  da equipe interna; o nome técnico legado fica por compatibilidade;
- `event_squads` referencia opcionalmente a equipe interna e preserva snapshot
  de nome, cor e escudo. Desativar ou renomear não reescreve evento histórico;
- `match_sides.squad_id` permite derivar estatísticas futuras pela identidade
  interna, sempre a partir de partidas encerradas e sem contador paralelo;
- a sugestão é determinística por `event_id`, espalha goleiros e equilibra
  quantidade. Ela não persiste nada até `save_event_lineup_draft` validar o
  estado completo;
- uma migration forward-only acrescentará o mínimo necessário para exclusões,
  revisão publicada e idempotência. Migration aplicada nunca será editada;
- o rascunho é mutável enquanto o evento não estiver encerrado. O salvar de
  owner/admin cria uma revisão imutável; edições locais não alteram a revisão
  ativa até a nova confirmação no botão único;
- a revisão guarda relações com atletas e equipes, não uma cópia pública
  irrestrita de nomes. A projeção da escalação expõe somente o primeiro nome;
  identidade ampliada e fatos individuais recalculam consentimento e vínculo a
  cada leitura;
- manager pode operar somente o rascunho privado do próprio time; salvar e
  publicar em uma intenção, bem como retirar a publicação, exige owner/admin.
  A identidade e o `team_id` derivam da sessão;
- Actions validam formato e delegam. Criação, movimentação, exclusão, vínculo
  com partida e publicação ficam em RPCs estreitas com lock do evento;
- grants diretos de escrita em `event_squads` e `lineup_spots` serão contraídos
  somente depois que App N usar as RPCs; App N e banco N/N+1 toleram ambas as
  ordens de deploy;
- publicação anônima exige `public_event_page` e revisão ativa. Ela mostra
  somente times e primeiros nomes; capability R02 não amplia essa projeção;
- a imagem usa `ImageResponse`, dados da projeção pública e cache privado ou
  versionado. O HTML e a metadata nunca carregam capability;
- a página aberta não carrega configuração de lembretes; Editar reúne o estado
  automático e o fallback manual sem alterar filas, horários ou autorização;
- banco e aplicação reduzem o nome ao primeiro token antes de renderizar a
  página e a imagem públicas; telefone, foto, sobrenome e IDs continuam
  ausentes da projeção;
- página e imagem usam a mesma distribuição visual determinística; o botão
  primário cabe no mobile e se chama apenas `Compartilhar`;
- o vínculo opcional com partida atualiza `match_sides.squad_id`; presença real
  permanece exclusivamente em `match_participations`.

## Entry points

- código administrativo: `app/app/[teamSlug]/events/[eventId]/page.tsx`;
- código público: `app/e/[publicId]/page.tsx` e
  `app/e/[publicId]/convite.png/route.tsx`;
- dados públicos: `lib/data/public-event.ts` e `lib/data/public-matches.ts`;
- consentimento do titular: `app/me/perfil/page.tsx` e
  `app/me/perfil/editar/page.tsx`;
- contrato existente: `supabase/migrations/202607130001_initial_schema.sql` e
  `supabase/migrations/202608070007_fix_r04_enum_and_backfill.sql`;
- testes-base: `supabase/tests/001_rls_and_public_api.test.sql`,
  `supabase/tests/031_r04_match_expansion.test.sql` e
  `app/e/[publicId]/page.test.tsx`;
- documentação: `docs/architecture.md`, `docs/product-context.md`,
  `docs/decisions/DEC-EVENT-MATCH.md` e
  `docs/decisions/DEC-PUBLIC-PRIVACY.md`.

## Pacotes de trabalho

| Pacote | Critérios | Entry points principais | Validação |
|---|---|---|---|
| `DP-R07-01` — promoção e contrato | `AC-R07-01` a `10` | pacote, decisões e baseline | `CP0` |
| `WP-R07-01` — expansão inerte | `AC-R07-01`, `02`, `03`, `05`, `06`, `07`, `10` | migration nova, consentimento, RPCs, pgTAP, tipos | `VAL-DB`, concorrência e N/N−1 |
| `WP-R07-02` — divisão manual mobile | `AC-R07-01` a `06`, `09` | página do evento, Actions, validação | `VAL-APP` + `VAL-DB`, acessibilidade |
| `WP-R07-03` — publicação e imagem | `AC-R07-03`, `07`, `08`, `09` | página pública, projeção e imagem | `VAL-PUBLIC` + Android/iPhone |
| `WP-R07-04` — piloto e conclusão | `AC-R07-08` a `10` | telemetria, runbook, rollout e evidências | `VAL-APP`, `VAL-DB`, smoke e rollback |
| `WP-R07-05` — experiência completa | `AC-R07-01`, `04`, `05`, `10`, `11`, `12` | presets, sugestão automática, cartões por toque e novo piloto | `VAL-APP` + `VAL-DB` + Android/iPhone |
| `WP-R07-06` — equipes internas intuitivas | `AC-R07-04`, `10`, `13`, `14`, `15` | identidade persistente, escudos SVG e superfície focada no jogo | `VAL-APP` + Android/iPhone |

## Critérios de aceite

- [x] `AC-R07-01` — Staff cria e ordena de 2 a 12 equipes válidas, com nomes únicos no evento e cores opcionais válidas.
- [x] `AC-R07-02` — Somente vínculo ativo do mesmo time com RSVP SIM pode ser distribuído; indisponíveis e excluídos nunca entram por cliente adulterado ou concorrência.
- [x] `AC-R07-03` — Manager edita o rascunho; somente owner/admin publica ou retira publicação, sempre pela sessão e com auditoria agregada.
- [ ] `AC-R07-04` — No celular, colocar, mover, retirar e recolocar atleta funciona por toque e por alternativa acessível sem depender de arrastar.
- [x] `AC-R07-05` — Salvar, repetir, concorrer ou reenviar a mesma solicitação produz um único estado completo, sem atleta duplicado ou cross-tenant.
- [x] `AC-R07-06` — Equipe pode ser ligada a um lado de partida sem alterar RSVP, presença real, lances ou estatísticas.
- [x] `AC-R07-07` — Publicação cria revisão explícita; edição de rascunho não muda a revisão ativa e revogação de consentimento remove identidade da projeção seguinte.
- [x] `AC-R07-08` — Imagem compartilhável respeita branding, revisão, consentimento e fallback de escudo, sem PII, capability ou segredo em HTML, URL, metadata e logs.
- [x] `AC-R07-09` — Flag desligada, revisão ausente ou falha de imagem preserva lista de confirmados, link canônico e jornada privada utilizável.
- [ ] `AC-R07-10` — RLS, grants mínimos, N/N−1, telemetria redigida, piloto Android/iPhone, smoke e rollback por flag possuem evidência.
- [x] `AC-R07-11` — Owner/admin salva modelos reutilizáveis do próprio time; outro time não lê nem altera, e eventos históricos não mudam quando o modelo muda.
- [x] `AC-R07-12` — Evento novo nasce com sugestão reproduzível, espalha preferências de goleiro e mantém diferença máxima de uma pessoa, sem nota oculta e sem persistir antes de salvar.
- [x] `AC-R07-13` — Owner/admin mantém de 2 a 12 equipes internas com nome, cor e escudo padronizado; evento referencia a identidade e guarda snapshot, e desativação não altera fatos anteriores.
- [x] `AC-R07-14` — A tela do evento não edita nem salva modelos: usa equipes pré-cadastradas e, para owner/admin, salvar já publica ou atualiza a revisão em uma única ação.
- [x] `AC-R07-15` — A página aberta mostra uma única ação de compartilhar e não exibe controles de lembrete; lembretes automáticos e fallback manual ficam recolhidos em Editar.
- [x] `AC-R07-16` — Compartilhar preserva contexto antes da URL; página e imagem públicas exibem somente o primeiro nome dos escalados, sem foto, telefone, sobrenome, ID ou demais detalhes.
- [x] `AC-R07-17` — Cada time publicado aparece em um campo visual responsivo no HTML e na imagem, sem sugerir posição real; a ação principal `Compartilhar` não estoura no mobile.

## Riscos e controles

| Risco | Controle | Evidência |
|---|---|---|
| escalar quem não confirmou | seleção e lock dentro da RPC | pgTAP negativo e resposta concorrente |
| misturar RSVP, escalação e presença | tabelas e comandos separados | testes de não alteração e integração R04 |
| projeção pública expor além do primeiro nome | redução no banco e na aplicação, sem contato, foto, sobrenome ou ID | pgTAP, teste público e censo de payload |
| rascunho alterar arte já compartilhada | revisão publicada imutável | teste de edição após publicação |
| atleta duplicado ou cross-tenant | unicidade, FKs compostas, RLS e RPC | pgTAP concorrente e dois times |
| interface impossível no celular | controles por toque e alternativa ao drag | Android, iPhone e teclado/leitor |
| algoritmo parecer arbitrário | regra curta, reproduzível e explicada na UI | teste puro com mesmos dados e eventos diferentes |
| edição da equipe interna reescrever histórico | vínculo estável com a identidade e snapshot visual no evento, sem atualização em cascata | pgTAP de alteração posterior |
| identidade interna virar contador divergente | vínculo estável e estatística futura derivada de partidas encerradas | pgTAP do vínculo e consulta derivável |
| excesso de ações confundir a diretoria | gestão fora do evento e salvar/publicar em uma única intenção | teste de interface e piloto físico |
| automação ocupar a superfície do jogo | configuração de lembretes recolhida em Editar; página aberta apenas consome estado esportivo | teste de interface mobile |
| imagem vazar capability ou PII | rota derivada do `public_id` e projeção mínima | testes de metadata, cache e logs |
| custo ou abuso de renderização | limites, revisão versionada e cache controlado | teste de rate/limite e observação piloto |
| deploy quebrar app antigo | expansão inerte antes da contração | matriz App/DB N/N−1 |
| indisponibilidade da arte bloquear operação | lista e link como fallback | ensaio físico de falha e flag desligada |

## Validação

```bash
npm run migrations:check -- origin/main HEAD
npm run db:reset
npm run db:lint
npm run db:test
npm run db:types
npm run verify
npm run security:audit
APP_URL=https://deutime.app npm run smoke:production
```

Além dos gates, validar concorrência, idempotência, cross-tenant, revogação de
consentimento, rascunho versus revisão ativa, vínculo com partida, metadata,
cache, imagem sem PII e jornada física em Android, iPhone e navegador interno
do WhatsApp.

## Rollout, fallback e rollback

- `team_division` permanece tipada, desligada por padrão e conferida na página,
  Actions, RPCs, projeção pública e imagem;
- expansão de banco nasce inerte e sem revisão publicada;
- piloto começa em um único time demo e evento futuro com pessoas consentidas;
- telemetria registra somente contagens de equipes, distribuídos, excluídos,
  revisões, renderizações e falhas;
- fallback é a lista privada de confirmados mais copiar o link canônico;
- não há efeito externo que exija novos kill switches; compartilhamento é ação
  explícita no aparelho;
- smoke de produção permanece anônimo e somente leitura;
- rollback desliga `team_division`, remove a projeção pública e preserva
  rascunho, revisão, auditoria, RSVP e partidas;
- App N ignora estruturas novas; App N+1 omite a jornada quando banco ou flag
  não estiverem disponíveis. Contração de grants ocorre somente depois do
  piloto comprovado.

## Evidências e checkpoint

### `DP-R07-01` — CP0 concluído

- R07 foi promovida após a conclusão de R03R, conforme a ordem do roadmap;
- schema, feature flag, URL canônica, privacidade e relação opcional com
  partidas já existem como baseline, mas nenhuma publicação está ativa;
- resultado, passado/presente/futuro, escopo, papéis, contratos, entrypoints,
  quatro pacotes, dez critérios, riscos, validação, rollout, fallback e rollback
  foram fechados sobre `d750647`;
- `DEC-EVENT-MATCH`, `DEC-PUBLIC-PRIVACY` e `DEC-STABLE-EVENT-LINK` resolvem as
  decisões bloqueadoras; não há ADR aberta impedindo a expansão inerte;
- nenhuma migration, flag, dado ou superfície de produção foi alterada;
- próxima ação: `WP-R07-01`, adicionar contrato forward-only de consentimento,
  rascunho, exclusão, revisão publicada e comandos transacionais, mantendo a
  flag desligada.

### `WP-R07-01` — CP1 concluído

- a migration forward-only `202608110002_r07_lineup_contract.sql` adiciona
  consentimento explícito `public_sports_activity`, exclusões, comandos
  idempotentes e revisões-snapshot sem alterar migrations aplicadas;
- `save_event_lineup_draft` aceita de 2 a 12 equipes e substitui o rascunho em
  uma transação, validando atleta ativo do mesmo time com RSVP `confirmed`,
  nomes/ordem/cores, exclusões disjuntas e posições do esporte;
- manager pode salvar; owner/admin publica ou retira; comandos repetidos
  retornam replay e request ID reutilizado em outro evento/comando falha;
- cada publicação cria uma revisão nova e preserva o snapshot anterior; editar
  o rascunho não altera a revisão compartilhada, e consentimento pode ser
  revogado somente pelo próprio atleta;
- `link_event_lineup_squad_to_match_side` relaciona um time ao lado compatível
  da partida sem escrever em RSVP ou `match_participations`;
- tabelas novas nasceram com RLS, grants mínimos e auditoria agregada sem nome
  de atleta; `team_division` segue sem linha habilitada e nenhuma superfície de
  produção foi ativada;
- `038_r07_lineup_contract.test.sql`: 31 cenários positivos, negativos,
  idempotentes, de papéis e cross-tenant; suíte completa: 38 arquivos e 943
  testes pgTAP verdes;
- gates verdes: `db:reset`, `db:lint` (somente dois avisos legados), `db:test`,
  `db:types`, ESLint, TypeScript, 48 arquivos/283 testes Vitest, build de
  produção com Webpack e `npm audit` sem vulnerabilidades;
- o build revelou um export adicional incompatível na rota `convite.png`; o
  componente visual foi separado da Route Handler, preservando renderização e
  os quatro testes existentes;
- próxima ação: `WP-R07-02`, implementar a divisão manual mobile sobre as RPCs,
  mantendo fallback, flag desligada e compatibilidade com App N.

### `WP-R07-02` — CP2 concluído

- a página privada do evento ganhou um editor mobile-first logo após o resumo,
  antes da lista extensa de presenças, sem alterar a jornada existente quando
  `team_division` estiver desligada ou o contrato novo estiver indisponível;
- staff cria, renomeia, colore e ordena de 2 a 12 equipes; cada atleta com RSVP
  SIM possui um seletor grande e acessível para equipe, exclusão ou estado sem
  equipe, sem depender de arrastar;
- Actions finas validam payloads limitados, identidade e flag no servidor e
  delegam gravação e vínculo com partida às RPCs transacionais do CP1;
- o vínculo opcional entre equipe salva e lado de partida não altera RSVP,
  presença real, lances ou estatísticas, e só aparece após existir rascunho;
- validação física local em viewport 390×844 confirmou editor de 358 px sem
  overflow, distribuição de dois atletas, exclusão de um, salvamento e
  persistência após recarga; em outro time com flag desligada, somente a lista
  anterior de confirmados permaneceu visível;
- o ensaio detectou IDs UUID legados com nibble de versão não canônico nos
  dados demo; o parser aceita esse formato apenas para IDs vindos do banco e
  mantém UUID estrito para request IDs recebidos do cliente;
- gates verdes: 3 arquivos/10 testes focados, ESLint, TypeScript, suíte Vitest
  completa com 51 arquivos/293 testes, `db:reset`, `db:lint` (somente dois
  avisos legados), 38 arquivos/943 testes pgTAP, tipos de banco, build de
  produção com Webpack e auditoria npm sem vulnerabilidades;
- o build Turbopack continua limitado pelo bind de processo interno do runner;
  o build equivalente com Webpack concluiu incluindo TypeScript e geração das
  páginas;
- `team_division` permanece desligada em produção. Próxima ação: `WP-R07-03`,
  publicar revisão consentida e gerar a imagem compartilhável com fallback.

### `WP-R07-03` — CP3 concluído

- owner/admin publica nova revisão ou retira a publicação na própria área de
  divisão; manager continua limitado ao rascunho e todas as escritas delegam às
  RPCs idempotentes do CP1;
- a migration forward-only `202608110003_r07_public_lineup_projection.sql`
  adiciona somente a RPC anônima estreita `get_public_event_lineup(public_id)`;
  ela exige `public_event_page`, `team_division` e revisão ativa;
- a projeção recalcula vínculo ativo e consentimento
  `public_sports_activity` em toda leitura e omite IDs, capability, RSVP,
  telefone, foto, bio e demais PII; payload inesperado falha fechado no app;
- o próprio atleta autoriza ou revoga seu nome esportivo por time em
  `/me/perfil/editar`; recusar não reduz acesso nem altera confirmação, e staff
  não pode decidir pelo titular;
- a URL canônica mostra os times e somente os nomes autorizados. A imagem
  1200×630 usa branding, cores e revisão, expõe fallback quando não há nomes e
  desliga cache compartilhado para honrar revogação na leitura seguinte;
- compartilhar imagem usa Web Share com fallback para compartilhar o link,
  baixar a PNG ou copiar a URL canônica, sem recurso de terceiro;
- validação física local em 390×844 confirmou publicação da revisão 1 com dois
  times/dois atletas, apenas “Abner” consentido, imagem 1200×630, retirada com
  fallback e revogação pelo titular; erros observados vieram somente da extensão
  de navegador, não da aplicação;
- `039_r07_public_lineup_projection.test.sql`: 17 casos de flags, grants,
  revisão, consentimento, omissão de PII, revogação e retirada; suíte completa:
  39 arquivos/960 testes pgTAP verdes;
- gates verdes: 7 arquivos/37 testes focados, 53 arquivos/305 testes Vitest,
  ESLint, TypeScript, `db:reset`, `db:lint` (dois avisos legados), `db:types`,
  build de produção com Webpack e auditoria npm sem vulnerabilidades;
- Turbopack mantém a limitação conhecida de bind de processo do runner; o build
  equivalente com Webpack compilou, tipou e gerou todas as páginas;
- `team_division` segue desligada em produção. Próxima ação: `WP-R07-04`,
  pilotar em coorte demo, observar, provar smoke/rollback e concluir R07.

### `WP-R07-04` — CP4 validado localmente

- a migration forward-only `202608110004_r07_lineup_pilot_health.sql` adiciona
  uma sonda agregada restrita a `service_role`, sem nome, evento público,
  telefone, capability ou segredo;
- a sonda expõe somente gates, volumes de rascunho/publicação/consentimento e
  marcos de auditoria da coorte, rejeitando contrato incoerente no script
  `pilot:lineup:health`;
- a imagem registra `event_lineup_image.rendered` com revisão e contagens ou
  `event_lineup_image.failed` com motivo fixo; testes provam que ID público,
  nome e conteúdo da exceção não chegam aos logs;
- o runbook documenta seleção da coorte, ativação pela RPC auditada, observação
  e rollback imediato sem reversão de migration;
- ensaio local em `Society United`: estado inicial desligado; dois gates
  ligados; `team_division` desligada preservando `public_event_page`; estado
  inicial restaurado. A sonda refletiu cada transição imediatamente;
- gates verdes: 54 arquivos/310 testes Vitest, 40 arquivos/979 testes pgTAP,
  `db:reset`, tipos, lint, TypeScript, build Webpack e auditoria npm sem
  vulnerabilidades; lint do banco mantém somente os dois avisos legados;
- próximo passo: promover a expansão inerte, executar smoke em produção,
  ativar uma única coorte demo e colher evidência física Android/iPhone antes
  de marcar `AC-R07-10` e concluir a release.

### `WP-R07-04` — CP5 piloto ativo

- PR `#158`, merge `3ab53a8`; checks de quality, banco, dependency review,
  CodeQL, Terraform e Vercel verdes;
- workflow `Deploy database` `31489279371` aplicou e conferiu a migration em
  produção; workflow `Smoke` `31489276737` e smoke manual pós-ativação verdes;
- somente a coorte demo `demo-campo` recebeu `team_division`; a sonda antes da
  ativação mostrou `false/true`, 14 eventos futuros e nenhum rascunho ou revisão;
- após ativação, a sonda mostrou os dois gates ativos e o editor apareceu no
  evento demo sem criar ou publicar estado automaticamente;
- rollback produtivo desligou `team_division`: editor ausente, link público e
  chamada presentes. A reativação restaurou o editor e manteve rascunhos e
  revisões em zero;
- piloto permanece ligado somente nessa coorte. Próxima evidência: publicar uma
  divisão demo pela interface e validar URL/imagem em Android e iPhone.

### `WP-R07-05` — CP4 implementação local concluída

- a migration forward-only `202608110005_r07_reusable_squad_presets.sql`
  adiciona times padrão isolados por time, ledger idempotente e RPC transacional
  exclusiva de owner/admin; mudanças futuras não reescrevem eventos históricos;
- evento ainda sem rascunho copia nome, cor e ordem dos times padrão para IDs
  próprios do evento e recebe sugestão determinística: goleiros primeiro,
  diferença máxima de uma pessoa e nenhuma nota subjetiva ou escrita automática;
- o caminho primário mobile passou a ser cartões por toque: tocar move ao próximo
  time, retirar/recolocar tem ação própria e o `select` permanece recolhido como
  alternativa acessível;
- ensaio responsivo em `390×844` com `Society United`: sugestão inicial `14×14`,
  mover `14×14 → 13×15`, retirar/recolocar, salvar times padrão, salvar rascunho
  e recarregar preservando a divisão;
- gates verdes: 3 arquivos/15 testes focados, 55 arquivos/316 testes Vitest,
  41 arquivos/998 testes pgTAP, `db:reset`, tipos, ESLint, TypeScript, build de
  produção com Webpack e auditoria npm sem vulnerabilidades;
- `db:lint` mantém somente os dois avisos legados em `create_event_as_staff` e
  `record_match_event`; Turbopack mantém a limitação conhecida de bind local e
  o build equivalente com Webpack passou integralmente;
- próximo passo: promover expansão e consumidor juntos, executar smoke e repetir
  o fluxo por toque em Android/iPhone antes de concluir `AC-R07-04` e `AC-R07-10`.

### `WP-R07-05` — CP5 produção pronta para validação física

- PR `#160`, merge `1562bc0`; quality, banco, Dependency Review, CodeQL,
  Terraform e Vercel verdes;
- workflow `Deploy database` `31518690923` aplicou e conferiu a migration em
  produção; workflow `Smoke` `31518742849` e smoke manual somente leitura em
  `https://deutime.app` verdes;
- `main` e `dev` sincronizadas no merge. Próxima evidência: executar a nova
  jornada por toque na coorte demo em Android/iPhone antes de concluir a R07.

### `WP-R07-06` — CP4 equipes internas e UX progressiva validadas localmente

- a expansão forward-only `202608110006_r07_internal_squad_identity.sql`
  transforma o cadastro legado em identidade persistente, adiciona catálogo
  fechado de escudos, vínculo por organização e snapshot visual no evento;
- Configurações concentra nome, cor e escudo das equipes internas. A tela do
  evento apenas sugere a divisão, move atletas por toque e não expõe mais
  configuração ou ação de salvar modelo;
- no mobile `390×844`, a sugestão abriu em `14×14`; tocar em um atleta trocou
  seu lado e a única ação ficou fixa acima da navegação. Após salvar, ela foi
  substituída por publicar; uma nova alteração restaurou somente salvar;
- gates verdes: 57 arquivos/318 testes Vitest, 42 arquivos/1.014 testes pgTAP,
  `db:reset`, geração de tipos, integridade de migrations, ESLint, TypeScript,
  build de produção com Webpack e auditoria npm sem vulnerabilidades;
- Turbopack mantém a limitação conhecida de bind local; o build equivalente
  com Webpack passou. Próximo passo: promover pela rotina `dev → PR → main` e
  repetir o fluxo em Android/iPhone para concluir `AC-R07-04` e `AC-R07-10`.

### `WP-R07-06` — CP5 produção pronta para validação física

- PR `#162`, merge `aff99ce`; qualidade, banco, Dependency Review, CodeQL,
  Terraform e Vercel verdes;
- workflow `Deploy database` `31542818301` aplicou e conferiu a expansão antes
  do consumidor; deployment Vercel `8y3nfqLj8W6ipw6hXFjYcGGYaVVn` concluído;
- workflow `Smoke` `31542863602` validou as jornadas públicas somente leitura;
  `main` e `dev` foram sincronizadas no merge;
- próxima evidência: repetir equipes automáticas, troca por toque, salvar e
  publicar em Android e iPhone para concluir `AC-R07-04` e `AC-R07-10`.

### `WP-R07-06` — CP4 confirmação única validada localmente

- `Salvar escalação` passou a salvar o rascunho e publicar ou atualizar a
  revisão para owner/admin; manager continua salvando somente rascunho privado;
- rascunhos legados ainda não publicados mantêm um fallback explícito e a
  retirada de publicação continua disponível para recuperação operacional;
- ensaio mobile `390×844`: o primeiro salvar criou a revisão 1; após mover um
  atleta, o mesmo botão criou a revisão 2, sem ação separada de publicação;
- gates verdes: 2 arquivos/12 testes focados, 57 arquivos/320 testes Vitest,
  ESLint, TypeScript, build de produção com Webpack e auditoria sem
  vulnerabilidades. Próximo passo: promover e repetir em Android/iPhone.

### `WP-R07-06` — CP5 confirmação única em produção

- PR `#164`, merge `50c3737`; todos os checks obrigatórios verdes;
- deployment Vercel `CLvPDEfFJRxag5iNvhejnutP8we8` concluído e workflow
  `Smoke` `31544126639` verde;
- não houve migration: o consumidor reutiliza as RPCs transacionais já
  implantadas e preserva autorização de publicação no banco;
- próxima evidência: editar e salvar uma vez em Android e iPhone, confirmando
  atualização automática da revisão para concluir o piloto físico.

### `WP-R07-06` — CP4 superfície do evento simplificada

- a página aberta deixou de consultar e renderizar configuração, estado e
  disparo manual de lembretes; esses controles permanecem autorizados para
  owner/admin e aparecem recolhidos em `Editar evento`;
- o endereço público deixou de ocupar espaço visual e virou `Compartilhar
  evento`, usando o compartilhamento nativo do aparelho e cópia como fallback;
- ensaio em viewport `390x844` confirmou a página aberta sem controles de
  notificação e com a ação compacta antes do placar e da divisão;
- lint, TypeScript, 58 arquivos/321 testes Vitest, build de produção com
  Webpack e auditoria sem vulnerabilidades passaram. O build Turbopack local
  parou somente pela restrição conhecida do sandbox ao abrir porta;
- próxima evidência: promover pela rotina `dev → PR → main` e validar o
  compartilhamento nativo e o bloco recolhido de lembretes em aparelho físico.

### `WP-R07-06` — CP5 superfície simplificada em produção

- PR `#166`, merge `be018d1`; CI, Database, CodeQL, Terraform, Dependency
  Review e Vercel verdes;
- deployment Vercel `2HhLjvRAiZYeBDqDf476jopCHY2P` concluído e workflow
  `Smoke` `31545606257` verde;
- `main` e `dev` sincronizadas no merge. Próxima evidência: validar em aparelho
  físico o compartilhamento nativo e o bloco recolhido em `Editar evento`.

### `WP-R07-06` — CP4 compartilhamento e primeiros nomes validados localmente

- o compartilhamento passou a enviar contexto e URL no mesmo campo de texto,
  preservando a ordem observável no macOS; o fallback copia a mensagem inteira;
- a expansão forward-only `202608110007_r07_public_lineup_first_names.sql`
  projeta somente o primeiro token do nome dos escalados em revisão ativa e
  continua omitindo sobrenome, foto, telefone, IDs e resposta à chamada;
- banco e aplicação reduzem o nome independentemente, tolerando deploy em
  qualquer ordem. Retirar publicação ou desligar as flags mantém o fallback;
- ensaio anônimo `390x844` mostrou André, Felipe, Gui e Henrique nos dois times
  e a imagem pública repetiu somente esses primeiros nomes, sem telefone/foto;
- gates verdes: 5 arquivos/29 testes focados, 58 arquivos/322 testes Vitest,
  42 arquivos/1.015 testes pgTAP, migration íntegra, tipos sem diff, ESLint,
  TypeScript, build Webpack e auditoria com zero vulnerabilidades;
- próxima evidência: promover banco e consumidor pela rotina `dev → PR → main`,
  executar smoke anônimo e repetir o compartilhamento no macOS/WhatsApp.

### `WP-R07-06` — CP5 primeiros nomes em produção

- PR `#168`, merge `568cc99`; CI, Database, CodeQL, Terraform, Dependency
  Review, Deploy database, Vercel, WhatsApp worker e Smoke verdes;
- deployment Vercel `BnNvGH6qyKYnjbJ4X9szyREsAoyQ`, Deploy database
  `31547518350` e Smoke `31547871444` concluídos;
- ensaio anônimo no evento real `Automação WhatsApp` mostrou 14 atletas nos
  dois times somente pelo primeiro nome; sobrenome, telefone e foto ausentes;
- `main` e `dev` sincronizadas no merge. Próxima evidência: repetir no macOS o
  compartilhamento para WhatsApp e confirmar contexto antes da URL.

### `WP-R07-06` — CP4 formação visual pública validada localmente

- os cartões dos times viraram campos responsivos com marcações esportivas,
  cores próprias e distribuição meramente ilustrativa da ordem publicada;
- a mesma regra pura de formação alimenta o HTML e a imagem compartilhável,
  sem criar ou expor posições reais; continuam visíveis somente os primeiros
  nomes;
- ensaio anônimo em `390x844` confirmou documento e campos limitados a `390px`,
  jogadores legíveis, ausência de rolagem horizontal e ação principal
  `Compartilhar` ocupando a largura disponível sem estouro;
- a rota `convite.png` renderizou `1200x630` com dois campos e 14 jogadores;
  o teste real encontrou e corrigiu uma incompatibilidade de borda do Satori;
- gates verdes: 4 arquivos/21 testes focados, 59 arquivos/324 testes Vitest,
  ESLint, TypeScript, build de produção com Webpack e auditoria com zero
  vulnerabilidades. O build Turbopack local parou somente pela restrição
  conhecida do sandbox ao abrir porta;
- próxima ação: promover pela rotina `dev → PR → main` e repetir a conferência
  anônima no evento real após o deploy.

### `WP-R07-06` — CP5 formação visual pública em produção

- PR `#170`, merge `9cd8235`; CI, Database, CodeQL, Terraform, Dependency
  Review, Vercel e Smoke verdes;
- ensaio no evento real `Automação WhatsApp`, em `390x844`, confirmou dois
  campos de `290px`, documento limitado a `390px`, ausência de rolagem
  horizontal e botão `Compartilhar` de `316px` sem estouro;
- a imagem pública `1200x630` renderizou os dois campos, 14 jogadores e somente
  os primeiros nomes; cores, escudo e marcações esportivas permaneceram
  legíveis;
- `main` e `dev` foram sincronizadas no merge. `AC-R07-17` está concluído.

### `WP-R07-06` — CP4 jornada completa por toque validada localmente

- colocar, mover, retirar e recolocar agora usam transições puras e
  determinísticas, com cinco cenários unitários incluindo ausência de equipes;
- o cartão mobile tornou `Retirar` visível, sem remover o nome acessível, e a
  seção manual passou a explicar que é uma alternativa aos atalhos;
- ensaio autenticado em `390x844` percorreu mover Alex, retirar, recolocar no
  time menos populoso e escolher `Azul Campo` pelo seletor nativo;
- documento limitado a `390px`, sem rolagem horizontal; botões de retirada e
  seletores mediram `48px` de altura;
- gates verdes: 2 arquivos/9 testes focados, 60 arquivos/329 testes Vitest,
  ESLint, TypeScript, build de produção com Webpack e auditoria com zero
  vulnerabilidades. O build Turbopack local parou somente pela restrição
  conhecida do sandbox ao abrir porta;
- próxima evidência: promover e repetir as quatro transições em Android e
  iPhone antes de concluir `AC-R07-04`.

### `WP-R07-06` — CP5 jornada por toque disponível em produção

- PR `#172`, merge `945dd84`; CI, Database, CodeQL, Terraform, Vercel e Smoke
  verdes;
- workflow `Smoke` `31599756961` confirmou a produção somente leitura, e o
  gate `Database` `31599695184` reconstruiu, testou RLS e conferiu os tipos;
- `main` e `dev` foram sincronizadas no merge. Falta somente repetir mover,
  retirar, recolocar e a seleção manual em Android e iPhone para concluir
  `AC-R07-04`.

### `WP-R07-06` — CP4 regressão de largura na alternativa manual corrigida localmente

- ensaio autenticado na produção repetiu mover, retirar, recolocar e seleção
  manual sem salvar, em viewports equivalentes a iPhone (`390x844`) e Android
  (`360x800`); as quatro transições funcionaram e os alvos mediram `48px`;
- em `390x844`, documento e conteúdo permaneceram limitados a `390px`. Em
  `360x800`, abrir a alternativa manual elevou a largura rolável a `363px`;
- a causa era o `fieldset` preservando a largura mínima intrínseca dos selects
  quando o `details` ficava aberto. `min-w-0` passou a limitar o grupo ao
  contêiner mobile, com as transições e o fallback nativo preservados;
- validação local verde: 60 arquivos/329 testes Vitest, ESLint, TypeScript,
  build de produção com Webpack, integridade de migrations e auditoria com zero
  vulnerabilidades. O build Turbopack parou somente pela restrição conhecida do
  sandbox ao abrir porta;
- o ensaio foi responsivo em navegador desktop, não substitui a evidência em
  aparelhos físicos. Próxima ação: promover a correção e repetir as quatro
  transições em Android e iPhone reais, incluindo navegador interno do
  WhatsApp, antes de concluir `AC-R07-04`.
