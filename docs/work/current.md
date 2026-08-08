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
  - "inventário de entrypoints e contratos R01/R02/R03 conferido em 82b1fd3"
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

Nenhum efeito externo, migration, template ou configuração foi alterado. A
próxima ação é publicar a expansão inerte de banco de `WP-R03R-01`, com RLS,
grants mínimos, concorrência, matriz N/N−1 e `whatsapp_reminders` desligada.
