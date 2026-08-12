---
release: R07
work_package: WP-R07-06
scope: release_closure
branch_or_commit: "0428f32"
checkpoint: CP6
status: idle
completed_ac:
  - AC-R07-01
  - AC-R07-02
  - AC-R07-03
  - AC-R07-04
  - AC-R07-05
  - AC-R07-06
  - AC-R07-07
  - AC-R07-08
  - AC-R07-09
  - AC-R07-10
  - AC-R07-11
  - AC-R07-12
  - AC-R07-13
  - AC-R07-14
  - AC-R07-15
  - AC-R07-16
  - AC-R07-17
dirty_files:
  - docs/releases/R07-times-manuais-compartilhaveis.md
  - docs/work/current.md
tests:
  - "responsável confirmou a revisão integral das evidências em Android e iPhone físicos, incluindo navegador interno do WhatsApp"
  - "PR #174 e merge e55c149: checks obrigatórios verdes"
  - "produção: Vercel deutime-cs3cqi6f4-deu-time.vercel.app e Smoke 31610690607 verdes"
  - "produção responsiva 360x800 e 390x844: quatro transições verdes, sem overflow e com alvos de 48px"
  - "smoke final de produção somente leitura: verde; evento público opcional não configurado"
  - "sonda local não repetida: LINEUP_PILOT_TEAM_ID ausente; evidência produtiva do CP5 preservada"
blocker: null
next_action: "Selecionar e preparar a próxima release priorizada."
---

# Trabalho atual

R07 está concluída. O responsável confirmou a revisão integral das evidências
em Android e iPhone físicos, incluindo jornada por toque, alternativa acessível
e navegador interno do WhatsApp. Com os gates técnicos e operacionais já
registrados, `AC-R07-04` e `AC-R07-10` foram encerrados; os 17 critérios de
aceite agora possuem evidência.

O smoke final somente leitura passou. A sonda agregada não foi repetida por
ausência local de `LINEUP_PILOT_TEAM_ID`; a evidência produtiva anterior
permanece válida. `team_division` continua no rollout isolado da coorte demo,
com fallback e rollback documentados. O checkpoint voltou a `idle`, sem
bloqueio. A alteração pré-existente em `docs/roadmap.md` foi preservada.
