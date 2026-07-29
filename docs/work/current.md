---
release: R02
work_package: WP-R02-02
scope: capability_and_persistent_session_contract
branch_or_commit: "codex/r02-capability-session-contract"
checkpoint: idle
status: completed
completed_ac: []
dirty_files: []
tests:
  - "npm run db:reset — 29 migrations e seed aplicados do zero"
  - "npm run db:test — 18 arquivos e 426 testes aprovados"
  - "018_event_capability_contract — 47 cenários positivos, negativos e cross-tenant"
  - "npm run db:lint — sem aviso novo; dois avisos preexistentes em create_event_as_staff"
  - "npm run db:types — tabelas, enum e sete RPCs públicas refletidos"
  - "Lint, typecheck, 16 arquivos/101 testes Vitest e build de produção aprovados"
  - "npm run security:audit — zero vulnerabilidades"
  - "npm run migrations:check -- f1ce627 — somente duas expansões novas"
blocker: null
next_action: "Executar o CP2 de WP-R02-02: implementar bootstrap, POST same-origin, cookie path-scoped, DAL de sessão verificada e leitura autorizada mobile atrás dos gates."
---

# Trabalho atual

O CP1 de `WP-R02-02` publicou localmente uma expansão inerte em duas migrations:
primeiro o valor do controle global, depois credenciais, capabilities, inventário
de sessões verificadas, RLS, RPCs transacionais e revogação automática.

Credenciais e cookies são aleatórios de 256 bits e somente seus hashes chegam ao
banco. A resolução recalcula vínculo, chamada, identidade, fase e gates. Sessões
Supabase existentes entram no inventário apenas quando `auth.uid()`,
`session_id` e `auth.sessions` convergem; tombstones impedem autorregistro após
revogação.

Ainda não existe consumidor HTTP/cookie e nenhuma escrita de presença foi
adicionada. Não houve ativação ou mutação remota; os gates permanecem
desligados. A próxima ação é o CP2 mobile atrás de flag, mantendo RSVP em
`WP-R02-03`.
