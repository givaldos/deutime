---
release: R12
work_package: WP-R12-02
scope: private_athletes_by_default
branch_or_commit: "codex/r12-private-athletes"
checkpoint: idle
status: done
completed_ac:
  - AC-R12-04
  - AC-R12-05
dirty_files: []
tests:
  - "lint, TypeScript, 103 arquivos/515 testes e 4 testes de contexto aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado somente pela rede do sandbox"
  - "59 arquivos/1.492 testes pgTAP, reset, lint, tipos e integridade de migrations aprovados"
  - "17 provas focadas de privacidade, compatibilidade legada, revogação e cross-tenant"
  - "smoke público local: 44 cadastros administrativos, 0 identidades públicas e console limpo"
  - "npm audit sem vulnerabilidades"
blocker: null
next_action: "Iniciar WP-R12-03 pela visão isolada de vínculos, pedidos e convites da própria pessoa em /me."
---

# Trabalho atual

A R12 está ativa. O `WP-R12-02` removeu da diretoria o controle de publicação,
fechou o banco contra cadastros administrativos públicos e passou a exigir
identidade reivindicada e consentimento próprio versionado nas projeções.

App, banco e página pública foram validados. O próximo pacote é `WP-R12-03`:
listar em `/me` somente os vínculos, pedidos e convites da própria pessoa e
entregar ações seguras de retirada, recusa e saída.
