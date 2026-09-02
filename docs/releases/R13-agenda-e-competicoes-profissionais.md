---
id: R13
type: vertical
status: active
outcome: "Permitir que a diretoria crie jogos ou campeonatos sem ambiguidade, reutilize equipes padrão e resolva conflitos de agenda manualmente sem perder histórico."
depends_on:
  - R01
  - R07
  - R09
  - R12
baseline:
  - BASE-TENANCY
  - BASE-SERIES
  - BASE-MATCH-REPORT
  - BASE-PUBLIC
  - BASE-WRITES
  - BASE-DELIVERY
verified_at: "bac7953"
decisions:
  - DEC-EVENT-MATCH
  - DEC-INTERNAL-SQUAD-IDENTITY
  - DEC-CHAMPIONSHIP-MODEL
  - DEC-PROFESSIONAL-SCHEDULING
invariants:
  - INV-MOBILE-WHATSAPP-FIRST
  - INV-RLS-MULTI-TIME
  - INV-DEPLOY-COMPATIBLE
  - INV-HISTORICAL-EVENTS
  - INV-CANONICAL-EVENT-URL
  - INV-SINGLE-SOURCE
  - INV-MANUAL-FALLBACK
---

# R13 — Agenda e competições profissionais

## Resultado demonstrável

No celular, a diretoria escolhe claramente entre **Novo jogo** e **Novo
campeonato**, começa com duas equipes internas padrão e publica somente depois
de revisar lados, regulamento e agenda. Conflitos aparecem em **Pendências da
agenda** e exigem decisão humana auditável; o sistema nunca remarca sozinho nem
duplica mensagens.

## Três tempos

### Passado a preservar

- evento é ocorrência, chamada, comunicação e URL estável;
- recorrência materializa ocorrências independentes e preserva exceções;
- partida possui exatamente dois lados e fatos esportivos próprios;
- equipes internas são persistentes; eventos e campeonatos guardam snapshots;
- os três formatos, a classificação e a página pública da R09 permanecem;
- remarcação, cancelamento, agenda e campeonatos atuais são fallback utilizável.

### Presente a resolver

- jogo, repetição e campeonato ainda aparecem no mesmo fluxo de evento;
- criação não começa necessariamente com duas equipes internas válidas;
- critérios de desempate são exibidos, mas não podem ser reordenados;
- agenda não detecta sobreposição de equipe, local ou atleta;
- adiamento, data a definir e exceção justificada não possuem contrato único.

### Futuro compatível

- reservas externas, geocodificação e cálculo real de deslocamento podem usar os
  locais persistentes sem alterar o evento;
- novos critérios ou formatos entram por nova versão de regulamento;
- calendário multi-organização exigirá autorização própria, nunca FK implícita;
- canais futuros consomem a mesma outbox sem mudar a decisão esportiva.

## Escopo

### Incluído

- duas entradas textuais, grandes e empilhadas em 360 px;
- jogo único ou recorrente e criação guiada de campeonato;
- duas equipes padrão e Missão de estreia com identidades persistentes;
- participantes internos pré-selecionados e adversário externo como snapshot;
- lista acessível e reordenável de desempates, versão congelada e exposição pública;
- locais internos opcionais, conflitos duros, alertas e painel de pendências;
- remarcação, data a definir, adiamento, cancelamento e escopo de recorrência;
- auditoria, idempotência, outbox, telemetria, flag, piloto e rollback.

### Fora

- remarcação automática, roteamento, GPS ou cálculo de distância;
- reserva ou pagamento de quadra, arbitragem e integração com calendário externo;
- liga com escrita entre tenants, ida e volta ou novo formato esportivo;
- inscrição rígida de elenco, transferência, ranking ou estatística paralela;
- migração de Twilio/SES, monetização da R11 ou indexação pública.

## Contratos fechados no CP0

- [`DEC-PROFESSIONAL-SCHEDULING`](../decisions/DEC-PROFESSIONAL-SCHEDULING.md)
  fecha vocabulário, padrões, regulamento, matriz de conflitos, autorização,
  comunicação, compatibilidade e rollout;
- `DEC-EVENT-MATCH` e `DEC-CHAMPIONSHIP-MODEL` continuam autoritativas: R13 não
  transforma evento em partida, recorrência em campeonato nem tabela em contador;
- dois lados ativos e distintos são obrigatórios para publicação, não para ler
  ou corrigir histórico anterior;
- regra publicada é versionada e imutável; edição segura exige cancelar a
  publicação antes do primeiro fato ou criar campeonato novo;
- conflito duro bloqueia até remarcação, adiamento ou exceção motivada por
  owner/admin; vínculo duplicado falha fechado e não aceita exceção;
- WhatsApp/e-mail só nascem após decisão confirmada e nunca são condição para a
  agenda ser salva.

## Entry points

- dashboard e missão: `app/app/[teamSlug]/page.tsx`;
- criação de jogo: `app/app/[teamSlug]/events/new/page.tsx`,
  `components/admin-event-form.tsx`, `app/app/[teamSlug]/events/actions.ts`;
- edição, série e cancelamento: `app/app/[teamSlug]/events/[eventId]/edit/page.tsx`,
  `components/event-series-extension-form.tsx`, `components/event-cancel-form.tsx`;
- campeonatos: `app/app/[teamSlug]/championships/page.tsx`,
  `app/app/[teamSlug]/championships/[championshipId]/page.tsx`,
  `components/championship-forms.tsx`;
- equipes/configurações: `components/internal-squad-manager.tsx`,
  `components/team-settings-form.tsx`,
  `app/app/[teamSlug]/settings/internal-squad-actions.ts`;
- domínio/leitura: `lib/features/championships/rules.ts`,
  `lib/features/team-division/internal-squads.ts`, `lib/data/championships.ts`;
- banco: `supabase/migrations/202607130001_initial_schema.sql`,
  `202607200004_event_editing.sql`, `202607280001_event_cancellation.sql`,
  `202608110006_r07_internal_squad_identity.sql` e
  `202608130002_r09_championship_contract.sql`;
- testes-base: `components/admin-event-form.test.tsx`,
  `supabase/tests/007_event_editing.test.sql`,
  `supabase/tests/041_r07_reusable_squad_presets.test.sql`,
  `supabase/tests/045_r09_championship_contract.test.sql`.

## Pacotes de trabalho

| Pacote | Critérios | Resultado | Validação |
|---|---|---|---|
| `WP-R13-01` — entrada e expansão inerte | `AC-R13-01` a `04`, `16` | flag, estados, duas entradas e criação compatível | `VAL-APP` + `VAL-DB` |
| `WP-R13-02` — equipes e padrões | `AC-R13-05` a `08` | Missão, padrões, participantes e snapshots | `VAL-APP` + `VAL-DB` |
| `WP-R13-03` — regulamento versionado | `AC-R13-09` a `11` | ordem acessível, congelamento e projeção idêntica | `VAL-APP` + `VAL-DB` + `VAL-PUBLIC` |
| `WP-R13-04` — conflitos e ciclo da agenda | `AC-R13-12` a `15` | pendências, decisão manual e avisos idempotentes | `VAL-APP` + `VAL-DB` |
| `WP-R13-05` — robustez e piloto | `AC-R13-01` a `18` | concorrência, mobile, telemetria, rollout e recuperação | CP3–CP6 |

## Critérios de aceite

- [x] `AC-R13-01` — CP0 diferencia jogo, recorrência, campeonato, equipe, escalação, participante e partida sem criar fonte de verdade paralela.
- [x] `AC-R13-02` — Resultado, dependências, escopo, decisões, entrypoints, riscos, rollout e fallback estão completos e não deixam decisão de schema/autorização aberta.
- [x] `AC-R13-03` — Dashboard oferece **Novo jogo** e **Novo campeonato** como ações textuais acessíveis; o primeiro pergunta uma vez ou recorrente.
- [x] `AC-R13-04` — Criação de campeonato preserva progresso entre identidade, equipes, formato, regras, calendário, revisão e publicação.
- [x] `AC-R13-05` — Missão e configuração mantêm de 2 a 12 equipes internas ativas e selecionam duas padrões distintas do próprio tenant.
- [x] `AC-R13-06` — Novo jogo preenche os padrões e permite troca; nenhum novo jogo ou campeonato é publicado sem os lados válidos.
- [x] `AC-R13-07` — Campeonato pré-seleciona equipes internas ativas; adversário externo continua snapshot e só vira equipe por ação separada.
- [x] `AC-R13-08` — Redistribuir atleta por partida não muda equipe persistente, RSVP, fatos anteriores nem classificação.
- [x] `AC-R13-09` — Desempates possuem subir/descer, pontos primários, catálogo sem repetição e confronto direto explicado/testado para três ou mais empatados.
- [x] `AC-R13-10` — Publicação congela uma versão; edição posterior segue o limite anterior ao primeiro fato e nunca recalcula história por mutação silenciosa.
- [x] `AC-R13-11` — Página pública mostra exatamente formato, pontuação e ordem aplicada pela RPC transacional.
- [ ] `AC-R13-12` — Sobreposição de equipe/local exclusivo, vínculo duplicado, intervalo curto, deslocamento potencial e atleta confirmado seguem a matriz aceita.
- [ ] `AC-R13-13` — Pendências mostra gravidade, motivo e ações; conflito duro exige solução ou exceção justificada por owner/admin.
- [ ] `AC-R13-14` — Remarcar, data a definir, adiar e cancelar preservam URL, convidados, respostas, vínculo, fatos e auditoria conforme o tipo de jogo.
- [ ] `AC-R13-15` — Série oferece somente esta ocorrência ou esta e próximas; mensagem nasce após confirmação e não duplica em retry.
- [x] `AC-R13-16` — Migration forward-only, flag desligada e matriz N/N−1 preservam criação, agenda, campeonatos e histórico atuais.
- [ ] `AC-R13-17` — RLS, grants, sessão verificada, idempotência e concorrência cobrem sucesso, negação e cross-tenant.
- [ ] `AC-R13-18` — Jornada passa em 360 px, Android, iPhone e navegador interno do WhatsApp, com acessibilidade, piloto, fallback e rollback.

## Riscos e controles

| Risco | Controle | Evidência exigida |
|---|---|---|
| recorrência virar campeonato | entradas e estados distintos sobre fontes existentes | testes de jornada e contrato |
| padrão atravessar tenant ou ficar inativo | FK composta, validação transacional e estado incompleto | pgTAP negativo/cross-tenant |
| renome reescrever histórico | identidade persistente + snapshot por evento/participante/lado | regressão de rename/desativação |
| regra pública divergir do cálculo | versão imutável consumida por RPC e projeção | teste de reconstrução e snapshot público |
| corrida criar conflito invisível | lock/advisory lock, revalidação na escrita e unicidade | testes concorrentes |
| exceção virar bypass comum | papel restrito, motivo obrigatório e auditoria | negação de manager/atleta e censo |
| remarcação duplicar aviso | outbox e dedupe por revisão/finalidade/destinatário | replay, retry e kill switch |
| schema novo quebrar agenda atual | expansão inerte, wrappers e fallback por flag | matriz N/N−1 e rollback |

## Validação

```bash
npm run migrations:check -- origin/main HEAD
npm run db:reset
npm run db:lint
npm run db:test
npm run db:types
npm run verify
npm run security:audit
```

Adicionar testes focados por pacote, concorrência, censo cross-tenant,
acessibilidade, smoke anônimo e sonda agregada sem PII.

### Contrato do WP-R13-02

- `team_squad_presets` permanece a identidade persistente das equipes internas;
  a configuração profissional referencia duas identidades ativas, distintas e do
  mesmo `team_id` por FKs compostas, sem copiar nome, cor ou escudo;
- times com exatamente duas equipes ativas recebem backfill determinístico dos
  padrões; qualquer estado ausente ou ambíguo continua incompleto e precisa ser
  confirmado por owner/admin antes de criar conteúdo profissional novo;
- salvar equipes e padrões, criar jogo com seus dois lados e criar campeonato
  com participantes internos são comandos transacionais e idempotentes; replay
  com payload diferente é rejeitado e nenhuma escrita sensível depende do corpo
  enviado pelo cliente para determinar o tenant;
- `event_squads` e `championship_participants` congelam nome, cor e escudo no
  momento da criação. Renome, desativação ou redistribuição posterior não altera
  o snapshot, RSVP, fatos esportivos, participantes nem classificação;
- adversário externo continua exclusivamente snapshot de participante; esta
  etapa não cria `team_squad_presets` implicitamente;
- as RPCs anteriores continuam disponíveis para aplicação N-1 e só os novos
  consumidores usam as versões profissionais quando a flag estiver ativa. Com
  a flag desligada, interface e banco preservam integralmente o fluxo anterior.

### Contrato do WP-R13-03

- pontos permanecem o critério primário; os quatro critérios secundários formam
  um catálogo completo sem repetição, ordenado por controles **subir/descer**
  acessíveis no celular;
- confronto direto calcula o mini-torneio somente entre participantes ainda
  empatados depois dos critérios anteriores; igualdade persistente segue para o
  próximo critério e mantém posição compartilhada ao esgotar a lista;
- cada transição de rascunho para publicado captura uma versão imutável do
  formato, pontuação e ordem. O campeonato referencia a versão aplicada por FK
  composta do próprio tenant;
- owner/admin pode recolher e reabrir o regulamento somente antes do primeiro
  fato esportivo. A URL e as versões anteriores permanecem; a página pública
  volta a privada até uma nova publicação explícita;
- edição e reabertura são RPCs transacionais e idempotentes. Manager não altera
  regulamento; RLS, grants mínimos e sessão verificada protegem versão e tenant;
- classificação privada e projeção anônima continuam derivadas das súmulas e
  leem os mesmos campos congelados. A expansão é aditiva, tolera N/N−1 e
  `professional_scheduling` permanece desligada fora de coorte explícita.

## Rollout, fallback e rollback

- `professional_scheduling` nasce desligada e não herda rollout global anterior;
- expansão do banco precede consumidores e tolera aplicação N−1;
- piloto começa sintético, avança para um único time e mede conflitos por classe,
  exceções, falhas, mensagens e divergências, nunca nomes ou endereços;
- criação/edição atuais, ajustes manuais, painel autenticado e R09 permanecem
  fallback enquanto o piloto não passar;
- rollback desliga a flag, interrompe novos consumidores e preserva todos os
  eventos, versões, decisões e fatos; comunicação possui kill switch próprio;
- contração do formulário antigo ocorre apenas em release posterior.

## Evidências e checkpoint

### CP0 — concluído em 2026-09-01

- R12 terminou CP6 e liberou a única frente seguinte do roadmap;
- baseline e entrypoints foram revalidados em `251f361` sobre `dev` limpa;
- `DEC-PROFESSIONAL-SCHEDULING` fechou vocabulário, duas equipes padrão,
  versionamento do regulamento, matriz de conflitos, papéis e comunicação;
- resultado, três tempos, escopo, cinco pacotes, 18 critérios, riscos, validação,
  rollout, fallback e rollback satisfazem a Definition of Ready;
- lint, TypeScript, 115 arquivos/557 testes de aplicação, 4 testes de contexto e
  build de produção Webpack passaram; Turbopack ficou limitado somente pela
  abertura de porta no sandbox;
- integridade das migrations foi preservada e a auditoria encontrou zero
  vulnerabilidades;
- nenhuma migration, tabela, RPC, flag, interface ou integração foi alterada;
- próximo pacote: `WP-R13-01`, iniciando pela expansão inerte e pelo teste de
  regressão das rotas atuais antes das duas novas entradas.

### CP1–CP2 — WP-R13-01 concluído em 2026-09-01

- `professional_scheduling` foi adicionado por migration forward-only, fora do
  catálogo do rollout global e sem materializar configuração para times atuais
  ou futuros;
- o consumidor falha fechado quando a expansão ainda não existe, preservando a
  aplicação N−1, e o banco novo permanece inerte diante da aplicação N−1;
- owner/admin com `championships` e `professional_scheduling` ativos recebe no
  dashboard as duas ações textuais de 112 px; manager e flag desligada mantêm os
  atalhos anteriores;
- **Novo jogo** separa uma ocorrência da repetição semanal sem mudar a RPC de
  eventos, as ocorrências independentes, a URL ou o fallback atual;
- **Novo campeonato** abre o rascunho transacional existente e reconstrói a
  etapa corrente pelos participantes, confrontos e estado persistidos, cobrindo
  identidade, equipes, formato, regras, calendário, revisão e publicação;
- inspeção autenticada em 390 × 844 confirmou as três jornadas sem overflow,
  áreas de toque de 48 a 112 px, `aria-current`, fallback desligado e zero erro
  ou aviso no console;
- 118 arquivos/569 testes de aplicação, 64 arquivos/1.629 testes pgTAP, quatro
  testes de contexto, lint, TypeScript, integridade das migrations, auditoria
  sem vulnerabilidades e build Webpack passaram; o Turbopack ficou limitado
  apenas pela abertura de porta no sandbox;
- próximo pacote: `WP-R13-02`, adicionando equipes internas persistentes e os
  padrões do time sem ativar `professional_scheduling` em produção.
- PRs `#361` (`codex/r13-entry-expansion → dev`) e `#362` (`dev → main`)
  passaram por qualidade, banco, CodeQL, dependências, Terraform e preview;
- produção recebeu `bac7953`; o deploy Supabase `33499012350`, o CI
  `33499012400`, o banco `33499012497`, o CodeQL `33499012384` e o smoke
  somente leitura `33499081106` concluíram com sucesso;
- a sonda privilegiada agregada encontrou `0` linhas de
  `professional_scheduling`, comprovando que a expansão chegou inerte e que o
  fallback continua ativo para todos os times.

### CP2–CP4 — WP-R13-02 validado em 2026-09-01

- `team_professional_scheduling_settings` referencia por FK composta duas
  identidades internas ativas, distintas e do próprio tenant; times existentes
  com exatamente duas equipes recebem backfill determinístico e estados
  ausentes ou ambíguos permanecem incompletos;
- RPCs profissionais versionadas salvam equipes e padrões, criam todas as
  ocorrências com dois `event_squads` e criam o campeonato com 2 a 12
  participantes internos em uma única transação idempotente, rejeitando replay
  diferente e preservando as RPCs anteriores para N-1;
- owner/admin configura padrões; manager cria jogo e troca os lados válidos;
  campeonato pré-seleciona as equipes ativas e adversário externo continua
  snapshot sem criar identidade persistente;
- renome e redistribuição por partida não alteraram lados históricos,
  participantes, RSVP nem a classificação derivada;
- inspeção autenticada em 390 × 844 confirmou estado incompleto, salvamento dos
  dois padrões, preenchimento do jogo e dois participantes marcados no
  campeonato, sempre com `scrollWidth = 390` e zero erro ou aviso no console;
- 118 arquivos/573 testes de aplicação, 65 arquivos/1.665 testes pgTAP, quatro
  testes de contexto, lint, TypeScript, db lint, integridade das migrations,
  auditoria sem vulnerabilidades e build Webpack passaram; Turbopack permaneceu
  limitado apenas pela abertura de porta no sandbox;
- `professional_scheduling` continua fora do rollout global e será promovida
  desligada; a próxima frente após o smoke é `WP-R13-03`.

### Produção — WP-R13-02 concluído em 2026-09-01

- PR `#365` promoveu a branch temporária para `dev`; os gates consolidados
  passaram antes da promoção `dev → main` pela PR `#366`;
- produção recebeu `d67736b`; deploy Supabase `33529467589`, CI
  `33529467509`, banco `33529467497`, CodeQL `33529467386` e Terraform
  `33529467568` passaram;
- o smoke somente leitura `33529857819` validou as jornadas públicas essenciais;
- a sonda pós-deploy encontrou zero flags profissionais, zero times habilitados
  e três configurações padrão retrocompatíveis, comprovando que a expansão
  chegou inerte e que nenhum tenant foi ativado;
- `main` foi reconciliada por fast-forward em `dev` e a branch temporária de
  implementação foi removida local e remotamente. O checkpoint retorna a
  `idle`; a próxima frente permitida é `WP-R13-03`.

### CP2–CP4 — WP-R13-03 validado em 2026-09-01

- `championship_regulation_versions` captura por trigger uma versão imutável em
  cada publicação e o campeonato aponta para ela por FK composta do mesmo
  tenant; rascunho permanece compatível com aplicação N−1;
- owner/admin atualiza ou reabre por RPC idempotente; manager, anon, replay com
  payload diferente e acesso cross-tenant falham fechados. Reabertura recolhe a
  página e é bloqueada após fato, placar, decisão ou partida iniciada;
- o catálogo completo possui controles textuais **subir/descer** de 44 × 44 px,
  pontos permanecem primários e a explicação do confronto direto descreve o
  mini-torneio das equipes ainda empatadas;
- o caso de quatro equipes com A, B e C empatados em pontos e saldo comprovou o
  mini-torneio de três: posições 1, 2 e 3 foram iguais na RPC privada e na
  projeção anônima;
- navegador autenticado confirmou salvar a nova ordem, estado de sucesso,
  `scrollWidth` igual a 360/390, página pública com formato, 3/1/0 e ordem
  congelada, alvos de toque de 44 px e zero erro ou aviso no console;
- 119 arquivos/578 testes de aplicação, 66 arquivos/1.696 testes pgTAP, quatro
  testes de contexto, lint, TypeScript, db lint, migrations, build Webpack e
  auditoria com zero vulnerabilidades passaram; Turbopack ficou limitado apenas
  pela abertura de porta no sandbox;
- os PRs `#370` (`codex/r13-regulation-versioning` → `dev`) e `#371`
  (`dev` → `main`) passaram pelos checks protegidos; produção recebeu o commit
  `7c92b69` sem reescrita de histórico;
- o deploy Supabase `33577324165`, o gate Database `33577324191`, CI, CodeQL e
  Terraform passaram; o deploy Vercel disparou o smoke somente leitura
  `33577370813`, que confirmou evento e campeonato públicos;
- a sonda agregada pós-deploy comprovou `professional_flags=0`,
  `professional_enabled=0`, uma versão histórica migrada e nenhum campeonato
  publicado sem `regulation_version_id`;
- `main` foi reconciliada por fast-forward em `dev`. O checkpoint retorna a
  `idle`, `professional_scheduling` permanece desligada e a próxima frente
  permitida é `WP-R13-04`.
