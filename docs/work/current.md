---
release: R08M
work_package: WP-R08M-04
scope: integrated_mvp_gate
branch_or_commit: "main@4e54835"
checkpoint: CP5
status: ready
completed_ac:
  - AC-R08M-01
  - AC-R08M-02
  - AC-R08M-03
  - AC-R08M-04
  - AC-R08M-05
  - AC-R08M-06
  - AC-R08M-07
  - AC-R08M-08
  - AC-R08M-09
  - AC-R08M-10
  - AC-R08M-11
  - AC-R08M-12
dirty_files: []
tests:
  - "controle operacional focado: 4 arquivos e 15 testes aprovados"
  - "gate local: ESLint, TypeScript, 65 arquivos/368 testes Vitest e build Webpack aprovados"
  - "npm audit: zero vulnerabilidades; histórico de migrations preservado"
  - "PR #187 e merge 4e54835: Quality, Database, CodeQL, dependências, Terraform e Vercel verdes"
  - "produção pré-ativação: 16 eventos no fallback e zero projeções"
  - "produção ativa: 16 projeções, zero fallback e public_event_page preservada"
  - "rollback ensaiado: zero projeções e 16 fallbacks; reativação final comprovada"
  - "Smoke 31637255535 e 31637397456: jornadas públicas somente leitura aprovadas com expectativa ativa"
  - "telemetria produtiva redigida por fase/fallback/duração/erro; janela sem warning, error ou fatal"
  - "responsável confirmou revisão integral das evidências em iPhone e Android físicos, incluindo navegador interno do WhatsApp"
blocker: null
next_action: "Executar WP-R08M-04: provar o ciclo completo de AC-R08M-13 e a matriz de falhas, automações desligadas e recuperação de AC-R08M-14; depois fechar CP6."
---

# Trabalho atual

WP-R08M-03 concluiu CP4 e CP5. A coorte `demo-campo` foi configurada somente em
Production, ativada por sessão autenticada e deixada ativa após um rollback
completo. As sondas provaram a transição de 16 fallbacks para 16 projeções, a
volta integral ao fallback e a reativação final; os dois smokes com expectativa
ativa passaram.

A telemetria observada permaneceu agregada e redigida, sem warning, error ou
fatal na janela. O responsável confirmou a revisão integral das evidências em
iPhone e Android físicos, incluindo navegador interno do WhatsApp. A release
avança para `WP-R08M-04` em CP5, sem bloqueio: a próxima retomada executa o gate
integrado do ciclo MVP e os cenários de falha/fallback de `AC-R08M-13` e
`AC-R08M-14` antes de fechar CP6.
