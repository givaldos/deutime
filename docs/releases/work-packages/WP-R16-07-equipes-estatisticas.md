# WP-R16-07 — Equipes, campeões e estatísticas confiáveis

> Estado: CP0 preparado em 7 de outubro de 2026; nenhuma capacidade nova foi
> implementada ou ativada neste pacote.
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

## Contrato a fechar no CP1

1. Mapear, para cada formato, o predicado de campeão: campeonato encerrado,
   confrontos elegíveis concluídos, desempate ou vencedor explícito resolvido
   e nenhuma pendência que mude o título. Definir como `void`, correção e
   confronto sem partida invalidam a projeção.
2. Definir consultas por `team_id`, campeonato, período e página. Contar
   `event_matches` uma vez por ID para a organização, separar lados para a
   campanha de equipe e usar `match_participations` para presença do atleta.
   Gols e assistências vêm dos fatos elegíveis, inclusive a regra de gol
   contra, sem inferir autoria a partir do placar.
3. Fechar a matriz de leitura de owner, admin, manager, atleta e anônimo.
   Especificar a projeção pública por consentimento válido, idade confirmada,
   modo público e revogação. A capability pessoal não concede leitura de
   estatísticas de terceiros.
4. Definir flag tipada, fallback para as telas atuais, telemetria agregada sem
   PII, orçamento de consulta, invalidação após correção e compatibilidade nas
   duas ordens de deploy. Não criar migration antes de escolher o contrato.

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
- Loop de CP1/CP2: testes focados de domínio e componentes, `typecheck` e
  pgTAP positivo, negativo e cross-tenant para qualquer RPC ou tabela nova.
  Antes de PR de implementação: `npm run verify`, `db:reset`, `db:lint`,
  `db:test`, `db:types`, auditoria de segurança e validação móvel aplicável.

## Próxima ação

Fechar o contrato de agregação e permissão do CP1 antes de alterar schema ou
interface. A primeira fatia vertical será a campanha privada de uma equipe em
um campeonato, atrás de flag e com retorno à visão atual. Campeão e
estatísticas pessoais só entram após seus predicados e projeções estarem
testados.
