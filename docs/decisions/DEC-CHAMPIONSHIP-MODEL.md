# DEC-CHAMPIONSHIP-MODEL — Campeonato, participantes e confrontos

- Status: accepted
- Data: 2026-08-13
- Release: R09
- Responsáveis: produto e engenharia do DeuTime

## Contexto

O DeuTime já representa uma ocorrência como um evento com zero ou muitas
partidas. Cada partida possui dois lados, participação real e fatos esportivos
auditáveis. A organização também mantém equipes internas persistentes, enquanto
o evento guarda snapshots para que alterações futuras não reescrevam o jogo.

Ainda não existe uma entidade que agrupe partidas em pontos corridos, fase de
grupos ou mata-mata. Sem esse contrato, classificação e chaveamento precisariam
ser mantidos fora do produto, e uma correção de súmula poderia deixar a tabela
divergente. A R09 também precisa aceitar adversários que não usam o DeuTime sem
criar vínculo cross-tenant, atleta fictício ou permissão implícita.

## Opções consideradas

1. **Usar a recorrência do evento como campeonato:** reaproveita a agenda, mas
   confunde rodada com ocorrência, não aceita vários confrontos no mesmo evento
   e quebra a separação definida por `DEC-EVENT-MATCH`.
2. **Somar placares por nome ou cor dos lados:** evita novas entidades, mas
   torna renome, homônimo, correção e histórico ambíguos e cria um contador sem
   fonte autoritativa.
3. **Criar campeonato, participantes e confrontos próprios, vinculando cada
   confronto a no máximo uma partida:** preserva agenda e súmula, permite gerar
   a competição antes de agendar os jogos e mantém tabela e chave reconstruíveis.

## Decisão

Adotar a terceira opção.

### Propriedade e participantes

- o campeonato pertence a uma única organização `team_id`; R09 não cria liga
  compartilhada, vínculo nem autorização entre tenants;
- owner e admin criam, configuram, publicam, encerram e arquivam campeonatos;
  manager pode agendar e operar confrontos já publicados, sem alterar regras;
- cada participante pertence ao campeonato e guarda nome, cor, escudo e seed
  como snapshot histórico;
- um participante pode referenciar uma equipe interna ativa da própria
  organização ou representar um adversário externo. Adversário externo não
  referencia outro tenant e não cria atleta, conta ou permissão;
- alterar ou desativar uma equipe interna não reescreve participante, confronto
  nem campeonato já publicado. Duplicidade de nome dentro do campeonato falha;
- a primeira versão aceita de 2 a 32 participantes. Pontos corridos exige ao
  menos 2; grupos + mata-mata exige ao menos 4; mata-mata aceita byes gerados a
  partir do seed quando a quantidade não é potência de dois.

### Formatos e regulamento

- `league`: turno único de pontos corridos;
- `groups_knockout`: grupos em turno único, com um ou dois classificados por
  grupo e mata-mata em jogo único;
- `knockout`: mata-mata em jogo único desde a primeira fase;
- vitória, empate e derrota usam inteiros configuráveis de 0 a 10. A ordem dos
  desempates é uma lista sem repetição formada por vitórias, saldo de gols,
  gols pró e confronto direto;
- persistindo igualdade após todos os critérios, os participantes compartilham
  a posição esportiva. Seed e identificador dão apenas ordem estável de tela;
  não são apresentados como vantagem esportiva;
- quando uma vaga de grupo exigir desempate ainda absoluto, owner/admin registra
  o participante classificado e um motivo auditável antes de gerar a fase
  eliminatória;
- empate em confronto eliminatório não altera o placar para simular gols. A
  qualificação exige vencedor explícito e motivo auditável, como pênaltis, W.O.
  ou critério previsto no regulamento;
- ida e volta, melhor de séries, pontos de bônus, rebaixamento e regulamento
  livre por script ficam fora da R09.

### Confrontos e vínculo com partidas

- a geração cria confrontos em rascunho, com rodada, grupo ou fase, ordem e
  origem dos dois participantes. Staff revisa participantes e seeds antes da
  publicação;
- depois de publicado, o regulamento e os confrontos existentes não são
  reescritos. Ajustes usam comandos explícitos e trilha de auditoria;
- cada confronto pode se vincular a zero ou uma `event_match`, e cada partida a
  zero ou um confronto. Amistosos continuam sem campeonato;
- o evento permanece dono da agenda, chamada e URL. Um evento pode conter
  vários confrontos e cancelar uma ocorrência futura apenas libera os
  confrontos ainda não iniciados para remarcação;
- o vínculo copia os snapshots dos participantes para os lados da partida e
  valida a mesma organização. Depois do primeiro fato esportivo, os lados e o
  confronto não podem ser substituídos;
- partidas `finalized` alimentam classificação e avanço; partidas `void` não
  pontuam. Partida concluída nunca é excluída;
- correção, anulação, W.O., retirada de participante ou mudança de classificado
  exige motivo, identidade administrativa, lock do campeonato e recálculo
  transacional das projeções dependentes;
- confrontos futuros dependentes de um resultado não são apagados. Se ainda não
  começaram, seus participantes derivados podem ser recalculados com auditoria;
  se já começaram, a correção exige intervenção explícita e falha fechada.

### Fonte de verdade e publicação

- regulamento, participantes, confrontos e vínculo com a partida são as fontes
  autoritativas. Classificação e chaveamento são projeções reconstruíveis;
- não existe contador esportivo independente. Uma projeção persistida por
  desempenho só é válida se versionada e reconstruível na mesma transação;
- a página compartilhável usa `/c/{public_id}` aleatório e imutável, nasce
  privada e fica `noindex`, `nofollow` e `no-referrer` quando publicada;
- a projeção anônima mostra somente identidade visual dos participantes,
  regulamento, confrontos, placares autorizados, classificação e chaveamento.
  Ela não publica atletas, escalação, autoria de gol, endereço privado ou IDs;
- o confronto aponta para `/e/{public_id}` somente quando a página do evento já
  estiver pública. Consentimento e `public_mode` nunca são ampliados pela R09;
- compartilhamento é manual por ação nativa ou cópia da URL. R09 não produz
  mensagens automáticas nem altera a outbox do WhatsApp.

### Autorização e compatibilidade

- Actions validam formato e delegam; criação, publicação, geração, vínculo,
  correção e avanço ficam em RPCs transacionais estreitas;
- toda tabela nova carrega `team_id`, RLS deny-by-default, grants mínimos,
  chaves compostas e pgTAP positivo, negativo e cross-tenant;
- a flag tipada `championships` nasce desligada e é conferida no servidor. Com
  flag desligada ou schema N−1, agenda, partidas, súmula e histórico atuais
  continuam utilizáveis;
- migrations são aditivas e forward-only. A aplicação não depende da expansão
  até o schema estar disponível, e o banco expandido ignora consumidores N−1.

## Consequências

- a R09 pode gerar a competição antes de saber em qual evento cada confronto
  ocorrerá e reutiliza a súmula como fonte esportiva;
- equipes externas participam sem atravessar tenants, mas não ganham acesso ao
  produto nem elenco próprio nesta release;
- os três formatos compartilham participantes e confrontos, mas grupos e
  mata-mata exigem avanço auditado e testes adicionais de concorrência;
- posições empatadas podem permanecer compartilhadas. Somente uma vaga que
  precise de vencedor exige decisão administrativa motivada;
- a página de campeonato agrega apenas fatos já públicos e não substitui a URL
  canônica de cada evento.

## Validação exigida

- pgTAP cobre os três formatos, limites, regras inválidas, geração reproduzível,
  byes, empate, W.O., anulação, correção e recálculo;
- casos negativos cobrem escrita por atleta, manager alterando regulamento,
  participante de outro tenant, partida já vinculada e mutação após início;
- concorrência cobre dupla publicação, dupla vinculação, finalização simultânea
  e correção enquanto outra partida do campeonato é encerrada;
- a matriz N/N−1 prova app novo sem expansão, banco novo com app antigo e flag
  desligada preservando toda a operação de partidas;
- Android, iPhone e navegador interno do WhatsApp validam criação, tabela,
  chaveamento, compartilhamento, zoom, foco, leitor de tela e fallback manual.

## Migração e reversão

1. adicionar flag, tabelas, constraints, RLS e RPCs sem consumidores;
2. entregar criação e pontos corridos atrás da flag, mantendo partidas atuais;
3. acrescentar grupos e mata-mata sobre o mesmo contrato de confrontos;
4. publicar a projeção anônima e a rota `/c/{public_id}` somente para o piloto;
5. ativar uma organização por vez e comparar classificação reconstruída com a
   projeção servida;
6. rollback desliga `championships`; a expansão e os fatos ficam preservados e
   eventos, partidas e súmulas continuam acessíveis pelos caminhos atuais.
