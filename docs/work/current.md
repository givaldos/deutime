---
release: R11
work_package: DP-R11-01
scope: asaas_sandbox_and_contracts
branch_or_commit: "codex/r11-sandbox-contracts"
checkpoint: CP0
status: blocked
completed_ac: []
dirty_files:
  - ".github/ISSUE_TEMPLATE/feature.yml"
  - "docs/backlog.md"
  - "docs/releases/R11-assinatura-asaas.md"
  - "docs/releases/R13-agenda-e-competicoes-profissionais.md"
  - "docs/releases/README.md"
  - "docs/roadmap.md"
  - "docs/work/current.md"
tests:
  - "DISCOVERY: documentação oficial Asaas verificada em 2026-09-03; nenhum efeito externo executado"
  - "BASELINE: entrypoints de adapter, webhook, autorização e controles localizados em a3a5087"
  - "DOCS: git diff --check aprovado após sincronização de roadmap e tarefas"
blocker: "R13 ainda sem rollout global; ASAAS_SANDBOX_API_KEY ausente e políticas comerciais ainda não aprovadas"
next_action: "Promover esta sincronização documental; executar o rollout global da R13 em branch própria; depois configurar uma chave exclusiva do Sandbox Asaas, aprovar as políticas comerciais e executar os sete ensaios de DEC-SUBSCRIPTION-BILLING."
---

# Trabalho atual

A R11 iniciou `DP-R11-01` em CP0 sem alterar produto, banco ou produção. A
fronteira proposta usa checkout recorrente hospedado do Asaas atrás de adapter
neutro; retorno do navegador nunca ativa benefício.

A documentação oficial e os entrypoints locais estão registrados em
`DEC-SUBSCRIPTION-BILLING`. O CP0 não pode ser aceito sem chave exclusiva do
Sandbox e sem fechar as políticas comerciais; CP1 e qualquer migration seguem
proibidos até essa validação.

A auditoria do roadmap identificou que a R13 encerrou o piloto com
`professional_scheduling` desligada em todas as coortes. Como `done` exige
ativação global em produção, o rollout da R13 volta a ser a próxima tarefa
executável. Ele deve ocorrer em branch própria depois que esta sincronização
documental passar por `dev`; a R11 permanece preservada e bloqueada nesta branch.
