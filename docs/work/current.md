---
release: R10
work_package: DP-R10-01
scope: recognition_model_discovery
branch_or_commit: "codex/r10-cohort-review-1-complete"
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
  - "coorte: 1/3 revisão; compreensão 1/1; intenção positiva 1/1; publicação 1/1"
blocker: "Implementação não autorizada: DEC-RECOGNITION-MODEL segue proposed; faltam duas revisões completas da coorte."
next_action: "Apresentar o protótipo sem explicação prévia a mais duas pessoas e registrar compreensão e intenção de uso em contagens agregadas."
---

# Trabalho atual

`DP-R10-01` comparou quatro opções e propôs cartões factuais derivados de gol,
assistência e resultado agregado fechado do Craque. O contrato não cria pontos,
nota, ranking ou escrita global: cada item pertence a `athlete_id + team_id` e
acompanha correções da fonte autoritativa.

O eventual resumo público possui finalidade de consentimento própria,
desligada por padrão e revogável pelo titular. A implementação continua fora de
escopo enquanto `DEC-RECOGNITION-MODEL` estiver `proposed`.

O protótipo mobile descartável foi verificado tecnicamente em 390 px e 360 px.
A primeira revisão humana confirmou os quatro limites do modelo, com o
consentimento testado desligado. A avaliação foi completada em 2026-08-16: a
pessoa usaria a visão e escolheria publicar o resumo. As contagens permanecem
agregadas, sem identidade ou conteúdo pessoal. Portanto, `AC-R10-04`,
`AC-R10-05` e CP0 permanecem abertos até as outras duas revisões.

## Próxima ação

Apresentar o protótipo sem explicação prévia a mais duas pessoas e registrar
somente as contagens previstas no ADR. Aceitar a decisão e promover R10 a
`ready` apenas se o sinal mínimo for atingido; caso contrário, estacionar a
vertical com a métrica de reabertura preservada.
