---
release: R02
work_package: WP-R02-04
scope: event_link_physical_devices
branch_or_commit: "b01a7c1"
checkpoint: idle
status: ready_for_physical_validation
completed_ac:
  - "hotfix de primeiro acesso pelo WhatsApp validado em aparelho físico"
  - "cadastro, espera, aprovação e login posterior aprovados"
dirty_files:
  - "docs/releases/R02-confirmacao-pelo-link.md"
  - "docs/work/current.md"
tests:
  - "Produção — cadastro com OTP concluído"
  - "Produção — vínculo aguardou aprovação administrativa"
  - "Produção — login posterior pelo mesmo WhatsApp aprovado sem otp_disabled"
  - "Smoke de produção somente leitura — aprovado"
blocker: null
next_action: "Repetir o link personalizado do evento em Android e iPhone, no navegador interno e no padrão, incluindo fechar/reabrir, para concluir AC-R02-09."
---

# Trabalho atual

O hotfix de primeiro acesso está publicado e validado fisicamente. Um telefone
novo concluiu o OTP pelo cadastro público, permaneceu aguardando a aprovação do
time e, depois de aprovado, fez login pelo mesmo WhatsApp sem `otp_disabled`.

A única pendência de aceite da R02 continua sendo `AC-R02-09`. O link
personalizado do evento precisa ser repetido em Android e iPhone, tanto no
navegador interno do WhatsApp quanto no navegador padrão. O teste deve confirmar
que o RSVP aparece no topo, a URL fica limpa, a resposta persiste ao fechar e
reabrir e o retorno posterior mantém o mesmo contexto.

A alteração local do usuário em `docs/roadmap.md` permanece separada.
