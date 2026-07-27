# Runbook

## Ambientes

Durante o MVP, use duas fronteiras:

- local: Supabase via Docker e chaves locais;
- produção: projeto Supabase exclusivo ligado à branch `main`.

Previews ficam desabilitados ou sem variáveis de banco; nunca apontam para
produção. Não reutilize senha, chave secreta, Turnstile secret ou banco entre
local e produção.

Staging foi adiado por decisão de aceleração do MVP. Enquanto não existir,
integrações externas, credencial duradoura e ações públicas sensíveis só podem
ser validadas localmente e permanecem desligadas em produção. Produção aceita
apenas expansão inerte, smoke somente leitura e ativação manual reversível.

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

O Environment `production`, usado pelo banco e pelo smoke, contém:

- `SUPABASE_ACCESS_TOKEN`: token de automação com escopo mínimo;
- `SUPABASE_PROJECT_ID`: ref do projeto de produção;
- `SUPABASE_DB_PASSWORD`: senha de produção.

Crie `production-plan` com:

- `TF_API_TOKEN`: token de equipe do HCP Terraform com acesso só ao workspace;
- `TF_PLAN_ENCRYPTION_KEY`: segredo aleatório forte, igual em
  `production-plan` e `production-apply`, usado somente para proteger o plano
  binário no artefato;
- `VERCEL_API_TOKEN`: token de automação do projeto/time;
- `INFRA_GITHUB_TOKEN`: fine-grained token para rulesets deste repositório;
- `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD`;
- `TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`;
- `SMTP_USER` e `SMTP_PASSWORD`;
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` e
  `TWILIO_MESSAGE_SERVICE_SID`.

Crie `production-apply` com `TF_API_TOKEN`, `TF_PLAN_ENCRYPTION_KEY`,
`SUPABASE_ACCESS_TOKEN`, `VERCEL_API_TOKEN` e `INFRA_GITHUB_TOKEN`. O apply
recebe os demais inputs do plano binário já revisado e não recalcula o plano.

O workspace HCP Terraform opera em modo **Local**: ele fornece state remoto
criptografado, lock e histórico, enquanto o runner GitHub cria e aplica o plano
salvo. Por isso, não guarde inputs `TF_VAR_*` no workspace; mantenha-os no
Environment `production-plan`. `TWILIO_MESSAGE_SERVICE_SID` deve apontar para
um Messaging Service habilitado no WhatsApp.

O `supabase_settings` habilita Phone Auth, exige confirmação e configura Twilio. Antes do primeiro deploy produtivo, valide o remetente e os templates no Twilio; WhatsApp no Supabase Auth é suportado apenas com Twilio ou Twilio Verify. Não copie essas credenciais para Vercel nem para `.env.local`.

Configure também `smtp_host`, `smtp_port`, `smtp_admin_email` e `smtp_sender_name` no workspace. O domínio do remetente deve estar verificado no provedor transacional, com SPF, DKIM e DMARC publicados. Desative rastreamento de links nos e-mails de autenticação e teste cadastro, reenvio, recuperação e notificação de senha antes de liberar produção.

Crie também as Repository Variables:

- `TF_CLOUD_ORGANIZATION` e `TF_WORKSPACE`;
- `SUPABASE_ORGANIZATION_ID`;
- `APP_URL`;
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_ADMIN_EMAIL` e `SMTP_SENDER_NAME`;
- `AUTH_EMAIL_RATE_LIMIT`;
- `REQUIRED_APPROVALS` (comece em `0` enquanto houver um único mantenedor);
- `ENABLE_TERRAFORM_APPLY` deve permanecer `false` até os Environments
  `production-plan` e `production-apply` estarem protegidos. Quando habilitado,
  o workflow cria um `tfplan`, publica seu resumo, criptografa o plano binário e
  aplica exatamente o mesmo artefato somente após o gate de
  `production-apply`.

Restrinja ambos os Environments à branch `main`. Exija aprovação no
`production-apply`; com um único mantenedor, permita a própria aprovação.

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

### Limite operacional sem staging

O ambiente local é o único lugar autorizado para smoke de escrita, testes
cross-tenant, falhas, timeout e alternância de flags. Esses testes usam o
Supabase Docker recriado por migrations e dados fictícios da própria suíte.

Nenhum workflow, preview ou script recebe chave secreta de produção para testar
escrita. O smoke de produção é sempre anônimo e somente leitura. Qualquer
jornada que exija mensagem real, credencial duradoura ou escrita de smoke
permanece com flag e kill switches desligados até existir staging isolado ou uma
decisão posterior com controles equivalentes.

### Smoke e promoção

Produção executa `npm run smoke:production` após deployment bem-sucedido. O
teste faz somente `GET` nas jornadas públicas `/` e `/auth/login`, exige HTML e
não envia identificador pessoal. A mesma verificação pode ser despachada
manualmente no workflow `Smoke`.

Matriz obrigatória para uma expansão:

| Estado | Banco N−1 | Banco N |
|---|---|---|
| App N−1 | baseline já validada | deve continuar funcionando; validar antes do app consumidor |
| App N | deve tolerar ausência da expansão ou permanecer desligado | liberar somente após smoke |

Sem staging, a expansão precisa ser inerte e não pode ter consumidor ativo no
mesmo merge. O app N deve tolerar banco N−1 porque o módulo novo não participa
de nenhuma jornada ativa; o app N−1 tolera banco N porque a migration apenas
adiciona tabelas, enums, funções e grants. Após o merge, valide o histórico
remoto e execute imediatamente o smoke somente leitura. Contração fica para
release posterior.

### Ensaio de rollback

Antes do merge, registre o deployment produtivo bom da Vercel e execute
localmente:

1. ligar e desligar a flag no time fictício e confirmar efeito imediato;
2. ligar produção de integração mantendo consumo desligado, depois desligar
   ambos;
3. reconstruir o banco do zero e repetir pgTAP e aplicação;
4. após o merge, se o smoke falhar, manter flags e kill switches desligados e
   promover o deployment produtivo bom anterior na Vercel;
5. repetir o smoke somente leitura;
6. para banco, aplicar somente migration corretiva forward-only; nunca reverter
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
