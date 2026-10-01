# Execução medida de tarefas de desenvolvimento

## Resultado e primeiro consumidor

Uma tarefa delimitada do DeuTime pode ser preparada sem chamada de modelo e
executada explicitamente por Codex ou Muse Code em uma worktree própria. O
registro conserva duração, tentativas, modelo solicitado, consumo disponível e
resultado da revisão. O primeiro consumidor é o piloto de revisão do contexto
de desenvolvimento em `docs/work/tasks/piloto-contexto.json`.

Pacote habilitador aditivo, separado de `WP-R16-06`. Não muda jornadas, banco,
flags de produto ou o aceite pendente de BAT-04. Jev está fora do escopo.
Inclui atualização corretiva do Next.js 16.3.4 para 16.3.8, com ESLint alinhado,
porque o gate de auditoria detectou GHSA-vcvr-r3jv-pc5j na dependência instalada.

## Contrato CP0 e CP1

- Fila local explícita; nenhuma execução recorrente ou varredura do backlog.
- Preparação usa arquivos versionados e faixas de linhas, com teto de contexto.
- Cada execução nasce de `dev` local igual a `origin/dev`, depois de fetch e
  verificação de ancestralidade de `origin/main`. Branch `codex/task-<id>`.
- Uma execução por repositório; até duas tentativas explícitas por tarefa.
- Sandbox nativo permanece ativo. Nunca usar bypass de aprovação ou sandbox.
- Segredos de ambiente da aplicação não são herdados. Não copiar `.env`,
  credenciais, dependências, configurações pessoais ou logs para a worktree.
- Risco de autorização, banco e infraestrutura exige perfil `critico`; o
  encaminhamento por caminho complementa a declaração de risco do autor.
- Execução bem-sucedida termina aguardando revisão. Métricas e texto do agente
  não substituem testes, revisão de PR, proteção de branch ou gates de release.
- CI, Database, CodeQL e Terraform também verificam pushes em `dev`; a promoção
  aguarda o resultado sobre o commit consolidado, além dos checks do PR.
- Consumo ausente é `null`; tokens não são convertidos em percentual da franquia.
- Interrupção, timeout, saída inválida e alteração fora do escopo exigem atenção.
- STOP impede novas execuções e interrompe a execução atual. Trabalho e evidências
  permanecem disponíveis; nenhuma limpeza automática de branches ou worktrees.

## Critérios de aceite

1. Preparação reproduzível com referências ao commit e limites verificáveis.
2. Perfis explícitos, sem alterar o padrão global do usuário.
3. Adaptadores sem shell de interpolação e com ambiente filtrado.
4. Testes de concorrência, retomada, limite de tentativas, caminhos proibidos,
   falha, interrupção, consumo ausente e detecção de mudanças fora do escopo.
5. Relatório distingue simulação, execução, conclusão e aceite de revisão.
6. Piloto inicial demonstrado; amostra futura de dez tarefas reais continua
   pendente até haver execuções e revisão, sem inventar economia.

## Validação e recuperação

Loop focado: `npm run test:dev-tasks`. Gate: `npm run verify`, auditoria de
dependências e workflows aplicáveis. Sem alteração de schema, pgTAP não precisa
ser repetido localmente neste pacote; o workflow Database permanece obrigatório.
CP4 é a experiência da CLI; CP5 cobre execução controlada, STOP e preservação da
worktree. CP6 depende do fluxo branch temporária, dev, main e smoke.

Rollback operacional: `npm run task -- stop`. O fluxo manual pela skill
`executar-release-deutime` continua disponível. Nunca apagar evidências ou uma
worktree suja como resposta a falhas.

## Evidências

CP0/CP1 definidos em 2026-10-01. Baseline: `npm run test:context`, 4 testes
aprovados. `dev` reconciliada com `main` pelo PR #534 antes da branch
`codex/dev-efficiency`.

CP2 a CP5: controlador implementado, com testes de processo, Git local e
recuperação. Pilotos reais de leitura sobre `1586083`, ambos sem mudanças na
worktree e com revisão posterior:

| Tarefa | Resultado da revisão | Duração | Consumo informado |
|---|---|---|---|
| `piloto-contexto`, Luna low | Aceito, 0 correções | 12.221 ms | 38.553 tokens de entrada, 29.184 em cache dentro da entrada, 292 de saída |
| `piloto-muse`, modelo padrão do CLI | Rejeitado, 2 correções necessárias | 26.138 ms | Indisponível |

O Muse identificou repetição observável de `test:context`, mas também tratou
`idle` antes do merge e CP3 fechado com critérios globais ainda pendentes como
defeitos sem demonstrar contradição com as regras. A revisão rejeitou esses dois
achados; nenhuma mudança de produto ou checkpoint resultou deles. Essa amostra
não estabelece superioridade geral de um modelo ou economia de franquia.

Os artefatos completos estão no Git common dir local, sob `dev-tasks`, e não são
versionados. Worktrees dos dois pilotos permanecem preservadas até o fechamento
operacional. O restante da amostra de dez tarefas depende de trabalho real.

O build inicial em sandbox falhou ao buscar Google Fonts. Auditoria com acesso
ao registro identificou o alerta crítico de Next.js. A atualização corretiva
passou em `npm run verify`: lint, typecheck, 826 testes Vitest, 4 testes de
contexto, 13 testes do controlador e build padrão Turbopack. `npm run
security:audit` reportou zero vulnerabilidades após a atualização.

As worktrees são excluídas de Vitest, TypeScript e ESLint: o primeiro piloto
expôs execução duplicada da suíte, corrigida antes do gate final. STOP,
timeout, processo ausente, lock concorrente, idempotência, risco sensível,
retomada rejeitada, limite de tentativas e escopo são cobertos com processos e
repositórios locais de teste, sem chamadas de modelo.

Checkpoint deste habilitador: `idle`, aguardando revisão de PR, gates de `dev`,
promoção e smoke para CP6. O checkpoint de produto `WP-R16-06` permanece CP3
idle com BAT-04 como próxima ação; não foi reclassificado por este pacote.

Fonte de segurança: [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j).
A versão é afetada; a exploração depende de valores controlados por atacante
em SVG no `ImageResponse` Node.js. Não foi demonstrada exploração no DeuTime.
