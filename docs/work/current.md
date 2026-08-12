---
release: R08M
work_package: WP-R08M-01
scope: event_share_state
branch_or_commit: "dev"
checkpoint: CP0
status: ready
completed_ac: []
dirty_files: []
tests:
  - "npm run context:brief: R08M reconhecida em CP0 ready, com IDs e próxima ação consistentes"
  - "baseline d00db82: metadata mínima, escudo/fallback e imagem de escalação localizados"
  - "Vitest focado: 2 arquivos e 18 testes aprovados para página pública e convite.png"
  - "git diff --check e referências documentais: aprovados"
blocker: null
next_action: "Implementar WP-R08M-01 com a flag event_share_card, projeção pública mínima e pgTAP positivo, negativo, consentimento, empate e cross-tenant."
---

# Trabalho atual

R08M foi promovida para fechar a identidade compartilhável e o gate integrado
do MVP. O pacote parte do escudo, metadata mínima e escalação pública já
entregues, sem reabrir R07.

`DEC-EVENT-SHARE-PHASE` fixa uma projeção anônima única para metadata, HTML e
imagem, com precedência determinística, privacidade, cache, flag e rollback.
O CP0 está pronto e sem bloqueio. A próxima ação concreta é a expansão inerte
de banco de `WP-R08M-01`; nenhum time deve ser ativado durante esse pacote.
