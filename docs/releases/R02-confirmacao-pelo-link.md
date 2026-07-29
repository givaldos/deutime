---
id: R02
status: active
outcome: "Permitir confirmar e acompanhar um evento pelo mesmo link do WhatsApp, com acesso persistente e revogável."
depends_on:
  - R00
  - R01
baseline:
  - BASE-IDENTITY
  - BASE-ATTENDANCE
  - BASE-PUBLIC
verified_at: 86a38b9
decisions:
  - DEC-PERSISTENT-ACCESS
  - DEC-EVENT-PUBLIC-MINIMUM
  - DEC-UNCLAIMED-IDENTITY
invariants:
  - INV-MOBILE-WHATSAPP-FIRST
  - INV-RLS-MULTI-TIME
  - INV-CANONICAL-EVENT-URL
---

# R02 — Confirmação pelo link

## Resultado demonstrável

O atleta toca a mensagem no WhatsApp, vê o evento e responde SIM, NÃO ou TALVEZ sem procurar a agenda nem repetir autenticação em aparelho reconhecido. O mesmo endereço continua útil depois do fechamento, e a diretoria pode compartilhá-lo manualmente antes de existir automação.

## Três tempos

### Passado a preservar

- Atletas reivindicados possuem identidade global, OTP no WhatsApp e sessão Supabase em cookie; BID administrativo ainda pode não ter identidade.
- `event_attendance` é a fonte atual de resposta por ocorrência.
- O atleta autenticado e aprovado já pode responder em `/me/agenda` e nos cards de `/t/[slug]`, ambos pelo mesmo contrato `respond_to_event_as_player`.
- Página pública do time e Open Graph genérico da marca já existem; não há metadata contextual por evento.
- A projeção pública atual já expõe o UUID bruto do evento, mas não existe rota canônica nem decisão sobre reutilizá-lo ou introduzir `public_id`.
- O cookie atual não representa uma sessão inventariada por aparelho: ainda não há rotação própria nem revogação individual.

### Presente a resolver

- Não existe URL canônica pública por evento.
- A confirmação ainda exige navegação autenticada.
- Capability duradoura por evento, sessão de identidade por aparelho, rotação e revogação precisam ser implementadas sem ampliar o escopo do link.
- O transporte do link precisa limitar vazamento em preview, logs, analytics e `Referer` e documentar a visibilidade inevitável ao provedor.

### Futuro compatível

- R03 enviará o mesmo link automaticamente.
- R04 transformará a URL em súmula.
- R05 e R06 reutilizarão a sessão de identidade já verificada; aparelho sem essa sessão fará step-up antes de comentário ou voto.
- Troca de slug do time não poderá quebrar o endereço do evento.

Ficam fora desta release worker de WhatsApp, escalação, súmula pública, votação e comentários.

## Entry points

- `app/me/agenda/[eventId]/page.tsx`
- `app/me/actions.ts`
- `app/t/[slug]/page.tsx`
- `app/t/[slug]/actions.ts`
- `lib/auth/dal.ts`
- `lib/supabase/server.ts`
- `lib/supabase/proxy.ts`
- `lib/data/public-team.ts`
- `lib/security/headers.ts`
- `lib/security/redirects.ts`
- `supabase/migrations/202607200001_player_identity.sql`
- `supabase/migrations/202607200003_public_team_schedule.sql`
- `supabase/tests/005_player_identity.test.sql`
- `supabase/tests/006_public_team_schedule.test.sql`

Esses caminhos foram revalidados em `d1cd5b2` durante o CP0.

## Contratos fechados no CP0

- [`DEC-EVENT-PUBLIC-MINIMUM`](../decisions/DEC-EVENT-PUBLIC-MINIMUM.md)
  define `events.public_id` imutável, a rota `/e/{public_id}`, a projeção
  anônima e a migração em duas fases para retirar o UUID interno da agenda;
- [`DEC-UNCLAIMED-IDENTITY`](../decisions/DEC-UNCLAIMED-IDENTITY.md) permite
  confirmação pelo BID administrativo sem criar identidade global e preserva o
  mesmo `athlete_id` quando o telefone for reivindicado por OTP;
- [`DEC-PERSISTENT-ACCESS`](../decisions/DEC-PERSISTENT-ACCESS.md) continua
  sendo o contrato de transporte, capability, sessão, expiração e revogação;
- o primeiro incremento implementável é a expansão inerte de banco de
  `WP-R02-01`: `public_id`, projeção pública e testes, sem ativar rota ou escrita
  em produção.

## Pacotes de trabalho

| Pacote | Critérios | Entry points principais | Validação |
|---|---|---|---|
| `WP-R02-01` — URL e leitura pública | `AC-R02-01`, `02`, `10` | `public-team.ts`, migration/teste da agenda pública, nova rota do evento | `VAL-PUBLIC`, `VAL-DB` |
| `WP-R02-02` — Capability e sessão | `AC-R02-03`, `04`, `06` a `08` | Auth DAL, Supabase server/proxy, headers/redirects, migration e pgTAP novos | `VAL-LINK`, `VAL-DB` |
| `WP-R02-03` — SIM/NÃO/TALVEZ | `AC-R02-03`, `05`, `07`, `10` | Actions de atleta/time, `event_attendance`, testes de identidade/presença | `VAL-LINK`, `VAL-DB` |
| `WP-R02-04` — Risco, metadata e dispositivos | `AC-R02-06` a `09` | nova rota, headers, Open Graph contextual e suíte E2E | `VAL-LINK`, `VAL-PUBLIC` |

`WP-R02-01` é uma vertical publicável por compartilhamento manual e pode entrar em piloto depois de `DEC-EVENT-PUBLIC-MINIMUM`, sem esperar capability ou RSVP. Os demais WPs usam flags próprias e preservam essa página como fallback.

## Ready de `WP-R02-02` — CP0

### Resultado demonstrável

Um link personalizado no formato `/e/{public_id}#c={credencial}` abre a mesma
página pública, remove o segredo da barra e o troca por `POST` same-origin por
um cookie opaco, `HttpOnly`, `Secure`, `SameSite=Lax` e restrito ao caminho do
evento. Reaberturas no mesmo navegador recuperam somente o contexto autorizado
daquele atleta e evento. Um aparelho com sessão Supabase já verificada é
reconhecido sem novo OTP; atleta ainda não reivindicado recebe somente a
capability do evento. Revogação, expiração ou kill switch retornam ao conteúdo
público ou à agenda autenticada sem escrever RSVP.

### Fronteira de confiança e transporte

- o fragmento nunca chega no `GET`, em redirects, metadata, analytics ou
  `Referer`; um bootstrap mínimo o remove com `history.replaceState` antes de
  chamar o endpoint de troca;
- o `GET /e/{public_id}` nunca cria sessão. A troca ocorre somente por
  `POST /e/{public_id}/access`, com origem e tipo de conteúdo validados;
- credencial e cookie são segredos aleatórios de 256 bits codificados em
  base64url. O banco persiste somente SHA-256, e logs/auditoria registram apenas
  IDs não secretos, resultado e código de motivo;
- o cookie não autoriza sozinho. Cada leitura protegida recalcula credencial,
  capability, atleta ativo, presença no evento, time, fase, expiração, revogação,
  flag do time e controle global;
- troca repetida ou concorrente converge para o mesmo escopo sem ampliar
  permissões. Encaminhar o link pode criar outra capability igualmente estreita,
  risco aceito e mitigado por inventário, expiração e revogação;
- nenhuma dependência de terceiros é carregada na abertura ou troca do link.

### Identidade verificada, inventário e revogação

- `session_id` do JWT verificado pelo Supabase é o identificador autoritativo da
  sessão por aparelho; tokens e refresh tokens não são copiados para tabelas da
  aplicação;
- o primeiro acesso protegido de R02 por uma sessão existente registra, de forma
  idempotente, seu par `user_id`/`session_id` no inventário. Uma marca de
  revogação permanece como tombstone e impede que o mesmo JWT se autorregistre
  novamente;
- a autorização sensível exige claims válidas, `session_id` pertencente ao
  usuário, sessão ainda existente em `auth.sessions`, inventário ativo e prazos
  de inatividade e validade absoluta respeitados;
- revogar o item do inventário remove imediatamente as permissões de R02 mesmo
  durante a validade do access token. Encerrar o refresh da sessão Supabase é
  executado quando houver API documentada e JWT da própria sessão; revogação
  global permanece o fallback operacional;
- não haverá `DELETE` direto em `auth.sessions` nem promessa de revogação remota
  individual que a API pública do Supabase não ofereça. A sessão existente fora
  das superfícies de R02 permanece compatível nesta fatia;
- capability de atleta não reivindicado não cria usuário, login ou identidade
  global. Reivindicação posterior por OTP preserva `athlete_id` e revoga ou
  rotaciona credenciais anteriores.

Essa separação considera que o access token continua válido até `exp` mesmo
depois de sign-out, enquanto a existência de `session_id` em `auth.sessions`
pode ser exigida em operações sensíveis. Referências revalidadas no CP0:
[sessões](https://supabase.com/docs/guides/auth/sessions),
[campos do JWT](https://supabase.com/docs/guides/auth/jwt-fields) e
[sign-out](https://supabase.com/docs/guides/auth/signout).

### Dados, entry points e ativação previstos para CP1

- expansão forward-only para credenciais de evento, capabilities, inventário de
  sessões verificadas, revogações/tombstones e auditoria sem segredos;
- RPCs transacionais e `security definer` mínimos para emitir/trocar, resolver e
  revogar acesso; todas recebem identidade do contexto verificado e recalculam
  isolamento por time;
- bootstrap em `/e/[publicId]`, Route Handler
  `/e/[publicId]/access`, DAL dedicado à sessão verificada e integração limitada
  nas superfícies protegidas de R02;
- `event_capability_exchange` continua como flag por time e ganha controle
  global homônimo, ambos ausentes/desligados por padrão. Credenciais podem ser
  preparadas inertes; nenhuma troca funciona enquanto os dois gates não
  estiverem ativos;
- `event_capability_rsvp` permanece desligada e toda escrita de
  `event_attendance` pertence a `WP-R02-03`;
- banco N deve tolerar app N−1, e app N deve cair na página pública ou agenda
  atual diante de banco N−1, flag desligada, sessão incompatível ou falha da
  troca.

### Escopo e matriz mínima de aceitação

Inclui emissão interna, troca, leitura autorizada, persistência no navegador,
inventário, expiração, revogação, kill switch, auditoria e fallback. Não inclui
envio por WhatsApp, RSVP, comentários, votos, escalação, identidade global sem
OTP nem migração geral das rotas autenticadas atuais.

O CP2 somente pode iniciar depois de o CP1 provar com pgTAP e testes de
aplicação:

- sessão verificada reconhecida por `session_id` e capability sem usuário para
  atleta não reivindicado;
- negação para revogado, expirado, tombstoned, outro evento, outro atleta e
  outro time;
- ausência de troca em `GET`, preview ou unfurl; rejeição de origem e conteúdo
  inválidos no `POST`;
- fragmento removido, cookie path-scoped e ausência de segredo em URL, logs,
  erros, analytics e auditoria;
- concorrência/replay idempotentes, limites temporais e desligamento pelos dois
  gates;
- compatibilidade nas duas ordens de deploy e fallback sem escrita de presença.

### Evidência do CP0

- decisões `DEC-PERSISTENT-ACCESS` e `DEC-UNCLAIMED-IDENTITY` confrontadas com
  DAL, proxy, cookies Supabase, RPC atual de resposta e vínculo de atleta;
- contrato oficial de sessões Supabase revalidado em 29/07/2026;
- resultado, dependências, fronteiras, riscos, estados de falha, entry points,
  compatibilidade e critérios mínimos estão fechados;
- não houve alteração de banco, ativação de flag ou mutação em produção;
- próxima ação concreta: CP1 com modelo de dados, assinaturas das RPCs, contrato
  do cookie, matriz RLS/pgTAP e ordem de deploy.

## Contrato de `WP-R02-02` — CP1

### Modelo de dados e estados

- `event_access_credentials` liga time, evento e atleta presente na chamada,
  persiste somente SHA-256 do segredo de 256 bits e mantém emissão, expiração,
  rotação e revogação auditáveis;
- existe no máximo uma credencial não revogada por atleta/evento. Nova emissão
  revoga a anterior e suas capabilities sob advisory lock;
- `event_capability_sessions` inventaria cada navegador que trocou a credencial,
  também somente por hash, com inatividade de até 30 dias e limite absoluto na
  expiração da credencial;
- `verified_device_sessions` projeta o `session_id` verificado pelo Supabase,
  sem copiar access ou refresh token, com 30 dias de inatividade, 180 dias
  absolutos e tombstone após revogação;
- credencial transita entre ativa, expirada ou revogada; capability entre ativa,
  expirada por inatividade, expirada absoluta ou revogada; aparelho entre
  reconhecido, expirado, ausente no Auth ou revogado;
- inativação e mudança de `athletes.user_id`, inclusive reivindicação por OTP,
  revogam credenciais e capabilities ainda ativas. Remoção da chamada ou do
  vínculo também retira o acesso pelas FKs e pela revalidação.

### Permissões e RPCs

- as três tabelas usam RLS sem policy cliente e não concedem acesso direto a
  `anon` ou `authenticated`;
- `issue_event_access_credential` e
  `revoke_event_access_credential` exigem owner/admin do mesmo time; emissão
  exige evento futuro e agendado, atleta ativo na chamada, telefone normalizado
  e aceite de privacidade;
- `exchange_event_access_credential` aceita `anon` ou `authenticated`, compara
  hashes em tempo constante dentro do evento e só funciona com
  `public_event_page`, `event_capability_exchange` do time e o controle global
  `event_capability_exchange` ativos;
- `resolve_event_capability` retorna somente `public_id`, nome do atleta,
  presença, fase, possibilidade derivada de resposta e expiração. IDs internos
  de time, evento e atleta não entram no retorno;
- `register_or_touch_verified_device_session` exige `auth.uid()`, claim
  `session_id` e a linha correspondente em `auth.sessions`; um tombstone,
  expiração ou sessão ausente falha fechado;
- `revoke_verified_device_session` alcança apenas aparelho da própria identidade
  e `revoke_all_my_verified_device_sessions` aplica a revogação própria global;
- nenhum contrato deste CP escreve `event_attendance`. A possibilidade retornada
  por leitura continua falsa enquanto `event_capability_rsvp` estiver desligada.

### Contrato HTTP e cookie do consumidor CP2

- o bootstrap de `/e/{public_id}` lê apenas `#c`, remove o fragmento com
  `history.replaceState` e envia `{ credential }` por JSON para
  `POST /e/{public_id}/access`;
- origem inválida falha `403`; credencial, escopo ou gate inválido falha com
  resposta genérica sem distinguir a causa; sucesso responde `204`, sem devolver
  o segredo da capability ao JavaScript;
- o Route Handler instala `dt_event_access` com o segredo retornado pela RPC,
  `HttpOnly`, `Secure`, `SameSite=Lax`, sem `Domain`, com
  `Path=/e/{public_id}` e `Max-Age` limitado pela expiração;
- reload e visitas sem fragmento resolvem o cookie server-side. Ausência, erro,
  expiração ou revogação removem o cookie e preservam a página pública e o CTA
  para a agenda autenticada;
- `GET`, metadata, preview e unfurl não chamam a troca; respostas continuam
  `private, no-store`, `no-referrer`, sem GTM e sem segredo em log ou erro.

### Auditoria, eventos e compatibilidade

- emissão e revogação de credencial e revogação de aparelhos usam `audit_logs`
  apenas com IDs não secretos, resultado e motivo; troca e leitura mantêm
  contadores/último uso nas próprias linhas sem registrar segredo ou telefone;
- CP1 não emite evento de domínio nem integração externa. R03 poderá consumir a
  emissão, e `WP-R02-03` adicionará a escrita transacional de RSVP sem mudar o
  formato da capability;
- `202607290001` publica somente o novo valor do enum e
  `202607290002` publica controle desligado, tabelas, RLS, RPCs e trigger. O app
  N−1 ignora toda a expansão;
- o consumidor CP2 deve tratar função/tabela ausente no banco N−1 como feature
  indisponível e voltar à página pública. Banco N tolera app N−1, e nenhum gate
  é ativado automaticamente em qualquer ordem de deploy;
- rollback desliga primeiro o controle global, depois a flag do time. As linhas
  permanecem para auditoria; nenhuma contração é necessária durante o MVP.

### Evidência do CP1

- `npm run db:reset` — 29 migrations e seed aplicados do zero;
- `npm run db:test` — 18 arquivos e 426 testes aprovados, incluindo 47 cenários
  novos de RLS, grants, emissão, troca, replay, cross-tenant, consentimento,
  reivindicação, revogação e tombstone;
- `npm run db:lint` — sem aviso novo depois da correção do helper criptográfico;
  permanecem dois avisos preexistentes em `create_event_as_staff`;
- `npm run db:types` — tabelas, enum e sete RPCs públicas refletidos em
  `lib/database.types.ts`;
- lint, typecheck e 16 arquivos/101 testes Vitest aprovados; build de produção
  aprovado separadamente com acesso às Google Fonts;
- `npm run security:audit` — zero vulnerabilidades;
- `npm run migrations:check -- f1ce627` — histórico preservado e somente as
  duas expansões novas adicionadas;
- nenhum controle ou flag foi ativado e não houve mutação do banco remoto;
- próxima ação concreta: CP2 com bootstrap, Route Handler, cookie path-scoped,
  DAL da sessão verificada e leitura autorizada mobile atrás dos dois gates.

## Caminho fino de `WP-R02-02` — CP2

- `/e/{public_id}#c={credencial}` agora possui bootstrap client-side mínimo:
  aceita somente o parâmetro `c`, remove o fragmento imediatamente e envia a
  credencial uma única vez por JSON para o endpoint same-origin;
- `POST /e/{public_id}/access` valida UUID, origem, contexto de navegação, tipo e
  tamanho do corpo. O sucesso responde `204` e instala `dt_event_access` como
  `HttpOnly`, `Secure`, `SameSite=Lax`, sem `Domain` e restrito ao caminho do
  evento; o endpoint não oferece `GET`;
- o DAL server-side resolve primeiro a capability do evento e, quando ela não
  existe, tenta a sessão Supabase verificada. A leitura retorna somente nome,
  presença, fase, capacidade derivada de resposta e expiração, sem IDs internos;
- a migration forward-only `202607290003_verified_event_access.sql` acrescenta
  a resolução do evento para uma sessão Auth verificada. Ela registra/toca o
  aparelho, confere `auth.sessions`, inventário, tombstone, prazos, vínculo do
  atleta, chamada e os gates antes de retornar o contexto mínimo;
- capability inválida, expirada, revogada, gate desligado, banco N−1 ou erro
  esperado falham fechado e preservam a página pública. Cookie inválido é
  descartado por `DELETE` same-origin no mesmo escopo;
- o contexto reconhecido é mobile-first e somente leitura: apresenta atleta e
  confirmação atual, mas nenhum controle `SIM`/`NÃO`/`TALVEZ`. A escrita de
  presença continua integralmente fora deste pacote;
- metadata, preview, unfurl e o `GET` público não executam a troca. Não foi
  adicionada dependência de terceiros, log de segredo ou ativação automática.

### Evidência do CP2

- `npm run db:reset` — 30 migrations e seed aplicados do zero;
- `npm run db:test` — 19 arquivos e 440 testes aprovados; o novo arquivo pgTAP
  cobre 14 cenários positivos, negativos, de expiração, revogação e isolamento;
- `npm run db:lint` — nenhum aviso novo; permanecem os dois avisos preexistentes
  em `create_event_as_staff`;
- `npm run db:types` e `npm run migrations:check -- 8937255` aprovados;
- `npm run verify` — lint, typecheck, 19 arquivos/118 testes Vitest e build de
  produção aprovados;
- `npm run security:audit` — zero vulnerabilidades;
- teste HTTP local confirmou página pública `200`, troca `204`, retorno
  reconhecido `200`, origem externa `403`, `GET` da troca `405`, fallback
  público, ausência de RSVP e atributos/escopo do cookie;
- o navegador isolado não alcançou o servidor local; a matriz de navegadores e
  aparelhos permanece deliberadamente no CP4;
- nenhum controle ou flag foi ativado e não houve mutação do banco remoto;
- próxima ação concreta: CP3 de robustez, cobrindo abuso, concorrência,
  privacidade, cancelamento e recuperação sem habilitar RSVP.

## Robustez de `WP-R02-02` — CP3

- o Route Handler agora aceita somente o media type exato `application/json`,
  limita o corpo declarado ou transmitido a 1 KiB medido em bytes e rejeita
  objetos ambíguos ou com campos extras antes de chamar o banco;
- todas as respostas da troca preservam `no-store`, `no-referrer` e `nosniff` e
  passam a declarar CSP fechada, bloqueio de frame e
  `Cross-Origin-Resource-Policy: same-origin`;
- a migration forward-only `202607290004_event_capability_robustness.sql`
  instala uma cota no ponto único de inserção. Cada credencial preserva no
  máximo oito capabilities ativas e 32 registros recentes;
- a RPC de troca já serializa concorrentes pelo lock da linha da credencial. O
  trigger revoga o overflow antes da nova inserção e poda somente itens
  revogados ou expirados, sem alterar o escopo autorizado;
- cancelamento preserva o contexto mínimo para informar o estado do evento,
  mas deriva `can_respond = false`. Controle global ou flag do time desligados
  falham fechado sem destruir a capability, permitindo recuperação operacional
  no mesmo escopo;
- credencial, capability, IP, token Auth e telefone continuam fora de logs e
  auditoria. O limite usa apenas o identificador interno da credencial e não
  introduz rastreamento do navegador;
- nenhuma escrita de presença, dependência externa ou ativação de gate foi
  adicionada.

### Evidência do CP3

- `npm run db:reset` — 31 migrations e seed aplicados do zero;
- `npm run db:test` — 20 arquivos e 456 testes aprovados;
- `020_event_capability_robustness` — 16 cenários aprovados, incluindo lock e 40
  replays, cota ativa/histórica, privacidade, cancelamento, kill switch e
  recuperação;
- `npm run db:lint` — nenhum aviso novo; permanecem os dois avisos preexistentes
  em `create_event_as_staff`;
- `npm run db:types` e `npm run migrations:check -- 9426857` aprovados;
- `npm run verify` — lint, typecheck, 19 arquivos/119 testes Vitest e build de
  produção aprovados;
- `npm run security:audit` — zero vulnerabilidades;
- nenhum controle ou flag foi ativado durante a entrega;
- próxima ação concreta: CP4 de experiência, verificando acessibilidade, Android,
  iPhone, navegador interno e compartilhamento real pelo WhatsApp.

## Experiência de `WP-R02-02` — CP4 parcial

- a página pública foi verificada em viewports Chrome de 360×800 e 390×844,
  cobrindo tamanhos usuais de Android e iPhone. Não houve rolagem horizontal,
  corte do título, sobreposição indevida do conteúdo ou CTA menor que 48 px;
- título longo e quebra em duas linhas também foram exercitados localmente. O
  card de data continua sobreposto ao header de forma intencional e legível;
- a árvore acessível preserva um `main`, um `h1`, progressão para `h2`, região
  nomeada pela data, link nomeado para a marca e status `aria-live=polite`;
- a auditoria encontrou o link da marca com somente 37 px de altura. O
  `BrandMark` agora garante alvo mínimo de 44×44 px e foco de teclado explícito;
- a primeira abertura em produção com fragmento canônico removeu `#c` da URL
  antes do fallback. Fragmento com parâmetro extra também foi removido e
  rejeitado com mensagem genérica, sem perder o evento público;
- o mesmo fallback foi exercitado no navegador interno controlado. Os logs
  capturados pelo navegador não exibiram a credencial usada no teste;
- nenhum gate foi ativado e nenhuma capability válida foi criada em produção.

### Evidência e pendência do CP4

- `npm run verify` — lint, typecheck, 20 arquivos/120 testes Vitest e build de
  produção aprovados;
- `npm run security:audit` — zero vulnerabilidades;
- Chrome 360×800 — largura do documento 360 px, logo 44 px e conteúdo sem
  overflow;
- Chrome 390×844 — largura do documento 390 px, logo 44 px, foco visível e CTA
  principal de 48 px;
- produção e navegador interno — fragmento removido, URL limpa e fallback
  público acessível;
- ainda falta evidência em aparelhos físicos Android e iPhone dentro do
  navegador real do WhatsApp, inclusive copiar/colar o link público. Emulação
  de viewport ou outro navegador interno não será registrada como substituta;
- CP4 permanece aberto até essa matriz manual ser executada. A próxima ação é
  testar a URL pública em WhatsApp Android e iPhone, confirmar layout, retorno,
  cópia/compartilhamento e remoção do fragmento, sem habilitar os gates.

## Contrato de `WP-R02-01` — CP1

### Dados e compatibilidade

- `events.public_id uuid not null default gen_random_uuid()` é único, imutável e
  preenchido para ocorrências existentes;
- `public_event_directory` é a nova projeção anônima por `public_id`; não expõe
  `events.id`, `team_id`, slug, local, chamada, presença, prazo ou auditoria;
- `public_team_upcoming_events` permanece inalterada nesta expansão para o app
  N−1; a retirada de `event_id` ocorrerá somente depois da migração do consumidor;
- evento agendado, cancelado ou concluído permanece consultável pelo mesmo
  `public_id`; o estado publicado é o estado persistido em `events.status`;
- o contrato é somente leitura e não introduz RPC nem evento de domínio.

### Permissões e ativação

- `anon` e `authenticated` recebem somente `SELECT` na projeção;
- tabelas base preservam RLS e grants atuais; a view não publica identificadores
  internos nem PII;
- as flags `public_event_page`, `event_capability_exchange` e
  `event_capability_rsvp` são independentes e nascem ausentes/desligadas;
- somente times com `public_event_page = true` entram na projeção, inclusive
  quando o perfil do time é privado; `teams.is_public` continua restrito ao
  diretório do time;
- esta expansão não habilita time, rota, capability ou escrita em produção.

### Ordem de deploy

1. publicar as labels do enum;
2. publicar `public_id`, trigger de imutabilidade, projeção e grants;
3. gerar tipos e validar banco;
4. somente no CP2 publicar a rota consumidora compatível com banco N e N−1;
5. ativar manualmente um time apenas no piloto, preservando a agenda atual.

### Evidência do CP1

- `npm run db:reset` — expansão e seed aplicados;
- `npm run db:test` — 17 arquivos e 379 testes aprovados;
- `npm run db:lint` — sem erro novo; permanecem dois avisos preexistentes de
  variável sombreada/não usada em `create_event_as_staff`;
- `npm run db:types` — `events.public_id`, `public_event_directory` e as três
  flags refletidas em `lib/database.types.ts`;
- `npm run migrations:check -- d1cd5b2` — somente migrations novas.
- `npm run verify` — lint, tipos, 82 testes Vitest e build aprovados.

## Caminho fino de `WP-R02-01` — CP2

- `/e/{public_id}` consulta exclusivamente `public_event_directory` e responde
  404 para UUID inválido, flag desligada, evento ausente ou contrato de banco
  N−1 ainda indisponível;
- a página mobile exibe time, título, tipo, formato, data, horário no fuso
  autoritativo, adversário opcional e estado agendado/cancelado/concluído;
- a metadata usa a mesma projeção, URL canônica limpa, `noindex` e `nofollow`;
- `/e/*` recebe `no-referrer`, `private, no-store` e `X-Robots-Tag`;
- GTM e seu fallback `noscript` não são renderizados em abertura inicial de
  `/e/*`; analytics permanece nas demais páginas;
- o CTA leva à agenda autenticada existente. Capability e RSVP pelo link
  continuam explicitamente fora desta fatia e com flags desligadas.

### Evidência do CP2

- Vitest focado — 8 testes de apresentação, compatibilidade e headers;
- inspeção anônima em 390 × 844 — sem overflow e com CTA de 48 px;
- evento seed com flag local — 200, conteúdo e metadata contextual corretos;
- evento seed sem flag — 404;
- HTML de `/e/*` — sem recurso do Google Tag Manager;
- build de produção local — `Cache-Control: private, no-store, max-age=0`,
  `Referrer-Policy: no-referrer` e `X-Robots-Tag: noindex, nofollow, noarchive`;
- `npm run verify` — 14 arquivos, 88 testes e build aprovados;
- `npm run security:audit` — zero vulnerabilidades.

## Distribuição manual de `WP-R02-01` — CP3

- o detalhe interno do evento consulta `events.public_id` somente depois de
  validar sessão, vínculo ativo e isolamento pelo `team_id`;
- organizadores veem “Copiar link público” apenas quando
  `public_event_page = true` para o time;
- o endereço copiado usa a origem canônica de `APP_URL`, preserva o UUID
  estável e não inclui identificadores internos;
- a interface oferece retorno acessível de sucesso ou falha e orienta o uso no
  WhatsApp; capability e RSVP continuam fora desta fatia.

### Evidência da distribuição manual

- Vitest focado — 9 testes de flags, apresentação, compatibilidade e headers;
- detalhe autenticado em 390 × 844 — cartão visível sem overflow quando a flag
  local está ativa;
- cópia real — área de transferência recebeu a URL canônica e a interface
  anunciou “Pronto para colar no WhatsApp”;
- flag local desligada — cartão e botão ausentes no mesmo evento;
- `npm run lint`, `npm run typecheck`, 14 arquivos/89 testes e build de
  produção aprovados;
- `npm run security:audit` — zero vulnerabilidades.

## Regressões anônimas de `WP-R02-01` — CP3

- a rota retorna o mesmo 404 para UUID inválido, evento ausente e linha
  filtrada pela flag, sem permitir enumeração;
- a fronteira de dados trata contrato ausente no banco N−1 como indisponível,
  mas não oculta falhas reais de autorização ou infraestrutura;
- eventos cancelados e encerrados permanecem informativos e sem resposta
  mutável;
- metadata contextual mantém URL canônica, `noindex`, `nofollow` e não publica
  o adversário;
- a consulta continua limitada a `public_event_directory`, sem `team_id`,
  `event_id`, local ou presença;
- a política usada pelo GTM impede analytics de terceiros em `/e` e `/e/*`,
  preservando-o nas demais jornadas.

### Evidência das regressões anônimas

- Vitest focado — 3 arquivos e 15 testes aprovados;
- `npm run verify` — lint, tipos e 16 arquivos/100 testes aprovados; o build
  exigiu apenas acesso de rede às fontes Google e passou separadamente;
- `npm run security:audit` — zero vulnerabilidades.

## Evidência do CP5 — piloto de `WP-R02-01`

- `Demo Campo` (`demo-campo`) foi selecionado como única coorte da página
  pública por possuir o evento futuro e agendado `Copa do Mundo`;
- `public_event_page` foi habilitada pela RPC `set_team_feature_flag`, executada
  sob a identidade do owner/admin ativo do time; a auditoria da própria RPC
  permaneceu como trilha da ativação;
- a expansão do retorno composto no SQL Editor repetiu a chamada idempotente
  seis vezes por etapa, gerando 18 registros de auditoria no total
  (`true`, `false`, `true`); o histórico foi preservado, o estado convergiu e a
  prevenção dessa repetição ficou registrada no backlog técnico;
- antes da ativação, `/e/fdf577af-5cc4-489f-81cb-65fac548167b` respondeu `404`;
  com a flag ativa, respondeu `200` e exibiu somente `Copa do Mundo` e
  `Demo Campo` da projeção pública;
- a resposta anônima confirmou `private, no-store`, `no-referrer`,
  `noindex`, ausência do Google Tag Manager e ausência de identificadores
  internos, local, atleta ou presença;
- o rollback foi exercitado pela mesma RPC: a flag desligada restaurou `404`;
  após a reativação, o smoke final retornou `200` novamente;
- o estado final possui um único time com `public_event_page=true`
  (`Demo Campo`) e nenhum runtime control ativo;
- `event_control=true` em `Demo Society` é uma capacidade independente,
  preexistente desde o piloto R01, e não foi alterada nesta operação;
- capability, sessão persistente e RSVP de R02 permanecem desligados e fora
  desta coorte.

### Correção visual durante o piloto

- em `390 × 844`, o header produtivo ocupava aproximadamente `328 px` e o
  cartão da agenda começava `56 px` antes do fim dele, ficando parcialmente
  encoberto pela camada verde;
- o header mobile recebeu espaçamentos menores e título de `3xl`; o resumo do
  evento passou a usar camada explícita acima do header e sobreposição reduzida
  de `32 px`;
- o teste da rota passou a proteger o header compacto e o `z-index` do conteúdo;
- teste focado com 6 casos, lint, typecheck e build de produção passaram; CI,
  Database, CodeQL, dependency review, Terraform e preview Vercel do PR também
  ficaram verdes;
- a página pública, projeção anônima, flags, headers de privacidade e fallback
  não foram alterados.

## Critérios de aceite

- [x] `AC-R02-01` — URL pública estável não depende do slug mutável do time.
- [x] `AC-R02-02` — Visitante sem credencial vê somente a projeção pública mínima.
- [ ] `AC-R02-03` — Link válido abre a resposta atual diretamente e pode ser reutilizado até revogação.
- [ ] `AC-R02-04` — Primeira abertura cria capability duradoura limitada ao evento; aparelho com identidade já verificada mantém a sessão completa sem novo OTP.
- [ ] `AC-R02-05` — Fechamento bloqueia apenas alteração de presença, não a consulta autorizada.
- [ ] `AC-R02-06` — Revogar aparelho, credencial ou vínculo remove imediatamente as permissões correspondentes.
- [ ] `AC-R02-07` — Link encaminhado, replay, concorrência e tentativa cross-tenant não criam sessão global nem ampliam o acesso além daquele evento.
- [ ] `AC-R02-08` — Depois da troca, o segredo não aparece na URL limpa, OG, analytics, logs controlados pela aplicação, histórico desnecessário ou `Referer`; visibilidade inevitável ao provedor é documentada no threat model e no DPA.
- [ ] `AC-R02-09` — Fluxo passa em Android, iPhone, navegador interno e navegador padrão, inclusive retorno em outro dia.
- [x] `AC-R02-10` — Evento cancelado permanece informativo e não aceita resposta.

## Riscos e controles

| Risco | Controle | Evidência |
|---|---|---|
| Link encaminhado vira identidade global | capability limitada ao evento; identidade completa só após OTP/sessão verificada | `AC-R02-04`, `07` |
| Segredo vaza antes do redirect | transporte aprovado no threat model, troca antes de terceiros e testes de unfurl/log/cache | `AC-R02-08` |
| Retry cria respostas ou sessões divergentes | troca e RSVP idempotentes, rotação atômica e testes concorrentes | `AC-R02-03`, `07` |
| BID não reivindicado fica sem caminho | contrato explícito de `DEC-UNCLAIMED-IDENTITY` | `AC-R02-03`, `04` |
| Troca de slug quebra mensagens antigas | identificador público independente e redirect compatível | `AC-R02-01` |
| Cancelamento mantém ação mutável | autorização server-side por fase/status | `AC-R02-05`, `10` |

## Validação

- WP-R02-01 usa `VAL-PUBLIC` + `VAL-DB`;
- WP-R02-02 e 03 usam `VAL-LINK` + `VAL-DB`;
- WP-R02-04 usa `VAL-LINK` + `VAL-PUBLIC` e E2E em Android/iPhone;
- testar primeira abertura, retorno, navegador interno, navegador padrão, link encaminhado, aparelho novo, revogação, evento cancelado e cross-tenant;
- registrar evidência de que Open Graph e crawlers recebem somente a URL pública limpa.

## Rollout, fallback e rollback

- ativar primeiro para um time de teste;
- separar flags de página pública, troca da capability e RSVP para não transformar R02 em um único ponto de falha;
- compartilhamento manual é o caminho primário desta release;
- confirmação autenticada atual permanece disponível durante o piloto;
- flag desliga ações personalizadas sem remover a URL pública;
- migration é aditiva e tolera app anterior;
- revogação global é o kill switch para incidente de credencial.
