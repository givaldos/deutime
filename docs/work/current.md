---
release: R16
work_package: WP-R16-04
scope: acompanhamento_claro_de_campeonato
branch_or_commit: "codex/r16-championship-followup-cmp05"
checkpoint: CP4
status: active
completed_ac:
  - "WP-R16-01 a WP-R16-03 encerrados no CP6 e ativos nos 5 times de produção"
  - "CP0 do WP-R16-04 fecha hierarquia, seções, URL, formatos, papéis, dados, desempenho e fallback"
  - "CMP-01: flag inerte, resumo privado e confrontos paginados com isolamento por sessão"
  - "CMP-02: cabeçalho, navegação responsiva e Resumo conectados à projeção estreita atrás da flag"
  - "CMP-03: Jogos paginados, Classificação nos três formatos, Equipes por snapshot e retorno seguro"
  - "CMP-04: Regulamento estreito e ações sensíveis posicionadas por seção e papel"
  - "CMP-05 CP4: estados, acessibilidade e contrato operacional de rollout concluídos"
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
  - "PASS: 6 arquivos/46 testes focados de regulamento, papéis e comandos sensíveis"
  - "PASS: lint, typecheck, 153 arquivos/787 testes Vitest, 4 testes de contexto, build Webpack e auditoria sem vulnerabilidades"
  - "PASS: db reset, db lint sem novos avisos, 80 arquivos/2.125 testes pgTAP e tipos gerados sem diff"
  - "PASS: 5 arquivos/16 testes focados de carregamento, estados, acessibilidade e sonda"
  - "PASS: 31 pgTAP focados de piloto, autorização, rollback, restauração e herança"
blocker: null
next_action: "Promover a expansão inerte e executar piloto, rollback/restauração, rollout global, replay e smoke."
---

# Trabalho atual

O `WP-R16-04` reorganiza o detalhe privado do campeonato sem alterar o modelo
esportivo. Campeonato em configuração retoma o assistente R15; competição
publicada abre em **Resumo** e separa Jogos, Classificação, Equipes e Regulamento.

O CP4 está aceito. Competições publicadas usam as cinco seções quando a flag
está ativa. Regulamento carrega uma projeção estreita; controles de publicação,
retirada, confronto, desempate e avanço aparecem somente na seção e no papel
corretos. Configuração, flag desligada e contrato ausente preservam a página atual.

A expansão da `CMP-05` está inerte. A próxima ação é promovê-la e só então
executar piloto, rollback/restauração, rollout global, replay e smoke.
