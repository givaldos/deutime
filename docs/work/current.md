---
release: R16
work_package: WP-R16-03
scope: elenco_reconhecivel
branch_or_commit: "codex/r16-athlete-experience"
checkpoint: CP4
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
  - "ATH-01: flag inerte, read model paginado, índices e autorização privada de foto concluídos"
  - "ATH-02: Lista/Cartões, filtros em URL, cursor, assinatura em lote e fallback concluídos"
  - "ATH-03: detalhe privado, autorização por papel, PII restrita, participações factuais e retorno seguro concluídos"
  - "ATH-04: loading, estados, teclado, reflow, matriz responsiva e desempenho integrado concluídos"
dirty_files: []
tests:
  - "PASS: 26 testes focados de rollout, autorização, tenancy e recuperação"
  - "PASS: 74 arquivos/1908 testes pgTAP na dev consolidada"
  - "PASS: 134 arquivos/656 testes Vitest e 4 testes de contexto"
  - "PASS: lint, typecheck, build Webpack, integridade de migrations e auditoria sem vulnerabilidades"
  - "PASS: 29 testes focados de DAL/interface e 24 pgTAP do detalhe privado"
  - "PASS: 144 arquivos/745 testes Vitest e 78 arquivos/2.051 testes pgTAP"
  - "PASS: db reset, db lint sem novos avisos, tipos gerados sem deriva e migration forward-only"
  - "PASS: matriz responsiva 360, 390, 639, 640, 767, 768, 1023, 1024 e 1280 px"
  - "PASS: piloto produtivo, rollback/restauração, expansão global idempotente e smoke read-only"
  - "PASS: 48 testes focados de interface/DAL e 64 pgTAP de lista/detalhe abaixo de 300 ms"
  - "PASS: 146 arquivos/748 testes Vitest e 78 arquivos/2.052 testes pgTAP"
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
  - "PASS: 39 testes pgTAP de elenco com >220 vínculos, paginação, papéis, storage e cross-tenant"
  - "PASS: db reset, db lint sem novos avisos e read model abaixo do alvo local de 300 ms"
  - "PASS: 19 testes focados de DAL/interface, incluindo filtros, cursor, uma RPC e assinatura deduplicada"
  - "PASS: 142 arquivos/721 testes Vitest e 77 arquivos/2.027 testes pgTAP"
  - "PASS: lint, typecheck, build Webpack, integridade de migrations e auditoria sem vulnerabilidades"
blocker: null
next_action: "Executar ATH-05: piloto produtivo, sonda sem PII, rollback/restauração, rollout global idempotente e CP6."
---

# Trabalho atual

`WP-R16-01` e `WP-R16-02` estão encerrados em produção. As listas completas de
Jogos e Campeonatos estão ativas nos 5 times, com rollback disponível, sonda
agregada saudável e smoke pós-ativação aprovado. O checkpoint está limpo e passa
ao `WP-R16-03`. O CP1 entregou a expansão inerte: flag desligada, read model
paginado, índices e autorização privada de foto com isolamento por time. A
ATH-02 passou a consumir esse contrato na página de Atletas com Lista/Cartões,
filtros em URL, cursor, assinatura deduplicada e fallback atual. O CP2 está
aceito. A ATH-03 adicionou detalhe privado por papel, PII restrita,
participações factuais e retorno seguro para a lista filtrada. O CP3 está
aceito. A ATH-04 adicionou carregamentos acessíveis, corrigiu foco e reflow,
validou a matriz 360–1280 e comprovou lista/detalhe abaixo de 300 ms. O CP4 está
aceito; a próxima ação é `ATH-05`, com piloto, rollback/restauração, rollout
global e encerramento CP6.
