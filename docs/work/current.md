---
release: R00
work_package: WP-R00-03
scope: post_login_account_profile
branch_or_commit: "codex/post-login-profile"
checkpoint: CP3
status: in_progress
completed_ac: [AC-R00-09]
dirty_files:
  - "app/app/profile/"
  - "app/app/page.tsx"
  - "components/account-profile-form.tsx"
  - "components/account-profile-link.tsx"
  - "components/team-app-header.tsx"
  - "lib/database.types.ts"
  - "supabase/migrations/202608240001_account_profile_update.sql"
  - "supabase/tests/056_account_profile_update.test.sql"
  - "docs/releases/R00-fundacao-de-entrega.md"
tests:
  - "interface e Action: 3 arquivos/5 testes focados aprovados"
  - "aplicação: lint, TypeScript, contexto e 97 arquivos/499 testes aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado somente pela porta do sandbox"
  - "pgTAP 056 preparado; execução local indisponível porque Docker Desktop não estava ativo"
blocker: null
next_action: "Publicar a branch, aguardar o pipeline executar pgTAP e os gates; depois promover dev e main e validar a jornada autenticada em produção."
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

O gate da aplicação está verde com 499 testes e build Webpack. O servidor local
redirecionou corretamente a rota protegida para login, mas a validação visual
autenticada e o pgTAP dependem do Supabase local; o Docker Desktop não estava
ativo. O próximo passo é usar o pipeline como gate de banco e, após aprovação,
promover e revisar a tela autenticada em produção.
