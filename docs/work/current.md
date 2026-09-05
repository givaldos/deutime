---
release: R11
work_package: DP-R11-01
scope: asaas_sandbox_and_contracts
branch_or_commit: "9cf074c"
checkpoint: idle
status: blocked
completed_ac:
  - "R14 promovida pelo fluxo branch temporária → dev → main"
  - "criação de novas equipes protegida por convite individual em produção"
  - "RLS, grants, hash, validade, revogação e consumo atômico validados"
  - "ativação, rollback, restauração e smoke produtivo aprovados"
dirty_files:
  - "docs/backlog.md"
  - "docs/roadmap.md"
  - "docs/releases/R14-acesso-por-convite.md"
  - "docs/releases/README.md"
  - "docs/work/current.md"
tests:
  - "PASS: PR #393 branch temporária → dev"
  - "PASS: PR #394 dev → main"
  - "PASS: 606 testes de aplicação"
  - "PASS: 70 arquivos e 1833 testes pgTAP"
  - "PASS: deploy Supabase 33983401376"
  - "PASS: smoke de produção 33983439072"
  - "PASS: produção ativa com 1 convite disponível e 0 resgates"
blocker: "R11 aguarda ASAAS_SANDBOX_API_KEY e decisões comerciais de preço, benefícios, limites, carência, cancelamento, grandfathering e suporte financeiro."
next_action: "Configurar a chave sandbox do Asaas, aprovar as políticas comerciais e executar os sete testes contratuais da R11."
---

# Trabalho atual

A CP6 da R14 está encerrada em produção. Novas equipes exigem código individual;
o primeiro convite está disponível e a política terminou ativa depois do ensaio
de rollback. A próxima frente volta a ser a validação contratual da assinatura
R11, bloqueada somente por credencial Sandbox e decisões comerciais externas.
