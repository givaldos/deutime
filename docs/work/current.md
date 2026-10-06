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
  - "PARCIAL: navegador local a 360 e 1280 px, sem rolagem horizontal"
  - "BLOQUEADO: build Turbopack local sem acesso ao Google Fonts"
  - "FALHA: security:audit em braces@3.0.3, sem versão corrigida no aviso"
blocker: "Perda real de rede e validação em aparelhos, CI e auditoria de dependências pendentes."
next_action: "Validar interrupção de rede, fluxo móvel completo e leitor de tela em Android e iPhone; resolver o gate de auditoria antes do PR de integração."
---

# Trabalho atual

`BAT-04` tem implementação local na branch `codex/bat-04`. A consulta de
resultado por `request_id` e a retomada após perda da resposta foram adicionadas
para jogos e atletas. O teste com 50 jogos, a concorrência com duas sessões e
a recuperação da resposta interrompida no navegador local passaram. A lista
de atletas agora conserva a consulta do pedido mesmo quando fica vazia. A flag
global `batch_operations` permanece desligada, e as operações individuais
continuam disponíveis.

O [pacote WP-R16-06](../releases/work-packages/WP-R16-06-operacoes-em-lote.md)
registra as evidências e as validações pendentes. CP4 ainda não foi aceito.
