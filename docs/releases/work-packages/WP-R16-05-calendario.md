# WP-R16-05 — Calendário e pendências compreensíveis

> Estado: CP6 encerrado em 23 de setembro de 2026; ativo nos 5 times de produção.
> Contrato geral e aceites: [R16](../R16-experiencia-de-gestao.md), `AC-R16-13` a `15`.
> Base inspecionada: `b46cf71`.

## Resultado demonstrável

Uma pessoa da gestão alterna entre Lista, Semana e Mês sem perder filtros ou
período, encontra jogos e treinos no fuso do time, abre o detalhe e entende quais
itens precisam ser reagendados ou corrigidos. No celular, a lista diária continua
disponível como equivalente acessível do calendário denso.

## Dependências e decisões

- `complete_management_lists` permanece a fonte paginada da lista e
  `professional_scheduling` permanece a fonte de conflitos e transições;
- o calendário lê `events`, vínculos de equipes/campeonatos e conflitos já
  existentes. Não cria evento, agenda, worker ou sincronização paralela;
- a nova capacidade `calendar_workspace` nasce desligada. Flag desligada,
  migration ausente ou resposta inválida preserva a lista atual;
- a URL canônica continua `/app/[teamSlug]/events`. `mode=list|week|month` e
  `date=AAAA-MM-DD` controlam a visão; busca, tipo, equipe e campeonato usam os
  filtros existentes;
- o período é civil no fuso do time. Semana começa na segunda-feira; mês inclui
  as semanas completas necessárias para montar a grade, limitadas a 42 dias;
- cada ocorrência é identificada por `events.id` e aparece uma vez. Série e
  campeonato são atributos, não cópias do item;
- `date_tbd` e `postponed` aparecem em **A reagendar**, nunca na data antiga;
- conflito só informa tipo, gravidade e quantidade autorizada. Atletas, agenda
  de outro time e detalhes privados não entram na projeção;
- resolver conflito ou reagendar usa as operações existentes. O calendário não
  arrasta nem movimenta outras partidas automaticamente.

## Escopo

Incluído:

- seletor Lista, Semana e Mês, com Hoje, anterior e próximo;
- agenda diária no celular e grade semanal/mensal responsiva no computador;
- filtros existentes preservados ao trocar visão, período e voltar do detalhe;
- eventos avulsos, treinos e campeonatos com distinção textual além de cor;
- duração atravessando meia-noite, vários jogos no dia e meses/anos distintos;
- bloco **A reagendar** e indicação de conflitos com ação manual;
- carregamento, vazio, erro, acessibilidade, telemetria agregada, piloto,
  rollback e restauração.

Fora deste pacote:

- arrastar e soltar, recorrência nova, edição em lote ou alteração automática;
- integração com calendários externos, notificações novas ou worker próprio;
- exposição de nomes de atletas, telefones, respostas ou agenda de outro time;
- mudança do contrato esportivo de campeonato, súmula ou classificação.

## Contrato de dados e autorização

`get_management_calendar(requested_team_id, requested_start, requested_end,
requested_kind, requested_internal_team_id, requested_championship_id)` é uma
RPC `security definer`, `stable`, com `search_path` vazio e timeout. Ela exige
sessão, vínculo ativo de staff, `calendar_workspace` e intervalo civil entre 1 e
42 dias. A projeção devolve somente:

- evento: id, título, tipo, formato, início, fim, estado, local e ação seguinte;
- vínculos: nomes/cores das equipes internas e nome do campeonato;
- conflitos: quantidade pendente e maior gravidade do próprio evento;
- resumo: total do intervalo e quantidade a reagendar.

RLS continua protegendo as tabelas. `authenticated` recebe apenas `execute` na
RPC; `anon` não recebe acesso. A consulta filtra `team_id` antes de agregar e os
testes cobrem papel, cross-tenant, intervalo, flag, duplicação e desempenho.

## Estados e experiência

- carregando: anúncio único e esqueleto sem movimento quando solicitado;
- vazio: explica o período sem jogos e mantém Hoje, navegação e filtros;
- erro: mantém a lista atual e oferece tentar novamente sem apagar filtros;
- denso: a grade limita o texto por célula e mantém uma lista equivalente por
  dia, navegável por teclado e leitor de tela;
- conflito: texto e ícone acompanham a cor; **Reagendar** abre a edição atual;
- cancelado não aparece como compromisso futuro; concluído pode ser consultado
  pela lista existente;
- data indefinida fica no bloco **A reagendar**, fora da grade.

## Desempenho, telemetria e recuperação

- uma RPC limitada a 42 dias, índices existentes por time/data e sem carregar o
  histórico completo; meta p95 local abaixo de 300 ms com volume sintético;
- telemetria registra visão, duração, quantidade agregada, erro por categoria e
  uso do fallback. Não registra título, busca, IDs esportivos ou pessoas;
- kill switch desliga `calendar_workspace` e retorna à Lista sem alterar eventos,
  conflitos, resultados ou vínculos;
- rollout: expansão inerte, piloto em um time, rollback/restauração, expansão
  global, replay idempotente e smoke pós-ativação.

## Subtarefas

| Fatia | Entrega | Checkpoint |
|---|---|---|
| `CAL-01` | contrato, flag inerte, parser de URL e cálculo civil de períodos | CP1 |
| `CAL-02` | projeção protegida e caminho fino mobile Lista/Mês | CP2 |
| `CAL-03` | Semana, conflitos, A reagendar, filtros, erros e cross-tenant | CP3 |
| `CAL-04` | responsividade, teclado, leitor de tela, densidade e desempenho | CP4 |
| `CAL-05` | piloto, rollback/restauração, rollout global, replay, smoke e documentação | CP5/CP6 |

## Aceite e validação

- `AC-R16-13`: trocar visão preserva período e filtros; cada ocorrência aparece
  uma vez e o detalhe retorna ao mesmo contexto;
- `AC-R16-14`: testes cobrem mês/ano, semana, sobreposição, vários jogos no dia,
  meia-noite, cancelado e data indefinida, com lista acessível equivalente;
- `AC-R16-15`: conflito resolvido desaparece após revalidação, conflito novo
  orienta a ação e nenhum dado cross-tenant é exposto;
- `VAL-APP`: testes focados e typecheck durante as fatias; `npm run verify` antes
  do PR e validação responsiva de 360 a 1280 px;
- `VAL-DB`: pgTAP positivo, negativo e cross-tenant; reset, lint, suíte completa,
  tipos e integridade de migrations antes da promoção;
- produção: smoke inerte e pós-ativação, sonda agregada, rollback/restauração e
  replay sem alteração de fatos esportivos.

## CP0 aceito

- [x] resultado, dependências, escopo, URL, papéis, dados, limites, privacidade,
  desempenho, fallback e rollout estão definidos;
- [x] entrypoints confirmados em `events/page.tsx`, `management-events.ts`,
  `professional-scheduling/server.ts` e testes focados correspondentes;
- [x] não há decisão pendente que altere schema esportivo, autorização pública
  ou integração externa;
- [x] a primeira expansão é inerte e tolera aplicação e banco em qualquer ordem.

## CP4 aceito

- [x] `CAL-01`: flag inerte, parâmetros de URL e períodos civis semanais/mensais;
- [x] `CAL-02`: projeção protegida, Lista como fallback e agenda diária mobile;
- [x] `CAL-03`: Semana, Mês, filtros, vínculos, conflitos e **A reagendar**;
- [x] `CAL-04`: grade responsiva, navegação por teclado, textos acessíveis,
  limite de 42 dias, teto de 200 itens e telemetria somente agregada;
- [x] autorização, cross-tenant, contrato estrito e desempenho local abaixo de
  300 ms cobertos por pgTAP;
- [x] sonda e kill switch cobrem piloto, rollback, restauração, replay e herança
  para novos times sem apagar fatos esportivos.

Evidência local: 40 testes Vitest focados e 56 testes pgTAP específicos do
calendário/rollout passaram. A suíte completa de aplicação passou com 808
testes. Essas evidências sustentaram a promoção e o rollout registrados abaixo.

## CP6 encerrado

- [x] PR [#513](https://github.com/givaldos/deutime/pull/513) integrou a branch
  temporária em `dev`; PR [#514](https://github.com/givaldos/deutime/pull/514)
  promoveu `dev` para `main` no commit `9b7c54b6f78c4cde699c9b95e4d1b201f7985fb0`;
- [x] CI, Database, CodeQL e Terraform passaram em `main`; o deploy Supabase
  [35860700292](https://github.com/givaldos/deutime/actions/runs/35860700292)
  aplicou e confirmou as três migrations;
- [x] o smoke somente leitura da implantação
  [35860772496](https://github.com/givaldos/deutime/actions/runs/35860772496)
  passou, seguido por smoke pós-ativação executado contra `deutime.app`;
- [x] estado inerte confirmou 0/5 flags ativas antes do piloto;
- [x] piloto ativado, desligado e restaurado preservou 9 eventos agendados,
  0 itens a reagendar e 0 conflitos pendentes;
- [x] rollout global observou 5 times, alterou os 4 restantes e encerrou com
  5/5 ativos; replay observou 5 times e alterou 0 flags;
- [x] PR [#515](https://github.com/givaldos/deutime/pull/515) reconciliou o
  commit de promoção de `main` em `dev`, sem diferença de conteúdo.

`CAL-01` a `CAL-05` e `AC-R16-13` a `AC-R16-15` estão encerrados. O rollback
permanece disponível por `set_calendar_workspace_rollout(false, null)` e retorna
à Lista sem apagar eventos, conflitos, convocações ou histórico esportivo.
