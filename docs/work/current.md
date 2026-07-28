---
release: R02
work_package: WP-R02-01
scope: public_event_link_copy
branch_or_commit: "codex/r02-copy-public-link"
checkpoint: idle
status: completed
completed_ac:
  - "AC-R02-01"
  - "AC-R02-02"
  - "AC-R02-10"
dirty_files: []
tests:
  - "Vitest focado — 9 testes aprovados"
  - "mobile 390 × 844 — cartão sem overflow e CTA de 48 px"
  - "flag local ativa — URL canônica copiada e retorno acessível confirmado"
  - "flag local inativa — cartão e botão ausentes"
  - "npm run lint — aprovado"
  - "npm run typecheck — aprovado"
  - "Vitest completo — 14 arquivos e 89 testes aprovados"
  - "npm run build — aprovado"
  - "npm run security:audit — 0 vulnerabilidades"
blocker: null
next_action: "Automatizar as regressões anônimas restantes: resposta indistinguível para ausente/flag/banco N−1, estados cancelado/concluído, metadata e ausência de terceiros."
---

# Trabalho atual

O CP3 de `WP-R02-01` adicionou a distribuição manual do endereço público ao
detalhe interno do evento. O botão permanece subordinado à flag por time, copia
a URL canônica e não altera capability, RSVP ou os dados publicados.

A implementação foi validada em viewport móvel com a flag local ativa e
inativa. A próxima ação é automatizar as regressões anônimas restantes antes do
piloto em produção.
