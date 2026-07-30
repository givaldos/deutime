---
release: R02
work_package: WP-R02-03
scope: capability_rsvp_ui
branch_or_commit: "codex/r02-rsvp-robustness"
checkpoint: idle
status: robustness_complete
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
  - "CP3 focado — 4 arquivos/37 testes de revogação, expiração, fechamento, concorrência, encaminhamento, acessibilidade e logs"
  - "npm run verify — lint, typecheck, 24 arquivos/151 testes Vitest e build aprovados"
blocker: null
next_action: "Executar CP4 de WP-R02-03: validar Android, iPhone, navegador interno do WhatsApp, teclado/leitor de tela, compartilhamento real e recuperação após revogação em aparelho novo."
---

# Trabalho atual

O CP3 de `WP-R02-03` endureceu o consumidor contra estado obsoleto: recusas
fechadas revalidam a rota, revogação remove o contexto reconhecido e mudanças
de resposta ou permissão remontam o componente com o estado autoritativo.

Os controles agora usam fieldset, legenda, foco visível, aria-pressed,
aria-busy e regiões vivas atômicas. Logs aceitam apenas códigos externos
limitados e redigem qualquer valor inesperado. Nenhum gate foi habilitado em
produção e `docs/roadmap.md` permanece como alteração local separada do usuário.
