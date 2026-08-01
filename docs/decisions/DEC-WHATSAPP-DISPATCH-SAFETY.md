# DEC-WHATSAPP-DISPATCH-SAFETY — Envio seguro diante de efeito ambíguo

- Status: accepted
- Data: 2026-07-31
- Release: R03
- Responsáveis: produto e engenharia do DeuTime

## Contexto

A R02 persiste somente o hash da credencial atleta-evento. A R03 precisa entregar
o segredo pelo WhatsApp sem colocá-lo em `notification_outbox`, logs ou
auditoria. Ao mesmo tempo, a criação de mensagem da API clássica da Twilio
devolve um Message SID, mas seu contrato documentado não expõe uma chave de
idempotência definida pela aplicação. Se a conexão cair depois de a Twilio
aceitar a mensagem e antes de o worker receber o SID, reenviar automaticamente
pode duplicar a chamada.

Também existe a ambiguidade de um worker interrompido: depois de iniciar o efeito
externo, o banco não consegue distinguir com segurança “não enviou” de “enviou e
não confirmou”. Prometer entrega exatamente uma vez seria incorreto.

Referências oficiais verificadas em 31/07/2026:

- [recurso Message e parâmetros de criação](https://www.twilio.com/docs/messaging/api/message-resource);
- [requisições à API Twilio](https://www.twilio.com/docs/usage/requests-to-twilio);
- [status de mensagens em callbacks](https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks).

## Decisão

O DeuTime usa entrega **pelo menos uma vez antes do efeito** e **não reenvia
automaticamente um efeito ambíguo**. A mesma intenção possui dedupe transacional,
mas a fronteira externa é protegida por uma barreira explícita.

### Estados e barreira de efeito

1. `enqueue_event_whatsapp_call` cria no máximo uma intenção por
   `time + evento + atleta + versão da agenda + template + versão do template`;
2. `claim_notification_batch` reivindica itens elegíveis com lease opaco. Claims
   concorrentes não recebem a mesma intenção;
3. `prepare_whatsapp_dispatch` revalida autorização, time, vínculo, telefone,
   consentimento, evento, prazo e kill switches. Na mesma transação, emite ou
   rotaciona a credencial R02, cria a tentativa com UUID aleatório, conserva um
   token opaco para compatibilidade e grava `effect_started_at`;
4. somente depois dessa marca o worker pode chamar o adapter. O segredo da
   credencial e o token do callback são devolvidos uma vez ao processo e nunca
   persistidos em texto puro;
5. resposta aceita grava o Message SID de forma idempotente. Rejeição explícita
   classificada como transitória pode voltar à fila; rejeição permanente encerra
   a intenção;
6. timeout, perda de conexão ou lease expirado após `effect_started_at` tornam o
   item `failed` com `requires_review = true`. Ele não participa de novo claim;
7. a operação pode reconciliar o SID na Twilio e confirmar o envio, cancelar a
   intenção ou autorizar conscientemente uma nova tentativa. Essa última opção
   rotaciona a credencial e registra o risco de duplicidade.

Lease expirado antes de `effect_started_at` pode voltar à fila porque nenhum
efeito externo estava autorizado. O retry seguro usa no máximo cinco tentativas,
com atraso exponencial e jitter, limitado pelo prazo útil do evento. Esses
parâmetros podem ser reduzidos por operação sem mudar o contrato.

### Dados e callbacks

- `notification_outbox` continua como comando provider-neutral e recebe, por
  expansão compatível, lease, barreira de efeito, classe de falha e indicador de
  revisão;
- a credencial personalizada não entra em `payload`, `recipient`, tentativa,
  callback, log, métrica ou auditoria; no banco permanece somente o hash previsto
  pela R02;
- o callback novo carrega somente o UUID aleatório e não secreto da tentativa no
  caminho. O token legado permanece persistido apenas como hash para callbacks
  já emitidos; nenhuma URL nova transporta segredo ou expõe `outbox_id`;
- o Route Handler valida `X-Twilio-Signature` contra a URL canônica antes de
  delegar. A RPC por tentativa é exclusiva de `service_role` e aceita replay de
  forma idempotente; conhecer o UUID não autoriza uma escrita sem a assinatura;
- callbacks podem chegar antes do ack do worker porque a tentativa já existe ao
  cruzar a barreira e não depende de o Message SID ter sido persistido;
- tentativas e eventos de entrega guardam somente IDs internos, estado
  normalizado, código de erro sanitizado e timestamps. Telefone, corpo e segredo
  ficam fora da telemetria;
- a máquina fina é monotônica (`accepted`, `queued`, `sent`, `delivered`, `read`,
  `failed`/`undelivered`). O estado grosso da outbox permanece compatível com o
  enum atual.

### Concorrência com o domínio

Cancelamento, remarcação, opt-out ou remoção antes da barreira cancelam ou
invalidam a intenção. Depois da barreira, o envio pode já existir no provedor;
ele é concluído ou encaminhado para revisão, nunca apagado. A página estável da
R02 recalcula a autorização e apresenta o estado atual do evento, portanto uma
mensagem atrasada não reabre RSVP nem vínculo inválido.

## Permissões

- clientes `anon` e `authenticated` não escrevem diretamente na outbox,
  tentativas ou callbacks;
- owner/admin chama somente a RPC de enqueue, que deriva a identidade da sessão;
- worker e webhook usam credencial de servidor e RPCs estreitas de
  claim/prepare/ack/nack/callback; nenhuma credencial de servidor chega ao
  navegador;
- leitura administrativa usa projeção redigida e limitada ao próprio time;
- toda tabela nova nasce com RLS, grants mínimos e pgTAP positivo, negativo,
  replay, concorrência e cross-tenant.

## Consequências

- a credencial R02 não precisa ser armazenada reversivelmente para suportar o
  worker;
- falhas seguramente anteriores ao efeito são recuperadas automaticamente;
- um resultado externo ambíguo exige operação humana e pode deixar uma chamada
  sem envio até a reconciliação, opção preferível a duplicar automaticamente;
- exatamente uma entrega não é prometida. Uma repetição consciente ainda pode
  gerar duas mensagens, mas ambas ficam auditáveis e somente a credencial mais
  nova continua válida;
- o desenho independe da Twilio e continua válido para um provedor futuro que
  ofereça ou não idempotência nativa.

## Compatibilidade e reversão

1. publicar apenas colunas nullable/defaults compatíveis, tabelas e RPCs sem
   consumidor ativo;
2. manter `whatsapp_delivery`, `integration_produce` e `integration_consume`
   desligados durante a expansão;
3. app e worker tratam ausência das RPCs novas como integração indisponível e
   preservam o compartilhamento manual;
4. não alterar o enum histórico `message_status` nesta fatia;
5. rollback desliga primeiro o consumo, conserva outbox/tentativas para
   reconciliação e não remove dados em voo.
