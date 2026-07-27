# Infraestrutura Terraform

Este módulo preserva a declaração pretendida dos recursos remotos do DeuTime
como referência técnica. Migrações e políticas do banco continuam em
`supabase/` e são aplicadas pelo workflow de deploy.

Requisitos:

- Terraform 1.11+;
- nenhum requisito remoto durante o MVP.

O workflow `Terraform` executa somente `fmt` e `validate`, sem credenciais,
state, plano ou apply. Não execute o módulo contra produção: os recursos atuais
foram provisionados fora do Terraform e um state vazio pode tentar recriá-los.

Antes de tornar este módulo operacional, a melhoria técnica precisa criar um
backend remoto protegido, importar Supabase/Vercel/GitHub existentes, comprovar
plano sem recriação e somente então desenhar aprovação e apply. Nunca faça
commit de state, plano salvo, tokens ou `terraform.tfvars`.

Previews da Vercel não devem usar o banco de produção. Durante o MVP sem
staging, deixe previews sem variáveis de banco e faça testes de escrita somente
no Supabase local. O limite operacional está documentado em `docs/runbook.md`.
