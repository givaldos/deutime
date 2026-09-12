# WP-R16-03 — Elenco reconhecível

> Estado: CP0 aceito em 12 de setembro de 2026; `ATH-01` é a próxima fatia.
> Contrato geral e aceites: [R16](../R16-experiencia-de-gestao.md), `AC-R16-07` a `09`.
> Base inspecionada: `bdbbc5ac3d7dec9331f54196043eb78ea922f1a1`.

## Resultado e limite

Owner, admin e manager encontram uma pessoa por nome, apelido, posição ou
sua situação, alternam entre **Lista** e **Cartões** e reconhecem o atleta pela
foto autorizada. O mesmo conjunto filtrado e o mesmo total aparecem nas duas
apresentações; abrir o detalhe e voltar preserva o contexto.

Este pacote não cria diretório público, ranking, estatística nova, edição em
lote ou nova identidade. `athletes` continua sendo o vínculo com o time;
`player_profiles` continua pertencendo à pessoa e `athlete_private` continua
isolando contato, nascimento e observações.

## Evidência do estado atual

- a página carrega todos os atletas e depois faz consultas adicionais de contato
  e posições por lista de IDs, sem busca, filtro, paginação ou total do servidor;
- os cartões usam camisa ou ícone, embora `athletes.photo_path` e a foto global
  de `player_profiles` já existam no bucket privado `athlete_avatars`;
- o caminho da foto reivindicada começa pelo UUID do usuário. A política de
  storage permite ao próprio atleta lê-la, mas não permite ao staff do time
  assinar esse objeto mesmo quando há vínculo legítimo;
- contato aparece no cartão de varredura principal. Isso aumenta a exposição de
  PII e reduz o destaque de nome, foto, posição e situação;
- **Removidos** já é separado e deve continuar como histórico minimizado, sem
  foto, contato ou posição atual.

## Estados, busca e ordenação

A visão padrão é **Em atividade**. Um aviso compacto informa quantos vínculos
aguardam aprovação e leva ao filtro **Aguardando aprovação**, sem colocar todas
as pendências antes do elenco ativo. Situações disponíveis:

| Texto | Estado interno |
|---|---|
| Em atividade | `active` |
| Inativos | `inactive` |
| Aguardando aprovação | `pending` |
| Não aprovados | `rejected` |

**Removidos** continua fora desses filtros em sua visualização histórica.
Busca combina nome completo e apelido, ignora acentos, caixa e espaços repetidos
e aceita de 2 a 80 caracteres. Filtro de posição usa somente códigos válidos da
modalidade do time. A ordenação é nome esportivo normalizado crescente e `id`
crescente como desempate.

Filtros e cursor ficam na URL. A preferência **Lista/Cartões** pode ficar no
armazenamento local porque não contém pessoa, busca ou identificador. Página
padrão tem 24 itens e máximo de 50, sempre com cursor composto.

## Contrato privado da foto

- foto de perfil reivindicado vem de `player_profiles.photo_path`; foto de
  cadastro ainda não reivindicado vem de `athletes.photo_path`;
- owner, admin e manager ativos podem visualizar a foto privada somente quando
  o vínculo pertence ao mesmo `team_id` e não foi removido. Isso independe do
  consentimento público, pois é uso operacional privado;
- o atleta continua sendo a única pessoa que altera a foto reivindicada em
  **Meu perfil**. Staff pode cadastrar ou substituir somente a foto provisória
  de identidade ainda não reivindicada;
- a projeção aceita apenas caminhos canônicos: UUID do usuário em
  `user_id/profile/<uuid>.<ext>` ou UUID do time para o registro provisório;
- a política de leitura do bucket deve comprovar sessão, papel administrativo
  ativo, vínculo no mesmo time e caminho exato. Saber um caminho não concede
  acesso e vínculo em outro tenant não serve como autorização;
- URLs são assinadas no servidor, em lote, por no máximo 15 minutos, sem cache
  público. Caminho interno não entra em props de cliente, telemetria, Open Graph
  ou resposta anônima;
- foto ausente, removida, expirada, inválida ou com falha de assinatura mostra
  iniciais e nunca bloqueia lista, cartão ou detalhe.

## Read models e detalhe

`list_management_athletes` recebe `team_id`, situação, busca, posição, limite e
cursor. Revalida a sessão e o vínculo owner/admin/manager, filtra antes da
contagem e devolve `items`, `filtered_count`, `pending_count`, `next_cursor` e
filtros efetivos. Cada item contém somente identidade do vínculo, nome esportivo,
nome completo quando necessário, camisa, situação, posições ordenadas, origem
da foto autorizada e ações permitidas. Não devolve contato na lista.

O detalhe privado usa projeção estreita separada, revalida o mesmo tenant e
mostra cadastro, contato autorizado, posições, participações já existentes e
ações compatíveis com o papel. Estatística ainda não disponível aparece como
indisponível, sem contador improvisado. O parâmetro de retorno aceita somente a
lista de atletas do mesmo slug.

## Autorização, privacidade e recuperação

- owner/admin preservam aprovação, edição e remoção existentes; manager preserva
  somente as operações já autorizadas. A nova interface não amplia escritas;
- atleta autenticado, anônimo, membro de outro time e slug/cursor manipulados
  falham fechados sem revelar item, total, foto ou diferença de tempo útil;
- telefone, e-mail, nascimento e observações ficam no detalhe e somente para os
  papéis já autorizados pela RLS/RPC; nunca são critério de busca deste pacote;
- a feature tipada `recognizable_roster` nasce desligada e fora do catálogo
  global. Flag ou schema indisponível mantém a página atual; falha isolada de
  mídia mantém a lista nova com iniciais;
- rollback desliga apenas a flag e preserva fotos, vínculos e fatos esportivos.

## Desempenho, interface e acessibilidade

- fixture cobre mais de 220 vínculos, nomes acentuados e empatados, todas as
  situações, múltiplas posições, perfil reivindicado, provisório, sem foto,
  caminho inválido, outro tenant e mais de uma página;
- read model usa uma consulta por página/contagem e a assinatura é feita em um
  lote deduplicado, sem consulta ou chamada proporcional por cartão;
- alvo local p95 abaixo de 300 ms para o read model; acima de 500 ms bloqueia o
  rollout. Índices começam por `team_id` e acompanham situação/nome;
- foto tem alternativa textual equivalente, iniciais decorativas não são
  anunciadas duas vezes, controles têm 44 px e foco visível;
- Lista e Cartões devem funcionar por teclado, em 360–1280 px e no reflow
  equivalente a 200%, sem esconder situação ou ação primária.

## Subtarefas

| ID | Trabalho | Gate |
|---|---|---|
| `ATH-01` | expansão inerte: flag, read model, índice e autorização privada da foto | pgTAP positivo/negativo/cross-tenant, storage e plano |
| `ATH-02` | lista/cartões, busca, posição, situação, cursor e assinatura em lote | mesmo conjunto/total, >220 vínculos, fallback e nenhuma chamada por cartão |
| `ATH-03` | detalhe privado e retorno preservado | papéis, PII, vínculo reivindicado/provisório e retorno seguro |
| `ATH-04` | estados, acessibilidade, URL e desempenho integrado | loading/vazio/erro, teclado, reflow e matriz responsiva |
| `ATH-05` | piloto, rollback/restauração, rollout global e CP6 | sonda sem PII, smoke, flag global e documentação |

## CP0 aceito

- [x] fontes de verdade e limite entre vínculo, identidade global e PII definidos;
- [x] situação padrão, busca, posição, ordenação, cursor e total definidos;
- [x] contrato privado de foto, caminhos, assinatura e placeholder definidos;
- [x] papéis, cross-tenant, mídia anônima, cache e telemetria definidos;
- [x] fixture, orçamento, fallback, rollback e rollout definidos;
- [x] cinco fatias pequenas e seus gates definidos.

Próxima ação: `ATH-01`, começando pela expansão inerte e pelos testes de
autorização da projeção e do bucket privado.
