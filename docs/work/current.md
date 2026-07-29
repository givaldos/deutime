---
release: R02
work_package: WP-R02-02
scope: capability_access_path
branch_or_commit: "codex/r02-capability-access-path"
checkpoint: idle
status: completed
completed_ac: []
dirty_files: []
tests:
  - "npm run db:reset — 30 migrations e seed aplicados do zero"
  - "npm run db:test — 19 arquivos e 440 testes aprovados"
  - "019_verified_event_access — 14 cenários positivos, negativos, revogação, expiração e cross-tenant"
  - "npm run db:lint — sem aviso novo; dois avisos preexistentes em create_event_as_staff"
  - "npm run db:types e npm run migrations:check -- 8937255 aprovados"
  - "npm run verify — lint, typecheck, 19 arquivos/118 testes Vitest e build aprovados"
  - "npm run security:audit — zero vulnerabilidades"
  - "HTTP local — público 200, troca 204, reconhecido 200, cross-origin 403 e GET da troca 405"
blocker: null
next_action: "Executar o CP3 de WP-R02-02: robustez contra abuso e concorrência, privacidade, cancelamento e recuperação operacional, mantendo RSVP e todos os gates desligados."
---

# Trabalho atual

O CP2 de `WP-R02-02` implementou o caminho fino de acesso personalizado. O
fragmento é removido antes da troca same-origin, o endpoint instala cookie opaco
e restrito ao evento, e o DAL server-side resolve capability ou sessão Supabase
verificada sem expor IDs internos.

A migration forward-only `202607290003_verified_event_access.sql` completou o
caminho da sessão verificada com inventário, `auth.sessions`, tombstone, prazos,
vínculo, chamada e gates recalculados. A página reconhecida continua somente
leitura e não oferece RSVP.

Nenhum controle ou flag foi ativado e não houve mutação remota. O CP3 deve
endurecer abuso, concorrência, privacidade, cancelamento e recuperação; a matriz
real de navegadores e aparelhos permanece no CP4.
