---
release: R12
work_package: WP-R12-01
scope: public_interface_corrections
branch_or_commit: "codex/r12-public-fixes@7cd58b7"
checkpoint: idle
status: done
completed_ac:
  - AC-R12-01
  - AC-R12-02
  - AC-R12-03
dirty_files: []
tests:
  - "lint, TypeScript, 101 arquivos/511 testes e 4 testes de contexto aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado somente pela porta do sandbox"
  - "58 arquivos/1.475 testes pgTAP, reset, lint, tipos e integridade de migrations aprovados"
  - "smoke local: register 200, cadastro 308, query allowlisted, console limpo e 360 px sem overflow"
  - "npm audit sem vulnerabilidades"
blocker: null
next_action: "Iniciar WP-R12-02 por testes que provem cadastro administrativo privado e rejeição do controle legado de publicação."
---

# Trabalho atual

A R12 está ativa. O `WP-R12-01` unificou o contrato de slug entre nome, prévia,
Action e banco; adotou `/t/{slug}/register` como rota canônica; preservou
`/cadastro` por redirect permanente; removeu emoji e jargão dos pontos alterados
e deixou **Ajustes** como único acesso de edição no dashboard.

App, banco e navegador foram validados, inclusive em 360 px. O próximo pacote é
`WP-R12-02`: a diretoria não poderá publicar atleta e o banco deverá ignorar ou
rejeitar qualquer controle legado que tente tornar o cadastro público.
