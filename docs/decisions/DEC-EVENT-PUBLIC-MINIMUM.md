# DEC-EVENT-PUBLIC-MINIMUM — URL e projeção pública mínima do evento

- Status: aceita
- Data: 28 de julho de 2026
- Release consumidora: R02

## Contexto

A confirmação pelo WhatsApp precisa de um endereço que sobreviva à troca do
slug do time e continue útil nas releases de escalação, súmula e histórico. A
agenda pública atual usa o UUID interno de `events`, publica apenas ocorrências
futuras e não possui rota canônica por evento. O `GET` dessa rota também precisa
ser seguro para visitante, crawler, unfurl e link encaminhado, sem tratar um
identificador público como segredo ou autorização.

## Opções consideradas

1. **Reutilizar `events.id`:** evita uma coluna, mas acopla o contrato público à
   chave interna já exposta pela agenda atual.
2. **Usar slug do time e slug editável do evento:** melhora a leitura, mas quebra
   mensagens antigas quando nomes mudam e cria regras de colisão.
3. **Adicionar `events.public_id` aleatório e imutável:** separa identidade
   pública da chave interna, não depende do slug e pode ser reutilizado em todas
   as fases do evento.

## Decisão

Adotar a terceira opção:

- `events.public_id` será um UUID aleatório, `not null`, único, gerado no banco,
  preenchido para eventos existentes e protegido contra alteração;
- a URL canônica será `/e/{public_id}` e não incluirá slug do time;
- `public_id` oferece estabilidade e resistência a enumeração casual, mas não é
  segredo, consentimento nem autorização;
- a view pública deixa de expor `events.id`; consumidores passam por uma
  expansão compatível antes da retirada futura do campo legado;
- o `GET` anônimo retorna somente nome do time, título, tipo e formato do evento,
  início, fim, fuso do time, nome do adversário quando existir e estado
  informativo `scheduled`, `cancelled` ou `completed`;
- endereço do local, chamada, nomes ou identificadores de atletas, respostas e
  totais de presença, prazo interno e dados privados do time ficam fora;
- a rota continua disponível para evento cancelado ou encerrado e nunca aceita
  escrita apenas por conhecer `public_id`;
- Open Graph recebe a mesma projeção mínima, sem credencial personalizada;
- a página usa `noindex, nofollow`, `Referrer-Policy: no-referrer` e resposta
  dinâmica sem cache compartilhado durante a R02;
- o bootstrap que troca a credencial segue
  [`DEC-PERSISTENT-ACCESS`](DEC-PERSISTENT-ACCESS.md) e carrega antes de imagens,
  analytics ou recursos de terceiros;
- publicação e capability possuem flags separadas. Com a publicação desligada,
  a rota responde como inexistente; desligar a capability preserva a página
  pública.

Eventos de times não públicos também podem usar a rota quando a flag específica
de página pública da R02 estiver ativa para o time. Portanto, `teams.is_public`
continua controlando o perfil/diretório do time e não é reutilizado como
autorização implícita para o evento.

## Consequências

- mensagens antigas permanecem válidas após edição do evento ou troca de slug;
- R04 pode ampliar a mesma rota por projeções consentidas sem trocar o endereço;
- o MVP não publica local exato nem qualquer sinal de presença;
- crawlers podem conhecer dados deliberadamente públicos, pois `public_id` não é
  uma capability;
- a agenda pública existente exige migração de contrato em duas fases;
- a consulta anônima deve ser uma projeção explícita, não acesso direto a
  `events`.

## Validação

- pgTAP prova acesso anônimo apenas à projeção, ausência dos campos privados,
  estabilidade de `public_id` e isolamento entre times;
- testes de contrato cobrem evento futuro, encerrado, cancelado, flag desligada
  e identificador inexistente sem diferenças exploráveis;
- smoke anônimo confere HTML, metadata, `noindex`, política de referência e
  ausência de UUID interno ou credencial;
- inspeção de rede garante que o documento de troca não requisita terceiros
  antes de remover o fragmento.

## Plano de migração e reversão

1. adicionar e preencher `public_id` e a nova projeção sem retirar
   `event_id` da view existente;
2. publicar `/e/{public_id}` atrás da flag de página pública;
3. migrar a agenda pública para `public_id` e provar ausência de consumidor do
   UUID interno;
4. retirar o campo legado somente em migration posterior;
5. em incidente, desligar capability ou página por flag sem alterar
   `public_id`; respostas de presença já registradas são preservadas.
