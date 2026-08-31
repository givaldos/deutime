---
release: R12
work_package: WP-R12-06
scope: robustness_pilot_recovery
branch_or_commit: "091857c"
checkpoint: idle
status: done
completed_ac:
  - AC-R12-01
  - AC-R12-02
  - AC-R12-03
  - AC-R12-04
  - AC-R12-05
  - AC-R12-06
  - AC-R12-07
  - AC-R12-08
  - AC-R12-09
  - AC-R12-10
  - AC-R12-11
  - AC-R12-12
  - AC-R12-13
  - AC-R12-14
  - AC-R12-15
  - AC-R12-16
  - AC-R12-17
dirty_files: []
tests:
  - "115 arquivos/557 testes de aplicação e 4 testes de contexto aprovados"
  - "63 arquivos/1.616 testes pgTAP; 158 provas focadas da R12"
  - "lint, TypeScript, tipos, migrations, build Webpack e auditoria aprovados"
  - "360 px: link legado seguro, sem overflow/console e alvos de 44 a 66 px"
  - "PRs #352 e #353; Vercel, Supabase, CI, Database, CodeQL, Terraform e smoke aprovados"
  - "piloto SES: fallback sem destinatário e accepted=1 no simulador oficial, sem falha/revisão"
  - "piloto de autonomia autenticado, rollback completo, restauração saudável e limpeza zerada"
blocker: null
next_action: "Iniciar o CP0 da R13, fechando vocabulário, equipes padrão, regulamento e matriz de conflitos antes de implementar."
---

# Trabalho atual

A R12 encerrou CP6 em produção. Os 17 critérios possuem evidência, os três
controles permanecem ativos e a sonda final não encontrou fila, falha, revisão,
encerramento travado, limpeza pendente ou dado sintético residual.

O piloto comprovou autonomia autenticada, fallback do dashboard, transporte
AWS SES com o simulador oficial, rollback na ordem segura e restauração do
rollout. `main` foi sincronizada de volta em `dev` pela PR `#354`.

A próxima frente permitida é o CP0 da R13. Nenhuma implementação deve começar
antes de fechar vocabulário, equipes padrão, regulamento e matriz de conflitos.
