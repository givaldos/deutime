---
release: R16
work_package: WP-R16-06
scope: operacoes_em_lote
branch_or_commit: "99290da"
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
  - "PASS: PR #549 em dev; PR #550 em main; PR #551 reconciliou main em dev"
  - "PASS: CI, Database, CodeQL e Terraform em dev e main; deploy Supabase e smoke público sem escrita em main"
  - "DISPENSADO em 6/10: TalkBack e teclado físico no Android, e jornada no iPhone; revisão futura, sem teste executado"
  - "DISPENSADO em 6/10: navegador interno do WhatsApp; revisão futura, sem teste executado"
  - "PARCIAL: navegador local a 360 e 1280 px, sem rolagem horizontal"
  - "PASS: npm audit --omit=dev --audit-level=moderate sem vulnerabilidades"
  - "BLOQUEADO: build Turbopack local sem permissão para criar processo ou abrir porta no sandbox"
  - "FALHA: security:audit em braces@3.0.3, sem versão corrigida no aviso"
blocker: "CP4 e liberação global dependem da revisão futura em Android, iPhone e navegador interno do WhatsApp; security:audit continua falhando em braces."
next_action: "Manter batch_operations desligada. Revisar Android, iPhone e navegador interno do WhatsApp antes da liberação global e corrigir braces quando houver versão segura."
---

# Trabalho atual

`BAT-04` foi integrada em `dev` e `main` com a flag global desligada. A consulta de
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
aguardar a correção de `braces` antes de integrar a branch. Em nova instrução de
6 de outubro, solicitou promover a BAT-04 para `dev` e `main`. Esta decisão
substitui a espera: a auditoria completa continua falhando na dependência de
desenvolvimento `braces@3.0.3`, sem versão corrigida no aviso. A auditoria das
dependências de produção não apontou vulnerabilidades. A exceção vale apenas
para esta promoção; a correção de `braces` permanece pendente.

O [pacote WP-R16-06](../releases/work-packages/WP-R16-06-operacoes-em-lote.md)
registra as evidências e as validações pendentes. Os PRs #549, #550 e #551
concluíram a promoção e a reconciliação; CI, Database, CodeQL, Terraform,
deploy do banco e smoke público sem escrita passaram. CP4 ainda não foi aceito.
