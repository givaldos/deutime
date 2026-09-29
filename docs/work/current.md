---
release: R16
work_package: WP-R16-06
scope: operacoes_em_lote
branch_or_commit: "7f3ea044206075e33e83d48ae902233f4daab40b"
checkpoint: CP2
status: idle
completed_ac: []
tests:
  - "PASS: git diff --check"
  - "PASS: npm run test:context"
  - "PASS: npm run db:reset, npm run db:lint e npm run db:test (2.265 testes)"
  - "PASS: npm run lint, npm run typecheck e npm run test (819 testes)"
  - "PASS: npm run test:context e npm run security:audit (0 vulnerabilidades)"
  - "PASS: build Webpack; Turbopack local bloqueado somente pelo acesso ao Google Fonts"
blocker: null
next_action: "Executar BAT-03: séries, transições, cancelamento avulso e análise em lote de atletas pendentes."
---

# Trabalho atual

O CP2 de `WP-R16-06` está fechado no guia
[Operações em lote com prévia e recuperação](../releases/work-packages/WP-R16-06-operacoes-em-lote.md).
A capacidade permanece desligada globalmente. O primeiro caminho de escrita
permite selecionar jogos futuros, conferir antes/depois e aplicar deslocamento,
horário civil comum ou duração de forma atômica e idempotente.

O contrato limita cada confirmação a 50 registros de um único time, domínio e
ação. Seleção e prévia não escrevem; confirmação revalida sessão, papel, versão,
elegibilidade e conflitos numa transação atômica e idempotente. Mensagens ficam
desligadas por padrão e separadas da gravação. Edição individual permanece como
fallback.

A próxima tarefa é `BAT-03`: ampliar o contrato para séries, transições,
cancelamento de eventos avulsos e análise de atletas pendentes, sem misturar
domínios ou enviar comunicação implícita. A edição individual continua como fallback.
