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
verified_at: d1cd5b2
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
