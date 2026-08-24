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
aplicação ocorre pela integração Vercel com `main`; migrations e templates de
e-mail de autenticação são aplicados pelo workflow `Deploy Supabase`. O workflow
atualiza somente os campos de template, preserva as demais configurações de Auth
e confirma o conteúdo remoto depois da escrita.

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
8. O workflow `Deploy Supabase` aplica migrations e templates de autenticação em
   produção de forma serializada.
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
confirma HTML, canonical, `no-store`, `no-referrer`, `noindex`, ausência de
segredo, `GET` e `HEAD` do PNG, cache público, `nosniff` e resposta `405` do
endpoint de troca. Com `EXPECT_EVENT_SHARE_CARD_ENABLED=true`, exige também a
versão opaca de 12 caracteres no `og:image`. Use apenas um evento público
sintético ou de demonstração, sem nome, telefone ou outra PII na configuração
do GitHub.

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

### Piloto de divisão e escalação — R07

Ative `team_division` em somente um time demo com evento futuro. A página
pública precisa estar habilitada, mas não publique uma revisão por SQL: criação,
edição, publicação e retirada devem ocorrer pela interface e pela sessão
verificada de owner/admin. Antes da ativação, confirme a coorte e o operador:

```sql
select team.id as team_id, membership.user_id as operator_id,
  count(*) filter (where event.status = 'scheduled' and event.starts_at > now()) as eventos_futuros
from public.teams team
join public.team_memberships membership on membership.team_id = team.id
left join public.events event on event.team_id = team.id
where team.id = '<LINEUP_PILOT_TEAM_ID>'::uuid
  and membership.status = 'active'
  and membership.role in ('owner', 'admin')
group by team.id, membership.user_id;
```

Use a RPC auditada para alternar a flag:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '<OPERATOR_ID>', true);
select public.set_team_feature_flag(
  '<LINEUP_PILOT_TEAM_ID>'::uuid,
  'team_division',
  true
);
commit;
```

A sonda operacional exige `service_role`, retorna somente contagens e não deve
ser executada no navegador. No cofre operacional local, configure o UUID da
coorte sem versionar a chave e execute:

```bash
LINEUP_PILOT_TEAM_ID='<LINEUP_PILOT_TEAM_ID>' \
EXPECT_LINEUP_PILOT_ENABLED=true \
npm run pilot:lineup:health
```

Os dois gates precisam estar ativos; consentimentos publicados nunca podem
superar alocações publicadas. Observe também falhas redigidas
`event_lineup_image.failed` e renderizações agregadas
`event_lineup_image.rendered`. Nenhum log pode conter ID público, nome, telefone
ou conteúdo da exceção.

Para rollback imediato, repita a RPC auditada com `false`. Confirme a sonda com
`EXPECT_LINEUP_PILOT_ENABLED=false`, abra novamente a URL canônica e verifique
que a lista privada de confirmados e o evento continuam utilizáveis, enquanto
editor, escalação pública e imagem publicada desaparecem. A migration é
forward-only e não deve ser revertida.

### Piloto do cartão compartilhável — R08M

Use somente a coorte demo já autorizada (`demo-campo`) e um evento sem PII. Não
versione UUID, operador ou `public_id`. Antes da ativação, confirme a coorte, um
owner/admin ativo e ao menos um evento na janela operacional:

```sql
select team.id as team_id, membership.user_id as operator_id,
  count(*) filter (
    where event.starts_at >= now() - interval '30 days'
      and event.starts_at < now() + interval '90 days'
  ) as eventos_na_janela
from public.teams team
join public.team_memberships membership on membership.team_id = team.id
left join public.events event on event.team_id = team.id
where team.slug = 'demo-campo'
  and membership.status = 'active'
  and membership.role in ('owner', 'admin')
group by team.id, membership.user_id;
```

Configure o UUID somente no cofre operacional local. A sonda usa
`service_role`, retorna flags, contagens por fase e horários agregados, e falha
se a soma das fases divergir da projeção:

```bash
EVENT_SHARE_PILOT_TEAM_ID='<EVENT_SHARE_PILOT_TEAM_ID>' \
EXPECT_EVENT_SHARE_CARD_ENABLED=false \
npm run pilot:event-share:health
```

Ative exclusivamente pela RPC auditada e pela sessão do owner/admin confirmado:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '<OPERATOR_ID>', true);
select public.set_team_feature_flag(
  '<EVENT_SHARE_PILOT_TEAM_ID>'::uuid,
  'event_share_card',
  true
);
commit;
```

Depois da ativação:

1. repetir a sonda com `EXPECT_EVENT_SHARE_CARD_ENABLED=true`;
2. configurar no Environment `production` somente `SMOKE_PUBLIC_EVENT_ID` com
   evento demo e `EXPECT_EVENT_SHARE_CARD_ENABLED=true`;
3. despachar o workflow `Smoke` e exigir página, canonical, versão opaca, GET e
   HEAD do PNG e todos os headers de privacidade;
4. observar `public_event_share_state.observed` por fase, fallback, duração e
   categoria de erro, e `event_share_image.rendered` somente por fase; nenhum
   log pode conter `public_id`, nome, endereço, telefone, capability ou exceção;
5. interromper se o smoke falhar, aparecer `projection_unavailable`, houver
   fallback inesperado com a flag ligada ou divergência de fase entre HTML e
   preview.

Registre cada preview físico sem PII:

| Plataforma | Contexto | Fase esperada | Resultado | Cache observado | Fallback |
|---|---|---|---|---|---|
| WhatsApp Android | conversa e navegador interno | `<fase>` | `<ok/falha>` | `<novo/antigo>` | `<não/usado>` |
| WhatsApp iPhone | conversa e navegador interno | `<fase>` | `<ok/falha>` | `<novo/antigo>` | `<não/usado>` |
| Instagram | mensagem | `<fase>` | `<ok/falha>` | `<novo/antigo>` | `<não/usado>` |
| Telegram | conversa | `<fase>` | `<ok/falha>` | `<novo/antigo>` | `<não/usado>` |
| iMessage | conversa | `<fase>` | `<ok/falha>` | `<novo/antigo>` | `<não/usado>` |

Rollback imediato usa a mesma RPC com `false`. Em seguida, ajuste
`EXPECT_EVENT_SHARE_CARD_ENABLED=false`, repita a sonda e o smoke e confirme
que `projected_events=0`, todos os eventos da janela voltaram a
`fallback_events`, a URL canônica não mudou e o cartão anterior continua
utilizável. Não reverta migrations e não altere `public_event_page`,
`event_matches` ou `voting` como parte desse rollback.

### Piloto de campeonatos — R09

Use uma única organização demo sem PII e sem participante que dependa de outro
tenant. Configure `CHAMPIONSHIP_PILOT_TEAM_ID` somente no ambiente protegido da
aplicação e no cofre operacional local. Sem a variável, o controle não aparece
e a feature permanece desligada. Confirme previamente a coorte e um owner/admin:

```sql
select team.id as team_id, membership.user_id as operator_id,
  count(championship.id) as campeonatos_existentes
from public.teams team
join public.team_memberships membership on membership.team_id = team.id
left join public.championships championship on championship.team_id = team.id
where team.slug = '<SLUG_DEMO>'
  and membership.status = 'active'
  and membership.role in ('owner', 'admin')
group by team.id, membership.user_id;
```

Antes da ativação, a sonda exige `service_role` e deve confirmar a flag
desligada. O retorno contém apenas flags, contagens e horários agregados:

```bash
CHAMPIONSHIP_PILOT_TEAM_ID='<CHAMPIONSHIP_PILOT_TEAM_ID>' \
EXPECT_CHAMPIONSHIP_ENABLED=false \
npm run pilot:championship:health
```

Ative pelo controle **Piloto de campeonatos** nas configurações do time, usando
a sessão verificada do owner/admin e a confirmação explícita. Como alternativa
operacional, use a mesma RPC auditada:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '<OPERATOR_ID>', true);
select public.set_team_feature_flag(
  '<CHAMPIONSHIP_PILOT_TEAM_ID>'::uuid,
  'championships',
  true
);
commit;
```

Depois da ativação:

1. criar pela interface um campeonato sintético e publicar sua página;
2. repetir a sonda com `EXPECT_CHAMPIONSHIP_ENABLED=true` e
   `EXPECT_CHAMPIONSHIP_PROJECTION=true`;
3. configurar no Environment `production` somente
   `SMOKE_PUBLIC_CHAMPIONSHIP_ID` com o UUID público sintético;
4. despachar o workflow `Smoke` com o input padrão
   `expect_championship_enabled=true` e exigir `200`, canonical `/c`, HTML,
   `private, no-store`, `no-referrer`, `noindex`, `nofollow`, `nosniff` e os
   blocos mínimos de regulamento, confrontos e compartilhamento;
5. vincular e concluir uma partida sintética pela jornada normal, repetir a
   sonda e confirmar `reconstruction_mismatches=0`;
6. observar `public_championship_projection.observed`: formato, contagens,
   fallback, duração e categoria de erro são permitidos; nome, IDs, endereço,
   motivo e exceção não são;
7. observar `championship_pilot.flag_changed` somente como booleano e registrar
   horários do deployment, ativação, smoke e rollback.

Interrompa imediatamente se o smoke falhar, aparecer
`projection_unavailable`, houver `fallback_championships>0` com a flag ligada,
`reconstruction_mismatches>0`, vazamento no HTML ou três falhas operacionais em
15 minutos. Duração acima de três segundos em três leituras consecutivas pausa
a ampliação para investigação. R09 não altera outbox nem kill switches de
integração; `integration_produce` e `integration_consume` permanecem desligados.

Registre a verificação física sem nomes, URLs ou identificadores:

| Plataforma | Contexto | Formato | Toque/teclado/leitor | Compartilhamento | Fallback | Resultado |
|---|---|---|---|---|---|---|
| WhatsApp Android | conversa + navegador interno | `<formato>` | `<ok/falha>` | `<ok/falha>` | `<não/usado>` | `<ok/falha>` |
| WhatsApp iPhone | conversa + navegador interno | `<formato>` | `<ok/falha>` | `<ok/falha>` | `<não/usado>` | `<ok/falha>` |

O rollback usa o mesmo controle ou RPC com `false`. Em seguida:

1. executar a sonda com `EXPECT_CHAMPIONSHIP_ENABLED=false` e confirmar
   `projected_championships=0`, candidatos em `fallback_championships` e fatos
   preservados;
2. executar o smoke com `EXPECT_CHAMPIONSHIP_ENABLED=false` localmente ou
   despachar o workflow `Smoke` com `expect_championship_enabled=false`, e
   exigir `404` na mesma `/c`, mantendo todos os headers privados;
3. abrir agenda, partida e súmula pela interface e confirmar que continuam
   utilizáveis, enquanto os atalhos de campeonato desaparecem;
4. manter a flag desligada e promover o último deployment bom se a regressão
   estiver na aplicação. Banco recebe somente correção forward-only.

Sem staging isolado, escrita, concorrência, alternância de flag e limpeza usam
somente Supabase local com dados sintéticos. Produção recebe exclusivamente
sonda agregada e smoke anônimo de leitura.

### Piloto de reconhecimentos positivos — R10

O piloto só pode começar depois de CP4 aprovado. O padrão exige Android,
iPhone, leitor de tela e navegador interno do WhatsApp; uma decisão explícita
do responsável pelo produto pode aceitar o navegador responsivo como proxy,
desde que a release registre a exceção e preserve testes automatizados dos
estados ativos e de fallback. Use uma única organização demo, um perfil
sintético público e fatos esportivos sintéticos; não copie dados de pessoa real.
Guarde `RECOGNITION_PILOT_TEAM_ID` e `SUPABASE_SECRET_KEY` apenas no ambiente
operacional protegido.

Antes de qualquer ativação, a sonda deve confirmar flag e projeções desligadas.
O retorno contém exclusivamente booleanos, contagens e horários agregados:

```bash
RECOGNITION_PILOT_TEAM_ID='<TEAM_ID_DEMO>' \
EXPECT_RECOGNITION_ENABLED=false \
npm run pilot:recognition:health
```

Interrompa se a sonda não encontrar exatamente uma coorte, expuser qualquer
identificador/conteúdo ou apresentar projeção pública/privada com a flag off.
Depois de CP4, um owner/admin verificado pode ativar pela RPC auditada:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '<OPERATOR_ID>', true);
select public.set_team_feature_flag(
  '<TEAM_ID_DEMO>'::uuid,
  'recognition',
  true
);
commit;
```

A primeira ativação define o marco não retroativo. Não o edite nem apague. Em
seguida, crie uma partida sintética posterior ao marco, finalize gol,
assistência e Craque, e execute:

```bash
RECOGNITION_PILOT_TEAM_ID='<TEAM_ID_DEMO>' \
EXPECT_RECOGNITION_ENABLED=true \
EXPECT_RECOGNITION_PROJECTION=true \
npm run pilot:recognition:health
```

Pelo perfil sintético, conceda `public_recognition_summary_v1`, configure
`SMOKE_PUBLIC_PLAYER_HANDLE` sem URL e despache o workflow `Smoke` com
`expect_recognition_summary=true`. Exija perfil, estatísticas, posições e o
resumo agregado; o HTML não pode conter IDs internos, versão do catálogo,
partida, data, voto, colocação, capability ou segredo. Depois execute a sonda
com `EXPECT_RECOGNITION_PUBLIC_SUMMARY=true`.

Observe somente:

- `private_recognition_projection.observed`: totais por categoria, fallback,
  duração e categoria fechada de erro;
- `public_recognition_projection.observed`: quantidade de categorias, total,
  fallback, duração e categoria fechada de erro;
- a sonda: fontes, projeções, divergências, consentimentos, comandos recentes e
  horários; nunca IDs, nomes, handles, títulos, votos, motivos ou erro bruto.

Interrompa imediatamente se `reconstruction_mismatches>0`, cartões projetados
diferirem das fontes com a flag ligada, surgir projeção com a flag desligada,
houver vazamento no HTML ou três falhas em 15 minutos. Três durações acima de
três segundos pausam a ampliação. O compartilhamento permanece manual e não
aciona integração externa.

Registre a verificação física sem nomes, URLs ou identificadores:

| Plataforma | Contexto | Largura | Toque | Teclado/leitor | Revogação | Resultado |
|---|---|---|---|---|---|---|
| WhatsApp Android | conversa + navegador interno | `<px>` | `<ok/falha>` | `<ok/falha>` | `<ok/falha>` | `<ok/falha>` |
| WhatsApp iPhone | conversa + navegador interno | `<px>` | `<ok/falha>` | `<ok/falha>` | `<ok/falha>` | `<ok/falha>` |

Rollback imediato usa a mesma RPC com `false`. Depois:

1. executar a sonda com `EXPECT_RECOGNITION_ENABLED=false` e exigir projeções
   privada/pública zeradas, marco preservado e fontes esportivas intactas;
2. despachar `Smoke` com `expect_recognition_summary=false` e confirmar que o
   perfil, estatísticas e posições continuam disponíveis sem o resumo;
3. abrir agenda, súmula, Craque e `/me/reconhecimentos`; as jornadas históricas
   permanecem utilizáveis e o atalho de reconhecimento desaparece;
4. manter a flag desligada e promover o último deployment bom se a regressão
   estiver na aplicação. Banco recebe somente correção forward-only.

Produção recebe apenas sonda agregada e smoke anônimo de leitura. Alternância de
flag, consentimento, correção, concorrência e limpeza usam dados sintéticos da
coorte isolada; antes de CP4 permanecem exclusivamente no Supabase local.

### Retenção diária — R05/R06

A Vercel chama `GET /api/internal/craque/retention` uma vez por dia, às
`05:17 UTC`. O cron existe somente no deployment de produção e envia
automaticamente `Authorization: Bearer <CRON_SECRET>`. Configure
`CRON_SECRET` apenas em Production, com pelo menos 32 caracteres aleatórios e
sem quebra de linha. Sem esse segredo a rota falha fechado com `401` e não
acessa o banco.

A rota preserva o caminho histórico de R05, mas usa `service_role` para chamar
as duas rotinas: `cleanup_craque_voting_retention(500)` e
`cleanup_match_conversation_retention(500)`. Cada execução:

- remove até 500 recibos cuja validade de sete dias terminou;
- seleciona até 500 partidas finalizadas há pelo menos 90 dias;
- apaga `voter_hash`, o hash do recibo, snapshot de elegibilidade e salt;
- preserva candidato, quantidade e percentual agregados;
- seleciona até 500 partidas finalizadas há mais de dois anos e elimina
  comentários, respostas, denúncias, snapshot de elegibilidade e auditorias
  vinculadas aos comentários;
- pode ser repetida com segurança quando um cron falhar.

O retorno esperado é `200` com `status: retenção executada` e contadores sem
PII. Durante a ordem app N/banco N−1, a conversa retorna temporariamente
`status: contrato pendente` e a retenção de R05 continua normalmente. Para
verificar pendências sem consultar hashes, corpos ou identidades:

```sql
select count(*) as recibos_expirados
from public.craque_vote_receipts
where expires_at <= now();

select count(*) as votos_a_anonimizar
from public.craque_votes vote
join public.event_matches match on match.id = vote.match_id
where match.finalized_at <= now() - interval '90 days'
  and vote.anonymized_at is null;

select count(distinct match.id) as conversas_vencidas
from public.event_matches match
where match.finalized_at <= now() - interval '2 years'
  and (
    exists (
      select 1 from public.match_comments comment
      where comment.match_id = match.id
    )
    or exists (
      select 1 from private.match_conversation_eligibility eligibility
      where eligibility.match_id = match.id
    )
  );
```

Se a execução automática falhar, corrija a configuração e repita manualmente:

```bash
curl --fail-with-body \
  'https://deutime.app/api/internal/craque/retention' \
  -H 'Authorization: Bearer <CRON_SECRET>'
```

Não copie o segredo, hashes, motivos, corpos ou identificadores pessoais para
logs/evidências. O JSON operacional deve conter apenas contadores. Se a parte
da conversa falhar fora da janela de compatibilidade, a rota devolve `503` e
nenhum lote parcialmente executado por uma RPC é mantido; corrija o contrato e
repita, pois ambas as rotinas são idempotentes.

Para interromper a rotina, desabilite o cron na Vercel ou remova
`CRON_SECRET`; isso não apaga votos nem altera a súmula. Desligar `comments`
remove imediatamente leitura, escrita e painel, mas preserva o histórico até a
retenção. Correção de banco continua forward-only.

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

Em produção, `TWILIO_WHATSAPP_FROM=+15553101875` identifica o sender dedicado a
automações e notificações. O número `+551132300101` é contato comercial humano
e não deve ser configurado no worker.

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

O parser de configuração aceita exclusivamente o número compartilhado, o
perfil do Sandbox, um time UUID e um destinatário E.164 allowlisted. Qualquer
credencial ausente/inválida falha fechado, e `WHATSAPP_PILOT_MODE=off` mantém a
integração inerte.

O entrypoint `POST /api/internal/whatsapp/pilot` exige o mesmo bearer forte do
worker, JSON estrito com uma única `outboxId`, configuração `sandbox` válida e
`integration_consume` ativo. A RPC confere novamente outbox, time,
destinatário, template `event_call:v1`, flag do time, lease e barreira de
efeito. Ela nunca procura o próximo item da fila e não executa recovery global.

Antes do envio, identifique no SQL Editor um único candidato demo e confirme
que o telefone é exatamente o allowlisted na Vercel:

```sql
select
  team.id as team_id,
  event.id as event_id,
  athlete.id as athlete_id,
  athlete_private.phone_e164,
  membership.user_id as operator_id
from public.teams team
join public.events event on event.team_id = team.id
join public.event_attendance attendance on attendance.event_id = event.id
join public.athletes athlete
  on athlete.id = attendance.athlete_id
  and athlete.team_id = team.id
join public.athlete_private athlete_private
  on athlete_private.athlete_id = athlete.id
join public.communication_consents consent
  on consent.athlete_id = athlete.id
  and consent.team_id = team.id
  and consent.channel = 'whatsapp'
  and consent.status = 'granted'
join public.team_memberships membership
  on membership.team_id = team.id
  and membership.status = 'active'
  and membership.role in ('owner', 'admin')
where team.id = '<WHATSAPP_PILOT_TEAM_ID>'::uuid
  and athlete_private.phone_e164 = '<WHATSAPP_PILOT_RECIPIENT>'
  and athlete.status = 'active'
  and event.status = 'scheduled'
  and event.starts_at > now()
order by event.starts_at
limit 1;
```

Com resultado único revisado, habilite produção somente para enfileirar e
desligue-a antes do consumo:

```sql
select public.set_runtime_control('integration_produce', true);

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '<OPERATOR_ID>', true);
select public.set_team_feature_flag(
  '<WHATSAPP_PILOT_TEAM_ID>'::uuid,
  'whatsapp_delivery',
  true
);
select * from public.enqueue_event_whatsapp_call(
  '<EVENT_ID>'::uuid,
  'event_call',
  'v1'
);
commit;

select public.set_runtime_control('integration_produce', false);
```

Não prossiga se o enqueue retornar mais de uma linha. Para o efeito único,
ligue consumo, chame o endpoint e desligue consumo imediatamente:

```bash
curl --fail-with-body \
  -X POST 'https://deutime.app/api/internal/whatsapp/pilot' \
  -H 'Authorization: Bearer <WHATSAPP_WORKER_SECRET>' \
  -H 'Content-Type: application/json' \
  --data '{"outboxId":"<OUTBOX_ID>"}'
```

```sql
select public.set_runtime_control('integration_consume', false);
```

Se o endpoint não retornar `claimed=1` e `accepted=1`, não repita o envio:
consulte `list_whatsapp_delivery_operation`, preserve a tentativa e trate como
reconciliação manual. Depois da prova, desligue a flag do time e volte
`WHATSAPP_PILOT_MODE` para `off` na Vercel.

Registre separadamente Android e iPhone: horário exibido, abertura no navegador
interno, URL removida após a troca, RSVP, `accepted/sent/delivered/read` quando
disponível e ausência de duplicata. Não copie telefone, link personalizado ou
corpo completo para a evidência.

### Dois lembretes econômicos — R03R

O workflow `WhatsApp worker` do GitHub Actions chama
`POST /api/internal/whatsapp/worker` a cada 15 minutos. Ele só executa quando a
Repository Variable `WHATSAPP_AUTOMATION_ENABLED` é exatamente `true` e usa o
Repository Secret `WHATSAPP_WORKER_SECRET`, igual ao valor da Vercel
Production. Com `integration_consume=false`, a rota responde `409`; o workflow
trata esse estado desligado como saudável, sem produzir outbox nem reservar
mensagens. Qualquer outro erro HTTP falha a execução.

O agendador fica inerte por padrão porque a variável não existe ou permanece
`false`. Isso evita depender do cron de alta frequência da Vercel no plano do
MVP; uma migração futura para o agendador do provedor fica no backlog técnico.

O produtor automático só roda em modo live quando os dois Content SIDs estão
válidos na Vercel Production:

```dotenv
TWILIO_CONTENT_SID_EVENT_CALL_CARD_FIRST_REMEMBER_V2=HXe996a905e307cd768134231543fc7916
TWILIO_CONTENT_SID_EVENT_CALL_CARD_LAST_REMEMBER_V2=HXbde1f80e9702f94766b70b56015920bf
```

Esses valores pertencem ao cofre da Vercel; não entram no banco, na interface,
no payload, nos logs ou em argumentos de Actions/RPCs. O produtor deriva
`first_card_v2` e `last_card_v2` da cota imutável. App N tolera banco N−1 e
registra `contractAvailable=false`, sem impedir o consumo de outboxes antigos.

Antes de habilitar o workflow, cadastre o mesmo segredo do worker no GitHub e
mantenha a variável desligada:

```text
Repository Secret:   WHATSAPP_WORKER_SECRET=<mesmo valor da Vercel>
Repository Variable: WHATSAPP_AUTOMATION_ENABLED=false
```

Antes do piloto, confirme que nenhuma cota está ativa em outro time e que a
fila não contém trabalho inesperado:

```sql
select team_id, feature, enabled
from public.team_feature_flags
where feature in ('whatsapp_delivery', 'whatsapp_reminders')
  and enabled
order by team_id, feature;

select template_key, template_version, status, count(*) as quantidade
from public.notification_outbox
where channel = 'whatsapp'
  and status in ('pending', 'processing', 'failed')
group by template_key, template_version, status
order by template_key, template_version, status;

select control, enabled
from public.runtime_controls
where control in ('integration_produce', 'integration_consume')
order by control;
```

O resultado inicial esperado é nenhuma flag de lembrete habilitada, nenhuma
fila inesperada e ambos os controles `false`. Escolha somente um time demo com
owner/admin presente, evento futuro e números físicos autorizados. Habilite as
flags pela RPC auditada, mantendo os controles desligados:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '<OPERATOR_ID>', true);
select public.set_team_feature_flag(
  '<TEAM_ID>'::uuid,
  'whatsapp_delivery',
  true
);
select public.set_team_feature_flag(
  '<TEAM_ID>'::uuid,
  'whatsapp_reminders',
  true
);
commit;
```

No celular, revise a prévia na página do evento. Para provar uma cota manual
sem abrir o cron automático, ligue somente produção, use **Enviar lembrete
agora** uma vez e desligue produção imediatamente. Confirme que a quantidade
do outbox é exatamente a prevista antes de liberar consumo:

```sql
select public.set_runtime_control('integration_produce', true);
-- Executar uma única vez pela interface do evento.
select public.set_runtime_control('integration_produce', false);

select slot.slot_key, slot.status, slot.triggered_manually,
       count(outbox.id) as mensagens
from public.event_whatsapp_reminder_slots slot
left join public.notification_outbox outbox
  on outbox.reminder_slot_id = slot.id
where slot.event_id = '<EVENT_ID>'::uuid
group by slot.id
order by slot.slot_key;
```

Se a contagem estiver correta, ligue consumo, execute uma vez o worker manual e
desligue consumo. Não repita uma resposta ambígua:

```bash
curl --fail-with-body \
  -X POST 'https://deutime.app/api/internal/whatsapp/worker' \
  -H 'Authorization: Bearer <WHATSAPP_WORKER_SECRET>'
```

```sql
select public.set_runtime_control('integration_consume', false);
```

Para provar o automático, configure a próxima cota para uma janela futura,
confirme a prévia e só então ligue `integration_produce` e
`integration_consume`. Depois altere `WHATSAPP_AUTOMATION_ENABLED=true`; cada
execução processa no máximo uma cota por evento. Ao encerrar o piloto, volte a
variável para `false` antes de desligar os controles do banco.
Cota vazia vira `skipped`; atraso superior a seis horas, prazo fechado, evento
encerrado, opt-out, telefone removido ou RSVP já respondido nunca chama o
adapter. O produtor e a barreira de efeito fazem verificações independentes.

Monitore apenas agregados, sem telefone ou URL personalizada:

```sql
select slot.slot_key, slot.status, slot.status_reason,
       count(outbox.id) as total,
       count(outbox.id) filter (where outbox.status = 'sent') as enviados,
       count(outbox.id) filter (where outbox.status = 'failed') as falhas,
       count(outbox.id) filter (where outbox.requires_review) as revisar
from public.event_whatsapp_reminder_slots slot
left join public.notification_outbox outbox
  on outbox.reminder_slot_id = slot.id
where slot.event_id = '<EVENT_ID>'::uuid
group by slot.id
order by slot.slot_key;
```

Interrompa se houver destinatário inesperado, duplicata, `requires_review`,
template divergente da cota, callback sem correlação ou falha repetida. Ordem
de contenção: desligar `whatsapp_reminders` no time, depois
`integration_produce` e `integration_consume`; preservar outbox/tentativas;
voltar ao compartilhamento manual do link. Migration não é revertida e cotas
consumidas não são recriadas.

Registre a prova do primeiro e do último lembrete separadamente em Android e
iPhone: card ou fallback textual, branding da imagem, data/hora local, botão,
abertura do link estável, RSVP persistido após fechar/reabrir e ausência de
nova cobrança para quem já respondeu. A evidência não inclui telefone, corpo
completo, link com capability, SID ou credencial.

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
