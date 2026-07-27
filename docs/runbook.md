# Runbook

## Ambientes

Use três fronteiras separadas:

- local: Supabase via Docker e chaves locais;
- preview/staging: projeto Supabase próprio ou branches de preview quando o plano permitir;
- produção: projeto Supabase exclusivo, jamais usado por preview.

Não reutilize senha, chave secreta, Turnstile secret ou banco entre ambientes.

O repositório descreve essa separação, mas o ambiente de staging ainda precisa ser comprovadamente provisionado na R00. Até isso acontecer, nenhuma integração externa, credencial duradoura ou ação pública sensível deve ser considerada pronta para piloto.

## Bootstrap local

1. Instale Node.js 24, npm 11 e Docker Desktop.
2. Rode `npm ci`.
3. Rode `npm run db:start` e `npm run db:reset`.
4. Rode `npm run db:types` após qualquer migration.
5. Copie `.env.example` para `.env.local` e preencha com as credenciais locais exibidas por `npx supabase status`.
6. Rode `npm run dev`.

O OTP local não envia mensagem: use o WhatsApp de teste `+55 11 99999-9999` e o código `123456`. Outros números exigem um provedor configurado.

O cadastro público real fica indisponível em produção se Turnstile ou a chave server-side estiverem ausentes. Em desenvolvimento, o restante da interface pode subir sem essas integrações.

## Provisionamento remoto

O módulo em `infra/terraform` cria/configura:

- projeto e settings do Supabase;
- projeto Vercel ligado ao GitHub e variáveis de runtime;
- ruleset da branch `main`.

Use Terraform 1.11+ com HCP Terraform para estado remoto criptografado, lock e histórico. O bloco `cloud {}` recebe organização e workspace por ambiente. Nunca execute com estado local em uma máquina compartilhada.

```bash
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
terraform -chdir=infra/terraform init
terraform -chdir=infra/terraform plan
terraform -chdir=infra/terraform apply
```

Defina `TF_CLOUD_ORGANIZATION`, `TF_WORKSPACE` e `TF_TOKEN_app_terraform_io` antes do `init`. O workspace HCP deve existir e usar uma versão Terraform compatível.

Credenciais dos providers devem entrar somente por variáveis de ambiente:

- `SUPABASE_ACCESS_TOKEN`;
- `VERCEL_API_TOKEN`;
- `GITHUB_TOKEN`.

O `terraform.tfvars` contém identificadores e também valores sensíveis de bootstrap; está ignorado pelo Git. Para CI, mapeie inputs com `TF_VAR_*` e um cofre de segredos.

## Segredos do GitHub Actions

Crie um Environment protegido chamado `production` e adicione:

- `SUPABASE_ACCESS_TOKEN`: token de automação com escopo mínimo;
- `SUPABASE_PROJECT_ID`: ref do projeto de produção;
- `SUPABASE_DB_PASSWORD`: senha de produção.
- `TF_API_TOKEN`: token de equipe do HCP Terraform com acesso só ao workspace;
- `VERCEL_API_TOKEN`: token de automação do projeto/time;
- `INFRA_GITHUB_TOKEN`: fine-grained token para rulesets deste repositório;
- `TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`.

No workspace HCP Terraform, defina como variáveis sensíveis:

- `TF_VAR_smtp_user`;
- `TF_VAR_smtp_password`;
- `TF_VAR_twilio_account_sid`;
- `TF_VAR_twilio_auth_token`;
- `TF_VAR_twilio_message_service_sid` apontando para um Messaging Service habilitado no WhatsApp.

O `supabase_settings` habilita Phone Auth, exige confirmação e configura Twilio. Antes do primeiro deploy produtivo, valide o remetente e os templates no Twilio; WhatsApp no Supabase Auth é suportado apenas com Twilio ou Twilio Verify. Não copie essas credenciais para Vercel nem para `.env.local`.

Configure também `smtp_host`, `smtp_port`, `smtp_admin_email` e `smtp_sender_name` no workspace. O domínio do remetente deve estar verificado no provedor transacional, com SPF, DKIM e DMARC publicados. Desative rastreamento de links nos e-mails de autenticação e teste cadastro, reenvio, recuperação e notificação de senha antes de liberar produção.

Crie também as Repository Variables:

- `TF_CLOUD_ORGANIZATION` e `TF_WORKSPACE`;
- `SUPABASE_ORGANIZATION_ID`;
- `APP_URL`;
- `REQUIRED_APPROVALS` (comece em `0` enquanto houver um único mantenedor);
- `ENABLE_TERRAFORM_APPLY` deve permanecer `false` até a R00 fazer o workflow aplicar exatamente um artefato de plano revisado sob o Environment protegido. No estado atual, `true` executa um novo `apply -auto-approve` em cada push de `main`.

Restrinja o Environment à branch `main`. Se houver mais de uma pessoa responsável, exija aprovação para deploy de produção.

## Fluxo de entrega

1. Criar branch `codex/<tema>` ou `feat/<tema>`.
2. Vincular a mudança a um pacote em `docs/releases/` e confirmar seu CP0.
3. Implementar uma fatia vertical com testes, flag e migration quando necessário.
4. Abrir pull request usando o template e registrar as duas ordens possíveis de deploy.
5. Aguardar `quality`, `database`, `dependency-review`, CodeQL e `terraform-check`.
6. Fazer merge somente após revisão e com a feature desligada por padrão.
7. A Vercel publica a aplicação automaticamente.
8. O workflow `Deploy database` aplica migrations em produção de forma serializada.
9. Executar smoke test e ativar somente a coorte piloto prevista no pacote.

Migrações destrutivas usam expand/contract: primeiro adicionar estrutura compatível, depois migrar dados e código, só então remover a estrutura antiga em outro deploy. Nunca editar uma migration já aplicada.

Os deploys da Vercel e do Supabase são independentes e não têm ordenação conjunta garantida. Portanto:

- o caminho preferencial é publicar a expansão inerte em pull request próprio, aguardar migration e smoke com o app anterior e só então integrar o app consumidor;
- schema expandido deve aceitar a aplicação anterior;
- se aplicação e banco forem publicados pelo mesmo merge, a aplicação nova deve detectar ou tolerar o contrato compatível disponível;
- coluna/tabela nova não pode ser obrigatória para o fluxo antigo no primeiro deploy;
- leitura/escrita dupla, quando necessária, permanece até uma release posterior;
- contração nunca entra no mesmo pull request que introduz o novo contrato.

## Flags, piloto e smoke

- feature nova nasce desligada e é habilitada por time/coorte;
- a verificação ocorre no servidor e, quando aplicável, também na RPC; esconder UI não é autorização;
- integrações possuem kill switch global e controles separados para produzir e consumir comandos;
- worker com efeito externo começa em dry-run;
- cada pacote declara fluxo fallback, sinal de saúde e condição automática/manual de interrupção;
- smoke pós-deploy começa somente leitura e nunca depende de PII ou estado mutável de um time real;
- ativação amplia gradualmente apenas depois de métricas e alertas permanecerem saudáveis.

### Operação das flags e kill switches

As chaves tipadas estão no enum `feature_key`. Owner ou admin do time altera
uma flag exclusivamente pela RPC `set_team_feature_flag`; escrita direta não é
concedida. Toda mudança entra em `audit_logs`. A leitura de uma capacidade deve
passar por `is_team_feature_enabled` ou por uma RPC de domínio que consulte
`private.is_team_feature_enabled`, sempre junto da autorização normal do time.
Flag nunca concede acesso por si só.

Os controles `integration_produce` e `integration_consume` são globais,
independentes, nascem `false` e só podem ser operados pela credencial
`service_role` por `set_runtime_control`. Workers consultam o controle antes de
reservar trabalho e antes do efeito externo. Erro ou timeout retorna `false`
somente para o caminho novo; o fluxo legado não consulta esse serviço.

Para interromper um piloto:

1. desativar a flag do time;
2. desativar `integration_produce`;
3. desativar `integration_consume` se houver risco no worker;
4. confirmar a auditoria e preservar itens pendentes da outbox;
5. só então promover o último deploy conhecido como bom, se necessário.

### Contrato de staging

O Environment `staging` usa projeto Supabase, origem de aplicação, callbacks,
chaves e tenant sintético exclusivos. Não recebe dump, backup, chave, callback
ou dado de produção. O tenant do smoke tem `teams.is_synthetic = true`, nomes
fictícios e nenhuma PII. Previews não podem apontar para Supabase de produção.

O workflow `Smoke` compara origem, URL do Supabase e chave secreta de staging
com as referências de produção e falha antes de escrever se houver reuso. O
smoke de staging chama `run_staging_delivery_smoke` duas vezes com a mesma chave,
confere o tenant sintético e limpa a linha na própria transação da RPC. A suíte
pgTAP cobre acesso permitido, negação de tenant real, cross-tenant, idempotência
e limpeza.

Variáveis do Environment `staging`:

- `APP_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`;
- `SMOKE_SYNTHETIC_TEAM_ID`;
- `PRODUCTION_APP_URL`, `PRODUCTION_SUPABASE_URL` e
  `PRODUCTION_SUPABASE_SECRET_KEY`, usadas apenas para o gate de desigualdade.

### Smoke e promoção

Produção executa `npm run smoke:production` após deployment bem-sucedido. O
teste faz somente `GET` nas jornadas públicas `/` e `/auth/login`, exige HTML e
não envia identificador pessoal. Staging executa `npm run smoke:staging` por
despacho manual antes do piloto.

Matriz obrigatória para uma expansão:

| Estado | Banco N−1 | Banco N |
|---|---|---|
| App N−1 | baseline já validada | deve continuar funcionando; validar antes do app consumidor |
| App N | deve tolerar ausência da expansão ou permanecer desligado | liberar somente após smoke |

O PR de expansão de banco é inerte e separado do consumidor. Após o deploy,
verifique o histórico remoto e o app N−1; somente então integre o consumidor.
Se o mesmo merge for inevitável, o teste do pacote deve demonstrar as quatro
células. Contração fica para release posterior.

### Ensaio de rollback

Antes do piloto, registre o deployment bom da Vercel e execute em staging:

1. ligar a flag apenas no tenant sintético e concluir o smoke;
2. desligar a flag e confirmar efeito imediato pelo probe/RPC;
3. ligar produção de integração mantendo consumo desligado, depois desligar
   ambos;
4. promover o deployment bom anterior na Vercel;
5. repetir o smoke somente leitura;
6. se houver correção de banco, aplicar migration forward-only; nunca reverter
   ou editar migration aplicada.

Anexe ao pacote da release os IDs das execuções, deployment promovido, horários
e resultado. Sem essa evidência, CP5 permanece pendente.

## Primeira ativação do repositório

O ruleset referencia checks que só existem depois que os workflows executarem ao menos uma vez. Para o primeiro bootstrap:

1. enviar a fundação para `main`;
2. aguardar a primeira execução dos workflows;
3. configurar o HCP Terraform e as variáveis/segredos acima;
4. aplicar o Terraform com `enable_github_ruleset = true`;
5. testar um pull request pequeno para confirmar o bloqueio.

## Rollback

- aplicação: promover na Vercel o último deployment conhecido como bom;
- banco: preferir migration corretiva forward-only; restaurar backup apenas em incidente de perda/corrupção;
- segredo: revogar, emitir novo, atualizar cofre/Vercel/GitHub e reimplantar;
- regra de acesso: bloquear o fluxo afetado, preservar evidências, adicionar teste de regressão e aplicar correção.

## Incidente

1. Conter: revogar credenciais e desabilitar o caminho afetado.
2. Preservar logs e linha do tempo sem copiar PII para canais informais.
3. Avaliar times, titulares e dados impactados.
4. Corrigir e validar em ambiente isolado.
5. Notificar responsáveis e titulares conforme obrigação legal.
6. Registrar causa raiz, ações e teste que impede recorrência.
