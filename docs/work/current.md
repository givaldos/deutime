---
release: R05
work_package: WP-R05-02
scope: mobile_craque_voting_flow
branch_or_commit: "dev"
checkpoint: CP0
status: idle
completed_ac:
  - "AC-R02-09"
  - "AC-R03-06"
  - "AC-R03-09"
  - "AC-R04-01"
  - "AC-R04-02"
  - "AC-R04-03"
  - "AC-R04-04"
  - "AC-R04-05"
  - "AC-R04-06"
  - "AC-R04-07"
  - "AC-R04-08"
  - "AC-R04-09"
  - "AC-R04-10"
  - "AC-R05-01"
  - "AC-R05-02"
  - "AC-R05-03"
  - "AC-R05-04"
  - "AC-R05-05"
  - "AC-R05-08"
dirty_files: []
tests:
  - "migrations:check: somente expansão forward-only"
  - "db:reset: 54 migrations recompostas"
  - "pgTAP focado: 27/27"
  - "pgTAP completo: 32 arquivos, 686 testes"
  - "Vitest: 39 arquivos, 221 testes"
  - "lint, typecheck e build: aprovados"
  - "npm audit: 0 vulnerabilidades"
blocker: null
next_action: "Implementar Action e interface mobile-first de voto/recibo, consumindo somente cast_craque_vote(uuid,uuid), atrás da flag voting desligada."
---

# Trabalho atual

R02, R03 e R04 estão concluídas. O sender próprio do WhatsApp foi validado e o
número oficial normalizado é `+551132300101`.

R05 está ativa. A auditoria encontrou que a assinatura
`cast_craque_vote(uuid,uuid,text,text)` publicada em produção aceitava hashes do
cliente e não interrompia o usuário inelegível. Ainda não existe interface
consumidora e a flag canônica `voting` permanece desligada.

A correção forward-only `202608080002` revoga a assinatura insegura e introduz
uma RPC que deriva eleitor, hash e recibo no banco, exige snapshot SIM/TALVEZ,
candidato participante, flag e janela. A recomposição completa e todos os gates
locais foram aprovados. O próximo pacote é a Action e a interface mobile de
voto/recibo, ainda com `voting` desligada.
