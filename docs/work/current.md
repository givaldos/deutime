---
release: R09
work_package: WP-R09-05
scope: championship_robustness_and_pilot
branch_or_commit: "codex/r09-sync-main-dev-203"
checkpoint: CP5
status: in_progress
completed_ac: [AC-R09-01, AC-R09-03, AC-R09-06, AC-R09-07, AC-R09-08, AC-R09-09, AC-R09-10, AC-R09-11, AC-R09-12, AC-R09-13, AC-R09-14]
dirty_files: []
tests:
  - "pgTAP focado WP-R09-05: sonda 36/36 e concorrência real 22/22"
  - "db:test: 50 arquivos e 1.317 testes aprovados"
  - "db:lint: nenhum aviso novo; dois avisos legados permanecem fora do escopo"
  - "migrations forward-only preservadas e tipos regenerados"
  - "gate de app: ESLint, TypeScript e 75 arquivos/426 testes Vitest aprovados"
  - "build de produção Webpack aprovado; auditoria: zero vulnerabilidades"
  - "ciclo sintético 390x844: coorte isolada, alvo 48 px, ativação, sonda, agenda e rollback aprovados"
  - "preparação CP4 LAN: login, tabela e chave sintéticas, 390x844/360x800, sonda e smoke de produção aprovados"
  - "testes focados de CSP/request ID: 2 arquivos e 11 testes; TypeScript aprovado"
  - "Android e iPhone: toque, leitor de tela, tabela, chave, compartilhamento e navegador interno do WhatsApp aprovados pelo responsável"
  - "rollback: duas páginas em 404, fatos preservados pela sonda, cenários locais removidos e seed neutro reconstruído"
  - "coorte CP5: variável sensível restrita a Production, redeploy 764d175 Ready em 1m23s e smoke somente de leitura aprovado em 18s"
  - "pré-sonda pós-redeploy: flag desligada, zero projeções, fallback, divergências e comandos"
  - "piloto CP5 ativo: projeção 1/1, smoke público aprovado em 15s e telemetria agregada sem fallback ou erro"
  - "partida sintética vinculada e concluída; sonda sem divergência de reconstrução"
  - "rollback CP5: flag desligada, projeção 0/1, fatos preservados, smoke 404 aprovado em 12s e fallback existente íntegro"
  - "correção do 404: 2 arquivos/17 testes focados, TypeScript, 76 arquivos/429 testes, build Webpack e auditoria sem vulnerabilidades"
  - "PR #199: qualidade, banco, CodeQL, dependências, Terraform e Vercel Preview aprovados; jobs condicionais ignorados"
  - "PR #199 integrado por squash em dev no commit 4cea6bb"
  - "PR #200: oito checks aprovados, dois condicionais ignorados e estado MERGEABLE/CLEAN"
  - "PR #200 integrado em main no commit f24a0f9; deployment Vercel, CI, CodeQL, banco, Terraform e smoke 31743568341 aprovados"
  - "smoke pós-deploy: EXPECT_CHAMPIONSHIP_ENABLED=false e campeonato público em fallback aprovados"
  - "homologação ativa: controle autenticado confirmou championships=true somente em demo-campo; rota administrativa e campeonato público publicado sem 404"
  - "projeção pública pós-ativação: dois participantes, um confronto, classificação visível, canonical próprio e robots noindex/nofollow/nocache"
  - "correção visual de /c: 2 arquivos/12 testes focados, TypeScript, ESLint e build Webpack aprovados"
  - "contrato de branding: nome, escudo e capa somente para time já público; indisponibilidade preserva a página esportiva"
  - "sincronização #203: 3 arquivos/15 testes focados, ESLint, TypeScript, 76 arquivos/432 testes Vitest e build Webpack aprovados"
blocker: "A sincronização está validada localmente e aguarda integração em dev; a sonda agregada pós-ativação continua dependente do executor operacional protegido."
next_action: "Publicar e integrar a sincronização em dev; confirmar que o PR #203 fica mergeable sem perder o branding nem o smoke ativo."
---

# Trabalho atual

WP-R09-05 concluiu o gate técnico CP3. A sonda agregada e sem PII verifica flags,
projeção e reconstrução; concorrência real cobre geração e publicação; smoke,
telemetria, limiares e rollback estão documentados no runbook.

O controle operacional exige confirmação e só aparece para o único `team_id`
configurado. O ciclo sintético mobile ativou a coorte, observou a sonda, preservou
a agenda e retornou ao fallback; a flag terminou desligada e nenhuma organização
real foi ativada.

Na passagem por CP4, os cenários sintéticos de pontos corridos e mata-mata
foram revisados em Android e iPhone, incluindo leitor de tela, compartilhamento
real e navegador interno do WhatsApp. A preparação corrigiu a credencial mínima
do seed, restringiu CSP e origem de dev ao host privado configurado e adicionou
UUID v4 compatível com origem HTTP.

A flag sintética foi desligada pela RPC auditada; a sonda comprovou as duas
projeções em fallback com fatos preservados. Depois da evidência, os cenários
locais foram removidos e o seed neutro foi reconstruído. A próxima ação é CP5 em
uma única organização demo, com deploy, smoke, observação e rollback completos.

A execução de CP5 abriu a branch `codex/r09-cp5-pilot` e a publicou no remoto.
A leitura remota confirmou que `main` permanece sete commits atrás de `dev` e
que o banco de produção ainda não possui a RPC agregada de saúde da R09: a
pré-sonda falhou fechada com HTTP 404 antes de qualquer ativação ou dado novo.
O PR #197 da única correção posterior a `dev` foi criado. Seus oito checks
aplicáveis passaram, dois foram ignorados conforme condição do workflow e não
há conflito. O deployment de Preview ficou `Ready`, mas o smoke real da raiz
respondeu 500 porque `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` estão restritas a Production no Vercel;
os logs confirmaram configuração ausente, não regressão do artefato. Nenhuma
variável foi copiada para Preview. O responsável autorizou o merge e o PR #197
foi integrado por squash em `dev` no commit `651bc73`; `main` permanece oito
commits atrás, sem alteração de banco, aplicação ou flag em produção. A
comparação `dev -> main` está pronta para criação do PR de promoção.

O responsável autorizou a criação da promoção. O PR #198 abriu `dev -> main`
com os oito commits da R09 e 68 arquivos. Seus oito checks aplicáveis passaram,
dois foram ignorados conforme condição do workflow, o gate de banco concluiu em
2m30s e não há conflitos. O deployment de Preview está `Ready`; `main`, banco e
aplicação de produção continuam inalterados até autorização separada de merge.

O responsável autorizou a promoção e o PR #198 foi integrado por squash em
`main` no commit `764d175`. A expansão de banco aplicou e verificou todas as
migrations em 33s; o deployment Vercel de Production ficou `Ready` em 55s e o
smoke automático #1091 passou em 21s. A pré-sonda agregada confirmou
`championships=false`, página pública de eventos ativa, zero campeonatos,
projeções, fallback, participantes, confrontos, comandos e divergências. A
coorte candidata foi confirmada como `demo-campo`, com um owner ativo, sem
versionar UUID ou operador. A próxima alteração externa é configurar somente o
UUID da coorte como variável server-only de Production e redeployar o mesmo
commit; nenhuma flag foi ativada.

O responsável confirmou essa configuração. `CHAMPIONSHIP_PILOT_TEAM_ID` foi
salva como variável sensível somente em Production, sem expor ou versionar seu
valor. O mesmo commit `764d175` foi redeployado sem cache e ficou `Ready` em
1m23s no deployment `DDjXZKB6oQDDvL68YvtNTueaR2Au`. Como o redeploy manual não
emitiu novo evento automático para o GitHub, o smoke somente de leitura foi
despachado manualmente e passou em 18s no run `31738436084`. A pré-sonda
pós-redeploy confirmou `championships=false`, página pública de eventos ativa e
zero campeonatos, candidatos, projeções, fallback, participantes, confrontos,
comandos e divergências. A configuração está aplicada, mas a flag continua
desligada; a próxima escrita externa exige confirmação separada para ativar o
piloto na única organização demo.

O responsável confirmou a ativação temporária. A pré-sonda imediatamente
anterior permaneceu verde e a escrita auditada ligou `championships` somente na
coorte demo às 17:13 BRT. Um campeonato sintético de pontos corridos foi criado
com duas equipes internas, um confronto e página pública; a sonda ativa exigiu
e confirmou projeção completa 1/1, dois participantes, um confronto, zero
fallback e zero divergências. O smoke ativo passou em 15s no run `31740181134`.
Os logs permitidos registraram apenas `enabled=true` e a projeção agregada, com
duas leituras abaixo de 310ms, `fallback=false` e `error=none`.

Uma partida sintética existente foi vinculada e concluída pela jornada normal.
A sonda confirmou um vínculo, classificação reconstruível e zero divergências.
No retorno da publicação do formato, a interface mostrou uma única página 404
transitória no mesmo detalhe administrativo; o primeiro reload recuperou o
estado publicado e todas as verificações posteriores passaram. A ocorrência
ficou abaixo do limiar operacional, mas deve ser corrigida antes de CP6.

O rollback auditado desligou a flag às 17:25 BRT e registrou somente
`enabled=false`. A sonda confirmou projeção 0/1, um campeonato, dois
participantes, um confronto e o vínculo preservados no fallback, sem divergência.
O smoke pós-rollback exigiu 404 na mesma página pública e passou em 12s no run
`31740889363`. Agenda, partida e súmula continuaram utilizáveis, enquanto os
atalhos de campeonato desapareceram. CP5 está concluído e a flag terminou
desligada; a próxima ação é endurecer a transição administrativa antes de CP6.

A investigação do 404 localizou o ponto de falha no gate server-side. A leitura
de feature usa timeout fail-closed de 750ms; o re-render concorrente que o
Next.js inclui na resposta da Server Action podia receber uma única leitura
negativa transitória, fazer `getChampionshipWorkspace` retornar `null` e
converter o estado existente em 404. A correção específica de campeonatos exige
duas leituras negativas consecutivas para desligar a rota; uma segunda leitura
positiva recupera a navegação e emite somente
`championship_feature_lookup.recovered`, sem identificador.

O teste de regressão cobre primeira leitura positiva, negativa transitória
seguida de recuperação e duas negativas mantendo fail-closed. Os dois arquivos
focados aprovaram 17 testes e o gate completo aprovou lint, TypeScript, 76
arquivos e 429 testes Vitest, build de produção Webpack e auditoria com zero
vulnerabilidades. O build Turbopack foi bloqueado apenas pela tentativa do
processador de CSS de abrir uma porta proibida no executor. A sonda de produção
confirmou que a flag continua desligada, com projeção 0/1, fallback 1/1 e zero
divergências enquanto o artefato corretivo ainda não foi promovido.

A correção foi reaplicada sobre uma branch limpa baseada em `dev` no commit
`b3aa767` e publicada no PR #199. O Vercel Preview ficou `Ready`; qualidade,
banco, CodeQL, revisão de dependências e Terraform passaram, com banco em 2m54s
e qualidade em 1m23s. Os jobs de smoke e Supabase Preview foram ignorados pelas
condições dos workflows. O PR está pronto para integração em `dev`, mas merge,
promoção a `main` e nova ativação controlada continuam como ações separadas.

Após confirmação do responsável, o PR #199 foi integrado por squash em `dev`
no commit `4cea6bb`. A correção agora compõe a linha de integração, enquanto
`main`, o deployment de produção e a flag `championships` permanecem
inalterados. A próxima ação é promover `dev` para `main` com autorização
separada; a reativação controlada continua posterior ao deployment e exige nova
confirmação.

O PR #200 abriu a promoção de `dev` para `main`. Como a promoção anterior havia
sido integrada por squash, as branches não compartilhavam a ancestralidade
recente e o GitHub marcou o primeiro estado como conflitante. O merge
`f368757` sincronizou `main` em `dev` sem alterar uma única linha de conteúdo;
o PR então ficou `MERGEABLE/CLEAN`, restrito aos dois arquivos da correção e aos
dois documentos de evidência. Qualidade, banco, CodeQL, dependências, Terraform
e Vercel Preview passaram; smoke e Supabase Preview foram ignorados conforme as
condições dos workflows. O merge em `main` aguarda confirmação separada e a
flag continua desligada.

Após confirmação, o PR #200 foi integrado por squash em `main` no commit
`f24a0f9`. O deployment Vercel concluiu com sucesso; CI, CodeQL, banco e
Terraform passaram, com o banco em 2m29s. O smoke automático `31743568341`
executou o mesmo commit, exigiu `EXPECT_CHAMPIONSHIP_ENABLED=false` e concluiu
em cerca de 13s incluindo evento e campeonato públicos. Assim, a rota pública
permanece em fallback e nenhuma ativação ocorreu.

A pré-sonda agregada local falhou fechada antes da consulta porque
`CHAMPIONSHIP_PILOT_TEAM_ID` não está no cofre local. A tentativa segura de
injeção efêmera confirmou que variáveis sensíveis não são entregues pelo CLI do
Vercel; nenhum valor foi exibido ou salvo, e o diretório temporário foi removido.
A próxima execução deve ocorrer no contexto operacional protegido que possui a
coorte, antes de qualquer autorização de ativação.

O responsável declarou Production como ambiente de homologação e autorizou
habilitar tudo que fosse possível. Pela jornada autenticada e auditada de
owner/admin, `championships` foi reativada somente em `demo-campo`; página
pública do time, cartão evolutivo, equipes internas e lembretes já estavam
ativos e foram preservados. A navegação administrativa passou a exibir
Campeonatos e abriu o campeonato publicado sem 404. A projeção pública mostrou
dois participantes, um confronto aguardando resultado, classificação e
regulamento, com canonical próprio e `noindex, nofollow, nocache`.

Os kill switches globais `integration_produce` e `integration_consume`
permanecem desligados para evitar efeitos externos automáticos durante a
homologação. Nenhuma outra organização foi alterada. A sonda agregada
pós-ativação não pôde ser executada porque o executor protegido atingiu seu
limite de uso; nenhum segredo ou identificador foi persistido. Até essa sonda,
a interface autenticada e a projeção pública são as evidências pós-ativação, e
o rollback auditado continua disponível no mesmo controle operacional.

O responsável identificou que o cabeçalho de `/c` não seguia o padrão da
página pública do time: faltavam capa e escudo do organizador, e a faixa
superior podia perder a composição horizontal em telas estreitas. A correção
mantém a projeção esportiva intacta e adiciona uma consulta server-side
fail-closed: somente um campeonato publicado de um time que já possui página
pública recebe nome, slug, escudo e capa. Os caminhos privados de mídia nunca
chegam ao HTML; somente URLs assinadas de curta duração são usadas. Se a
identidade ou a mídia falhar, o campeonato continua disponível com o fallback
visual anterior.

O novo hero replica a linguagem de `/t`: capa ou gradiente, marca no topo,
status sem quebra de linha, escudo, selo `Página oficial`, nome do time e link
para seu perfil público. O logo compacto no celular preserva a faixa superior
em uma linha. Passaram 2 arquivos e 12 testes focados, TypeScript, ESLint e o
build de produção Webpack. O build Turbopack permaneceu bloqueado apenas pela
tentativa conhecida do processador CSS de abrir uma porta proibida no executor.
A rota local compilou, mas não alcançou o Supabase remoto; a conferência visual
com dados reais deve ocorrer no Preview antes da promoção.

O PR #202 integrou a correção visual em `dev` no commit `ed6cd09`, enquanto o
PR #201 havia atualizado o smoke diretamente em `main` no commit `122e843`.
Essas linhas divergentes deixaram o PR #203 (`dev -> main`) conflitante. A
sincronização usa `origin/dev` como base e incorpora `origin/main`, preservando
o branding público da competição, a recuperação do 404, o smoke com expectativa
ativa por padrão e as instruções de rollback. A resolução também remove
marcadores de conflito literais que entraram nos documentos pelo PR #202.
O gate aprovou 3 arquivos/15 testes focados, ESLint, TypeScript, 76 arquivos/432
testes Vitest e build de produção Webpack. O build Turbopack falhou somente pela
tentativa conhecida do processador CSS de abrir uma porta proibida no executor.
