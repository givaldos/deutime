---
release: R07
work_package: WP-R07-05
scope: reusable_squads_auto_split_touch_ux
branch_or_commit: "1562bc0"
checkpoint: CP5
status: idle
completed_ac:
  - AC-R07-01
  - AC-R07-02
  - AC-R07-03
  - AC-R07-05
  - AC-R07-06
  - AC-R07-07
  - AC-R07-08
  - AC-R07-09
  - AC-R07-11
  - AC-R07-12
dirty_files: []
tests:
  - "algoritmo, interface e Action focados: 3 arquivos, 15 testes verdes"
  - "Vitest completo: 55 arquivos, 316 testes verdes"
  - "db:reset, db:types e db:test: verdes; 41 arquivos, 998 testes pgTAP"
  - "ensaio mobile 390x844: 14x14, mover, retirar/recolocar, salvar e recarregar"
  - "db:lint: verde; somente avisos legados em create_event_as_staff e record_match_event"
  - "ESLint, TypeScript e next build --webpack: verdes"
  - "npm audit --audit-level=moderate: 0 vulnerabilidades"
  - "PR #160 e merge 1562bc0: todos os checks verdes"
  - "Deploy database 31518690923 e Smoke 31518742849: verdes"
  - "smoke manual somente leitura em https://deutime.app: verde"
blocker: null
next_action: "Repetir a jornada automática por toque em Android/iPhone na coorte demo e concluir AC-R07-04/10."
---

# Trabalho atual

O pacote consolidado está em produção. O `select`
individual permanece recolhido como fallback acessível; o caminho primário é a
sugestão automática ajustável por cartões de toque.

Owner/admin salva times padrão de nome/cor/ordem. Evento novo copia o modelo,
cria IDs próprios e distribui confirmados de modo reproduzível, priorizando a
separação de goleiros e diferença máxima de uma pessoa. Nada persiste antes do
salvar explícito.

A próxima ação é validar a interface nova em Android/iPhone na coorte demo. A
expansão, o consumidor, os checks, o deploy de banco e o smoke já estão verdes;
`main` e `dev` permanecem sincronizadas no merge `1562bc0`.
