---
release: R00
work_package: WP-R00-03
scope: post_login_account_profile
branch_or_commit: "66cbcc4"
checkpoint: idle
status: done
completed_ac: [AC-R00-09]
dirty_files: []
tests:
  - "interface e Action: 3 arquivos/5 testes focados aprovados"
  - "aplicação: lint, TypeScript, contexto e 97 arquivos/499 testes aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado somente pela porta do sandbox"
  - "banco no CI: schema reconstruído, lint, 56 arquivos/1449 pgTAP e tipos gerados aprovados"
blocker: null
next_action: "Promover o PR #300 para dev e main; depois validar a jornada autenticada em produção."
---

# Trabalho atual

A edição do perfil pós-login está implementada como uma fatia vertical. A área
administrativa expõe um atalho de 44 px no cabeçalho e uma tela mobile-first em
`/app/profile`. O nome é editável, o e-mail verificado permanece somente para
leitura e a identidade esportiva continua na tela especializada do atleta.

A Action autentica e valida a entrada antes de delegar à RPC transacional. A
RPC deriva a pessoa de `auth.uid()`, não aceita `user_id` do cliente, normaliza
o nome e sincroniza `profiles`, `player_profiles` e vínculos em `athletes`.
Entrada inválida, sessão ausente e execução anônima falham fechadas; o pgTAP
também preserva o perfil de outra pessoa.

O gate da aplicação está verde com 499 testes e build Webpack. O pipeline
reconstruiu o banco, aprovou lint, 1.449 testes pgTAP e confirmou os tipos
gerados. O servidor local redirecionou corretamente a rota protegida para
login; a revisão visual autenticada será feita após a promoção para produção.
