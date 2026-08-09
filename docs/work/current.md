---
release: R03R
work_package: WP-R03R-01
scope: two_economic_whatsapp_reminders
branch_or_commit: "dev"
checkpoint: CP1
status: idle
completed_ac: []
dirty_files: []
tests:
  - "npm run migrations:check -- origin/main HEAD: passou"
  - "npm run db:reset: passou"
  - "npm run db:lint: passou sem alerta novo; dois avisos legados"
  - "npm run db:test: 35 arquivos, 850 testes; pgTAP focado 48/48"
  - "npm run verify: lint, typecheck, 272 testes e build passaram"
  - "npm run security:audit: zero vulnerabilidades"
blocker: null
next_action: "Implementar WP-R03R-02: leitura/configuração mobile e consumo manual transacional da próxima cota, mantendo a flag e os kill switches desligados."
---

# Trabalho atual

R03R está em CP1. O banco já possui defaults T−72 h/T−48 h por time, cópia
efetiva por evento e duas cotas vitalícias `reminder_1`/`reminder_2`. Eventos
novos materializam as cotas; remarcação e cancelamento alteram somente as ainda
agendadas; outbox impede duplicação por atleta/cota.

O convite inicial homologado é `event_call:card_v2` (`event_call_card_v2`,
Content SID `HX9724ffb03ba01e7280c6d70bbf801ff4`). Ele não consome lembretes.
`reminder_1` usará `event_reminder:first_card_v2`, com tom de lembrete, e
`reminder_2` usará `event_reminder:last_card_v2`, com tom de última chamada.
Chave, versão e SID nunca são escolhidos pelo chamador; a cota define a intenção
no servidor e cada SID só entra por ambiente depois da aprovação.

As migrations são expansivas e inertes. `whatsapp_reminders` permanece sem
habilitação, nenhum consumidor foi conectado e não ocorreu efeito externo. A
próxima ação é `WP-R03R-02`: interface mobile, leitura agregada e consumo manual
transacional da próxima cota, ainda atrás da flag e dos kill switches.
