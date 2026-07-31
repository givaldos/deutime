---
release: R02
work_package: WP-R02-04
scope: risk_metadata_devices
branch_or_commit: "codex/r02-risk-metadata-contract"
checkpoint: idle
status: ready_for_physical_validation
completed_ac:
  - "AC-R02-03"
  - "AC-R02-04"
  - "AC-R02-05"
  - "AC-R02-06"
  - "AC-R02-07"
  - "AC-R02-08"
dirty_files:
  - "app/e/[publicId]/access/route.test.ts"
  - "app/e/[publicId]/page.test.tsx"
  - "docs/releases/R02-confirmacao-pelo-link.md"
  - "docs/security.md"
  - "docs/work/current.md"
tests:
  - "CP1 — matriz AC-R02-04/05/07/08 consolidada"
  - "registro Twilio/WhatsApp — DPA, termos específicos, suboperadores, dados e gates mapeados"
  - "Vitest focado — 4 arquivos/38 testes aprovados"
  - "npm run typecheck — aprovado"
  - "npm run verify — lint, typecheck e 25 arquivos/155 testes aprovados; build repetido com rede e aprovado"
blocker: null
next_action: "Integrar o CP1 e repetir a matriz física para concluir AC-R02-09."
---

# Trabalho atual

O CP1 de `WP-R02-04` consolidou a evidência técnica de `AC-R02-04`, `05`, `07`
e `08`. Duas regressões estreitas tornam explícito que metadata não consulta
contexto privado e que a troca mantém os headers de isolamento sem refletir a
credencial recebida.

O registro do fornecedor mapeia Twilio/WhatsApp, conteúdo conhecido, DPA,
termos específicos, suboperadores, minimização e gates antes de atletas reais.
O produto deixa explícito que o provedor conhece o link personalizado; remover
o fragmento protege a jornada posterior, não o envio já realizado.

O reteste físico da correção que colocou o RSVP no topo continua necessário
para `AC-R02-09`. A alteração local do usuário em `docs/roadmap.md` permanece
separada.
