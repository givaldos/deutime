---
release: R02
work_package: WP-R02-01
scope: public_event_mobile_header_hotfix
branch_or_commit: "codex/r02-public-event-mobile-header"
checkpoint: idle
status: completed
completed_ac:
  - "AC-R02-01"
  - "AC-R02-02"
  - "AC-R02-10"
dirty_files:
  - "app/p/[handle]/page.tsx (preexistente, fora do escopo)"
  - "docs/roadmap.md (preexistente, fora do escopo)"
tests:
  - "Reprodução produtiva em 390×844 — header ~328 px e agenda parcialmente encoberta"
  - "Vitest focado — 1 arquivo e 6 testes aprovados"
  - "npm run lint — aprovado"
  - "npm run typecheck — aprovado"
  - "npm run build — aprovado"
  - "PR — quality, Database, CodeQL, dependency review, Terraform e Vercel aprovados"
blocker: null
next_action: "Abrir o CP0 de WP-R02-02 e fechar o contrato mínimo de capability e sessão persistente antes de implementar escrita ou RSVP."
---

# Trabalho atual

O hotfix do piloto de `WP-R02-01` compactou o header mobile da página pública e
colocou o cartão da agenda em uma camada explícita acima dele. A alteração é
somente visual e mantém o contrato anônimo existente.

`Demo Campo` continua como única coorte com `public_event_page=true`; capability
e RSVP permanecem desligados. A próxima fatia continua sendo `WP-R02-02`,
começando por CP0 antes de qualquer implementação.
