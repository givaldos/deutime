# Contexto canônico do produto

Este arquivo reúne somente fatos e regras estáveis que uma feature pode referenciar por ID. Detalhes e prioridades ficam no roadmap; decisões arquiteturais extensas seguem o processo de [ADR](decisions/README.md) quando promovidas para execução.

## Passado implementado

- `BASE-IDENTITY`: atletas que reivindicaram o cadastro possuem identidade global separada do vínculo `athletes` por time, com OTP no WhatsApp; cadastros administrativos ainda podem existir sem `user_id`.
- `BASE-TENANCY`: isolamento multi-time por `team_id`, RLS deny-by-default, PII separada e pgTAP.
- `BASE-SERIES`: recorrência materializa eventos independentes; edição preserva respostas e exceções passadas.
- `BASE-ATTENDANCE`: `event_attendance` inclui pendente, SIM, NÃO, TALVEZ e lista de espera; a auto-resposta aceita somente SIM/NÃO/TALVEZ para vínculo ativo, evento agendado e futuro e prazo aberto.
- `BASE-MATCH-REPORT`: o contrato expandido aceita zero ou muitas `event_matches` por evento, cada uma com dois lados, participação real e fatos esportivos próprios; a súmula legada de uma partida permanece como compatibilidade, correções são auditadas e estatísticas continuam derivadas do estado finalizado, sem contador paralelo.
- `BASE-PUBLIC`: time, evento e atleta possuem projeções públicas mínimas controladas por flags; escalações explicitamente publicadas limitam cada atleta ao primeiro nome, enquanto atribuições esportivas ampliadas recalculam em cada leitura o consentimento versionado e revogável `public_sports_activity`. O booleano administrativo legado do BID não reivindicado permanece apenas para compatibilidade até sua contração.
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
- [`DEC-PUBLIC-PRIVACY`](decisions/DEC-PUBLIC-PRIVACY.md): placar e fatos por lado podem ser publicados pelo time; a escalação explicitamente publicada pode mostrar somente o primeiro nome, enquanto identidade ampliada e atividade esportiva exigem consentimentos próprios, específicos, versionados e revogáveis. Capability pessoal não revela terceiros e staff não consente pelo atleta.
- [`DEC-EVENT-SHARE-PHASE`](decisions/DEC-EVENT-SHARE-PHASE.md): metadata, HTML e imagem do evento derivam da mesma projeção anônima e avançam na URL canônica por cancelamento, partida ao vivo, votação, resultado, placar, escalação e chamada; sessão ou capability nunca ampliam o preview, e empate ou ausência de consentimento preservam resultado agregado sem identidade.
- [`DEC-CHAMPIONSHIP-MODEL`](decisions/DEC-CHAMPIONSHIP-MODEL.md): campeonato pertence a um único tenant e agrega participantes próprios e confrontos vinculáveis a partidas; três formatos usam regulamento fechado, classificação e chaveamento reconstruíveis, correções auditadas e publicação anônima mínima em `/c/{public_id}`.
- [`DEC-ANONYMOUS-RETENTION`](decisions/DEC-ANONYMOUS-RETENTION.md): voto usa pseudônimo derivado no servidor com salt privado por partida; recibo opaco expira em sete dias e o pseudônimo é removido após 90 dias sem alterar o agregado.
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

- [`DEC-WHATSAPP-PROVIDER`](decisions/DEC-WHATSAPP-PROVIDER.md) — `accepted`: R03 usa Twilio Programmable Messaging + Content API atrás de adapter provider-neutral; OTP do Supabase permanece separado, Sandbox é somente demo e produção real exige sender próprio, template aprovado e webhook assinado.
- [`DEC-WHATSAPP-DISPATCH-SAFETY`](decisions/DEC-WHATSAPP-DISPATCH-SAFETY.md) — `accepted`: retry automático termina antes da barreira de efeito; resultado externo ambíguo exige reconciliação manual e credenciais personalizadas nunca são persistidas em claro.
- [`DEC-CONVERSATION-LIFETIME`](decisions/DEC-CONVERSATION-LIFETIME.md) — `accepted`: escrita por sete dias após a finalização, leitura privada durante retenção de dois anos e acesso sempre recalculado pela sessão verificada, sem token próprio da conversa.
- [`DEC-RECOGNITION-MODEL`](decisions/DEC-RECOGNITION-MODEL.md) — `accepted`: R10 adota cartões factuais derivados de súmula finalizada e resultado agregado do Craque, sem pontos ou ranking; a coorte atingiu compreensão `3/3` e intenção positiva `3/3`, autorizando somente implementação por pacotes atrás da flag desligada.
- `DEC-BALANCE-OBJECTIVE` — `accepted`: a sugestão distribui somente confirmados elegíveis, espalha primeiro preferências de goleiro, minimiza a diferença de quantidade entre equipes e usa ordem determinística por evento; não atribui nota oculta, preserva ajuste manual e exige publicação explícita.
- `DEC-INTERNAL-SQUAD-IDENTITY` — `accepted`: a organização mantém equipes internas persistentes, com nome, cor e escudo SVG padronizado; cada equipe do evento referencia essa identidade e guarda um snapshot visual, permitindo estatísticas futuras derivadas de partidas encerradas sem reescrever o histórico. Para owner/admin, salvar a divisão também publica ou atualiza a revisão; manager mantém somente o rascunho privado.
- `DEC-EVENT-SURFACE-FOCUS` — `accepted`: a página aberta do evento concentra situação do jogo, divisão e chamada; compartilhar é uma ação única e compacta que envia contexto e URL em um bloco ordenado, com fallback de cópia. Configurações de lembretes automáticos e envio manual ficam recolhidas em Editar. Na divisão explicitamente publicada, somente o primeiro nome chega ao HTML e à imagem, distribuído em uma formação visual de campo que não representa posição esportiva real.

Lembrete de pendência, regra de arredondamento, textos, layouts, thresholds de retry/rate limit e parâmetros de métricas podem ser fechados no pacote correspondente; não bloqueiam a arquitetura anterior.

## Como usar

Um pacote de release lista somente os IDs aplicáveis. O agente lê esta definição e, se o ID estiver `open`, não implementa contrato dependente até que exista uma decisão registrada. Não copie a regra inteira para a issue, código e PR: referencie o ID e mantenha uma única fonte.
