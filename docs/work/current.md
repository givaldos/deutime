---
release: R02
work_package: WP-R02-02
scope: capability_experience
branch_or_commit: "codex/r02-capability-experience"
checkpoint: idle
status: awaiting_manual_validation
completed_ac: []
dirty_files: []
tests:
  - "npm run verify — lint, typecheck, 20 arquivos/120 testes Vitest e build aprovados"
  - "npm run security:audit — zero vulnerabilidades"
  - "Chrome 360x800 e 390x844 — sem overflow; alvo da marca 44px e CTA 48px"
  - "Navegador interno — fragmento removido, URL limpa e fallback acessível"
blocker: "Falta executar a matriz em aparelhos físicos Android e iPhone no navegador real do WhatsApp."
next_action: "Após publicar a correção, abrir o link público pelo WhatsApp em Android e iPhone; confirmar layout, retorno, cópia/compartilhamento e remoção do fragmento, mantendo RSVP e gates desligados."
---

# Trabalho atual

O CP4 corrigiu o alvo tátil da marca para 44 px e adicionou foco de teclado
explícito. Viewports de 360×800 e 390×844 passaram sem overflow, inclusive com
título longo, e a estrutura semântica permaneceu consistente.

Em produção, primeira abertura e fragmento ambíguo removeram `#c`, limparam a
URL e mantiveram o fallback público acessível. O caminho também foi exercitado
em navegador interno controlado, sem ativar gate ou criar capability válida.

O checkpoint está ocioso, mas CP4 não está concluído: falta a evidência em
aparelhos físicos Android e iPhone dentro do navegador real do WhatsApp. A
próxima ação é publicar esta correção e executar a matriz manual nesses dois
aparelhos.
