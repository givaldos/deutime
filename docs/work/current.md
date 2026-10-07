---
release: R16
work_package: WP-R16-06
scope: operacoes_em_lote
branch_or_commit: "codex/bat-04"
checkpoint: CP3
status: idle
completed_ac: []
tests:
  - "PASS: db:reset, db:lint e db:test (2.316 testes)"
  - "PASS: lint, typecheck e 834 testes de aplicação"
  - "PASS: build Webpack e migrations:check -- origin/dev"
  - "PASS: duas sessões de banco para concorrência e replay em jogos e atletas"
  - "PASS: resposta interrompida após gravação; consulta recuperou jogos e atletas"
  - "PASS: Android físico (Samsung SM-A325M, Android 13): jogo e atleta em lote; recuperação após perda da resposta local"
  - "PASS: Tab, Shift+Tab, Escape e devolução de foco nos diálogos de jogos e atletas no navegador local"
  - "PASS: rótulo acessível dos jogos anuncia título e horário uma vez; cartão continua selecionável"
  - "PASS: sharp 0.35.5 e source-map-js 1.2.2; lint, typecheck, 834 testes e build Webpack"
  - "PASS: branch BAT-04 sincronizada com origin/dev; lint, typecheck, 838 testes, contexto, controlador e build Webpack"
  - "DISPENSADO em 6/10: TalkBack e teclado físico no Android, e jornada no iPhone; revisão futura, sem teste executado"
  - "DISPENSADO em 6/10: navegador interno do WhatsApp; revisão futura, sem teste executado"
  - "PARCIAL: navegador local a 360 e 1280 px, sem rolagem horizontal"
  - "PASS: npm audit --omit=dev --audit-level=moderate sem vulnerabilidades"
  - "BLOQUEADO: build Turbopack local sem permissão para criar processo ou abrir porta no sandbox"
  - "FALHA: security:audit em braces@3.0.3, sem versão corrigida no aviso"
blocker: "Auditoria de dependências falha em braces; responsável decidiu aguardar correção. CI da integração ainda não executada."
next_action: "Aguardar correção de braces, repetir security:audit e obter CI antes da integração. Revisar Android, iPhone e navegador interno do WhatsApp antes da liberação global."
---

# Trabalho atual

`BAT-04` tem implementação local na branch `codex/bat-04`. A consulta de
resultado por `request_id` e a retomada após perda da resposta foram adicionadas
para jogos e atletas. O teste com 50 jogos, a concorrência com duas sessões e
a recuperação da resposta interrompida no navegador local passaram. Um Android
físico validou jogos, atletas e a recuperação de um jogo após perda da resposta
local. A lista de atletas conserva a consulta do pedido mesmo quando fica vazia.
A navegação por teclado nos dois diálogos passou no navegador local.
A flag global `batch_operations` permanece desligada, e as operações
individuais continuam disponíveis.

Em 6 de outubro, o responsável dispensou a validação física restante no Android
e no iPhone para esta etapa, com revisão futura. TalkBack e teclado físico no
Android e a jornada no iPhone não foram executados nem contam como testes
aprovados.

O responsável também dispensou o teste no navegador interno do WhatsApp nesta
etapa, com revisão futura. O WhatsApp não estava instalado no Android conectado;
esse teste não foi executado nem registrado como aprovado. O responsável decidiu
aguardar a correção de `braces` antes de integrar a branch.

O [pacote WP-R16-06](../releases/work-packages/WP-R16-06-operacoes-em-lote.md)
registra as evidências e as validações pendentes. CP4 ainda não foi aceito.
