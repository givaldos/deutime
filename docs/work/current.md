---
release: R06
work_package: WP-R06-03
scope: match_conversation_moderation_retention
branch_or_commit: "dev"
checkpoint: CP3
status: idle
completed_ac:
  - "AC-R06-01"
  - "AC-R06-02"
  - "AC-R06-03"
  - "AC-R06-04"
  - "AC-R06-05"
  - "AC-R06-06"
  - "AC-R06-07"
  - "AC-R06-08"
  - "AC-R06-09"
  - "AC-R06-10"
dirty_files:
  - "docs/roadmap.md (alteração preexistente do usuário; fora do pacote)"
tests:
  - "npm run migrations:check -- origin/main HEAD: passou"
  - "npm run db:reset: passou"
  - "npm run db:lint: passou; somente 2 avisos preexistentes"
  - "npm run db:test: 34 arquivos, 802 testes passaram"
  - "pgTAP 034 focal: 30 testes passaram"
  - "testes focados: 5 arquivos, 23 testes passaram"
  - "npm run verify: lint, typecheck, 267 testes e build passaram"
  - "npm run security:audit: 0 vulnerabilidades"
  - "viewport 390x844: moderação sem overflow; ocultação, restauração e estado vazio passaram sem erro no console"
blocker: null
next_action: "Executar CP4 físico em iPhone e Android com dados demo; manter comments desligada em produção."
---

# Trabalho atual

A conversa privada e a moderação staff de R06 estão implementadas. O painel da
súmula lista somente denúncias abertas e conteúdo ocultado, exige motivo para
ocultar/restaurar e não projeta identidade do denunciante. O cron diário
existente executa a limpeza transacional depois de dois anos e devolve apenas
contadores; app e banco toleram as duas ordens de deploy.

`comments` continua desligada em produção e nenhuma partida antiga recebe
backfill. O próximo passo é CP4 físico em iPhone e Android com time e pessoas
demo, cobrindo a jornada do atleta e a decisão staff antes de qualquer piloto.
