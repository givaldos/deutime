---
release: R02
work_package: hotfix-r02-whatsapp-login
scope: whatsapp_first_access
branch_or_commit: "main"
checkpoint: idle
status: ready_for_deploy
completed_ac:
  - "diagnóstico de otp_disabled"
  - "orientação de primeiro acesso"
dirty_files:
  - "components/athlete-otp-login-form.tsx"
  - "lib/auth/athlete-otp-errors.ts"
  - "lib/auth/athlete-otp-errors.test.ts"
  - "docs/releases/R02-confirmacao-pelo-link.md"
  - "docs/work/current.md"
tests:
  - "Vitest focado — 1 arquivo/3 testes aprovados"
  - "npm run verify — lint, typecheck e 26 arquivos/158 testes aprovados; build repetido com rede e aprovado"
blocker: null
next_action: "Publicar a correção e validar em aparelho físico: primeiro acesso pelo cadastro público e login posterior pelo mesmo WhatsApp."
---

# Trabalho atual

O Auth produtivo foi conferido: cadastro global, provedor Phone, Twilio e
confirmação de telefone estão habilitados. O erro `otp_disabled` observado em
`/auth/login` corresponde a um telefone que ainda não possui identidade,
enquanto a tela de login usa `shouldCreateUser: false`.

A interface agora orienta o primeiro acesso e, quando recebeu
`next=/t/{slug}/cadastro`, oferece retorno direto para o cadastro público. O
login não cria usuário novo; `/t/{slug}/cadastro?novo=1` continua responsável
por cadastrar os dados, confirmar o WhatsApp e preservar o contrato de
identidade do atleta.

A alteração local do usuário em `docs/roadmap.md` permanece separada.
