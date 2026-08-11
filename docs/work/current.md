---
release: R07
work_package: WP-R07-06
scope: save_and_publish_single_intent
branch_or_commit: "dev"
checkpoint: CP4
status: idle
completed_ac:
  - AC-R07-01
  - AC-R07-02
  - AC-R07-03
  - AC-R07-05
  - AC-R07-06
  - AC-R07-07
  - AC-R07-08
  - AC-R07-09
  - AC-R07-11
  - AC-R07-12
  - AC-R07-13
  - AC-R07-14
dirty_files: []
tests:
  - "salvar/publicar focado: 2 arquivos, 12 testes verdes"
  - "Vitest completo: 57 arquivos, 320 testes verdes"
  - "ensaio mobile 390x844: salvar criou revisão 1; editar e salvar criou revisão 2 sem ação separada"
  - "ESLint, TypeScript e next build --webpack: verdes"
  - "npm run security:audit: 0 vulnerabilidades"
  - "db:reset, db:types e db:test: verdes; 42 arquivos, 1.014 testes pgTAP"
  - "integridade de migrations origin/main..HEAD: verde"
  - "PR #162 e merge aff99ce: checks obrigatórios verdes"
  - "Deploy database 31542818301 e Smoke 31542863602: verdes"
  - "Vercel produção 8y3nfqLj8W6ipw6hXFjYcGGYaVVn: concluído"
blocker: null
next_action: "Promover dev por PR para main e repetir o fluxo físico em Android e iPhone."
---

# Trabalho atual

Equipes internas persistentes, catálogo fechado de escudos SVG e vínculo
histórico com `event_squads` estão implementados. A gestão fica em Configurações
e o evento abre com divisão automática, troca por toque e uma única ação fixa:
salvar a escalação e atualizar o link público automaticamente.

Owner/admin agora usa somente `Salvar escalação`: a Action salva o rascunho e
publica ou atualiza a revisão automaticamente. Manager preserva o rascunho
privado e rascunhos legados continuam com fallback explícito de publicação.

O ensaio mobile confirmou revisão 1 no primeiro salvar e revisão 2 após editar
e salvar novamente, sem botão separado de publicação. A próxima ação é promover
pela rotina `dev → PR → main` e repetir em Android e iPhone.
