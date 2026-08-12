# DEC-EVENT-SHARE-PHASE — Fase compartilhável do evento

- Status: accepted
- Data: 2026-08-12
- Release: R08M
- Responsáveis: Produto e engenharia

## Contexto

O endereço canônico `/e/{public_id}` já acompanha o evento da chamada ao
pós-jogo. A página e a imagem `convite.png` também já usam o escudo do time com
fallback da marca e, quando existe publicação explícita, mostram a escalação
mínima. Ainda não há um contrato único que escolha qual contexto público deve
aparecer no Open Graph quando o evento avança para partida ao vivo, placar,
votação ou resultado do Craque da Galera.

Resolver cada fase diretamente na interface repetiria regras, permitiria que
HTML e imagem divergissem e aumentaria o risco de uma sessão ou capability
personalizar metadados que crawlers externos conseguem ler.

## Opções consideradas

1. Manter permanentemente o cartão genérico do evento.
2. Criar uma URL de compartilhamento diferente para cada fase.
3. Manter a URL canônica e derivar uma projeção anônima, mínima e determinística
   da fase pública atual.

## Decisão

Foi escolhida a opção 3. Uma projeção server-side chamada conceitualmente de
`public_event_share_state` será a única entrada de título, descrição e imagem
contextuais. Ela recebe somente o `public_id`, falha fechada e nunca consulta
cookie, capability ou sessão para ampliar a resposta.

A fase é escolhida nesta ordem:

1. evento cancelado sempre comunica o cancelamento;
2. uma partida pública ao vivo prevalece sobre fatos anteriores;
3. encerrada a partida pública mais recente, aparece a votação enquanto a
   janela estiver aberta;
4. após o fechamento, aparece o resultado do Craque da Galera quando existir
   vencedor único publicável;
5. sem resultado publicável, aparece o placar final autorizado;
6. antes da partida, uma revisão de escalação explicitamente publicada
   prevalece sobre a chamada;
7. sem esses estados, aparece o contexto mínimo da chamada ou do evento
   encerrado.

Em evento com mais de uma partida, a seleção usa a partida pública ao vivo de
maior ordinal ou, na ausência dela, a partida finalizada de maior ordinal.
Empate no Craque da Galera não produz um vencedor arbitrário: o cartão informa
apenas que a apuração foi concluída.

O estado anônimo pode conter somente:

- nome e escudo do time, modalidade, título, data, horário e estado público;
- nomes dos lados, placar e fatos por lado autorizados pelo `public_mode`;
- primeiros nomes congelados na revisão de escalação publicada;
- para um vencedor único com `public_sports_activity` vigente, primeiro nome,
  votos, percentual e total de votos válidos.

Sem consentimento vigente, o resultado permanece agregado e não identifica o
atleta. Resposta à chamada, lista de presença, localização privada, endereço
personalizado, IDs internos, capability, telefone e demais dados pessoais
nunca entram na projeção.

Metadados e `convite.png` derivam do mesmo estado. A rota e a URL canônica são
preservadas para não quebrar compartilhamentos existentes. Uma versão opaca,
sem ID ou dado pessoal, invalida o preview quando publicação, placar, janela ou
consentimento alterarem o estado. `noindex`, `nofollow` e `no-referrer`
continuam obrigatórios.

A evolução nasce atrás de `event_share_card`, desligada por padrão e conferida
server-side. Com a flag desligada, schema N−1 ou projeção indisponível, o
comportamento atual de cartão genérico/escalação e a página pública permanecem
utilizáveis.

## Consequências

- um único link continua útil durante todo o ciclo do evento;
- HTML, Open Graph e imagem deixam de implementar precedências independentes;
- placar e resultado exigem expansão forward-only da projeção pública;
- o resultado público não reutiliza a RPC autenticada de apuração nem expõe
  identificadores de candidatos;
- previews externos podem permanecer defasados até a revalidação do crawler,
  por isso a versão pública e o fallback de cópia continuam necessários;
- a mesma projeção poderá servir a formatos futuros sem mudar a URL canônica.

## Validação

- pgTAP positivo, negativo e cross-tenant cobre cada fase, flag desligada,
  `public_mode`, consentimento ausente/revogado, empate e schema compatível;
- testes de aplicação provam a mesma escolha de fase no metadata e na imagem e
  inspecionam snapshots contra capability, PII, IDs e endereço;
- smoke anônimo valida `GET`/`HEAD`, cache, versão e fallback;
- WhatsApp, navegador interno, Instagram, Telegram e iMessage conferem o
  preview real, com prioridade para Android e iPhone no WhatsApp;
- o gate integrado repete chamada, escalação, partida, votação e resultado com
  as automações ligadas e desligadas.

## Plano de migração e reversão

1. adicionar a flag e a projeção mínima sem ativar nenhum time;
2. publicar o schema antes do consumidor e validar N/N−1;
3. fazer metadata e imagem consumirem a projeção, preservando o fallback atual;
4. ativar somente a coorte demo, observar e executar os previews físicos;
5. desligar `event_share_card` diante de vazamento, divergência ou falha; a URL,
   a página pública e o cartão anterior continuam disponíveis;
6. contrair leituras antigas somente em release posterior e após censo de
   consumidores.
