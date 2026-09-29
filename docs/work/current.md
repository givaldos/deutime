---
release: R16
work_package: WP-R16-06
scope: operacoes_em_lote
branch_or_commit: "codex/r16-batch-contract"
checkpoint: CP1
status: idle
completed_ac: []
tests:
  - "PASS: git diff --check"
  - "PASS: npm run test:context"
  - "PASS: npm run db:reset, npm run db:lint e npm run db:test (2.247 testes)"
  - "PASS: npm run lint, npm run typecheck e npm run test (814 testes)"
  - "PASS: npm run test:context e npm run security:audit (0 vulnerabilidades)"
  - "PASS: build Webpack; Turbopack local bloqueado somente pelo acesso ao Google Fonts"
blocker: null
next_action: "Executar BAT-02: caminho fino mobile para conferir e alterar jogos selecionados, preservando escrita atômica e idempotente."
---

# Trabalho atual

O CP1 de `WP-R16-06` está fechado no guia
[Operações em lote com prévia e recuperação](../releases/work-packages/WP-R16-06-operacoes-em-lote.md).
A expansão permanece inerte: nenhuma flag foi ativada e as confirmações falham
fechado até as próximas fatias.

O contrato limita cada confirmação a 50 registros de um único time, domínio e
ação. Seleção e prévia não escrevem; confirmação revalida sessão, papel, versão,
elegibilidade e conflitos numa transação atômica e idempotente. Mensagens ficam
desligadas por padrão e separadas da gravação. Edição individual permanece como
fallback.

A próxima tarefa é `BAT-02`: implementar o caminho fino mobile para selecionar,
conferir e alterar jogos. A confirmação deve revalidar versões e conflitos numa
transação atômica e idempotente; edição individual continua como fallback.
