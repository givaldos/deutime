---
release: R01
work_package: HOTFIX-AUTH-ROOT
scope: session_destination
branch_or_commit: "codex/fix-session-destination"
checkpoint: idle
status: completed
completed_ac:
  - "Acesso autenticado à raiz não falha por indisponibilidade de consulta auxiliar"
dirty_files: []
tests:
  - "npx vitest run lib/auth/destination.test.ts — 8 testes"
  - "npm run typecheck — ok"
  - "npm run verify — lint, tipos e 13 arquivos/82 testes; build repetido com rede"
  - "npm run build — ok"
  - "npm run security:audit — 0 vulnerabilidades"
blocker: null
next_action: "Integrar o hotfix, aguardar o deploy da Vercel e executar smoke e inspeção dos logs de produção."
---

# Trabalho atual

O erro `500` observado em uma requisição autenticada para `/` foi isolado na
resolução do destino da sessão. O hotfix prioriza o vínculo administrativo,
evita a consulta desnecessária ao perfil de atleta e usa fallback seguro com
telemetria estruturada quando uma consulta falha. O piloto de `event_control`
continua limitado ao `Demo Society`; os kill switches de integração permanecem
desligados.
