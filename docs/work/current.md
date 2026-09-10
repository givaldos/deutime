---
release: R16
work_package: WP-R16-02
scope: listas_completas_de_jogos_e_campeonatos
branch_or_commit: "WP-R16-02/LIST-01"
checkpoint: CP2
status: idle
completed_ac:
  - "AC-R16-01: seções autorizadas alcançáveis com menu persistente em 360–1280 px"
  - "AC-R16-02: troca de time, retorno, recarga, rotas diretas e isolamento preservados"
  - "AC-R16-03: início prioriza ação real para times vazios e com histórico"
  - "WP-R16-01 ativo nos 5 times de produção, com piloto e rollback/restauração comprovados"
  - "CP0 do WP-R16-02 fecha estados, filtros, paginação, fuso, tenancy, desempenho e fallback"
  - "LIST-01: flag inerte, dois read models paginados e índices por tenant concluídos"
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
blocker: null
next_action: "Executar LIST-02: DAL e página de Jogos com busca, filtros, cursor, total e fallback N−1/flag."
---

# Trabalho atual

O `WP-R16-01` está encerrado em produção. O CP1 do `WP-R16-02` está fechado: a
expansão inerte adicionou flag, dois read models, paginação por cursor e índices
por tenant, com autorização e fixture acima de 200 eventos validadas. A flag
continua desligada e fora do catálogo global. O checkpoint está limpo; a próxima
fatia é `LIST-02`, que conecta a página de Jogos mantendo os fallbacks.
