---
release: R02
work_package: WP-R02-03
scope: capability_rsvp_ui
branch_or_commit: "codex/r02-rsvp-confirmation-first"
checkpoint: CP4
status: confirmation_first_ready_for_physical_retest
completed_ac:
  - "AC-R02-03"
  - "AC-R02-06"
dirty_files:
  - "app/e/[publicId]/page.tsx"
  - "app/e/[publicId]/page.test.tsx"
  - "docs/releases/R02-confirmacao-pelo-link.md"
  - "docs/work/current.md"
tests:
  - "Vitest focado — contratos, DAL, Action, componente e rota pública aprovados"
  - "npm run db:reset — 30 migrations e seed aplicados"
  - "npm run db:test — 21 arquivos/494 testes pgTAP aprovados"
  - "npm run db:lint — nenhum aviso novo"
  - "npm run db:types — sem diferença"
  - "npm run migrations:check -- 64a8bc0 — aprovado"
  - "teste físico local 390x844 — Confirmado → Não vou → Talvez e fallback com flag desligada"
  - "npm run verify — lint, typecheck, 24 arquivos/144 testes Vitest e build aprovados"
  - "npm run security:audit — zero vulnerabilidades"
  - "CP3 focado — 4 arquivos/37 testes de revogação, expiração, fechamento, concorrência, encaminhamento, acessibilidade e logs"
  - "npm run verify — lint, typecheck, 24 arquivos/151 testes Vitest e build aprovados"
  - "produção anônima — evento Demo Campo acessível, fallback público correto e nenhum controle RSVP exposto com gates desligados"
  - "produção com capability — fragmento removido, SIM/NÃO/TALVEZ persistidos, reload limpo e alvos de 56 px"
  - "produção com revogação — acesso removido imediatamente e recuperado por nova credencial em aparelho novo"
  - "metadata/logs — canonical e OG limpos, sem credencial nos logs capturados"
  - "APP_URL=https://deutime.app npm run smoke:production — aprovado"
  - "sonda operacional — Vitest focado, 4 testes aprovados"
  - "npm run db:reset — 31 migrations e seed aplicados"
  - "npm run db:test — 22 arquivos/510 testes pgTAP aprovados"
  - "npm run db:lint — somente dois avisos preexistentes"
  - "npm run db:types — somente a nova RPC agregada"
  - "npm run migrations:check -- e23767a — aprovado"
  - "npm run verify — lint, typecheck, 25 arquivos/155 testes e build aprovados"
  - "npm run security:audit — zero vulnerabilidades"
  - "produção — migration aplicada pelo Deploy database"
  - "sonda de produção — 3 gates ativos, 1 credencial, 3 capabilities, 4 criações, 1 revogação e 3 RSVPs/24h"
  - "rollback RSVP — resposta preservada, controles removidos e fallback para a agenda"
  - "rearme RSVP — controles restaurados sem nova credencial e 3 gates ativos ao final"
  - "PR #52 e follow-up #53 — todos os checks aprovados"
  - "feedback físico — confirmação promovida ao primeiro cartão após o cabeçalho"
  - "Vitest focado — 2 arquivos/13 testes aprovados"
  - "npm run typecheck — aprovado"
  - "inspeção local — acesso reconhecido e SIM/NÃO/TALVEZ aparecem antes da data e dos detalhes"
  - "npm run verify — lint, typecheck e 25 arquivos/155 testes aprovados; build repetido com rede e aprovado"
blocker: "Reteste físico do cartão de confirmação no topo em Android e iPhone, no navegador interno do WhatsApp e no navegador padrão."
next_action: "Publicar o ajuste e repetir o link físico para confirmar que a resposta aparece sem rolagem antes de encerrar o CP4."
---

# Trabalho atual

O CP4 de `WP-R02-03` ativou o piloto somente para `Demo Campo`, usando o controle
global e as flags do time pelas RPCs auditadas. O link reconheceu Neymar, removeu
o fragmento, persistiu SIM/NÃO/TALVEZ e manteve a última resposta após reload
sem segredo.

A credencial inicial foi revogada e o aparelho caiu imediatamente no fallback
público. Uma nova credencial recuperou o acesso e está copiada para o teste
físico. Falta o operador confirmar Android, iPhone, navegador interno do
WhatsApp e navegador padrão antes de encerrar o CP4.

O primeiro teste físico encontrou uma barreira de usabilidade: a confirmação
ficava abaixo dos cartões de data e detalhes e exigia rolagem. O cartão
reconhecido agora é o primeiro bloco após o cabeçalho, expondo nome, resposta
atual e SIM/NÃO/TALVEZ de imediato. O fallback anônimo continua abaixo dos
detalhes. A correção passou no teste estrutural e na inspeção local e aguarda
reteste físico após publicação.

Enquanto essa evidência física aguarda, o CP5 ganhou uma sonda operacional
agregada, exclusiva de `service_role`, e um comando fail-closed para observar
gates, capabilities, revogações e RSVPs sem PII ou segredos. A sonda foi
publicada e observou a coorte real; rollback e rearme do RSVP foram exercitados
sem perder o acesso reconhecido. A alteração local do usuário em
`docs/roadmap.md` permanece separada.
