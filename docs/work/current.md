---
release: R16
work_package: WP-R16-05
scope: calendario_e_pendencias
branch_or_commit: "9b7c54b6f78c4cde699c9b95e4d1b201f7985fb0"
checkpoint: CP6
status: idle
completed_ac:
  - "AC-R16-13: Lista, Semana e Mês preservam filtros, período e retorno"
  - "AC-R16-14: períodos civis, sobreposição, densidade, cancelamento e A reagendar cobertos"
  - "AC-R16-15: conflitos agregados e isolamento multi-time comprovados"
tests:
  - "PASS: 158 arquivos/808 testes Vitest; lint, typecheck, contexto, build Webpack e auditoria sem vulnerabilidades"
  - "PASS: 83 arquivos/2.212 testes pgTAP; db reset, lint, tipos e integridade de migrations"
  - "PASS: CI 35860700439, banco 35860700442, CodeQL 35860700331, Terraform 35860700624 e deploy Supabase 35860700292"
  - "PASS: smoke da implantação 35860772496 e smoke pós-ativação somente leitura"
  - "PASS: navegador local em desktop e 360 px; leitura mensal em 20 ms"
  - "PASS: piloto, rollback e restauração preservaram 9 eventos; rollout 5/5; replay alterou 0 flags"
blocker: null
next_action: "Iniciar WP-R16-06 em nova tarefa: fechar CP0 de operações em lote antes de implementar."
---

# Trabalho atual

O `WP-R16-05` está encerrado em CP6. Lista, Semana e Mês estão ativos nos cinco
times de produção, com agenda diária no celular, filtros, conflitos agregados e
**A reagendar**. O fallback para Lista e o kill switch permanecem disponíveis.

`dev` e `main` foram reconciliadas pelo PR #515 sem diferença de conteúdo.

A próxima tarefa é o CP0 de `WP-R16-06`, operações em lote com seleção explícita,
prévia, autorização, atomicidade, replay e recuperação.
