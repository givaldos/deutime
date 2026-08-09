---
release: R03R
work_package: WP-R03R-02
scope: two_economic_whatsapp_reminders
branch_or_commit: "dev"
checkpoint: CP2
status: idle
completed_ac:
  - AC-R03R-01
  - AC-R03R-02
  - AC-R03R-03
  - AC-R03R-04
  - AC-R03R-06
  - AC-R03R-07
  - AC-R03R-08
dirty_files: []
tests:
  - "npm run migrations:check -- origin/main HEAD: passou"
  - "npm run db:reset: passou"
  - "npm run db:lint: passou sem alerta novo; dois avisos legados"
  - "npm run db:test: 36 arquivos, 881 testes; pgTAP focado 31/31"
  - "npm run verify: lint, typecheck, 277 testes e build passaram"
  - "npm run security:audit: zero vulnerabilidades"
blocker: null
next_action: "Implementar WP-R03R-03: execução automática, catálogo dos lembretes, operação e piloto físico controlado; manter a feature desligada até o gate de rollout."
---

# Trabalho atual

R03R está em CP2. Owner/admin já pode configurar os padrões do time, sobrescrever
um evento, consultar as duas cotas e antecipar manualmente somente a próxima.
O consumo é transacional, idempotente e recalcula os pendentes elegíveis; zero
destinatários não consome a cota. A barreira antes do efeito volta a conferir
RSVP, vínculo, telefone, consentimento e feature.

O convite inicial homologado é `event_call:card_v2` (`event_call_card_v2`,
Content SID `HX9724ffb03ba01e7280c6d70bbf801ff4`). Ele não consome lembretes.
`reminder_1` usará `event_reminder:first_card_v2`, com tom de lembrete, e
`reminder_2` usará `event_reminder:last_card_v2`, com tom de última chamada.
Chave, versão e SID nunca são escolhidos pelo chamador; a cota define a intenção
no servidor e cada SID só entra por ambiente depois da aprovação.

As migrations são expansivas e inertes. `whatsapp_reminders` permanece sem
habilitação, nenhum consumidor automático foi conectado e não ocorreu efeito
externo. A próxima ação é `WP-R03R-03`: execução automática, catálogo dos dois
lembretes, operação e piloto físico Android/iPhone, ainda atrás da flag e dos
kill switches até o gate explícito de rollout.
