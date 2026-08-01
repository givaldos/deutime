---
release: R03
work_package: WP-R03-04
scope: whatsapp_single_sandbox_control_timeout
branch_or_commit: "codex/r03-whatsapp-control-timeout"
checkpoint: idle
status: ready_for_review
completed_ac:
  - "AC-R03-01"
  - "AC-R03-02"
  - "AC-R03-03"
  - "AC-R03-04"
  - "AC-R03-05"
  - "AC-R03-07"
  - "AC-R03-08"
dirty_files:
  - "app/api/internal/whatsapp/pilot/route.ts"
  - "app/api/internal/whatsapp/pilot/route.test.ts"
  - "lib/features/delivery/server.ts"
  - "docs/releases/R03-whatsapp-ponta-a-ponta.md"
  - "docs/work/current.md"
tests:
  - "10 testes focados do gate e Route Handler aprovados"
  - "lint e typecheck aprovados"
  - "36 arquivos e 203 testes Vitest aprovados"
  - "build de produção aprovado com acesso às fontes externas"
blocker: null
next_action: "Publicar a correção e repetir uma única vez a prova com o mesmo outbox ainda intacto."
---

# Trabalho atual

O primeiro disparo acompanhado falhou fechado com `409` antes do worker. A
execução Vercel levou 1,41 s, acima do timeout genérico de 750 ms do gate, e o
outbox permaneceu `pending`, com zero tentativas e nenhum efeito externo.

Esta correção amplia somente a espera do executor unitário para 3 s e mantém o
mesmo fallback `false` em erro ou timeout. O consumo global já foi desligado;
nenhum efeito real foi executado. `AC-R03-06` e `AC-R03-09` seguem pendentes.

As alterações locais do usuário em `docs/backlog.md` e `docs/roadmap.md`
permanecem separadas.
