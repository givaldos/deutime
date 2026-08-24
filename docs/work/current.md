---
release: R00
work_package: WP-R00-03
scope: auth_email_branding
branch_or_commit: "codex/email-branding"
checkpoint: CP3
status: active
completed_ac: [AC-R00-09]
dirty_files: []
tests:
  - "WP-R10-04: 4 arquivos/24 testes focados aprovados"
  - "pgTAP da sonda: 1 arquivo/28 testes aprovados"
  - "banco completo: 53 arquivos/1428 testes aprovados após reset integral"
  - "gate: lint, TypeScript, 85 arquivos/466 testes e teste de contexto aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado somente pela porta do sandbox"
  - "npm audit: 0 vulnerabilidades"
  - "CP4 preflight em produção/360 px: fallback privado, consentimento oculto, perfil público e alvos de 44–56 px aprovados; sem overflow horizontal"
  - "aceite do produto: navegador responsivo considerado evidência móvel suficiente para a R10; 3 arquivos/12 testes de interface e TypeScript aprovados"
  - "WhatsApp-first: criação de time por telefone confirmado ou perfil imutável verificado coberta por 1 arquivo/8 pgTAP; banco completo 54 arquivos/1436 testes"
  - "controle R10: 2 arquivos/9 testes focados; aplicação completa 87 arquivos/475 testes, lint, TypeScript, contexto e build Webpack aprovados"
  - "provisionamento sintético: 3 arquivos/12 testes focados; aplicação completa 88 arquivos/478 testes, lint, TypeScript, contexto e build Webpack aprovados"
  - "sessão sintética: fallback por link administrativo coberto; 2 arquivos/7 testes focados e aplicação completa 88 arquivos/480 testes, lint, TypeScript, contexto e build Webpack aprovados"
  - "aprovação sintética: leitura do vínculo pendente pela sessão owner coberta; 1 arquivo/5 testes focados e aplicação completa 88 arquivos/480 testes, lint e TypeScript aprovados"
  - "diagnóstico da súmula: falha redigida por código e orientação para conflito com partida explícita; lint, TypeScript e 88 arquivos/480 testes aprovados"
  - "catálogo da súmula: 1 migration forward-only e 1 arquivo/4 pgTAP; reset integral, 55 arquivos/1440 testes e lint sem novo alerta"
  - "pré-requisito R10: event_matches ativado somente pela operação guardada da coorte; 1 arquivo/5 testes focados"
  - "súmula explícita: seletor mobile de assistência envia assistAthleteId; 1 arquivo/1 teste de interface"
  - "consentimento sintético: preparar, publicar e revogar pela sessão real do atleta; 2 arquivos/9 testes focados"
  - "gate atual: lint, TypeScript, 89 arquivos/483 testes, contexto e build Webpack aprovados"
  - "rollout: partida explícita finalizada com dois participantes, dois gols e uma assistência; recognition ativa após pré/pós-sonda"
  - "produção: 2 cartões privados e 2 públicos confirmados; perfil público sem origem sensível"
  - "smoke consentido: workflow 32654607347 aprovado; smoke revogado: workflow 32654662792 aprovado"
  - "rollback: recognition desligada, resumo público ausente, fallback privado e fatos esportivos preservados"
  - "descoberta pós-R10: snapshot de produção somente leitura, uma linha agregada e supressão de grupos menores que 3"
  - "recuperação operacional: snippet histórico revertido; pós-sonda confirmou team_division desligada e fatos preservados"
  - "problema real: 4 falhas em duas semanas por atualização separada de init/analyze do CodeQL"
  - "correção operacional: PRs #278 e #279 aprovados; CodeQL, banco, qualidade, dependências, infraestrutura e deploy de prévia verdes"
  - "limpeza: PRs fragmentados #274 e #275 encerrados; dev e main sincronizadas no commit 32b17d2"
  - "infraestrutura: setup-node v7 e setup-cli v3 removem runtimes legados; 1 arquivo/2 testes focados, 91 arquivos/487 testes, lint, TypeScript, contexto, audit sem vulnerabilidades e build Next 16.3.2 aprovados"
  - "Open Graph: runtime Edge removido conforme Next 16.3.2; imagem estática pré-renderizada, 1 teste focado, 92 arquivos/488 testes, lint, TypeScript, contexto, audit sem vulnerabilidades e build aprovados"
  - "módulos: package declarado ESM explicitamente; build sem alertas, 1 teste focado, 93 arquivos/489 testes, lint, TypeScript, contexto e audit sem vulnerabilidades aprovados"
  - "Twilio: SDK usado somente na validação removido; assinatura local compatível com vetores oficiais, 3 arquivos/16 testes focados, 93 arquivos/490 testes, lint, TypeScript, contexto, audit e build Webpack aprovados; scmp ausente da árvore limpa"
  - "implantação Twilio: migração para Meta opcional; timeout do gate alinhado ao contrato de 3 s; ciclo natural 32772669622 aprovado com HTTP 200, modo live, templates prontos e zero falha, ambiguidade ou revisão"
  - "recuperação de senha: causa isolada no deploy que aplicava migrations, mas ignorava templates de Auth; 1 arquivo/2 testes focados, lint, TypeScript, 94 arquivos/492 testes e build Webpack aprovados"
  - "produção: Deploy Supabase 32775754544 atualizou e releu 7 campos de template; Smoke 32775800801 aprovado; dev e main sincronizadas em fb263a6"
  - "branding de e-mail: confirmação, recuperação e senha alterada compartilham logo, paleta e rodapé oficiais; 1 arquivo/4 testes focados, HTML estrutural e Terraform válidos"
blocker: null
next_action: "Executar gate completo, promover os três templates e confirmar a releitura remota."
---

# Trabalho atual

`WP-R10-04` concluiu a preparação técnica de robustez em CP3. A sonda
operacional é exclusiva do `service_role`, retorna somente contagens e horários
agregados e verifica ativação, reconstrução, consentimento, publicação e
rollback sem expor pessoa, time, partida, voto ou motivo.

As leituras privada e pública emitem telemetria redigida, com categorias
fechadas de erro e fallback. O smoke de produção pode verificar um perfil
sintético consentido ou revogado, preservando os blocos públicos históricos. O
runbook fixa limiares de parada, revogação, fallback e rollback forward-only.

O banco passou por reset integral, 28 testes focados e 1.428 testes completos;
o aplicativo passou por lint, TypeScript, 466 testes, build e audit. Nenhum time
foi ativado e `AC-R10-12/13` permanecem abertos. O checkpoint voltou a `idle`.

O pré-check de CP4 em produção, com sessão verificada e viewport de 360 px,
confirmou ausência de overflow horizontal; controles visíveis entre 44 e 56 px;
fallback privado; consentimento oculto com a flag desligada; e perfil público
com estatísticas e posições, sem resumo de reconhecimento ou identificadores
internos visíveis. Nenhuma escrita, flag ou consentimento foi alterado. Essa
checagem foi aceita explicitamente pelo responsável do produto como evidência
móvel suficiente para a R10, apoiada pelos testes automatizados de visão
privada, consentimento e resumo público. `AC-R10-12` e CP4 estão concluídos.

Ao iniciar CP5, a criação autenticada da organização sintética falhou fechada:
a interface aceita a sessão verificada por WhatsApp, mas a RPC histórica exigia
exclusivamente e-mail confirmado. Uma migration forward-only passou a aceitar
e-mail ou telefone confirmado, preservando identidade derivada da sessão,
serialização, limite de abuso, owner atômico e negação para `anon` e contas não
verificadas. A repetição ainda falhou porque a conta conserva a prova imutável
`player_profiles.phone_verified_at`, embora o identificador de telefone já não
esteja presente no Auth. Uma segunda migration forward-only passou a reconhecer
essa prova, que só nasce pelo cadastro guardado e não pode ser inserida por
`authenticated`. O arquivo focado passou 8 testes e o banco completo passou
1.436 testes. Nenhuma organização foi criada antes da segunda correção chegar à
produção.

A segunda correção foi promovida e a jornada autenticada criou com sucesso a
organização sintética `R10 Demo Reconhecimentos`, com owner ativo e sem atletas,
jogos ou fatos reais. Para evitar qualquer acesso direto ao banco durante o
piloto, o painel ganhou um controle restrito a essa coorte: autentica novamente,
valida o slug, relê o time sob RLS, executa a pré-sonda agregada via cliente
server-only e só então delega à RPC auditada. A pós-sonda confirma o estado; uma
falha após ativação dispara rollback imediato pela mesma RPC. A flag continua
desligada até esse controle chegar à produção.

O controle foi promovido e confirmou em produção o estado desligado, a ativação
pela RPC auditada, o marco não retroativo e a pós-sonda ativa. A tentativa de
provisionar o atleta pela configuração local falhou antes do cadastro porque o
ambiente local aponta para outro projeto; nenhum atleta ou fato foi criado na
coorte de produção. O provisionamento foi então movido para uma Server Action
do próprio deploy: exige owner/admin e confirmação, usa identidade fictícia
reservada, cadastro e aprovação pelas RPCs existentes, perfil público sintético
e pós-sonda. A flag está ativa, mas a coorte ainda não contém fatos esportivos.

O provisionamento chegou à produção e criou a identidade fictícia, mas o Auth
recusou o login por telefone antes do cadastro esportivo. A correção mantém o
telefone confirmado como prova WhatsApp-first e autentica a mesma conta também
por e-mail reservado, confirmado server-side; senha e identificadores continuam
restritos ao processo. Nenhum atleta ou fato foi criado nessa tentativa.

A repetição encontrou conflito da identidade existente, mas a busca limitada à
primeira página do Auth não a recuperou e parou antes do cadastro. A correção
pagina a lista, seleciona exclusivamente a etiqueta do piloto e reaplica
telefone e e-mail reservados na mesma conta. A coorte continua sem atleta e sem
fatos.

A busca paginada chegou à produção e recuperou a mesma identidade, porém o
provedor recusou também o login por senha antes do cadastro esportivo. A ação
agora tenta a senha e, se o provedor a indisponibilizar, gera server-side um
link administrativo de uso único e o verifica diretamente no cliente sem
enviar e-mail. A sessão continua pertencendo ao atleta sintético, portanto as
RPCs e RLS permanecem idênticas às da jornada real; falhas em cada estágio são
telemetradas somente por código e etapa, sem PII.

O fallback por link administrativo iniciou a sessão e concluiu cadastro e
perfil, mas a leitura do vínculo pendente pelo próprio atleta foi corretamente
ocultada por RLS. A correção transfere somente essa leitura para a sessão owner
já validada no início da ação; a aprovação continua delegada à RPC de revisão e
o cliente do atleta permanece responsável por cadastro e perfil.

A confirmação owner chegou à produção e aprovou o atleta com pós-sonda ativa.
Dois eventos e um segundo atleta estritamente sintético foram criados pela
interface; ambos os atletas foram confirmados. O lançamento de gol falhou
fechado tanto com quanto sem campos opcionais, antes de qualquer fato. A ação
passa a registrar somente o código redigido e orienta explicitamente o conflito
`40001` entre súmula legada e partida explícita.

A telemetria chegou à produção e identificou `PGRST203`: o catálogo remoto
conservava mais de uma assinatura histórica de `add_match_incident_as_staff`,
de modo que o gateway não selecionava a RPC. Uma migration forward-only remove
somente as variantes desse nome e recria a assinatura canônica, seus grants
mínimos e comentário na mesma transação. O teste exige exatamente uma função,
execução apenas por `authenticated` e negação para `anon`. O reset integral e
55 arquivos/1.440 pgTAP passaram; o lint não acrescentou alerta.

A migration foi aplicada em produção e a súmula legada registrou dois gols —
um do atleta vinculado e outro com assistência dele — e encerrou a partida.
Esses fatos confirmam a correção, mas permanecem fora da projeção R10, que por
contrato consome `event_matches`, `match_participations` e `match_events`. A
preparação guardada da coorte passa a ativar também `event_matches` pela RPC
auditada, permitindo repetir os fatos na fonte canônica sem ampliar outros
times.

`event_matches` foi ativado na coorte pela operação guardada. A interface criou
a partida explícita e escalou Apoio e Sintético no mesmo lado. O formulário
R04, porém, não expunha o parâmetro `assistAthleteId` já suportado por schema,
Action e RPC. Um seletor mobile de assistência opcional passa a enviar esse
campo, com teste de interface cobrindo o contrato.

O seletor chegou à produção. A partida explícita foi encerrada com os dois
atletas sintéticos escalados, um gol de Sintético e um gol de Apoio assistido
por Sintético. Esses fatos pertencem à fonte canônica da R10 e devem projetar
dois cartões privados para o atleta vinculado. O reconhecimento de Craque não
foi fabricado: a votação exige a janela real de 12 horas e permanece fora desta
prova até existir uma partida elegível.

A operação guardada da coorte passa a aceitar publicar ou revogar o resumo
sintético usando a sessão real do atleta, a mesma RPC de consentimento do
produto e um `request_id` novo. A pós-sonda valida o estado devolvido e relata
somente contagens agregadas de cartões privados e públicos, preservando a
ausência de PII.

A coleta operacional também identificou o aviso de pacote obsoleto `scmp`,
trazido exclusivamente pelo SDK `twilio@6.1.0`. O envio já usa o adaptador HTTP
do produto e somente a validação de callback dependia do SDK. Essa validação foi
internalizada com o contrato oficial HMAC-SHA1, ordenação determinística,
compatibilidade de porta e query string e comparação em tempo constante. Os
vetores foram capturados do SDK antes da remoção; uma instalação limpa confirmou
que `twilio` e `scmp` não permanecem na árvore.

A Twilio permanece como provedora da implantação. A API direta da Meta saiu do
caminho crítico e ficou condicionada a custo, escala ou necessidade operacional
comprovados. Cinco ciclos consecutivos do worker falharam fechados com HTTP 409,
embora a leitura agregada de produção mostrasse `integration_produce` e
`integration_consume` ativos e três times demo habilitados. A rota usava 750 ms
para a consulta que o contrato R03 permite executar por até 3 s; a correção
alinha esse limite sem transformar erro ou timeout em autorização.

A correção chegou à produção no commit `070d7fa`. O primeiro ciclo natural da
nova versão, workflow `32772669622`, respondeu HTTP 200 em modo `live`, confirmou
os dois templates de lembrete prontos e registrou zero falha, rejeição,
ambiguidade ou item para revisão. Não havia cota vencida, portanto nenhuma
mensagem ou custo adicional foi produzido nessa prova. O rollback por automação
e kill switches permanece disponível.

## Próxima ação

A R10 permanece concluída e desligada. Os três e-mails ativos de autenticação
recebem a identidade visual oficial com logo público, Verde Gramado, Volt, Gelo,
Grafite e rodapé de marca. O publicador continua restrito aos campos de template
e relê a configuração remota depois da escrita. A promoção e a evidência remota
são a próxima ação.
