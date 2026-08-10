---
name: executar-release-deutime
description: Executar implementacoes, correcoes, validacoes ou retomadas ligadas a um pacote de release do DeuTime. Usar quando a tarefa tocar codigo, banco, interface, WhatsApp, rollout ou checkpoints CP0-CP6 do repositorio; nao usar para perguntas gerais, planejamento de produto amplo ou edicoes documentais sem relacao com uma release.
---

# Executar release do DeuTime

## Preparar contexto

1. Executar `npm run context:brief` na raiz do repositorio.
2. Preservar os arquivos sujos reportados e identificar release, pacote de trabalho, checkpoint e proxima acao.
3. Usar o mapa de secoes para abrir somente os trechos do pacote relacionados ao pedido.
4. Consultar em `docs/product-context.md` somente os IDs listados no resumo.
5. Consultar em `docs/development.md` somente o checkpoint e os perfis `VAL-*` aplicaveis.
6. Abrir inicialmente no maximo tres entrypoints de codigo e dois testes. Expandir com `rg` e `git log -- <caminho>` apenas quando uma evidencia exigir.

Nao carregar `docs/roadmap.md`, `docs/development.md`, `docs/architecture.md`, logs completos ou pacotes concluidos como contexto preventivo.

## Dimensionar a execucao

- Tratar consulta, diagnostico ou edicao documental local sem plano formal e sem subagente.
- Tratar mudanca em um unico dominio com agente principal, hipotese explicita e teste focado.
- Usar plano curto quando houver mais de uma camada, banco, integracao externa, rollout ou risco de autorizacao.
- Delegar somente duas ou mais frentes independentes e predominantemente de leitura, teste ou triagem. Cada subagente recebe objetivo, caminhos permitidos e formato de resposta; nao recebe historico integral.
- Manter escritas sobrepostas no agente principal. Paralelizar escrita apenas quando os caminhos forem disjuntos e o ganho superar o custo de coordenacao.

Subagentes consomem mais tokens no total. Usa-los para proteger o contexto principal e reduzir tempo de parede, nunca como padrao de qualidade.

## Investigar e implementar

1. Formular uma hipotese verificavel antes de ampliar a busca.
2. Preferir `rg -n` com padrao e caminho especificos; limitar saidas extensas.
3. Ler apenas o entorno das ocorrencias relevantes.
4. Atualizar primeiro contrato ou pacote quando a mudanca alterar dominio, seguranca ou API.
5. Implementar a menor fatia vertical que feche o criterio de aceite sem enfraquecer as regras permanentes de `AGENTS.md`.
6. Manter feature flag, fallback, compatibilidade de deploy e recuperacao operacional proporcionais ao risco.

## Validar e registrar

1. Executar primeiro o teste focado indicado pelo perfil `VAL-*`.
2. Ampliar para o gate completo somente antes do PR, ao cruzar checkpoint ou quando o risco exigir.
3. Em caso de falha, reter no contexto apenas comando, causa e linhas acionaveis; nao reproduzir a saida integral.
4. Registrar evidencia duradoura no arquivo de evidencias da release e substituir `docs/work/current.md` com estado e proxima acao concisos.
5. Declarar pronto somente com interface, autorizacao, testes, telemetria e recuperacao operacional aplicaveis.

## Formato de delegacao

Usar este contrato minimo ao criar um subagente:

```text
Objetivo: <uma pergunta verificavel>.
Escopo: <caminhos permitidos>; somente leitura, salvo autorizacao explicita.
Contexto: <IDs ou secao estritamente necessarios>.
Retorno: conclusao, evidencias com arquivo/linha, riscos e proxima acao; sem logs brutos.
```

O script `scripts/context-brief.mjs` gera somente um indice do contexto ativo. Executa-lo sem le-lo; abrir seu codigo apenas para manutencao da propria skill.
