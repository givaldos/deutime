# DEC-CHAMPIONSHIP-GUIDED-SETUP — campeonato em cinco passos

## Decisão

A preparação de um campeonato passa a ser uma jornada única e mobile-first:

1. **Campeonato** — nome e formato;
2. **Regras** — pontuação, grupos e desempates;
3. **Equipes** — participantes internos;
4. **Convocados** — atleta ativo associado a uma equipe do campeonato;
5. **Agenda** — primeira data, cadência, duração e local; o botão final cria as
   partidas e publica.

O estado `draft` continua existindo no domínio para preservar atomicidade e
compatibilidade, mas não aparece como linguagem de produto. A interface usa
**Configuração em andamento** e mostra somente a etapa acionável.

## Fonte de verdade

- campeonato, participantes, confrontos e slots continuam nas tabelas R09;
- atleta continua pertencendo ao time principal; a escolha no assistente não
  altera cadastro, RSVP ou equipe persistente;
- a convocação final é materializada em `match_participations` para cada partida;
- eventos e partidas continuam sendo as fontes da agenda e da súmula;
- a classificação continua reconstruída exclusivamente dos fatos finalizados.

## Finalização

`finish_championship_setup` recebe apenas intenção validada: convocados, horários,
duração, modalidade e local. A RPC deriva o tenant e o ator da sessão, valida
owner/admin, equipes, atletas e confrontos, publica o regulamento, cria um evento
e uma partida para cada confronto inicial resolvível, vincula os lados e copia
os convocados. Tudo ocorre na mesma transação e sob lock do campeonato.

Conflito duro de equipe ou local aborta toda a finalização. Alertas não destrutivos
permanecem nas Pendências da agenda. Replay usa `request_id`; o log registra apenas
contagens e nunca nomes ou listas de atletas.

Em mata-mata, somente confrontos cujos dois lados já são conhecidos entram na
agenda inicial. Fases dependentes continuam seguindo o avanço esportivo existente.

## Compatibilidade e recuperação

- banco novo com app anterior permanece inerte porque a nova RPC não é chamada;
- app novo mantém a preparação anterior se a RPC ainda não existir;
- a finalização antiga continua disponível como fallback interno durante o piloto;
- rollback de interface não apaga campeonatos, agenda, partidas ou convocações;
- nenhuma migration aplicada é alterada.
