# Revisão da home e da entrada pública

Implementação local em 6 de outubro de 2026, branch `codex/home-publica`, criada
da `dev` sincronizada com `origin/dev` no commit `0358efe`. O trabalho BAT-04
permanece na branch `codex/bat-04`, sem alterações por esta tarefa.

## Escopo e decisões

A home apresenta a organização do racha pela perspectiva de quem administra.
Agenda, confirmação, lembretes, equipes, súmula, votação, conversa e campeonatos
aparecem com explicações do uso. A demonstração interativa usa dados fictícios
identificados e permite alternar presenças, equipes e súmula sem acesso ao banco.

A identidade usa os SVGs oficiais, verde gramado, volt e as fontes existentes.
CSS Modules limitam os estilos da home. O conteúdo principal continua renderizado
no servidor; somente a demonstração exige estado no cliente.

O shell compartilhado de autenticação recebe continuidade visual e retorno
explícito à home. Login e cadastro têm título de nível 1. O cadastro informa
a necessidade de código de convite para criar um time antes do formulário.
Metadados e imagem Open Graph acompanham a nova mensagem.

As promessas foram confrontadas com o catálogo e o estado documentado das
releases R01 a R14. A criação por convite fica explícita. Divisão exige revisão
do organizador, lembretes dependem de configuração e a FAQ informa que cobrança
de atletas e repasses não fazem parte do produto atual. Não há promessa de
agenda sem supervisão, divisão publicada sozinha ou substituição automática.

As páginas dinâmicas de time, evento, atleta e campeonato preservam seus
contratos e projeções. Este trabalho não muda autenticação, RLS, banco, flags,
envios de WhatsApp ou regras de negócio. A telemetria global existente permanece.

## Validação local

- `npm run verify`: aprovado na versão final. Lint, TypeScript, 162 arquivos
  com 830 testes de aplicação, 4 testes de contexto, 13 testes do controlador
  e build padrão Turbopack passaram.
- Teste da home: visitante anônimo, orientação de convite, dados demonstrativos,
  redirecionamentos `/app` e `/me`, e propagação da falha de verificação de sessão.
- `git diff --check`: aprovado.
- Navegador local: home em 320, 360, 1280 e 1440 px sem rolagem horizontal;
  cadastro em 320 px, login e recuperação em 360 px; login também inspecionado
  em desktop. Conferidos caminhos de cadastro, login, recuperação e retorno.
- Demonstração de equipes por clique, súmula por Enter, FAQ por Enter e âncoras
  válidas. Foco visível conferido na pergunta expandida. Layout sem animações
  contínuas; preferências de movimento reduzido existentes preservadas.
- Prévia com configuração pública local fictícia, sem envio de formulários,
  criação de conta, mensagens ou operações em produção.

O primeiro build recusou o link simbólico de `node_modules` para fora da
worktree. A cópia local das dependências eliminou a causa; o build padrão e,
depois, o `verify` completo passaram. Não houve mudança de configuração para
contornar o build.

## Limites e retomada

Validação de viewport não equivale a teste em aparelho físico. Não há aceite
CP4 de iPhone, Android, leitor de tela ou navegador interno do WhatsApp nesta
tarefa. Também não há PR, merge, publicação ou smoke de produção.

Próxima ação: revisar a proposta na prévia, validar em aparelhos e leitor de
tela e seguir a integração por PR para `dev`, checks consolidados e promoção
`dev → main`. A reversão consiste em reverter as alterações de apresentação;
não há migration ou dados a recuperar. Os aceites pendentes dos pacotes R16
continuam nos registros próprios.
