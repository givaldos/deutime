---
release: R10
work_package: DP-R10-01
scope: recognition_model_discovery
branch_or_commit: "codex/r10-discovery-cp0"
checkpoint: CP0
status: in_progress
completed_ac: [AC-R10-01]
dirty_files: []
tests:
  - "baseline R10: 2 arquivos/6 testes focados aprovados"
  - "TypeScript aprovado"
  - "métricas protegidas: 2 perfis públicos, 2 partidas finalizadas e 3 participações reais"
  - "sinal de uso: 0 consentimentos por vínculo, 0 votos e 0 times com voting ativa"
blocker: "Implementação não autorizada: faltam DEC-RECOGNITION-MODEL, protótipo compreendido e sinal mínimo de uso."
next_action: "Executar DP-R10-01: comparar opções de fonte, catálogo, pertencimento, consentimento e reversão; validar protótipo descartável com a coorte antes de decidir CP0."
---

# Trabalho atual

R09 encerrou CP6. A vertical seguinte, R10, foi reavaliada contra os contratos
existentes de participação real, Craque da Galera, perfil público e
consentimento por time.

A leitura protegida de homologação encontrou base técnica, mas nenhum uso de
votação: existem dois perfis públicos, duas partidas finalizadas e três
participações reais; consentimentos por vínculo, votos e times com `voting`
ativa permanecem em zero. Nenhum nome, ID, cédula ou conteúdo pessoal foi
impresso.

R10 entra somente em `discovery`. `DP-R10-01` deve produzir
`DEC-RECOGNITION-MODEL` ou estacionar formalmente a vertical. Migration, flag,
RPC, Action e interface de produção permanecem fora de escopo até existir
contrato aceito e evidência mínima de demanda.

## Próxima ação

Comparar as opções do modelo de reconhecimento e validar um protótipo mobile
descartável com pessoas da coorte, preservando estatísticas básicas e o resultado
agregado do Craque como fallback.
