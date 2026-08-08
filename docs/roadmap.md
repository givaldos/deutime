# DeuTime — Roadmap executivo

> Atualizado em 1º de agosto de 2026.

Este é o índice curto de direção e sequência. O detalhamento funcional está no [Catálogo de capacidades](backlog.md), as regras estáveis no [Contexto canônico](product-context.md) e a execução no [Playbook](development.md).

**Legenda:** ✅ concluído · 🟡 em execução ou fundação parcial · ⚪ não iniciado

## Passado — base comprovada

O produto já possui:

- ✅ SaaS multi-time com RLS, PII separada, CI, pgTAP e infraestrutura como código;
- ✅ identidade global para atletas reivindicados e vínculo independente por time;
- ✅ onboarding, convites, BID, agenda avulsa/recorrente e confirmação autenticada;
- ✅ súmula administrativa com placar, lances, encerramento e correções auditadas;
- ✅ página pública do time, perfil público consentido e mídia privada;
- ✅ perfil pessoal editável, incluindo foto global com recorte, troca, remoção e exibição pública consentida;
- 🟡 OTP no WhatsApp está disponível; outbox, worker e callback já passaram por uma entrega física controlada, mas a automação geral ainda não foi liberada.

O padrão técnico comprovado é uma fatia vertical: UI mobile → Server Action fina → RPC transacional → autorização/RLS → testes e auditoria. Os fatos exatos possuem IDs `BASE-*` no contexto canônico.

## Presente — preparar e entregar o ciclo confiável

| Release | Estado | Resultado | Pacote |
|---|---|---|---|
| **R00 — Fundação de entrega** | ✅ `done` | Ativação controlada, deploy compatível e smoke test para o fluxo local + produção do MVP. | [Abrir](releases/R00-fundacao-de-entrega.md) |
| **R01 — Evento sob controle** | ✅ `done` | Fuso correto e cancelamento/remarcação com histórico preservado. | [Abrir](releases/R01-evento-sob-controle.md) |
| **R02 — Confirmação pelo link** | 🟡 `active` — 9/10 critérios | URL, capability duradoura, revogação e SIM/NÃO/TALVEZ pelo link concluídos; falta a validação móvel final. | [Abrir](releases/R02-confirmacao-pelo-link.md) |
| **R03 — WhatsApp ponta a ponta** | 🟡 `active` — 7/10 critérios | Envio físico, worker, callback e card contextual validados em piloto restrito; sender oficial e fechamento operacional ainda pendentes. | [Abrir](releases/R03-whatsapp-ponta-a-ponta.md) |

R00 e R01 estão concluídas. R02 está em fechamento de validação e R03 está em piloto controlado. Pacotes de descoberta podem fechar decisões da release consumidora, mas implementação não começa com decisão que altere schema, autorização ou contrato público ainda aberta.

Na R02, `AC-R02-01` a `08` e `AC-R02-10` estão concluídos. Falta somente `AC-R02-09`: validar em Android, iPhone, navegador interno do WhatsApp e navegador padrão, incluindo o retorno em outro dia. Até essa evidência ser registrada, a release permanece `active`, sem ser apresentada como concluída.

Na R03, `AC-R03-01` a `05`, `07` e `08` estão concluídos. A infraestrutura já realizou uma entrega física controlada e processou `accepted → sent → delivered → read`. Faltam:

- `AC-R03-06`: homologar o número oficial, recriar o card no campo correto, registrar o novo Content SID e aprovar o template definitivo;
- `AC-R03-09`: executar a prova final em Android e iPhone com sender próprio antes de enviar para atletas reais;
- `AC-R03-10`: fechar a evidência operacional de cancelamento, remarcação, opt-out e remoção sem reenvio incompatível;
- encerrar o piloto com consumo desligado por padrão, fallback manual preservado, evidências no pacote e checkpoint em `idle`.

A página do evento e seu Open Graph contextual já reutilizam a imagem oficial do convite. A evolução ainda prevista inclui o escudo específico do time com fallback da marca e cartões enriquecidos conforme a fase do evento. Local, escalação, placar, votação e vencedor só entram quando forem públicos; identidade pessoal, credencial e dados sem consentimento nunca entram no cartão.

Depois de fechar o envio inicial da R03, a próxima fatia reutilizará a mesma outbox para **dois lembretes de confirmação por evento**. Os alertas do time definirão os horários, e o evento poderá receber ajustes administrativos antes do disparo. “Não confirmou” significa atleta elegível que ainda não respondeu **SIM**, **NÃO** nem **TALVEZ** no momento efetivo do envio; consentimento revogado, telefone inválido, evento cancelado ou prazo encerrado também impedem o envio.

O admin poderá usar **Enviar lembrete agora** para antecipar a próxima cota ainda pendente. O envio manual consumirá essa cota e cancelará seu agendamento automático, portanto nunca criará um terceiro lembrete. Sem destinatários, o envio manual não consumirá a cota; uma execução automática vazia será encerrada como `skipped`, sem chamada ou custo do provedor.

A lista será recalculada imediatamente antes de produzir a outbox. Cada atleta poderá receber no máximo uma mensagem por cota; clique repetido, retry, concorrência ou reprocessamento reutilizarão a mesma chave idempotente. O admin verá o estado de cada cota e os totais agregados de destinatários, entrega e custo.

## Futuro — releases verticais

| Release | Estado | Resultado autossuficiente | Depende de | Decisão antes de promover | Fallback |
|---|---|---|---|---|---|
| **R04 — Partida ao vivo e pós-jogo** | ⚪ `não iniciado` | Presença real, transmissão opcional, lances em tempo real e timeline final na mesma página. | R02 | `DEC-EVENT-MATCH`, `DEC-PUBLIC-PRIVACY` | Súmula administrativa e atualização manual |
| **R05 — Craque da Galera** | ⚪ `não iniciado` | Voto único anônimo, candidatos presentes e resultado agregado. | R04 | `DEC-ANONYMOUS-RETENTION` | Súmula sem votação |
| **R06 — Conversa da súmula** | 🟢 `ready` | Comentários identificados, respostas, denúncia e moderação. | R02, R04 | `DEC-CONVERSATION-LIFETIME`, `DEC-ANONYMOUS-RETENTION` aceitas | Súmula somente leitura |
| **R07 — Times manuais compartilháveis** | ⚪ `não iniciado` | Divisão acessível, publicação e imagem pelo mesmo link. | R02 | `DEC-EVENT-MATCH` | Lista de confirmados |
| **R08 — Divisão automática** | ⚪ `não iniciado` | Sugestão reproduzível, ajustável e explicável. | R03, R07 | `DEC-BALANCE-OBJECTIVE` | Divisão manual |
| **R09 — Campeonatos, camisas e tabela** | ⚪ `não iniciado` | Campeonato configurável, partidas vinculadas, classificação ou chaveamento e histórico. | R04, R07 | `DEC-EVENT-MATCH` e modelo de campeonato | Histórico por partida |
| **R10 — Reconhecimento** | ⚪ `não iniciado` | Pontos positivos, Craques e perfis consentidos. | R04, R05 | — | Estatísticas básicas |

Depois de estabilizar os contratos da R02, R04 e R07 podem avançar como trilhas independentes da automação restante da R03. R05 e R06 não esperam divisão automática nem tabela.

Na R04, a mesma URL pública do evento evoluirá conforme a partida:

- **antes do jogo:** escudo do time, contexto do evento, chamada ou escalação autorizada e link opcional de transmissão;
- **durante o jogo:** vídeo do YouTube ou Vimeo, quando configurado pelo admin, placar e timeline de lances atualizados em tempo real;
- **depois do jogo:** súmula, placar final e timeline cronológica de gols, assistências, cartões, substituições e demais ocorrências registradas.

Antes de lançar estatísticas, uma pessoa administradora autorizada marcará quem efetivamente entrou em campo. Essa presença real, separada das respostas **SIM** e **TALVEZ**, será a fonte única para atribuir gols, assistências, cartões, pontuação futura e candidatura ao Craque da Galera. A lista será congelada com a súmula final; correções posteriores exigirão motivo e auditoria.

Os lances serão gravados primeiro na fonte transacional e somente depois distribuídos em tempo real. Se o canal ao vivo falhar, o registro administrativo continuará funcionando e a página voltará a consultar os dados persistidos, sem perder ou duplicar lances. Em eventos com várias partidas, presença, placar e timeline serão independentes por confronto.

O admin poderá cadastrar somente URLs validadas de YouTube ou Vimeo. A mídia será carregada com proteção contra rastreamento e sem transmitir credencial, identidade ou endereço personalizado a terceiros; sem vídeo válido, a página preservará normalmente placar e timeline.

Na R09, uma pessoa administradora autorizada poderá criar e configurar o campeonato em um dos formatos:

- **pontos corridos**, com classificação por pontos e critérios de desempate;
- **fase de grupos + mata-mata**, com classificação por grupo e avanço para o chaveamento;
- **mata-mata**, com confrontos eliminatórios desde a primeira fase.

O campeonato será associado às partidas, não diretamente ao evento. Assim, um evento poderá conter um ou mais confrontos, cada um ligado à fase ou rodada correta, enquanto amistosos continuarão existindo sem campeonato. Encerramentos e correções de súmula deverão atualizar classificação, grupos ou chaveamento de forma transacional e auditável.

Antes de promover a R09, a descoberta deverá fechar os participantes aceitos, configuração de pontuação e desempate, geração ou edição de confrontos, tratamento de empate no mata-mata e publicação mobile-first compartilhável pelo WhatsApp.

Revogação administrativa, “Minha conta”, e-mails e diretório público serão promovidos do catálogo como releases independentes; não bloqueiam artificialmente o ciclo principal.

## Horizonte exploratório — marketplace do futebol amador

Depois que o ciclo principal estiver validado e houver densidade de times, atletas e partidas, o DeuTime poderá evoluir de ferramenta de organização para um marketplace completo do ecossistema do futebol amador:

- encontrar e contratar árbitros;
- encontrar organizadores para jogos, torneios e eventos;
- encontrar e reservar quadras e campos;
- encontrar empresas de churrasco, alimentação e serviços para o pós-jogo;
- descobrir outros atletas e convidá-los para times ou eventos, sempre com controles de privacidade e consentimento;
- cobrar, dividir e repassar os pagamentos do racha;
- gerar receita transacional sobre reservas, contratações e pagamentos processados pela plataforma.

Este horizonte serve apenas para orientar decisões de longo prazo. Ele não recebe número de release, pacote de trabalho, prazo ou implementação agora. Antes de ser promovido, precisa validar demanda e oferta local, confiança entre as partes, reputação, moderação, suporte e as obrigações de pagamento, antifraude, identidade, tributação e LGPD.

## Caminhos críticos

```mermaid
flowchart LR
    R00["R00 Entrega segura"] --> R01["R01 Evento sob controle"]
    R01 --> R02["R02 Mesmo link"]
    R02 --> R03["R03 WhatsApp automático"]
    R02 --> R04["R04 Partida ao vivo"]
    R02 --> R07["R07 Divisão manual"]
    R04 --> R05["R05 Craque da Galera"]
    R04 --> R06["R06 Conversa"]
    R03 --> R08["R08 Divisão automática"]
    R07 --> R08
    R04 --> R09["R09 Campeonatos"]
    R07 --> R09
    R05 --> R10["R10 Reconhecimento"]
```

## Regras de promoção

- somente releases ativas ou imediatamente seguintes recebem pacote detalhado;
- uma branch mantém uma única release vertical ativa;
- cada pacote precisa passar pela Definition of Ready do playbook;
- descoberta pode resolver uma decisão aberta; implementação dependente não pode começar antes dela;
- release nova nasce desligada, possui piloto, telemetria, fallback e rollback;
- expansão de banco é verificada antes do consumidor ou aplicação e banco toleram as duas ordens de deploy;
- segurança, privacidade, mobile, WhatsApp, documentação e operação são gates de cada release;
- ao concluir, evidências atualizam o pacote, os fatos `BASE-*` e este índice.
