# WP-R16-04 — Acompanhar campeonato sem se perder

> Estado: CP0 aceito em 14 de setembro de 2026; `CMP-01` é a próxima fatia.
> Contrato geral e aceites: [R16](../R16-experiencia-de-gestao.md), `AC-R16-10` a `12`.
> Base inspecionada: `9b0f0c11f5d7333696b7a2bd3e96c0dd37670407`.

## Resultado demonstrável

Ao abrir um campeonato, owner, admin ou manager entende imediatamente em qual
fase ele está, quanto avançou, quais são os próximos jogos e qual ação exige
atenção. A pessoa alterna entre **Resumo**, **Jogos**, **Classificação**,
**Equipes** e **Regulamento** sem perder o campeonato, abre um item e volta ao
mesmo contexto.

Campeonato em configuração não mostra a área de acompanhamento vazia: abre
diretamente **Continuar configuração** na etapa persistida do assistente R15.
O estado `draft` continua no domínio e nunca aparece como texto de produto.

## Evidência atual e hipótese validada

- o detalhe privado tem 562 linhas e apresenta, numa única rolagem, cabeçalho,
  regulamento, participantes, publicação, compartilhamento, classificação,
  decisões de avanço e todos os confrontos;
- regulamento aparece antes dos jogos e da classificação mesmo em competição
  ativa, deslocando a informação cotidiana e a próxima ação;
- `getChampionshipWorkspace` carrega participantes, todos os confrontos, slots,
  decisões, versões de regulamento, equipes internas, classificação e até 80
  partidas candidatas antes de saber qual seção será lida;
- pontos corridos aceita até 32 participantes e pode gerar 496 confrontos. A
  página atual não pagina essa grade;
- abrir uma partida vinculada leva ao jogo, mas o retorno não preserva a seção,
  rodada ou confronto do campeonato;
- o assistente de cinco etapas já elimina a linguagem de rascunho e finaliza
  campeonato, agenda, partidas e convocados transacionalmente. Ele será
  reutilizado, não refeito.

Hipótese aceita: a confusão decorre da mistura entre acompanhamento, configuração
e ações sensíveis, agravada pelo carregamento integral. O pacote reorganiza a
projeção e a navegação; não cria um segundo modelo esportivo.

## Escopo

Inclui:

- área privada por seções, com **Resumo** como entrada de competição publicada,
  ativa, encerrada ou arquivada;
- resumo de fase/rodada, progresso, três próximos jogos e pendências acionáveis;
- jogos paginados e filtráveis por fase, grupo, rodada e situação;
- classificação apropriada aos três formatos e chave eliminatória em lista
  acessível equivalente;
- participantes em **Equipes**, preservando snapshots de nome, cor e escudo;
- regulamento e ações administrativas em seção secundária;
- retorno seguro de confronto, rodada, equipe e partida vinculada;
- estados de carregamento, vazio, erro e fallback; telemetria agregada sem PII.

Não inclui:

- novo assistente, nova agenda, novo cálculo de classificação ou contador
  esportivo persistido;
- edição em lote, calendário, estatísticas históricas, campeão agregado ou
  campanha por equipe, que pertencem aos pacotes 05–07;
- mudança na página pública `/c/{public_id}`, publicação automática, WhatsApp,
  cobrança ou permissão entre times;
- remoção da tela atual antes do piloto e da recuperação comprovada.

**Estatísticas** fica reservada na arquitetura da navegação, mas não aparece
como seção vazia ou desabilitada. Ela entra somente com o `WP-R16-07` e sua
própria capacidade validada.

## Hierarquia e navegação

### Campeonato em configuração

1. voltar para **Campeonatos** preserva os filtros da lista;
2. cabeçalho mostra nome, formato e **Configuração em andamento**;
3. ação principal **Continuar configuração** abre a etapa persistida;
4. owner/admin usa o assistente R15; manager vê quem pode concluir, sem controles
   que falharão por autorização;
5. não mostrar abas, classificação ou uma grade vazia antes da publicação.

### Campeonato publicado, ativo, encerrado ou arquivado

- **Resumo** é a URL canônica sem parâmetro ou com `section=summary`;
- valores aceitos: `summary`, `matches`, `standings`, `teams` e `regulation`;
- valor ausente ou inválido cai em **Resumo**, sem revelar se outro recurso
  existe e sem alterar o endereço canônico do campeonato;
- abaixo de 640 px, um controle **Seção do campeonato** abre uma lista de links
  com o item atual marcado por `aria-current="page"`; a partir de 640 px, os
  mesmos links aparecem em uma barra. Não usar botões comprimidos nem semântica
  de tabs para navegação que troca URL;
- cada alvo tem ao menos 44 px, foco visível, texto explícito e funciona por
  teclado. A seção atual fica na URL e sobrevive a recarga, compartilhamento e
  retorno;
- `returnTo` aceita somente a rota autenticada do mesmo `teamSlug` e campeonato.
  Parâmetro inválido ou cross-tenant volta ao **Resumo**.

Foco opcional usa UUID validado e sempre subordinado à seção:

- `section=matches&fixture=<uuid>` abre o confronto do campeonato;
- `section=matches&stage=<league|group|knockout>&round=<n>&group=<n>` preserva a
  rodada escolhida; `group` só vale na fase de grupos;
- `section=teams&participant=<uuid>` abre a equipe participante;
- item ausente ou de outro tenant cai na lista da seção sem mensagem que permita
  enumerar IDs.

## Contrato do Resumo

O resumo devolve uma projeção privada estreita em uma única chamada:

- identidade do campeonato, formato, estado de produto e modo público;
- fase atual e rodada atual derivadas dos confrontos e fatos existentes;
- `completed_matches`, `planned_matches`, `scheduled_matches` e
  `unscheduled_matches`; anulação não conta como concluída nem pontua;
- até três próximos jogos com data, fuso do time, rodada/fase, dois lados e link
  somente quando o evento pertence ao mesmo time;
- uma próxima ação, escolhida nesta prioridade: **Continuar configuração**,
  **Resolver classificação**, **Montar mata-mata**, **Agendar jogos**, **Ver
  próximo jogo** ou **Campeonato encerrado**;
- contagem de participantes ativos e marco da versão vigente do regulamento.

`planned_matches` conta confrontos esportivos previstos; passagem automática
por bye não é exibida como jogo. Slots dependentes sem vencedor permanecem
**A definir**. Nenhuma projeção inventa adversário, resultado, campeão ou data.

Derivação da fase:

- pontos corridos: primeira rodada com confronto não encerrado; tudo resolvido
  mostra **Campeonato concluído**;
- grupos + mata-mata: fase de grupos até todos os jogos de grupo terminarem. Se
  houver empate absoluto, mostra **Classificação precisa de decisão**; depois,
  **Mata-mata a montar** ou a primeira fase eliminatória ainda aberta;
- mata-mata: primeira fase ainda aberta, com nomes **Final**, **Semifinal**,
  **Quartas de final** quando determináveis; demais usam **Fase N**;
- confronto sem partida ou com data indefinida entra em **A agendar**, nunca nos
  próximos jogos com uma data antiga ou fabricada.

## Jogos, classificação, equipes e regulamento

### Jogos

- fonte continua sendo `championship_fixtures` vinculada opcionalmente a
  `event_matches`; evento segue dono de data, local, presença, URL e súmula;
- página de 24 itens, máximo 50, com total filtrado e cursor estável por
  fase/grupo/rodada/ordem/ID; não usar offset;
- filtros: fase, grupo quando aplicável, rodada e situação **Próximos**,
  **Encerrados**, **A agendar** ou **Todos**;
- abrir jogo vinculado preserva o retorno ao confronto e à seção. Candidato para
  vínculo é buscado somente ao abrir a ação, não no carregamento inicial;
- alteração de data continua na agenda/evento e jamais altera placar, vencedor,
  classificação ou campeão.

### Classificação

- pontos corridos mostra a tabela reconstruída dos fatos finalizados;
- grupos mostra seletor de grupo e uma tabela por vez no celular, preservando o
  grupo na URL; após a fase, mostra também a progressão para o mata-mata;
- mata-mata mostra chave por fases como sequência de listas acessíveis. Uma vaga
  dependente usa **A definir** e bye usa **Avança sem jogo**;
- tabela larga possui cabeçalhos associados, primeira coluna fixa somente quando
  não prejudicar zoom e uma lista textual equivalente no reflow de 200%; empate
  esportivo compartilha posição.

### Equipes

- lista no máximo os 32 snapshots do campeonato, ativos antes dos retirados;
- detalhe mostra somente identidade esportiva, seed, grupo e situação. Não lê
  elenco, contatos, perfil de outro time ou dados atuais da equipe de origem;
- retirada e demais ações existentes aparecem somente para owner/admin e sempre
  exigem motivo quando a RPC já o exige.

### Regulamento

- resumo legível vem antes dos controles: pontuação, ordem de desempate, formato,
  grupos/classificados e versão vigente;
- owner/admin preservam edição, reabertura e publicação versionadas; manager é
  somente leitor;
- ações de compartilhamento público ficam aqui, continuam manuais e não ampliam
  `public_mode`, consentimento nem dados da rota pública.

## Autorização

| Ação | Owner/Admin | Manager | Atleta | Anônimo |
|---|---|---|---|---|
| Ler área privada e seções | sim | sim | não | não |
| Continuar/finalizar configuração | sim | não | não | não |
| Editar/reabrir regulamento e participantes | sim | não | não | não |
| Decidir classificado e avançar fase | sim | não | não | não |
| Vincular/liberar partida e operar confronto publicado | sim | sim | não | não |
| Alterar publicação pública | sim | não | não | não |
| Ler `/c/{public_id}` | conforme projeção pública | conforme projeção pública | conforme projeção pública | conforme projeção pública |

A interface deriva o papel da sessão, mas RPC e RLS continuam sendo a autoridade.
Flag não concede permissão. ID de campeonato, participante, confronto, partida e
`team_id` incompatíveis falham fechados com resposta indistinguível.

## Dados, desempenho e recuperação

- `CMP-01` cria a flag tipada `clear_championship_workspace` desligada e fora do
  catálogo global; a tela longa atual permanece fallback até o CP5;
- read models novos são privados, derivam sessão/tenant e devolvem somente a
  seção solicitada. Nenhuma resposta inclui PII, atleta ou caminho de mídia;
- Resumo usa uma RPC; Jogos usa uma RPC por página; Classificação usa a RPC
  existente por formato; Equipes usa uma consulta/RPC limitada a 32;
- alvo local p95 é menor que 300 ms para Resumo e uma página de Jogos com fixture
  de 32 equipes/496 confrontos. Resultado acima de 500 ms bloqueia rollout;
- telemetria registra somente seção, formato, estado, resultado, categoria de
  erro, latência e uso da próxima ação. Não registra nome, termo, UUID, placar,
  time, URL completa ou motivo administrativo;
- erro de uma seção mantém cabeçalho e navegação, mostra **Tentar novamente** e
  não derruba as demais. Contrato novo ausente ou flag desligada usa a tela atual;
- rollback desliga somente `clear_championship_workspace` e preserva campeonato,
  regulamento, participantes, confrontos, agenda, partidas, súmulas e auditoria.

## Estados obrigatórios

- carregamento próprio por seção, com anúncio único e esqueleto decorativo;
- campeonato sem confrontos publicados direciona à configuração, não a uma
  classificação vazia;
- filtro sem resultado preserva filtros e oferece **Limpar filtros**;
- sem próximos jogos diferencia **A agendar** de **Todos os jogos encerrados**;
- falha da classificação não fabrica zeros nem impede abrir Jogos;
- competição encerrada/arquivada permanece legível, sem ações incompatíveis;
- parâmetros inválidos são normalizados sem loop, exceção ou enumeração.

## Subtarefas

| Fatia | Entrega | Evidência principal |
|---|---|---|
| `CMP-01` | flag inerte, resumo privado e jogos paginados | pgTAP positivo/negativo/cross-tenant, 496 confrontos e planos |
| `CMP-02` | cabeçalho, navegação responsiva e Resumo | URL, prioridade da ação, configuração retomável e fallback |
| `CMP-03` | Jogos, Classificação e Equipes | três formatos, `A definir`, filtros/cursor e retorno seguro |
| `CMP-04` | Regulamento e ações sensíveis nas seções corretas | matriz de papéis, locks, auditoria, idempotência e data sem efeito esportivo |
| `CMP-05` | estados, acessibilidade, desempenho e rollout | 360–1280 px, teclado, reflow, piloto, rollback/restauração, smoke e CP6 |

## Aceite e validação

- `AC-R16-10`: fixtures locais dos três formatos comprovam fase, progresso,
  próximos jogos e classificação; slots dependentes exibem **A definir** e jogos
  materializados aparecem pela mesma agenda/evento;
- `AC-R16-11`: testes existentes e novos cobrem regulamento versionado, empate,
  avanço e locks; edição de data comprova invariância de fatos esportivos;
- `AC-R16-12`: testes de URL/retorno cobrem seção, filtro, rodada, confronto,
  participante e partida; competição ativa abre no Resumo sem configurações na
  primeira tela;
- `VAL-APP` para apresentação e navegação; `VAL-DB` para read models/flag;
  `VAL-PUBLIC` somente se a projeção pública for tocada, o que não está previsto;
- gates: testes focados, `npm run typecheck`, `npm run verify`, pgTAP focado,
  reset/lint/tipos do banco quando houver migration, integridade de migrations e
  auditoria de segurança antes da promoção.

## CP0 aceito

- [x] resultado único, dependências R15/WP-R16-02 e fallback estão explícitos;
- [x] decisões R09, R13 e assistente R15 permanecem autoritativos;
- [x] seções, URL, formatos, fase, progresso, paginação e estados estão fechados;
- [x] papéis, tenancy, dados pessoais, página pública e telemetria foram avaliados;
- [x] limites de desempenho, flag, rollout, recuperação e comandos de validação
  estão definidos;
- [x] entrypoints iniciais e fontes esportivas foram mapeados sem alterar schema
  ou autorização nesta fatia documental.

Próxima ação: `CMP-01`, adicionando expansão inerte para a flag, o resumo privado
e a lista paginada de jogos, mantendo a tela atual como fallback.
