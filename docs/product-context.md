# Contexto canônico do produto

Este arquivo reúne somente fatos e regras estáveis que uma feature pode referenciar por ID. Detalhes e prioridades ficam no roadmap; decisões arquiteturais extensas seguem o processo de [ADR](decisions/README.md) quando promovidas para execução.

## Passado implementado

- `BASE-IDENTITY`: atletas que reivindicaram o cadastro possuem identidade global separada do vínculo `athletes` por time, com OTP no WhatsApp; cadastros administrativos ainda podem existir sem `user_id`.
- `BASE-TENANCY`: isolamento multi-time por `team_id`, RLS deny-by-default, PII separada e pgTAP.
- `BASE-SERIES`: recorrência materializa eventos independentes; edição preserva respostas e exceções passadas.
- `BASE-ATTENDANCE`: `event_attendance` inclui pendente, SIM, NÃO, TALVEZ e lista de espera; a auto-resposta aceita somente SIM/NÃO/TALVEZ para vínculo ativo, evento agendado e futuro e prazo aberto.
- `BASE-MATCH-REPORT`: súmula atual é única por evento, pode nascer como rascunho antes do jogo e aceita correções auditadas depois do encerramento; estatísticas continuam derivadas do estado finalizado, sem contador paralelo.
- `BASE-PUBLIC`: time e atleta possuem projeções públicas mínimas controladas pelas flags atuais; BID não reivindicado ainda pode usar uma flag administrativa sem evidência específica do atleta, lacuna coberta por `DEC-PUBLIC-PRIVACY`.
- `BASE-WRITES`: mutações centrais do domínio seguem Server Action fina e RPC transacional com autorização revalidada; tabelas usam RLS, uploads usam Storage RLS e parte da auditoria por trigger ainda não possui garantia transacional uniforme.
- `BASE-DELIVERY`: o repositório configura CI de qualidade, banco, dependências, CodeQL e Terraform e contém mecanismos independentes de publicação; o Git não comprova que todos estejam habilitados ou saudáveis em produção.

O prefixo `BASE-*` descreve o repositório atual, não uma regra imutável. Quando uma release substituir o comportamento, ela atualiza este arquivo no mesmo pull request.

## Invariantes

- `INV-MOBILE-WHATSAPP-FIRST`: toda jornada nasce para celular e usa o WhatsApp como principal porta de entrada quando houver comunicação.
- `INV-RLS-MULTI-TIME`: nenhuma interface, flag ou token substitui autorização server-side e isolamento no banco.
- `INV-DEPLOY-COMPATIBLE`: aplicação e schema funcionam nas duas ordens possíveis de deploy; mudanças destrutivas usam expand/contract.
- `INV-HISTORICAL-EVENTS`: edição, cancelamento ou remoção não reescreve fatos esportivos e respostas históricas.
- `INV-CANONICAL-EVENT-URL`: derivada de `DEC-STABLE-EVENT-LINK`; o endereço público do evento permanece estável durante confirmação, escalação, súmula e histórico.
- `INV-PRIVATE-BY-DEFAULT`: dado pessoal só entra em superfície pública com consentimento específico; na dúvida, não publicar.
- `INV-SINGLE-SOURCE`: presença real, súmula, votos e tabela possuem uma fonte autoritativa e projeções reconstruíveis.
- `INV-POSITIVE-GAMIFICATION`: derivada de `DEC-POSITIVE-POINTS`; gamificação não cria ranking de falta, atraso ou desistência.
- `INV-MANUAL-FALLBACK`: automação preserva um caminho manual utilizável até provar estabilidade.

Alterar uma invariante exige decisão explícita, atualização do roadmap, threat model quando aplicável e migration de compatibilidade para dados existentes.

## Decisões aceitas

- [`DEC-PERSISTENT-ACCESS`](decisions/DEC-PERSISTENT-ACCESS.md): link personalizado reutilizável cria uma capability duradoura e rotativa limitada ao atleta e evento; uma sessão completa de identidade só nasce de OTP ou de aparelho já verificado e permanece duradoura. Ambos são revogáveis e as permissões são recalculadas por fase e vínculo.
- [`DEC-EVENT-PUBLIC-MINIMUM`](decisions/DEC-EVENT-PUBLIC-MINIMUM.md): evento usa `public_id` aleatório e imutável em `/e/{public_id}`; o GET anônimo publica somente contexto esportivo mínimo, sem local exato, presença ou identidade de atleta.
- [`DEC-UNCLAIMED-IDENTITY`](decisions/DEC-UNCLAIMED-IDENTITY.md): atleta administrativo sem `user_id` pode responder por capability limitada ao atleta-evento; somente OTP reivindica a identidade e preserva o mesmo `athlete_id`.
- [`DEC-EVENT-MATCH`](decisions/DEC-EVENT-MATCH.md): evento permanece como ocorrência e URL estável de zero a muitas partidas; cada partida possui exatamente dois lados, participação real própria e fatos esportivos append-only.
- `DEC-FIXED-SHIRTS`: camisas têm identidade permanente, enquanto o elenco pode ser redistribuído a cada rodada.
- `DEC-WHATSAPP-BEFORE-AUTO-SPLIT`: confirmação confiável pelo WhatsApp precede a divisão automática como prioridade de produto.
- `DEC-PLAYER-EVALUATION`: características não formam ranking, podem ser revisadas pelo atleta e um peso de equilíbrio permanece reservado à diretoria na experiência comum.
- `DEC-STABLE-EVENT-LINK`: a mesma URL evolui de confirmação para escalação e súmula.
- `DEC-REPEATABLE-RSVP`: atleta pode mudar a resposta enquanto a confirmação estiver aberta.
- `DEC-CROWD-STAR`: SIM e TALVEZ no snapshot podem dar um voto anônimo e imutável; candidatos são apenas participantes reais; autovoto é permitido; a janela configurável termina no máximo 12 h após o jogo e o resultado fechado mostra quantidade e percentual.
- `DEC-MATCH-CONVERSATION`: diretoria e o mesmo snapshot SIM/TALVEZ podem comentar; comentários pertencem à partida, são identificados e moderáveis; não existe chat geral ou privado.
- `DEC-POSITIVE-POINTS`: pontos reconhecem ações positivas e são opcionais.
- `DEC-DEFAULT-DEADLINES`: confirmação fecha por padrão 24 h antes, lembrete geral sai 1 h antes e lembrete de pendência sempre precede o fechamento.
- `DEC-CAPTAIN-ROTATION`: cada equipe recebe um capitão por partida com sugestão em rodízio.

## Decisões bloqueadoras

- `DEC-PUBLIC-PRIVACY` — `open`: definir matriz pública/identificada para nome, foto, escalação, comentários e resultado antes de R04.
- [`DEC-WHATSAPP-PROVIDER`](decisions/DEC-WHATSAPP-PROVIDER.md) — `accepted`: R03 usa Twilio Programmable Messaging + Content API atrás de adapter provider-neutral; OTP do Supabase permanece separado, Sandbox é somente demo e produção real exige sender próprio, template aprovado e webhook assinado.
- [`DEC-WHATSAPP-DISPATCH-SAFETY`](decisions/DEC-WHATSAPP-DISPATCH-SAFETY.md) — `accepted`: retry automático termina antes da barreira de efeito; resultado externo ambíguo exige reconciliação manual e credenciais personalizadas nunca são persistidas em claro.
- `DEC-CONVERSATION-LIFETIME` — `open`: definir duração de escrita e renovação de acesso da conversa antes de R06.
- `DEC-ANONYMOUS-RETENTION` — `open`: definir descarte de recibos/cédulas e retenção de comentários antes de R05/R06.
- `DEC-BALANCE-OBJECTIVE` — `open`: definir restrições, preferências e medida de equilíbrio antes de R08.

Lembrete de pendência, regra de arredondamento, textos, layouts, thresholds de retry/rate limit e parâmetros de métricas podem ser fechados no pacote correspondente; não bloqueiam a arquitetura anterior.

## Como usar

Um pacote de release lista somente os IDs aplicáveis. O agente lê esta definição e, se o ID estiver `open`, não implementa contrato dependente até que exista uma decisão registrada. Não copie a regra inteira para a issue, código e PR: referencie o ID e mantenha uma única fonte.
