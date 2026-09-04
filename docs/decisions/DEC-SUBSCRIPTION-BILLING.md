# DEC-SUBSCRIPTION-BILLING — Assinatura mensal pelo Asaas

- Status: proposed
- Data: 2026-09-03
- Release: R11
- Responsáveis: produto e engenharia do DeuTime

## Contexto

A R11 monetiza a administração de um time por assinatura mensal sem cobrar
atletas, custodiar cartão ou tornar o provedor financeiro uma dependência da
operação esportiva. O CP0 precisa comprovar no Sandbox do Asaas o comportamento
real de checkout, assinatura, cobrança, alteração de preço, webhook,
cancelamento e reativação antes de fechar schema, autorização ou API local.

A documentação vigente confirma que Sandbox e produção são contas, URLs e
chaves independentes. O Sandbox usa `https://api-sandbox.asaas.com/v3` e não
movimenta valores reais. Nenhuma credencial Asaas está disponível no ambiente
local atual, portanto os ensaios com efeito externo permanecem pendentes.

## Opções consideradas

1. **Checkout hospedado recorrente do Asaas.** Mantém cartão e Pix fora do
   DeuTime, aceita referência externa e comunica o resultado financeiro por
   webhook. É a opção preferida para o caminho fino.
2. **Assinatura criada diretamente pela API.** Oferece controle adicional,
   mas amplia a superfície de dados financeiros e não traz benefício ao piloto
   inicial quando o checkout hospedado atende a jornada.
3. **Checkout próprio ou outro provedor agora.** Aumenta escopo, risco PCI e
   tempo de homologação antes de validar a disposição a pagar.

## Decisão proposta

O primeiro adapter da R11 será o **Asaas Checkout** com cobrança recorrente,
atrás de um contrato provider-neutral. A decisão só muda para `accepted` depois
dos ensaios obrigatórios no Sandbox e da aprovação das políticas comerciais
listadas abaixo.

Invariantes já sustentadas pela documentação oficial:

- o checkout usa `chargeTypes: ["RECURRENT"]`, referência externa opaca e a
  página hospedada; o navegador nunca recebe API key nem dados de cartão;
- retorno, `successUrl` ou estado síncrono do checkout nunca ativa benefício;
  somente webhook autenticado ou reconciliação autorizada altera a projeção;
- API key e token do webhook são segredos distintos e exclusivos do ambiente.
  O webhook valida `asaas-access-token` antes de persistir qualquer evento;
- entrega de webhook é `at least once`. O ID do evento é a chave idempotente;
  o endpoint persiste o envelope mínimo, responde rapidamente e processa em
  segundo plano, tolerando campos e eventos futuros desconhecidos;
- eventos `SUBSCRIPTION_*` descrevem a recorrência; eventos `PAYMENT_*`
  descrevem cada cobrança e seu resultado financeiro. A projeção não infere
  pagamento a partir do estado da assinatura;
- alterar assinatura afeta por padrão somente cobranças futuras. O DeuTime não
  envia `updatePendingPayments: true` automaticamente e preserva o valor
  observado de contratos existentes;
- `INACTIVE` interrompe novas cobranças e pode ser reativado com novo
  `nextDueDate`; `DELETE` também remove cobranças pendentes/vencidas e não será
  usado como cancelamento comum sem decisão operacional explícita;
- leituras autenticadas usam a projeção local. Indisponibilidade do Asaas nunca
  bloqueia time, elenco, evento, histórico ou compartilhamento manual.

Decisões ainda bloqueadoras:

- confirmar no Sandbox se `PIX` e `CREDIT_CARD` ficam disponíveis juntos no
  checkout recorrente da conta contratada;
- escolher preço de lançamento entre R$ 79,90 e piloto de R$ 59,90, benefícios
  versionados do plano `racha` e limite de uso aplicável;
- definir carência, momento efetivo do cancelamento, reativação, grandfathering
  e responsabilidade do suporte financeiro;
- comprovar alteração de valor com assinatura antiga, cobranças já geradas,
  duplicação/ordem invertida de eventos e pausa/retomada da fila de webhook.

## Consequências

- o produto não armazena dados de cartão e mantém a experiência financeira no
  checkout hospedado;
- o domínio precisa de inbox idempotente, projeção local, auditoria redigida,
  reconciliação e três kill switches independentes;
- cancelamento comercial e suspensão de benefícios permanecem operações
  distintas; nenhuma delas apaga dados esportivos;
- preço novo não migra contrato existente silenciosamente;
- CP1 não pode começar enquanto as decisões bloqueadoras e o ensaio real do
  Sandbox não estiverem concluídos.

## Validação

No Sandbox, com dados exclusivamente sintéticos:

1. consultar a conta e criar cliente demo com referência opaca;
2. criar checkout recorrente, abrir a URL hospedada e confirmar que o retorno
   permanece `pending` antes do webhook financeiro;
3. confirmar cobrança de teste e registrar eventos de checkout, assinatura e
   pagamento, repetindo o mesmo ID e invertendo a ordem no consumidor local;
4. alterar o preço sem e com cobranças pendentes, comprovando grandfathering;
5. inativar, reativar com novo vencimento e verificar cobranças existentes;
6. simular token inválido, timeout, resposta não 200 e recuperação da fila;
7. documentar IDs apenas de forma redigida e remover os dados sintéticos ao fim.

Referências oficiais verificadas em 03/09/2026:

- [Sandbox](https://docs.asaas.com/docs/sandbox);
- [Asaas Checkout](https://docs.asaas.com/docs/asaas-checkout);
- [FAQ do Asaas Checkout](https://docs.asaas.com/docs/faq-do-asaas-checkout);
- [recebimento e autenticação de Webhooks](https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook);
- [eventos para assinaturas](https://docs.asaas.com/docs/eventos-para-assinaturas);
- [FAQ de assinaturas](https://docs.asaas.com/docs/faq-assinaturas);
- [atualização de assinatura](https://docs.asaas.com/reference/atualizar-assinatura-existente).

## Plano de migração e reversão

1. concluir CP0 no Sandbox sem tocar produção;
2. publicar em CP1 apenas contrato, projeção e controles inertes;
3. validar app e banco nas duas ordens antes de adicionar consumidor;
4. liberar checkout e consumo de eventos somente para uma coorte demo;
5. desligar primeiro criação comercial e depois consumo/aplicação de suspensão
   diante de incidente, preservando projeção e fallback manual;
6. trocar o adapter sem reinterpretar eventos antigos ou cancelar assinatura no
   provedor automaticamente.
