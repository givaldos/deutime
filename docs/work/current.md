---
release: R16
work_package: WP-R16-06
scope: operacoes_em_lote
branch_or_commit: "codex/bat-04"
checkpoint: CP3
status: idle
completed_ac: []
tests:
  - "PASS: db:reset, db:lint e db:test (2.301 testes)"
  - "PASS: lint, typecheck e testes de aplicação"
  - "PASS: build Webpack e migrations:check -- origin/dev"
  - "BLOQUEADO: build Turbopack local sem acesso ao Google Fonts"
  - "FALHA: security:audit em braces@3.0.3, sem versão corrigida no aviso"
blocker: "Validação em aparelhos, concorrência real, CI e auditoria de dependências pendentes."
next_action: "Validar BAT-04 em duas sessões simultâneas e no navegador móvel com perda de rede, teclado e leitor de tela; resolver o gate de auditoria antes do PR de integração."
---

# Trabalho atual

`BAT-04` tem implementação local na branch `codex/bat-04`. A consulta de
resultado por `request_id` e a retomada após perda da resposta foram adicionadas
para jogos e atletas. O teste com 50 jogos passou no banco local. A flag global
`batch_operations` permanece desligada, e as operações individuais continuam
disponíveis.

O [pacote WP-R16-06](../releases/work-packages/WP-R16-06-operacoes-em-lote.md)
registra as evidências e as validações pendentes. CP4 ainda não foi aceito.
