---
release: R00
work_package: WP-R00-03
scope: post_login_account_profile
branch_or_commit: "81a8251"
checkpoint: idle
status: done
completed_ac: [AC-R00-09]
dirty_files: []
tests:
  - "interface e Action: 3 arquivos/5 testes focados aprovados"
  - "aplicação: lint, TypeScript, contexto e 97 arquivos/499 testes aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado somente pela porta do sandbox"
  - "banco no CI: schema reconstruído, lint, 56 arquivos/1449 pgTAP e tipos gerados aprovados"
  - "produção: Deploy Supabase 32780300760 e smoke 32780362802 aprovados"
  - "produção/360 px: perfil autenticado sem overflow, acesso no cabeçalho e alvos de 48 px aprovados"
blocker: null
next_action: "Nenhuma alteração pendente; seguir para a próxima tarefa de produto."
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
gerados. A migration e a aplicação chegaram à produção no commit `81a8251`; o
smoke passou. A revisão autenticada a 360 px confirmou acesso no cabeçalho,
ausência de overflow horizontal e alvos de 48 px, sem alterar o nome real da
sessão usada na prova. O checkpoint voltou a `idle` e não há pendência.
