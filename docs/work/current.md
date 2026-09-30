---
release: R16
work_package: WP-R16-06
scope: operacoes_em_lote
branch_or_commit: "c44ca30"
checkpoint: CP3
status: idle
completed_ac: []
tests:
  - "PASS: git diff --check"
  - "PASS: npm run test:context"
  - "PASS: npm run db:reset, npm run db:lint e npm run db:test (2.285 testes)"
  - "PASS: npm run lint, npm run typecheck e npm run test (826 testes)"
  - "PASS: npm run test:context, npm run migrations:check e npm run security:audit (0 vulnerabilidades)"
  - "PASS: build Webpack; Turbopack local bloqueado somente pelo acesso ao Google Fonts"
blocker: null
next_action: "Executar BAT-04: concorrência, replay após perda de rede, acessibilidade e desempenho."
---

# Trabalho atual

O CP3 de `WP-R16-06` está fechado no guia
[Operações em lote com prévia e recuperação](../releases/work-packages/WP-R16-06-operacoes-em-lote.md).
A capacidade permanece desligada globalmente. O lote permite deslocar horário,
definir horário civil, local ou duração, adiar, deixar data a definir, cancelar
eventos avulsos e aplicar uma mudança a este e aos próximos jogos de uma série.
Cadastros pendentes podem ser aprovados ou rejeitados pela mesma decisão.

O contrato limita cada confirmação a 50 registros de um único time, domínio e
ação. Seleção e prévia não escrevem; confirmação revalida sessão, papel, versão,
elegibilidade e conflitos numa transação atômica e idempotente. Mensagens ficam
desligadas por padrão e separadas da gravação. Edição individual permanece como
fallback.

A próxima tarefa é `BAT-04`: comprovar concorrência ampliada, recuperação após
perda de rede, acessibilidade e orçamento de desempenho. A edição individual
continua como fallback e a flag global continua desligada.
