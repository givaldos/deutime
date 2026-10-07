# WP-R16-07 — Equipes, campeões e estatísticas confiáveis

> Estado: contrato CP1 definido em 7 de outubro de 2026; nenhuma capacidade
> nova foi implementada ou ativada neste pacote.
> Contrato geral e aceites: [R16](../R16-experiencia-de-gestao.md),
> `AC-R16-19` a `21`.
> Base inspecionada: `ef67371` em `dev`.

## Resultado demonstrável

O organizador abre **Equipes**, reconhece uma equipe interna e consulta sua
campanha por campeonato e período. Um campeonato encerrado mostra campeão
somente quando o resultado final é inequívoco. Estatísticas de partidas, equipe
e atleta usam fatos esportivos elegíveis e explicam o recorte. Uma partida conta
uma vez para a organização, mesmo quando o evento contém outras partidas.

## Dependências e evidência de partida

- `WP-R16-04` está em CP6 e já oferece resumo, jogos, classificação e equipes
  por campeonato. Seu participante guarda snapshot; a nova área não deve
  substituí-lo pela equipe interna atual.
- `team_squad_presets` fornece identidade persistente, nome, cor e escudo da
  equipe interna. `getInternalSquads` lê esses dados em
  `lib/data/internal-squads.ts`; a gestão existente fica em
  `components/internal-squad-manager.tsx`.
- `event_matches` tem estado `finalized` ou `void`; `match_sides` guarda o lado,
  `squad_id` e snapshot externo; `match_participations` registra participação
  real. `championship_fixtures` vincula confronto a partida. A lista de
  convocados e respostas à chamada não comprovam participação.
- `getChampionshipWorkspace` em `lib/data/championships.ts` já consulta as
  classificações por RPC. A página de acompanhamento não oferece, hoje, uma
  campanha histórica de equipe nem estatísticas pessoais neste pacote.
- O contrato de campeonato exige campeão derivado da classificação final
  resolvida ou do vencedor da final validada. Correções e anulações devem
  repercutir nas projeções, sem contador esportivo manual.
- A atividade esportiva pública atribuída a um atleta exige consentimento
  `public_sports_activity` válido. Perfil e foto têm finalidade separada;
  estatísticas pessoais ficam privadas por padrão.

## Escopo do pacote

Inclui identidade e histórico das equipes internas, campanha por campeonato,
campeão elegível nos três formatos e estatísticas filtráveis por campeonato e
período para organização, equipe e atleta. Cada métrica informa unidade,
período e estado de dados ausentes ou incompletos. A visão privada respeita
papéis e isolamento do time; qualquer projeção pública obedece aos modos de
publicação e consentimentos existentes.

Não inclui placar de jogo em andamento como resultado final, pontuação de
ausência, ranking negativo, identificação de eleitor do Craque da Galera,
mudança retroativa da janela da R10, liga entre organizações, novo chat,
publicação automática de atividade pessoal ou remoção da gestão atual de
equipes. O `WP-R16-06` permanece com `batch_operations` desligada e revisão
móvel e de segurança pendente; isso não altera o contrato deste pacote.

## Contrato CP1

### Fonte, identidade e recorte

`team_squad_presets.id` é a identidade atual de uma equipe interna. Nome, cor e
escudo do participante em `championship_participants` são snapshots e continuam
visíveis no campeonato histórico. A campanha por equipe associa um participante
interno por `internal_team_id`, nunca pelo nome atual. Em um confronto vinculado,
o lado vem de `championship_fixture_slots.side_index`; slots derivados de
`winner` ou `loser` resolvem o participante pela origem do chaveamento antes
da agregação. O `squad_id` de
`match_sides` pode estar vazio após o vínculo e não serve sozinho para atribuir
a campanha. Fora de campeonato, somente um `match_sides.squad_id` válido permite
atribuir a partida a uma equipe interna. Partidas sem vínculo confiável ficam
em **Equipe não identificada**, sem serem atribuídas por texto ou cor.

O filtro de período usa `events.starts_at` no fuso `teams.timezone`. A API
recebe dias locais de início inclusivo e fim exclusivo; o padrão é os últimos
90 dias e a janela solicitada tem no máximo 366 dias. Campeonato opcional
restringe por `championship_fixtures.championship_id`. Listas de partidas usam
ordem `(starts_at desc, match_id desc)`, cursor estável e até 50 linhas por
chamada. A consulta de resumo é agrupada no banco e não busca cada partida
separadamente. Não há tabela de contadores manuais.

Uma `event_matches` com `status = finalized` conta uma vez para a organização,
independentemente de quantas partidas existem no mesmo evento. Partida `void`,
agendada ou ao vivo não entra no numerador de resultados. Para campeonato,
o confronto também precisa estar `finalized` e vinculado àquela partida; uma
divergência de estados aparece como dado incompleto, não como resultado.
Vitória, empate e derrota de equipe usam os dois lados da partida, inclusive
em jogos internos; a organização não recebe simultaneamente vitória e derrota.
Gols por lado usam o placar reconstruído de `match_events`, incluindo gol
contra no lado creditado e ajuste explícito. Gols pessoais contam apenas lances
`goal` com autoria validada; assistências contam o `assist_athlete_id` desse
lance. `own_goal` e `score_adjustment` não inventam gol ou assistência pessoal.
Participação pessoal vem de `match_participations`, uma vez por partida, nunca
de convocação, resposta à chamada ou escalação.

O resultado distingue `sem_dados`, `incompleto` e `disponível`. Sem partida
finalizada no recorte, valores esportivos são `null`, com texto de ausência;
zero só é exibido quando há ao menos uma partida elegível. A resposta informa
partidas elegíveis, pendentes, anuladas e não atribuídas. Dados anteriores ao
modelo de partidas R04 não são misturados com as novas métricas por inferência;
o recorte informa a cobertura. `get_my_player_statistics` e
`get_public_player_statistics` atuais usam súmulas antigas por evento e mantêm
seu contrato até uma migração específica, sem substituição silenciosa.

### Campeão e encerramento

O enum de `championships.status` contém `completed`, mas as migrations atuais
não têm comando autorizado que faça a transição. Antes de mostrar campeão, adicionar
`complete_championship(championship_id, request_id)` como RPC transacional,
idempotente e auditada em `championship_commands`. Somente owner ou admin do
time da sessão pode executá-la; manager e atleta não encerram a competição.
Ela bloqueia o campeonato, verifica o estado publicado/ativo, confrontos e
desempates e somente então grava `completed`. Repetir o mesmo `request_id`
devolve o mesmo resultado; pedidos conflitantes falham sem escrita parcial.

- Pontos corridos: todos os confrontos exigidos precisam de resultado final
  elegível. A classificação existente aplica o regulamento e deve ter um único
  participante na posição 1. Empate absoluto mantém **Campeão pendente**;
  seed e ordem de tela não desempatam o título.
- Mata-mata: a chave precisa ter avanço resolvido até uma única final. O
  vencedor da final deve estar gravado em `winner_participant_id`, com resolução
  válida. Bye inicial não é partida nem vitória; final sem vencedor permanece
  pendente.
- Grupos + mata-mata: decisões de classificação necessárias devem estar
  resolvidas e a fase eliminatória deve terminar como acima. Liderança de grupo
  não é título.
- Confronto `void` ou sem partida só pode compor a chave final se houver
  resolução administrativa explícita, auditada e suficiente para preservar o
  avanço; caso contrário, o encerramento falha fechado. Correção posterior que
  altere resultado, classificação ou vencedor reabre a competição e remove a
  projeção de campeão na mesma transação. Arquivamento não cria campeão.

O campeão é projeção do estado `completed` e das fontes acima, sem coluna de
contador ou título manual. A área privada e a página pública do campeonato
usam o mesmo predicado. A página pública mostra apenas identidade esportiva de
equipe quando o campeonato já está publicado; não expõe atleta por essa via.

### Permissão, interfaces e fallback

Uma nova chave tipada `team_statistics` nasce desligada, fora de
`private.product_feature_keys()`. `championships` e `event_matches` continuam
pré-condições dos respectivos dados. Ausência da chave, erro de consulta ou
deploy do app antes da expansão do banco resultam em falso e mantêm as telas
atuais. O banco expandido não exige consumidor novo; migrations são
forward-only.

O CP2 começa com uma RPC de leitura privada
`get_team_squad_campaign(requested_team_id, requested_squad_id,
requested_championship_id, requested_from, requested_until)` que devolve
`state`, `squad` (`id`, `name`, `color`, `badge_key`), `period` (`from`,
`until`, `timezone`), `coverage` (`eligible_matches`, `pending_matches`,
`void_matches`, `unattributed_matches`) e `metrics` (`played`, `wins`,
`draws`, `losses`, `goals_for`, `goals_against`). Contagens em `metrics` são
`null` no estado `sem_dados`. A RPC valida
`auth.uid()`, vínculo staff e isolamento de todos os IDs no banco, usa
`security definer` com `search_path` vazio, prazo máximo de 5 segundos e
`EXECUTE` apenas para `authenticated`. A Action valida filtros e delega à RPC;
não agrega dados esportivos nem decide autorização. A lista paginada de
partidas e as consultas de organização e atleta seguem o mesmo contrato de
fonte e isolamento, sem ampliar a primeira RPC com domínios diferentes.

| Leitor | Visão autorizada neste pacote |
|---|---|
| Owner e admin | Campanhas e estatísticas privadas do próprio time; podem encerrar campeonato elegível. |
| Manager | Mesmas leituras privadas do próprio time; não encerra campeonato. |
| Atleta verificado | Somente estatísticas próprias por sessão; não recebe consulta livre por `athlete_id` nem dados privados de colegas. |
| Anônimo | Nenhuma RPC privada. Resumo público do campeonato somente com `public_mode = public`; atividade atribuída a atleta exige projeção separada e consentimento vigente. |

Publicação de atleta exige consentimento específico `public_sports_activity`,
idade confirmada e modo público permitido; foto e link de perfil exigem também
`public_player_profile`. Revogação ou modo privado remove a projeção pública na
leitura seguinte. Capability pessoal não autoriza terceiros. A primeira fatia
não cria página pública de estatísticas de atleta. Os endpoints legados da R12
não são ampliados por este pacote.

O fallback é a gestão atual de equipes em Ajustes e as seções atuais do
campeonato. Desligar `team_statistics` oculta a área nova sem apagar fatos,
campeonato ou links existentes. A telemetria registra tipo de consulta,
duração, resultado e estado da flag, sem nomes, IDs de atleta, payload de
partida ou consentimento. Alteração de súmula, participação, confronto,
consentimento ou publicação invalida qualquer cache da projeção; CP2 começa
sem cache persistido. O teste de desempenho cobre 32 participantes, até 496
confrontos e eventos com várias partidas, com consulta agrupada e sem N+1.

## Critérios e validação

- `AC-R16-19`: fixtures sintéticos dos três formatos cobrem empate pendente,
  correção, anulação, várias partidas no mesmo evento e atleta que muda de
  equipe. Lista, campeonato, equipe e estatísticas concordam.
- `AC-R16-20`: somente fatos encerrados elegíveis entram em resultados.
  Ausência e incompletude não aparecem como zero; cada métrica explica período
  e denominador. A R10 mantém sua janela e semântica.
- `AC-R16-21`: estatísticas pessoais permanecem privadas por padrão;
  publicação, revogação e tentativas de leitura indevida têm teste negativo.
  Isolamento cross-tenant e papéis são testados no banco.
- A transição para `completed` terá teste de repetição do `request_id`,
  competição incompleta, empate absoluto, bye, final sem vencedor, resolução
  administrativa, correção posterior e leitura cross-tenant. Nenhum teste de
  classificação isolada substitui o teste do comando transacional.
- Loop de CP1/CP2: testes focados de domínio e componentes, `typecheck` e
  pgTAP positivo, negativo e cross-tenant para qualquer RPC ou tabela nova.
  Antes de PR de implementação: `npm run verify`, `db:reset`, `db:lint`,
  `db:test`, `db:types`, auditoria de segurança e validação móvel aplicável.

## Próxima ação

Implementar CP2 em uma fatia: expansão inerte da flag e RPC privada de campanha
de uma equipe em um campeonato, seguida da interface móvel com retorno à visão
atual. Campeão e estatísticas pessoais só entram após seus predicados,
permissões e projeções estarem testados. Não promover a flag globalmente.
