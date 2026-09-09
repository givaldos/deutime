---
release: R16
work_package: WP-R16-01
scope: navegacao_permanente_e_inicio_acionavel
branch_or_commit: "codex/r16-navigation"
checkpoint: CP0
status: active
completed_ac:
  - "R15 reconciliada: produção e smoke confirmados, sem promoção a repetir"
  - "inventário de 13 páginas de conteúdo e redirect legado reconferido"
  - "nomes, rotas, papéis, capacidade de campeonatos e fallback do NAV-01 fechados"
dirty_files:
  - "lib/navigation/team-navigation.ts"
  - "lib/navigation/team-navigation.test.ts"
  - "docs/releases/R16-experiencia-de-gestao.md"
  - "docs/releases/work-packages/WP-R16-01-navegacao.md"
  - "docs/work/current.md"
tests:
  - "PASS: 15 testes focados do contrato de navegação"
  - "PASS: TypeScript, lint e git diff --check"
  - "PASS: auditoria de produção sem vulnerabilidades e build Webpack"
blocker: null
next_action: "Validar NAV-01 e adaptar os dois menus ao contrato compartilhado no NAV-02."
---

# Trabalho atual

A R16 foi ativada somente para o WP-R16-01. O NAV-01 introduz o contrato puro de
destinos, papéis, capacidade e seção ativa; os menus atuais permanecem como
fallback até o NAV-02 integrar esse contrato ao layout compartilhado.
