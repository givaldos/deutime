---
release: R16
work_package: WP-R16-06
scope: operacoes_em_lote
branch_or_commit: "20879b1246686eb29f201781cf4d3b01d27f1837"
checkpoint: CP0
status: idle
completed_ac: []
tests:
  - "PASS: git diff --check"
  - "PASS: npm run test:context"
  - "PASS: PR #520 integrou CP0 em dev; PR #521 promoveu para main"
  - "PASS: CI 36509279612, banco 36509279553, CodeQL 36509279560, Terraform 36509279598 e smoke 36509283183"
  - "PASS: PR #522 reconciliou main em dev sem diferença de conteúdo"
blocker: null
next_action: "Executar BAT-01 em nova tarefa: fechar CP1 com expansão inerte, flag batch_operations e contratos das prévias/confirmações."
---

# Trabalho atual

O CP0 de `WP-R16-06` está fechado no guia
[Operações em lote com prévia e recuperação](../releases/work-packages/WP-R16-06-operacoes-em-lote.md).
A implementação ainda não começou.

O contrato limita cada confirmação a 50 registros de um único time, domínio e
ação. Seleção e prévia não escrevem; confirmação revalida sessão, papel, versão,
elegibilidade e conflitos numa transação atômica e idempotente. Mensagens ficam
desligadas por padrão e separadas da gravação. Edição individual permanece como
fallback.

A próxima tarefa é `BAT-01`: adicionar a expansão inerte, a flag tipada
`batch_operations`, os modelos de seleção/prévia e as assinaturas estreitas para
eventos e atletas. Nenhum consumidor deve usar o contrato antes de RLS, grants,
compatibilidade N/N-1, tipos e testes focados estarem fechados no CP1.
