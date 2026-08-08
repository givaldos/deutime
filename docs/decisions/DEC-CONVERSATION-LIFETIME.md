# DEC-CONVERSATION-LIFETIME — Janela, acesso e retenção da conversa da súmula

- Status: accepted
- Data: 2026-08-08
- Release: R06
- Dependências: `DEC-PERSISTENT-ACCESS`, `DEC-ANONYMOUS-RETENTION`,
  `DEC-PUBLIC-PRIVACY`

## Contexto

A conversa da súmula precisa continuar útil depois do jogo sem virar um chat
geral permanente. Comentários são identificados, podem conter dados pessoais e
precisam de denúncia e moderação. O link encaminhado da R02 não pode ganhar
permissão de comentário, e remover alguém do time deve retirar acesso
imediatamente sem reescrever silenciosamente o histórico.

Também é necessário definir quando a escrita termina. Uma janela indefinida
amplia abuso e custo de moderação; uma janela curta demais interrompe a conversa
normal de um time que joga semanalmente.

## Opções consideradas

1. **Conversa permanente:** simples, mas transforma a súmula em chat geral e
   mantém uma superfície de abuso sem prazo.
2. **Escrita por 24 horas e descarte imediato:** minimiza retenção, mas perde a
   conversa assíncrona comum depois do jogo e inviabiliza moderação posterior.
3. **Escrita por sete dias, leitura privada por dois anos:** acompanha o ciclo
   semanal, fecha novas interações automaticamente e preserva evidência pelo
   prazo já aceito para comentários.

## Decisão

Adotar a terceira opção.

### Audiência e renovação de acesso

- somente identidade completa e verificada pode ler, comentar, responder,
  denunciar ou moderar; capability do evento, link público e sessão anônima
  nunca bastam;
- staff ativo do mesmo time pode participar e moderar;
- atleta pode participar somente se pertencer ao snapshot SIM/TALVEZ congelado
  para a partida e continuar ativo, aprovado e vinculado ao mesmo time;
- o snapshot usa `athlete_id`, permitindo que uma pessoa elegível ainda não
  reivindicada ganhe acesso apenas depois do OTP que vincular seu `user_id`;
- não existe token ou sessão própria da conversa. A renovação usa a sessão
  verificada já existente, e cada RPC recalcula vínculo, snapshot, time, flag,
  estado da partida e prazo;
- remover/inativar vínculo ou desligar a flag revoga imediatamente leitura e
  escrita. Reativar a flag não recria snapshot ausente nem amplia a audiência;
- a conversa é privada. Identidade e conteúdo nunca entram na página pública,
  Open Graph, analytics, logs ou capability pessoal do evento.

### Janela e ciclo de vida

- a escrita abre quando a partida é finalizada e fecha exatamente sete dias
  após `finalized_at`; não existe extensão manual ou renovação da janela no MVP;
- depois do fechamento, a conversa fica somente leitura para a mesma audiência;
  autor ainda pode apagar o próprio conteúdo e staff ainda pode moderar;
- partida anulada não abre conversa. Cancelamento ou correção posterior fecha
  novas escritas sem apagar conteúdo já persistido;
- comentários, respostas, denúncias e evidência de moderação são eliminados
  dois anos após `finalized_at` ou com a remoção do time;
- a limpeza é transacional, idempotente e exclusiva de `service_role`. Métricas
  agregadas sem texto ou identidade podem permanecer.

### Conteúdo, respostas e moderação

- comentário é texto simples entre 1 e 1.000 caracteres; anexos, HTML e links
  clicáveis ficam fora do MVP;
- respostas têm somente um nível. A raiz pertence à mesma partida/time e não
  pode ser trocada depois da criação;
- autoria é derivada de `auth.uid()` e projetada com nome de exibição interno;
  o cliente nunca fornece autor, papel ou time;
- comentário não é editado. O autor pode fazer soft-delete a qualquer momento;
  respostas permanecem com o marcador “Comentário removido” na raiz;
- uma pessoa pode denunciar cada comentário no máximo uma vez. Denúncia não
  oculta automaticamente o conteúdo e a identidade do denunciante não aparece
  na conversa;
- staff pode ocultar ou restaurar conteúdo com motivo obrigatório. A auditoria
  guarda IDs, ator, ação e motivo sanitizado, nunca o corpo integral;
- escrita usa chave idempotente por requisição e limites por autor/time. Falha,
  repetição ou concorrência não cria comentário duplicado.

## Consequências

- o mesmo jogo semanal possui uma conversa útil, mas não cria um chat eterno;
- acesso encaminhado continua limitado à confirmação e exige OTP antes da
  conversa;
- o snapshot da conversa é independente da flag `voting`; R06 não pode depender
  de salts ou retenção das cédulas da R05;
- partidas finalizadas antes da criação do snapshot permanecem somente leitura
  sem conversa, evitando backfill de audiência;
- exclusão de conteúdo e moderação preservam contexto sem publicar texto ou
  identidade fora da audiência privada.

## Validação

- pgTAP positivo para staff e atleta SIM/TALVEZ verificado;
- negativos para anônimo, capability, NÃO/PENDENTE, removido, janela fechada,
  partida anulada, flag desligada, cross-match e cross-tenant;
- concorrência e replay provam idempotência; limites cobrem abuso por autor;
- testes de retenção preservam nenhuma identidade ou corpo após dois anos;
- Android/iPhone confirmam leitura, resposta, denúncia, soft-delete e fallback
  somente leitura na agenda do atleta.

## Migração e reversão

- criar tabelas, snapshot, RPCs e grants por expansão inerte atrás de
  `comments`, que já existe e permanece desligada;
- congelar snapshot somente para partidas finalizadas com a flag ativa; não
  fazer backfill automático;
- aplicação tolera RPC ausente e omite a conversa;
- rollback desliga `comments` e preserva comentários para moderação/retenção;
  correções de schema são sempre forward-only.
