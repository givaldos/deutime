---
release: R07
work_package: WP-R07-06
scope: focused_event_surface_and_discreet_automation
branch_or_commit: "be018d1"
checkpoint: CP5
status: idle
completed_ac:
  - AC-R07-01
  - AC-R07-02
  - AC-R07-03
  - AC-R07-05
  - AC-R07-06
  - AC-R07-07
  - AC-R07-08
  - AC-R07-09
  - AC-R07-11
  - AC-R07-12
  - AC-R07-13
  - AC-R07-14
  - AC-R07-15
dirty_files: []
tests:
  - "PR #166 e merge be018d1: checks obrigatórios verdes"
  - "Vercel produção 2HhLjvRAiZYeBDqDf476jopCHY2P e Smoke 31545606257: verdes"
  - "superfície focada: evento aberto sem lembretes e compartilhamento compacto em 390x844"
  - "Vitest completo: 58 arquivos, 321 testes verdes"
  - "ESLint, TypeScript e next build --webpack: verdes; auditoria com 0 vulnerabilidades"
  - "salvar/publicar focado: 2 arquivos, 12 testes verdes"
  - "Vitest completo: 57 arquivos, 320 testes verdes"
  - "ensaio mobile 390x844: salvar criou revisão 1; editar e salvar criou revisão 2 sem ação separada"
  - "ESLint, TypeScript e next build --webpack: verdes"
  - "npm run security:audit: 0 vulnerabilidades"
  - "PR #164 e merge 50c3737: checks obrigatórios verdes"
  - "Vercel produção CLvPDEfFJRxag5iNvhejnutP8we8 e Smoke 31544126639: verdes"
  - "db:reset, db:types e db:test: verdes; 42 arquivos, 1.014 testes pgTAP"
  - "integridade de migrations origin/main..HEAD: verde"
  - "PR #162 e merge aff99ce: checks obrigatórios verdes"
  - "Deploy database 31542818301 e Smoke 31542863602: verdes"
  - "Vercel produção 8y3nfqLj8W6ipw6hXFjYcGGYaVVn: concluído"
blocker: null
next_action: "Validar em Android e iPhone: compartilhar o evento e abrir Lembretes automáticos em Editar evento."
---

# Trabalho atual

Equipes internas persistentes, catálogo fechado de escudos SVG e vínculo
histórico com `event_squads` estão implementados. A gestão fica em Configurações
e o evento abre com divisão automática, troca por toque e uma única ação fixa:
salvar a escalação e atualizar o link público automaticamente.

Owner/admin agora usa somente `Salvar escalação`: a Action salva o rascunho e
publica ou atualiza a revisão automaticamente. Manager preserva o rascunho
privado e rascunhos legados continuam com fallback explícito de publicação.

O evento aberto agora fica focado no jogo: há uma única ação compacta de
compartilhamento, que usa a ação nativa do aparelho com fallback de cópia, e o
endereço não ocupa mais a tela. Estado, configuração e acionamento manual dos
lembretes ficam recolhidos em Editar; a automação e suas permissões permanecem
iguais.
