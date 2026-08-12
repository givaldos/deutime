---
release: R07
work_package: WP-R07-06
scope: mobile_lineup_touch_journey
branch_or_commit: "dev"
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
  - components/event-lineup-editor.tsx
  - components/event-lineup-editor.test.tsx
  - docs/releases/R07-times-manuais-compartilhaveis.md
  - docs/work/current.md
tests:
  - "produção responsiva 390x844: mover, retirar, recolocar e seleção manual verdes; largura 390px; alvos de 48px"
  - "produção responsiva 360x800: quatro transições verdes; alternativa manual revelou largura rolável de 363px"
  - "correção local: fieldset com min-w-0 e regressão coberta"
  - "Vitest completo: 60 arquivos, 329 testes verdes"
  - "ESLint, TypeScript e next build --webpack: verdes"
  - "integridade de migrations: verde"
  - "npm run security:audit: 0 vulnerabilidades"
  - "build Turbopack bloqueado somente pela restrição conhecida do sandbox ao abrir porta"
blocker: "A correção ainda precisa ser promovida e a evidência final exige Android e iPhone físicos, incluindo o navegador interno do WhatsApp."
next_action: "Promover a correção de largura; após o deploy, repetir mover, retirar, recolocar e seleção manual em Android e iPhone reais para concluir AC-R07-04."
---

# Trabalho atual

O fluxo de escalação por toque está disponível em produção no merge `945dd84`.
No evento real `Automação WhatsApp`, a rodada responsiva sem salvar confirmou
mover, retirar, recolocar e escolher o time pelo seletor nativo.

Em `390x844`, o documento permaneceu limitado ao viewport. Em `360x800`, abrir
a alternativa manual expôs `363px` de largura rolável. A causa era a largura
mínima intrínseca do `fieldset`; a correção local aplica `min-w-0` e adiciona
cobertura de regressão. Vitest completo, ESLint, TypeScript, build Webpack,
integridade de migrations e auditoria estão verdes.

`AC-R07-04` continua aberto: o ajuste precisa ser promovido e então validado em
Android e iPhone físicos, também no navegador interno do WhatsApp. A alteração
pré-existente em `docs/roadmap.md` foi preservada e permanece fora do escopo.
