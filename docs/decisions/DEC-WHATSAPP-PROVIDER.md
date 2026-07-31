# DEC-WHATSAPP-PROVIDER — Twilio para mensageria operacional

- Status: accepted
- Data: 2026-07-31
- Release: R03
- Responsáveis: produto e engenharia do DeuTime

## Contexto

A R03 precisa transformar a distribuição manual da chamada em uma mensagem
real, consentida e observável. O domínio já possui `communication_consents`,
`notification_outbox`, chave de deduplicação e kill switches independentes para
produzir e consumir comandos externos. Faltava escolher o provedor e fechar a
fronteira entre domínio, worker e callbacks.

O projeto já possui conta Twilio com crédito e Sandbox de WhatsApp validado em
aparelhos físicos. Esse uso não torna o Supabase Auth responsável por mensagens
operacionais: OTP e notificações continuam fluxos, credenciais e adapters
separados.

## Opções consideradas

1. **Twilio Programmable Messaging + Content API.** Reutiliza a conta e a
   experiência operacional atuais; oferece sender de WhatsApp, templates,
   Message SID, callbacks de status e webhook de entrada. Acrescenta custo e
   dependência de um BSP.
2. **Meta WhatsApp Cloud API direta.** Reduz uma camada de fornecedor, mas cria
   uma segunda superfície operacional agora, sem aproveitar o Sandbox, o saldo
   e o onboarding já exercitados.
3. **Outro BSP.** Mantém recursos equivalentes em tese, porém adiciona seleção,
   contratação e integração antes de provar a jornada do MVP.

## Decisão

R03 usará **Twilio Programmable Messaging** como primeiro adapter de mensagens
operacionais do WhatsApp e **Twilio Content API** para templates. A escolha é
reversível: tabelas e regras de domínio não recebem tipos, nomes ou estados
específicos da Twilio.

Invariantes do contrato:

- o domínio grava um comando idempotente em `notification_outbox`; nenhuma
  Action ou RPC de evento chama a Twilio diretamente;
- um worker reivindica itens disponíveis, respeita consentimento vigente,
  vínculo/time, `integration_consume`, retry limitado e lease concorrente;
- `integration_produce` bloqueia novos comandos e `integration_consume` bloqueia
  efeitos externos já enfileirados; os dois controles permanecem independentes;
- o adapter envia `ContentSid` e variáveis mínimas e devolve somente o Message
  SID e o estado inicial normalizado;
- mensagens iniciadas pelo negócio usam template aprovado. A janela de 24 horas
  não é usada para contornar template;
- callbacks de status são `POST`, validam `X-Twilio-Signature` com a biblioteca
  oficial e são idempotentes por Message SID + estado/evento recebido;
- o modelo interno normaliza `accepted/queued/sent/delivered/read/failed` sem
  tratar confirmação de transporte ou leitura como confirmação de presença;
- logs e auditoria não registram Auth Token, corpo completo, telefone, URL
  personalizada nem credencial; erros persistem código normalizado e referência
  interna suficiente para operação;
- o template inicial contém somente contexto esportivo mínimo e o link
  atleta-evento. Não inclui resposta atual, nascimento, posição, escalação,
  observação ou endereço privado;
- respostas livres recebidas pelo WhatsApp e bot conversacional ficam fora da
  primeira fatia. O CTA continua sendo o link estável da R02;
- compartilhamento manual permanece utilizável durante piloto, falha, rollback
  ou troca de provedor.

Como a criação de Message da API clássica não documenta uma chave de
idempotência fornecida pela aplicação, o limite entre retry e efeito ambíguo é
regido por
[`DEC-WHATSAPP-DISPATCH-SAFETY`](DEC-WHATSAPP-DISPATCH-SAFETY.md). O DeuTime não
promete exatamente uma entrega nem reenvia automaticamente depois de iniciar um
efeito cujo resultado não pôde ser confirmado.

O Sandbox é permitido somente para desenvolvimento e piloto com participantes
demo. Produção com atletas reais exige sender próprio registrado, WABA/Meta
Business verificado quando aplicável, template aprovado e callbacks definitivos.

Referências oficiais verificadas em 31/07/2026:

- [WhatsApp Business Platform com Twilio](https://www.twilio.com/docs/whatsapp/api);
- [templates de notificação](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates);
- [Content API](https://www.twilio.com/docs/content/content-api-resources);
- [status de mensagens](https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks);
- [validação de assinatura de webhooks](https://www.twilio.com/docs/usage/webhooks/webhooks-security);
- [limites do Sandbox](https://www.twilio.com/docs/whatsapp/sandbox);
- [registro de sender próprio](https://www.twilio.com/docs/whatsapp/self-sign-up).

## Consequências

- o MVP chega ao piloto sem uma nova contratação e preserva a troca futura do
  adapter;
- template, sender e callbacks passam a ser dependências operacionais externas
  com estados próprios de aprovação e falha;
- entrega e leitura ficam observáveis, mas não provam que a pessoa respondeu ao
  evento;
- Twilio e Meta conhecem destinatário, conteúdo e link personalizado, conforme
  o registro de fornecedor em `docs/security.md`;
- Sandbox não é caminho de produção e só alcança participantes que aderiram ao
  ambiente de teste.

## Validação

- CP0: contrato do adapter, payload mínimo, matriz de estados e threat model;
- CP1: RPCs transacionais de enqueue/claim/ack, pgTAP positivo, negativo,
  concorrente e cross-tenant;
- CP2: adapter Twilio e worker contra Sandbox com dados demo;
- CP3: assinatura inválida, callback repetido/fora de ordem, timeout, retry,
  dead letter e kill switches;
- CP4: Android/iPhone, preview, acessibilidade e template em português;
- CP5: coorte `Demo Campo`, métricas de enqueue, envio, entrega, leitura, falha e
  tempo até RSVP;
- CP6: sender próprio e template aprovados antes de dados reais.

## Plano de migração e reversão

1. publicar expansão inerte e adapter sem consumidor ativo;
2. validar schema e worker com ambos os kill switches desligados;
3. ativar produção de comandos somente para `Demo Campo`;
4. ativar consumo no Sandbox e observar a outbox;
5. para rollback, desligar primeiro `integration_consume` e manter
   compartilhamento manual;
6. trocar o adapter no futuro sem reescrever fatos do domínio; itens pendentes
   só migram mediante operação explícita e auditada.
