---
id: R16
type: vertical
status: active
outcome: "Uma pessoa com pouca familiaridade digital encontra campeonatos, jogos e atletas, organiza a agenda e acompanha resultados pelo celular sem ajuda técnica."
depends_on:
  - R12
  - R13
  - R15
baseline:
  - BASE-TENANCY
  - BASE-SERIES
  - BASE-MATCH-REPORT
  - BASE-PUBLIC
verified_at: "147dc11f57941a821e395804e3832fbdbb657b53"
invariants:
  - INV-MOBILE-WHATSAPP-FIRST
  - INV-RLS-MULTI-TIME
  - INV-DEPLOY-COMPATIBLE
  - INV-HISTORICAL-EVENTS
  - INV-CANONICAL-EVENT-URL
  - INV-PRIVATE-BY-DEFAULT
  - INV-SINGLE-SOURCE
  - INV-MANUAL-FALLBACK
---

# R16 — Experiência de gestão simples

> Planejada em 8 de setembro de 2026. Nenhum pacote implementado ou ativado por
> este documento. Próxima frente após a estabilização e o CP6 documentado da R15;
> não abre uma segunda implementação ativa nem declara prontidão para lançamento.

## Resultado demonstrável

O organizador abre o DeuTime e entende o que precisa fazer. Encontra todos os
campeonatos e jogos, reconhece atletas pelas fotos, vê a agenda no calendário,
confere alterações coletivas antes de salvar e acompanha resultados e campeões.
O atleta chega pelo WhatsApp ao jogo certo, com acesso simples e dados protegidos.

## Prioridade e recorte da próxima execução

**Agora: navegação**, por `WP-R16-01`. O guia específico
[Navegação e início sem dificuldade](work-packages/WP-R16-01-navegacao.md) fecha
seis subtarefas (`NAV-01` a `06`), destinos, papéis, arquivos e matriz de testes
para a execução prevista com GPT Sol. Ler esse recorte e os invariantes/aceites
aplicáveis; não executar os nove pacotes numa única tarefa aberta.

`DP-R16-01` é incremental: fechar primeiro CP0 de navegação. Os contratos de
fotos, estatísticas e lote só bloqueiam seus consumidores, não o menu. Asaas
está fora da fila e só volta com MVP consolidado e sinal explícito para desenvolver,
conforme `DEC-ASAAS-PRIORITY`; concluir R16 não autoriza retomada automática.

## Três tempos

### Passado a preservar

- R01/R13: edição, recorrência, exceções, conflitos e histórico; R04: evento com
  zero ou muitas partidas, presença real e súmula; R09: três formatos de campeonato.
- R12: autonomia e privacidade; R15: assistente de cinco passos que materializa
  agenda, partidas e convocados. Não construir outro assistente ou agenda paralela.
- URL estável, sessão duradoura revogável, duas cotas de lembrete, voto anônimo,
  consentimentos e fallback manual permanecem regidos pelas decisões existentes.

### Presente a resolver

Evidência de leitura do código no commit `verified_at`, somada ao relato do
organizador; ainda não equivale a teste de usabilidade ou inspeção de produção:

| Lacuna observada | Consequência | Pacote consumidor |
|---|---|---|
| Campeonatos fora do menu principal e sem menu inferior nas próprias páginas | Recurso cadastrado parece inexistente | `WP-R16-01` |
| Menu superior `lg:flex` e inferior `sm:hidden` | Faixa intermediária sem navegação principal | `WP-R16-01` |
| Jogos ordenados por data crescente com limite de 200 antes dos filtros | Histórico grande pode omitir jogos futuros | `WP-R16-02` |
| Listas sem busca/filtros/paginação completos; campeonato só com nome, formato e estado | Muitos acessos para entender a situação | `WP-R16-02/04` |
| Lista de atletas sem projeção de foto e sem alternância lista/cartões | Difícil reconhecer pessoas e administrar elenco | `WP-R16-03` |
| Agenda sem calendário e seleção coletiva | Repetição de trabalho e pouca visão do período | `WP-R16-05/06` |
| Gestão, regulamento, participantes e competição numa página longa | A próxima ação e o andamento perdem destaque | `WP-R16-04` |

### Futuro compatível, fora desta entrega

Não incluir Asaas, marketplace, troca de provedor WhatsApp, aplicativo nativo,
sincronização bidirecional com calendários externos, novo chat, importação em
massa ou rankings constrangedores. Não redesenhar o site institucional inteiro.
Filtros, identidades e projeções devem permitir evolução sem duplicar fatos.

## Experiência para quem não é especialista

- Uma ação principal por contexto, com verbo e objeto: **Novo jogo**, **Novo
  campeonato**, **Ver jogos**, **Alterar horário**, **Salvar alterações**.
- Na interface, usar **Configuração em andamento** e **Continuar configuração**,
  não `draft`, “rascunho”, “materializar”, “tenant”, “RPC” ou termos de entrega.
- **Atletas** é o elenco; **Diretoria e acessos** são pessoas que administram;
  **Equipes** são os lados que jogam. Nome e escudo identificam o time organizador.
- “Jogos” é a entrada cotidiana da agenda, incluindo treinos e outros encontros
  identificados por tipo. Quando houver várias partidas, explicar **3 partidas
  neste encontro**; não chamar o evento inteiro de um único confronto.
- Exibir primeiro o necessário; regras avançadas em **Mais opções** ou
  **Regulamento**, com resumo compreensível antes da confirmação.
- Não exigir tutorial, passagem obrigatória por ajustes, gesto escondido,
  conhecimento de ícones ou uso de computador para concluir a tarefa.
- Preservar campos ao errar, informar o que corrigir junto do campo, proteger
  saída com alteração não salva e mostrar resultado claro após salvar.
- Sem dados: explicar por quê e oferecer a próxima ação. Diferenciar **Ainda não
  há jogos**, **Nenhum jogo com estes filtros** e **Não foi possível carregar**.
- Reutilizar o design system: alvos de toque de pelo menos 44 px, foco visível,
  contraste, texto além de cor, zoom e movimento reduzido. Cabeçalhos compactos,
  imagens consistentes e ações acessíveis sem depender de hover ou arrastar.

## Contratos e decisões antes de implementar

Continuam autoritativas `DEC-CHAMPIONSHIP-MODEL`,
`DEC-CHAMPIONSHIP-GUIDED-SETUP`, `DEC-PROFESSIONAL-SCHEDULING`,
`DEC-EVENT-MATCH`, `DEC-PUBLIC-PRIVACY`, `DEC-PERSISTENT-ACCESS`,
`DEC-RECOGNITION-MODEL` e `DEC-WHATSAPP-DISPATCH-SAFETY`.
Consultar as seções aplicáveis de [arquitetura](../architecture.md), sem tratar
um novo desenho de tela como autorização para mudar uma regra de negócio.

### DP-R16-01 — validar jornadas e fechar CP0

- [ ] Reconciliar o encerramento da R15 com evidência real; seu checkpoint local
  de pré-merge não comprova o estado atual de produção. Não reabrir releases feitas.
- [ ] Registrar a experiência atual e prototipar navegação, lista, detalhe,
  calendário e prévia de lote em 360 px, antes de construir componentes novos.
- [ ] Validar nomes e hierarquia com cinco organizadores, incluindo pessoas com
  pouca familiaridade digital; registrar dificuldades sem nomes ou dados pessoais.
- [ ] Fechar a matriz de leitura/escrita de owner, admin, manager, atleta e
  anônimo por ação. O menu não concede privilégios; preservar restrições atuais.
- [ ] Definir contratos de consulta: filtros, ordenação estável, paginação,
  contagens, fuso, escopo por time e comportamento de registros sem data.
- [ ] Fechar projeção privada de fotos, expiração/revogação, autoria das imagens,
  estatísticas por evento/partida/equipe e campeão por formato; sem consentimento
  implícito, contador paralelo ou exposição de terceiros por capability pessoal.
- [ ] Definir limite do lote, regras permitidas, atomicidade, concorrência,
  idempotência, notificação e recuperação antes de escrever a RPC coletiva.
- [ ] Definir flags tipadas server-side por capacidade, dependências, métricas,
  limite de regressão de desempenho e fallback. Ainda não há nomes de flags
  implantados; não considerar o catálogo antigo como ativação automática da R16.

O guia de navegação contém a Definition of Ready específica do pacote 01, com
todos os gates aplicáveis; não
exigir que os contratos de todas as capacidades futuras estejam fechados para
começar esse recorte. Nenhum aceite de uso ou teste é presumido pela especificação.

Decisão que afete schema, autorização ou contrato público bloqueia somente o
pacote dependente até ser fechada. Uma fatia independente pode ser promovida
após seu CP0, sem declarar toda a R16 `ready` prematuramente.

## Ordem e pacotes de trabalho

Uma única frente, um pacote por vez e PRs pequenos. Cada pacote entrega uma
jornada verificável com autorização, testes, estados de falha e recuperação;
não separar “todas as telas” de “todo o banco” em entregas desconectadas.

| Ordem | Pacote planejado | Dependência | Demonstração |
|---|---|---|---|
| 0 | `DP-R16-01` — jornadas e contratos | R15 estabilizada; leitura e protótipo podem anteceder CP6 | Uma pessoa encontra e entende as tarefas no protótipo |
| 1 | `WP-R16-01` — navegação e início | CP0 da fatia aceito; R15 em CP6 | Abrir qualquer seção e voltar sem se perder |
| 2 | `WP-R16-02` — listas de jogos e campeonatos | 01 | Encontrar todos os registros, inclusive histórico grande |
| 3 | `WP-R16-03` — elenco reconhecível | 01/02 e contrato privado de foto | Encontrar uma pessoa por nome, foto ou posição |
| 4 | `WP-R16-04` — acompanhar campeonato | 02 e R15 preservada | Entender fase, próximos jogos e classificação |
| 5 | `WP-R16-05` — calendário e pendências | 02/04 | Planejar a semana e localizar jogos a reagendar |
| 6 | `WP-R16-06` — operações em lote | 03/05 e contrato transacional | Conferir e alterar vários registros com segurança |
| 7 | `WP-R16-07` — equipes, campeões e estatísticas | 04 e contrato de agregação | Consultar campanha e histórico sem contagem duplicada |
| 8 | `WP-R16-08` — jogo e link por fase | 01/02/07 | Do WhatsApp à confirmação, jogo e pós-jogo no mesmo link |
| 9 | `WP-R16-09` — validação integrada e liberação | Pacotes anteriores aceitos | Organizador pouco experiente opera sem ajuda; rollout completo |

### WP-R16-01 — navegação permanente e início acionável

**Entrega:** menu móvel **Início · Jogos · Campeonatos · Atletas · Mais**,
mantido também nos detalhes. **Mais** reúne Equipes, Estatísticas, Diretoria e
acessos e Ajustes, respeitando papel. No computador, manter navegação horizontal
persistente com os mesmos nomes nesta fatia, evitando refatoração visual adicional.
Detalhes de rotas, Mais, layout e validação estão no guia `WP-R16-01`.

O cabeçalho deixa explícitos time e escudo. O início prioriza pendências
acionáveis, próximo jogo, campeonato atual e resultados recentes, com **Ver
todos**. Missão de estreia aparece enquanto necessária e não bloqueia o restante.
“Súmula” sai do menu global e fica no jogo; links antigos continuam válidos.

- [ ] `AC-R16-01` — Todas as seções existentes autorizadas são alcançáveis em até
  dois toques a partir de qualquer tela administrativa; menu não some em larguras
  intermediárias. Destinos novos só aparecem quando houver tela funcional.
- [ ] `AC-R16-02` — Trocar de time limpa seleção e contexto incompatíveis;
  voltar preserva filtros, período e posição. Ação negada tem explicação adequada
  sem revelar dados; links diretos também validam o papel no servidor.
- [ ] `AC-R16-03` — Em time novo e time com histórico, o início mostra a próxima
  ação sem jargão, cards vazios decorativos ou tarefas concluídas obrigatórias.

### WP-R16-02 — listas completas de jogos e campeonatos

**Entrega:** padrão compartilhado de título, quantidade, criação, busca,
filtros, ordenação e paginação. Contagem corresponde ao conjunto filtrado, não
somente à página. Filtros não sensíveis ficam na URL; preferência de apresentação
é lembrada sem armazenar lista de pessoas ou segredos no navegador.

Jogos: **Próximos · A reagendar · Encerrados · Cancelados**, filtráveis por
período, tipo, equipe e campeonato. Campeonato: filtros **Configuração em
andamento · A começar · Em andamento · Encerrados · Arquivados**, correspondentes
a `draft`, `published`, `active`, `completed` e `archived` já existentes. Incluir
busca, formato e ano/período; não criar estado ou modelo de temporada paralelo.

Cartões mostram escudos, datas com ano quando necessário, local permitido,
situação e próxima ação. Jogo futuro destaca horário e confirmações; passado,
resultado. Evento com múltiplas partidas mostra seus resultados separadamente.
Campeonato mostra formato, participantes, progresso e próximo confronto;
campeão vem do contrato do pacote 07, nunca da posição provisória na tabela.

- [ ] `AC-R16-04` — Consultas filtram no servidor antes da paginação e não
  truncam silenciosamente o histórico; teste local com mais de 200 eventos
  comprova jogos futuros acessíveis e ordenação estável entre páginas.
- [ ] `AC-R16-05` — Busca e filtros funcionam combinados, têm **Limpar filtros**
  e sobrevivem à ida ao detalhe; datas usam o fuso do time, inclusive virada do dia.
- [ ] `AC-R16-06` — Lista vazia, erro, carregamento e indisponibilidade têm
  tratamento distinto. Dados resumidos mantêm isolamento entre times e não fazem
  uma consulta adicional por cartão; orçamento de desempenho fechado no CP0.

### WP-R16-03 — atletas em lista e cartões, com fotos

**Entrega:** alternância **Lista / Cartões**, busca por nome/apelido e filtros
de posição e situação. Cada pessoa tem foto permitida, nome, posição e estado;
informações de contato ficam somente onde o papel autoriza e são secundárias.
Pendências de aprovação ficam fáceis de localizar, sem dominar o elenco ativo.

O detalhe privado reúne cadastro, participações, estatísticas disponíveis e
ações autorizadas. Estatísticas novas dependem do pacote 07. **Meu perfil**
continua sendo o lugar onde o atleta altera foto e identidade reivindicada;
diretoria não publica nem troca a foto de outra pessoa por conveniência.

- [ ] `AC-R16-07` — Lista e cartões mostram o mesmo conjunto filtrado. Foto
  ausente, removida, expirada ou sem autorização usa iniciais; não impede navegar.
- [ ] `AC-R16-08` — Foto vem de projeção privada autorizada do perfil existente;
  cadastro sem perfil reivindicado também funciona. Testes cobrem anônimo, atleta
  sem permissão para terceiros, staff autorizado e cross-tenant, inclusive mídia.
- [ ] `AC-R16-09` — Encontrar atleta e abrir seu detalhe preserva a lista;
  interface separa elenco de Diretoria e acessos. Nenhuma foto, telefone ou e-mail
  privado aparece em Open Graph, resposta anônima, cache público ou telemetria.

### WP-R16-04 — área clara para acompanhar campeonatos

**Entrega:** **Resumo · Jogos · Classificação · Equipes · Estatísticas ·
Regulamento**. Oferecer subnavegação acessível em tela estreita, sem sete botões
espremidos; Estatísticas só entra quando sua entrega estiver disponível.

Resumo mostra fase/rodada, partidas concluídas/previstas, próximas partidas e
pendências. Classificação adapta-se a pontos corridos, grupos ou mata-mata.
Regulamento e ações sensíveis são secundários, com permissões e versionamento
existentes. Configuração incompleta abre **Continuar configuração**, reutilizando
o assistente R15 e a etapa persistida, sem recomeçar ou duplicar campeonato.

- [ ] `AC-R16-10` — Os três formatos têm resumo e classificação compreensíveis;
  vaga ainda indefinida mostra **A definir**, não equipe inventada ou confronto
  indevidamente confirmado. Jogos gerados pela R15 aparecem na agenda única.
- [ ] `AC-R16-11` — Alterar regulamento, resolver empate e avançar dependências
  mantém travas/auditoria existentes; edição de data não altera resultado ou campeão.
- [ ] `AC-R16-12` — Usuário abre confronto, equipe ou rodada e retorna ao mesmo
  campeonato/aba; configurações não ocupam a primeira tela de uma competição ativa.

### WP-R16-05 — calendário e conflitos compreensíveis

**Entrega:** no celular, agenda por dia e calendário mensal para selecionar a
data; no computador, **Lista / Semana / Mês**. Mesmos filtros e mesmas fontes.
**Hoje** e navegação por período sempre disponíveis; tocar num jogo abre o detalhe.

Misturar avulsos, treinos e campeonatos na mesma agenda com distinção textual e
visual. Eventos sem nova data ficam em **A reagendar**, fora das datas antigas.
Datas e intervalos respeitam o fuso do time e duração atravessando meia-noite.
Conflitos aparecem no início e na agenda, com motivo autorizado e **Reagendar**.
Resolver é manual; não movimentar outras partidas automaticamente.

- [ ] `AC-R16-13` — Trocar lista/calendário preserva período e filtros; o mesmo
  evento aparece uma vez por ocorrência, sem duplicação por série ou campeonato.
- [ ] `AC-R16-14` — Testes cobrem meses, ano, sobreposição, vários jogos no dia,
  evento longo, cancelamento e data indefinida. Sem data antiga apresentada como
  agendamento válido; conteúdo denso possui lista acessível equivalente.
- [ ] `AC-R16-15` — Conflito resolvido desaparece após revalidação; conflito
  novo aparece com orientação, sem expor agenda ou atletas de outro time. Calendário
  não exige nova integração, worker próprio ou gesto de arrastar para funcionar.

### WP-R16-06 — edição em lote com prévia e recuperação

**Entrega inicial:** selecionar explicitamente jogos futuros para alterar
horário, local ou duração e adiar/reagendar. Cancelamento coletivo fica limitado
a avulsos elegíveis; vínculo com campeonato exige a operação esportiva existente,
nunca exclusão genérica. Para atletas, aprovar ou recusar cadastros pendentes,
somente nos papéis já autorizados. Sem excluir conta, publicar perfil, trocar
identidade, alterar resultado ou apagar histórico em lote.

Depois de selecionar, mostrar quantidade e ações permitidas. Distinguir
**Selecionar esta página** de **Selecionar todos os resultados**; esta última só
existe com seleção resolvida no servidor, limite explícito e prévia completa.
Mudar filtros/time invalida a seleção; registros não podem ser incluídos sem aviso.

Prévia **Conferir alterações** mostra antes/depois, quantidade, conflitos e
impedimentos. Na recorrência, **Só os selecionados** ou **Este e os próximos**
exige escopo explícito; não combinar séries diferentes silenciosamente. Explicar
**Mover todos em 1 hora** versus **Definir todos para 19h**, quando aplicável.

Salvar revalida sessão, versão e conflitos no banco. Cada confirmação é atômica:
se um registro mudou ou ficou inelegível, não salvar parte escondida. Usuário
pode excluir impedidos explicitamente e gerar nova prévia. Limite do lote definido
em CP0 impede transações sem limite; não adicionar fila apenas para excedê-lo.

Notificações são escolha separada e explícita. Alteração não cria uma terceira
cota de lembrete nem envia WhatsApp pago por padrão. Quando comunicada, usa a
outbox existente, consentimento, idempotência e resultado separado da gravação.

- [ ] `AC-R16-16` — Nenhuma escrita ocorre na seleção/prévia; usuário entende
  quais registros serão alterados, pode desistir sem efeito e recebe confirmação
  objetiva, por exemplo **5 jogos atualizados**.
- [ ] `AC-R16-17` — RPC deriva identidade da sessão e valida todos os registros;
  testes cobrem papel, cross-tenant, limite, concorrência após a prévia, conflito,
  finalizado, repetição e perda de rede após sucesso, sem parcialidade ou duplicação.
- [ ] `AC-R16-18` — Falha de comunicação não desfaz silenciosamente a agenda;
  retry não repete alteração/envio. Auditoria permite investigar e realizar correção
  autorizada; não oferecer **Desfazer** se não existir reversão transacional segura.

### WP-R16-07 — equipes, campeões e estatísticas confiáveis

**Entrega:** área Equipes com identidades persistentes, nome, cor, escudo,
campanha e histórico. Estatísticas filtráveis por período e campeonato para
organização, equipe e atleta: partidas, vitórias/empates/derrotas por lado,
gols, assistências e participações reais, conforme fatos existentes.

Organização conta cada partida uma vez; quantidade de encontros/eventos é outra
métrica. Um jogo interno não representa simultaneamente vitória e derrota do
organizador. Equipes usam o lado e snapshot da partida; atleta pode mudar de equipe
sem mover o histórico. Convocação, SIM/TALVEZ ou escalação não provam presença real.

Campeonato encerrado destaca campeão, escudo e campanha. Pontos corridos usa
classificação final com desempates resolvidos; mata-mata e grupos + mata-mata,
vencedor da final validada. **Líder** é provisório; competição incompleta, anulada
ou com pendência não recebe campeão presumido. Correção autorizada reflete em
todos os resumos. Títulos são derivados; não criar tabela de contadores manuais.

- [ ] `AC-R16-19` — Fixtures locais cobrem os três formatos, empate pendente,
  correção, anulação, múltiplas partidas num evento e troca de equipe pelo atleta;
  lista, campeonato, equipe e estatísticas apresentam resultados consistentes.
- [ ] `AC-R16-20` — Somente fatos encerrados elegíveis alimentam resultados;
  métricas têm período e explicação curta. Ausência/incompletude não vira zero
  fictício. Reconhecimento R10 mantém sua janela e contrato não retroativo.
- [ ] `AC-R16-21` — Estatísticas pessoais permanecem privadas por padrão;
  publicação respeita cada consentimento existente. Não criar ranking negativo,
  pontuação de ausência ou identificação do eleitor do Craque da Galera.

### WP-R16-08 — detalhe do jogo e continuidade pelo WhatsApp

**Entrega:** no mesmo endereço estável, antes do jogo mostrar horário/local
permitido, equipes e confirmação; durante, placar e lances; depois, resultados,
timeline, mídia existente, conversa e votação conforme janela e permissão.
Isso reorganiza capacidades entregues, não cria novo chat, vídeo ou votação.

Atleta vê a ação pessoal relevante; diretoria encontra presença, escalação e
súmula sem mistura de privilégios. A fase vem do estado autoritativo e do tempo:
horário vencido não fabrica resultado. Enquanto não houver encerramento, mostrar
**Aguardando resultado**. Evento com muitas partidas oferece seletor compreensível.

- [ ] `AC-R16-22` — Link aberto no navegador interno do WhatsApp mantém destino
  após identificação; sessão duradoura evita novo login desnecessário sem contornar
  revogação, revalidação por risco ou consentimento. Falha tem caminho de retomada.
- [ ] `AC-R16-23` — Casos antes/durante/depois, adiamento, cancelamento e várias
  partidas mostram ação e conteúdo corretos. Preview anônimo/Open Graph segue
  projeção pública mínima, sem foto ou participação privada por conveniência visual.
- [ ] `AC-R16-24` — Preservar foto/escudo autorizados e regras do Craque: eleitor
  elegível identificado SIM/TALVEZ conforme contrato existente, voto único anônimo,
  autovoto permitido, contagem/porcentagem agregadas e janela configurada até 12 h.
  Não inferir identidade do voto nem reabrir votação encerrada por mudança de tela.

### WP-R16-09 — comprovar experiência e concluir liberação

Não concentrar testes neste pacote: cada anterior passa por CP1–CP5 aplicáveis.
Aqui se comprova a integração, corrige regressões entre jornadas e encerra CP6.

- [ ] `AC-R16-25` — Cinco organizadores, incluindo pessoas pouco familiarizadas
  com tecnologia, realizam o roteiro abaixo; pelo menos quatro de cinco concluem
  cada tarefa sem orientação do avaliador. Meta proposta, ainda não medida.
- [ ] `AC-R16-26` — Android/Chrome, iPhone/Safari e navegador interno do WhatsApp
  passam no roteiro, com verificação em 360/390/768/1024 px, teclado, foco, leitor
  de tela nos controles principais, zoom e rede lenta. Nenhum bloqueio crítico aberto.
- [ ] `AC-R16-27` — Piloto produtivo, métricas, fallback e rollback/restauração
  comprovados; liberação para todos os times elegíveis e herança para novos times.
  Atualizar evidências e documentos, sincronizar dev/main e limpar branch só após smoke.

## Roteiro de usabilidade e métricas

Metas de aceite, não resultados já alcançados. Medir antes e depois com o mesmo
roteiro e dados sintéticos. Se não atingir, simplificar a interação e repetir.

| Tarefa sem instruir o caminho | Meta inicial |
|---|---|
| Encontrar um campeonato encerrado e dizer quem venceu | Até 30 s; campeão sem ambiguidade |
| Encontrar todos os jogos do próximo sábado | Até 30 s; nenhum jogo omitido |
| Encontrar um atleta e conferir sua situação | Até 20 s; foto ou iniciais reconhecíveis |
| Alterar o horário de cinco jogos e conferir o alcance | Até 90 s; nenhum registro indevido alterado |
| Abrir pelo WhatsApp, confirmar e consultar depois o resultado | Sem ajuda, perda de destino ou autenticação repetida sem motivo |

Telemetria registra apenas eventos técnicos e agregados: abertura de seção,
sucesso/abandono por etapa, latência, erro por categoria, fallback e resultado do
lote. Não registrar termo buscado, nomes, fotos, telefones, tokens, mensagens ou
escolha do voto. Limites de alerta e comparação de desempenho são fechados no CP0.
Qualquer vazamento, escrita indevida, duplicação ou resultado divergente bloqueia
o rollout independentemente da taxa de sucesso de navegação.

## Entry points e leitura mínima por pacote

Caminhos conferidos no commit `verified_at`; revalidar apenas os do pacote ativo
antes de implementar. Os testes novos acompanham seu domínio, não um arquivo
central gigante. Layout autenticado compartilhado e novas projeções ainda serão
desenhados; estes caminhos são pontos de entrada, não licença para ampliar Actions.

| Pacote | Código e testes existentes para começar |
|---|---|
| 01 | `components/team-primary-navigation.tsx`, `components/team-bottom-nav.tsx`, `components/team-app-header.tsx`, `app/app/layout.tsx`, `app/app/[teamSlug]/page.tsx` |
| 02 | `app/app/[teamSlug]/events/page.tsx`, `app/app/[teamSlug]/championships/page.tsx`, `lib/data/championships.ts` |
| 03 | `app/app/[teamSlug]/athletes/page.tsx`, `components/player-avatar-manager.tsx`; contrato de mídia em `docs/architecture.md` |
| 04 | `app/app/[teamSlug]/championships/[championshipId]/page.tsx`, `components/championship-setup-wizard.tsx` e `.test.tsx`, `lib/features/championships/rules.ts` e `.test.ts` |
| 05 | `app/app/[teamSlug]/events/page.tsx`, `lib/features/professional-scheduling/server.ts` e `.test.ts`, `lib/features/professional-scheduling/presentation.ts` e `.test.ts` |
| 06 | `app/app/[teamSlug]/championships/actions.ts` e `.test.ts`, contratos de edição de evento da R01/R13 e de cadastro da R12; localizar RPCs sensíveis por nome antes de CP1 |
| 07 | `lib/data/internal-squads.ts`, `lib/features/team-division/internal-squads.ts`, `components/internal-squad-manager.tsx` e `.test.tsx`, `components/internal-squad-badge.tsx`, `lib/data/championships.ts` |
| 08 | `app/app/[teamSlug]/events/[eventId]/page.tsx`, `app/app/[teamSlug]/events/[eventId]/match/page.tsx`; entrypoints públicos e contratos das R02/R04/R05/R06/R08M por demanda |
| 09 | Critérios e evidências dos pacotes acima; `docs/development.md` e seções operacionais aplicáveis de `docs/runbook.md` |

Durante execução, usar a skill de release indicada em `AGENTS.md`. Abrir este
contrato, somente a seção do pacote ativo e seus IDs/dependências; não recarregar
todas as releases históricas. Antes de CP1, completar caminhos específicos de RPC,
projeção, migration e teste descobertos. Não iniciar escrita sensível sem esse mapa.

## Validação técnica e riscos

- Aplicação: testes focados por domínio, lint e TypeScript; gate consolidado
  `npm run verify` antes de promoção. Conferir guias locais da versão do Next.js
  antes de código de layout, navegação, cache, busca ou autenticação.
- Banco quando aplicável: migration nova forward-only, tipos gerados, integridade
  de migrations, pgTAP positivo/negativo/cross-tenant, grants mínimos e matriz de
  compatibilidade app/schema N/N−1; testar replay, concorrência e rollback do lote.
- Dados: testes sintéticos locais para histórico grande, três formatos, atletas
  sem foto/perfil, mídia expirada, vários times e várias partidas por encontro.
- Privacidade: projeções explícitas; nunca resolver uma falta de foto ou estatística
  usando leitura privilegiada ampla, bucket público ou nova publicação automática.
- Desempenho: paginação no servidor, consultas agrupadas, cache isolado e invalidado
  após escrita/revogação; não carregar todo o histórico para montar o calendário.

## Implantação, fallback e rollback

1. Branch temporária nasce de `dev` sincronizada. PR revisado para `dev`, gates
   completos na integração consolidada e só então promoção `dev → main`.
2. Novas capacidades nascem desligadas, com flag server-side e fallback definido
   por pacote. Expansão inerte antes do consumidor quando possível; tolerar ambas
   as ordens de deploy. Não apagar rotas, fontes ou interfaces necessárias ao fallback.
3. Piloto somente em produção, num time identificado, após validação local;
   staging permanece fora do fluxo até autorização explícita. Testes que escrevem
   usam registros sintéticos mínimos, autorização e limpeza prevista, não elenco real.
4. Rotas antigas e links WhatsApp continuam válidos. Calendário pode voltar à
   lista; lote, à edição individual; novas projeções, à visão anterior sem dados
   fabricados. Mantenha essas alternativas acessíveis até provar estabilidade.
5. Falha de autorização, dados, navegação crítica ou desempenho acima do limite
   interrompe a expansão. Desligar a capacidade problemática sem apagar agenda,
   resultados ou alterações legítimas já feitas; registrar correção e nova validação.
6. Por pacote, testar retorno ao fallback e restauração. Rollout progressivo em
   produção até todos os times elegíveis; novos times recebem apenas capacidades
   já aprovadas. Nenhuma feature concluída fica desligada indefinidamente.
7. R16 só vira `done` com todos os aceites, ativação global, smoke, recuperação e
   documentação comprovados. Limpeza da branch temporária segue o fluxo Git vigente.

## Evidências e checkpoint

Execução iniciada somente no `WP-R16-01`: NAV-01 fechou o contrato de destinos e
NAV-02 adicionou layout, menus compartilhados e a flag inerte
`team_navigation_shell`; NAV-03 migrou as 13 páginas sem remover suas validações
de domínio. Os pacotes `WP-R16-02` a `09` permanecem pendentes.
O planejamento não encerra a R15; suas evidências permanecem no pacote próprio.
O checkpoint obsoleto de pré-merge foi reconciliado na promoção documental abaixo. Na execução,
registrar por pacote critério, comando/ensaio, resultado, commit, ambiente e
próxima ação; promover para o template de issue somente ao aceitar a release.

Validação documental: `git diff --check`, testes `npm run test:context` e
checagem de links/caminhos, nove pacotes e 27 critérios únicos. Na revisão de
prioridade, conferir também o guia com seis subtarefas e `DEC-ASAAS-PRIORITY`.
Essas verificações não comprovam aceite funcional nem alteram produção; resultados
das jornadas, piloto e rollout continuam pendentes.

### Preparação da promoção documental

- Diff limitado à documentação, sem aplicação, schema, infraestrutura ou flags.
- Lint, TypeScript, 130 arquivos/620 testes de aplicação, quatro testes de contexto
  e auditoria npm sem vulnerabilidades aprovados localmente.
- Build Webpack aprovado. O build padrão Turbopack ficou impedido de abrir porta/
  processo no ambiente local, inclusive após tentativa com permissão ampliada;
  o CI deve comprovar o build padrão antes de qualquer merge.
- O PR R15 `#403` consta mesclado em dev e seu commit está em origin/main. O
  checkpoint obsoleto foi substituído por `idle`, preservando no pacote R15 os
  critérios operacionais ainda não comprovados. Nenhum aceite R16 foi marcado feito.
- IDs de PR, resultados de checks da integração, promoção e smoke serão
  evidenciados nos próprios PRs; não inferir produção validada deste registro local.

## Referências da proposta

- [Nielsen Norman Group — reconhecimento e memória](https://www.nngroup.com/articles/recognition-and-recall/): tornar destinos e ações visíveis.
- [Carbon — tabelas de dados](https://carbondesignsystem.com/components/data-table/usage/): busca, filtros, paginação e ações após seleção.
- [TeamSnap — agenda esportiva](https://www.teamsnap.com/teams/features/schedules): referência de combinação entre lista e calendário.

Referências de interação consultadas na análise anterior; não prescrevem troca
de biblioteca nem substituem validação com o público do DeuTime.
