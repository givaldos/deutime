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
  - "PARCIAL: navegador local a 360 e 1280 px, sem rolagem horizontal"
  - "PASS: npm audit --omit=dev --audit-level=moderate sem vulnerabilidades"
  - "BLOQUEADO: build Turbopack local sem permissão para criar processo ou abrir porta no sandbox"
  - "FALHA: security:audit em braces@3.0.3, sem versão corrigida no aviso"
blocker: "iPhone, leitor de tela e teclado em aparelhos, navegador interno do WhatsApp, CI e auditoria de dependências pendentes."
next_action: "Com aparelhos disponíveis, validar BAT-04 no iPhone e com leitores de tela e teclado físicos; concluir o navegador interno do WhatsApp e resolver a auditoria antes do PR de integração."
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

O [pacote WP-R16-06](../releases/work-packages/WP-R16-06-operacoes-em-lote.md)
registra as evidências e as validações pendentes. CP4 ainda não foi aceito.
