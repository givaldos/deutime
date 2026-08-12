---
release: R07
work_package: WP-R07-06
scope: mobile_lineup_touch_journey
branch_or_commit: "dev"
checkpoint: CP4
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
  - AC-R07-16
  - AC-R07-17
dirty_files: []
tests:
  - "transições mobile: 2 arquivos, 9 testes focados verdes"
  - "Vitest completo: 60 arquivos, 329 testes verdes"
  - "ensaio autenticado 390x844: mover, retirar, recolocar e seleção manual funcionando; sem overflow"
  - "alvos de toque: Retirar e select com 48px"
  - "ESLint, TypeScript, next build --webpack e auditoria com 0 vulnerabilidades: verdes"
  - "PR #170 e merge 9cd8235: checks obrigatórios verdes"
  - "produção 390x844: dois campos de 290px, documento 390px e Compartilhar 316px, sem overflow"
  - "produção convite.png 1200x630: dois campos e 14 primeiros nomes renderizados"
  - "workflows main: CI, Database 31550516605, CodeQL, Terraform e Smoke 31550557606 verdes"
  - "formação visual pública: 4 arquivos, 21 testes focados verdes"
  - "Vitest completo: 59 arquivos, 324 testes verdes"
  - "ensaio anônimo 390x844: documento e campos com 390px, sem rolagem horizontal; Compartilhar com 316px"
  - "convite.png local 1200x630: dois campos e 14 primeiros nomes renderizados"
  - "ESLint, TypeScript, next build --webpack e auditoria com 0 vulnerabilidades: verdes"
  - "PR #168 e merge 568cc99: checks obrigatórios verdes"
  - "Deploy database 31547518350, Vercel BnNvGH6qyKYnjbJ4X9szyREsAoyQ e Smoke 31547871444: verdes"
  - "produção: evento Automação WhatsApp mostrou 14 primeiros nomes em dois times, sem telefone/foto"
  - "compartilhamento e projeção pública: 5 arquivos, 29 testes verdes"
  - "Vitest completo: 58 arquivos, 322 testes verdes"
  - "db:reset e db:test: 42 arquivos, 1.015 testes pgTAP verdes; tipos sem diff"
  - "ensaio anônimo 390x844: 4 primeiros nomes no HTML e na imagem, sem telefone/foto"
  - "ESLint, TypeScript, next build --webpack e auditoria: verdes"
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
next_action: "Promover a jornada por toque e repetir mover, retirar, recolocar e seleção manual em Android e iPhone."
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

O ajuste atual cria uma exceção pública mínima para a escalação explicitamente
publicada: somente o primeiro nome chega ao HTML e à imagem; sobrenome, foto,
telefone, IDs e demais detalhes continuam ausentes. O compartilhamento envia
contexto e URL em um único bloco para impedir a inversão observada no macOS.

O ajuste visual atual deve distribuir a ordem publicada em linhas de um campo
meramente ilustrativo, sem inferir posições reais. A página e a imagem usam a
mesma regra, e a ação primária passa a se chamar somente `Compartilhar`.

Implementação e validação local concluídas: a página não cria rolagem
horizontal em `390x844`, e a imagem `1200x630` mostra dois campos com 14
primeiros nomes. O pacote está em `idle`, pronto para promoção.

Promoção concluída no merge `9cd8235`. A conferência do evento real repetiu as
medidas sem overflow e validou a imagem compartilhável em produção; o escopo
`public_lineup_pitch_layout` permanece em `idle` e sem pendências.

O próximo escopo fecha a evidência funcional de `AC-R07-04`: colocar, mover,
retirar e recolocar passam por transições puras cobertas por teste. O cartão
mobile torna `Retirar` visível e mantém o seletor nativo como alternativa aos
atalhos por toque.

Validação local concluída em `390x844`, incluindo as quatro transições e a
alternativa manual. O pacote volta a `idle`; `AC-R07-04` permanece aberto até
o ensaio físico em Android e iPhone após a promoção.
