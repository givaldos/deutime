---
name: executar-release-deutime
description: Executar releases do DeuTime com contexto mínimo e validação proporcional. Usar em implementação, correção, retomada ou validação de código, banco, UI, WhatsApp, rollout e checkpoints CP0-CP6; não usar em planejamento amplo ou documentação isolada.
---

# Executar release do DeuTime

## Preparar

1. Executar `npm run context:brief`; preservar os caminhos sujos reportados e usar o resumo de release, checkpoint e janelas.
2. Abrir somente resultado, pacote atual e seções ligadas ao pedido.
3. Executar `npm run context:brief -- --ids` apenas quando precisar de IDs canônicos e consultar em `docs/product-context.md` somente os exibidos; usar `--map` apenas para estrutura fora das janelas padrão.
4. Consultar em `docs/development.md` apenas o checkpoint e os perfis `VAL-*` aplicáveis.
5. Abrir inicialmente até três entrypoints e dois testes. Expandir por dependência comprovada com `rg` e `git log -- <caminho>`.

Não carregar como prevenção roadmap, architecture, runbook, pacotes concluídos, evidências históricas ou logs completos.

## Executar

- Formular uma hipótese verificável antes de ampliar a busca.
- Em um domínio, editar com o agente principal e validar de forma focada.
- Entre camadas, banco, integração, autorização ou rollout, manter plano curto e checkpoints.
- Delegar somente duas ou mais frentes independentes de leitura, teste ou triagem. Informar objetivo, caminhos e retorno esperado; não enviar o histórico integral.
- Manter escritas sobrepostas no agente principal. Não usar subagentes como requisito de qualidade: eles elevam o consumo total.
- Atualizar contrato ou pacote antes do código quando mudar domínio, segurança ou API.
- Entregar a menor fatia vertical que feche o critério sem relaxar `AGENTS.md`.

## Validar e retomar

1. Rodar primeiro o teste focado do perfil `VAL-*`; executar o gate completo antes do PR, ao cruzar checkpoint ou quando o risco exigir.
2. Reter de falhas somente comando, causa e linhas acionáveis.
3. Registrar evidência duradoura na release; manter `docs/work/current.md` curto e, ao trocar WP/checkpoint, retomar em nova tarefa pelo resumo em vez de carregar a conversa antiga.
4. Não declarar pronto sem interface, autorização, testes, telemetria e recuperação operacional aplicáveis.

Executar `scripts/context-brief.mjs` sem lê-lo; abrir o script apenas para manter esta skill. Ao alterá-lo, rodar `npm run test:context`.
