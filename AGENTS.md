# Instruções de desenvolvimento do DeuTime

## Entrada com contexto mínimo

Antes de agir:

1. confira `git status --short` e preserve alterações existentes;
2. execute `npm run context:brief` para localizar release, pacote, checkpoint, IDs e seções relevantes;
3. leia no pacote ativo somente frontmatter, resultado, pacote de trabalho atual e trechos ligados ao pedido;
4. consulte em `docs/product-context.md` somente os IDs referenciados;
5. leia em `docs/development.md` somente o checkpoint ou perfil `VAL-*` necessário;
6. abra inicialmente até três entrypoints de código e dois testes do pacote;
7. amplie a busca apenas por evidência, usando `rg` e `git log -- <caminho>`.

Não carregue por prevenção arquivos completos de roadmap, development, architecture, runbook, pacotes concluídos, evidências históricas ou logs. Saídas extensas devem ser filtradas para comando, causa e linhas acionáveis.

## Roteamento da tarefa

- Consulta, diagnóstico ou documentação local: agente principal, sem plano formal e validação mínima.
- Mudança em um domínio: hipótese explícita, edição focada e teste focado.
- Mudança entre camadas, banco, integração externa, autorização ou rollout: plano curto e checkpoints CP0–CP6.
- Subagentes: somente para duas ou mais frentes independentes de leitura, teste ou triagem. Envie objetivo, caminhos e formato de retorno, não o histórico inteiro. Escritas sobrepostas ficam no agente principal.

Esses limites são o ponto de partida, não licença para ignorar dependências descobertas. Expanda somente quando houver motivo verificável.

## Regras permanentes

- Produto, interface, mensagens e documentação voltada ao usuário ficam em português.
- Toda jornada nasce mobile-first e WhatsApp-first.
- Preserve isolamento multi-time e derive identidade da sessão verificada.
- Actions validam e delegam; invariantes e escritas sensíveis ficam em RPCs transacionais e RLS.
- Tabela nova nasce com RLS, grants mínimos e pgTAP positivo, negativo e cross-tenant.
- Nunca edite migration aplicada; use expand/contract e correção forward-only.
- App e banco toleram as duas ordens de deploy; prefira expansão inerte antes do consumidor.
- Integração externa exige adapter, idempotência, retry, observabilidade e kill switch.
- Feature nova nasce desligada e mantém fallback até o piloto provar estabilidade.
- Não declare pronto sem interface, autorização, testes, telemetria e recuperação operacional aplicáveis.

## Execução e retomada

Use a skill `$executar-release-deutime` em implementação, correção, validação ou retomada de release. Respeite as fronteiras de `docs/architecture.md`, abrindo apenas a seção relacionada; evite ampliar Actions que misturam domínios.

Ao interromper, substitua `docs/work/current.md` pelo último resultado e a próxima ação concreta. Antes do merge, registre evidências no arquivo da release e devolva o checkpoint a `idle`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
