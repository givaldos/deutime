---
release: R11
work_package: DP-R11-01
scope: asaas_sandbox_and_contracts
branch_or_commit: "00a09a3"
checkpoint: idle
status: blocked
completed_ac:
  - "R13 promovida pelo fluxo branch temporária → dev → main"
  - "catálogo global com 16 capacidades e 80/80 flags ativas em produção"
  - "seis controles operacionais ativos e cinco de cinco times configurados"
  - "rollback e restauração exercitados sem perda de dados"
  - "saúde global e smoke público aprovados"
dirty_files:
  - "docs/work/current.md"
  - "docs/backlog.md"
  - "docs/roadmap.md"
  - "docs/releases/README.md"
  - "docs/releases/R11-assinatura-asaas.md"
  - "docs/releases/R13-agenda-e-competicoes-profissionais.md"
tests:
  - "PASS: PR #388 branch temporária → dev"
  - "PASS: PR #389 dev → main"
  - "PASS: deploy Supabase 33870569996"
  - "PASS: smoke de produção 33870624292"
  - "PASS: produção com 80/80 flags, 6/6 controles e 5/5 times configurados"
  - "PASS: rollback/restauração preservou 23 eventos, 215 presenças, 10 equipes internas, 2 campeonatos e 1 regulamento"
  - "PASS: saúde global sem conflitos vencidos, divergências de agenda ou falhas de notificação"
blocker: "R11 aguarda ASAAS_SANDBOX_API_KEY e decisões comerciais de preço, benefícios, limites, carência, cancelamento, grandfathering e suporte financeiro."
next_action: "Configurar a chave sandbox do Asaas, aprovar as políticas comerciais e executar os sete testes contratuais da R11."
---

# Trabalho atual

A CP6 da R13 está encerrada em produção. O catálogo completo está ativo para
todos os times e o rollback transacional foi exercitado e restaurado sem perda
de dados. A próxima frente é a validação contratual da assinatura R11, hoje
parada apenas pelas credenciais sandbox e decisões comerciais externas ao
código.
