---
release: R02
work_package: WP-R02-02
scope: capability_pilot_readiness
branch_or_commit: "codex/r02-pilot-readiness"
checkpoint: idle
status: awaiting_manual_validation
completed_ac: []
dirty_files: []
tests:
  - "npm run verify — lint, typecheck, 21 arquivos/124 testes Vitest e build aprovados"
  - "npm run security:audit — zero vulnerabilidades"
  - "APP_URL=https://deutime.app SMOKE_PUBLIC_EVENT_ID=<UUID_DEMO> npm run smoke:production — página pública e endpoint somente leitura aprovados"
blocker: "Falta executar a matriz em aparelhos físicos Android e iPhone no navegador real do WhatsApp."
next_action: "Abrir o link público pelo WhatsApp em Android e iPhone; confirmar layout, retorno, cópia/compartilhamento e remoção do fragmento. Só depois escolher explicitamente a coorte do piloto, mantendo RSVP e gates desligados até essa decisão."
---

# Trabalho atual

O CP5 foi preparado sem antecipar a ativação: o workflow de produção agora usa
o UUID público de um evento de demonstração para verificar página, política de
cache/referência/indexação e a rejeição de `GET` no endpoint de troca. O smoke
real passou e nenhuma chave privilegiada ou escrita foi introduzida.

O checkpoint está ocioso e os gates continuam desligados. CP4 ainda depende da
evidência em aparelhos físicos Android e iPhone no navegador real do WhatsApp;
CP5 depende disso e da escolha explícita da coorte antes de qualquer piloto.
