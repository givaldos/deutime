---
release: R12
work_package: WP-R12-01
scope: public_interface_corrections
branch_or_commit: "codex/r12-cp0@0896933"
checkpoint: idle
status: ready
completed_ac: []
dirty_files: []
tests:
  - "CP0 documental: contrato, entrypoints, riscos e 17 critérios registrados"
blocker: null
next_action: "Iniciar WP-R12-01 por testes de regressão do slug e da rota /t/{slug}/register."
---

# Trabalho atual

A R12 está promovida e pronta para implementação. `DEC-ACCOUNT-LIFECYCLE`
fecha saída de vínculos, último owner, encerramento de time/conta, retenção e
recuperação. O pacote também fecha `/t/{slug}/register` como rota canônica e
owner/admin ativo como destinatário do aviso mínimo de novo cadastro.

Nenhum código, banco, flag, integração ou interface foi alterado no CP0. A
próxima mudança deve iniciar `WP-R12-01` com testes focados de slug, redirect e
links novos, preservando `/cadastro` como compatibilidade.
