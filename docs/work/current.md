---
release: R02
work_package: WP-R02-02
scope: capability_robustness
branch_or_commit: "codex/r02-capability-robustness"
checkpoint: idle
status: completed
completed_ac: []
dirty_files: []
tests:
  - "npm run db:reset — 31 migrations e seed aplicados do zero"
  - "npm run db:test — 20 arquivos e 456 testes aprovados"
  - "020_event_capability_robustness — 16 cenários; lock, 40 replays, cotas, privacidade, cancelamento e recuperação"
  - "npm run db:lint — sem aviso novo; dois avisos preexistentes em create_event_as_staff"
  - "npm run db:types e npm run migrations:check -- 9426857 aprovados"
  - "npm run verify — lint, typecheck, 19 arquivos/119 testes Vitest e build aprovados"
  - "npm run security:audit — zero vulnerabilidades"
blocker: null
next_action: "Executar o CP4 de WP-R02-02: acessibilidade, Android, iPhone, navegador interno e compartilhamento real pelo WhatsApp, mantendo RSVP e gates desligados."
---

# Trabalho atual

O CP3 de `WP-R02-02` endureceu o caminho personalizado sem mudar seu escopo. O
endpoint limita corpo por bytes, exige JSON exato, rejeita campos extras e
responde com headers fechados para cache, origem, frame e conteúdo.

A migration forward-only `202607290004_event_capability_robustness.sql` limita
cada credencial a oito capabilities ativas e 32 registros recentes. Replays
continuam isolados e serializados; overflow é revogado e histórico antigo só é
podado depois de revogação ou expiração.

Cancelamento, kill switch e recuperação no mesmo escopo foram provados sem
expor segredos ou habilitar RSVP. Nenhum gate foi ativado. O CP4 deve validar a
experiência real em Android, iPhone, acessibilidade e navegador do WhatsApp.
