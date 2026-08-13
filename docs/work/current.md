---
release: R09
work_package: WP-R09-01
scope: championship_contract
branch_or_commit: "dev"
checkpoint: CP0
status: ready
completed_ac: []
dirty_files: []
tests:
  - "npm run context:brief: R09 reconhecida em CP0 ready, com IDs e próxima ação consistentes"
  - "baseline b4b8e1c: partidas explícitas, equipes internas persistentes e projeção pública localizadas"
  - "Vitest focado da base de partidas/divisão: 2 arquivos e 32 testes aprovados"
  - "git diff --check e referências documentais: aprovados"
blocker: null
next_action: "Implementar WP-R09-01 com expansão inerte da flag championships, tabelas, RLS, grants e RPCs, sem consumidor nem ativação de time."
---

# Trabalho atual

R09 foi selecionada como a primeira vertical pós-MVP porque transforma partidas
já comprovadas em uma competição contínua sem reabrir R04 ou R07. R10 permanece
no horizonte e será reavaliada com os dados do piloto da R09.

`DEC-CHAMPIONSHIP-MODEL` fecha participantes internos e externos, limites, três
formatos, pontuação, desempate, geração, empate eliminatório, correções,
autorização e página pública mínima. O CP0 está pronto e sem bloqueio.

A próxima ação concreta é a expansão inerte de `WP-R09-01`. A flag
`championships` nasce desligada; nenhum consumidor, time piloto ou efeito
externo deve ser ativado nesse pacote.
