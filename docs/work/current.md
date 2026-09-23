---
release: R16
work_package: WP-R16-05
scope: calendario_e_pendencias
branch_or_commit: "codex/r16-calendar-workspace"
checkpoint: CP4
status: active
completed_ac:
  - "CAL-01: flag inerte, URL canônica e períodos civis no fuso do time"
  - "CAL-02: projeção protegida, fallback Lista e agenda diária mobile"
  - "CAL-03: Semana, Mês, filtros, conflitos e A reagendar"
  - "CAL-04: responsividade, acessibilidade, limites, telemetria agregada e recuperação operacional"
dirty_files: []
tests:
  - "PASS: 40 testes Vitest focados de período, fronteira, interface, UUID do PostgreSQL e sonda"
  - "PASS: 56 testes pgTAP de contrato e rollout do calendário"
  - "PASS: lint, typecheck, 158 arquivos/808 testes Vitest, 4 testes de contexto, build Webpack e auditoria sem vulnerabilidades"
  - "PASS: db reset, db lint sem novos avisos e 83 arquivos/2.212 testes pgTAP"
  - "PASS: navegador local em desktop e 360 px; Lista e Mês preservaram filtros e retorno; leitura mensal em 20 ms"
blocker: null
next_action: "Executar CAL-05: suíte pgTAP completa, PR para dev, promoção para main, piloto, rollback/restauração, rollout global, replay, smoke e CP6."
---

# Trabalho atual

O `WP-R16-05` adiciona Lista, Semana e Mês à agenda de gestão, preservando os
filtros, o contexto de retorno e o fuso do time. No celular, cada dia continua
como lista acessível. Datas indefinidas e adiadas ficam em **A reagendar**.

`calendar_workspace` continua desligada até o rollout. A projeção não expõe
atletas ou outro time, limita o período a 42 dias e mantém a Lista como fallback.

A próxima ação é concluir `CAL-05` e registrar evidências reais de produção.
