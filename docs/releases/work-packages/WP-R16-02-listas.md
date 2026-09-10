# WP-R16-02 — Listas completas de Jogos e Campeonatos

> Estado: CP0 concluído em 9 de setembro de 2026; implementação ainda não iniciada.
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
