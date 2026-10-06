# WP-R16-06 — Operações em lote com prévia e recuperação

> Estado: CP3 aceito em 30 de setembro de 2026; jogos, séries e análise de atletas implementados, com flag global desligada.
> Contrato geral e aceites: [R16](../R16-experiencia-de-gestao.md), `AC-R16-16` a `18`.
> Base inspecionada: `16886e3555c45fd451f70c50a7a06d113e6231f0`.

## Resultado demonstrável

Uma pessoa da gestão seleciona jogos futuros ou cadastros pendentes, entende
exatamente quais registros serão alterados, confere antes/depois e impedimentos,
confirma uma única vez e recebe um resultado objetivo. Repetir a solicitação
depois de perda de rede não altera novamente os dados nem duplica comunicação.

## Dependências e decisões

- `WP-R16-03` e `WP-R16-05` estão em CP6. O lote reutiliza as fontes atuais de
  atletas, eventos, conflitos, séries, campeonatos e auditoria;
- a capacidade tipada `batch_operations` nasce desligada e depende das flags do
  domínio operado. Flag ausente, dependência desligada ou contrato indisponível
  mantém edição e análise individuais;
- cada confirmação pertence a um time, um domínio e uma ação. Eventos e atletas
  não são combinados, e IDs de outro time falham fechados;
- o limite é de 50 registros depois da resolução server-side. **Selecionar esta
  página** usa os até 24 itens visíveis; **Selecionar todos os resultados** só
  aparece quando o servidor resolve no máximo 50 itens. Acima disso, a pessoa
  precisa restringir os filtros;
- trocar time, filtros, ordenação, domínio ou ação invalida a seleção e a prévia;
  nenhum registro novo entra por atualização silenciosa da lista;
- a prévia expira em 15 minutos e pertence ao usuário, time, ação e conjunto
  resolvido. Ela não concede permissão e toda regra é revalidada ao confirmar;
- o lote inteiro é atômico. Um item alterado, finalizado, inelegível, com versão
  diferente ou conflito bloqueante impede qualquer escrita. Remover impedidos
  exige seleção explícita e uma nova prévia;
- `request_id` e hash canônico do conteúdo tornam a confirmação idempotente. O
  mesmo ID com outro conteúdo é rejeitado; replay devolve o resultado gravado;
- não haverá botão **Desfazer** nesta fatia. Auditoria, consulta do comando e
  correção autorizada preservam recuperação sem prometer reversão inexistente.

## Escopo

Incluído para jogos:

- selecionar somente ocorrências futuras e ainda não finalizadas do próprio time;
- deslocar todos pelo mesmo intervalo ou definir o mesmo horário civil mantendo
  a data de cada ocorrência, com a diferença explicada na prévia;
- alterar local ou duração de forma uniforme;
- adiar ou deixar data a definir; reagendar por deslocamento explícito preserva
  a distância relativa entre as ocorrências;
- operar **Só os selecionados**; **Este e os próximos** existe apenas para uma
  única série, é expandido pelo servidor e continua sujeito ao limite de 50;
- cancelar coletivamente apenas eventos avulsos sem vínculo com confronto de
  campeonato. Campeonato usa sua operação esportiva existente.

Incluído para atletas:

- selecionar cadastros `pending` do próprio time e aprovar ou rejeitar todos
  pela mesma decisão;
- mostrar na prévia quais vínculos deixaram de estar pendentes antes da confirmação.

Fora deste pacote:

- excluir conta, atleta, evento, série, súmula, resultado ou histórico;
- publicar perfil, mudar identidade, consentimento, presença, escalação ou equipe;
- combinar séries, ações ou domínios; corrigir conflito duro por exceção coletiva;
- fila para superar o limite, importação, planilha, drag and drop ou edição offline;
- WhatsApp, e-mail ou outra mensagem automática como efeito implícito do lote.

## Seleção e experiência mobile

- o modo **Selecionar** é explícito e começa vazio. Cada item tem caixa de seleção,
  nome, data/estado e motivo quando não é elegível;
- uma barra fixa no celular informa quantidade e oferece **Conferir alterações**;
  sair, voltar ou cancelar a prévia não grava nada;
- a prévia lista resumo antes/depois, escopo, quantidade, conflitos, impedimentos
  e efeitos em séries. Texto, ícone e estado não dependem somente de cor;
- a confirmação nomeia a ação e a quantidade, por exemplo **Atualizar 5 jogos**.
  O sucesso informa aplicados, replay e comunicação separadamente;
- carregamento bloqueia confirmação duplicada; perda de rede permite consultar o
  mesmo `request_id` e repetir com segurança;
- a seleção funciona em 360 px, teclado e leitor de tela, com alvo mínimo de
  toque e retorno ao mesmo filtro depois do resultado.

## Autorização, prévia e escrita

As Actions validam tamanho e formato e delegam a RPCs separadas por domínio. O
CP1 fecha assinaturas e tipos de retorno para quatro operações estreitas:

- prévia e aplicação de lote de eventos;
- prévia e aplicação de análise de atletas pendentes.

As prévias são somente leitura, resolvem IDs e filtros no servidor e devolvem um
identificador opaco, expiração, versões, antes/depois, elegíveis e impedimentos.
Não aceitam `team_id` derivado da interface como prova de vínculo.

Na confirmação, a RPC deriva `auth.uid()`, exige associação ativa de owner,
admin ou manager pelo contrato atual, verifica `batch_operations` e as flags do
domínio, bloqueia registros em ordem estável e compara a versão da prévia. Para
eventos, usa `schedule_version`, estado, vínculo de série/campeonato e conflitos;
para atletas, usa estado `pending` e `updated_at`. Regras mais restritas já
existentes, como exceção dura exclusiva de owner/admin, não são ampliadas pelo lote.

Uma transação grava todos os itens, o comando idempotente, as mudanças por item e
um `audit_logs` agregado sem PII. `authenticated` recebe apenas `execute` nas RPCs;
`anon` não recebe acesso. Tabelas novas serão privadas ou nascerão com RLS, grants
mínimos e testes positivo, negativo e cross-tenant.

## Comunicação, telemetria e recuperação

- **Avisar as pessoas** é uma escolha separada, desligada por padrão e exibida
  somente quando existir um produtor compatível. O primeiro caminho fino não envia;
- uma futura escolha de aviso roda depois do comando de domínio, usa a outbox,
  consentimento e chave idempotente própria. Falha de comunicação não reverte a
  agenda e aparece separada do resultado da gravação;
- telemetria registra domínio, ação, quantidade, duração, impedimentos agregados,
  replay e categoria de erro. Não registra títulos, nomes, filtros, IDs ou PII;
- a sonda do piloto expõe somente flag, comandos, itens, falhas, replays e latência
  agregados. Kill switch desliga novas prévias/confirmações e preserva alterações;
- recuperação consulta o resultado pelo `request_id`, mantém a edição individual
  e permite correção autorizada. Rollback da flag nunca tenta apagar fatos válidos.

## Subtarefas

| Fatia | Entrega | Checkpoint |
|---|---|---|
| `BAT-01` | contrato, flag inerte, seleção explícita e modelos de prévia | CP1 |
| `BAT-02` | caminho fino mobile para alterar jogos selecionados | CP2 |
| `BAT-03` | séries, transições, cancelamento avulso e análise de atletas | CP3 |
| `BAT-04` | concorrência, replay, perda de rede, acessibilidade e desempenho | CP3/CP4 |
| `BAT-05` | piloto, rollback/restauração, rollout global, smoke e documentação | CP5/CP6 |

## Aceite e validação

- `AC-R16-16`: seleção e prévia não escrevem; desistência não produz efeito e o
  resultado informa objetivamente quantos registros foram alterados;
- `AC-R16-17`: autorização, limite, cross-tenant, atomicidade, versão, conflito,
  finalizado e replay são impostos no banco e cobertos por pgTAP;
- `AC-R16-18`: perda de rede consulta ou repete o mesmo comando sem nova alteração;
  comunicação é separada e a auditoria permite investigação e correção;
- `VAL-APP`: Vitest focado, typecheck, `npm run verify`, fluxo de 360 a 1280 px,
  teclado e leitor de tela;
- `VAL-DB`: pgTAP positivo, negativo, cross-tenant, limite, concorrência e replay;
  reset, lint, suíte, tipos e integridade de migrations antes da promoção;
- produção: expansão inerte, piloto com registros sintéticos mínimos, sonda sem
  PII, rollback/restauração da flag, replay e smoke somente leitura.

## CP0 aceito

- [x] resultado, dependências, escopo incluído/excluído, papéis, limite, expiração,
  seleção, prévia, atomicidade, concorrência e idempotência estão definidos;
- [x] comunicação paga permanece separada e opt-in; histórico, consentimento,
  identidade e fatos esportivos não podem ser alterados pelo lote;
- [x] entrypoints confirmados em `events/page.tsx`, `events/actions.ts`,
  `athletes/page.tsx`, `athletes/actions.ts`, `management-events.ts`,
  `management-athletes.ts`, `update_event_as_staff_v4`,
  `transition_event_schedule`, `cancel_event_as_staff` e
  `review_athlete_registration`;
- [x] `batch_operations` nasce desligada, falha fechada e mantém edição individual;
- [x] `BAT-01` começa por expansão inerte e fecha assinaturas, tabelas, RLS,
  compatibilidade N/N-1 e tipos antes do consumidor.

## Evidência do checkpoint

- [x] PR [#520](https://github.com/givaldos/deutime/pull/520) integrou o CP0 em
  `dev`; PR [#521](https://github.com/givaldos/deutime/pull/521) promoveu o
  conteúdo para `main` no commit `20879b1246686eb29f201781cf4d3b01d27f1837`;
- [x] CI, Database, CodeQL e Terraform passaram em `main`; o smoke de produção
  [36509283183](https://github.com/givaldos/deutime/actions/runs/36509283183)
  confirmou o deploy sem alteração funcional;
- [x] PR [#522](https://github.com/givaldos/deutime/pull/522) reconciliou `main`
  em `dev`, sem diferença de conteúdo;
- [x] a branch temporária inicial foi removida localmente e em `origin`.

## CP1 aceito

- [x] `batch_operations` integra o tipo `feature_key`, mas permanece fora da
  herança global e sem ativação em qualquer time;
- [x] os modelos da aplicação limitam a seleção a 50 IDs únicos e distinguem
  eventos, séries, horários, locais, duração, transições e análise de atletas;
- [x] as prévias de eventos e atletas derivam a sessão, validam associação e
  flags dependentes, isolam o time e devolvem antes/depois, versão, impedimentos,
  hash e expiração de 15 minutos sem gravar dados;
- [x] as assinaturas de confirmação existem com grants mínimos e permanecem
  bloqueadas até `BAT-02` e `BAT-03`, sem consumidor ou caminho de escrita no CP1;
- [x] pgTAP cobre sessão ausente, flag desligada, papéis, limite, repetição,
  cross-tenant, série, local, elegibilidade, ausência de escrita e fail-closed;
- [x] reset, lint, 2.247 testes de banco, tipos gerados, 814 testes de aplicação,
  lint, typecheck, auditoria e build Webpack passaram. O build Turbopack local
  não alcançou o Google Fonts; o CI continua obrigatório para a promoção.

## CP2 aceito

- [x] a agenda futura oferece seleção explícita, ação uniforme e prévia com
  antes/depois, quantidade, impedimentos e ausência de mensagem automática;
- [x] `apply_event_batch_operation` aceita somente deslocamento de horário,
  horário civil comum ou duração, revalida sessão, flags, time, versões e
  conflitos e grava o lote inteiro ou nada;
- [x] `request_id` e hash do conteúdo impedem aplicação duplicada e rejeitam a
  reutilização do mesmo identificador com outro pedido;
- [x] a confirmação preserva o prazo relativo de presença, incrementa a versão,
  registra mudanças por jogo e auditoria agregada sem PII e não cria comunicação;
- [x] pgTAP cobre sucesso, replay, colisão, versão obsoleta, atomicidade,
  cross-tenant e kill switch. Vitest cobre Actions, validação, página e operações;
- [x] o fluxo foi validado em 390 x 844 px. A prévia mostrou a alteração de
  12:33 para 13:33 e a confirmação retornou `1 jogo alterado. Nenhuma mensagem
  foi enviada.`. A camada do modal foi corrigida para não ser interceptada pela
  navegação inferior;
- [x] `batch_operations` continua desligada globalmente. A edição individual
  permanece disponível; séries, transições, cancelamento e atletas seguem em
  `BAT-03`.

## CP3 aceito

- [x] jogos selecionados aceitam troca de local, adiamento, data a definir e
  cancelamento de eventos avulsos; uma ocorrência de série pode expandir
  **Este e os próximos** no servidor;
- [x] a confirmação revalida o conjunto exato da série, versões, elegibilidade,
  conflitos e vínculos esportivos, bloqueia em ordem estável e grava tudo ou nada;
- [x] cadastros pendentes podem ser aprovados ou rejeitados em lote. Aprovações
  integram as chamadas futuras; decisões não enviam mensagens automaticamente;
- [x] comandos de eventos e atletas têm ledger idempotente, replay seguro,
  auditoria agregada sem PII, kill switch e falha fechada entre times;
- [x] a interface preserva edição e análise individuais, expõe seleção explícita,
  alcance, impedimentos e comparação anterior/posterior. A troca de local mostra
  os nomes dos dois locais antes da confirmação;
- [x] o navegador local confirmou a aprovação de dois vínculos pendentes e a
  troca de `Campo Municipal` para `Arena Nova`; o resultado informou
  `1 jogo alterado. Nenhuma mensagem foi enviada.`;
- [x] 826 testes de aplicação e 2.285 testes de banco passaram, além de lint,
  typecheck, reset, db lint, tipos, integridade de migrations, auditoria com zero
  vulnerabilidades e build Webpack. O build Turbopack local parou somente ao
  acessar o Google Fonts; CI segue obrigatório;
- [x] `batch_operations` permanece desligada em todos os times. `BAT-04` é a
  próxima fatia para robustez de rede, concorrência, acessibilidade e desempenho.

## BAT-04 em validação

- A consulta `get_batch_command_result` recupera a quantidade aplicada pelo
  `request_id` para o autor e time do comando. Outro gestor do mesmo time não
  recebe o resultado. A consulta funciona após desligar a flag, sem reabrir
  prévias ou confirmações.
- Jogos e atletas guardam na sessão do navegador somente o identificador do
  pedido e a prévia mínima com IDs e versões. Após perda da resposta, a tela
  consulta o resultado e pode repetir o mesmo pedido, sem gerar outro ID.
  Prévia vencida sem resultado exige uma nova conferência.
- Os diálogos recebem foco inicial, mantêm a navegação por Tab dentro deles,
  aceitam Escape e devolvem o foco ao botão de prévia. A seleção por teclado
  recebeu indicação de foco visível. No navegador local, a prévia foi conferida
  a 360 px sem rolagem horizontal e Escape devolveu o foco ao botão. Falta
  validar com leitor de tela e em aparelhos Android e iPhone.
- O teste local de 50 jogos mediu 5,6 ms na prévia e 60,3 ms na confirmação.
  O teste impõe limites de 5 s e 8 s, respectivamente, e confirma 50 mudanças,
  uma auditoria e replay sem reaplicação. Os números medem somente o banco
  local, não latência de rede ou experiência no aparelho.
- Duas sessões reais de banco disputaram o mesmo `request_id` em jogos e
  atletas. A segunda aguardou a primeira; houve uma aplicação e um replay em
  cada domínio, sem duplicar comandos. O novo teste tem 15 verificações.
- No navegador local, um jogo foi alterado e o recarregamento exibiu o novo
  horário uma vez. Em um segundo ensaio, um atraso temporário depois da gravação
  permitiu recarregar a página antes da resposta. A consulta recuperou o pedido
  e mostrou um jogo alterado. O banco registrou um comando e uma mudança.
  A consulta aceita também o formato de identificador legado do time de teste.
- O mesmo ensaio com análise de atletas recuperou um cadastro depois de
  recarregar a página. A lista vazia antes ocultava a consulta de recuperação
  quando o último pendente era analisado; agora mantém o aviso e o estado
  vazio. A lista e o detalhe de atletas passaram a aceitar os IDs legados
  presentes nos dados locais. Os testes focados cobrem os dois formatos.
- A largura da página de atletas foi igual à largura visível no navegador
  local a 360 e 1280 px. Esses ensaios usaram o navegador de desktop e não
  substituem validação em aparelhos ou com leitor de tela. O atraso temporário
  usado para interromper a resposta foi removido do código.
- Em 5 de outubro, um Samsung SM-A325M com Android 13 abriu o app local no
  Chrome. No time fictício, a seleção, a prévia e a confirmação de um jogo
  mostraram uma alteração e nenhuma mensagem enviada. Após interromper a
  conexão local durante outra confirmação e recarregar a página antes da
  resposta, a tela mostrou `Pedido recuperado: 1 jogo alterado` e nenhuma
  mensagem enviada. O jogo apareceu com o novo horário. O atraso temporário
  usado apenas nesse ensaio foi removido do código.
- No mesmo aparelho, um cadastro fictício pendente passou pela seleção,
  prévia e aprovação em lote. A lista de pendentes ficou vazia e o banco
  confirmou o estado `active`. O banco local foi restaurado após os ensaios.
- Em 6 de outubro, os diálogos de jogos e atletas foram percorridos por teclado
  no navegador local: o foco inicial ficou no botão de fechar, Shift+Tab levou
  ao último botão, Tab voltou ao primeiro e Escape devolveu o foco ao botão de
  prévia. O nome da caixa de seleção de jogos repetia o título; agora anuncia
  título e horário uma vez. A árvore de acessibilidade confirmou o novo nome,
  e o cartão continuou selecionável. Esse teste não substitui a leitura por
  TalkBack ou VoiceOver.
- `db:reset`, `db:lint`, 2.316 testes pgTAP, lint, typecheck, 834 testes de
  aplicação, build Webpack e integridade de migrations passaram. O build
  Turbopack local falhou ao criar processo ou abrir porta no sandbox.
  `npm audit --omit=dev --audit-level=moderate` não apontou vulnerabilidades.
  Em 6 de outubro, `sharp` passou a 0.35.5 e `source-map-js` a 1.2.2 após
  novos avisos de segurança. Lint, typecheck, 834 testes e build Webpack
  passaram após a atualização. `security:audit` ainda falhou na cadeia de
  `braces@3.0.3`, dependência do lint;
  o [aviso GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
  ainda não apresenta versão corrigida em 6 de outubro de 2026.
- Pendente antes de aceitar `BAT-04` ou CP4: leitor de tela e teclado em
  aparelhos físicos, validação em iPhone e navegador interno do WhatsApp.
  Nenhum aparelho foi detectado nesta retomada. CI e auditoria também são
  gates para integrar a branch.
