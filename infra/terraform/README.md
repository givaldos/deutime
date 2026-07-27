# Infraestrutura Terraform

Este módulo declara os recursos remotos do DeuTime. Migrações e políticas do banco continuam em `supabase/` e são aplicadas pelo workflow de deploy.

Requisitos:

- Terraform 1.11+;
- HCP Terraform com workspace exclusivo, locking e histórico;
- `SUPABASE_ACCESS_TOKEN`, `VERCEL_API_TOKEN` e `GITHUB_TOKEN` no ambiente;
- arquivo `terraform.tfvars` local ou variáveis `TF_VAR_*` vindas de um cofre.

Não faça commit de estado, plano salvo, tokens ou `terraform.tfvars`. Configure `TF_CLOUD_ORGANIZATION`, `TF_WORKSPACE` e `TF_TOKEN_app_terraform_io`; o bloco `cloud {}` mantém o state remoto. O provider do Supabase lê chaves geradas para configurar a Vercel, então o state deve ser tratado como secreto.

O ruleset começa desabilitado porque GitHub só reconhece um required check depois de sua primeira execução. Após a primeira CI verde, aplique novamente com `enable_github_ruleset = true`.

O workflow `Terraform` valida todo pull request. Quando
`ENABLE_TERRAFORM_APPLY=true`, um push em `main` cria `tfplan` no Environment
`production-plan`, publica o plano textual no resumo e guarda ambos no artefato
imutável da execução. O job `terraform-apply`, protegido pelo Environment
`production`, baixa e aplica exatamente esse `tfplan`; ele não recalcula o
plano. Configure aprovação obrigatória no Environment `production` e revise o
resumo antes de aprovar. Mantenha a variável desligada até os dois Environments,
segredos e proteção estarem configurados. Use tokens de automação com o menor
escopo possível.

Previews da Vercel não devem usar o banco de produção. Durante o MVP sem
staging, deixe previews sem variáveis de banco e faça testes de escrita somente
no Supabase local. O limite operacional está documentado em `docs/runbook.md`.
