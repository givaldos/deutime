---
release: R16
work_package: WP-R16-07
scope: equipes_campeoes_estatisticas
branch_or_commit: "codex/r16-07-cp0"
checkpoint: CP0
status: idle
completed_ac: []
tests:
  - "PASS: BAT-04 em dev e main; smoke de produção e reconciliação main em dev"
  - "PASS: git diff --quiet origin/dev origin/main; main é ancestral de dev"
  - "PENDENTE: contrato de agregação e permissão do WP-R16-07 no CP1"
blocker: "WP-R16-06 continua sem CP4: revisão móvel e no WhatsApp e correção de braces antes da liberação global. Não bloqueia o contrato privado do WP-R16-07."
next_action: "Fechar CP1 do WP-R16-07: predicado de campeão, métricas por partida/lado/participação, matriz de leitura, flag e fallback antes de alterar banco ou interface."
---

# Trabalho atual

O próximo recorte é o [WP-R16-07](../releases/work-packages/WP-R16-07-equipes-estatisticas.md).
Seu CP0 registra o resultado demonstrável, as fontes de dados existentes,
dependências, limites e critérios `AC-R16-19` a `21`. Ainda não há implementação,
flag ativa ou aceite desses critérios. O CP1 precisa fechar agregação,
autorização, consentimento e compatibilidade antes do código.

A BAT-04 do [WP-R16-06](../releases/work-packages/WP-R16-06-operacoes-em-lote.md)
foi integrada por #549 e #550; #551 reconciliou `main` em `dev`. O registro
final entrou por #552 e #553; #554 reconciliou novamente `main` em `dev`.
CI, Database, CodeQL, Terraform, deploy do banco e smoke público sem escrita
passaram. As branches temporárias foram removidas. `batch_operations` continua
desligada globalmente. CP4, a revisão futura em Android, iPhone e navegador
interno do WhatsApp, e a correção de `braces` permanecem pendentes antes da
liberação global da R16.
