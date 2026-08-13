---
release: R09
work_package: WP-R09-05
scope: championship_robustness_and_pilot
branch_or_commit: "codex/r09-robustez-piloto"
checkpoint: CP3
status: ready
completed_ac: [AC-R09-01, AC-R09-03, AC-R09-06, AC-R09-07, AC-R09-08, AC-R09-09, AC-R09-10, AC-R09-11, AC-R09-12]
dirty_files: []
tests:
  - "pgTAP focado WP-R09-05: sonda 36/36 e concorrência real 22/22"
  - "db:test: 50 arquivos e 1.317 testes aprovados"
  - "db:lint: nenhum aviso novo; dois avisos legados permanecem fora do escopo"
  - "migrations forward-only preservadas e tipos regenerados"
  - "gate de app: ESLint, TypeScript e 74 arquivos/422 testes Vitest aprovados"
  - "build de produção Webpack aprovado; auditoria: zero vulnerabilidades"
  - "ciclo sintético 390x844: coorte isolada, alvo 48 px, ativação, sonda, agenda e rollback aprovados"
blocker: null
next_action: "Executar CP4 desta versão em Android, iPhone e navegador interno do WhatsApp; depois ativar uma organização demo no CP5, observar e sincronizar CP6."
---

# Trabalho atual

WP-R09-05 concluiu o gate técnico CP3. A sonda agregada e sem PII verifica flags,
projeção e reconstrução; concorrência real cobre geração e publicação; smoke,
telemetria, limiares e rollback estão documentados no runbook.

O controle operacional exige confirmação e só aparece para o único `team_id`
configurado. O ciclo sintético mobile ativou a coorte, observou a sonda, preservou
a agenda e retornou ao fallback; a flag terminou desligada e nenhuma organização
real foi ativada.

O checkpoint está em CP3. A próxima ação é registrar a jornada desta versão em
Android, iPhone e navegador interno do WhatsApp (CP4); depois, uma única
organização demo pode avançar ao deploy, smoke, observação e rollback de CP5.
