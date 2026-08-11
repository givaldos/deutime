---
id: R07
type: vertical
status: ready
outcome: "Permitir que a diretoria divida manualmente os confirmados em equipes, publique a escalação no link do evento e compartilhe uma imagem segura pelo WhatsApp."
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

# R07 — Times manuais compartilháveis

## Resultado demonstrável

No celular, staff cria de duas a doze equipes, distribui somente atletas com
RSVP **SIM**, marca quem ficará fora e salva o rascunho sem arrastar. Owner ou
admin revisa e publica uma versão da escalação. O mesmo link do evento passa a
mostrar a versão publicada para a audiência autorizada e oferece uma imagem
com a marca DeuTime, pronta para compartilhar no WhatsApp.

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

- R08 poderá sugerir uma divisão reproduzível sobre o mesmo rascunho, sem
  substituir edição manual, exclusões ou publicação explícita;
- camisas permanentes e campeonatos poderão referenciar equipes publicadas sem
  transformar equipe do evento em presença real;
- novas imagens por fase poderão reutilizar a revisão publicada e a projeção
  pública mínima;
- algoritmo automático, balanceamento, histórico de afinidade, campeonato e
  envio automático da escalação ficam fora desta release.

## Escopo

### Incluído

- criar, renomear, colorir, ordenar e remover de duas a doze equipes no evento;
- distribuir somente atletas ativos do mesmo time com RSVP `yes`, mantendo
  lista explícita de confirmados ainda não distribuídos e de quem ficará fora;
- controles por toque para mover atleta, além de alternativa acessível por
  seleção de equipe; drag and drop pode existir como atalho, nunca como único
  caminho;
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
- sugestão automática, nota técnica, ranking, capitão automático ou rodízio;
- publicar telefone, e-mail, foto, bio, posição, capability ou localização
  privada na página, imagem, metadata, logs ou analytics;
- imagem editável livremente, upload de arte arbitrária ou template externo;
- disparo automático da escalação pelo WhatsApp;
- editar fatos de partida finalizada a partir da escalação.

## Contratos e decisões

- `events` continua dono de chamada, escalação e URL; `event_squads` continua
  sendo a identidade estável das equipes planejadas;
- uma migration forward-only acrescentará o mínimo necessário para exclusões,
  revisão publicada e idempotência. Migration aplicada nunca será editada;
- o rascunho é mutável enquanto o evento não estiver encerrado. Publicar cria
  revisão imutável; edições posteriores não alteram o que já foi publicado até
  nova confirmação explícita;
- a revisão guarda relações com atletas e equipes, não uma cópia pública
  irrestrita de nomes. A projeção recalcula consentimento e vínculo a cada
  leitura; revogação remove a identidade das superfícies futuras sem apagar a
  evidência privada;
- manager pode operar o rascunho do próprio time; publicação e retirada pública
  exigem owner/admin. A identidade e o `team_id` derivam da sessão;
- Actions validam formato e delegam. Criação, movimentação, exclusão, vínculo
  com partida e publicação ficam em RPCs estreitas com lock do evento;
- grants diretos de escrita em `event_squads` e `lineup_spots` serão contraídos
  somente depois que App N usar as RPCs; App N e banco N/N+1 toleram ambas as
  ordens de deploy;
- publicação anônima exige `public_event_page`, revisão ativa e consentimento
  específico. Capability R02 não revela escalação de terceiros;
- a imagem usa `ImageResponse`, dados da projeção pública e cache privado ou
  versionado. O HTML e a metadata nunca carregam capability;
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

## Critérios de aceite

- [ ] `AC-R07-01` — Staff cria e ordena de 2 a 12 equipes válidas, com nomes únicos no evento e cores opcionais válidas.
- [ ] `AC-R07-02` — Somente vínculo ativo do mesmo time com RSVP SIM pode ser distribuído; indisponíveis e excluídos nunca entram por cliente adulterado ou concorrência.
- [ ] `AC-R07-03` — Manager edita o rascunho; somente owner/admin publica ou retira publicação, sempre pela sessão e com auditoria agregada.
- [ ] `AC-R07-04` — No celular, mover, retirar e recolocar atleta funciona por toque e por alternativa acessível sem depender de arrastar.
- [ ] `AC-R07-05` — Salvar, repetir, concorrer ou reenviar a mesma solicitação produz um único estado completo, sem atleta duplicado ou cross-tenant.
- [ ] `AC-R07-06` — Equipe pode ser ligada a um lado de partida sem alterar RSVP, presença real, lances ou estatísticas.
- [ ] `AC-R07-07` — Publicação cria revisão explícita; edição de rascunho não muda a revisão ativa e revogação de consentimento remove identidade da projeção seguinte.
- [ ] `AC-R07-08` — Imagem compartilhável respeita branding, revisão, consentimento e fallback de escudo, sem PII, capability ou segredo em HTML, URL, metadata e logs.
- [ ] `AC-R07-09` — Flag desligada, revisão ausente ou falha de imagem preserva lista de confirmados, link canônico e jornada privada utilizável.
- [ ] `AC-R07-10` — RLS, grants mínimos, N/N−1, telemetria redigida, piloto Android/iPhone, smoke e rollback por flag possuem evidência.

## Riscos e controles

| Risco | Controle | Evidência |
|---|---|---|
| escalar quem não confirmou | seleção e lock dentro da RPC | pgTAP negativo e resposta concorrente |
| misturar RSVP, escalação e presença | tabelas e comandos separados | testes de não alteração e integração R04 |
| publicar identidade sem consentimento | projeção server-side fail-closed | pgTAP, teste público e revogação |
| rascunho alterar arte já compartilhada | revisão publicada imutável | teste de edição após publicação |
| atleta duplicado ou cross-tenant | unicidade, FKs compostas, RLS e RPC | pgTAP concorrente e dois times |
| interface impossível no celular | controles por toque e alternativa ao drag | Android, iPhone e teclado/leitor |
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
