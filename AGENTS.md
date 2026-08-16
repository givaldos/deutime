# Instruções de desenvolvimento do DeuTime

## Entrada e contexto

Reduzir contexto nunca reduz invariantes, validação ou critérios de aceite.

- Em implementação, correção, retomada ou validação de release, use `$executar-release-deutime`; o resumo da skill já inclui worktree e contexto ativo.
- Fora de release, confira `git status --short`, preserve alterações existentes e inspecione apenas os caminhos do pedido; não execute `context:brief` sem necessidade de contexto de release.
- Abra documentos por seção e IDs canônicos por demanda. Não carregue preventivamente arquivos completos, pacotes concluídos, evidências históricas ou logs.
- Amplie a busca somente por dependência comprovada, usando `rg` e `git log -- <caminho>`; filtre saídas para causa e linhas acionáveis.

## Roteamento da tarefa

- Consulta, diagnóstico ou documentação local: agente principal, sem plano formal.
- Um domínio: hipótese e teste focados. Entre camadas, banco, integração, autorização ou rollout: plano curto e checkpoints CP0–CP6.
- Subagentes: somente para duas ou mais frentes independentes de leitura, teste ou triagem; envie objetivo, caminhos e retorno esperado, não o histórico. Escritas sobrepostas ficam no agente principal.

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

Respeite as fronteiras de `docs/architecture.md`, abrindo apenas a seção relacionada; evite ampliar Actions que misturam domínios.

Ao interromper, substitua `docs/work/current.md` pelo último resultado e a próxima ação concreta. Antes do merge, registre evidências no arquivo da release e devolva o checkpoint a `idle`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
