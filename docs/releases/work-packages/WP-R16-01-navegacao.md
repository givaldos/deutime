# WP-R16-01 — Navegação e início sem dificuldade

> Estado: planejado; nenhum código implementado por este documento.
> Prioridade atual: navegação. Execução prevista com **GPT Sol**, por escolha do
> responsável pelo produto; não altera automaticamente o modelo desta tarefa.
> Contrato geral e aceites: [R16](../R16-experiencia-de-gestao.md), `AC-R16-01` a `03`.
> Base inspecionada: `147dc11f57941a821e395804e3832fbdbb657b53`.

## Objetivo e limite da entrega

Uma pessoa abre o time no celular, encontra Jogos, Campeonatos e Atletas, entra
num registro e consegue voltar sem se perder. Na primeira tela entende sua próxima
ação. Funciona também em tablet, computador e navegador interno do WhatsApp.

Este pacote não entrega calendário, lote, fotos do elenco, estatísticas novas,
novo cadastro, cobrança ou outro assistente de campeonato. Não depende desses
contratos futuros para corrigir os menus existentes. Não redesenha a landing page.

## Leitura inicial e execução controlada

1. Ao iniciar implementação, usar a skill de release indicada em `AGENTS.md`,
   conferir branch/checkpoint e preservar mudanças alheias. Esta especificação
   não autoriza apagar ou sobrescrever a documentação em andamento.
2. Reconciliar a R15 pela evidência atual: seu checkpoint de pré-merge pode estar
   desatualizado. Não repetir merges, migrations ou piloto por leitura literal do
   texto antigo. Se houver falha real, corrigir/encerrar o escopo correspondente
   antes de abrir outra release ativa. Asaas nunca é a próxima ação de fallback.
3. Ler este arquivo, os `AC-R16-01` a `03`, invariantes da R16 e somente as seções
   aplicáveis da arquitetura. Não carregar todos os demais pacotes de UX/financeiro.
4. Seguir as subtarefas abaixo em ordem. Cada uma termina com diff revisado,
   testes focados e próxima ação registrada. Não iniciar o pacote 02 no mesmo
   impulso nem trocar de modelo, criar subagentes ou novas tarefas automaticamente.
5. Resolver decisões locais de apresentação por este contrato. Pausar para decisão
   somente se houver mudança de autorização, fonte de dados, contrato público,
   custo externo ou impossibilidade comprovada de preservar uma regra existente.

### CP0 mínimo desta fatia

- [ ] R15 reconciliada e sem outra implementação ativa conflitante.
- [ ] Mapa de rotas e papéis abaixo reconferido no commit de início.
- [ ] Esboço móvel de Início, menu e Mais conferido com o responsável do produto;
  nomes, alvos de toque e retorno compreensíveis. Pesquisa dos demais pacotes não
  bloqueia este recorte; teste de cinco organizadores continua no gate integrado.
- [ ] Contrato de flag/fallback e plano de testes local/produtivo definidos.
- [ ] Nenhuma decisão de calendário, lote, foto privada ou cobrança incorporada
  como dependência artificial da navegação.

## Nomes, destinos e comportamento já definidos

Manter rotas em inglês e texto da interface em português. **Lista é destino;
criação é ação**. Tocar em Campeonatos nunca abre diretamente Novo campeonato.

| Destino móvel | Rota | Quando fica selecionado | Ação contextual |
|---|---|---|---|
| Início | `/app/{slug}` | somente o início exato do time | Ver próximo jogo; criar quando autorizado |
| Jogos | `/app/{slug}/events` | lista, novo, pendências, detalhe, edição e partidas | Novo jogo |
| Campeonatos | `/app/{slug}/championships` | lista, configuração e detalhe | Novo campeonato para owner/admin |
| Atletas | `/app/{slug}/athletes` | lista, novo e edição | Cadastrar atleta quando a regra atual permitir |
| Mais | `/app/{slug}/more` — rota nova | Mais e Ajustes; futuras áreas apenas quando entregues | abrir os destinos secundários permitidos |

- Celular/tablet: menu inferior para larguras abaixo de `lg`; computador: menu
  horizontal a partir de `lg`, com os mesmos nomes. Esta fatia não introduz sidebar.
  Não manter o cruzamento atual `sm:hidden` versus `lg:flex`.
- No celular, cinco destinos com ícone e nome legível; não abreviar Campeonatos
  para um ícone isolado. Se o texto não couber a 360 px, ajustar espaço/quebra,
  não reduzir alvo de toque nem criar rolagem horizontal da página.
- Um único item selecionado, com `aria-current`; comparar segmentos de rota para
  não confundir slugs com prefixo semelhante ou rotas `/events-extra`.
- A Súmula continua dentro do jogo. Preservar `/events/{id}/match`, que hoje
  redireciona para `/events/{id}/matches`; retirar somente seu uso no menu global.
- O título visível **Jogos** substitui **Agenda** no destino principal; **Início**
  substitui **Visão geral** nos links de retorno. “Agenda” pode continuar nomeando
  a etapa 5 do assistente R15, sem renomeação cega de todo o repositório.

### Mais: acesso claro, sem links vazios

| Nome | Destino desta fatia | Permissão a preservar |
|---|---|---|
| Equipes | `/app/{slug}/settings#internal-teams` | owner/admin, pois Ajustes atualmente não admite manager |
| Diretoria e acessos | `/app/{slug}/settings#team-access` | owner/admin; convite e alteração de papel seguem as restrições atuais |
| Ajustes do time | `/app/{slug}/settings` | owner/admin |
| Meu perfil | `/app/profile` | sessão administrativa válida |
| Meus convites | `/app` | sessão válida e roteamento existente |

Adicionar as duas âncoras propostas às seções existentes de Ajustes; não são URLs
hoje comprovadas nem novas permissões. Na entrega da área Equipes do pacote 07,
atualizar o destino sem perder a compatibilidade das âncoras. Estatísticas não
aparece como link até sua tela estar entregue. Não exibir cobrança, Asaas ou
“Em breve” como item clicável. Mais permanece útil ao manager com seus destinos
permitidos; não oferecer Ajustes no seletor de time a quem será barrado na chegada.

## Papel, identidade e permissão

- owner/admin/manager com vínculo administrativo ativo acessam o contexto do time;
  menu apenas espelha a autorização. Atleta sem papel administrativo permanece em
  `/me`; este pacote não concede acesso ao painel para resolver navegação.
- Campeonatos só é oferecido quando a capacidade estiver disponível ao time;
  manager pode consultar/operar somente o que já é permitido, nunca configurar
  campeonato por causa do novo botão. Flag desligada não deve gerar link para 404.
- `requireUser` usa identidade verificada. Conferir `team_memberships` ativo e RLS;
  `teamSlug`, query string, return URL ou menu no cliente não autorizam leitura.
- Seletor lista somente times aos quais o usuário tem acesso administrativo ativo.
  Trocar time leva ao início do novo time e descarta seleção/filtros incompatíveis;
  não transportar eventId, athleteId ou championshipId do time anterior.
- Validação no layout não substitui validação em página, Action ou RPC. Layouts
  podem persistir durante navegação; remoção de vínculo e sessão expirada precisam
  continuar impedindo leitura/escrita no servidor sem depender de refresh manual.
- Nome longo não desloca o menu; escudo usa apenas projeção autorizada existente,
  com iniciais/fallback se indisponível. Não criar armazenamento ou assinatura
  privilegiada ampla de mídia para desenhar o cabeçalho.

## Estrutura da primeira tela

Ordem de leitura móvel, sem informações inventadas:

1. Nome/escudo do time e seletor de contexto compacto.
2. Pendências que pedem ação: cadastro para analisar e conflitos de agenda,
   quando disponíveis e autorizados. Ex.: **2 atletas aguardando aprovação**.
3. Próximo jogo: data, hora e ação **Ver jogo**. Sem jogo: **Nenhum jogo marcado**
   e **Novo jogo** para quem pode criar; demais pessoas recebem texto informativo.
4. Acesso **Ver campeonatos**, com resumo somente de dados já disponíveis.
   Estatísticas e campeão novos aguardam o pacote responsável; não inventar zero.
5. Últimos resultados já disponíveis e **Ver todos os jogos**; detalhes extras
   não devem ocupar a primeira tela antes das ações do dia.

Novo time pode ver a Missão de estreia incompleta, sem bloquear os menus. Não
recriar essa missão ou o assistente de campeonato. **Novo jogo** e **Novo
campeonato** ficam distintos, com explicações curtas, respeitando a R13/R15.
Erros de consulta não devem parecer “sem pendências” ou “nenhum jogo”.

## Estrutura técnica delimitada

- Montar o invólucro administrativo compartilhado no nível
  `app/app/[teamSlug]/layout.tsx` **novo**, não em `app/app/layout.tsx`: perfil,
  convites e criação do primeiro time não têm necessariamente um time selecionado.
- Uma definição compartilhada de destinos alimenta menu móvel e desktop. Propor
  `lib/navigation/team-navigation.ts` **novo**, com teste no mesmo diretório,
  para função pura de seleção da seção e apresentação por papel/capacidade;
  dados de identidade e permissão continuam derivados no servidor.
  Não converter todas as páginas em componentes de cliente para compartilhar menu.
- O layout cuida de cabeçalho/menu/espaçamento; páginas continuam responsáveis
  pelos dados, autorizações de domínio e conteúdo. Evitar cache global de contexto
  de usuário; qualquer reutilização de consulta deve ser restrita à requisição.
- Migrar cabeçalhos/menus repetidos de forma mecânica, mantendo guards e ações.
  Rever `<main>` aninhado, espaço inferior/safe-area, barras de salvar e cabeçalho
  sticky. Formulário não pode ter botão coberto por menu ou teclado virtual.
- Definir flag tipada server-side no mecanismo existente antes de código consumidor.
  Nenhuma migration de negócio é prevista. Se o catálogo de flags exigir expansão
  inerte, localizar contrato/teste e fechar CP1; não criar configuração paralela.
- Não mover Actions entre domínios nem limpar consultas de domínio “aproveitando”
  o layout. Remover somente consulta comprovadamente exclusiva de UI removida;
  compartilhar auth/contexto sem enfraquecer validações existentes.

### Inventário de rotas a migrar e testar

Base: `app/app/[teamSlug]/`. Existem 13 páginas de conteúdo e um redirect legado.

| Grupo | Páginas/rotas relativas |
|---|---|
| Início e gestão | `page.tsx`, `settings/page.tsx`; adicionar `more/page.tsx` |
| Jogos | `events/page.tsx`, `events/new/page.tsx`, `events/pending/page.tsx` |
| Jogo específico | `events/[eventId]/page.tsx`, `events/[eventId]/edit/page.tsx`, `events/[eventId]/matches/page.tsx` |
| Compatibilidade | `events/[eventId]/match/page.tsx` — preservar redirect |
| Campeonatos | `championships/page.tsx`, `championships/[championshipId]/page.tsx` — inclui ramo do assistente |
| Atletas | `athletes/page.tsx`, `athletes/new/page.tsx`, `athletes/[athleteId]/edit/page.tsx` |

Antes de implementar, reconferir o inventário com `rg --files` e localizar usos de
`TeamAppHeader`/`TeamBottomNav`. Nova rota encontrada dentro deste grupo também
precisa ser classificada; fora dele, só ampliar escopo por dependência comprovada.

## Subtarefas pequenas para execução

Todas estão pendentes. São subdivisões de **um** pacote, não seis releases ou
seis frentes simultâneas. Cada mudança deve deixar uma versão utilizável; etapas
habilitadoras permanecem inertes até a jornada completa ter passado pelos gates.

| ID | Trabalho delimitado | Arquivos de entrada / propostos | Como conferir antes de avançar |
|---|---|---|---|
| `NAV-01` | Contrato de destinos, nomes, seção ativa, papel e flag | `components/team-primary-navigation.tsx`, `components/team-bottom-nav.tsx`, `lib/features/championships/server.ts`; `lib/navigation/team-navigation.ts` e `.test.ts` **novos** | tabela de rotas positiva/negativa, manager sem Ajustes, contexto isolado, nenhum destino vazio |
| `NAV-02` | Layout por time e adaptação de menus sem mudar negócio | `app/app/[teamSlug]/layout.tsx` **novo**, `components/team-app-header.tsx`, menus; mecanismo de flags em `lib/features/delivery/capabilities.ts` e `server.ts` | 1 cabeçalho, 1 menu visível por largura; layout global/perfil fora do escopo; fallback exercitável |
| `NAV-03` | Migrar 13 páginas e manter redirect | inventário acima; `components/team-switcher.tsx` | menus nas listas, detalhes, formulários, partidas e assistente; guards preservados; Mais ainda inerte até NAV-04 |
| `NAV-04` | Entregar Mais e retorno seguro | `app/app/[teamSlug]/more/page.tsx` **novo**, `settings/page.tsx`; links de retorno nas páginas migradas | abrir/voltar/recarregar, filtros existentes preservados, return URL inválida rejeitada; usuário removido sem acesso |
| `NAV-05` | Simplificar início e ações de criação | `app/app/[teamSlug]/page.tsx`, `components/professional-creation-actions.tsx` e teste existente | time vazio, completo e sem permissão; próximo jogo/pendências acionáveis; não regredir cinco passos R15 |
| `NAV-06` | Fechar regressões, acessibilidade e rollout | testes novos dos menus/layout/rotas; gate do pacote | matriz abaixo, CP3/CP4, piloto, smoke, rollback/restauração e documentação |

Pontos de leitura auxiliares: `lib/auth/dal.ts`,
`lib/features/championships/server.ts`, `lib/features/delivery/server.ts` e
seções **Design system**, **Tenancy e papéis** e **Rotas** da arquitetura.
Não ler módulos Asaas nem o backlog inteiro para esta entrega.

Guias locais a ler antes de código Next.js: `03-layouts-and-pages.md` e
`04-linking-and-navigating.md` em `node_modules/next/dist/docs/01-app/01-getting-started/`;
referências `layout.md`, `use-pathname.md` e `link.md` somente conforme API usada.

## Matriz mínima de validação

| Ensaio | Resultado exigido |
|---|---|
| Abrir lista/detalhe/novo/edição de cada seção | seção ativa correta e rota canônica; criação não substitui lista |
| 360, 390, 639, 640, 767, 768, 1023, 1024 e 1280 px | sem intervalo sem menu, sobreposição ou rolagem horizontal da página |
| owner, admin e manager | leitura/ação conforme matriz atual; Mais e seletor não prometem acesso negado |
| anônimo, atleta sem papel administrativo, vínculo revogado e outro time | nenhum dado/menu privado indevido; servidor continua negando a operação |
| campeonato ligado/desligado e flag da navegação ligada/desligada | nenhum link quebrado; fallback e rotas antigas funcionam |
| troca entre dois times e slugs semelhantes | contexto e item ativo corretos; nenhum identificador reaproveitado entre times |
| voltar/recarregar/abrir link direto | destino previsível; query existente preservada sem retorno externo/arbitrário |
| formulário alterado, botão Salvar e teclado virtual | saída protegida quando houver alteração não salva, controles visíveis e foco utilizável |
| Android, iPhone, WhatsApp interno, zoom e leitor de tela | rótulos legíveis, alvos de 44 px, ordem/foco e item atual identificáveis |
| mesma sessão com R15, evento e súmula | criar/continuar campeonato, abrir jogo e chegar à súmula sem regressão |

Vitest cobre função de rotas, permissões de apresentação, marcação e estados.
Testes de HTML estático **não** comprovam breakpoint, toque, teclado virtual ou
histórico do navegador: anexar evidência visual/interativa desses casos no piloto.
Não adicionar framework/dependência de testes novo sem necessidade comprovada.

Comandos de referência, após criar os testes novos correspondentes:

```bash
npm run test -- components/team-primary-navigation.test.tsx components/team-bottom-nav.test.tsx components/team-app-header.test.tsx components/professional-creation-actions.test.tsx
npm run typecheck
npm run lint
git diff --check
```

Também executar o teste da função compartilhada e do layout/Mais nos caminhos
efetivamente criados, sem alegar execução de arquivo inexistente. Antes de
promoção, `npm run verify`; quando houver expansão de flag no banco, incluir
integridade de migrations, tipos e pgTAP positivo/negativo/cross-tenant.

## Limites de implantação e critério de encerramento

- Fluxo obrigatório: branch temporária → PR revisado para dev → gates na dev
  consolidada → main → smoke produtivo. Não desenvolver direto em dev/main.
- Piloto integrado somente em produção, após testes locais. Sem staging,
  cobrança, disparo de e-mail/WhatsApp ou escrita financeira para validar menu.
- Flag de navegação liga uma única versão do invólucro. Não exibir cabeçalho
  duplicado durante rollout. Desligar restaura a interface anterior e preserva
  URLs, dados e formulários; `/more` mantém uma saída funcional autorizada.
- Falha de acesso, perda de campos, retorno inseguro, menu inacessível ou
  sobreposição do Salvar interrompe expansão. Corrigir e repetir o ensaio afetado.
- Pacote só é aceito com `AC-R16-01` a `03` comprovados, matriz sem bloqueios,
  piloto, fallback e restauração registrados. A R16 inteira só termina após os
  demais pacotes; não marcar lote/calendário/fotos como entregues por este trabalho.
- Registrar resultado, evidência e próxima ação no pacote/checkpoint. Depois
  deste aceite, a próxima entrega é **WP-R16-02 — listas completas**, nunca Asaas.

## Registro de execução a preencher

| Etapa | Estado | Evidência / próxima ação |
|---|---|---|
| CP0 e NAV-01 | pendente | revalidar inventário, aceitar recorte, matriz e flag |
| NAV-02/03 | pendente | layout e páginas ainda não migrados |
| NAV-04/05 | pendente | Mais, retorno e início ainda não implementados |
| NAV-06 | pendente | testes, piloto e recuperação ainda não executados |

Não transformar esta tabela em relatório de sucesso por inferência. O modelo de
execução não muda invariantes, critérios de aceite ou necessidade de evidência.
