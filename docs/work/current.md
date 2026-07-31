---
release: R03
work_package: DP-R03-01
scope: whatsapp_provider_decision
branch_or_commit: "3d0b1b1"
checkpoint: idle
status: ready_for_review
completed_ac:
  - "AC-R03-01"
dirty_files:
  - "docs/decisions/DEC-WHATSAPP-PROVIDER.md"
  - "docs/releases/R03-whatsapp-ponta-a-ponta.md"
  - "docs/product-context.md"
  - "docs/releases/README.md"
  - "docs/architecture.md"
  - "docs/security.md"
  - "docs/work/current.md"
tests:
  - "Documentação oficial Twilio — templates, Sandbox, status, webhooks, assinatura e sender revisados"
  - "Contrato confrontado com notification_outbox, communication_consents e kill switches existentes"
blocker: null
next_action: "Revisar e integrar DP-R03-01; implementação de WP-R03-01 aguarda a validação temporal final de AC-R02-09."
---

# Trabalho atual

`DEC-WHATSAPP-PROVIDER` seleciona Twilio Programmable Messaging + Content API
para as mensagens operacionais da R03. O adapter permanece provider-neutral e
separado do Twilio usado pelo Supabase Auth para OTP. Sandbox é somente demo;
produção real exige sender próprio, template aprovado e callbacks assinados.

O pacote R03 foi criado em `discovery`. Nenhuma migration, integração, template,
flag ou efeito externo foi produzido. A implementação aguarda o retorno em
outro dia de `AC-R02-09`; enquanto isso, a decisão pode ser revisada e integrada
sem alterar o comportamento da R02.

A alteração local do usuário em `docs/roadmap.md` permanece separada.
