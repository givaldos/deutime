---
release: R16
work_package: WP-R16-07
scope: equipes_campeoes_estatisticas
branch_or_commit: "codex/r16-07-contract"
checkpoint: CP1
status: idle
completed_ac: []
tests:
  - "PASS: BAT-04 em dev e main; smoke de produção e reconciliação main em dev"
  - "PASS: git diff --quiet origin/dev origin/main; main é ancestral de dev"
  - "PASS: contrato CP1 documenta fonte, campeão, autorização, API, estados, flag e fallback"
  - "PASS: lint, typecheck, 838 testes de aplicação, contexto 4/4 e controlador 13/13"
  - "PASS: build Next.js com Webpack"
  - "LIMITAÇÃO LOCAL: npm run verify chegou ao build Turbopack, que falhou ao buscar fontes do Google no sandbox"
blocker: "WP-R16-06 continua sem CP4: revisão móvel e no WhatsApp e correção de braces antes da liberação global. Isso não bloqueia a implementação privada do CP2 do WP-R16-07."
next_action: "Implementar CP2 do WP-R16-07: flag desligada, RPC privada de campanha de uma equipe e interface móvel com fallback; validar banco e app antes de PR."
---

# Trabalho atual

O próximo recorte é o [WP-R16-07](../releases/work-packages/WP-R16-07-equipes-estatisticas.md).
O CP1 define a origem das métricas por partida e lado, o predicado de campeão,
as permissões, a API privada, os estados sem dados e o fallback. Ainda não há
implementação, flag ativa ou aceite dos critérios `AC-R16-19` a `21`.
O próximo passo é uma campanha privada por equipe em CP2. O contrato também
registra que `completed` não possui hoje transição autorizada; não exibir
campeão antes de implementá-la e validá-la.

A BAT-04 do [WP-R16-06](../releases/work-packages/WP-R16-06-operacoes-em-lote.md)
foi integrada por #549 e #550; #551 reconciliou `main` em `dev`. O registro
final entrou por #552 e #553; #554 reconciliou novamente `main` em `dev`.
CI, Database, CodeQL, Terraform, deploy do banco e smoke público sem escrita
passaram. As branches temporárias foram removidas. `batch_operations` continua
desligada globalmente. CP4, a revisão futura em Android, iPhone e navegador
interno do WhatsApp, e a correção de `braces` permanecem pendentes antes da
liberação global da R16.
