---
release: R09
work_package: WP-R09-05
scope: championship_robustness_and_pilot
branch_or_commit: "codex/r09-cp4-physical-validation"
checkpoint: CP4
status: ready
completed_ac: [AC-R09-01, AC-R09-03, AC-R09-06, AC-R09-07, AC-R09-08, AC-R09-09, AC-R09-10, AC-R09-11, AC-R09-12, AC-R09-13]
dirty_files: []
tests:
  - "pgTAP focado WP-R09-05: sonda 36/36 e concorrência real 22/22"
  - "db:test: 50 arquivos e 1.317 testes aprovados"
  - "db:lint: nenhum aviso novo; dois avisos legados permanecem fora do escopo"
  - "migrations forward-only preservadas e tipos regenerados"
  - "gate de app: ESLint, TypeScript e 75 arquivos/426 testes Vitest aprovados"
  - "build de produção Webpack aprovado; auditoria: zero vulnerabilidades"
  - "ciclo sintético 390x844: coorte isolada, alvo 48 px, ativação, sonda, agenda e rollback aprovados"
  - "preparação CP4 LAN: login, tabela e chave sintéticas, 390x844/360x800, sonda e smoke de produção aprovados"
  - "testes focados de CSP/request ID: 2 arquivos e 11 testes; TypeScript aprovado"
  - "Android e iPhone: toque, leitor de tela, tabela, chave, compartilhamento e navegador interno do WhatsApp aprovados pelo responsável"
  - "rollback: duas páginas em 404, fatos preservados pela sonda, cenários locais removidos e seed neutro reconstruído"
blocker: null
next_action: "Executar CP5 em uma única organização demo: deploy isolado, pré-sonda, ativação, smoke, observação, alerta, fallback e rollback."
---

# Trabalho atual

WP-R09-05 concluiu o gate técnico CP3. A sonda agregada e sem PII verifica flags,
projeção e reconstrução; concorrência real cobre geração e publicação; smoke,
telemetria, limiares e rollback estão documentados no runbook.

O controle operacional exige confirmação e só aparece para o único `team_id`
configurado. O ciclo sintético mobile ativou a coorte, observou a sonda, preservou
a agenda e retornou ao fallback; a flag terminou desligada e nenhuma organização
real foi ativada.

O checkpoint está em CP4. Os cenários sintéticos de pontos corridos e mata-mata
foram revisados em Android e iPhone, incluindo leitor de tela, compartilhamento
real e navegador interno do WhatsApp. A preparação corrigiu a credencial mínima
do seed, restringiu CSP e origem de dev ao host privado configurado e adicionou
UUID v4 compatível com origem HTTP.

A flag sintética foi desligada pela RPC auditada; a sonda comprovou as duas
projeções em fallback com fatos preservados. Depois da evidência, os cenários
locais foram removidos e o seed neutro foi reconstruído. A próxima ação é CP5 em
uma única organização demo, com deploy, smoke, observação e rollback completos.
