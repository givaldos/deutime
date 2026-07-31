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

## Experiência de `WP-R02-02` — CP4 concluído

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
- em 29/07/2026, a URL pública foi enviada manualmente pelo WhatsApp e
  validada em aparelhos físicos Android e iPhone, tanto no navegador interno
  quanto no Chrome/Safari. Layout, retorno à conversa, reabertura,
  cópia/compartilhamento e abertura no navegador padrão foram confirmados;
- o link com fragmento sintético também foi aberto fisicamente e `#c` sumiu da
  URL, preservando a página pública e o fallback genérico;
- nenhum gate foi ativado e nenhuma capability válida foi criada em produção.

### Evidência do CP4

- `npm run verify` — lint, typecheck, 20 arquivos/120 testes Vitest e build de
  produção aprovados;
- `npm run security:audit` — zero vulnerabilidades;
- Chrome 360×800 — largura do documento 360 px, logo 44 px e conteúdo sem
  overflow;
- Chrome 390×844 — largura do documento 390 px, logo 44 px, foco visível e CTA
  principal de 48 px;
- produção e navegador interno — fragmento removido, URL limpa e fallback
  público acessível;
- Android físico — WhatsApp e Chrome aprovados, sem sobreposição ou perda de
  navegação;
- iPhone físico — WhatsApp e Safari aprovados, sem sobreposição ou perda de
  navegação;
- cópia, compartilhamento, retorno à conversa, reabertura e remoção do
  fragmento foram confirmados pelo operador;
- CP4 está concluído sem habilitar gates. O retorno com capability válida após
  intervalo de outro dia continua pertencendo a `AC-R02-09`/`WP-R02-04` e não
  foi inferido deste teste visual com fragmento sintético.

## Preparação operacional de `WP-R02-02` — CP5 parcial

- o smoke produtivo continua estritamente anônimo e somente leitura, mas agora
  aceita `SMOKE_PUBLIC_EVENT_ID` para cobrir a página do evento e o endpoint de
  troca sem enviar credencial;
- a página precisa responder HTML com `no-store`, `no-referrer` e `noindex`. O
  endpoint `/access` precisa rejeitar `GET` com `405`, preservar `no-referrer`
  e declarar `nosniff`;
- o UUID do evento de demonstração foi registrado como variável não secreta no
  Environment `production`; nenhum identificador interno, atleta, telefone ou
  chave privilegiada foi adicionado ao workflow;
- a ausência da variável mantém o smoke mínimo anterior, evitando quebrar
  instalações locais ou a aplicação N−1. Valor não canônico falha antes de
  qualquer requisição;
- falha dessa jornada torna o check `smoke-production-readonly` vermelho e
  impede ativação ou ampliação do piloto. O fallback permanece a página pública
  e o rollback operacional continua sendo desligar primeiro
  `event_capability_exchange` global e depois a flag do time, sem contração de
  banco;
- o comando com `APP_URL=https://deutime.app` e o evento de demonstração passou
  antes do merge, incluindo a rejeição `405`;
- `npm run verify` — lint, typecheck, 21 arquivos/124 testes Vitest e build de
  produção aprovados;
- `npm run security:audit` — zero vulnerabilidades;
- nenhum gate foi ativado, nenhuma escrita foi feita em produção e CP5 não está
  concluído: faltam a escolha explícita da coorte e a observação real do
  piloto.

## Ready de `WP-R02-03` — CP0

### Resultado demonstrável

O atleta com acesso reconhecido abre `/e/{public_id}`, vê sua resposta atual e
altera para SIM, NÃO ou TALVEZ sem sair da página. A mudança pode ser repetida
enquanto evento, prazo, chamada, vínculo e gates permitirem. Após fechamento,
início, cancelamento ou conclusão, o contexto autorizado e a resposta atual
continuam visíveis, mas os controles ficam indisponíveis e nenhuma escrita
ocorre.

O mesmo resultado atende tanto a capability limitada de atleta não reivindicado
quanto a sessão Supabase inventariada de atleta reivindicado. A confirmação
autenticada existente em `/me/agenda` e `/t/{slug}` permanece como fallback e
continua usando `respond_to_event_as_player`.

### Dependências e decisões

- `WP-R02-01` fornece a URL pública estável e `WP-R02-02` fornece a resolução
  server-side do atleta-evento por capability ou sessão verificada;
- `DEC-REPEATABLE-RSVP` preserva alterações sucessivas enquanto a janela estiver
  aberta. `event_attendance` continua sendo a única fonte da resposta;
- `DEC-UNCLAIMED-IDENTITY` permite a escrita pela capability sem criar usuário,
  perfil ou sessão global. Reivindicação posterior preserva o mesmo
  `athlete_id` e sua resposta;
- `DEC-PERSISTENT-ACCESS` exige que vínculo, fase, prazo, chamada e revogação
  sejam recalculados na própria mutação; estado renderizado no cliente nunca
  autoriza a escrita;
- CP1 e o caminho fino local podem avançar com os gates desligados. Ativação
  produtiva depende das pendências físicas e operacionais de `WP-R02-02`.

### Fronteira de identidade e escrita

- o formulário envia somente `public_id` e um status entre `confirmed`,
  `declined` e `maybe`. Não aceita `team_id`, `event_id`, `athlete_id`,
  `responded_by`, segredo ou origem declarada pelo cliente;
- a Server Action valida e delega. Uma RPC transacional separada deriva o
  escopo do cookie `HttpOnly` ou da sessão verificada, trava a linha de presença
  e revalida os dois gates de acesso, a flag `event_capability_rsvp`, atleta
  ativo, chamada existente, evento agendado e futuro e prazo aberto;
- quando cookie e sessão verificada coexistirem, a capability válida exibida
  continua sendo o escopo da jornada. A sessão só é fallback se a capability
  estiver ausente ou inválida; a RPC repete essa precedência para evitar
  diferença entre leitura e escrita;
- `responded_by` recebe o usuário verificado somente quando ele for o
  `user_id` atual do mesmo `athlete_id`. Link encaminhado para outro usuário
  mantém `responded_by` nulo e não associa identidade alheia ao atleta;
- retry da mesma resposta converge para o mesmo estado. Alteração posterior é
  permitida, atualiza `responded_at` e não cria linha, identidade ou resposta
  paralela;
- falha, gate desligado, expiração, revogação, cross-evento ou cross-tenant
  retornam mensagem genérica e preservam a página pública. Nenhum caso revela
  se atleta, chamada, capability ou sessão existem.

### Estados, riscos e recuperação

- somente `confirmed`, `declined` e `maybe` são aceitos. `pending` e
  `waitlisted` não podem ser produzidos por esta jornada;
- evento `cancelled` ou `completed`, horário iniciado ou prazo encerrado bloqueia
  mutação, mas não a consulta já autorizada; isso preserva `AC-R02-05` e
  `AC-R02-10`;
- concorrência entre respostas, revogação, fechamento e reivindicação será
  serializada no banco. O resultado nunca atravessa atleta, evento ou time;
- logs e auditoria podem registrar IDs internos não secretos, fonte efetiva e
  resultado, mas nunca cookie, credencial, telefone, token Auth ou conteúdo do
  link;
- desligar `event_capability_rsvp` remove somente os controles de resposta. Em
  incidente de credencial, o controle global `event_capability_exchange`
  também corta resolução e escrita, preservando URL pública e confirmação
  autenticada legada;
- ficam fora deste pacote envio pelo WhatsApp, RSVP administrativo, comentários,
  votos, escalação e qualquer refatoração ampla das Actions existentes.

### Entry points e matriz mínima

- consumidor: `app/e/[publicId]/page.tsx`, nova Server Action estreita e
  `lib/data/event-access.ts`;
- contratos preservados: `app/me/actions.ts`, `app/t/[slug]/actions.ts` e
  `respond_to_event_as_player`;
- expansão forward-only: nova RPC de resposta por acesso reconhecido, tipos e
  pgTAP; nenhuma alteração retroativa nas migrations aplicadas;
- validar capability reivindicada e não reivindicada, sessão verificada,
  repetição e mudança de status; negar status inválido, cookie fixado, link
  encaminhado com atribuição falsa, revogado, expirado, prazo fechado, evento
  iniciado/cancelado/concluído, atleta inativo, fora da chamada, outro evento,
  outro time e gates desligados;
- provar concorrência entre resposta/revogação/reivindicação, grants mínimos,
  ausência de escrita direta e ausência de segredo/PII em auditoria.

### Evidência do CP0

- baseline `BASE-ATTENDANCE`, decisões `DEC-REPEATABLE-RSVP`,
  `DEC-UNCLAIMED-IDENTITY` e `DEC-PERSISTENT-ACCESS` confrontadas com a RPC
  autenticada existente e com os resolvers de `WP-R02-02`;
- resultado, dependências, escopo, precedência de identidade, estados de falha,
  riscos, fallback, rollback, entry points e matriz mínima estão fechados;
- `npm run verify` — lint, typecheck, 21 arquivos/124 testes Vitest e build de
  produção aprovados;
- `npm run security:audit` — zero vulnerabilidades;
- não houve alteração de banco, aplicação, flag ou produção;
- próxima ação concreta: CP1 com assinatura da RPC, lock, atribuição de
  `responded_by`, auditoria, matriz RLS/pgTAP e compatibilidade N/N−1.

## Contrato de `WP-R02-03` — CP1

### Modelo, identidade e transação

- `event_attendance` permanece a única fonte de resposta; nenhuma tabela,
  identidade convidada ou estado paralelo foi criado;
- `respond_to_event_from_access(public_id, status, capability_secret?)` aceita
  somente o UUID público, `confirmed`/`declined`/`maybe` e o segredo obtido
  server-side do cookie `HttpOnly`;
- a RPC tenta primeiro uma capability válida. Somente capability ausente,
  inválida, expirada ou revogada permite fallback para a sessão Supabase
  verificada e inventariada;
- a consulta trava capability, credencial, evento, atleta, presença, inventário
  e gates relevantes. Antes do `UPDATE`, recalcula tenant, chamada, vínculo
  ativo, evento agendado/futuro, prazo, expirações, revogações,
  `public_event_page`, `event_capability_exchange`, controle global e
  `event_capability_rsvp`;
- retry converge na mesma linha `(event_id, athlete_id)` e mudanças sucessivas
  continuam permitidas enquanto a janela estiver aberta. `source` permanece
  `web` e `responded_at` acompanha a última resposta válida;
- `responded_by` recebe o usuário somente quando a sessão verificada pertence ao
  mesmo `athlete_id`. Uma capability encaminhada preserva precedência, atualiza
  somente seu atleta e mantém `responded_by` nulo.

### Permissões e auditoria

- `anon` e `authenticated` recebem apenas `EXECUTE` na nova RPC; nenhum papel
  cliente ganha `UPDATE` direto em `event_attendance` ou leitura das tabelas de
  segredo/inventário;
- status fora de SIM/NÃO/TALVEZ falha `22023`. Acesso, tenant, gate, vínculo,
  prazo, fase, expiração e revogação inválidos compartilham o erro genérico
  `42501`, sem confirmar a existência do atleta ou da capability;
- a auditoria explícita registra status, fonte efetiva e UUID não secreto da
  capability, quando aplicável. Cookie, credencial, telefone e token Auth ficam
  fora;
- `private.current_audit_actor()` permite à RPC sobrescrever apenas o ator da
  auditoria genérica durante a mutação. O comportamento anterior permanece
  idêntico fora desse escopo e o override é restaurado antes do retorno;
- o teste de link encaminhado prova que nem `responded_by`, nem a auditoria
  explícita, nem o trigger genérico atribuem a resposta ao usuário logado de
  outro atleta.

### Compatibilidade, fallback e rollback

- `202607290005_event_capability_rsvp_contract.sql` é uma expansão forward-only
  de funções e grants. Banco N tolera app N−1, que nunca chama a RPC;
- o consumidor CP2 deve tratar função ausente no banco N−1 como feature
  indisponível e manter a página reconhecida somente leitura com CTA para
  `/me/agenda`;
- `event_capability_rsvp` continua ausente/desligada para todos os times e a
  migration não altera `runtime_controls`, flags ou dados remotos;
- desligar somente `event_capability_rsvp` interrompe a escrita nova e preserva
  leitura/capability. Incidente de credencial também pode desligar o controle
  global `event_capability_exchange`;
- a confirmação autenticada existente por `respond_to_event_as_player` foi
  revalidada e mantém autorização, resposta e auditoria anteriores;
- rollback de app não exige contração; eventual correção de banco será outra
  migration forward-only.

### Evidência do CP1

- `npm run db:reset` — 30 migrations e seed aplicados do zero;
- `npm run db:test` — 21 arquivos e 494 testes aprovados; o novo arquivo cobre
  38 cenários de grants, gates, capability reivindicada/não reivindicada,
  sessão verificada, encaminhamento, repetição, cross-tenant, expiração,
  revogação, prazo, cancelamento, auditoria e fallback legado;
- `npm run db:lint` — nenhum aviso novo; permanecem os dois avisos preexistentes
  de variável sombreada/não usada em `create_event_as_staff`;
- `npm run db:types` — nova RPC refletida em `lib/database.types.ts`;
- `npm run migrations:check -- 50a6a08` — histórico preservado e somente a
  expansão `202607290005` adicionada;
- `npm run verify` — lint, typecheck, 21 arquivos/124 testes Vitest e build de
  produção aprovados;
- `npm run security:audit` — zero vulnerabilidades;
- nenhum gate foi ativado e nenhum banco remoto foi alterado;
- próxima ação concreta: CP2 com Server Action estreita e controles
  SIM/NÃO/TALVEZ na página reconhecida, tolerando banco N−1.

## Caminho fino de `WP-R02-03` — CP2

### Jornada e fronteiras

- a página reconhecida renderiza SIM, NÃO e TALVEZ somente quando
  `can_respond=true`, valor derivado server-side pelos gates de página, troca e
  RSVP, controle global, chamada, vínculo, fase e prazo;
- o formulário envia exclusivamente `publicId` e um status permitido. A Server
  Action valida esses dois valores e delega ao DAL; não aceita time, evento
  interno, atleta, origem, ator ou segredo;
- o DAL lê a capability apenas do cookie `HttpOnly` com escopo do evento. Sem
  cookie válido, a mesma chamada permite que a RPC use a sessão Supabase
  verificada como fallback;
- sucesso atualiza o estado anunciado na própria página e revalida somente a
  URL pública. Retry e alteração sucessiva continuam convergindo na linha única
  protegida pelo contrato CP1;
- função ausente no banco N−1, gate fechado ou acesso não mais válido convertem
  a interface em somente leitura, preservam a resposta atual e exibem o CTA
  para `/me/agenda`. Falha transitória mantém os controles para nova tentativa;
- mensagens de falha não distinguem capability, atleta, chamada, time ou gate.
  Logs estruturados registram somente fronteira, resultado e código; segredo e
  mensagem bruta do provedor não são emitidos.

### Interface e fallback

- os três alvos possuem `56 px` de altura em `390 × 844`, estado selecionado
  com `aria-pressed`, bloqueio durante envio e retorno em região viva;
- a resposta reconhecida permanece visível quando o evento fecha ou a flag é
  desligada; somente os controles mutáveis desaparecem;
- a página pública anônima, o bootstrap de troca, a confirmação autenticada
  legada e o banco não foram alterados nesta fatia;
- `event_capability_rsvp` continua desligada em produção. O teste físico usou
  apenas uma coorte fictícia no Supabase local e terminou com a flag local
  desligada.

### Evidência do CP2

- Vitest focado — contratos, DAL, Action, componente e rota pública aprovados;
- `npm run db:reset` — 30 migrations e seed aplicados do zero;
- `npm run db:test` — 21 arquivos e 494 testes pgTAP aprovados;
- `npm run db:lint` — nenhum aviso novo; permanecem dois avisos preexistentes
  em `create_event_as_staff`;
- `npm run db:types` — contrato gerado permaneceu sem diferença;
- `npm run migrations:check -- 64a8bc0` — histórico preservado;
- teste físico local em `390 × 844` — sem overflow horizontal, botões de
  `56 px`, troca segura da credencial e respostas Confirmado → Não vou → Talvez;
- banco local após duas mutações — uma linha de presença, `status=maybe`,
  `source=web`, `responded_by` nulo para capability não reivindicada e duas
  auditorias sem o segredo;
- flag local desligada — resposta Talvez preservada, controles ausentes e CTA
  para a agenda;
- `npm run verify` — lint, typecheck, 24 arquivos/144 testes Vitest e build de
  produção aprovados;
- `npm run security:audit` — zero vulnerabilidades.

## Robustez de `WP-R02-03` — CP3

### Estado obsoleto e concorrência

- uma mutação recusada por revogação, expiração, fechamento, gate ou contrato
  N−1 agora revalida imediatamente `/e/{public_id}` antes de devolver o
  fallback. Se o acesso deixou de existir, nome, resposta e controles
  reconhecidos saem da árvore renderizada; se somente a escrita fechou, a
  resposta atual permanece em modo somente leitura;
- o componente é identificado por `public_id`, resposta persistida e
  `can_respond`. Mudança concorrente em outra aba, revogação ou fechamento
  remonta o estado local com os valores autoritativos recebidos do servidor,
  sem preservar seleção anterior da Action;
- durante envio, o `fieldset` inteiro fica indisponível. A RPC continua
  serializando respostas concorrentes na linha única de presença; retry e
  mudança sucessiva preservam a regra de última mutação transacionada;
- capability encaminhada mantém precedência mesmo quando há outra conta
  verificada no navegador. O cliente nunca lê identidade ou segredo, e a
  atribuição falsa continua bloqueada pelo contrato CP1.

### Acessibilidade, falhas e observabilidade

- SIM, NÃO e TALVEZ estão agrupados em `fieldset` com legenda acessível, estado
  em `aria-pressed`, foco visível, `aria-busy` durante envio e retornos
  atômicos em regiões vivas;
- falha transitória preserva os controles para retry; falha fechada troca para
  o CTA da agenda sem distinguir atleta, capability, chamada, time ou gate;
- códigos externos entram no log somente quando respeitam uma allowlist curta
  de caracteres e tamanho. Valor inesperado vira `unknown`; mensagem bruta,
  cookie, telefone e credencial permanecem ausentes;
- retorno da RPC diferente do status solicitado é tratado como quebra de
  contrato, não atualiza a seleção e gera somente o evento redigido
  `respond_result/invalid_result`.

### Evidência do CP3

- Vitest focado — 4 arquivos/37 testes de DAL, Action, componente e rota;
- cenários do consumidor — capability revogada e expirada, banco N−1,
  fechamento/cancelamento, contexto removido, link encaminhado sobre outra
  sessão, código externo malformado e retorno divergente da RPC;
- `npm run verify` — lint, typecheck, 24 arquivos/151 testes Vitest e build de
  produção aprovados;
- `npm run security:audit` — zero vulnerabilidades;
- nenhuma migration, grant, flag ou dado remoto foi alterado;
- a repetição física local de revogação não foi usada como evidência porque o
  Docker Desktop não iniciou; o teste CP2 de 390 × 844 permanece válido e o
  banco será revalidado pelo workflow Database da PR.

## Experiência de `WP-R02-03` — CP4 em andamento

- `Demo Campo` foi mantido como única coorte do piloto. O controle global
  `event_capability_exchange` e as flags do time
  `event_capability_exchange`/`event_capability_rsvp` foram habilitados pelas
  RPCs auditadas; os demais times não foram alterados;
- uma credencial estreita foi emitida para o único atleta demo elegível na
  chamada. A primeira abertura removeu `#c` antes da troca e exibiu o contexto
  reconhecido de Neymar sem manter o segredo na URL;
- SIM, NÃO e TALVEZ foram persistidos em sequência em produção. Cada retorno
  refletiu o valor autoritativo e a reabertura pela URL limpa preservou a última
  resposta;
- a árvore acessível expôs um único grupo “Responder presença neste evento”,
  legenda, `aria-pressed` e ordem de tabulação marca → SIM → NÃO → TALVEZ. Os
  três alvos mediram 56 px de altura;
- a credencial usada no primeiro teste foi revogada pela RPC operacional. O
  aparelho perdeu imediatamente nome, resposta e controles, voltando ao
  fallback público sem revelar a causa;
- uma nova credencial foi emitida e aberta como aparelho novo. O acesso foi
  recuperado, a resposta “Talvez” reapareceu e a URL voltou a ficar limpa;
- canonical e `og:url` permaneceram na URL pública sem fragmento. Os logs
  capturados pelo navegador não continham a credencial;
- o smoke produtivo somente leitura concluiu sem erro. O reteste físico passou
  em Android e iPhone: a primeira resposta “Sim”, o fechamento e a reabertura
  pelo WhatsApp e a abertura no navegador padrão preservaram o contexto e a
  resposta autoritativa;
- o primeiro teste em aparelho físico revelou que a confirmação aparecia
  somente depois dos cartões de data e detalhes, exigindo rolagem. A correção
  promove o cartão reconhecido — nome, resposta atual e SIM/NÃO/TALVEZ — ao
  primeiro bloco após o cabeçalho, sem alterar a ordem do fallback anônimo. Um
  teste de estrutura impede que a confirmação volte a ficar abaixo da data. O
  reteste confirmou o RSVP no topo em ambos os aparelhos;
- resta somente repetir o retorno em outro dia para encerrar o CP4 e
  `AC-R02-09`; essa evidência temporal não pode ser substituída por emulação.

## Preparação operacional de `WP-R02-03` — CP5

- `get_event_capability_pilot_health(team_id)` oferece uma leitura agregada e
  `security definer` somente para `service_role`. `anon` e `authenticated` não
  recebem `EXECUTE`;
- o contrato expõe os três gates, credenciais/capabilities ativas, sessões
  criadas e revogadas em 24 horas, RSVPs em 24 horas e datas da última troca e
  resposta. Nome, telefone, atleta, evento, sessão, hash, cookie e credencial
  não entram no retorno;
- time inexistente não produz linha e todas as contagens filtram
  `requested_team_id`, incluindo auditoria. O teste cross-tenant prova que
  métricas e flags de outra coorte não vazam;
- `npm run pilot:rsvp:health` chama somente essa RPC, valida UUID e contrato,
  redige o corpo de erro remoto e falha fechado quando
  `EXPECT_RSVP_PILOT_ENABLED=true` e qualquer gate estiver desligado;
- a migration é uma expansão aditiva, sem tabela, policy ou dado remoto novo.
  O consumidor anterior e a ordem app/banco permanecem compatíveis;
- `npm run db:reset` aplicou 31 migrations e o seed local;
- `npm run db:test` aprovou 22 arquivos/510 testes pgTAP;
- `npm run db:lint` preservou somente os dois avisos preexistentes de
  `create_event_as_staff`; tipos foram regenerados com apenas a nova RPC;
- `npm run migrations:check -- e23767a`, `npm run verify` (25 arquivos/155
  testes) e `npm run security:audit` passaram;
- a migration `202607300001_event_capability_pilot_health.sql` foi aplicada em
  produção pelo workflow `Deploy database`. A primeira observação de
  `Demo Campo` encontrou os três gates ativos, 1 credencial ativa, 3
  capabilities ativas, 4 criações, 1 revogação e 3 RSVPs nas últimas 24 horas;
- o primeiro uso do comando revelou que scripts Node não carregavam os arquivos
  `.env` automaticamente. O follow-up carrega `.env`/`.env.local` quando
  presentes, preserva variáveis explícitas e aceita também os UUIDs sintéticos
  usados pelo seed; o fluxo completo passou contra o Supabase local;
- o rollback estreito desligou somente `event_capability_rsvp`. O acesso
  reconhecido e a resposta “Talvez” permaneceram visíveis, os três controles
  desapareceram e o CTA para a agenda assumiu o fallback;
- o rearme reativou a mesma flag e o reload restaurou SIM/NÃO/TALVEZ sem nova
  credencial. A leitura final confirmou novamente os três gates ativos;
- PRs `#52` e `#53`, CI, CodeQL, Database, dependency review, Terraform e
  previews Vercel foram aprovados. A confirmação física do CP4 continua
  pendente e não é inferida destas métricas.

## Ready de `WP-R02-04` — CP0

### Resultado demonstrável

O mesmo link personalizado abre com metadata pública limpa, remove a credencial
antes da jornada, não a envia por `Referer`, cache, analytics ou recursos de
terceiros e mantém o acesso limitado ao evento em replay, encaminhamento e
retorno. Android e iPhone devem passar no navegador interno do WhatsApp e no
navegador padrão, inclusive depois de fechar e reabrir o link.

### Baseline comprovado e lacunas reais

- `/e/{public_id}` já publica canonical e Open Graph somente com a projeção
  pública mínima, responde `noindex`, `no-referrer` e `private, no-store` e não
  carrega analytics de terceiros;
- o bootstrap aceita somente `#c`, limpa o fragmento antes do `POST`
  same-origin e nunca reflete a credencial no HTML ou em mensagens;
- `/access` limita corpo e tipo, rejeita origem cruzada, devolve erro genérico e
  instala cookie `Secure`, `HttpOnly`, `SameSite=Lax` restrito ao evento;
- pgTAP e Vitest já cobrem replay, concorrência, encaminhamento, revogação,
  expiração, cross-evento, cross-tenant, sessão verificada e fechamento do
  evento. O piloto comprovou URL limpa, metadata limpa, logs redigidos,
  rollback e rearme;
- o teste físico encontrou somente a ordem tardia do cartão RSVP. A correção
  publicada no PR `#55` foi confirmada em produção no Android e no iPhone;
- falta consolidar a evidência de `AC-R02-04`, `05` e `07`, registrar no
  checklist do fornecedor que o provedor de WhatsApp vê necessariamente o link
  personalizado e concluir `AC-R02-08` sem prometer anonimato contra o
  provedor;
- a matriz imediata de `AC-R02-09` passou em Android, iPhone, navegador interno
  e navegador padrão. Permanece somente o retorno em outro dia, que não pode
  ser inferido de emulação desktop.

### Escopo, fronteiras e compatibilidade

- não há migration, tabela, RPC, flag, integração externa ou novo dado para
  criar neste pacote; os contratos de `WP-R02-01` a `03` permanecem
  autoritativos;
- entram somente regressões de metadata/headers/transporte que ainda faltarem,
  matriz de dispositivos, evidência do fornecedor e correções de experiência
  encontradas no teste físico;
- ficam fora automação de envio, template do WhatsApp, webhook, comentário,
  voto, escalação, geolocalização, fingerprinting e coleta de user agent;
- nenhuma evidência pode armazenar credencial, cookie, telefone ou identificador
  de capability. Capturas usam URL limpa e dados demo;
- app N continua compatível com banco N−1. Falha em metadata, capability ou
  sessão cai na página pública ou agenda atual, sem escrita implícita;
- o rollout continua restrito a `Demo Campo`; rollback usa as flags já
  exercitadas e preserva URL pública e presença registrada.

### Matriz mínima e gates

| Cenário | Evidência automática | Evidência física |
|---|---|---|
| primeira abertura | fragmento limpo antes da troca; cookie restrito; nenhuma sessão global | WhatsApp interno em Android e iPhone |
| retorno pelo endereço limpo | capability ou sessão verificada resolve o mesmo evento | fechar/reabrir no mesmo navegador e repetir em outro dia |
| abrir no navegador padrão | mesmo contrato de URL, cookie e headers | “Abrir no navegador” em Android e iPhone |
| link encaminhado/replay | escopo atleta-evento, concorrência e cross-tenant | aparelho novo continua limitado ao evento |
| metadata/unfurl | canonical/OG limpos, GET sem troca e sem terceiros | preview não revela nome/resposta do atleta |
| revogação/fechamento | autorização recalculada, resposta somente leitura e fallback | reload perde ação sem perder a página pública |

O gate `VAL-LINK` exige as regressões focadas existentes e o banco completo
somente se houver mudança em contrato persistido. `VAL-PUBLIC` exige teste da
rota/metadata, headers, ausência de terceiros e smoke anônimo. A matriz física
precisa registrar aparelho, sistema, superfície, primeira abertura, retorno e
resultado, sem copiar o link secreto.

### Evidência do CP0

- `DEC-PERSISTENT-ACCESS`, `DEC-EVENT-PUBLIC-MINIMUM`, `docs/security.md`,
  bootstrap, Route Handler, headers, metadata e suítes de capability foram
  confrontados com o estado publicado;
- resultado, fronteiras, riscos, dados proibidos, fallback, rollout, matriz de
  dispositivos e perfis `VAL-LINK`/`VAL-PUBLIC` estão fechados;
- não houve mudança de banco, gates, credenciais ou produção;
- próxima ação concreta: CP1 documental e de regressão, consolidando a matriz
  de evidências de `AC-R02-04`, `05`, `07` e `08` e o registro mínimo do
  fornecedor antes do reteste físico de `AC-R02-09`.

## Contrato de `WP-R02-04` — CP1

Nenhum contrato persistido novo foi necessário. Este checkpoint consolidou as
garantias já publicadas e acrescentou regressões estreitas onde a relação entre
metadata pública e contexto privado ainda estava implícita.

### Matriz de aceite e evidências

| Critério | Garantia | Evidência |
|---|---|---|
| `AC-R02-04` | troca cria capability duradoura restrita ao evento; sessão Supabase verificada resolve o atleta do evento sem novo OTP e não atravessa chamada ou vínculo | `018_event_capability_contract`, `019_verified_event_access`, `event-access.test.ts` e teste da rota pública com aparelho verificado |
| `AC-R02-05` | cancelamento/fechamento mantém contexto e resposta atuais, mas força `can_respond=false` e oferece a agenda como fallback | `020_event_capability_robustness`, `021_event_capability_rsvp_contract`, testes de `EventAccessAttendance` e da página pública |
| `AC-R02-07` | replay serializa na credencial, limita sessões e histórico, encaminhamento permanece capability atleta-evento e cross-evento/cross-tenant falha fechado | `018_event_capability_contract`, `020_event_capability_robustness`, `021_event_capability_rsvp_contract` e `event-access.test.ts` |
| `AC-R02-08` | fragmento é removido antes do POST; canonical/OG nunca consultam contexto privado; endpoint responde sem credencial, `no-store`, `no-referrer`, `nosniff` e cookie restrito; logs e auditoria são redigidos | testes de contrato, metadata, headers, Route Handler, DAL, smoke produtivo e registro do fornecedor em `docs/security.md` |

### Exposição ao fornecedor

- o DPA vigente da Twilio trata corpo, destinatário, logs e demais dados da
  comunicação como dados do cliente e integra o acordo de uso. LGPD e
  transferência internacional constam no instrumento;
- os termos específicos da Twilio submetem WhatsApp Business Platform também
  aos termos da WhatsApp LLC/Meta, e a lista vigente de suboperadores identifica
  Meta no canal WhatsApp;
- Twilio/Meta conhecem necessariamente o link completo enviado, inclusive o
  fragmento. O produto não promete anonimato contra o canal; minimização,
  capability estreita, expiração e revogação limitam o impacto depois do envio;
- `docs/security.md` registra categorias, finalidade, minimização, salvaguardas
  e gates para sair de dados demo. Antes de atletas reais, o controlador ainda
  precisa confirmar consentimento/base legal, entidade contratante, retenção,
  termos vigentes e avisos de suboperadores.

### Regressões e compatibilidade

- metadata agora prova que `generateMetadata` não consulta
  `getEventAccessContext` e não incorpora nome ou presença privados mesmo se o
  mock disponibilizar esse contexto;
- a troca prova explicitamente `Referrer-Policy: no-referrer`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` e ausência da
  credencial de entrada em todos os headers;
- não houve migration, mudança de RPC, dependência, variável, flag ou payload.
  App N/banco N−1, fallback público e rollout do piloto permanecem inalterados;
- Vitest focado aprovou 4 arquivos/38 testes. `npm run verify` aprovou lint,
  typecheck e 25 arquivos/155 testes; o build foi repetido com rede apenas para
  obter as fontes do Google e concluiu;
- `AC-R02-04`, `05`, `07` e `08` ficam concluídos para o escopo demo da R02.
  O uso com atletas reais continua sujeito aos gates gerais de privacidade;
- próxima ação concreta: CP2/CP4 de dispositivos, repetindo a matriz física
  após a correção do RSVP no topo para concluir `AC-R02-09`.

### Correção de primeiro acesso pelo WhatsApp

Em 31/07/2026, o erro `otp_disabled` em `/auth/login` foi isolado de
configuração do provedor: no projeto produtivo, cadastro global, Phone, Twilio
e confirmação de telefone estavam habilitados. O erro ocorre quando o telefone
ainda não possui identidade e o login, corretamente, usa
`shouldCreateUser: false`.

A tela passou a explicar que o número precisa fazer o primeiro acesso pelo
cadastro público do time. Quando o login nasceu em `/t/{slug}/cadastro`, oferece
retorno direto às opções de acesso. O login continua sem criar identidades
silenciosamente; o cadastro público segue como único caminho com
`shouldCreateUser: true`, coleta dos dados e confirmação do WhatsApp.

O helper possui regressões para número sem identidade, limites, OTP inválido e
restrição do retorno ao cadastro público. `npm run verify` aprovou lint,
typecheck e 26 arquivos/158 testes; o build foi repetido com rede apenas para
obter as fontes do Google e concluiu.

Depois do deploy, o operador concluiu em aparelho físico o cadastro com OTP,
viu o estado “Aguardando” até a aprovação administrativa e entrou novamente em
`/auth/login` com o mesmo WhatsApp. O fluxo não repetiu `otp_disabled`. O
hotfix fica validado; essa evidência não substitui a matriz Android/iPhone do
link de evento exigida por `AC-R02-09`.

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

### Consistência visual do perfil público

- `/p/{handle}` passou a reutilizar a hierarquia visual mobile da página pública
  do evento: marca, identidade e estado no header compacto; conteúdo em camada
  explícita acima do fundo e sobreposição limitada a `32 px`;
- foto, nome, identificador e selo de verificação permanecem visíveis no
  resumo; biografia, estatísticas e posições foram separadas em superfícies
  equivalentes às de `/e/{public_id}`;
- contrato de dados, projeção pública, autorização e informações exibidas não
  foram alterados;
- teste de rota protege a composição compacta, o `z-index`, a sobreposição e a
  permanência das informações públicas;
- Vitest focado com 11 casos, lint, typecheck e build de produção passaram.

## Critérios de aceite

- [x] `AC-R02-01` — URL pública estável não depende do slug mutável do time.
- [x] `AC-R02-02` — Visitante sem credencial vê somente a projeção pública mínima.
- [x] `AC-R02-03` — Link válido abre a resposta atual diretamente e pode ser reutilizado até revogação.
- [x] `AC-R02-04` — Primeira abertura cria capability duradoura limitada ao evento; aparelho com identidade já verificada mantém a sessão completa sem novo OTP.
- [x] `AC-R02-05` — Fechamento bloqueia apenas alteração de presença, não a consulta autorizada.
- [x] `AC-R02-06` — Revogar aparelho, credencial ou vínculo remove imediatamente as permissões correspondentes.
- [x] `AC-R02-07` — Link encaminhado, replay, concorrência e tentativa cross-tenant não criam sessão global nem ampliam o acesso além daquele evento.
- [x] `AC-R02-08` — Depois da troca, o segredo não aparece na URL limpa, OG, analytics, logs controlados pela aplicação, histórico desnecessário ou `Referer`; visibilidade inevitável ao provedor é documentada no threat model e no DPA.
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
