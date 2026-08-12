---
release: R08M
work_package: WP-R08M-03
scope: event_share_card_preview_pilot
branch_or_commit: "main@de785c7"
checkpoint: CP3
status: ready
completed_ac:
  - AC-R08M-01
  - AC-R08M-02
  - AC-R08M-03
  - AC-R08M-04
  - AC-R08M-05
  - AC-R08M-06
  - AC-R08M-07
  - AC-R08M-08
  - AC-R08M-09
  - AC-R08M-10
dirty_files: []
tests:
  - "pgTAP focado R08M: 40/40 assertions aprovadas"
  - "db:reset: reconstrução limpa; db:test: 43 arquivos e 1.055 testes aprovados"
  - "db:lint: nenhum aviso novo; db:types: somente RPC e enum R08M"
  - "WP-R08M-02 focado: 38/38 casos de página, metadata, PNG e fallback aprovados"
  - "Vitest: 61 arquivos e 347 testes aprovados; TypeScript e ESLint verdes"
  - "WP-R08M-03: sonda pgTAP 25/25; banco completo 44 arquivos/1.080 testes"
  - "WP-R08M-03: 62 arquivos/355 testes Vitest; smoke e telemetria redigida verdes"
  - "build Next.js 16.3 com Webpack: aprovado; Turbopack local limitado pelo sandbox"
  - "npm audit: zero vulnerabilidades"
  - "produção: sonda false confirmou 16 eventos em fallback e zero projeções"
  - "produção: CI, Database, CodeQL, Terraform e smoke somente leitura aprovados"
  - "preflight: signed URL removida do HTML público; fallback privado e cartão público cobertos"
blocker: "A sessão verificada de owner/admin de demo-campo está disponível, mas o produto não expõe action/UI para chamar set_team_feature_flag e o ambiente local não possui acesso operacional ao Supabase."
next_action: "Autorizar e implementar uma action/página operacional autenticada, limitada ao EVENT_SHARE_PILOT_TEAM_ID e delegando à RPC set_team_feature_flag; depois configurar a coorte em produção, ativar demo-campo e executar sonda, smoke e previews."
---

# Trabalho atual

WP-R08M-03 implantou a sonda agregada restrita a `service_role`, telemetria
redigida, smoke anônimo de HTML/GET/HEAD do PNG e o roteiro de ativação e
rollback. A coorte histórica `demo-campo` foi confirmada sem versionar UUID,
operador ou evento. A sonda de produção, ainda desligada, confirmou 16 eventos
em fallback e nenhuma projeção.

O preflight detectou e removeu duas signed URLs de logo do HTML público e
ajustou o smoke ao cache `private, no-store` do fallback nominal, preservando a
exigência de cache público quando o cartão evolutivo estiver ativo. O smoke
final de produção passou.

O checkpoint permanece em CP3 sem ativar nenhum time. Uma sessão verificada de
owner/admin foi confirmada na interface, mas não existe action/UI para a flag e
a CLI local não possui acesso operacional ao Supabase. A retomada deve criar
uma action/página autenticada, limitada à coorte configurada no ambiente e
delegando à RPC existente — sem escrita direta nem impersonação — e então
repetir a saúde com expectativa `true`, o smoke e os previews físicos antes de
avançar CP4/CP5.
