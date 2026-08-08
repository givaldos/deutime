---
release: R05
work_package: WP-R05-01
scope: craque_voting
branch_or_commit: "dev"
checkpoint: CP1
status: active
completed_ac: ["AC-R05-01", "AC-R02-09", "AC-R03-06", "AC-R03-09", "AC-R04-01", "AC-R04-02", "AC-R04-03", "AC-R04-04", "AC-R04-05", "AC-R04-06", "AC-R04-07", "AC-R04-08", "AC-R04-09", "AC-R04-10"]
dirty_files: []
tests:
  - "lint 0"
  - "typecheck 0"
  - "219/219 vitest pass"
  - "migration-integrity origin/dev HEAD OK"
  - "CP4 public-matches via privileged"
  - "R04 piloto prod: event_matches=true, 2 partidas (1 finalized live, 1 scheduled externo), 1 participação + 1 gol"
  - "R05 draft craque_votes (hash+salt, recibo 7d) + 202608080001 cast_craque_vote"
  - "DEC-ANONYMOUS-RETENTION accepted 2026-08-08"
  - "032_craque_voting pgTAP 14 (RLS, grants, RPC, unique)"
  - "lib/features/craque validation+server (craque_voting flag, voter_hash)"
blocker: null
next_action: "commit bloqueado (.git/index.lock sandbox) — push 8 migrations pendente, depois Actions craque + vitest + db:test finais"
---

# Trabalho atual

R02 concluído: AC-R02-09 fechado com retorno D+1 07/08 capability reutilizada sem OTP (Android/iPhone interno+padrão).

R03 concluído: AC-R03-06 template `event_call:v1` + link R02 validado via sender próprio live (idempotência `claimed:0` na 2ª chamada), AC-R03-09 Sandbox→sender próprio aprovado.

R04 concluído: WP-R04-01 CP1-CP5 com 10/10 ACs, 219/219 vitest, piloto prod 2 partidas. Pacote R04 atualizado com evidências CP1-CP5.

R05 ativo: DEC-ANONYMOUS-RETENTION aceita 08/08, WP-R05-01 CP1 (craque_votes hash+salt + recibo 7d, `202608080001` cast_craque_vote). Próximo: push 8 migrations via `deploy-database.yml` (merge dev→main) e CP2 pgTAP 032.
