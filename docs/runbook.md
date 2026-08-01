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

Na R02, página pública do evento, troca de capability e escrita de presença
possuem controles independentes. A expansão de `public_id` e das tabelas de
acesso pode chegar inerte à produção; sem staging, troca e escrita permanecem
desligadas até os gates locais e uma decisão explícita de piloto. Em incidente,
desligue primeiro troca/escrita e preserve a URL pública informativa.

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

Produção foi provisionada diretamente no Supabase e na Vercel. O deploy da
aplicação ocorre pela integração Vercel com `main`; migrations são aplicadas
pelo workflow `Deploy database`.

`infra/terraform` permanece apenas como referência validada por `fmt` e
`validate`. Não execute `init`, `plan`, `apply` ou `import` contra produção
durante o MVP. Torná-lo operacional exige primeiro importar todos os recursos
existentes para um state remoto protegido e comprovar plano sem recriação; essa
atividade está no backlog técnico.

## Segredos do GitHub Actions

O Environment `production`, usado pelo banco e pelo smoke, contém:

- `SUPABASE_ACCESS_TOKEN`: token de automação com escopo mínimo;
- `SUPABASE_PROJECT_ID`: ref do projeto de produção;
- `SUPABASE_DB_PASSWORD`: senha de produção.

O `supabase_settings` habilita Phone Auth, exige confirmação e configura Twilio. Antes do primeiro deploy produtivo, valide o remetente e os templates no Twilio; WhatsApp no Supabase Auth é suportado apenas com Twilio ou Twilio Verify. Não copie essas credenciais para Vercel nem para `.env.local`.

A Repository Variable `APP_URL` aponta para `https://deutime.app`. Terraform
não recebe tokens, segredos ou permissão de apply durante o MVP.

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

Quando `SMOKE_PUBLIC_EVENT_ID` estiver definido no Environment `production`, o
mesmo comando também verifica `/e/{public_id}` e o bloqueio de `GET` em
`/e/{public_id}/access`. Essa extensão continua anônima e somente leitura:
confirma HTML, `no-store`, `no-referrer`, `noindex`, `nosniff` e resposta `405`
do endpoint de troca. Use apenas um evento público sintético ou de demonstração,
sem nome, telefone ou outra PII na configuração do GitHub.

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
e resultado. Sem essa evidência, o ensaio de rollback não está concluído.

### Preparação do piloto WhatsApp — R03

O Sandbox da Twilio é somente para teste e não aceita template personalizado.
O ensaio físico usa o template **Appointment Reminders** pré-aprovado pela
Twilio, com o `ContentSid` exibido no Console da própria conta:

| Variável Sandbox | Valor DeuTime |
|---|---|
| `{{1}}` | título do evento + data/hora no fuso do time |
| `{{2}}` | link personalizado e estável do evento |

Essa redação em inglês não aprova o template do produto. O contrato definitivo
está em `EVENT_CALL_TEMPLATE_V1`: português `pt_BR`, categoria `UTILITY`, três
variáveis (título, data/hora e link), sem resposta atual, telefone, escalação,
endereço privado ou outra PII. Ele só pode ser criado e submetido depois do
registro do sender próprio; aprovação `approved` é gate para atletas reais.

Para preparar o Sandbox sem habilitar efeito, copie do Console somente para o
cofre local/Vercel, nunca para Git, logs ou documentação:

```dotenv
WHATSAPP_PILOT_MODE=sandbox
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=+14155238886
TWILIO_CONTENT_SID_EVENT_CALL_V1=HX...
TWILIO_TEMPLATE_PROFILE=sandbox_appointment
```

Antes do primeiro envio, confirme:

1. cada número demo enviou `join <código>` ao Sandbox nas últimas 72 horas;
2. o `ContentSid` é o Appointment Reminders mostrado no Console;
3. `Demo Campo` é o único time candidato e contém apenas dados demo;
4. `integration_produce`, `integration_consume` e `whatsapp_delivery` ainda
   estão desligados;
5. o callback público responde fechado sem assinatura e o smoke de produção
   está verde;
6. existe uma janela acompanhada para interromper consumo, preservar outbox e
   voltar ao compartilhamento manual.

O parser de configuração aceita exclusivamente o número compartilhado e o
perfil do Sandbox. Nesta fatia, isso não cria um entrypoint live: qualquer
credencial ausente/inválida falha fechado, e `WHATSAPP_PILOT_MODE=off` mantém a
integração inerte. O próximo gate deve adicionar uma execução limitada a uma
única intenção demo antes de ligar qualquer controle global.

Registre separadamente Android e iPhone: horário exibido, abertura no navegador
interno, URL removida após a troca, RSVP, `accepted/sent/delivered/read` quando
disponível e ausência de duplicata. Não copie telefone, link personalizado ou
corpo completo para a evidência.

### Piloto de `event_control` — R01

O deploy da R01 deve chegar com `event_control` desligada para todos os times.
Antes de escolher o piloto, confirme no SQL Editor de produção:

```sql
select team_id, enabled, updated_at
from public.team_feature_flags
where feature = 'event_control'
order by updated_at desc;
```

O resultado esperado logo após o deploy inerte é nenhuma linha habilitada. O
smoke anônimo deve passar antes de qualquer ativação. Se app e banco saírem em
ordem diferente, o app trata ausência da RPC/enum como capacidade desligada e
o schema novo é somente aditivo para a aplicação anterior.

Escolha um único time com owner identificado e consentimento para o piloto.
Confirme primeiro que o ator continua owner ou admin ativo:

```sql
select membership.team_id, membership.user_id, membership.role
from public.team_memberships membership
where membership.team_id = '<UUID_DO_TIME_PILOTO>'::uuid
  and membership.user_id = '<UUID_DO_OPERADOR>'::uuid
  and membership.status = 'active'
  and membership.role in ('owner', 'admin');
```

No SQL Editor, a ativação manual usa a RPC auditada, nunca `update` direto:

```sql
begin;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '<UUID_DO_OPERADOR>',
  true
);
select public.set_team_feature_flag(
  '<UUID_DO_TIME_PILOTO>'::uuid,
  'event_control',
  true
);
commit;
```

Durante o piloto, os logs da Vercel usam o evento
`event_control_operation`. `outcome=rejected` representa regra de domínio ou
autorização esperada; `outcome=failed` representa falha operacional. O banco
fornece a métrica de sucesso sem PII:

```sql
select
  command.kind,
  count(*) as comandos,
  max(command.created_at) as ultimo_comando
from public.event_commands command
where command.team_id = '<UUID_DO_TIME_PILOTO>'::uuid
  and command.created_at >= now() - interval '24 hours'
group by command.kind
order by command.kind;

select
  command.id,
  command.kind,
  (command.result ->> 'affected_count')::integer as efeitos_esperados,
  count(change.id)::integer as mudancas_registradas
from public.event_commands command
left join public.event_changes change on change.command_id = command.id
where command.team_id = '<UUID_DO_TIME_PILOTO>'::uuid
  and command.created_at >= now() - interval '24 hours'
group by command.id
having command.result is null
  or count(change.id) <> (command.result ->> 'affected_count')::integer;
```

Interrompa imediatamente se o smoke falhar, surgir qualquer
`outcome=failed`, a segunda consulta retornar linha ou houver fato histórico
reescrito. Três rejeições da mesma operação em 15 minutos pausam a ampliação
para investigação. Para desligar o piloto, repita a chamada auditada acima com
`false`; confirme que a UI nova desapareceu e que criação/edição legadas
continuam utilizáveis. `integration_produce` e `integration_consume` permanecem
`false`, pois a R01 não envia mensagens.

O rollback da aplicação promove o deployment produtivo bom registrado antes do
merge. As migrations da R01 não são revertidas: a flag desligada torna a
expansão inerte e eventual correção de banco é forward-only.

## Primeira ativação do repositório

O ruleset referencia checks que só existem depois que os workflows executarem ao menos uma vez. Para o primeiro bootstrap:

1. enviar a fundação para `main`;
2. aguardar a primeira execução dos workflows;
3. configurar o ruleset diretamente no GitHub com os checks reais;
4. testar um pull request pequeno para confirmar o bloqueio.

Automatizar esse provisionamento por Terraform depende da importação segura
registrada no backlog técnico.

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
