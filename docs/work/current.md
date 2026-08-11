---
release: R03R
work_package: WP-R03R-03
scope: two_economic_whatsapp_reminders
branch_or_commit: "dev"
checkpoint: CP4
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
  - "npx vitest run whatsapp-worker + worker route: 2 arquivos, 13 testes passaram"
  - "APP_URL=https://deutime.app npm run smoke:production: passou após habilitar o rollout"
  - "filtro jq do worker: respostas live/409, descarte de PII/campos extras, normalização e JSON inválido passaram"
  - "pgTAP callback por tentativa: 12/12; replay confirmado reprojeta a outbox"
  - "npm run db:test: 37 arquivos, 912 testes passaram após a correção"
  - "npm run db:lint: sem alerta novo; tipos do banco sem diff"
  - "CP4 primeiro lembrete: pré-check com reminder_1, 3 elegíveis, fila e cotas vencidas zeradas"
  - "WhatsApp worker run 31446795713: 3 claimed/prepared/accepted; zero rejected/ambiguous/cancelled"
  - "Pós-envio: 3/3 outbox sent e requires_review=0"
blocker: null
next_action: "Validar fisicamente o primeiro lembrete, card/fallback, link e RSVP em Android e iPhone; depois disparar a última chamada controlada e concluir AC-R03R-09."
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

Em 2026-08-10, `whatsapp_reminders` foi habilitada via RPC auditada nos três
times demo de produção. `integration_produce` e `integration_consume` estão
ligados. Depois da autorização de rollout, a variável GitHub
`WHATSAPP_AUTOMATION_ENABLED` passou a `true`.

O job agora declara o environment GitHub `production` para receber
`WHATSAPP_WORKER_SECRET`. A primeira execução observada, workflow `#144`,
concluiu em cinco segundos. A telemetria agregada posterior mostrou 3/3 times
habilitados, 2/2 kill switches ligados, zero cotas vencidas e zero mensagens de
lembrete na outbox. Há 26 cotas futuras; a próxima estava prevista para
2026-08-12 10:00 UTC.

A próxima ação é observar essa primeira cota automática e executar CP4 físico
dos dois lembretes e fallbacks em Android/iPhone. Diante de falha, ambiguidade
ou custo inesperado, o rollback imediato é definir
`WHATSAPP_AUTOMATION_ENABLED=false`.

O workflow agora imprime uma projeção redigida do resumo operacional. Somente
estado, prontidão dos templates e contadores agregados entram no log; campos
extras são descartados e resposta inválida encerra o job sem imprimir o corpo
bruto. Isso permite observar a primeira cota automática diretamente no GitHub.

A primeira execução com essa projeção encontrou duas revisões antigas. Ambas
eram convites `event_call/card_v1` criados em 08/08, com ID do provedor e estado
final `read`; nenhuma mensagem nova foi aceita e nenhuma cota foi produzida.
`WHATSAPP_AUTOMATION_ENABLED` foi imediatamente definido como `false`.

A causa era o retorno antecipado no conflito idempotente do evento de callback:
o replay preservava o evento, mas não reprojetava a outbox. A migration
forward-only `202608110001` corrige o replay sem duplicar evento nem liberar
retry.

O deploy de banco `#144` aplicou a correção em produção. A reconciliação usou a
própria RPC, com guarda exata de dois candidatos já confirmados como `read`, e
terminou com `requires_review=0` e dois convites confirmados, sem novo envio.
Depois dessa prova, `WHATSAPP_AUTOMATION_ENABLED` voltou a `true`. A próxima
execução natural, run `31446189522`, passou com HTTP 200, templates prontos,
produção automática ativa e todos os contadores zerados, inclusive
`recoveredForReview=0` e `ambiguous=0`. Nenhuma mensagem foi enviada porque não
havia cota vencida.

Em 2026-08-10, o primeiro lembrete foi disparado de forma controlada para o
evento demo `d7f766f2-bb01-4db3-8703-062be9c6c640`. O pré-check confirmou
`reminder_1`, três elegíveis, controles e features ligados e nenhuma outra
cota vencida ou mensagem acionável. A RPC auditada consumiu a cota uma vez e
criou três mensagens. O primeiro acionamento do worker fechou com `409` antes
do claim; uma única repetição, já aquecida, aceitou as três mensagens. O run
`31446795713` registrou 3/3 `claimed`, `prepared` e `accepted`, sem rejeição,
ambiguidade ou cancelamento. O banco terminou com 3/3 outbox `sent` e
`requires_review=0`.

A próxima ação é validar fisicamente esse primeiro lembrete, card/fallback,
link e RSVP no Android e no iPhone. Depois, disparar a última chamada de forma
controlada e concluir `AC-R03R-09`.
