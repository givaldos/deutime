---
release: R15
work_package: WP-R15-01
scope: campeonato_guiado_com_agenda_e_convocados
branch_or_commit: "codex/campeonato-assistente"
checkpoint: CP2
status: active
completed_ac:
  - "causa confirmada: publicação atual não cria eventos nem partidas"
  - "contrato de cinco passos e finalização atômica fechado"
  - "assistente mobile implementado sem linguagem de rascunho"
  - "finalização cria agenda, partidas, lados e convocados na mesma transação"
dirty_files:
  - "docs/decisions/DEC-CHAMPIONSHIP-GUIDED-SETUP.md"
  - "docs/releases/R15-campeonato-guiado.md"
  - "docs/work/current.md"
tests:
  - "PASS: 127 arquivos e 611 testes de aplicação"
  - "PASS: lint, TypeScript, contexto, migrations e build Webpack"
  - "PASS: auditoria npm sem vulnerabilidades"
  - "PENDENTE: banco no CI; Docker local indisponível"
blocker: null
next_action: "Executar Database no CI, corrigir a migration se necessário e validar a jornada no navegador."
---

# Trabalho atual

A R15 corrige a lacuna entre publicar a grade e organizar jogos reais. O fluxo
guiado termina somente quando agenda, partidas, lados e convocados estão criados;
estado técnico continua preservado no domínio, mas deixa de aparecer ao usuário.
