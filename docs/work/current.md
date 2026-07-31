---
release: R02
work_package: WP-R02-04
scope: event_link_temporal_return
branch_or_commit: "22660a5"
checkpoint: idle
status: ready_for_temporal_validation
completed_ac:
  - "Android — WhatsApp interno, navegador padrão e reabertura aprovados"
  - "iPhone — WhatsApp interno, navegador padrão e reabertura aprovados"
  - "RSVP Sim permaneceu autoritativo nos dois aparelhos"
dirty_files:
  - "docs/releases/R02-confirmacao-pelo-link.md"
  - "docs/work/current.md"
tests:
  - "Produção — link personalizado novo trocado com sucesso"
  - "Produção — resposta Sim registrada"
  - "Produção — fechar e reabrir preservou Sim em Android e iPhone"
  - "Produção — navegador padrão preservou contexto em Android e iPhone"
blocker: null
next_action: "Em outro dia, reabrir a mensagem original nos dois aparelhos e confirmar que o evento ainda reconhece Neymar com resposta Sim; então concluir AC-R02-09 e a R02."
---

# Trabalho atual

A matriz física imediata do link personalizado passou em Android e iPhone. A
credencial nova reconheceu Neymar, registrou “Sim” e manteve a resposta ao
fechar e reabrir pelo WhatsApp e ao abrir no navegador padrão. O reteste também
confirmou que o RSVP aparece no topo sem exigir rolagem.

A única pendência de aceite da R02 é temporal: em outro dia, abrir novamente a
mensagem original nos dois aparelhos e confirmar que o evento continua
reconhecendo Neymar e exibindo “Sim”. Nenhum segredo do link foi registrado na
documentação.

A alteração local do usuário em `docs/roadmap.md` permanece separada.
