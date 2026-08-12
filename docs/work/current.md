---
release: R07
work_package: WP-R07-06
scope: mobile_lineup_touch_journey
branch_or_commit: "e55c149"
checkpoint: CP4
status: idle
completed_ac:
  - AC-R07-01
  - AC-R07-02
  - AC-R07-03
  - AC-R07-05
  - AC-R07-06
  - AC-R07-07
  - AC-R07-08
  - AC-R07-09
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
  - "PR #174 e merge e55c149: checks obrigatórios verdes"
  - "produção: Vercel deutime-cs3cqi6f4-deu-time.vercel.app e Smoke 31610690607 verdes"
  - "produção responsiva 360x800 e 390x844: mover, retirar, recolocar e seleção manual verdes; sem overflow; alvos de 48px"
  - "evento recarregado sem salvar: origem restaurada e revisão 1 intacta"
blocker: "A evidência final exige Android e iPhone físicos, incluindo o navegador interno do WhatsApp."
next_action: "Repetir mover, retirar, recolocar e seleção manual em Android e iPhone reais, também no navegador interno do WhatsApp, para concluir AC-R07-04."
---

# Trabalho atual

O overflow da alternativa manual foi corrigido e promovido no merge `e55c149`.
CI, Database, CodeQL, Terraform, Vercel e Smoke estão verdes.

No evento real `Automação WhatsApp`, a rodada responsiva sem salvar repetiu as
quatro transições em `360x800` e `390x844`. A largura rolável ficou igual ao
viewport e os alvos mediram `48px`; ao recarregar, origem e revisão 1 estavam
intactas.

`AC-R07-04` continua aberto somente pela evidência em Android e iPhone físicos,
também no navegador interno do WhatsApp. A alteração pré-existente em
`docs/roadmap.md` foi preservada e permanece fora do escopo.
