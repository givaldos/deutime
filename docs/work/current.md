---
release: R16
work_package: null
scope: revisao_home_publica
branch_or_commit: "codex/home-publica"
checkpoint: CP3
status: idle
completed_ac: []
tests:
  - "PASS: npm run verify (lint, TypeScript, 830 testes, contexto, controlador e build Turbopack)"
  - "PASS: home em 320, 360, 1280 e 1440 px sem rolagem horizontal"
  - "PASS: demonstração e FAQ por teclado; caminhos de cadastro, login e recuperação"
  - "PASS: git diff --check"
blocker: null
next_action: "Revisar a prévia da home e validar aparelhos, leitor de tela e navegador do WhatsApp antes de integrar por PR para dev."
---

# Trabalho atual

Esta worktree contém a revisão visual da home e da entrada pública, solicitada
separadamente dos pacotes em andamento. A
[evidência](../releases/evidence/home-publica-2026-10-06.md) reúne escopo,
validação e limites. Não há aceite CP4, PR, merge ou publicação desta proposta.

O trabalho de operações em lote permanece na branch `codex/bat-04` e em seu
checkpoint próprio. Esta implementação não altera esse trabalho nem declara
encerrados os pacotes R16. A base desta branch é `dev` em `0358efe`.
