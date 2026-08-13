---
release: R09
work_package: WP-R09-05
scope: championship_robustness_and_pilot
branch_or_commit: "codex/r09-cp6-publication-retry"
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
blocker: "Aguardando confirmação do responsável para integrar o PR #199 em dev; a promoção a main e a reativação controlada permanecem separadas."
next_action: "Integrar o PR #199 em dev após confirmação, preparar a promoção do mesmo artefato e repetir a transição controlada sem 404, com rollback final desligado."
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
