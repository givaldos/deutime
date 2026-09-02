---
release: R13
work_package: WP-R13-03
scope: versioned_championship_regulation
branch_or_commit: "codex/r13-regulation-versioning"
checkpoint: CP2
status: active
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
dirty_files:
  - "app/app/[teamSlug]/championships"
  - "app/c/[publicId]"
  - "components/championship-forms.tsx"
  - "lib/data/championships.ts"
  - "lib/validation/championships.ts"
  - "package-lock.json"
  - "supabase/migrations/202609010003_r13_versioned_championship_regulation.sql"
  - "supabase/tests/066_r13_versioned_championship_regulation.test.sql"
tests:
  - "migration forward-only reconstruída localmente com FK composta e professional_scheduling desligada por padrão"
  - "31 testes pgTAP focados cobrem versões, RLS, papéis, replay, três empatados, projeção pública e bloqueio após fato"
  - "119 arquivos/578 testes de aplicação, 4 testes de contexto, TypeScript e lint aprovados"
  - "66 arquivos/1.696 testes pgTAP, db lint, tipos e integridade das migrations aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado apenas pela abertura de porta no sandbox"
  - "auditoria npm com zero vulnerabilidades após atualizar browserslist para 4.28.8"
  - "360/390 px: ordem salva, botões 44 px, página pública idêntica, sem overflow ou erros de console"
blocker: null
next_action: "Promover por dev/main, comprovar professional_scheduling desligada em produção e executar o smoke somente leitura."
---

# Trabalho atual

A R13 executa o `WP-R13-03` em CP2. O regulamento reordenável e versionado está
implementado localmente; `professional_scheduling` permanece desligada fora do
ambiente sintético.

Owner/admin ordena os quatro desempates por botões acessíveis. Publicar captura
uma versão imutável; reabrir só é permitido antes do primeiro fato esportivo, e
a página pública usa a mesma pontuação e ordem aplicada pelo banco.

Os gates completos e a jornada responsiva passaram. A próxima ação é promover
por `dev` e `main`, comprovar o estado desligado e executar o smoke de produção.
