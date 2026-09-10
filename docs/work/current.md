---
release: R16
work_package: WP-R16-02
scope: listas_completas_de_jogos_e_campeonatos
branch_or_commit: "main@2ce653b894370b804010b7e3074ffddaf39ca9dd"
checkpoint: CP1
status: idle
completed_ac:
  - "AC-R16-01: seções autorizadas alcançáveis com menu persistente em 360–1280 px"
  - "AC-R16-02: troca de time, retorno, recarga, rotas diretas e isolamento preservados"
  - "AC-R16-03: início prioriza ação real para times vazios e com histórico"
  - "WP-R16-01 ativo nos 5 times de produção, com piloto e rollback/restauração comprovados"
  - "CP0 do WP-R16-02 fecha estados, filtros, paginação, fuso, tenancy, desempenho e fallback"
dirty_files: []
tests:
  - "PASS: 26 testes focados de rollout, autorização, tenancy e recuperação"
  - "PASS: 74 arquivos/1908 testes pgTAP na dev consolidada"
  - "PASS: 134 arquivos/656 testes Vitest e 4 testes de contexto"
  - "PASS: lint, typecheck, build Webpack, integridade de migrations e auditoria sem vulnerabilidades"
  - "PASS: matriz responsiva 360, 390, 639, 640, 767, 768, 1023, 1024 e 1280 px"
  - "PASS: piloto produtivo, rollback/restauração, expansão global idempotente e smoke read-only"
blocker: null
next_action: "Executar LIST-01: expansão inerte da flag, read models e índices com pgTAP e plano de consulta."
---

# Trabalho atual

O `WP-R16-01` está encerrado em produção. O CP0 do `WP-R16-02` está fechado:
listas completas de Jogos e Campeonatos usarão busca, filtros, contagem e cursor
no servidor, com fixture acima de 200 eventos, fuso do time, RLS e fallback.
O checkpoint está limpo; a implementação começa por `LIST-01`, como expansão
inerte do banco.
