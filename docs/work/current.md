---
release: R16
work_package: WP-R16-01
scope: navegacao_permanente_e_inicio_acionavel
branch_or_commit: "codex/r16-home-priorities"
checkpoint: CP1
status: active
completed_ac:
  - "R15 reconciliada: produção e smoke confirmados, sem promoção a repetir"
  - "inventário de 13 páginas de conteúdo e redirect legado reconferido"
  - "nomes, rotas, papéis, capacidade de campeonatos e fallback do NAV-01 fechados"
  - "NAV-02 monta o layout por time e adapta menus móvel/desktop ao contrato compartilhado"
  - "flag team_navigation_shell adicionada de forma inerte e fora do rollout global"
  - "escudo autorizado ou iniciais identificam o time no novo cabeçalho"
  - "NAV-03 migra as 13 páginas para o layout sem remover guards de domínio"
  - "fallback do layout preserva o menu inferior somente nas rotas que já o exibiam"
  - "redirect legado /match para /matches preservado sem alterações"
  - "NAV-04 entrega a rota Mais com destinos filtrados pelo papel administrativo ativo"
  - "âncoras Equipes e Diretoria e acessos apontam para as seções autorizadas de Ajustes"
  - "retornos usam rotas internas canônicas sem aceitar destino arbitrário por query string"
  - "NAV-05 ordena o início por pendências, próximo jogo, campeonatos e resultados recentes"
  - "estados vazios oferecem próxima ação sem inventar dados ou esconder falha de consulta"
  - "manager não recebe criação de campeonato nem missão que exige Ajustes"
dirty_files:
  - "app/app/[teamSlug]/page.tsx"
  - "app/app/[teamSlug]/page.test.tsx"
  - "components/professional-creation-actions.tsx"
  - "components/professional-creation-actions.test.tsx"
  - "docs/releases/work-packages/WP-R16-01-navegacao.md"
  - "docs/work/current.md"
tests:
  - "PASS: 15 testes focados do contrato de navegação"
  - "PASS: TypeScript, lint e git diff --check"
  - "PASS: auditoria de produção sem vulnerabilidades e build Webpack"
  - "PASS: 24 testes focados do contrato, menus e capacidades"
  - "PASS: reset completo do banco e 73 arquivos/1882 testes pgTAP"
  - "PASS: integridade de migrations, lint e TypeScript"
  - "PASS: 29 testes focados de navegação e fallback por rota"
  - "PASS: 31 testes focados de navegação, Mais, papéis e destinos"
  - "PASS: suíte completa com 133 arquivos/651 testes e 4 testes de contexto"
  - "PASS: build de produção Webpack e auditoria sem vulnerabilidades"
  - "PASS: 13 testes focados de início, criação, estados e permissões"
  - "PASS: suíte completa com 134 arquivos/656 testes e 4 testes de contexto"
  - "PASS: build de produção Webpack e auditoria sem vulnerabilidades no NAV-05"
blocker: null
next_action: "Fechar regressões, acessibilidade, piloto e rollout no NAV-06."
---

# Trabalho atual

A R16 segue ativa somente para o WP-R16-01. NAV-01 a NAV-05 estão implementados:
o contrato alimenta os menus, o layout compartilhado envolve as páginas por time e
a área Mais respeita o papel do vínculo ativo. O início agora destaca ações do dia
antes de conteúdo secundário. A interface anterior continua como fallback e a flag
permanece inerte até o fechamento integrado no NAV-06.
