---
release: R16
work_package: WP-R16-03
scope: elenco_reconhecivel
branch_or_commit: "codex/r16-athlete-roster-contract"
checkpoint: CP0
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
  - "LIST-05: mecanismo transacional, kill switch, sonda agregada e testes completos prontos para promoção"
  - "WP-R16-02 ativo nos 5 times de produção, com piloto, rollback/restauração e replay idempotente"
  - "CP0 do WP-R16-03 fecha identidade, foto privada, filtros, paginação, papéis, desempenho e fallback"
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
  - "PASS: 140 arquivos/702 testes Vitest e 76 arquivos/1.988 testes pgTAP"
  - "PASS: lint, typecheck, build Webpack, db lint, integridade de migrations, contexto e auditoria sem vulnerabilidades"
  - "PASS: Deploy Supabase 34724811533, CI 34724811539, Database 34724811545, Terraform 34724811550 e CodeQL 34724811537"
  - "PASS: piloto produtivo ativo/desligado/restaurado preservou 17 jogos e 2 campeonatos"
  - "PASS: rollout global 5/5, replay com zero alterações e smoke pós-ativação 34725053598"
blocker: null
next_action: "Executar ATH-01: expansão inerte com flag, read model, índice e autorização privada da foto, coberta por pgTAP e plano de consulta."
---

# Trabalho atual

`WP-R16-01` e `WP-R16-02` estão encerrados em produção. As listas completas de
Jogos e Campeonatos estão ativas nos 5 times, com rollback disponível, sonda
agregada saudável e smoke pós-ativação aprovado. O checkpoint está limpo e passa
ao `WP-R16-03`. Seu CP0 definiu o contrato privado da foto, o read model paginado,
papéis, estados, desempenho, fallback e cinco fatias. A próxima ação é `ATH-01`,
expansão inerte com testes de autorização e isolamento de mídia.
