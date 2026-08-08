---
release: R06
work_package: WP-R06-02
scope: match_conversation_mobile
branch_or_commit: "dev"
checkpoint: CP1
status: idle
completed_ac:
  - "AC-R06-01"
  - "AC-R06-02"
  - "AC-R06-03"
  - "AC-R06-04"
  - "AC-R06-05"
dirty_files: []
tests:
  - "npm run migrations:check -- origin/main HEAD: passou"
  - "npm run db:reset: passou"
  - "npm run db:lint: passou; somente 2 avisos preexistentes"
  - "npm run db:test: 33 arquivos, 764 testes passaram"
  - "pgTAP 033 focal: 44 testes passaram"
  - "npm run verify: lint, typecheck, 230 testes e build passaram"
  - "npm run security:audit: 0 vulnerabilidades"
blocker: null
next_action: "Implementar DAL, Server Actions e conversa mobile na agenda do usuário, atrás de comments e com fallback para a súmula atual."
---

# Trabalho atual

O contrato privado de R06 está concluído. A migration `202608080005` congela
SIM/TALVEZ na finalização, mantém comentários e denúncias sem grants diretos e
expõe somente RPCs que recalculam identidade, vínculo, flag e tenant. Replay é
idempotente e serializado; resposta possui um nível; links/HTML e abuso são
bloqueados; remoção preserva respostas e não projeta o texto oculto.

O banco continua inerte porque `comments` permanece desligada, não há backfill e
nenhuma tela consome as RPCs. O próximo pacote adiciona a experiência mobile em
`/me/agenda/[eventId]`, com fallback silencioso para a súmula atual. Moderação e
retenção de dois anos permanecem reservadas para `WP-R06-03`.
