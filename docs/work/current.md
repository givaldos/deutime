---
release: R06
work_package: WP-R06-03
scope: match_conversation_moderation_retention
branch_or_commit: "dev"
checkpoint: CP2
status: idle
completed_ac:
  - "AC-R06-01"
  - "AC-R06-02"
  - "AC-R06-03"
  - "AC-R06-04"
  - "AC-R06-05"
  - "AC-R06-06"
  - "AC-R06-07"
  - "AC-R06-10"
dirty_files: []
tests:
  - "npm run migrations:check -- origin/main HEAD: passou"
  - "npm run db:reset: passou"
  - "npm run db:lint: passou; somente 2 avisos preexistentes"
  - "npm run db:test: 33 arquivos, 772 testes passaram"
  - "pgTAP 033 focal: 52 testes passaram"
  - "testes focados: 4 arquivos, 29 testes passaram"
  - "npm run verify: lint, typecheck, 254 testes e build passaram"
  - "npm run security:audit: 0 vulnerabilidades"
  - "viewport 390x844: comentário, resposta, remoção e fallback passaram no navegador local"
blocker: null
next_action: "Implementar moderação staff com ocultar/restaurar, retenção transacional de dois anos e runbook operacional; manter comments desligada."
---

# Trabalho atual

A conversa mobile de R06 está implementada em `/me/agenda/[eventId]`, logo após
o placar. O DAL falha fechado, a aplicação tolera a ordem banco N−1/app N e as
Actions delegam autoria e autorização ao contrato transacional. Comentário,
resposta, denúncia e remoção passaram no viewport 390×844; após sete dias a UI
fica somente leitura. Desligar `comments` preserva placar, lances e resumo.

`comments` continua desligada e nenhuma partida antiga recebe backfill. O
próximo pacote implementa ocultação/restauração por staff, limpeza transacional
após dois anos e runbook; depois disso a jornada precisa de validação física em
iPhone e Android antes de qualquer piloto.
