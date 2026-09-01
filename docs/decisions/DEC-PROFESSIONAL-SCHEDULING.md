# DEC-PROFESSIONAL-SCHEDULING — Agenda, padrões e conflitos

- Status: accepted
- Data: 2026-09-01
- Release: R13
- Responsáveis: produto e engenharia do DeuTime

## Contexto

O produto já possui ocorrências em `events`, recorrências em `event_series`,
equipes internas persistentes, partidas com dois lados e campeonatos com
participantes, regulamento e confrontos. A interface, porém, ainda reúne jogo e
campeonato no mesmo formulário, não define duas equipes padrão e trata
remarcação ou cancelamento sem uma visão integrada de conflitos.

Sem um contrato anterior à implementação, recorrência pode voltar a ser
confundida com competição, alterações de nome podem reescrever história e uma
automação de calendário pode surpreender atletas ou duplicar mensagens.

## Opções consideradas

1. **Manter um formulário único de evento:** reutiliza a interface atual, mas
   mantém ambíguos jogo, série e campeonato e não conduz a configuração mínima.
2. **Criar um novo calendário independente:** facilita conflitos, mas duplica
   ocorrência, URL, chamada, comunicação e histórico já presentes em `events`.
3. **Preservar o modelo existente e acrescentar padrões, estado de agenda e
   conflitos auditáveis:** separa as entradas do produto sem criar uma segunda
   fonte de verdade.

## Decisão

Adotar a terceira opção.

### Vocabulário e fonte de verdade

- **jogo** é a jornada de criação de uma ocorrência esportiva; no domínio,
  `events` continua sendo a ocorrência de agenda, chamada, comunicação e URL;
- **recorrência** é somente a regra que materializa ocorrências independentes.
  Não possui regulamento, classificação ou campeão;
- **campeonato** organiza participantes, regulamento e confrontos. Não é uma
  recorrência e não substitui a agenda de cada confronto;
- **partida** é o confronto esportivo de exatamente dois lados dentro de uma
  ocorrência e continua sendo a fonte de placar e fatos esportivos;
- **equipe** é a identidade interna persistente de nome, cor e escudo. Evento,
  participante e lado guardam snapshots para preservar o passado;
- **escalação** distribui atletas na ocorrência ou partida e nunca muda a
  identidade da equipe, o RSVP ou o participante do campeonato;
- a interface usa **equipes participantes** para identidades esportivas e
  **atletas convidados** para a audiência editável da chamada.

### Equipes padrão e compatibilidade

- cada organização seleciona duas equipes internas ativas, distintas e da
  própria organização como padrões dos novos jogos;
- a Missão de estreia cria ou confirma pelo menos duas equipes persistentes com
  nome, cor e escudo editáveis. Os padrões iniciais podem ser `Time A` e
  `Time B`, já usados pela expansão da R07;
- os padrões apenas preenchem a criação. Owner, admin ou manager pode trocar os
  lados antes da publicação; o banco revalida tenant, estado ativo e diferença;
- organizações antigas continuam lendo e operando o histórico. Sem dois
  padrões válidos, podem editar a agenda existente, mas precisam configurar os
  lados antes de publicar novo jogo ou campeonato;
- desativar uma equipe usada como padrão exige escolher substituta ou deixa a
  configuração incompleta. Nunca altera snapshots ou resultados anteriores;
- adversário externo permanece snapshot. A ação separada **Salvar como equipe**
  cria uma identidade interna somente após confirmação administrativa.

### Regulamento e publicação

- R13 preserva `league`, `groups_knockout` e `knockout` e os limites da R09;
- pontos são o critério primário. A lista secundária ordenada aceita, sem
  repetição, vitórias, saldo de gols, gols pró e confronto direto;
- subir e descer são controles obrigatórios da lista no celular; arrastar é
  apenas atalho. A página pública mostra a mesma ordem aplicada pelo banco;
- confronto direto considera o mini-torneio formado apenas pelas equipes ainda
  empatadas naquele passo. Se a igualdade persistir, o próximo critério é
  aplicado; a decisão manual da R09 continua necessária quando uma vaga exigir;
- o regulamento pode mudar em rascunho. Publicar grava uma versão imutável. Antes
  do primeiro fato esportivo, owner/admin pode cancelar a publicação, editar e
  publicar uma nova versão, preservando comandos e URL; depois disso, cria novo
  campeonato ou usa os comandos auditados já previstos pela R09;
- publicação e cancelamento de publicação são idempotentes e transacionais.
  Manager não altera regulamento.

### Matriz de conflitos

Intervalos usam a convenção semiaberta `[início, fim)`: terminar exatamente
quando outro jogo começa não é sobreposição.

| Situação | Classe | Efeito | Resolução |
|---|---|---|---|
| mesma equipe interna em ocorrências sobrepostas | duro | bloqueia publicação até decisão | remarcar, adiar ou manter excepcionalmente com justificativa |
| mesmo local interno marcado como exclusivo em horários sobrepostos | duro | bloqueia publicação até decisão | trocar local/horário, adiar ou justificar exceção |
| mesmo confronto ligado a mais de uma partida, ou partida ligada a mais de um confronto | invariável | falha fechada, sem exceção | liberar o vínculo incorreto antes de continuar |
| intervalo menor que 60 minutos para a mesma equipe | alerta | publicação exige revisão visível | confirmar ou remarcar |
| locais diferentes com intervalo menor que 90 minutos | alerta | sinaliza deslocamento potencial | confirmar ou remarcar; não presume rota ou distância |
| atleta confirmado em ocorrências sobrepostas | alerta | não muda RSVP nem bloqueia sozinho | revisar convidados/escalação ou confirmar conscientemente |

- local interno é uma identidade persistente da própria organização, com nome e
  opção de uso exclusivo. Texto livre legado não gera conflito duro;
- os conflitos são recalculados antes de salvar/publicar e após edição,
  confirmação, vínculo ou mudança de local. A projeção **Pendências da agenda**
  guarda estado derivado; decisões e exceções ficam na trilha auditável;
- conflito duro nunca é ignorado silenciosamente. Owner/admin pode aceitar a
  exceção com justificativa não vazia; manager pode revisar e remarcar, mas não
  aceitar exceção dura;
- nenhuma ocorrência é remarcada automaticamente.

### Adiamento, cancelamento e comunicação

- jogo independente pode ser remarcado, ficar **Data a definir**, ser adiado ou
  cancelado, preservando identificador, URL, convidados, respostas e auditoria;
- confronto de campeonato permanece na competição: pode ser remarcado ou voltar
  a **A agendar**. W.O., anulação e retirada seguem o regulamento da competição;
- em recorrência, a escolha é **somente este jogo** ou **este e os próximos**;
  ocorrências passadas, exceções e respostas já registradas não são reescritas;
- partida encerrada nunca é apagada, adiada nem transformada em outra partida;
- conflito é privado à operação. Notificação só é produzida depois da decisão
  administrativa confirmada e usa outbox, destinatários recalculados e chave de
  idempotência por ocorrência + revisão + finalidade + destinatário;
- falha ou kill switch de comunicação preserva a mudança e o painel autenticado
  como fallback. R13 não troca Twilio, SES nem o adapter existente.

### Autorização e rollout

- owner/admin configuram padrões, locais e regulamento e aceitam exceção dura;
  manager cria e opera jogos e conflitos sem mudar regulamento ou controles da
  organização; atleta apenas responde e vê superfícies autorizadas;
- identidade e `team_id` derivam da sessão. Actions validam e delegam para RPCs
  transacionais; tabelas novas usam RLS deny-by-default e grants mínimos;
- a flag tipada `professional_scheduling` nasce desligada. A flag existente
  `championships` continua protegendo o domínio da R09;
- migrations são aditivas e forward-only. App e banco toleram N/N−1; agenda,
  criação atual, remarcação manual e campeonatos existentes são o fallback.

## Consequências

- o dashboard ganha entradas claras sem trocar fontes de verdade ou URLs;
- equipes padrão reduzem passos, mas nunca substituem validação de tenant nem a
  escolha explícita antes de publicar;
- conflitos ficam acionáveis e auditáveis sem transformar o produto em sistema
  automático de reservas ou roteamento;
- locais persistentes são necessários para conflito duro confiável; valores
  livres antigos permanecem válidos e apenas não recebem essa garantia;
- a versão congelada torna a regra pública reproduzível e impede que uma
  reordenação altere classificação retroativamente.

## Validação

- pgTAP positivo, negativo e cross-tenant para padrões, locais, conflitos,
  exceções, estados de agenda e versão do regulamento;
- concorrência para dupla publicação, sobreposição criada em paralelo, aceite
  duplicado e remarcação simultânea;
- testes de domínio para intervalos semiabertos, alertas, minitorneio de
  confronto direto e igualdade persistente;
- testes de aplicação para as duas entradas, progresso preservado, subir/descer,
  série, data a definir, adiamento e mensagens idempotentes;
- 360 px, teclado, leitor de tela, Android, iPhone e navegador interno do
  WhatsApp; telemetria agregada e sem PII no piloto.

## Plano de migração e reversão

1. adicionar flag, padrões selecionados, locais, estado de agenda, versões,
   conflitos e RPCs de forma inerte;
2. preencher padrões apenas onde houver duas equipes internas ativas inequívocas;
3. entregar as duas entradas e o caminho fino atrás da flag, mantendo as rotas;
4. acrescentar regulamento reordenável e conflitos sem disparo automático;
5. pilotar em organização sintética e depois em uma organização real;
6. rollback desliga `professional_scheduling`; dados, decisões e histórico ficam
   preservados, e criação/remarcação atuais continuam disponíveis;
7. contrair controles antigos somente em release posterior, após censo e uma
   janela completa de compatibilidade.
