---
release: R10
work_package: DP-R10-01
scope: recognition_model_discovery
branch_or_commit: "codex/r10-model-prototype"
checkpoint: CP0
status: in_progress
completed_ac: [AC-R10-01, AC-R10-02, AC-R10-03]
dirty_files: []
tests:
  - "base R10: 2 arquivos/6 testes focados aprovados"
  - "TypeScript aprovado"
  - "protótipo: 390 px e 360 px sem overflow ou recorte"
  - "protótipo: controles com alvo mínimo de 44 px"
  - "protótipo: visão privada, consentimento e prévia pública funcionais"
blocker: "Implementação não autorizada: DEC-RECOGNITION-MODEL segue proposed e a coorte ainda não validou compreensão nem intenção de uso."
next_action: "Apresentar o protótipo descartável a três pessoas da coorte sem explicação prévia; registrar somente contagens de compreensão e intenção para aceitar ou estacionar R10 no CP0."
---

# Trabalho atual

`DP-R10-01` comparou quatro opções e propôs cartões factuais derivados de gol,
assistência e resultado agregado fechado do Craque. O contrato não cria pontos,
nota, ranking ou escrita global: cada item pertence a `athlete_id + team_id` e
acompanha correções da fonte autoritativa.

O eventual resumo público possui finalidade de consentimento própria,
desligada por padrão e revogável pelo titular. A implementação continua fora de
escopo enquanto `DEC-RECOGNITION-MODEL` estiver `proposed`.

O protótipo mobile descartável foi verificado tecnicamente em 390 px e 360 px,
mas ainda não foi avaliado por pessoas da coorte. Portanto, `AC-R10-04`,
`AC-R10-05` e CP0 permanecem abertos.

## Próxima ação

Apresentar o protótipo sem explicação prévia a três pessoas da coorte. Registrar
somente as contagens das cinco respostas previstas no ADR; aceitar a decisão e
promover R10 a `ready` apenas se o sinal mínimo for atingido. Caso contrário,
estacionar a vertical com a métrica de reabertura preservada.
