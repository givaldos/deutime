# DEC-UNCLAIMED-IDENTITY — Acesso do atleta ainda não reivindicado

- Status: aceita
- Data: 28 de julho de 2026
- Release consumidora: R02

## Contexto

A diretoria pode cadastrar um atleta em `athletes` sem `user_id`. Esse vínculo
já participa de chamadas, mas ainda não possui identidade global ou sessão
Supabase. Exigir cadastro e OTP antes da primeira confirmação prejudicaria o
fluxo WhatsApp-first; transformar o link em identidade global permitiria que
qualquer pessoa com um encaminhamento assumisse o atleta.

O fluxo atual de cadastro já procura, sob lock, um atleta do mesmo time sem
`user_id` cujo telefone privado coincide com o telefone verificado pelo Auth.
Ele vincula esse registro à pessoa e preserva o mesmo `athlete_id`.

## Opções consideradas

1. **Exigir OTP e reivindicação antes de responder:** mantém uma única sessão,
   mas adiciona fricção obrigatória à confirmação.
2. **Criar uma identidade global temporária no envio:** reduz a fricção, mas
   confunde posse do link com posse do telefone e cria contas duplicadas.
3. **Emitir capability somente do vínculo e evento:** permite presença sem
   reivindicar identidade; OTP continua sendo o único caminho para acesso
   global.

## Decisão

Adotar a terceira opção:

- a credencial personalizada pode referenciar um `athlete_id` ativo mesmo com
  `user_id is null`, sempre limitada ao mesmo `team_id` e `event_id`;
- a troca cria somente a capability definida em
  [`DEC-PERSISTENT-ACCESS`](DEC-PERSISTENT-ACCESS.md); não cria usuário,
  `player_profile`, sessão global ou vínculo em outro time;
- a capability permite consultar o contexto autorizado e responder
  SIM/NÃO/TALVEZ enquanto evento, prazo, chamada e vínculo permitirem;
- perfil, agenda global, comentários, votos e ações administrativas exigem
  identidade verificada;
- emissão só ocorre para atleta ativo presente na chamada e com contato
  normalizado pertencente àquele vínculo. Sem contato válido ou base legal para
  a mensagem, existe apenas a URL pública e o fallback autenticado;
- o telefone nunca entra na credencial, URL, cookie, log ou projeção pública;
- encaminhar o link pode permitir que outra pessoa responda por aquele atleta
  naquele evento, risco limitado e revogável inerente ao modelo escolhido; isso
  nunca reivindica a identidade;
- cada mutação registra o identificador não secreto da capability e
  `responded_by` permanece nulo enquanto não houver usuário verificado;
- a reivindicação continua sendo feita por OTP e pelo telefone retornado pelo
  Auth. A RPC transacional existente reaproveita o `athlete_id`, de modo que
  presença e histórico não são migrados;
- se o vínculo já estiver ligado a outro `user_id`, houver duplicidade ambígua
  de telefone ou o telefone não coincidir, o sistema falha fechado e não faz
  merge automático;
- após a reivindicação, credenciais e capabilities emitidas no estado não
  reivindicado são revogadas/rotacionadas; o atleta passa a usar a sessão
  verificada, sem perder a resposta;
- inativação ou remoção do vínculo e revogação global retiram imediatamente a
  permissão. Cancelamento preserva apenas a leitura informativa do evento.

## Consequências

- o atleta administrativo pode confirmar com um toque antes de criar conta;
- `athletes` e `event_attendance` continuam fontes únicas do vínculo e da
  resposta;
- não nasce uma identidade paralela de convidado;
- o link encaminhado tem impacto real, porém estritamente limitado ao evento;
- suporte não pode vincular manualmente uma pessoa apenas com nome, telefone
  informado ou posse do link;
- R05 e R06 podem exigir step-up sem alterar a resposta histórica da R02.

## Validação

- pgTAP positivo para atleta não reivindicado e negativo para atleta inativo,
  fora da chamada, evento/time diferente, prazo fechado e vínculo removido;
- concorrência entre troca, resposta, revogação e reivindicação mantém um único
  `athlete_id` e uma resposta autoritativa;
- OTP com telefone coincidente reivindica o vínculo existente; telefone
  divergente, duplicidade e vínculo já reivindicado falham sem vazamento;
- teste de encaminhamento prova que a capability não acessa perfil, outro
  evento, outro time, comentário ou voto;
- auditoria e telemetria não contêm telefone nem segredo reutilizável.

## Plano de migração e reversão

- adicionar credenciais e capabilities por expansão, com RLS, grants mínimos e
  kill switch desligado;
- emitir manualmente somente para time de teste depois dos testes locais;
- manter confirmação autenticada atual como fallback;
- ao desativar a feature, revogar troca e escrita por capability sem apagar
  presença;
- nenhuma contração do modelo de identidade é necessária, pois a reivindicação
  preserva o vínculo existente.
