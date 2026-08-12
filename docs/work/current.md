---
release: R08M
work_package: WP-R08M-04
scope: integrated_mvp_gate
branch_or_commit: "dev"
checkpoint: CP6
status: idle
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
  - AC-R08M-13
  - AC-R08M-14
dirty_files: []
tests:
  - "gate integrado focado: 6 arquivos e 49 testes aprovados"
  - "gate final: ESLint, TypeScript, 65 arquivos/368 testes Vitest e build Webpack aprovados"
  - "integridade de migrations preservada; npm audit com zero vulnerabilidades"
  - "sondas produtivas: RSVP, divisão e cartão ativos e consistentes"
  - "produção agregada: 16 eventos, 209 respostas, 32 cotas, 9 entregas, 4 partidas, 1 súmula e 5 comentários preservados"
  - "recuperação produtiva: 2 retries, 1 falha permanente isolada e 2 acionamentos manuais"
  - "Smoke 31638690026: jornada pública somente leitura aprovada com cartão ativo"
  - "responsável confirmou revisão integral das evidências em iPhone e Android físicos, incluindo navegador interno do WhatsApp"
blocker: null
next_action: "Selecionar e preparar a próxima release pós-MVP priorizada."
---

# Trabalho atual

R08M está concluída. O gate integrado compôs as evidências aprovadas de R01 a
R07 com as sondas e contagens atuais da mesma coorte, sem novo envio externo e
sem registrar PII. Criação, chamada, confirmação, lembretes, escalação,
partida, súmula, voto/resultado, conversa e cartão possuem prova duradoura.

A matriz de falhas cobre cancelamento, remarcação, opt-out, link encaminhado,
retry, falha do provedor, polling quando o tempo real não está disponível e
automações desligadas. `event_share_card` permanece ativo apenas em
`demo-campo`, com rollback autenticado já ensaiado. Os 14 critérios estão
concluídos, o checkpoint voltou a `idle` e não há bloqueio conhecido.
