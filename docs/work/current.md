---
release: R03R
work_package: WP-R03R-03
scope: two_economic_whatsapp_reminders
branch_or_commit: "dev"
checkpoint: CP3
status: idle
completed_ac:
  - AC-R03R-01
  - AC-R03R-02
  - AC-R03R-03
  - AC-R03R-04
  - AC-R03R-05
  - AC-R03R-06
  - AC-R03R-07
  - AC-R03R-08
  - AC-R03R-10
dirty_files: []
tests:
  - "npm run migrations:check -- origin/main HEAD: passou"
  - "npm run db:reset: passou"
  - "npm run db:lint: passou sem alerta novo; dois avisos legados"
  - "npm run db:test: 37 arquivos, 911 testes; pgTAP automático 30/30"
  - "npm run verify: lint, typecheck, 285 testes e build passaram"
  - "npm run security:audit: zero vulnerabilidades"
blocker: null
next_action: "Publicar CP3 de forma inerte e executar CP4 controlado: primeiro e último lembrete, cards/fallbacks, link e RSVP em Android/iPhone; manter a automação contínua desligada até a evidência física."
---

# Trabalho atual

R03R está em CP3. A configuração e o consumo manual estão prontos, e o produtor
automático agora processa no máximo uma cota por evento/execução, encerra vazio,
atraso acima de seis horas e prazo fechado sem efeito e reaproveita a barreira
de elegibilidade imediatamente anterior ao adapter.

O convite inicial homologado é `event_call:card_v2` (`event_call_card_v2`,
Content SID `HX9724ffb03ba01e7280c6d70bbf801ff4`). Ele não consome lembretes.
`reminder_1` usará `event_reminder:first_card_v2`, com tom de lembrete, e
`reminder_2` usará `event_reminder:last_card_v2`, com tom de última chamada.
Chave, versão e SID nunca são escolhidos pelo chamador; a cota define a intenção
no servidor e cada SID só entra por ambiente depois da aprovação.

O workflow autenticado existe, mas sua variável de habilitação,
`whatsapp_reminders`, `integration_produce` e `integration_consume` permanecem
desligados; nenhum efeito externo ocorreu. A próxima ação é CP4: publicar a
expansão inerte e executar uma janela física controlada dos dois lembretes e
fallbacks em Android/iPhone. A automação contínua só pode ser ligada depois
dessa evidência.
