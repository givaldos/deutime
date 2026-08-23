---
release: R10
work_package: WP-R10-04
scope: recognition_mobile_validation
branch_or_commit: "10672f0"
checkpoint: idle
status: ready
completed_ac: [AC-R10-01, AC-R10-02, AC-R10-03, AC-R10-04, AC-R10-05, AC-R10-06, AC-R10-07, AC-R10-08, AC-R10-09, AC-R10-10, AC-R10-11]
dirty_files: []
tests:
  - "WP-R10-04: 4 arquivos/24 testes focados aprovados"
  - "pgTAP da sonda: 1 arquivo/28 testes aprovados"
  - "banco completo: 53 arquivos/1428 testes aprovados após reset integral"
  - "gate: lint, TypeScript, 85 arquivos/466 testes e teste de contexto aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado somente pela porta do sandbox"
  - "npm audit: 0 vulnerabilidades"
  - "rollout: nenhum time ativado; Android/iPhone/leitor de tela/WhatsApp pendentes para CP4"
blocker: null
next_action: "Validar em Android e iPhone reais, leitor de tela e navegador interno do WhatsApp: visão privada, consentimento ligado/desligado, perfil público, revogação e fallback. Registrar CP4 antes de qualquer piloto isolado."
---

# Trabalho atual

`WP-R10-04` concluiu a preparação técnica de robustez em CP3. A sonda
operacional é exclusiva do `service_role`, retorna somente contagens e horários
agregados e verifica ativação, reconstrução, consentimento, publicação e
rollback sem expor pessoa, time, partida, voto ou motivo.

As leituras privada e pública emitem telemetria redigida, com categorias
fechadas de erro e fallback. O smoke de produção pode verificar um perfil
sintético consentido ou revogado, preservando os blocos públicos históricos. O
runbook fixa limiares de parada, revogação, fallback e rollback forward-only.

O banco passou por reset integral, 28 testes focados e 1.428 testes completos;
o aplicativo passou por lint, TypeScript, 466 testes, build e audit. Nenhum time
foi ativado e `AC-R10-12/13` permanecem abertos. O checkpoint voltou a `idle`.

## Próxima ação

Executar CP4 em Android e iPhone reais, leitor de tela e navegador interno do
WhatsApp. Validar visão privada, consentimento ligado/desligado, resumo público,
revogação imediata e fallback; só depois preparar uma organização demo para o
piloto isolado de CP5.
