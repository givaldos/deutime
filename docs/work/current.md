---
release: R16
work_package: WP-R16-04
scope: acompanhamento_claro_de_campeonato
branch_or_commit: "codex/r16-championship-followup-cp0"
checkpoint: CP0
status: idle
completed_ac:
  - "WP-R16-01 a WP-R16-03 encerrados no CP6 e ativos nos 5 times de produção"
  - "CP0 do WP-R16-04 fecha hierarquia, seções, URL, formatos, papéis, dados, desempenho e fallback"
dirty_files: []
tests:
  - "PASS: lint, typecheck, 147 arquivos/753 testes, 4 testes de contexto, build de produção via Webpack e diff check"
blocker: null
next_action: "Executar CMP-01: flag inerte, resumo privado e jogos paginados, mantendo a tela atual como fallback."
---

# Trabalho atual

O `WP-R16-04` reorganiza o detalhe privado do campeonato sem alterar o modelo
esportivo. Campeonato em configuração retoma o assistente R15; competição
publicada abre em **Resumo** e separa Jogos, Classificação, Equipes e Regulamento.

O CP0 está aceito. A próxima fatia é `CMP-01`: expansão inerte com a flag
`clear_championship_workspace`, uma projeção privada de resumo e uma lista de
jogos paginada. A página longa atual permanece como fallback até o piloto.
