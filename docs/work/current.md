---
release: R16
work_package: WP-R16-02
scope: listas_completas_de_jogos_e_campeonatos
branch_or_commit: "codex/r16-lists-validation"
checkpoint: CP2
status: idle
completed_ac:
  - "AC-R16-01: seções autorizadas alcançáveis com menu persistente em 360–1280 px"
  - "AC-R16-02: troca de time, retorno, recarga, rotas diretas e isolamento preservados"
  - "AC-R16-03: início prioriza ação real para times vazios e com histórico"
  - "WP-R16-01 ativo nos 5 times de produção, com piloto e rollback/restauração comprovados"
  - "CP0 do WP-R16-02 fecha estados, filtros, paginação, fuso, tenancy, desempenho e fallback"
  - "LIST-01: flag inerte, dois read models paginados e índices por tenant concluídos"
  - "LIST-02: página de Jogos com visões, busca, filtros, cursor, total e retorno ao detalhe"
  - "LIST-03: página de Campeonatos com estados, formatos, busca, cursor, total e próxima ação"
  - "LIST-04: loading, vazio, erro, URL, teclado, reflow e matriz responsiva das duas listas"
dirty_files: []
tests:
  - "PASS: 26 testes focados de rollout, autorização, tenancy e recuperação"
  - "PASS: 74 arquivos/1908 testes pgTAP na dev consolidada"
  - "PASS: 134 arquivos/656 testes Vitest e 4 testes de contexto"
  - "PASS: lint, typecheck, build Webpack, integridade de migrations e auditoria sem vulnerabilidades"
  - "PASS: matriz responsiva 360, 390, 639, 640, 767, 768, 1023, 1024 e 1280 px"
  - "PASS: piloto produtivo, rollback/restauração, expansão global idempotente e smoke read-only"
  - "PASS: 46 testes pgTAP focados com 230 encerrados, 31 futuros, validação e cross-tenant"
  - "PASS: planos indexados por team_id em 0,079 ms (Jogos) e 0,048 ms (Campeonatos)"
  - "PASS: 16 testes focados de DAL/interface e 49 pgTAP de Jogos"
  - "PASS: regressão de 136 arquivos/672 testes Vitest e 75 arquivos/1.957 testes pgTAP"
  - "PASS: 19 testes focados de DAL/interface e 50 pgTAP de listas completas"
  - "PASS: 41 testes focados de DAL/interface/loading e 50 pgTAP de listas completas"
  - "PASS: 139 arquivos/697 testes Vitest e 75 arquivos/1.958 testes pgTAP"
  - "PASS: LIST-04 no navegador em 360–1280 px, teclado, foco, URL, limpar e reflow equivalente a 200%"
blocker: null
next_action: "Executar LIST-05: piloto, rollback/restauração, rollout global, smoke e encerramento CP6 do WP-R16-02."
---

# Trabalho atual

O `WP-R16-01` está encerrado em produção. `LIST-01` a `LIST-04` do
`WP-R16-02` estão fechadas: Jogos e Campeonatos usam read models completos com
autorização, tenancy, filtros, total, cursor e retorno ao detalhe, mantendo as
páginas anteriores quando a flag ou o schema estão indisponíveis. A flag continua
desligada e fora do catálogo global. Estados de carregamento, vazio e erro,
teclado, reflow e matriz responsiva foram validados. O checkpoint está limpo; a
próxima fatia é `LIST-05`, com piloto, recuperação e rollout produtivo.
