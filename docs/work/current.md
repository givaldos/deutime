---
release: R16
work_package: WP-R16-02
scope: listas_completas_de_jogos_e_campeonatos
branch_or_commit: "main@1ae2d0ce158252a133314e6897e5d3039d93fba8"
checkpoint: CP0
status: idle
completed_ac:
  - "AC-R16-01: seções autorizadas alcançáveis com menu persistente em 360–1280 px"
  - "AC-R16-02: troca de time, retorno, recarga, rotas diretas e isolamento preservados"
  - "AC-R16-03: início prioriza ação real para times vazios e com histórico"
  - "WP-R16-01 ativo nos 5 times de produção, com piloto e rollback/restauração comprovados"
dirty_files: []
tests:
  - "PASS: 26 testes focados de rollout, autorização, tenancy e recuperação"
  - "PASS: 74 arquivos/1908 testes pgTAP na dev consolidada"
  - "PASS: 134 arquivos/656 testes Vitest e 4 testes de contexto"
  - "PASS: lint, typecheck, build Webpack, integridade de migrations e auditoria sem vulnerabilidades"
  - "PASS: matriz responsiva 360, 390, 639, 640, 767, 768, 1023, 1024 e 1280 px"
  - "PASS: piloto produtivo, rollback/restauração, expansão global idempotente e smoke read-only"
blocker: null
next_action: "Abrir o CP0 do WP-R16-02 e fechar contratos de consulta, filtros, paginação, fuso e desempenho antes de implementar."
---

# Trabalho atual

O `WP-R16-01` está encerrado em produção. O próximo pacote é o `WP-R16-02`:
listas completas de Jogos e Campeonatos, com busca, filtros, ordenação e paginação
no servidor. O checkpoint está limpo e nenhuma implementação do pacote 02 começou;
a próxima tarefa deve fechar seu CP0 e a matriz de leitura antes de alterar código.
