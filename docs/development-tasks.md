# Tarefas de desenvolvimento com consumo medido

O controlador local prepara contexto, mantém uma fila e executa uma tentativa
por chamada. Está inerte até `run <id> --execute`. Não agenda tarefas, não usa
Jev e não decide quais features do backlog desenvolver. O consumidor inicial é
o [piloto de revisão de contexto](work/tasks/piloto-contexto.json).

## Escolha do executor

| Perfil | Executor | Uso inicial |
|---|---|---|
| `simples` | Codex, GPT-6 Luna, low | Leitura, documentação e ajustes delimitados |
| `padrao` | Codex, GPT-6.1 Sol, medium | Implementação cotidiana |
| `critico` | Codex, GPT-6 Astra, high | Banco, autorização, infraestrutura e investigação complexa |
| `muse` | Muse Code, modelo padrão instalado, medium | Segundo executor para tarefas delimitadas |

A política está em `config/dev-tasks.json`. Ela não altera a configuração
global do usuário. No Muse, `model: null` significa escolha pelo próprio CLI,
não uma versão fixada; o relatório mantém esse desconhecimento. Antes de
comparar modelos, confira `muse --version` e o modelo da conta.

O encaminhamento considera risco declarado e caminhos sensíveis. Ele pode
exigir `critico`, mas não prova ausência de risco nos demais arquivos. Todos os
perfis mantêm os mesmos critérios de aceite, revisão e gates aplicáveis.

## Preparar e executar

Crie um JSON com o mesmo contrato do piloto: ID único, objetivo, perfil, modo,
risco, escopo, referências, critérios de aceite e validação. `scope` contém
arquivos ou diretórios relativos, sem curingas. `context` aceita até cinco
arquivos versionados, com faixas de até 160 linhas. Não inclua segredos nem PII
no objetivo ou nas referências. Arquivos `.env`, chaves e symlinks são recusados
na preparação. O contexto completo tem limite de 24.000 bytes, sem truncamento
silencioso de invariantes.

```bash
npm run task -- prepare docs/work/tasks/piloto-contexto.json
npm run task -- add docs/work/tasks/piloto-contexto.json
npm run task -- run piloto-contexto
npm run task -- run piloto-contexto --execute
npm run task -- status piloto-contexto
npm run task -- report
```

`prepare` lê o commit atual, sem incluir alterações ainda não commitadas. Na
execução, o contexto é refeito sobre a `dev` sincronizada. Se uma faixa deixar
de existir, a tarefa falha antes de chamar o modelo. Confira a prévia e os
critérios antes de executar; linhas existentes podem mudar de significado.

`run` faz fetch e exige `dev` local igual a `origin/dev`, com `origin/main` já
reconciliada. Não atualiza branches permanentes automaticamente. Cria
`codex/task-<id>` em `.dev-tasks/worktrees/<id>` a partir de `dev`, preservando a
checkout em uso. Uma retomada usa a mesma worktree e o mesmo commit-base;
conflitos ou atualização da base exigem análise manual.

As worktrees nascem sem `.env`, `node_modules` ou instalações automáticas.
Prepare dependências pela rotina aprovada do projeto quando necessário. Uma
tarefa que dependa de acesso indisponível deve registrar o impedimento. Os
executores não recebem permissão para fazer commit, push, merge ou deploy.

## Limites e interrupção

Há uma operação de execução por repositório, inclusive entre worktrees. Cada
tarefa tem no máximo duas tentativas, iniciadas explicitamente. A repetição de
`add` com o mesmo contrato é idempotente. Outro contrato requer outro ID.

Os limites de tempo por tentativa são 10 minutos para `simples`, 20 para
`padrao` e `muse`, e 30 para `critico`. O Muse recebe também limite de 30 etapas
e 8.000 bytes por saída de ferramenta. O controlador limita a saída recebida a
8 MiB e encerra o grupo de processos no timeout ou cancelamento.

```bash
npm run task -- stop
npm run task -- status
npm run task -- recover
npm run task -- enable
```

STOP é verificado durante a execução e antes de novas tentativas. `enable`
retira STOP, sem iniciar trabalho. `recover` só libera uma operação cujo
controlador e executor já encerraram; marca tarefas interrompidas como
`needs-attention`. Nunca apaga worktrees, branches ou evidências.

## Consumo e revisão

As evidências ficam em `<git-common-dir>/dev-tasks/<id>/`, fora dos arquivos
versionados: `state.json`, prompt e resposta final por tentativa. O controlador
não conserva logs brutos nem stderr do provedor. Esses arquivos locais ainda
podem conter código e conteúdo fornecido ao agente; revise antes de compartilhar.

Tokens de Codex vêm de `turn.completed.usage`. Cache é parte dos tokens de
entrada, não uma parcela somada novamente. Execução interrompida pode ter
consumo parcial ou indisponível. No Muse 1.0.3 não foi confirmado um evento de
uso compatível; seus tokens ficam `null`. O controlador não estima percentual
da franquia, preço em dinheiro ou economia a partir de tokens.

Os limites são de contexto inicial, tempo, tentativas e, no Muse, etapas. Não
existe aqui um teto rígido de tokens durante a geração do Codex. O contexto que
o executor recupera durante a tarefa também pode aumentar o consumo.

Um processo com sucesso e mudanças dentro do escopo termina em
`awaiting-review`. Leia o resultado e confira os critérios e testes. Registre
a decisão em um arquivo JSON com `result` (`accepted` ou `rejected`), `evidence`
(arquivo/linha, comando e resultado ou link verificável) e `corrections`
(quantidade de correções necessárias na revisão):

```bash
npm run task -- review piloto-contexto /tmp/revisao-contexto.json
```

O aceite é uma atestação local, não um mecanismo de autorização. Não libera
merge, substitui CI ou torna alterações posteriores aprovadas. A promoção
permanece branch temporária, PR revisado para `dev`, gates sobre `dev`, promoção
para `main` e smoke. Preserve a branch até o fechamento desse fluxo.

No piloto, colete dez tarefas reais e comparáveis, sem criar trabalho só para
preencher a amostra. Compare duração, tentativas, correções, testes e consumo
disponível por entrega aceita, separando perfil e categoria. Dez tarefas são
uma amostra operacional inicial, não prova estatística de economia. Não some
franquias de provedores diferentes nem compare consumo desconhecido como zero.

## Fronteira de segurança

O sandbox nativo permanece ativo. Codex roda sem configuração pessoal, com
rede de ferramentas desativada e sem escalada automática. Muse usa sandbox com
rede restrita; aprovações pendentes não são concedidas por este controlador.
No modo de leitura do Muse, shell e ferramentas de escrita ficam desativados.

O ambiente herdado é uma lista mínima de variáveis de sistema e localização do
CLI. Chaves da aplicação e opções como `NODE_OPTIONS` não são propagadas.
O login do provedor continua dependendo do armazenamento do próprio CLI.

Worktree e detecção de caminhos não constituem isolamento de segurança completo:
a detecção ocorre após a execução. O sandbox pode permitir leitura de partes do
host e os CLIs podem carregar recursos locais. Para operação desassistida com
código não confiável, use máquina ou usuário dedicado sem credenciais de
produção e configuração revisada de cada executor. Não execute PRs externos
com as credenciais da estação de desenvolvimento.

## Fontes verificadas

- [Codex em modo não interativo](https://learn.chatgpt.com/docs/non-interactive-mode).
- `codex exec --help`, versão 0.159.2, e `muse exec --help`, versão 1.0.3,
  conferidos em 2026-10-01. Mudanças de CLI exigem repetir o smoke do adaptador.
