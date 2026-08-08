---
id: R06
type: vertical
status: completed
outcome: "Permitir que participantes elegíveis conversem na súmula por tempo limitado, com autoria, denúncia e moderação privadas."
depends_on:
  - R02
  - R04
baseline:
  - BASE-IDENTITY
  - BASE-ATTENDANCE
  - BASE-WRITES
verified_at: "d2fdc83"
decisions:
  - DEC-MATCH-CONVERSATION
  - DEC-CONVERSATION-LIFETIME
  - DEC-ANONYMOUS-RETENTION
  - DEC-PERSISTENT-ACCESS
invariants:
  - INV-MOBILE-WHATSAPP-FIRST
  - INV-RLS-MULTI-TIME
  - INV-DEPLOY-COMPATIBLE
  - INV-HISTORICAL-EVENTS
  - INV-CANONICAL-EVENT-URL
  - INV-PRIVATE-BY-DEFAULT
  - INV-POSITIVE-GAMIFICATION
  - INV-MANUAL-FALLBACK
---

# R06 — Conversa da súmula

## Resultado demonstrável

Depois que a partida termina, staff e atletas do snapshot SIM/TALVEZ podem
comentar e responder na agenda autenticada. A conversa identifica autores,
aceita denúncia e permite moderação sem expor conteúdo publicamente. Novas
mensagens fecham após sete dias; a súmula continua legível quando a capacidade
está indisponível.

## Três tempos

### Passado a preservar

- R02 separa capability do evento e identidade verificada; comentário exige
  step-up por OTP;
- R04 fornece partida finalizada, URL estável e área privada da agenda;
- `event_attendance` é a fonte de SIM/TALVEZ e `comments` já existe como flag
  tipada desligada;
- R05 demonstrou snapshot privado na finalização, RPCs mínimas e retenção
  automática sem ampliar acesso;
- a súmula permanece útil sem conversa.

### Presente a resolver

- congelar audiência privada por partida sem depender da votação;
- persistir comentários e respostas identificados, idempotentes e isolados por
  time;
- permitir denúncia, soft-delete do autor e moderação auditável;
- fechar escrita em sete dias e eliminar conteúdo/identidade após dois anos;
- oferecer jornada mobile sem tornar conversa ou autoria públicas.

### Futuro compatível

- notificações de resposta podem reutilizar outbox em release posterior;
- reações positivas podem ser adicionadas sem mudar autoria ou retenção;
- chat geral, mensagens privadas e anexos não usam este contrato.

## Escopo

### Incluído

- snapshot privado de SIM/TALVEZ por partida, independente de `voting`;
- comentários identificados de texto simples e respostas de um nível;
- escrita por sete dias e leitura privada durante a retenção;
- soft-delete pelo autor, denúncia única e moderação por staff;
- idempotência, limites antiabuso, auditoria e limpeza após dois anos;
- flag `comments` desligada e fallback para súmula somente leitura.

### Fora

- comentário por capability, visitante ou atleta NÃO/PENDENTE;
- publicação em `/e/{public_id}`, Open Graph ou perfil público;
- edição, anexos, HTML, links clicáveis, reações, chat geral ou mensagem direta;
- push/WhatsApp de comentário ou resposta;
- moderação automatizada e análise de conteúdo por terceiros.

## Contratos e decisões

[`DEC-CONVERSATION-LIFETIME`](../decisions/DEC-CONVERSATION-LIFETIME.md)
fecha janela, renovação de acesso, retenção e moderação.
`DEC-MATCH-CONVERSATION` limita a audiência a staff e ao snapshot SIM/TALVEZ.
[`DEC-PERSISTENT-ACCESS`](../decisions/DEC-PERSISTENT-ACCESS.md) exige identidade
completa, e
[`DEC-ANONYMOUS-RETENTION`](../decisions/DEC-ANONYMOUS-RETENTION.md) fixa
retenção de dois anos.

O banco deriva autoria da sessão e escreve por RPC transacional. Tabelas não
têm acesso direto para `anon` ou `authenticated`; projeções de leitura nunca
retornam `user_id`, identidade do denunciante ou texto removido. Toda chave
composta inclui `team_id` e `match_id`.

## Entry points

- banco: `event_matches`, `event_attendance`, `team_feature_flags`,
  `audit_logs` e nova migration `202608080005`;
- aplicação: `app/me/agenda/[eventId]/page.tsx`, nova Action no mesmo segmento,
  `lib/data/match-conversation.ts` e `components/match-conversation.tsx`;
- moderação: `app/app/[teamSlug]/events/[eventId]/matches/page.tsx`;
- testes: novo `supabase/tests/033_match_conversation.test.sql` e Vitest focado;
- documentação: decisão de ciclo de vida, segurança, runbook e este pacote.

## Pacotes de trabalho

| Pacote | Critérios | Entry points principais | Validação |
|---|---|---|---|
| `WP-R06-01` — contrato e audiência | `AC-R06-01` a `05`, `09`, `10` | migration 005, snapshot, RPCs e pgTAP 033 | `VAL-DB`, negativo e cross-tenant |
| `WP-R06-02` — conversa mobile | `AC-R06-01` a `07`, `10` | agenda, Action, DAL e componente | `VAL-APP`, Android/iPhone |
| `WP-R06-03` — moderação e retenção | `AC-R06-06` a `10` | denúncia, painel, cleanup e runbook | `VAL-APP` + `VAL-DB`, abuso e rollback |

## Critérios de aceite

- [x] `AC-R06-01` — Somente staff ativo e atleta verificado do snapshot SIM/TALVEZ acessam a conversa.
- [x] `AC-R06-02` — Capability, anônimo, NÃO/PENDENTE, removido e cross-tenant falham fechado.
- [x] `AC-R06-03` — Autoria vem da sessão e a projeção mostra nome interno sem expor `user_id`.
- [x] `AC-R06-04` — Comentário pertence à partida/time e replay concorrente não duplica escrita.
- [x] `AC-R06-05` — Resposta possui um nível e raiz obrigatoriamente na mesma partida.
- [x] `AC-R06-06` — Escrita fecha sete dias após a finalização; leitura autorizada continua.
- [x] `AC-R06-07` — Autor apaga sem remover respostas; texto oculto não volta na projeção comum.
- [x] `AC-R06-08` — Denúncia é única e staff modera/restaura com motivo e auditoria sem corpo integral.
- [x] `AC-R06-09` — Limites antiabuso e retenção de dois anos funcionam sem vazamento em logs.
- [x] `AC-R06-10` — Flag desligada preserva súmula somente leitura e rollback não apaga histórico.

## Riscos e controles

| Risco | Controle | Evidência |
|---|---|---|
| link encaminhado publica como atleta | identidade completa + sessão derivada no banco | negativo capability/anon |
| comentário ou resposta cross-tenant | FKs compostas + RPC/RLS | pgTAP cross-match/time |
| spam e clique repetido | idempotency key + limites por autor/time | concorrência e rate limit |
| denúncia usada para censura | não oculta automaticamente + uma por pessoa | testes de estado/moderação |
| corpo aparece em log ou auditoria | telemetria somente com IDs/estado | inspeção de payload/log |
| conversa vira ranking negativo | sem reações negativas, contagem pública ou perfil | revisão de produto/UI |

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

## Rollout, fallback e rollback

- `comments` permanece desligada por padrão e é conferida no servidor e RPC;
- piloto usa somente time e usuários demo com partida criada após ativação;
- telemetria agrega criação, denúncia, moderação e bloqueio sem texto/identidade;
- fallback omite a conversa e mantém a súmula privada somente leitura;
- não há integração externa nem escrita de smoke em produção;
- rollback desliga `comments`, preserva histórico e aplica correção forward-only;
- expansão aceita app N−1; app novo trata RPC ausente como capacidade desligada.

## Evidências e checkpoint

### `DP-R06-01` — CP0 concluído

- dependências R02/R04 e baseline R05 verificadas no commit `50c7646`;
- decisão de janela, acesso, retenção, abuso e moderação aceita;
- `comments` já existe como flag tipada e permanece desligada;
- entrypoints, três pacotes e dez critérios de aceite definidos;
- próxima ação: `WP-R06-01`, expansão inerte do contrato e pgTAP 033.

### `DP-R06-02` — CP1 concluído

- migration `202608080005` cria snapshot privado independente da votação,
  comentários/respostas e denúncias com FKs compostas por partida/time;
- tabelas usam RLS sem policies e não concedem acesso direto a `anon` ou
  `authenticated`; as RPCs recalculam sessão, vínculo atual, snapshot e flag;
- autoria e idempotência são derivadas no banco; advisory lock por
  autor/partida serializa replay e limite de cinco escritas por minuto;
- projeção mínima omite `user_id`, denúncias e corpo removido; resposta fica
  limitada a um nível e a uma raiz da mesma partida;
- autor pode remover sem apagar respostas; denúncia é única e não oculta o
  comentário automaticamente; moderação e retenção continuam em `WP-R06-03`;
- `comments` continua desligada por padrão, não houve backfill de partidas
  finalizadas e o app N−1 permanece compatível;
- `npm run migrations:check -- origin/main HEAD`: passou;
- `npm run db:reset`: passou;
- `npm run db:lint`: passou, mantendo apenas dois avisos preexistentes em
  `create_event_as_staff` e `record_match_event`;
- `npm run db:test`: 33 arquivos e 764 testes passaram; o pgTAP 033 final
  possui 44 provas focadas;
- `npm run verify`: lint, typecheck e 230 testes passaram; build passou com
  acesso às fontes externas;
- `npm run security:audit`: zero vulnerabilidades;
- próxima ação: `WP-R06-02`, consumir o contrato na agenda mobile atrás da
  flag `comments`, com fallback silencioso para a súmula atual.

### `DP-R06-03` — CP2 concluído

- migration forward-only `202608080006` adiciona estado mínimo de acesso,
  escrita e fechamento para distinguir conversa vazia de acesso negado;
- o DAL consulta primeiro a flag, tolera banco N−1 e omite silenciosamente a
  capacidade diante de RPC ausente ou falha de autorização;
- Server Actions validam IDs e texto, nunca recebem autor/time e delegam
  comentário, resposta, remoção e denúncia às RPCs transacionais;
- conversa aparece imediatamente abaixo do placar, antes dos lances, com
  autoria, respostas de um nível, marcador removido e estado somente leitura;
- formulários usam alvos de toque de pelo menos 40–44 px, labels explícitos,
  mensagens `status`/`alert`, texto simples e feedback de envio;
- viewport local 390×844: layout, header e navegação inferior não cobriram a
  jornada; comentário, resposta e remoção passaram ponta a ponta;
- fallback local com `comments=false`: conversa ausente, placar e resumo
  preservados e nenhuma falha de aplicação no console;
- `npm run migrations:check -- origin/main HEAD`: passou;
- `npm run db:reset`: passou;
- `npm run db:lint`: passou com os dois avisos preexistentes;
- `npm run db:test`: 33 arquivos e 772 testes passaram; pgTAP 033 com 52 provas;
- testes focados: 4 arquivos e 29 testes passaram;
- `npm run verify`: 44 arquivos, 254 testes, typecheck e build passaram;
- `npm run security:audit`: zero vulnerabilidades;
- próxima ação: `WP-R06-03`, moderação staff, retenção de dois anos, runbook e
  validação física antes do piloto.

### `DP-R06-04` — CP3 concluído

- migration forward-only `202608080007` adiciona fila privada por evento,
  ocultação/restauração transacional e cleanup exclusivo de `service_role`;
- fila mostra apenas denúncia aberta ou item ocultado, agrega motivos sem
  retornar identidade do denunciante e desaparece quando `comments=false`;
- staff do mesmo time decide com motivo obrigatório; denúncia muda para
  resolvida ao ocultar e descartada ao restaurar, sem esconder automaticamente;
- auditoria registra ator, IDs, ação e motivo sanitizado, nunca corpo; o lote
  elimina comentários, respostas, denúncias, snapshot e auditoria vinculada
  após dois anos;
- cron diário existente executa R05 e R06, retorna somente contadores e tolera
  app N/banco N−1 com `contrato pendente`;
- viewport local 390×844: painel sem overflow horizontal; ocultar, restaurar e
  estado vazio passaram, sem erros no console;
- `npm run migrations:check -- origin/main HEAD`: passou;
- `npm run db:reset`: passou;
- `npm run db:lint`: passou com os dois avisos preexistentes;
- `npm run db:test`: 34 arquivos e 802 testes passaram; pgTAP 034 possui 30
  provas focadas;
- testes focados: 5 arquivos e 23 testes passaram;
- `npm run verify`: 47 arquivos, 267 testes, typecheck e build passaram;
- `npm run security:audit`: zero vulnerabilidades;
- próxima ação: CP4 físico em iPhone e Android com dados demo, cobrindo leitura,
  resposta, denúncia, remoção, ocultação/restauração staff e fallback com a
  flag desligada antes de qualquer piloto.

### `DP-R06-05` — CP4 e CP5 concluídos

- piloto isolado ativou `comments` somente no Demo Campo por RPC auditada;
- partida demo foi finalizada depois da ativação e congelou 12 atletas
  elegíveis, sem backfill das partidas anteriores;
- iPhone e Android passaram em criação, leitura após reabertura, sincronização,
  resposta e remoção pelo autor;
- denúncia física de comentário de outro autor persistiu sem expor o
  denunciante; ocultação e restauração staff resolveram e descartaram a
  denúncia conforme o contrato, com motivo e ator auditados;
- rollback físico escondeu a conversa sem afetar placar ou lances e preservou
  cinco comentários, uma denúncia e o snapshot de elegibilidade;
- rollback final deixou zero times com `comments` ativa;
- `npm run smoke:production` passou depois dos dois rollbacks; o evento público
  opcional não está configurado;
- próxima ação: CP6 documental, com definição explícita do rollout futuro e
  checkpoint limpo.

### `DP-R06-06` — CP6 concluído

- os dez critérios de aceite possuem evidência de contrato, interface,
  autorização, robustez, retenção, operação e validação física;
- `comments` permanece desligada por padrão e em todos os times de produção;
- rollout futuro exige aprovação operacional explícita e ativação por time; a
  primeira conversa de cada coorte nasce somente em partida finalizada depois
  da ativação, sem backfill de partidas antigas;
- a observação inicial deve acompanhar erros das Actions/RPCs, denúncias
  abertas, decisões de moderação, auditoria e execução diária da retenção;
- rollback continua sendo desligar `comments` por RPC auditada, preservando
  súmula, comentários, denúncias e snapshot até a retenção contratada;
- R06 está concluída e o checkpoint voltou a `idle`; a próxima frente é
  promover o pacote dos dois lembretes econômicos pelo WhatsApp.
