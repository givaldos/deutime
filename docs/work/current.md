---
release: R13
work_package: WP-R13-01
scope: entry_and_inert_expansion
branch_or_commit: "251f361"
checkpoint: CP0
status: ready
completed_ac:
  - AC-R13-01
  - AC-R13-02
dirty_files: []
tests:
  - "CP0 documental: nenhuma migration, RPC, flag, interface ou integração alterada"
  - "baseline e entrypoints revalidados em 251f361 sobre dev limpa"
  - "lint, TypeScript, 115 arquivos/557 testes de aplicação e 4 testes de contexto aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado apenas pela abertura de porta no sandbox"
  - "histórico de migrations preservado e auditoria com zero vulnerabilidades"
blocker: null
next_action: "Executar WP-R13-01: testar a regressão das rotas atuais, adicionar a expansão inerte e entregar as entradas Novo jogo e Novo campeonato atrás da flag desligada."
---

# Trabalho atual

A R13 concluiu CP0. O pacote separa jogo, recorrência, campeonato, equipe,
escalação e partida; fecha duas equipes padrão, versão imutável do regulamento,
matriz de conflitos e decisão humana auditável.

`DEC-PROFESSIONAL-SCHEDULING` preserva evento, URL, R09, snapshots e histórico.
Nenhuma implementação ou alteração de produção faz parte deste checkpoint.

A próxima frente permitida é `WP-R13-01`: regressão das rotas atuais, expansão
inerte e duas entradas de criação atrás de `professional_scheduling` desligada.
