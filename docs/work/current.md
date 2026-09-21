---
release: R16
work_package: WP-R16-04
scope: acompanhamento_claro_de_campeonato
branch_or_commit: "codex/r16-championship-followup-cmp03"
checkpoint: CP3
status: idle
completed_ac:
  - "WP-R16-01 a WP-R16-03 encerrados no CP6 e ativos nos 5 times de produção"
  - "CP0 do WP-R16-04 fecha hierarquia, seções, URL, formatos, papéis, dados, desempenho e fallback"
  - "CMP-01: flag inerte, resumo privado e confrontos paginados com isolamento por sessão"
  - "CMP-02: cabeçalho, navegação responsiva e Resumo conectados à projeção estreita atrás da flag"
  - "CMP-03: Jogos paginados, Classificação nos três formatos, Equipes por snapshot e retorno seguro"
dirty_files: []
tests:
  - "PASS: 42 pgTAP focados com 32 equipes, 496 confrontos, paginação, papéis e cross-tenant abaixo de 300 ms"
  - "PASS: db reset, db lint sem novos avisos, 80 arquivos/2.125 testes pgTAP e tipos gerados"
  - "PASS: 1 arquivo/7 testes Vitest focados, typecheck e diff check"
  - "PASS: lint, 148 arquivos/760 testes Vitest, 4 testes de contexto, build Webpack e auditoria sem vulnerabilidades"
  - "PASS: 4 arquivos/20 testes focados de URL, navegação, papéis, estados, configuração e fallback"
  - "PASS: lint, typecheck, 151 arquivos/773 testes Vitest, 4 testes de contexto, build Webpack e auditoria sem vulnerabilidades"
  - "PASS: 5 arquivos/26 testes focados de filtros, cursor, grupos, snapshots, retorno e fallback"
  - "PASS: lint, typecheck, 152 arquivos/779 testes Vitest, 4 testes de contexto, build Webpack e auditoria sem vulnerabilidades"
blocker: null
next_action: "Executar CMP-04: Regulamento e ações sensíveis nas seções corretas."
---

# Trabalho atual

O `WP-R16-04` reorganiza o detalhe privado do campeonato sem alterar o modelo
esportivo. Campeonato em configuração retoma o assistente R15; competição
publicada abre em **Resumo** e separa Jogos, Classificação, Equipes e Regulamento.

O CP3 está aceito. Competições publicadas usam Resumo, Jogos, Classificação e
Equipes estreitos quando a flag está ativa. Configuração, flag desligada,
contrato ausente e Regulamento permanecem na página atual.

A próxima fatia é `CMP-04`: mover Regulamento e ações sensíveis para as seções
corretas, preservando autorização, locks, auditoria e idempotência.
