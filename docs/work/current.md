---
release: R03
work_package: WP-R03-04
scope: event_opengraph_branding
branch_or_commit: "codex/r03-event-og-brand"
checkpoint: idle
status: ready_for_review
completed_ac:
  - "AC-R03-01"
  - "AC-R03-02"
  - "AC-R03-03"
  - "AC-R03-04"
  - "AC-R03-05"
  - "AC-R03-07"
  - "AC-R03-08"
dirty_files: []
tests:
  - "3 testes focados aprovados"
  - "typecheck aprovado"
  - "lint e build de produção aprovados"
  - "PNG 1200x630 renderizado com o ativo oficial de branding"
blocker: "Aguardar homologação do número oficial antes de recriar o template card."
next_action: "Publicar a correção visual e, após homologar o número, recriar o template card com novo SID."
---

# Trabalho atual

A primeira entrega física foi aceita e lida sem ambiguidade. O novo perfil de
card está implementado de forma inerte e mantém o mesmo callback e a mesma
barreira contra reenvio ambíguo.

O card usa nome, data, link e a URL pública `.png` do evento como quarta
variável. O Open Graph agora reutiliza o logo oficial completo, com escudo e
wordmark. Banco e app do contrato já foram publicados e os controles do piloto
estão ligados.

O template criado manualmente não será selecionado porque o conteúdo principal
ficou no campo exclusivo de RCS. Por decisão do produto, ele será recriado
somente depois da homologação do número oficial.

As alterações locais do usuário em `docs/backlog.md` e `docs/roadmap.md`
permanecem separadas.
