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
  - "DISPENSADO: teste em iPhone físico por decisão do responsável em 6/10; não executado"
  - "PARCIAL: navegador local a 360 e 1280 px, sem rolagem horizontal"
  - "PASS: npm audit --omit=dev --audit-level=moderate sem vulnerabilidades"
  - "BLOQUEADO: build Turbopack local sem permissão para criar processo ou abrir porta no sandbox"
  - "FALHA: security:audit em braces@3.0.3, sem versão corrigida no aviso"
blocker: "Leitor de tela e teclado em aparelho, navegador interno do WhatsApp, CI e auditoria de dependências pendentes."
next_action: "Com Android disponível, validar BAT-04 com leitor de tela e teclado físico; concluir o navegador interno do WhatsApp e resolver a auditoria antes do PR de integração."
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

O responsável dispensou o teste em iPhone físico em 6 de outubro. O teste não
foi executado e não compõe a evidência de aprovação de CP4.

O [pacote WP-R16-06](../releases/work-packages/WP-R16-06-operacoes-em-lote.md)
registra as evidências e as validações pendentes. CP4 ainda não foi aceito.
