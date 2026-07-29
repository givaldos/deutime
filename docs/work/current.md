---
release: R02
work_package: WP-R02-03
scope: capability_rsvp_ui
branch_or_commit: "codex/r02-rsvp-ui"
checkpoint: idle
status: thin_path_complete
completed_ac: []
dirty_files: []
tests:
  - "Vitest focado — contratos, DAL, Action, componente e rota pública aprovados"
  - "npm run db:reset — 30 migrations e seed aplicados"
  - "npm run db:test — 21 arquivos/494 testes pgTAP aprovados"
  - "npm run db:lint — nenhum aviso novo"
  - "npm run db:types — sem diferença"
  - "npm run migrations:check -- 64a8bc0 — aprovado"
  - "teste físico local 390x844 — Confirmado → Não vou → Talvez e fallback com flag desligada"
  - "npm run verify — lint, typecheck, 24 arquivos/144 testes Vitest e build aprovados"
  - "npm run security:audit — zero vulnerabilidades"
blocker: null
next_action: "Executar CP3 de WP-R02-03: endurecer concorrência e estados obsoletos na Action/UI, ampliar acessibilidade e testar revogação, expiração, fechamento e aparelho encaminhado no consumidor."
---

# Trabalho atual

O CP2 de `WP-R02-03` conectou a RPC transacional à página pública reconhecida.
A Action aceita apenas `publicId` e SIM/NÃO/TALVEZ; a capability permanece no
cookie `HttpOnly` e a sessão verificada continua como fallback derivado no
banco.

O caminho físico local alterou a mesma presença de Confirmado para Não vou e
Talvez, sem overflow em 390×844 e sem segredo na auditoria. Com a flag local
desligada, a resposta permaneceu visível e os controles foram substituídos pelo
CTA da agenda. Nenhum gate foi habilitado em produção.
