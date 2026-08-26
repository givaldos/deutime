---
id: R12
type: vertical
status: active
outcome: "Dar à pessoa e à diretoria uma jornada coerente e segura para cadastro, privacidade, vínculos, encerramento da conta, avisos e opções de evento."
depends_on:
  - R00
  - R01
  - R02
  - R10
baseline:
  - BASE-IDENTITY
  - BASE-TENANCY
  - BASE-PUBLIC
  - BASE-WRITES
  - BASE-DELIVERY
verified_at: "7cd58b7"
decisions:
  - DEC-PUBLIC-PRIVACY
  - DEC-ACCOUNT-LIFECYCLE
invariants:
  - INV-MOBILE-WHATSAPP-FIRST
  - INV-RLS-MULTI-TIME
  - INV-DEPLOY-COMPATIBLE
  - INV-HISTORICAL-EVENTS
  - INV-PRIVATE-BY-DEFAULT
  - INV-MANUAL-FALLBACK
---

# R12 — Confiança e autonomia

## Resultado demonstrável

No celular, a pessoa entra pela URL pública coerente, administra os próprios
consentimentos e vínculos e consegue encerrar a conta sem suporte, resolvendo de
forma explícita qualquer time do qual seja o último proprietário. A diretoria
recebe um aviso mínimo e idempotente de novo pedido, enquanto criação e edição
de eventos oferecem os mesmos limites e opções. Nenhum staff publica atleta.

## Três tempos

### Passado a preservar

- identidade global e vínculos por time continuam separados;
- RLS e sessão verificada delimitam cada tenant;
- fatos esportivos encerrados, súmulas e classificações não são reescritos;
- `/t/{slug}/cadastro` e links já compartilhados continuam válidos;
- fila autenticada permanece a fonte autoritativa quando notificações falham.

### Presente a resolver

- links novos ainda usam a rota em português e a interface contém textos
  internos, emoji em compartilhamento e ação duplicada;
- staff ainda recebe controles legados capazes de sugerir publicação do atleta;
- `/me` não permite retirar pedido, sair de time ou encerrar a conta;
- novos pedidos não avisam a administração;
- duração e fechamento de confirmação aceitos pelo servidor não estão todos
  disponíveis na interface.

### Futuro compatível

- novos canais de aviso usam a mesma outbox e preferências sem ampliar a PII;
- novas finalidades públicas exigem consentimento próprio e não reutilizam os
  consentimentos desta release;
- exportação portátil e automação completa de direitos do titular podem usar o
  mesmo ciclo de vida, mas ficam fora da R12;
- migração de provedor de e-mail ou WhatsApp não altera domínio nem destinatários.

## Escopo

### Incluído

- correções de slug, rota canônica, compartilhamento e linguagem pública;
- remoção do consentimento administrativo e contração compatível do legado;
- leitura e encerramento de pedidos, convites e vínculos em `/me`;
- transferência/encerramento de time para resolver o último owner;
- encerramento reautenticado da conta e minimização conforme
  `DEC-ACCOUNT-LIFECYCLE`;
- aviso de cadastro pendente a owners/admins ativos, com preferência individual;
- opções coerentes de duração e prazo de confirmação na criação e edição.

### Fora

- consentimento de responsável para menor de 18 anos;
- exportação portátil completa, descoberta de atletas e marketplace;
- marketing por e-mail ou WhatsApp;
- edição do regulamento e matriz de conflitos da R13;
- migração da Twilio ou monetização da R11.

## Contratos e decisões fechados no CP0

### Privacidade e conta

- `DEC-PUBLIC-PRIVACY` continua autoritativa: staff nunca concede
  consentimento; cadastro não reivindicado permanece privado em HTML, metadata,
  imagem, diretório e perfil;
- `DEC-ACCOUNT-LIFECYCLE` define reautenticação, último owner, encerramento do
  time, anonimização, retenção, backups, comunicação e recuperação;
- segurança e operação da conta usam a finalidade necessária ao serviço;
  publicação individual continua baseada em consentimento específico;
- revisão do responsável pelo tratamento antes do CP5 pode reduzir retenção,
  nunca ampliar uso ou exposição sem nova decisão.

### Rotas e compartilhamento

- `/t/{slug}/register` é a rota canônica de entrada do atleta;
- `/t/{slug}/cadastro` responde com redirecionamento permanente para a canônica,
  preservando query string validada e destino interno seguro;
- `/cadaster` não é criado; links novos, autenticação e testes usam `/register`;
- `/t/{slug}`, `/e/{public_id}` e `/c/{public_id}` continuam as URLs públicas
  canônicas de time, evento e campeonato;
- texto preparado para compartilhar usa português simples, sem emoji, caractere
  inválido ou termos internos. Web Share e cópia produzem o mesmo conteúdo.

### Aviso de novo cadastro

- destinatários são os `owner` e `admin` ativos e autorizados no instante do
  envio; `manager`, membro inativo e pessoa de outro time nunca recebem;
- preferência individual por time nasce ligada e pode silenciar somente esse
  aviso. Alertas obrigatórios de segurança são categoria separada;
- assunto e corpo informam apenas que há um novo pedido, nome do time e link
  autenticado para a fila. Nome, telefone, e-mail, nascimento e observações do
  atleta não saem no e-mail;
- deduplicação usa cadastro + transição para `pending` + destinatário. Retry,
  refresh e reprocessamento não duplicam efeito;
- adapter de e-mail é neutro, com produção e consumo separados, retry,
  telemetria redigida e kill switch; a fila do dashboard é o fallback.

### Rollout

- correções de rota, linguagem e privacidade são compatíveis e não mantêm
  fallback que republique PII;
- `account_autonomy` e `registration_email_alerts` nascem desligadas e não
  entram automaticamente no catálogo global já habilitado;
- produção e consumo de e-mail possuem controles globais independentes;
- aplicativo e banco toleram N/N−1 nas duas ordens, e contrações esperam um
  ciclo completo de links e backups.

## Entry points

- slug e criação: `lib/validation/onboarding.ts`,
  `app/app/new-team/actions.ts`, `app/app/new-team/page.tsx`;
- rota pública: `app/t/[slug]/cadastro/page.tsx`,
  `app/t/[slug]/cadastro/actions.ts`, `lib/auth/athlete-otp-errors.ts`;
- compartilhamento/dashboard: `app/app/[teamSlug]/page.tsx`,
  `components/championship-public-controls.tsx`,
  `components/event-lineup-share-actions.tsx`;
- privacidade administrativa: `lib/validation/operations.ts`,
  `app/app/[teamSlug]/athletes/actions.ts`,
  `components/admin-athlete-form.tsx`, `components/admin-athlete-edit-form.tsx`;
- autonomia: `app/me/page.tsx`, `app/me/actions.ts`,
  `app/app/profile/page.tsx`, `app/app/profile/actions.ts`;
- evento: `components/admin-event-form.tsx`,
  `app/app/[teamSlug]/events/actions.ts`, `lib/validation/operations.ts`;
- banco: `supabase/migrations/202607130001_initial_schema.sql`,
  `supabase/migrations/202607210006_athlete_ownership_and_removal.sql`,
  `supabase/migrations/202607310001_whatsapp_dispatch_contract.sql`;
- testes: `lib/validation/onboarding.test.ts`,
  `lib/validation/operations.test.ts`,
  `supabase/tests/010_athlete_ownership_and_removal.test.sql`;
- documentação: `docs/decisions/DEC-PUBLIC-PRIVACY.md`,
  `docs/decisions/DEC-ACCOUNT-LIFECYCLE.md`, `docs/security.md`,
  `docs/runbook.md`.

## Pacotes de trabalho

| Pacote | Critérios | Resultado | Validação |
|---|---|---|---|
| `WP-R12-01` — correções públicas | `AC-R12-01` a `03` | slug, rota, textos e dashboard coerentes com compatibilidade | `VAL-APP` + `VAL-LINK` + `VAL-PUBLIC` |
| `WP-R12-02` — privado por padrão | `AC-R12-04`, `05` | staff sem controle de publicação e legado incapaz de expor atleta | `VAL-APP` + `VAL-DB` + `VAL-PUBLIC` |
| `WP-R12-03` — vínculos e conta | `AC-R12-06` a `10` | saída, último owner, encerramento e retenção recuperáveis | `VAL-APP` + `VAL-DB` + segurança |
| `WP-R12-04` — aviso de cadastro | `AC-R12-11` a `13` | e-mail mínimo, preferências, idempotência e fallback | `VAL-APP` + `VAL-DB` + integração |
| `WP-R12-05` — opções do evento | `AC-R12-14`, `15` | criação, edição e recorrência usam opções e limites comuns | `VAL-APP` + `VAL-DB` |
| `WP-R12-06` — robustez e piloto | `AC-R12-01` a `17` | regressão, retenção, mobile, telemetria, rollout e recuperação comprovados | CP3–CP6 |

## Critérios de aceite

- [x] `AC-R12-01` — Nome, prévia, Action e banco produzem o mesmo slug válido, inclusive com hífen interno, e rejeitam hífen inicial, final ou repetido.
- [x] `AC-R12-02` — Links novos usam `/register`; `/cadastro` preserva links existentes e parâmetros seguros; `/cadaster` não existe.
- [x] `AC-R12-03` — Compartilhamento e interfaces públicas não exibem emoji quebrado, `�`, jargão interno ou ação duplicada de edição.
- [ ] `AC-R12-04` — Staff não vê nem consegue enviar controle de publicação do atleta, inclusive por requisição manipulada ou versão antiga.
- [ ] `AC-R12-05` — Somente atleta reivindicado, autenticado e consentido aparece nas projeções ampliadas; ausência/revogação remove identidade sem alterar fato interno.
- [ ] `AC-R12-06` — `/me` lista vínculos, pedidos e convites da própria pessoa com estado e ação corretos, sem leitura cross-tenant.
- [ ] `AC-R12-07` — Retirar ou recusar artefato pendente invalida acesso imediatamente e não afeta outro time.
- [ ] `AC-R12-08` — Sair revoga permissões e notificações; o último owner precisa transferir ou encerrar o time, inclusive sob concorrência.
- [ ] `AC-R12-09` — Encerramento reautenticado bloqueia a conta, revoga sessões/publicação e conclui minimização idempotente sem quebrar histórico.
- [ ] `AC-R12-10` — PII, auditoria, notificações e backups cumprem os prazos e a recuperação definidos em `DEC-ACCOUNT-LIFECYCLE`.
- [ ] `AC-R12-11` — Novo `pending` gera no máximo um aviso por destinatário elegível e nunca inclui PII do atleta no e-mail.
- [ ] `AC-R12-12` — Preferência individual silencia o aviso opcional sem silenciar segurança; destinatários são recalculados no envio.
- [ ] `AC-R12-13` — Falha, retry ou kill switch de e-mail preserva a fila autenticada, gera telemetria redigida e não duplica efeito.
- [ ] `AC-R12-14` — Criação e edição oferecem durações comuns até 480 min e valor personalizado entre 15 e 480 min.
- [ ] `AC-R12-15` — Confirmação aceita até o início, 1 h, 2 h, 3 h, 6 h, 12 h ou 1 dia; servidor valida fuso, início, fim, prazo e recorrência.
- [ ] `AC-R12-16` — App/schema N/N−1 funcionam nas duas ordens, links antigos passam na regressão e flags novas não herdam o rollout global anterior.
- [ ] `AC-R12-17` — Jornada passa em 360 px, Android, iPhone e navegador interno do WhatsApp, com acessibilidade, runbook, piloto, fallback e rollback comprovados.

## Riscos e controles

| Risco | Controle | Evidência exigida |
|---|---|---|
| staff ou legado publicar pessoa | falha fechada no banco e projeção por consentimento próprio | pgTAP negativo e censo público |
| redirecionamento perder estado ou aceitar destino externo | parâmetros allowlisted e destino same-origin | testes de link e autenticação |
| último owner sair em corrida | RPC transacional sob lock e constraint/trigger | concorrência e rollback |
| encerramento apagar história alheia | anonimização de referência e isolamento por titular/time | pgTAP cross-tenant e snapshots |
| exclusão parcial reabrir acesso | estado bloqueado, comando idempotente e reconciliação | teste de falha em cada etapa |
| backup restaurar PII encerrada | lista de exclusões reaplicada antes do tráfego | ensaio de restore |
| e-mail vazar ou duplicar cadastro | corpo sem PII, dedupe e destinatário no envio | snapshot, replay e retry |
| opções divergirem entre UI e servidor | constantes compartilhadas e validação transacional | testes de limite/fuso/recorrência |

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

Adicionar testes focados por pacote, matriz positiva/negativa/cross-tenant,
concorrência do último owner, censo de PII, restore, replay de e-mail, N/N−1,
acessibilidade e smoke anônimo das rotas antigas e novas.

## Rollout, fallback e rollback

- flags `account_autonomy` e `registration_email_alerts` desligadas por padrão e
  verificadas no servidor/banco;
- piloto com um time sintético antes de pessoas reais;
- telemetria limitada a etapa, estado, contagem e duração, sem PII;
- dashboard, rota antiga e gestão manual permanecem como fallback;
- produção e consumo de e-mail possuem kill switches independentes;
- smoke de produção é somente leitura; escrita idempotente ocorre em staging
  isolado com limpeza;
- rollback desliga novas ações/e-mails, termina encerramentos confirmados e
  nunca republica dado ou restaura consentimento;
- contração do legado espera censo, estabilidade e ciclo máximo de backup.

## Evidências e checkpoint

### CP0 — concluído em 2026-08-26

- resultado, passado/presente/futuro, escopo, dependências, entrypoints, riscos,
  rollout e 17 critérios de aceite foram registrados no commit-base `0896933`;
- rota canônica, destinatários, preferências, idempotência e fallback de e-mail
  foram fechados no pacote;
- `DEC-ACCOUNT-LIFECYCLE` resolveu último owner, encerramento de time/conta,
  finalidades, retenção, backups e recuperação com fontes oficiais;
- sobre a `dev` consolidada, lint, TypeScript, 98 arquivos/505 testes, 4 testes
  de contexto, build de produção Webpack e auditoria sem vulnerabilidades
  passaram; Turbopack ficou limitado somente pela abertura de porta no sandbox;
- nenhuma migration, tabela, flag, integração, e-mail ou interface foi alterada;
- próximo pacote: `WP-R12-01`, começando por teste de regressão do slug e da rota.

### WP-R12-01 — concluído em 2026-08-26

- o contrato compartilhado, a Action e a RPC transacional normalizam letras e
  espaços, preservam hífen interno e rejeitam slug curto, longo ou com hífen em
  extremidade ou repetido;
- a migration forward-only `202608260001_r12_public_slug_contract.sql` validou
  os dados existentes antes de tornar a constraint canônica efetiva;
- `/t/{slug}/register` passou a ser a rota canônica; `/cadastro` responde com
  redirect permanente, preserva somente `novo=1` e descarta parâmetros não
  reconhecidos; nenhum link novo usa `/cadaster`;
- os textos preparados para WhatsApp não contêm emoji ou caractere substituído,
  os controles expostos usam linguagem comum e **Ajustes** é o único acesso de
  edição no dashboard;
- lint, TypeScript, 101 arquivos/511 testes, 4 testes de contexto e build de
  produção Webpack passaram; a auditoria encontrou zero vulnerabilidades. O
  build Turbopack ficou limitado somente pela abertura de porta no sandbox;
- banco local aprovado com reset, lint sem alerta novo, tipos atualizados e 58
  arquivos/1.475 testes pgTAP; integridade das migrations preservada;
- smoke local: rota canônica `200`, rota antiga `308`, query segura preservada,
  nenhum erro de console e layout em 360 px sem rolagem horizontal;
- próximo pacote: `WP-R12-02`, começando pela falha fechada do cadastro privado
  feito pela diretoria e pela remoção do controle de publicação da interface.
