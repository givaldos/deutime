---
release: R16
work_package: WP-R16-01
scope: navegacao_permanente_e_inicio_acionavel
branch_or_commit: "codex/r16-navigation-shell"
checkpoint: CP1
status: active
completed_ac:
  - "R15 reconciliada: produção e smoke confirmados, sem promoção a repetir"
  - "inventário de 13 páginas de conteúdo e redirect legado reconferido"
  - "nomes, rotas, papéis, capacidade de campeonatos e fallback do NAV-01 fechados"
  - "NAV-02 monta o layout por time e adapta menus móvel/desktop ao contrato compartilhado"
  - "flag team_navigation_shell adicionada de forma inerte e fora do rollout global"
  - "escudo autorizado ou iniciais identificam o time no novo cabeçalho"
dirty_files:
  - "app/app/[teamSlug]/layout.tsx"
  - "components/team-app-header.tsx"
  - "components/team-primary-navigation.tsx"
  - "components/team-bottom-nav.tsx"
  - "components/team-switcher.tsx"
  - "components/team-navigation-shell.test.tsx"
  - "lib/features/delivery/capabilities.ts"
  - "lib/database.types.ts"
  - "supabase/migrations/202609090001_r16_team_navigation_shell_feature.sql"
  - "supabase/tests/073_r16_team_navigation_shell_feature.test.sql"
  - "docs/releases/R16-experiencia-de-gestao.md"
  - "docs/releases/work-packages/WP-R16-01-navegacao.md"
  - "docs/work/current.md"
tests:
  - "PASS: 15 testes focados do contrato de navegação"
  - "PASS: TypeScript, lint e git diff --check"
  - "PASS: auditoria de produção sem vulnerabilidades e build Webpack"
  - "PASS: 24 testes focados do contrato, menus e capacidades"
  - "PASS: reset completo do banco e 73 arquivos/1882 testes pgTAP"
  - "PASS: integridade de migrations, lint e TypeScript"
blocker: null
next_action: "Migrar mecanicamente as 13 páginas para o layout compartilhado no NAV-03, preservando guards e o redirect legado."
---

# Trabalho atual

A R16 segue ativa somente para o WP-R16-01. NAV-01 e NAV-02 estão implementados:
o contrato compartilhado alimenta os menus e o layout por time está protegido por
flag inerte. O menu anterior continua como fallback até o NAV-03 migrar as páginas.
