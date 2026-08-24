---
release: R10
work_package: WP-R10-04
scope: recognition_isolated_pilot
branch_or_commit: "codex/post-r10-roadmap-sync"
checkpoint: idle
status: done
completed_ac: [AC-R10-01, AC-R10-02, AC-R10-03, AC-R10-04, AC-R10-05, AC-R10-06, AC-R10-07, AC-R10-08, AC-R10-09, AC-R10-10, AC-R10-11, AC-R10-12, AC-R10-13]
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
blocker: null
next_action: "R10 concluída; manter a feature desligada e iniciar somente descoberta pós-R10 baseada em densidade e métricas agregadas."
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

## Próxima ação

A R10 está concluída e voltou ao estado desligado. Manter a feature nesse estado
até uma decisão explícita de ampliação. O reconhecimento de Craque será validado
somente em futura partida elegível, respeitando a janela real de votação de 12
horas; isso não bloqueia o aceite, já coberto por catálogo, projeção, RLS e
testes de reconstrução.
