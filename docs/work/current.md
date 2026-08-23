---
release: R10
work_package: WP-R10-04
scope: recognition_isolated_pilot
branch_or_commit: "codex/r10-profile-verified-team-creation"
checkpoint: idle
status: ready
completed_ac: [AC-R10-01, AC-R10-02, AC-R10-03, AC-R10-04, AC-R10-05, AC-R10-06, AC-R10-07, AC-R10-08, AC-R10-09, AC-R10-10, AC-R10-11, AC-R10-12]
dirty_files: []
tests:
  - "WP-R10-04: 4 arquivos/24 testes focados aprovados"
  - "pgTAP da sonda: 1 arquivo/28 testes aprovados"
  - "banco completo: 53 arquivos/1428 testes aprovados após reset integral"
  - "gate: lint, TypeScript, 85 arquivos/466 testes e teste de contexto aprovados"
  - "build de produção Webpack aprovado; Turbopack limitado somente pela porta do sandbox"
  - "npm audit: 0 vulnerabilidades"
  - "CP4 preflight em produção/360 px: fallback privado, consentimento oculto, perfil público e alvos de 44–56 px aprovados; sem overflow horizontal"
  - "aceite do produto: navegador responsivo considerado evidência móvel suficiente para a R10; 3 arquivos/12 testes de interface e TypeScript aprovados"
  - "WhatsApp-first: criação de time por telefone confirmado ou perfil imutável verificado coberta por 1 arquivo/8 pgTAP; banco completo 54 arquivos/1436 testes"
  - "rollout: nenhum time ativado; CP4 concluído por decisão explícita e AC-R10-13 permanece aberto"
blocker: null
next_action: "Promover a segunda correção forward-only de criação de time por perfil WhatsApp imutável; repetir a jornada autenticada e então executar pré-sonda, ativação, consentimento/revogação, smoke e rollback do CP5."
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

O pré-check de CP4 em produção, com sessão verificada e viewport de 360 px,
confirmou ausência de overflow horizontal; controles visíveis entre 44 e 56 px;
fallback privado; consentimento oculto com a flag desligada; e perfil público
com estatísticas e posições, sem resumo de reconhecimento ou identificadores
internos visíveis. Nenhuma escrita, flag ou consentimento foi alterado. Essa
checagem foi aceita explicitamente pelo responsável do produto como evidência
móvel suficiente para a R10, apoiada pelos testes automatizados de visão
privada, consentimento e resumo público. `AC-R10-12` e CP4 estão concluídos.

Ao iniciar CP5, a criação autenticada da organização sintética falhou fechada:
a interface aceita a sessão verificada por WhatsApp, mas a RPC histórica exigia
exclusivamente e-mail confirmado. Uma migration forward-only passou a aceitar
e-mail ou telefone confirmado, preservando identidade derivada da sessão,
serialização, limite de abuso, owner atômico e negação para `anon` e contas não
verificadas. A repetição ainda falhou porque a conta conserva a prova imutável
`player_profiles.phone_verified_at`, embora o identificador de telefone já não
esteja presente no Auth. Uma segunda migration forward-only passou a reconhecer
essa prova, que só nasce pelo cadastro guardado e não pode ser inserida por
`authenticated`. O arquivo focado passou 8 testes e o banco completo passou
1.436 testes. Nenhuma organização foi criada antes da segunda correção chegar à
produção.

## Próxima ação

Promover a segunda correção, criar a organização demo pela mesma jornada autenticada e
executar CP5 com dados sintéticos. Confirmar o estado desligado antes da
ativação, observar projeção e consentimento, provar revogação, fallback e
rollback e manter qualquer ampliação bloqueada até fechar `AC-R10-13`.
