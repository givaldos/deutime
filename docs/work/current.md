---
release: R12
work_package: WP-R12-04
scope: registration_email_alerts
branch_or_commit: "codex/r12-registration-email"
checkpoint: idle
status: done
completed_ac:
  - AC-R12-11
  - AC-R12-12
  - AC-R12-13
dirty_files: []
tests:
  - "lint, TypeScript, 112 arquivos/546 testes e 4 testes de contexto aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado somente pela abertura de porta no sandbox"
  - "62 arquivos/1.587 testes pgTAP, reset, tipos, lint sem alerta novo e integridade de migrations aprovados"
  - "42 provas focadas de privilégio, idempotência, opt-out, retry, ambiguidade e isolamento cross-tenant"
  - "smoke local em 360 px: preferência habilitada, sem overflow e console limpo"
  - "Terraform formatado e válido; adapter SMTP exige TLS 1.2 e o agendamento usa o GitHub Actions compatível com o plano Hobby"
  - "npm audit sem vulnerabilidades"
blocker: null
next_action: "Iniciar WP-R12-05 pelo contrato compartilhado de duração e fechamento de confirmação dos eventos."
---

# Trabalho atual

A R12 está ativa. O `WP-R12-04` entregou o aviso mínimo e idempotente de novo
cadastro público pendente, com preferência individual, destinatários
recalculados, SMTP seguro e outbox privado sem PII.

App, banco, worker, infraestrutura e jornada mobile foram validados. O próximo
pacote é `WP-R12-05`: oferecer durações e prazos de confirmação coerentes na
criação, edição e recorrência de eventos.
