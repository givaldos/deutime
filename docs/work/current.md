---
release: R10
work_package: WP-R10-01
scope: recognition_contract
branch_or_commit: "codex/r10-cp0-ready"
checkpoint: CP0
status: ready
completed_ac: [AC-R10-01, AC-R10-02, AC-R10-03, AC-R10-04, AC-R10-05]
dirty_files: []
tests:
  - "base R10: 2 arquivos/6 testes focados aprovados"
  - "TypeScript aprovado"
  - "protótipo: 390 px e 360 px sem overflow ou recorte"
  - "protótipo: controles com alvo mínimo de 44 px"
  - "protótipo: visão privada, consentimento e prévia pública funcionais"
  - "coorte: 3/3 revisões; compreensão 3/3; intenção positiva 3/3; publicação 3/3"
  - "coorte: consentimento testado desligado em 1 revisão e ligado em 2 revisões"
  - "gate: lint, TypeScript e 77 arquivos/436 testes aprovados"
  - "build de produção: Webpack aprovado; Turbopack limitado por porta interna do sandbox (EPERM)"
blocker: null
next_action: "Implementar WP-R10-01 com expansão inerte da flag recognition, catálogo recognition-v1, consentimento, RPCs e tipos, sem consumidor nem ativação de time."
---

# Trabalho atual

`DP-R10-01` comparou quatro opções e aceitou cartões factuais derivados de gol,
assistência e resultado agregado fechado do Craque. O contrato não cria pontos,
nota, ranking ou escrita global: cada item pertence a `athlete_id + team_id` e
acompanha correções da fonte autoritativa.

O resumo público possui finalidade de consentimento própria, desligada por
padrão e revogável pelo titular.

Três revisões humanas sem explicação prévia confirmaram os quatro limites do
modelo; as três pessoas usariam a visão e escolheriam publicar o resumo. Uma
testou o consentimento desligado e duas, ligado. As contagens permanecem
agregadas, sem identidade ou conteúdo pessoal.

`DEC-RECOGNITION-MODEL` está aceita e a R10 satisfaz a Definition of Ready. O
CP0 foi concluído sem ativar flag, time, consumidor ou efeito externo.

## Próxima ação

Implementar `WP-R10-01` como expansão inerte: adicionar a flag `recognition`
desligada por padrão, o catálogo `recognition-v1`, a finalidade versionada de
consentimento, RPCs e tipos com RLS e grants mínimos. Não criar interface nem
ativar organização neste pacote.
