---
release: R12
work_package: WP-R12-04
scope: registration_email_alerts
branch_or_commit: "codex/r12-ses-activation"
checkpoint: CP5
status: blocked
completed_ac:
  - AC-R12-11
  - AC-R12-12
  - AC-R12-13
dirty_files: []
tests:
  - "lint, TypeScript, 112 arquivos/547 testes e 4 testes de contexto aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado somente pela abertura de porta no sandbox"
  - "62 arquivos/1.587 testes pgTAP, reset, tipos, lint sem alerta novo e integridade de migrations aprovados"
  - "42 provas focadas de privilégio, idempotência, opt-out, retry, ambiguidade e isolamento cross-tenant"
  - "smoke local em 360 px: preferência habilitada, sem overflow e console limpo"
  - "Terraform formatado e válido; adapter AWS SES v2 usa IAM mínimo e o agendamento usa o GitHub Actions compatível com o plano Hobby"
  - "SES us-east-1 fora do sandbox, identidade deutime.app e MAIL FROM verificados; configuration set deutime-transactional com métricas CloudWatch"
  - "canário sem destinatários retornou HTTP 503; consumo foi desligado imediatamente e novos alertas permaneceram desligados"
  - "npm audit sem vulnerabilidades"
blocker: "O deployment atual da Vercel não recebeu um conjunto SES válido: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, SES_FROM_EMAIL, SES_SENDER_NAME e SES_CONFIGURATION_SET."
next_action: "Conferir as seis variáveis no ambiente Production da Vercel, remover AWS_SESSION_TOKEN quando forem usadas chaves IAM permanentes, redeployar main e repetir o canário com a fila zerada."
---

# Trabalho atual

A R12 está ativa. O `WP-R12-04` entregou o aviso mínimo e idempotente de novo
cadastro público pendente, com preferência individual, destinatários
recalculados, AWS SES v2 e outbox privado sem PII.

App, banco, worker, infraestrutura e jornada mobile foram validados. O próximo
pacote é `WP-R12-05`: oferecer durações e prazos de confirmação coerentes na
criação, edição e recorrência de eventos.
