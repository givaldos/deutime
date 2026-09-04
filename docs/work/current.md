---
release: R11
work_package: DP-R11-01
scope: asaas_sandbox_and_contracts
branch_or_commit: "codex/r11-sandbox-contracts"
checkpoint: CP0
status: blocked
completed_ac: []
dirty_files: []
tests:
  - "DISCOVERY: documentação oficial Asaas verificada em 2026-09-03; nenhum efeito externo executado"
  - "BASELINE: entrypoints de adapter, webhook, autorização e controles localizados em a3a5087"
blocker: "ASAAS_SANDBOX_API_KEY ausente e políticas comerciais ainda não aprovadas"
next_action: "Configurar uma chave exclusiva do Sandbox Asaas e aprovar preço, benefícios, carência, cancelamento, grandfathering e suporte; então executar os sete ensaios de DEC-SUBSCRIPTION-BILLING."
---

# Trabalho atual

A R11 iniciou `DP-R11-01` em CP0 sem alterar produto, banco ou produção. A
fronteira proposta usa checkout recorrente hospedado do Asaas atrás de adapter
neutro; retorno do navegador nunca ativa benefício.

A documentação oficial e os entrypoints locais estão registrados em
`DEC-SUBSCRIPTION-BILLING`. O CP0 não pode ser aceito sem chave exclusiva do
Sandbox e sem fechar as políticas comerciais; CP1 e qualquer migration seguem
proibidos até essa validação.
