# DEC-EVENT-MATCH — Evento, partidas e fatos esportivos

- Status: accepted
- Data: 2026-08-01
- Release: R04
- Responsáveis: produto e engenharia do DeuTime

## Contexto

O modelo atual trata `events`, na prática, como a própria partida: existe no
máximo uma `match_report` por evento, `match_incidents` referencia diretamente
o evento e a tela usa os dois primeiros `event_squads` como lados do jogo. Esse
contrato atende um confronto simples, mas não representa um festival, rodada ou
racha com mais de uma partida. Também mistura três fatos diferentes: resposta à
chamada, escalação planejada e participação real.

A R04 precisa manter a URL canônica `/e/{public_id}` em todas as fases, aceitar
adversário externo sem cadastro de atletas e produzir placar, cronologia e
estatísticas auditáveis. A expansão não pode invalidar súmulas existentes nem
exigir que banco e aplicação sejam publicados na mesma ordem.

## Opções consideradas

1. **Continuar com uma partida por evento:** exige criar eventos artificiais
   para cada confronto e fragmenta chamada, comunicação e página pública.
2. **Transformar `events` em partida e criar um contêiner superior:** expressa
   múltiplos confrontos, mas troca a identidade pública já distribuída e exige
   uma migração ampla da agenda e da presença.
3. **Manter o evento como contêiner e adicionar partidas explícitas:** preserva
   a ocorrência e sua URL, permite zero, uma ou várias partidas e separa fatos
   de agenda dos fatos esportivos.

## Decisão

Adotar a terceira opção.

### Evento e partida

- `events` continua sendo a ocorrência autoritativa de agenda, chamada,
  comunicação e URL canônica; um evento possui de zero a muitas partidas;
- cada partida pertence a um único evento e time, tem ordem estável dentro do
  evento e transita por `scheduled`, `live`, `finalized` ou `void`;
- cada partida tem exatamente dois lados ordenados. Um lado pode referenciar
  uma equipe interna do evento ou guardar o retrato mínimo de um adversário
  externo; adversário externo não exige atleta fictício;
- nome, escudo e demais atributos necessários ao histórico são snapshots da
  partida. Alterações futuras no time ou no adversário não reescrevem a súmula;
- vídeo opcional é configurado por partida como provedor permitido e
  identificador validado. HTML ou URL de embed arbitrários não são persistidos;
- finalizar uma partida não conclui automaticamente um evento com outros
  confrontos abertos. O evento só pode ser encerrado quando todas as partidas
  não anuladas estiverem finalizadas, por comando administrativo explícito.

### Escalação e participação real

- `event_attendance` continua sendo somente a resposta à chamada;
- `event_squads` e `lineup_spots` continuam representando a divisão e a
  escalação planejada do evento durante a expansão;
- a participação real nasce por partida e liga o atleta a um dos dois lados.
  Ela é a fonte autoritativa para estatísticas, autoria de lances e candidatos
  a reconhecimentos;
- um atleta pode participar de mais de uma partida no mesmo evento, mas apenas
  uma vez em cada partida;
- participação real e lances são congelados no encerramento. Correção posterior
  exige motivo, identidade administrativa e trilha de auditoria; nunca altera
  RSVP para simular presença.

### Lances, placar e correções

- todo lance pertence a uma partida e a um de seus lados;
- autoria e assistência são opcionais para permitir fatos de adversário externo
  ou de equipe. Quando informadas para um atleta interno, exigem participação
  real naquela partida e naquele lado;
- a cronologia é append-only. Depois do encerramento, um fato não é apagado nem
  sobrescrito: correção ou anulação referencia o fato anterior e registra o
  motivo;
- o placar é reconstruível a partir de gols, gols contra e ajustes explícitos e
  auditados. Um snapshot final pode existir como projeção conferida, não como
  contador independente sem origem;
- cancelar ou anular uma partida preserva seu histórico e a exclui das
  estatísticas vigentes conforme regra explícita, sem apagar fatos.

### Autorização e exposição

- owner, admin e manager do próprio time operam partidas por RPCs estreitas; a
  identidade e o `team_id` derivam da sessão verificada;
- clientes não escrevem diretamente em partidas, lados, participações, lances
  ou correções. Chaves compostas, RLS e grants mínimos impedem cross-tenant;
- atleta aprovado pode ler a projeção privada autorizada do próprio time, mas
  não operar a súmula;
- nenhuma nova identidade de atleta, escalação, participação, autoria ou foto é
  publicada até `DEC-PUBLIC-PRIVACY` fechar a matriz de consentimento. O GET
  anônimo mantém o mínimo de `DEC-EVENT-PUBLIC-MINIMUM` por padrão.

## Consequências

- a mesma URL atende confirmação, múltiplas partidas ao vivo e histórico sem
  transformar o evento em uma partida artificial;
- presença real deixa de ser inferida de RSVP ou escalação e passa a suportar
  estatísticas corretas por confronto;
- um confronto simples ganha uma camada explícita, mas pode continuar com
  criação automática de uma partida padrão;
- telas e RPCs atuais baseadas apenas em `event_id` tornam-se compatibilidade
  temporária e devem falhar de forma fechada quando o evento possuir mais de
  uma partida;
- a decisão não autoriza exposição pública adicional. R04 continua bloqueada
  para essa projeção até resolver `DEC-PUBLIC-PRIVACY`.

## Validação

- pgTAP deve cobrir evento sem partida, uma e várias partidas, exatamente dois
  lados, adversário externo, atleta em mais de uma partida e isolamento
  cross-tenant;
- testes negativos devem impedir lance de atleta ausente, lado incompatível,
  escrita de atleta, correção sem motivo e mutação direta após encerramento;
- testes de concorrência devem provar ordem estável, encerramento único e placar
  reconstruível diante de retry e correção;
- a aplicação deve validar evento simples, dois confrontos no mesmo evento,
  partida anulada, operação mobile e fallback de súmula manual;
- a matriz N/N−1 deve provar banco expandido com app antigo e app novo diante da
  ausência da expansão ou da flag desligada.

## Plano de migração e reversão

1. adicionar tabelas, constraints, RLS, RPCs e projeções de partida de forma
   inerte, sem alterar consumidores atuais;
2. criar uma partida padrão para cada súmula legada e dois lados a partir dos
   rótulos/equipes existentes; mapear lances antigos para essa partida;
3. converter a diferença entre placar legado e gols conhecidos em ajuste de
   migração explícito, com motivo fixo e auditoria, preservando o resultado;
4. manter RPCs por evento como wrappers apenas quando houver exatamente uma
   partida padrão; diante de múltiplas partidas, retornar erro de contrato;
5. migrar escrita administrativa, leitura privada e estatísticas atrás de flag
   desligada por padrão; somente depois ampliar a projeção pública conforme a
   decisão de privacidade;
6. retirar contratos legados apenas após censo de consumidores e janela de
   compatibilidade. Rollback desliga o consumidor novo e conserva toda a
   expansão e os dados já registrados.
