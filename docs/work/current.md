---
release: R15
work_package: WP-R15-01
scope: campeonato_guiado_com_agenda_e_convocados
branch_or_commit: "codex/campeonato-assistente"
checkpoint: idle
status: ready_for_merge
completed_ac:
  - "causa confirmada: publicação atual não cria eventos nem partidas"
  - "contrato de cinco passos e finalização atômica fechado"
  - "assistente mobile implementado sem linguagem de rascunho"
  - "finalização cria agenda, partidas, lados e convocados na mesma transação"
dirty_files: []
tests:
  - "PASS: 127 arquivos e 611 testes de aplicação"
  - "PASS: lint, TypeScript, contexto, migrations e build Webpack"
  - "PASS: auditoria npm sem vulnerabilidades"
  - "PASS: Database no CI, 71 arquivos e 1.862 testes pgTAP"
  - "PASS: CI, CodeQL, Dependency review, Terraform e preview Vercel no PR #403"
blocker: null
next_action: "Mesclar o PR #403 em dev, promover dev para main e executar o smoke produtivo."
---

# Trabalho atual

A R15 corrige a lacuna entre publicar a grade e organizar jogos reais. O fluxo
guiado termina somente quando agenda, partidas, lados e convocados estão criados;
estado técnico continua preservado no domínio, mas deixa de aparecer ao usuário.
