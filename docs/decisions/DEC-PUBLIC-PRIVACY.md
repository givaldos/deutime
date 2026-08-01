# DEC-PUBLIC-PRIVACY — Matriz de privacidade das superfícies esportivas

- Status: accepted
- Data: 2026-08-01
- Release: R04
- Responsáveis: produto e engenharia do DeuTime

## Contexto

O DeuTime já possui três contratos distintos de visibilidade:

- o time escolhe se mantém uma página pública;
- a pessoa reivindicada escolhe se publica nome, apresentação, foto e posições
  no próprio perfil;
- o cadastro administrativo legado ainda permite marcar como público um atleta
  sem identidade reivindicada.

Nenhum desses contratos informa de forma específica que escalação,
participação real, gols, assistências, cartões, substituições, estatísticas ou
comentários serão publicados. Portanto, não podem ser reutilizados como
consentimento implícito para a página de partida da R04. Responder SIM também
não significa autorizar a divulgação da resposta ou da presença.

Esta decisão adota como baseline de engenharia os princípios de finalidade,
adequação, necessidade, transparência e livre acesso da
[LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).
A [ANPD](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares)
reforça que consentimento deve poder ser revogado de modo facilitado e que a
pessoa deve ser informada sobre as consequências de não consentir. Este ADR não
substitui a revisão jurídica, os Termos e a Política de Privacidade do produto.

## Opções consideradas

1. **Tudo público quando o time for público:** experiência simples, mas mistura
   decisão do time com consentimento individual e expõe presença e conduta.
2. **Tudo privado para qualquer visitante:** minimiza risco, mas impede placar,
   transmissão e timeline pública mesmo sem dados pessoais.
3. **Projeções por audiência, publicação do confronto pelo time e consentimento
   específico para atribuição pessoal:** mantém o jogo útil publicamente sem
   transformar presença ou identidade em informação pública por padrão.

## Decisão

Adotar a terceira opção. Uma consulta nunca lê tabelas centrais para decidir o
que omitir no cliente; cada audiência recebe uma projeção server-side mínima e
RLS/RPCs recalculam vínculo, fase, consentimento e publicação.

### Audiências

1. **Público anônimo:** visitante, crawler, preview ou pessoa apenas com a URL
   limpa `/e/{public_id}`;
2. **Acesso pessoal do evento:** capability válida da R02, limitada ao próprio
   atleta e evento, sem ser sessão global ou autorização para ver terceiros;
3. **Atleta autenticado:** pessoa verificada com vínculo ativo e aprovado no
   time e acesso vigente ao evento;
4. **Staff:** owner, admin ou manager autorizado no próprio time.

Possuir perfil público não eleva a audiência. Link encaminhado continua vendo
somente o mínimo anônimo e os dados do titular daquela capability; não recebe
elenco privado, contato ou papéis.

### Publicação do confronto

- `public_event_page` continua sendo pré-condição técnica da URL pública;
- cada evento nasce com modo de partida `private`;
- staff pode escolher `final_result` para publicar apenas após o encerramento ou
  `live` para publicar durante e depois do confronto;
- a escolha publica somente fatos do evento e da partida. Ela não substitui o
  consentimento de nenhuma pessoa;
- desligar a flag ou retornar o evento a `private` remove a projeção esportiva e
  preserva a página mínima, a súmula interna e sua auditoria;
- transmissão aparece somente no mesmo modo público da partida e usa provedor
  allowlisted. O produto informa que abrir o player compartilha dados técnicos
  com esse provedor.

### Consentimentos pessoais

O contrato separa duas finalidades, ambas opcionais, desligadas por padrão e
controladas exclusivamente pelo titular verificado:

- `public_player_profile`: nome de exibição, nome esportivo, bio, foto e
  posições no perfil e no BID público;
- `public_sports_activity`: nome esportivo, camisa, escalação publicada,
  participação real, autoria de gols/assistências/cartões/substituições e
  estatísticas agregadas em partidas publicadas.

A recusa não reduz acesso ao time, à chamada ou à partida privada. Foto, bio,
posições e link do perfil em uma partida exigem os dois consentimentos; somente
o nome esportivo e a atribuição do fato podem usar
`public_sports_activity`. O texto de aceite lista campos, finalidade, audiência,
versão e consequência da recusa.

O MVP não implementa consentimento de responsável. Perfil ou atividade
esportiva pública de pessoa menor de 18 anos, ou sem confirmação etária para
essa finalidade, permanece indisponível até existir decisão e fluxo próprios.

Consentimento guarda finalidade, versão do texto, estado, data, evidência e
ator. Revogação é gratuita e tão acessível quanto a concessão, produz efeito na
projeção pública sem apagar a súmula interna. A interface avisa que conteúdo já
visualizado, compartilhado ou indexado por terceiros pode não ser recuperável.

Staff nunca concede consentimento pelo atleta. O legado
`athletes.public_profile` deixa de autorizar qualquer atleta não reivindicado e
deixa de ser editável pela diretoria; durante a compatibilidade ele pode apenas
espelhar a escolha válida do titular. Consentimentos anteriores de perfil não
são ampliados para atividade esportiva.

### Matriz de dados

| Dado | Público anônimo | Capability pessoal | Atleta autenticado | Staff |
|---|---|---|---|---|
| contexto mínimo do evento | conforme `DEC-EVENT-PUBLIC-MINIMUM` | sim | sim | sim |
| lados, estado, placar e stream | conforme modo público | conforme modo público | sim | sim |
| lance sem autoria: tipo, minuto e lado | conforme modo público | conforme modo público | sim | sim |
| nome esportivo e camisa na escalação/timeline | somente com `public_sports_activity` vigente | apenas o próprio, além da projeção pública | membros do evento | sim |
| foto, posições, bio e link do perfil | exige também `public_player_profile` | apenas os próprios, além da projeção pública | conforme necessidade da interface interna | sim |
| escalação planejada completa e participação real | nunca; somente linhas individualmente consentidas | apenas dados próprios | sim | sim |
| resposta SIM/NÃO/TALVEZ, pendência e lista de espera | nunca | somente a própria | somente quando a regra privada da jornada exigir | sim |
| contato, nascimento, observação e capability | nunca | somente dado próprio estritamente necessário | nunca para outros atletas | conforme papel e finalidade |
| comentários e identidade do autor | nunca no MVP | somente conversa privada autorizada | conversa privada autorizada | sim/moderação |
| cédula individual de voto | nunca | somente confirmação da própria ação | nunca | nunca; somente auditoria técnica sem vínculo exposto |

Quando uma pessoa não consente, a timeline pública mantém o fato esportivo no
nível do lado — por exemplo, “gol do Time A” — sem nome, foto, perfil ou pista
que permita inferir a identidade. Totais públicos não podem revelar resposta,
ausência, banco ou lista de espera por diferença entre conjuntos.

### Cache, metadata e terceiros

- Open Graph e imagem de convite usam somente a projeção anônima; nunca variam
  por capability, sessão ou consentimento individual;
- páginas privadas e respostas personalizadas usam `no-store`; projeções
  públicas têm invalidação imediata ao revogar consentimento ou publicação;
- URLs assinadas de foto são emitidas somente para caminhos retornados pela
  projeção consentida e possuem validade curta;
- analytics, logs, erros, stream e métricas não recebem capability, telefone,
  resposta, lista de atletas omitidos ou texto integral de comentários;
- busca e sitemap não incluem a página de evento no MVP; `noindex` permanece.

## Consequências

- placar e timeline podem ser públicos sem expor quem confirmou ou jogou;
- o perfil público atual não autoriza automaticamente uma nova finalidade;
- alguns lances aparecerão sem autoria para visitantes, mesmo quando o staff a
  registrou internamente;
- a diretoria perde o poder legado de publicar pessoa não reivindicada;
- a aplicação precisa de consentimento versionado, projeções distintas e
  invalidação de cache; um booleano único não representa mais toda a política;
- comentários continuam identificados apenas dentro da audiência autorizada e
  exigirão a decisão de retenção da R06 antes de implementação.

## Validação

- pgTAP cobre cada célula da matriz, consentimento ausente/revogado, menor ou
  idade desconhecida, time/evento privado, modos `final_result` e `live`, além
  de casos negativos e cross-tenant;
- testes de aplicação comparam resposta anônima, capability encaminhada,
  capability própria, atleta autenticado e os três papéis de staff;
- snapshots garantem que Open Graph, convite, logs, analytics e stream não
  recebem identidade ou segredo;
- revogação remove nome, foto, link, atribuição e estatísticas da projeção sem
  alterar súmula, placar ou auditoria internos;
- censo procura campos legados, views públicas e URLs assinadas antes da
  contração; revisão jurídica valida texto, finalidade, idade e retenção antes
  de dados reais.

## Plano de migração e reversão

1. criar estrutura versionada de consentimentos e modo público do evento de
   forma aditiva, com todos os estados privados por padrão;
2. publicar novas views/RPCs sem consumidor e testar a matriz completa;
3. preservar o consentimento legado apenas no escopo exato do perfil já
   divulgado; não criar `public_sports_activity` por backfill;
4. retirar atletas não reivindicados das views públicas e remover o controle
   administrativo que alterava `public_profile`;
5. publicar a gestão de consentimento próprio e só depois consumir atribuições
   esportivas atrás de `event_matches`;
6. em rollback, desligar a projeção esportiva e voltar ao mínimo anônimo. Dados
   e consentimentos permanecem para auditoria e retomada; nenhuma súmula é
   apagada ou tornada pública pelo fallback.
