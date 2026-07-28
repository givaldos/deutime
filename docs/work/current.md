---
release: R02
work_package: WP-R02-01
scope: public_event_database_contract
branch_or_commit: "codex/r02-cp0-decisions"
checkpoint: idle
status: completed
completed_ac: []
dirty_files: []
tests:
  - "npm run db:reset — ok"
  - "npm run db:lint — sem erro novo; 2 avisos preexistentes em create_event_as_staff"
  - "npm run db:test — 17 arquivos, 379 testes, PASS"
  - "npm run db:types — tipos atualizados"
  - "npm run migrations:check -- d1cd5b2 — ok"
  - "npm run verify — lint, tipos, 82 testes e build aprovados"
blocker: null
next_action: "Abrir o CP2 de WP-R02-01 e implementar a rota /e/{public_id} atrás de public_event_page, tolerando banco N−1 e preservando a agenda atual."
---

# Trabalho atual

O CP1 de `WP-R02-01` definiu e implementou a expansão de banco: três flags
independentes da R02, `events.public_id` gerado e imutável e a projeção
`public_event_directory` fechada por `public_event_page`. A agenda pública
existente foi preservada para compatibilidade com o app atual.

O pgTAP novo cobre geração, unicidade, imutabilidade, contrato exato de campos,
grants somente leitura, flag desligada, perfil privado, estados cancelado e
concluído e compatibilidade da view legada. O gate `VAL-DB` passou; os dois
avisos do lint já existiam em `create_event_as_staff` e não pertencem a esta
fatia. A próxima ação é implementar a rota consumidora no CP2.
