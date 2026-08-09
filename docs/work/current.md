---
release: R03R
work_package: DP-R03R-01
scope: two_economic_whatsapp_reminders
branch_or_commit: "dev"
checkpoint: CP0
status: idle
completed_ac: []
dirty_files: []
tests:
  - "inventário de entrypoints e contratos R01/R02/R03 conferido em bd92118"
  - "convite homologado event_call:card_v2 registrado; lembretes separados por intenção e cota"
  - "git diff --check: passou"
  - "parse YAML de .github/ISSUE_TEMPLATE/feature.yml: passou"
blocker: null
next_action: "Implementar WP-R03R-01: expansão inerte de configurações, cotas e RPCs com pgTAP, mantendo a flag desligada."
---

# Trabalho atual

R03R foi promovida com CP0 concluído. O pacote define duas cotas máximas de
lembrete, defaults T−72 h/T−48 h, fechamento padrão T−24 h, recálculo dos
pendentes no envio, consumo manual da próxima cota, execução automática vazia
sem provedor e cotas vitalícias que não reiniciam após remarcação.

O convite inicial homologado é `event_call:card_v2` (`event_call_card_v2`,
Content SID `HX9724ffb03ba01e7280c6d70bbf801ff4`). Ele não consome lembretes.
`reminder_1` usará `event_reminder:first_card_v1`, com tom de lembrete, e
`reminder_2` usará `event_reminder:last_card_v1`, com tom de última chamada.
Chave, versão e SID nunca são escolhidos pelo chamador; a cota define a intenção
no servidor e cada SID só entra por ambiente depois da aprovação.

Nenhum efeito externo, migration, template externo ou configuração foi
alterado. A próxima ação é publicar a expansão inerte de banco de `WP-R03R-01`, com RLS,
grants mínimos, concorrência, matriz N/N−1 e `whatsapp_reminders` desligada.
