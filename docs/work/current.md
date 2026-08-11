---
release: R07
work_package: WP-R07-01
scope: manual_team_division_contract
branch_or_commit: "dev"
checkpoint: CP0
status: idle
completed_ac: []
dirty_files: []
tests:
  - "CP0 documental: baseline, decisões, contratos, entrypoints, riscos, rollout e dez critérios conferidos sobre d750647"
blocker: null
next_action: "Implementar WP-R07-01: expansão inerte e forward-only de consentimento, rascunho, exclusão, revisão publicada e RPCs transacionais, com pgTAP e team_division desligada."
---

# Trabalho atual

R07 foi promovida e está pronta em CP0. A base já possui `event_squads`,
`lineup_spots`, `match_sides.squad_id` e a flag `team_division`, mas não possui
comandos transacionais, exclusão explícita, revisão publicada ou projeção
pública consentida.

O contrato mantém RSVP, escalação planejada e participação real como fontes
separadas. Manager poderá editar o rascunho; somente owner/admin publicará ou
retirará uma revisão. Identidade pública exige `public_sports_activity`, e a
mesma URL do evento continua canônica. Lista de confirmados e cópia do link são
o fallback quando flag, publicação ou imagem estiverem indisponíveis.

A próxima ação é `WP-R07-01`: criar migration forward-only com consentimento
`public_sports_activity`, expansão inerte, RLS, grants mínimos, RPCs
idempotentes e pgTAP positivo, negativo, concorrente e cross-tenant. A flag
permanece desligada e nenhuma superfície pública nasce ativa.
