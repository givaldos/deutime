---
release: R02
work_package: WP-R02-04
scope: risk_metadata_devices
branch_or_commit: "02c92ce"
checkpoint: idle
status: ready_for_cp1
completed_ac:
  - "AC-R02-03"
  - "AC-R02-06"
dirty_files:
  - "docs/releases/R02-confirmacao-pelo-link.md"
  - "docs/work/current.md"
tests:
  - "CP0 — decisões, segurança, bootstrap, rota, headers, metadata e suítes existentes inventariados"
  - "git diff --check — aprovado"
  - "PR #56 — CI, CodeQL, Database, dependency review, Terraform, Vercel e smoke aprovados"
blocker: null
next_action: "Executar o CP1 de WP-R02-04: consolidar evidências de AC-R02-04/05/07/08, registrar exposição inevitável ao fornecedor e fechar regressões faltantes antes da matriz física."
---

# Trabalho atual

O CP0 de `WP-R02-04` fechou a fatia de risco, metadata e dispositivos sem criar
novo contrato técnico. A rota pública, troca same-origin, cookie restrito,
headers, metadata, isolamento, replay, concorrência, revogação e fallback já
possuem implementação e evidência nas fatias anteriores.

O CP1 deve transformar essa evidência dispersa em uma matriz rastreável para
`AC-R02-04`, `05`, `07` e `08`, cobrindo também o registro de que o provedor de
WhatsApp conhece necessariamente o link enviado. Não entram automação de
WhatsApp, fingerprinting, dados de dispositivo ou nova infraestrutura.

O reteste físico da correção que colocou o RSVP no topo continua necessário
para `AC-R02-09`, mas não bloqueia o CP1 documental e de regressão. A alteração
local do usuário em `docs/roadmap.md` permanece separada.
