# WP-R16-02 — Listas completas de Jogos e Campeonatos

> Estado: LIST-05 pronta para promoção em 12 de setembro de 2026; rollout produtivo pendente.
> Contrato geral e aceites: [R16](../R16-experiencia-de-gestao.md), `AC-R16-04` a `06`.
> Base inspecionada: `18adc380dd2868808a33a5f40540e97178e4f97f`.

## Resultado e limite

O organizador encontra qualquer jogo ou campeonato do próprio time por busca,
situação, período e filtros esportivos, mesmo com histórico grande. A quantidade
corresponde ao conjunto filtrado e a ida ao detalhe não perde o contexto da lista.

Este pacote não entrega calendário, edição em lote, fotos de atletas, nova
classificação ou estatísticas. `events` continua sendo a agenda única e
`championships` continua agrupando a competição; não nasce fonte paralela.

## Evidência do problema atual

- `events/page.tsx` ordena todas as ocorrências por `starts_at asc`, limita em 200
  e só depois, em memória, separa próximos, aguardando data e histórico. Um time
  com mais de 200 registros antigos pode não receber jogos futuros na resposta.
- a mesma página busca presenças e locais somente dos IDs já truncados; a
  contagem exibida descreve a página carregada, não o conjunto pesquisável.
- `getChampionships` retorna todos os campeonatos por `updated_at desc`, sem
  busca, situação, formato, período, contagem filtrada ou limite.
- o índice de eventos cobre `(team_id, starts_at desc)`. Não há índice de lista
  para campeonato nem contrato estável para busca e paginação combinadas.
- autorização atual exige sessão e vínculo administrativo ativo; a mudança de
  apresentação não pode ampliar owner/admin/manager nem expor outro `team_id`.

## Vocabulário e estados

Na interface, usar **Jogos**, **Campeonatos**, **Configuração em andamento** e
**A reagendar**. Valores internos não aparecem para o usuário.

### Jogos

| Visão | Regra canônica |
|---|---|
| Próximos | `status = scheduled`, estado de agenda `scheduled` ou `pending_review` e início a partir de agora |
| A reagendar | `status = scheduled` e estado `date_tbd` ou `postponed`; a data antiga não é apresentada como compromisso válido |
| Encerrados | `status = completed`; ocorrência passada ainda `scheduled` não é declarada encerrada e entra como pendência operacional |
| Cancelados | `status = cancelled` |

Ocorrência `scheduled` com horário passado e sem estado de adiamento será exibida
em **A reagendar** com o motivo **Horário passou sem encerramento**. O pacote não
muda seu estado automaticamente. Intervalos e “hoje” usam o fuso IANA do time.

### Campeonatos

| Texto | Estado interno |
|---|---|
| Configuração em andamento | `draft` |
| A começar | `published` |
| Em andamento | `active` |
| Encerrados | `completed` |
| Arquivados | `archived` |

## Contrato de consulta

Criar dois read models estreitos e tipados, um para Jogos e outro para
Campeonatos. Ambos recebem `team_id`, filtros validados, limite e cursor; a sessão
verificada e o vínculo ativo continuam obrigatórios no servidor. Cursor ou URL
nunca concede acesso.

### Regras comuns

- página padrão de 24 itens, máximo de 50; sem `limit` arbitrário no cliente;
- paginação por cursor composto pela chave de ordenação e `id`, nunca somente
  offset. Empates permanecem estáveis entre páginas;
- resposta contém `items`, `filtered_count`, `next_cursor` e filtros efetivos;
- filtros são aplicados no banco antes de contagem e paginação;
- busca ignora maiúsculas/minúsculas e acentos, normaliza espaços e aceita de 2
  a 80 caracteres. `%`, `_` e caracteres de controle não viram curingas;
- cursor inválido, filtro desconhecido ou intervalo invertido falha com mensagem
  de validação; não retorna silenciosamente a primeira página;
- filtros não sensíveis ficam na URL. Cursor fica na URL enquanto paginado;
  apresentação pode usar armazenamento local, sem IDs pessoais ou conteúdo;
- cada cartão vem pronto no read model. Não fazer consulta por cartão.

### Jogos

Filtros combináveis: visão, texto em título/adversário, período local, tipo,
equipe interna e campeonato. Ordenação:

- Próximos: `starts_at asc, id asc`;
- A reagendar: pendência por horário passado primeiro, depois `updated_at desc,
  id desc`;
- Encerrados e Cancelados: `starts_at desc, id desc`.

O item contém somente: identidade e título da ocorrência, tipo, formato, início e
fim autorizados, estado textual, local autorizado, quantidade confirmada/total,
quantidade de partidas, campeonato/equipe quando vinculados e próxima ação. Um
evento aparece uma vez mesmo com várias partidas; seus placares continuam no
detalhe e não viram eventos duplicados.

Filtro de equipe considera equipe interna presente em qualquer lado de partida
do evento. Filtro de campeonato considera confronto vinculado. Ambos usam
`exists`/agregação no banco e preservam o `team_id` em cada junção.

### Campeonatos

Filtros combináveis: situação, texto no nome, formato e ano/período de criação.
Ordenação padrão: `updated_at desc, id desc`; opções futuras não entram neste
pacote sem índice e teste próprios.

O item contém: identidade, nome, formato, situação textual, participantes ativos,
confrontos concluídos/previstos e próxima ação. Não calcula campeão provisório.
Configuração incompleta aponta para **Continuar configuração**; os demais abrem
o resumo existente.

## Forma de entrega e compatibilidade

- adicionar a flag tipada `complete_management_lists` de forma inerte e fora do
  catálogo global até o piloto; desligada, as páginas atuais continuam operando;
- preferir RPCs/read models `security invoker` com RLS ou funções que revalidem
  explicitamente `auth.uid()`, vínculo ativo e `team_id`; nenhuma service key na UI;
- migration é somente expansão: funções, índices e flag. Consumidor tolera banco
  N−1 e banco expandido tolera app N−1;
- índices devem começar por `team_id` e acompanhar visão/ordenação. Busca
  normalizada ganha índice próprio; medir com `explain (analyze, buffers)`;
- não alterar migrations aplicadas. Contração da consulta antiga ocorre apenas
  depois do rollout estável.

## Estados de interface

- carregando: estrutura da lista com nome acessível, sem anunciar zero;
- vazio sem filtros: explicar que ainda não há registros e oferecer criação
  somente a quem já pode criar;
- vazio filtrado: **Nenhum resultado com estes filtros** e **Limpar filtros**;
- erro: **Não foi possível carregar** com tentativa novamente; nunca parecer vazio;
- indisponível por flag/schema: manter a lista atual como fallback;
- total usa plural correto e região `aria-live` após mudança de filtros;
- controles têm 44 px, foco visível, rótulo textual e funcionam sem hover.

## Autorização e privacidade

- owner/admin/manager mantêm a leitura administrativa já permitida; atleta e
  anônimo não recebem read model privado;
- nenhum item, total, sugestão ou tempo de resposta revela registros de outro
  time. Todos os caminhos negativos e cross-tenant entram em pgTAP;
- consultas derivam identidade da sessão. `teamSlug`, `team_id`, cursor, busca e
  filtros são dados não confiáveis;
- telemetria registra duração, quantidade retornada, visão e presença de filtros,
  sem texto buscado, nome, IDs de atleta ou conteúdo de evento.

## Orçamento de desempenho e fixtures

- fixture obrigatória: mais de 220 eventos antigos, pelo menos 30 futuros, datas
  empatadas, virada de dia no fuso, adiados, cancelados, série, evento com várias
  partidas, dois campeonatos e dados de outro time;
- fixture de campeonatos cobre os cinco estados, três formatos, nomes acentuados,
  datas empatadas e mais de uma página;
- read model faz no máximo duas consultas por lista (página/contagem pode ser uma
  RPC única) e nenhuma consulta proporcional ao número de cartões;
- alvo local com fixture: p95 abaixo de 300 ms por RPC e plano sem varredura da
  tabela inteira fora do tenant. Regressão acima de 500 ms bloqueia rollout;
- teste comprova que todos os futuros continuam acessíveis com mais de 200 eventos.

## Subtarefas

| ID | Trabalho | Gate |
|---|---|---|
| `LIST-01` | expansão inerte: flag, normalização, índices e contratos dos read models | migration, tipos, pgTAP positivo/negativo/cross-tenant e plano de consulta |
| `LIST-02` | DAL e página de Jogos com visão, busca, filtros, cursor e total | fixture >200, fuso, combinação, retorno ao detalhe e fallback |
| `LIST-03` | página de Campeonatos com busca, filtros, cursor, total e próxima ação | cinco estados, três formatos, manager e fallback |
| `LIST-04` | estados, acessibilidade, URL e desempenho integrado | vazio/erro/loading, limpar, zoom, teclado e matriz responsiva |
| `LIST-05` | piloto, smoke, rollback/restauração e rollout | métricas no orçamento, flag global e documentação CP6 |

## CP0 aceito

- [x] fontes de verdade, estados e casos de horário passado definidos;
- [x] filtros, busca, ordenação, cursor, total e campos dos itens definidos;
- [x] fuso, autorização, tenancy, privacidade e telemetria definidos;
- [x] fixture acima de 200, orçamento e limite de consultas definidos;
- [x] flag, compatibilidade N/N−1, fallback e rollback definidos;
- [x] subtarefas e gates pequenos definidos; calendário/lote/fotos continuam fora.

Próxima ação: `LIST-01`, começando pela expansão inerte e seus testes de banco.

## LIST-01 concluída — contrato e expansão inerte

- `complete_management_lists` foi adicionada ao enum tipado, sem entrar em
  `private.product_feature_keys()` e sem materializar flags para times existentes;
- `list_management_events` e `list_management_championships` devolvem em uma RPC
  itens prontos, total filtrado, próximo cursor composto e filtros efetivos;
- as RPCs revalidam sessão, vínculo administrativo ativo, `team_id`, flag, limites,
  períodos, texto e cursor. Anônimo, atleta e staff de outro time falham fechado;
- busca normaliza acentos, caixa, controles e espaços, preservando `%` e `_` como
  caracteres literais. Períodos são convertidos pelo fuso IANA do time;
- índices parciais por visão/ordenação, busca trigram, equipe interna e vínculo de
  campeonato foram instalados sem remover a consulta anterior;
- fixture pgTAP com 230 encerrados, 31 futuros, datas empatáveis, virada de dia,
  reagendamento, cinco estados e três formatos passou em 46 testes. As duas RPCs
  ficaram abaixo do limite bloqueante local de 500 ms;
- `EXPLAIN (ANALYZE, BUFFERS)` confirmou `Index Only Scan` por `team_id` em
  `events_management_upcoming_idx` (0,079 ms) e
  `championships_management_list_idx` (0,048 ms), sem varredura global.

Compatibilidade: app N ignora a expansão; banco N+1 mantém todas as leituras
anteriores. A flag desligada retorna indisponibilidade explícita para o consumidor
N+1 acionar o fallback. Nenhum rollout faz parte desta fatia.

Próxima ação: `LIST-02`, consumindo o read model na página de Jogos com fallback
para banco N−1 e para a flag desligada.

## LIST-02 concluída — página completa de Jogos

- a página administrativa passou a oferecer as visões **Próximos**, **A
  reagendar**, **Encerrados** e **Cancelados**, com busca e filtros combináveis
  por período, tipo, equipe interna e campeonato;
- lista, total real, próximo cursor e opções de filtro são entregues por uma única
  projeção autenticada. A DAL valida a resposta e não aceita parâmetros, UUIDs ou
  cursores ambíguos vindos da URL;
- o detalhe recebe um retorno relativo para a página e os filtros atuais. O
  destino é aceito somente quando aponta para a lista do mesmo time, evitando
  redirecionamento externo ou troca de tenant;
- cartões de itens a reagendar não apresentam a data antiga como compromisso
  válido. Estados vazio filtrado, erro e total com anúncio acessível foram
  diferenciados;
- banco N−1, ausência da RPC e flag desligada mantêm a Agenda anterior. A feature
  segue desligada e fora do catálogo global nesta fatia;
- 16 testes focados de DAL/interface e 49 testes pgTAP cobriram combinação de
  filtros, cursor, total acima de 200, fuso, retorno, autorização, cross-tenant e
  fallback. A regressão completa passou em 136 arquivos/672 testes Vitest e 75
  arquivos/1.957 testes pgTAP.

Próxima ação: `LIST-03`, conectando o read model existente à página de
Campeonatos com os cinco estados, três formatos, cursor, total e fallback.

## LIST-03 concluída — página completa de Campeonatos

- a página administrativa ganhou busca e filtros combináveis por situação,
  formato e período de criação, com total real e paginação por cursor;
- os cinco estados e os três formatos aparecem em linguagem de produto. Cada
  cartão informa participantes, confrontos encerrados/previstos, andamento e a
  próxima ação, sem calcular campeão provisório;
- a DAL valida parâmetros repetidos ou desconhecidos, período, enums, cursor e
  resposta do read model antes de apresentar dados;
- owner/admin mantêm a criação e publicação; manager encontra e opera
  campeonatos existentes sem receber a ação de criação. Atleta, anônimo e outro
  tenant continuam bloqueados pelo contrato;
- a ida ao detalhe preserva busca, filtros e página por um retorno relativo
  aceito somente para a lista do mesmo time;
- banco N−1, ausência da RPC e flag desligada mantêm a página anterior. A feature
  segue desligada e fora do catálogo global nesta fatia;
- 19 testes focados de DAL/interface e 50 testes pgTAP cobriram os cinco estados,
  três formatos, manager, combinação de filtros, cursor, próxima ação, retorno,
  autorização e fallback.

Próxima ação: `LIST-04`, validando estados integrados, acessibilidade, URL,
teclado, zoom, desempenho e a matriz responsiva das duas listas.

## LIST-04 concluída — estados e validação integrada

- Jogos e Campeonatos agora têm estrutura de carregamento equivalente à lista,
  nome acessível e `aria-busy`, sem anunciar uma contagem zero antes da leitura;
- vazios sem filtro, vazios filtrados, erro, nova tentativa e fallback foram
  diferenciados. A nova tentativa preserva filtros e cursor válidos; parâmetros
  inválidos continuam voltando para uma URL limpa;
- total usa região viva atômica. Cabeçalhos e andamento dos cartões passam a
  reorganizar texto e ação em telas estreitas, sem depender de hover;
- falhas de RPC e respostas incompatíveis registram somente código ou caminhos
  do contrato, sem busca, nomes, IDs ou conteúdo esportivo;
- navegador local confirmou as duas páginas em 360, 390, 639, 640, 767, 768,
  1023, 1024 e 1280 px, sem rolagem horizontal e sem controles interativos
  menores que 44 px. A largura efetiva de 640 px cobriu o reflow equivalente a
  200% sobre 1280 px;
- a sequência por teclado percorreu navegação, ações e filtros com foco visível.
  URLs filtradas e o destino de **Limpar filtros** foram conferidos nas duas
  páginas;
- 41 testes focados cobriram DAL, interface, carregamento, vazio, erro e URL. A
  regressão passou em 139 arquivos/697 testes Vitest e 75 arquivos/1.958 testes
  pgTAP; as duas RPCs continuaram abaixo do limite bloqueante de 500 ms no gate
  focado.

A flag permanece inerte e fora do catálogo global. Próxima ação: `LIST-05`, com
piloto produtivo, rollback/restauração, expansão global e encerramento CP6.

## LIST-05 — mecanismo pronto para produção

- a flag entrou no catálogo global tipado de 18 funcionalidades sem alterar as
  flags já materializadas durante a migration;
- a ativação específica aceita uma coorte ou todos os times elegíveis, usa lock
  transacional, é idempotente e registra escopo e alteração na auditoria;
- a sonda operacional expõe somente estado agregado do time, flag, agenda,
  reagendamentos, campeonatos e marco da última alteração, sem nomes ou IDs de
  pessoas;
- o kill switch usa a mesma operação para desligar e restaurar a coorte ou o
  catálogo global. Novos times herdam o catálogo somente enquanto o rollout
  global estiver ativo;
- 30 testes pgTAP cobrem autorização, coorte, expansão global, repetição,
  rollback, restauração, auditoria e herança. A regressão passou em 140
  arquivos/702 testes Vitest e 76 arquivos/1.988 testes pgTAP, além de lint,
  tipos, build Webpack, integridade de migrations e auditoria sem vulnerabilidades.

Próxima ação: promover a expansão, executar piloto produtivo, desligar, confirmar
fallback, restaurar, ativar globalmente e fechar o smoke antes do CP6.
