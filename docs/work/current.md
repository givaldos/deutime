---
release: R03
work_package: WP-R03-04
scope: preserve_delivery_history_on_athlete_removal
branch_or_commit: "codex/r03-preserve-delivery-history"
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
  - "AC-R03-10"
dirty_files: []
tests:
  - "15 casos pgTAP novos aprovados"
  - "4 arquivos e 131 testes pgTAP focados aprovados"
  - "30 arquivos e 642 testes pgTAP aprovados"
  - "38 arquivos e 215 testes Vitest aprovados"
  - "lint, typecheck, build e security:audit aprovados"
  - "integridade das migrations preservada desde 5b60503"
blocker: "Aguardar homologação do número oficial antes de recriar o template card."
next_action: "Publicar banco antes do app; após homologar o número, recriar o template card com novo SID."
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

`AC-R03-10` foi concluído. A remoção de atleta agora cancela somente entregas
anteriores à barreira externa e preserva outbox, tentativas, callbacks e envios
já iniciados. Dados privados e participações futuras continuam removidos.

As alterações locais do usuário em `docs/backlog.md` e `docs/roadmap.md`
permanecem separadas.
