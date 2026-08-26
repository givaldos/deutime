# Playbook de desenvolvimento

Este documento define como transformar o roadmap em features completas com pouco contexto, poucos pontos de falha e retomada segura. Ele descreve o processo; regras de produto ficam no roadmap e decisões estruturais ficam registradas no pacote da release ou em ADR.

## Princípios

1. **Uma entrega, um resultado demonstrável.** A unidade de trabalho é uma fatia vertical que resolve uma jornada real, não uma camada isolada de banco, backend ou interface.
2. **Mobile-first e WhatsApp-first.** A jornada principal começa no celular e, quando houver comunicação, começa na mensagem do WhatsApp.
3. **Banco como autoridade.** Autorização, isolamento por time, invariantes e atomicidade não dependem da interface.
4. **Fallback antes da automação.** Link manual antes do worker, divisão manual antes do algoritmo e súmula sem comentários antes da moderação.
5. **Compatibilidade entre deploys.** Preferir expansão inerte publicada e verificada antes do app consumidor. Se aplicação e banco saírem juntos, aplicação nova funciona com o contrato anterior compatível e aplicação anterior tolera o schema expandido.
6. **Uma fonte para cada verdade.** Não criar contadores, estados ou documentos paralelos quando eles puderem ser derivados da fonte autoritativa.
7. **Decidir no último momento responsável.** O futuro é mapeado; somente a release prestes a entrar recebe detalhamento executável.

Pacotes habilitadores são a única exceção à jornada de usuário: precisam ter primeiro consumidor explícito, resultado operacional demonstrável e não podem virar uma plataforma genérica sem uso imediato.

## Fontes de verdade

| Assunto | Fonte |
|---|---|
| Direção, prioridade e resultado de produto | [`roadmap.md`](roadmap.md) |
| Catálogo detalhado de capacidades e critérios levantados | [`backlog.md`](backlog.md) |
| Fatos atuais, invariantes e IDs de decisão | [`product-context.md`](product-context.md) |
| Invariantes técnicas e fronteiras do domínio | [`architecture.md`](architecture.md) |
| Segurança, privacidade e ameaças | [`security.md`](security.md) |
| Ambientes, deploy, rollback e incidentes | [`runbook.md`](runbook.md) |
| Escopo executável da release | `docs/releases/RXX-*.md` |
| Estado efêmero para retomada | [`work/current.md`](work/current.md) |
| Comportamento realmente implementado | código, migrations e testes no commit atual |

Se duas fontes divergirem, o trabalho para antes da implementação. Primeiro se confirma o comportamento atual no código e no histórico relevante; depois se atualizam contrato e documentação no mesmo pull request.

## Regra dos três tempos

Toda feature responde, no próprio pacote, a três perguntas:

### Passado

- O que já existe e deve ser reutilizado?
- Quais decisões, migrations e testes explicam esse comportamento?
- Qual compatibilidade ou dado histórico não pode ser quebrado?

Use buscas focadas e histórico por caminho, por exemplo:

```bash
rg "termo_do_dominio" app components lib supabase docs
git log --oneline -8 -- caminho/relevante
```

Não releia todo o repositório nem todo o roadmap quando os entrypoints do pacote forem suficientes.

### Presente

- Qual lacuna observável será fechada?
- Qual é o menor caminho ponta a ponta que entrega valor?
- Qual baseline passa antes da primeira alteração?
- Quais riscos e decisões bloqueiam a execução agora?

### Futuro

- Qual contrato precisa aceitar a próxima evolução sem implementá-la hoje?
- Qual fallback continua funcionando?
- O que está explicitamente fora do escopo?
- Como dados, URLs e integrações permanecem compatíveis?

Preparar o futuro significa preservar extensibilidade e reversibilidade, não construir antecipadamente funcionalidades sem usuário.

## Economia de contexto e tokens

Nesta seção, “tokens” significa contexto consumido por agentes de desenvolvimento. Credenciais de autenticação seguem o contrato separado de `DEC-PERSISTENT-ACCESS` e os controles de `security.md`.

Em trabalho de release, comece por `npm run context:brief`. A saída padrão é
curta e mostra worktree, release, checkpoint e janelas úteis. Revele as listas
de IDs com `npm run context:brief -- --ids` e o mapa completo com
`npm run context:brief -- --map`.
Fora de release, não execute o resumo: confira a worktree e abra os caminhos do
pedido.

Para uma feature comum, carregue nesta ordem:

1. resumo, resultado e pacote de trabalho atual;
2. contratos, critérios, riscos e entrypoints da camada afetada;
3. IDs canônicos, checkpoint e perfis `VAL-*` aplicáveis;
4. inicialmente até três entrypoints de código e dois testes;
5. histórico apenas dos caminhos que serão alterados.

O limite inicial é uma heurística de descoberta, não um teto de correção. Antes
de abrir mais arquivos, registre a hipótese ou dependência que exige a expansão.
Use `rg -n` com padrão e caminho específicos e leia somente o entorno. Preserve
de testes longos apenas comando, resumo, falha e linhas acionáveis.

### Agentes e qualidade

Use agente único em consulta, mudança serial ou um domínio. Planeje brevemente
mudanças transversais. Delegue somente duas ou mais frentes independentes de
exploração, teste ou triagem; subagentes protegem o contexto principal, mas
aumentam o consumo total. Mantenha escritas sobrepostas no agente principal e
exija conclusão, arquivo/linha, risco e próxima ação, sem logs brutos.

### Memória duradoura

O roadmap completo é lido para planejamento do produto, não em toda implementação. Resultados de auditoria, decisões e comandos não devem ficar apenas na conversa: registre o mínimo duradouro no pacote, no arquivo de evidências ou no checkpoint. Evite repetir a mesma regra em vários documentos; referencie seu identificador ou fonte canônica.

O checkpoint de retomada é substituído, não acumulado como diário. Ele deve dizer o que está pronto, o que falhou e a próxima ação concreta em poucas linhas. Evidências de checkpoints concluídos vão para `docs/releases/evidence/` quando começarem a ocultar o contrato atual.

## Unidade autossuficiente de entrega

Uma feature só é autossuficiente quando inclui, conforme aplicável:

- resultado perceptível e fluxo mobile completo;
- mensagem e deep link do WhatsApp;
- schema, migration compatível e tipos gerados;
- regra de domínio, autorização server-side, RLS e RPC transacional;
- interface com estados vazio, carregando, sucesso, erro e indisponibilidade;
- testes positivos, negativos, cross-tenant, replay e concorrência proporcionais ao risco;
- telemetria, logs sem PII e alertas operacionais;
- feature flag, ativação gradual e fallback;
- instruções de deploy, smoke test, rollback e suporte;
- atualização de arquitetura, segurança e roadmap quando o contrato mudar.

Não fechar uma feature porque uma camada ficou pronta. Se a jornada ainda depende de operação manual escondida, migration futura ou outra feature incompleta, ela não está pronta.

## Limite de trabalho em andamento

- Uma branch mantém no máximo **uma release vertical ativa**.
- Frentes realmente independentes usam branches e pacotes distintos; `docs/work/current.md` representa somente a branch atual e volta a `idle` antes do merge.
- Uma mudança habilitadora paralela só é permitida quando for aditiva, inerte e tiver primeiro consumidor nomeado.
- Não iniciar pacote de implementação com decisão estrutural pendente; um pacote `DP-*` pode existir exclusivamente para produzir a decisão, protótipo ou threat model.
- Não misturar refatoração ampla sem relação com o resultado da feature.
- Preferir PR pequeno e completo a uma branch longa com várias jornadas.

## Fluxo Git canônico

O DeuTime mantém duas branches permanentes: `dev`, que integra o trabalho dos
desenvolvedores, e `main`, que representa o estado promovido para produção. Todo
trabalho acontece em branch temporária; nunca diretamente nessas branches.

```text
dev atualizada → branch temporária → PR para dev → checks em dev
              → promoção dev para main → smoke de produção
              → sincronizar dev, se necessário → apagar branch temporária
```

### Regras

1. Antes de começar, atualizar `dev` a partir de `origin/dev` somente por
   fast-forward e criar a branch temporária a partir desse commit.
2. Usar `codex/<escopo-curto>` para trabalho do Codex e a convenção equivalente
   acordada para outros desenvolvedores.
3. Abrir o primeiro PR exclusivamente da branch temporária para `dev`. PR
   temporária → `main`, commit direto ou cherry-pick para contornar `dev` são
   proibidos.
4. Executar na branch temporária os testes proporcionais ao risco. Após o merge,
   executar sobre `dev` os gates completos aplicáveis e registrar as evidências.
5. Promover somente `dev → main`, sem incluir trabalho parcial, flag sem plano de
   ativação ou checkpoint aberto. A produção recebe exatamente o conjunto
   consolidado e aprovado em `dev`.
6. Se o mecanismo de merge adicionar a `main` um commit que não esteja em `dev`,
   sincronizar `main` de volta para `dev` sem force push ou reescrita. A próxima
   branch só nasce depois de `dev` estar atualizada.
7. Manter a branch temporária até a promoção para `main` e o smoke produtivo
   concluírem. Com o resultado consolidado, remover o worktree associado e
   apagar a branch temporária local e em `origin`.
8. Em caso de falha, interromper a promoção e corrigir pela mesma branch
   temporária ou por uma nova branch criada da `dev` atualizada. `dev` e `main`
   nunca são apagadas.

Esse fluxo é requisito de entrega. Uma feature não alcança CP6 enquanto existir
somente na branch temporária ou em `dev`, e a limpeza da branch não acontece
antes da comprovação em produção.

## Checkpoints

| Checkpoint | Evidência necessária |
|---|---|
| **CP0 — Ready** | Resultado, dependências, decisões, escopo, entrypoints, riscos e critérios de aceite completos. |
| **CP1 — Contrato** | Modelo de dados, permissões, API/RPC, estados, eventos e compatibilidade futura definidos. |
| **CP2 — Caminho fino** | Happy path mobile funcionando ponta a ponta atrás de flag, sem integração externa irreversível. |
| **CP3 — Robustez** | Erros, concorrência, idempotência, RLS, abuso, privacidade e cancelamento cobertos. |
| **CP4 — Experiência** | Android, iPhone, acessibilidade, navegador interno e compartilhamento real pelo WhatsApp verificados. |
| **CP5 — Piloto** | Deploy isolado, smoke test, métricas, alerta, fallback e rollback exercitados. |
| **CP6 — Done** | Critérios com evidência, documentação sincronizada, flag/rollout definidos e checkpoint limpo. |

Cada checkpoint deve deixar o repositório em estado válido. Se o trabalho parar, a próxima pessoa retoma pelo pacote e por `docs/work/current.md`, sem reconstruir a investigação.

## Definition of Ready

Um pacote pode começar quando:

- há um único resultado demonstrável;
- dependências estão concluídas ou possuem fallback explícito;
- nenhuma decisão pendente altera schema, autorização ou contrato público;
- passado, presente e compatibilidade futura estão registrados;
- escopo incluído e excluído está claro;
- critérios de aceite cobrem sucesso e falhas importantes;
- papéis, dados pessoais, consentimento, retenção e abuso foram avaliados;
- entrypoints e comandos de validação foram localizados;
- migration, integração externa, flag e rollout foram identificados quando aplicáveis.

Um pacote de descoberta `DP-*` usa uma Definition of Ready reduzida: pergunta e consumidor estão claros, opções e evidências necessárias estão listadas e seu único resultado permanente é uma decisão, protótipo descartável ou threat model. Ele não altera schema de produção nem inicia a feature dependente.

## Caminho de implementação

1. **Reproduzir e validar a base.** Confirmar working tree, comportamento atual e testes focados.
2. **Fechar o contrato.** Atualizar ADR ou pacote antes do código quando mudar domínio, segurança ou API.
3. **Expandir com compatibilidade.** Para banco, adicionar estrutura sem remover a anterior.
4. **Entregar o caminho fino.** Implementar UI → Action → domínio/RPC → banco em uma jornada mínima atrás de flag.
5. **Endurecer.** Cobrir negações, isolamento, concorrência, retry, cancelamento, privacidade e acessibilidade.
6. **Validar em camadas.** Começar pelos testes focados e terminar com os gates completos.
7. **Pilotar.** Ativar para um time/coorte, observar e manter fallback.
8. **Concluir.** Registrar evidências, atualizar documentação e limpar o checkpoint.
9. **Contrair depois.** Remover compatibilidade antiga apenas em release posterior e com evidência de migração.

## Validação proporcional

Os pacotes referenciam estes perfis para não repetir comandos:

| ID | Mudança | Loop rápido | Gate antes do PR | Evidência adicional |
|---|---|---|---|---|
| `VAL-APP` | Regra ou UI | teste Vitest focado + `npm run typecheck` | `npm run verify` | fluxo mobile e acessibilidade |
| `VAL-DB` | Banco/RLS/RPC | pgTAP focado quando possível | `npm run db:reset`, `npm run db:lint`, `npm run db:test`, `npm run db:types` | tipos sem diff, casos cross-tenant e migration imutável |
| `VAL-LINK` | Link ou autenticação | testes de regra e redirecionamento | `VAL-APP` + `VAL-DB` | replay, encaminhamento, revogação, transporte, logs e aparelho novo |
| `VAL-WA` | WhatsApp/webhook | adapter e idempotência | `VAL-APP` + `VAL-DB` | assinatura, retry, dead-letter, dry-run e payload redigido |
| `VAL-PUBLIC` | Página pública | projeção mínima | `VAL-APP` e banco quando aplicável | consentimento, metadados, cache e smoke anônimo |
| `VAL-INFRA` | Infraestrutura | fmt/validate/plano focado | `terraform-check` e demais workflows afetados | plano revisado, mesmo artefato aplicado e rollback |

Antes de uma liberação de produção, executar também `npm run security:audit`. Testes E2E mobile e smoke pós-deploy ainda precisam ser incorporados à automação na R00.

## Redução de pontos de falha

- migrations aplicadas são imutáveis e mudanças destrutivas usam expand/contract;
- expansão de banco é publicada e verificada antes do consumidor; quando isso não for possível, aplicação e banco toleram as duas ordens de deploy;
- integrações externas ficam atrás de adapter, outbox idempotente, retry, dead-letter e kill switch;
- flags de produto são verificadas no servidor e no banco; nunca funcionam como autorização apenas na interface;
- produzir e consumir notificações usam controles separados;
- jobs começam em dry-run quando houver efeito externo;
- toda operação repetível recebe chave de idempotência;
- nenhuma feature publica dados pessoais diretamente de tabela-base;
- estados derivados são reconstruíveis a partir da fonte autoritativa;
- rollback de banco é forward-only; restore fica reservado a perda ou corrupção;
- o fallback manual permanece documentado até a automação provar estabilidade.

## Definition of Done

Uma feature está concluída quando:

- todos os critérios de aceite têm evidência verificável;
- a jornada passa de ponta a ponta em celular;
- o acesso pelo WhatsApp não exige copiar código, procurar contexto ou repetir autenticação normal;
- autorização, RLS, isolamento, privacidade e retenção estão cobertos;
- falhas e retries não deixam estado parcial ou duplicado;
- telemetria diferencia sucesso, erro esperado e falha operacional;
- deploy funciona com ordem independente entre aplicação e banco;
- flag, piloto, fallback e rollback estão documentados;
- documentação e tipos estão sincronizados;
- `docs/work/current.md` não contém pendência oculta.

## Handoff e retomada

Ao interromper trabalho, atualizar [`work/current.md`](work/current.md) com:

- release, pacote, branch/commit e checkpoint;
- critérios já concluídos;
- arquivos modificados;
- último comando executado e resultado;
- bloqueio real, se houver;
- próxima ação ou comando exato.

Não registrar narrativa longa, hipóteses descartadas ou saída integral de ferramentas. Evidências permanentes pertencem ao pacote da release, ao teste ou ao pull request.
