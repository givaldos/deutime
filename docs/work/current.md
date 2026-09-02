---
release: R13
work_package: WP-R13-03
scope: versioned_championship_regulation
branch_or_commit: "7c92b69"
checkpoint: CP4
status: idle
completed_ac:
  - AC-R13-01
  - AC-R13-02
  - AC-R13-03
  - AC-R13-04
  - AC-R13-05
  - AC-R13-06
  - AC-R13-07
  - AC-R13-08
  - AC-R13-09
  - AC-R13-10
  - AC-R13-11
  - AC-R13-16
dirty_files: []
tests:
  - "migration forward-only reconstruída localmente com FK composta e professional_scheduling desligada por padrão"
  - "31 testes pgTAP focados cobrem versões, RLS, papéis, replay, três empatados, projeção pública e bloqueio após fato"
  - "119 arquivos/578 testes de aplicação, 4 testes de contexto, TypeScript e lint aprovados"
  - "66 arquivos/1.696 testes pgTAP, db lint, tipos e integridade das migrations aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado apenas pela abertura de porta no sandbox"
  - "auditoria npm com zero vulnerabilidades após atualizar browserslist para 4.28.8"
  - "360/390 px: ordem salva, botões 44 px, página pública idêntica, sem overflow ou erros de console"
  - "PRs #370 e #371 aprovados; produção 7c92b69 com deploy Supabase 33577324165, Database 33577324191 e smoke somente leitura 33577370813 verdes"
  - "sonda pós-deploy: professional_flags=0, professional_enabled=0, regulation_versions=1 e nenhum campeonato publicado sem versão"
blocker: null
next_action: "Iniciar WP-R13-04 em branch temporária nascida de dev sincronizada, mantendo professional_scheduling desligada."
---

# Trabalho atual

A R13 concluiu o `WP-R13-03` em CP4. O regulamento reordenável e versionado está
em produção; `professional_scheduling` permanece desligada em todos os times.

Owner/admin ordena os quatro desempates por botões acessíveis. Publicar captura
uma versão imutável; reabrir só é permitido antes do primeiro fato esportivo, e
a página pública usa a mesma pontuação e ordem aplicada pelo banco.

Os gates completos, o deploy do banco, a sonda agregada e o smoke público
passaram. A próxima frente permitida é `WP-R13-04`.
