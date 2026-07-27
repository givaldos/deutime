# DeuTime — Catálogo detalhado de capacidades

> Preservado em 27 de julho de 2026 durante a reorganização do desenvolvimento.

Este documento guarda o detalhamento funcional levantado no roadmap anterior. Seus checkboxes representam capacidades e critérios — não são, isoladamente, issues nem ordem de execução.

A sequência oficial fica no [Roadmap executivo](roadmap.md). Ao promover uma release, use este catálogo como matéria-prima e leve somente o recorte necessário para o pacote em [`docs/releases`](releases/README.md).

- `[x]` indica capacidade comprovadamente disponível.
- `[ ]` indica capacidade ainda não entregue por completo.
- Em caso de divergência, fatos e decisões por ID do [Contexto canônico](product-context.md) prevalecem.


## Onde estamos

**Já disponível:** cadastro de times e elenco, agenda avulsa e recorrente, confirmação de presença dentro do app, edição de eventos, súmula com placar, gols, assistências e cartões, página pública do time, perfil público do atleta e entrada do atleta pelo WhatsApp.

**WhatsApp hoje:** o número já pode ser verificado por OTP e o compartilhamento manual existe, mas chamadas, lembretes, confirmação por link e acompanhamento de entrega ainda não são automáticos.

**Divisão e escalação hoje:** `event_squads` e `lineup_spots` já existem como fundação no banco, mas não há fluxo de produto para dividir confirmados, montar escalação ou gerar uma imagem. Para o organizador, o Marco 3 continua sendo uma construção nova, sem operação legada a migrar.

**Principal atrito:** confirmar presença ainda exige sessão autenticada e cobrar quem não respondeu é um trabalho manual. O Marco 2 resolve os dois antes de investir na divisão automática.

## Vocabulário do domínio

Para evitar que “time” represente três coisas diferentes:

- **time:** a organização que administra elenco, agenda e página pública;
- **evento:** o encontro agendado, que pode ser avulso ou parte de uma série;
- **partida:** um confronto com duas equipes e um placar;
- **equipe da rodada:** o grupo de atletas escalado junto dentro de um evento ou partida;
- **camisa:** a identidade permanente de uma equipe do racha, como Verde ou Amarelo;
- **série:** a regra de recorrência que materializa eventos independentes.
- **URL canônica do evento:** endereço público e estável cujo conteúdo evolui de confirmação para escalação e, depois, súmula;
- **credencial pessoal:** segredo opaco e reutilizável do link personalizado, armazenado somente como hash, que pode criar uma capability limitada ao atleta e evento;
- **sessão duradoura:** reconhecimento persistente e rotativo da identidade no aparelho, criado após OTP ou sessão previamente verificada, que evita novo login a cada evento sem impedir revogação e revalidação por risco;
- **SIM, NÃO e TALVEZ:** nomes de produto para os estados técnicos `confirmed`, `declined` e `maybe`.

## Base já entregue

### Plataforma e segurança

- [x] Next.js, Supabase SSR, Tailwind, validação de ambiente e headers seguros.
- [x] Arquitetura multi-time com RLS deny-by-default, PII separada e testes pgTAP de isolamento.
- [x] Schema para BID, agenda, presença, equipes da rodada, escalação, consentimento, outbox e auditoria.
- [x] Workflows de CI, auditoria de dependências, CodeQL e deploy de migrations, além de Terraform e runbooks versionados.
- [x] Design system e navegação mobile-first para áreas pública, administrativa e do atleta.
- [x] Rebranding DeuTime, landing page e cartão Open Graph genérico do produto.

### Produto operacional

- [x] Onboarding com criação protegida do primeiro time, troca de time e caixa de convites.
- [x] Convites administrativos vinculados ao e-mail verificado, com hash, validade, aceite, recusa e revogação.
- [x] BID administrativo e público com aprovação independente por time, posições e remoção sem apagar o histórico esportivo.
- [x] Identidade global do atleta, reutilizada em vários times, com autenticação por OTP no WhatsApp.
- [x] Perfil pessoal editável, foto com recorte, privacidade e perfil público consentido.
- [x] Agenda avulsa ou semanal com até 52 ocorrências e chamada independente para cada evento.
- [x] Confirmação pelo atleta dentro do app e gestão da chamada pela diretoria.
- [x] Edição de uma ocorrência ou dela e das próximas, preservando exceções e respostas já registradas.
- [x] Súmula com placar, gols, assistências, cartões, correções auditadas e encerramento explícito.
- [x] Acompanhamento da partida pelo atleta e estatísticas básicas em perfis privados e públicos consentidos.
- [x] Página pública do time com sobre, redes, escudo, capa, galeria, agenda e diretório controlado pelas flags de visibilidade atuais.

## Decisões

Invariantes, decisões aceitas e bloqueadores possuem IDs no [Contexto canônico](product-context.md). Releases e issues referenciam esses IDs em vez de copiar a mesma regra.

Cada decisão fecha no último momento responsável: `DEC-EVENT-PUBLIC-MINIMUM` e `DEC-UNCLAIMED-IDENTITY` antes da R02; `DEC-WHATSAPP-PROVIDER` antes da R03; `DEC-EVENT-MATCH` e `DEC-PUBLIC-PRIVACY` antes da R04/R07; `DEC-CONVERSATION-LIFETIME`, `DEC-ANONYMOUS-RETENTION` e `DEC-BALANCE-OBJECTIVE` antes de R06, R05/R06 e R08, respectivamente. A R00 conclui o threat model de `DEC-PERSISTENT-ACCESS`, sem antecipar contratos ainda sem consumidor.

Antecedência exata do lembrete pendente, arredondamento dos votos, textos, layouts, thresholds de retry/rate limit e parâmetros de medição são detalhes do pacote correspondente, não bloqueios arquiteturais.

---

## Marco 1 — Arrumar a casa

> **Objetivo:** acabar com as situações em que alguém da equipe precisa resolver na unha.
>
> **Pronto quando:** nenhum fluxo do dia a dia depende de suporte manual.

Para liberar os envios automáticos do Marco 2, precisam estar prontos os fluxos que alteram ou invalidam uma comunicação: edição, cancelamento e remarcação de evento e revogação de acesso administrativo. Os cartões de links que só existirão nos Marcos 2 a 5 são entregues junto dos respectivos fluxos e não bloqueiam o início do Marco 2.

### 1.0 Autonomia do time e da agenda

- [x] Editar nome e modalidade do time.
- [ ] Permitir escolher o fuso do time em uma lista suportada e converter datas pelo fuso do time, não pelo dispositivo.
- [ ] Editar o apelido do link sem risco de outro time tomar o endereço e com redirecionamento seguro do endereço anterior.
- [ ] Transferir a propriedade do time, com reautenticação e confirmação das duas partes.
- [ ] Buscar e filtrar o elenco por nome, posição e situação.
- [x] Editar uma ocorrência isolada ou ela e as próximas sem alterar respostas e exceções anteriores.
- [x] Concluir um evento ao finalizar a súmula.
- [ ] Cancelar um evento ou uma ocorrência, comunicando os afetados e preservando o histórico.
- [ ] Definir o número máximo de atletas por evento.
- [ ] Estender de forma idempotente a agenda de uma série semanal.
- [ ] Editar ou cancelar uma série sem reescrever ocorrências passadas.
- [ ] Ajudar o atleta a reivindicar um cadastro antigo feito pela diretoria quando o telefone coincidir, com caminho explícito para duplicidade ou conflito.

### 1.1 Identidade nos e-mails automáticos

Os e-mails devem usar o brasão e o visual do **deutime.app**, em português e com o mesmo tom do produto.

- [x] Aplicar assuntos, textos em português e cores DeuTime aos e-mails de confirmação de cadastro, recuperação de senha e aviso de senha alterada.
- [ ] Completar esses três modelos com brasão, layout e rodapé da marca.
- [ ] Cobrir também convite, link de acesso, troca de e-mail e reautenticação.
- [ ] Padronizar assunto e texto, incluindo o nome do time quando fizer sentido.
- [ ] Adotar um rodapé único com links para o site e o suporte.
- [ ] Conferir Gmail, Apple Mail e Outlook no celular e no computador.
- [ ] Manter os modelos em uma única fonte, sem duplicação entre configuração local e infraestrutura.

### 1.2 Minha conta

A conta pertence à pessoa, não ao time. Ela deve ser acessível independentemente do time selecionado e servir tanto à diretoria quanto ao atleta.

- [x] Permitir ao atleta editar nome de exibição, foto, apresentação, posições e visibilidade do perfil.
- [x] Oferecer recuperação e redefinição de senha por e-mail.
- [ ] Criar a área “Minha conta”, separada das configurações do time e acessível de qualquer área autenticada.
- [ ] Trocar a senha informando a senha atual.
- [ ] Definir uma senha para quem entrou apenas pelo WhatsApp e nunca teve uma.
- [ ] Trocar o e-mail com confirmação no endereço novo e aviso no antigo.
- [ ] Cadastrar ou trocar o telefone do WhatsApp, confirmando a posse por código.
- [ ] Recuperar o acesso pelo e-mail ou WhatsApp.
- [ ] Ver os aparelhos com sessão aberta e encerrar qualquer sessão.
- [ ] Escolher notificações por WhatsApp, e-mail ou ambos.
- [ ] Sair de um time sem apagar a conta.
- [ ] Encerrar a conta por conta própria, explicando o que será anonimizado e o que permanecerá no histórico dos times.

### 1.3 Quem organiza com você

O gerenciamento de acesso precisa ser à prova de erro e ter efeito imediato.

- [x] Vincular cada convite ao e-mail verificado do destinatário.
- [x] Aplicar validade, aceite ou recusa explícita e uso único.
- [x] Listar convites pendentes e permitir cancelamento que invalida o link imediatamente.
- [x] Restringir os papéis que cada função pode convidar.
- [ ] Listar todos os responsáveis ativos, com papel, data de entrada, quem convidou e último acesso.
- [ ] Reenviar um convite pendente gerando um link novo e invalidando o anterior.
- [ ] Revogar acesso ativo com efeito imediato, inclusive em sessões já abertas.
- [ ] Trocar o papel de quem já está no time sem remover e convidar novamente.
- [ ] Impedir promoção própria ou concessão de papel acima do papel de quem executa a ação.
- [ ] Garantir o fluxo de transferência antes da saída ou remoção do último dono.
- [ ] Exibir o histórico de convite, aceite, mudança de papel e remoção com autor, data e hora.
- [ ] Avisar a pessoa quando ela ganha, muda ou perde acesso.

### 1.4 Pré-visualização dos links

Esta é uma regra transversal. O cartão genérico pertence ao Marco 1; os cartões de confirmação, escalação, evento e placar entram junto dos fluxos que lhes fornecem os dados.

**Regra geral**

- [x] Site e páginas sem contexto público específico usam um cartão genérico da marca.
- [x] Áreas privadas não são indexadas e não expõem dados privados em metadados.
- [ ] Todo link público deve explicar o contexto em uma linha para quem ainda não conhece o DeuTime.
- [ ] Todo tipo novo de link deve nascer com metadados e imagem de compartilhamento definidos.

**Por tipo e estado do link**

- [ ] **Página do time:** brasão, nome, recorrência principal e tamanho do elenco público.
- [ ] **Evento com chamada aberta:** ação de confirmar, data e horário, sem revelar a identidade vinculada à credencial pessoal.
- [ ] **Evento com chamada fechada:** informações públicas, camisas e escalação publicada.
- [ ] **Evento encerrado:** placar e súmula; enquanto a votação estiver aberta, anunciar genericamente “votação aberta”, sem personalizar o cartão.
- [ ] **Resultado do Craque da Galera:** destacar vencedor, quantidade de votos, percentual e total de votos válidos, respeitando o consentimento para exposição pública.
- [ ] **Perfil do atleta:** nome, posições e times, apenas quando o próprio atleta autorizar.
- [ ] **Convite para organizar:** remetente, time e papel, sem expor o e-mail convidado.

**Cuidados**

- [ ] Nunca incluir em cartão o nome de quem não autorizou exposição pública.
- [ ] Usar textos em português, sem código, token ou endereço cru.
- [ ] Fazer crawlers e previews ignorarem a credencial pessoal; segredo nunca entra em URL canônica, Open Graph, logs analíticos ou cabeçalho `Referer`.
- [ ] Atualizar automaticamente o cartão conforme a URL avança entre chamada, escalação, súmula, votação e resultado.
- [ ] Conferir a renderização no WhatsApp, Instagram, Telegram e iMessage, priorizando o WhatsApp.

---

## Marco 2 — Tudo pelo WhatsApp

> **Objetivo:** o atleta confirma presença sem senha, direto do WhatsApp, e o organizador para de cobrar um por um.
>
> **Pronto quando:** um evento recorrente atravessa todo o ciclo de confirmação sem cobrança manual.
>
> **Como medimos:** pelo menos 8 em cada 10 atletas respondem antes do prazo fechar.

Antes do piloto, a medição deve definir janela e amostra mínima e considerar no denominador somente atletas elegíveis para responder e com canal autorizado.

O caminho principal deste marco começa na mensagem do WhatsApp e termina na ação concluída em uma tela móvel. E-mail, desktop e navegação interna continuam disponíveis, mas não definem a experiência primária.

### 2.1 Prazos do evento e do pós-jogo

- [x] Registrar prazo de confirmação por evento e impedir que o atleta responda depois dele.
- [x] Persistir o fuso no time e usá-lo na materialização das séries.
- [ ] Converter a entrada e a edição de data pelo fuso do time, independentemente do fuso do navegador.
- [ ] Configurar no time quatro momentos: abertura da chamada, lembrete de pendência, fechamento e lembrete geral do evento.
- [ ] Oferecer como padrão: abertura na criação, fechamento 24 h antes e lembrete geral 1 h antes; definir o padrão da pendência na descoberta.
- [ ] Na mesma área administrativa, configurar a duração padrão da votação do Craque da Galera, limitada a no máximo 12 h após o fim da partida; a ativação pertence ao Marco 5.3.
- [ ] Fazer o evento herdar os padrões e permitir alteração caso a caso, indicando o que foi personalizado.
- [ ] Permitir alteração pós-prazo somente pela diretoria, registrando autor e justificativa.
- [ ] Impedir combinações sem sentido e recalcular os disparos com segurança quando a data mudar.

### 2.2 Consentimento e mensagens

- [x] Persistir a escolha feita no checkbox de WhatsApp com data e evidência do telefone verificado.
- [ ] Exigir ação afirmativa em um checkbox desmarcado por padrão e registrar a versão e a finalidade do consentimento.
- [ ] Permitir revogação a qualquer momento e aplicar o opt-out antes de cada envio.
- [ ] Criar as mensagens de chamada aberta, lembrete para pendentes e lembrete geral.
- [ ] Definir o contrato da mensagem “escalação publicada”; a ativação do disparo pertence ao Marco 3.4.
- [ ] Definir o contrato da mensagem “súmula pronta e votação aberta”; a ativação do disparo pertence ao Marco 5.3.
- [ ] Pré-visualizar e testar cada mensagem antes de ativá-la.
- [ ] Versionar o texto e a evidência de consentimento usados em cada envio.

### 2.3 Confirmação por link, sem senha

- [ ] Criar uma URL canônica, pública e estável por evento; a credencial pessoal apenas identifica e habilita ações nessa página.
- [ ] Abrir a URL direto na resposta quando houver uma credencial pessoal ou sessão duradoura válida, sem exigir senha, código ou uma busca manual pelo evento.
- [ ] Exibir as opções **SIM**, **NÃO** e **TALVEZ**, sempre mostrando a resposta atual.
- [ ] Permitir reutilizar o mesmo link recebido no WhatsApp e mudar a resposta enquanto o prazo estiver aberto; a credencial não é consumida no primeiro acesso.
- [ ] Na primeira abertura válida, trocar a credencial do link por uma capability duradoura limitada ao evento, redirecionando para a URL canônica limpa.
- [ ] Emitir sessão completa da identidade somente após OTP ou quando o aparelho já possuir uma sessão verificada; o link isolado nunca amplia acesso para outros eventos ou times.
- [ ] Manter o acesso reconhecido entre confirmação, escalação, súmula, conversa, votação e consulta posterior ao histórico; cada ação continua limitada server-side pela fase do evento e pelo vínculo atual.
- [ ] Quando o navegador interno do WhatsApp não preservar a sessão, permitir que o link personalizado duradouro restabeleça o contexto sem novo OTP, salvo revogação ou sinal de risco.
- [ ] Armazenar apenas hashes das credenciais e dos artefatos de renovação; limitar credencial e capability ao par evento-atleta e a sessão completa às permissões atuais da identidade.
- [ ] Rotacionar a sessão e permitir revogar credencial, aparelho ou todos os acessos sem quebrar a URL pública do evento.
- [ ] Remover a credencial da barra de endereço e impedir sua presença em Open Graph, analytics, logs, histórico desnecessário ou cabeçalho `Referer`.
- [ ] Encerrar no prazo somente o poder de alterar presença; o reconhecimento duradouro permanece disponível para as fases seguintes e para o histórico, com permissões reduzidas por fase.
- [ ] Em evento cancelado, manter a página informativa e desabilitar confirmação, comentários e voto.
- [ ] Para visitante sem credencial, mostrar apenas o conteúdo público do evento.
- [ ] Exigir sessão completa de identidade antes do primeiro comentário ou voto; pedir OTP quando o aparelho ainda não estiver verificado ou houver risco de link repassado.
- [ ] Aplicar rate limit, detecção de abuso, rotação e reidentificação adicional quando houver risco, sem criar autenticação recorrente para o uso normal.
- [ ] Registrar cada mudança de resposta sem guardar o segredo ou payloads sensíveis.
- [ ] Testar o fluxo completo a partir de uma mensagem real no WhatsApp, em Android e iPhone, cobrindo primeira abertura, retorno em outro dia, navegador interno, navegador padrão, aparelho novo e acesso revogado.

### 2.4 Envios automáticos

- [x] Manter o schema base de uma outbox de notificações desacoplada do provedor.
- [ ] Implementar o produtor idempotente que grava comandos reais na outbox.
- [ ] Implementar worker idempotente, retries com backoff, dead-letter, redaction, métricas e alertas.
- [ ] Disparar chamada, lembrete de pendência e lembrete geral conforme seus próprios gatilhos.
- [ ] Cancelar ou reagendar mensagens quando o evento for cancelado ou remarcado.
- [ ] Não enviar lembrete de pendência para quem já respondeu.
- [ ] Permitir recado avulso da diretoria para os confirmados e mostrá-lo também na página do evento.
- [ ] Validar assinatura, timestamp e replay dos webhooks.
- [ ] Mapear entrega, leitura e falha sem reter indefinidamente o payload integral do provedor.
- [ ] Instrumentar taxa de resposta, tempo até a resposta e falhas por etapa.

---

## Marco 3 — Times equilibrados

> **Objetivo:** o sistema sugere equipes, o organizador ajusta em segundos e compartilha a escalação.
>
> **Pronto quando:** a lista de confirmados vira uma imagem pronta para o WhatsApp em menos de 30 segundos.
>
> **Como medimos:** 7 em cada 10 divisões são publicadas com no máximo um ajuste manual.

Este marco é um fluxo novo. O banco já possui a estrutura inicial de equipes e posições, mas ainda não existe operação utilizável.

Antes do piloto, a medição deve definir amostra mínima, o que conta como divisão elegível e o que caracteriza um ajuste manual.

### 3.0 Modelo e divisão manual

Esta primeira entrega deve gerar valor sem depender do algoritmo.

- [ ] Implementar a divisão manual sobre `DEC-EVENT-MATCH`, fechado antes da R04/R07, inclusive quando houver mais de duas equipes no mesmo evento.
- [ ] Cadastrar de 2 a N camisas básicas com nome e cor; o brasão é opcional e recebe fallback visual.
- [ ] Criar de 2 a N equipes em um evento e distribuir apenas os confirmados entre elas.
- [ ] Marcar quem fica de fora naquela rodada.
- [ ] Salvar a divisão e sua relação com a partida para alimentar o histórico.
- [ ] Ajustar a distribuição por arrastar e soltar com alternativa acessível por teclado.
- [ ] Gerar uma imagem da escalação com a identidade DeuTime.

### 3.1 Afinidades e características do atleta

Essas informações pertencem ao vínculo com o time; a mesma pessoa pode ter perfis diferentes em organizações diferentes.

- [ ] Marcar quem deve jogar junto e quem deve ficar em equipes diferentes, com motivo opcional visível somente à diretoria.
- [ ] Oferecer características sem hierarquia, visíveis ao atleta e à diretoria:

  | Característica | O que ajuda a equilibrar |
  |---|---|
  | **Coringa** — joga em qualquer posição | Encaixa onde faltar |
  | **Goleiro** | Garante cobertura no gol |
  | **Pilar** — segura a marcação | Defesa |
  | **Maestro** — organiza e distribui | Armação |
  | **Finalizador** — bom de conclusão | Ataque |
  | **Motor** — corre o jogo inteiro | Intensidade |
  | **Muralha** — forte no jogo aéreo | Bola parada |
  | **Veloz** — bom de arranque | Velocidade |
  | **Canhoto** — perna esquerda | Distribuição de lateralidade |
  | **Ritmo intenso / Ritmo cadenciado** | Estilos neutros de ritmo |
  | **Estreante / Da casa / Veterano** | Tempo de grupo, não qualidade |

- [ ] Registrar características de organização: leva material, chega cedo, oferece carona e precisa de carona.
- [ ] Exigir consentimento específico antes de publicar qualquer característica fora da área autenticada do time.
- [ ] Manter um peso de equilíbrio opcional de 1 a 5, visível somente à diretoria e nunca chamado de “nível”.
- [ ] Permitir edição em lote das características pelo elenco.
- [ ] Auditar mudanças no peso reservado sem expô-lo em páginas, exports comuns ou metadados; solicitações formais do titular seguem a política de LGPD.

### 3.2 Divisão automática com rodízio

- [ ] Montar equipes respeitando, nesta ordem: restrições obrigatórias, afinidades, goleiros, posições, equilíbrio e rodízio.
- [ ] Lembrar com quem cada atleta apareceu na escalação publicada e reduzir repetições; quando a presença real do Marco 5 existir, usá-la para corrigir o histórico.
- [ ] Gerar uma alternativa realmente diferente ao usar “sortear de novo”.
- [ ] Explicar quais restrições não puderam ser atendidas e por quê.
- [ ] Mostrar os fatores usados em cada sugestão sem revelar o peso reservado.
- [ ] Registrar a versão do algoritmo e os parâmetros usados para reproduzir uma sugestão.

### 3.3 Capitão da partida

- [ ] Sugerir um capitão por equipe e por partida, em rodízio entre os confirmados.
- [ ] Permitir que a diretoria troque a sugestão.
- [ ] Destacar o capitão na escalação, na imagem e na página do evento.
- [ ] Manter o histórico de capitanias no perfil interno do atleta.

### 3.4 Ajuste e envio

- [ ] Avisar quando uma troca manual quebra uma afinidade ou restrição, sem impedir uma exceção intencional.
- [ ] Guardar a sugestão original e o ajuste publicado para melhorar o produto depois.
- [ ] Evoluir a imagem com brasão e cor da camisa, nomes por posição e capitão.
- [ ] Compartilhar imagem e link do evento pelo WhatsApp em um toque.
- [ ] Publicar a escalação somente após confirmação explícita da diretoria.
- [ ] Disparar a mensagem “escalação publicada” somente após a publicação da escala.

### 3.5 Partida contra adversário externo

Esta trilha entra somente depois de validar o fluxo principal de camisas rotativas.

- [ ] Montar titulares e reservas apenas com os confirmados, distribuídos por posição.
- [ ] Permitir exceção justificada quando a diretoria fugir da sugestão.

---

## Marco 4 — Camisas, partidas e tabela

> **Objetivo:** dar continuidade e história ao racha — “o Verde está em primeiro há três semanas”.
>
> **Pronto quando:** a tabela se atualiza sozinha ao encerrar cada partida.

- [ ] Evoluir as camisas básicas do Marco 3 com brasão próprio e escudo padrão na cor escolhida.
- [ ] Exibir brasão e cor na escalação, imagem do WhatsApp, súmula e tabela.
- [ ] Ligar cada equipe da rodada a uma camisa, com sugestão automática e troca manual.
- [ ] Associar escalação, lances e resultado à partida correta quando um evento tiver mais de um confronto.
- [ ] Criar tabela da temporada com pontos, jogos, vitórias, empates, derrotas, gols a favor, gols contra e saldo.
- [ ] Atualizar a tabela de forma transacional ao encerrar ou corrigir uma partida.
- [ ] Mostrar aproveitamento, sequência, maior goleada e artilharia por camisa.
- [ ] Configurar início, fim, pontuação e critérios de desempate da temporada.
- [ ] Arquivar uma temporada sem perder o histórico.
- [ ] Publicar a tabela na página do time, respeitando o consentimento individual nos dados de atletas.

---

## Marco 5 — Vitrine pública e pós-jogo

> **Objetivo:** transformar cada partida em algo fácil, seguro e divertido de compartilhar e comentar.
>
> **Pronto quando:** uma pessoa de fora entende a partida pelo link e todo atleta elegível consegue conversar de forma identificada e dar um único voto anônimo no Craque da Galera sem instalar nada.

### 5.1 Ciclo público do evento

- [ ] Evoluir a URL canônica criada no Marco 2 sem trocar o endereço que já circulou no grupo.
- [ ] Implementar os estados: **confirmação aberta → chamada fechada/escalação → súmula + conversa + votação → súmula + resultado**.
- [ ] Antes da partida, mostrar data, local público, horário, camisas e escalação publicada.
- [ ] Depois do encerramento, transformar a mesma página em súmula completa.
- [ ] Quando um evento tiver várias partidas, representar cada súmula e votação separadamente conforme `DEC-EVENT-MATCH`.
- [ ] Usar formato de futebol: cabeçalho, placar, equipes lado a lado, capitães, linha do tempo de gols, assistências e cartões e observações finais.
- [ ] Registrar na súmula o horário oficial de encerramento da partida; ele inicia e limita a janela da votação.
- [ ] Registrar em uma lista rápida quem efetivamente jogou, separando presença real de confirmação antecipada.
- [ ] Congelar na súmula final a lista de quem efetivamente jogou; essa é a fonte autoritativa dos candidatos ao Craque da Galera e da gamificação futura.
- [ ] Mostrar as formações em um campinho quando houver posições definidas.
- [ ] Exigir consentimento específico para nome, foto e link de perfil na área pública da súmula.
- [ ] Representar de forma anônima quem não consentir; não usar primeiro nome como anonimização.
- [ ] Permitir desligar a exposição pública sem retirar dos participantes identificados o acesso à própria súmula, conversa e votação.
- [ ] Aplicar o cartão de compartilhamento definido em 1.4 conforme o estado atual da página.

### 5.2 Conversa da súmula

- [ ] Adicionar comentários e respostas vinculados à partida, sem criar conversas privadas ou um chat geral.
- [ ] Permitir publicar somente à diretoria e aos atletas do snapshot **SIM** ou **TALVEZ** usado pela votação.
- [ ] Deixar claro que comentário não é anônimo: antes de publicar, a pessoa escolhe o nome de exibição e autoriza sua exposição junto do conteúdo.
- [ ] Permitir ao autor editar ou remover o próprio comentário.
- [ ] Permitir à diretoria ocultar conteúdo e bloquear novos comentários com motivo registrado, sem alterar a súmula.
- [ ] Oferecer denúncia, rate limit, proteção contra spam e regras de convivência.
- [ ] Respeitar a visibilidade da súmula: visitantes só leem a conversa quando a página estiver pública; participantes identificados continuam com acesso quando ela estiver restrita.
- [ ] Notificar respostas sem transformar cada comentário em mensagem automática obrigatória.

### 5.3 Votação do Craque da Galera

- [ ] Criar uma votação independente por partida, aberta somente após registrar o horário oficial de encerramento e finalizar a súmula.
- [ ] Herdar a duração padrão do time e permitir ajuste administrativo por evento, sem ultrapassar 12 h contadas do encerramento oficial.
- [ ] Fechar e publicar o resultado automaticamente ao atingir o prazo configurado.
- [ ] Ao abrir a votação, congelar o eleitorado com todos os atletas do evento cuja resposta esteja como **SIM** ou **TALVEZ** naquele momento.
- [ ] Garantir um caminho de identificação para todo eleitor elegível, inclusive quem ainda não reivindicou um cadastro criado pela diretoria.
- [ ] Exigir identificação server-side e rejeitar `NÃO`, pendente, lista de espera ou pessoa de outro time, mesmo com manipulação da interface.
- [ ] Preservar o snapshot depois da abertura; mudança cadastral ou de vínculo não altera silenciosamente quem já ganhou o direito de votar.
- [ ] Montar a lista de candidatos somente com quem estiver na presença real congelada na súmula final.
- [ ] Mostrar todos os candidatos aos eleitores na área identificada, mesmo sem perfil público, sem levar nomes não consentidos para HTML público ou metadados.
- [ ] Permitir autovoto sem tratamento especial; ele permanece anônimo como qualquer outra escolha.
- [ ] Aceitar exatamente uma cédula por eleitor e partida. Depois da confirmação, o voto não pode ser alterado; retry ou concorrência nunca produz duplicidade.
- [ ] Separar o recibo de elegibilidade — “esta pessoa já votou” — da cédula — “este candidato recebeu um voto” — sem chave, timestamp preciso ou log disponível ao produto que permita ligá-los.
- [ ] Não permitir leitura direta das cédulas por atleta, diretoria, suporte ou APIs administrativas; expor apenas “posso votar?”, “já votei?” e resultados agregados autorizados.
- [ ] Não mostrar resultado parcial nem lista nominal de votantes.
- [ ] Depois do fechamento, mostrar para cada candidato a quantidade de votos e o percentual sobre o total de cédulas válidas, além do total de votos da eleição.
- [ ] Calcular o percentual como `votos do candidato ÷ total de votos válidos × 100`, com regra única de arredondamento.
- [ ] Destacar o vencedor ou co-vencedores em caso de empate.
- [ ] Mostrar o resultado completo na área identificada; publicar nome, foto ou perfil na súmula pública somente com consentimento específico.
- [ ] Não converter automaticamente a vitória em pontos nem criar ranking de “mais Craques da Galera”.
- [ ] Tratar cancelamento, correção de súmula e múltiplas partidas sem reabrir ou corromper votos encerrados.
- [ ] Enviar a mensagem “súmula pronta e votação aberta” somente aos elegíveis e cancelar o disparo se a partida for anulada.
- [ ] Garantir votação completa por teclado e leitor de tela, com confirmação clara sem revelar a escolha depois do envio.

O anonimato deste marco é definido contra atletas, diretoria, suporte e superfícies operacionais do produto: nenhuma associação eleitor → candidato é armazenada ou exposta por elas. Anonimato criptográfico contra operadores da infraestrutura, WAL ou perícia de banco exige um protocolo próprio e deve ser decidido separadamente se entrar no modelo de ameaça.

### 5.4 Últimos jogos na página do time

- [ ] Mostrar os 7 eventos mais recentes com partidas encerradas, agrupando todos os confrontos do mesmo evento.
- [ ] Oferecer “ver todos” com histórico do mais recente para o mais antigo.
- [ ] Não listar eventos sem partida encerrada.

### 5.5 Elenco filtrável na página do time

- [x] Filtrar o diretório pelas flags de visibilidade já existentes.
- [ ] Exigir consentimento do próprio atleta ou evidência documentada também para cadastros administrativos ainda não reivindicados.
- [ ] Listar publicamente somente atletas com consentimento válido.
- [ ] Filtrar por posição conforme a modalidade.
- [ ] Buscar por nome dentro do elenco público.
- [ ] Mostrar contador do resultado e explicar que a lista contém somente quem escolheu aparecer.

---

## Marco 6 — Presença e gamificação

> **Objetivo:** reconhecer quem responde e quem participa, sem expor quem falta.
>
> **Pronto quando:** o atleta vê a própria pontuação do período no perfil dentro daquele time.

### 6.0 Presença para gamificação

- [ ] Reutilizar a lista de presença real congelada na súmula do Marco 5 como fonte da gamificação, sem uma segunda chamada divergente.

### 6.1 Pontuação

- [ ] Configurar pontos positivos por responder dentro do prazo e por comparecer.
- [ ] Acumular por mês, trimestre, semestre ou ano e preservar períodos anteriores.
- [ ] Mostrar a pontuação somente no perfil do atleta dentro daquele time.
- [ ] Publicar a pontuação no perfil público apenas com autorização específica e desligada por padrão.
- [ ] Garantir que nenhuma tela, exportação ou notificação ranqueie falta, atraso ou desistência.
- [ ] Permitir que cada time ative a gamificação, desligada por padrão.

### 6.2 Perfil e fotos

- [ ] Permitir que a diretoria anexe uma foto ao cadastrar o atleta.
- [x] Permitir que o atleta gerencie a própria foto global com recorte, troca e remoção.
- [x] Fazer a foto do perfil reivindicado prevalecer sobre dados administrativos do vínculo.
- [x] Reunir foto, posições e estatísticas básicas no perfil público consentido.
- [ ] Acrescentar times autorizados, números por temporada e gamificação ao perfil, cada um com consentimento próprio.

### 6.3 Reconhecimento de Craque da Galera

- [ ] Mostrar no perfil interno as partidas em que o atleta foi eleito Craque da Galera.
- [ ] Publicar a conquista no perfil público somente com consentimento específico.
- [ ] Não criar ranking entre atletas nem transformar o reconhecimento em pontos sem uma decisão posterior do time.

---

## Marco 7 — Confiança e operação

> **Objetivo:** manter o produto recuperável, auditável e seguro enquanto os outros marcos evoluem.
>
> **Pronto quando:** incidentes são detectados, dados podem ser restaurados e direitos do usuário são atendidos sem operação improvisada.

Este é um trabalho contínuo e não espera os Marcos 1 a 6 terminarem.

- [x] RLS multi-time, auditoria de mudanças sensíveis, PII separada e storage privado.
- [x] CI, testes de banco, CodeQL e dependency review.

### 7.1 Gates de operação e segurança

- [ ] Provisionar e comprovar staging isolado, sem dados, segredos ou callbacks de produção.
- [x] Criar flags tipadas por time, desligadas por padrão e verificadas no servidor/banco, além de kill switches globais para integrações.
- [x] Manter controles separados para produzir e consumir a outbox.
- [x] Garantir por teste e ensaio produtivo que aplicação e banco aceitam as duas ordens possíveis de deploy.
- [x] Automatizar smoke pós-deploy somente leitura.
- [ ] Automatizar E2E das jornadas móveis críticas.
- [ ] Exportar dados pessoais em formato portátil e atender exclusão/minimização conforme LGPD.
- [ ] Incluir atributos internos e fornecer explicação adequada quando uma solicitação formal do titular ou a legislação aplicável exigir.
- [ ] Criar logs, métricas e alertas para falhas de autenticação, notificações, jobs e integrações.
- [ ] Definir renovação deslizante e limite absoluto das sessões duradouras sem expirar o acesso no meio do ciclo normal; revogação de aparelho, troca de telefone, saída do time e bloqueio administrativo devem surtir efeito imediato nas permissões correspondentes.
- [ ] Testar roubo, replay, fixação, rotação e vazamento de credenciais e sessões, inclusive link encaminhado, histórico do navegador, `Referer`, analytics e logs.
- [ ] Configurar backups e PITR e realizar um exercício documentado de restauração.
- [ ] Exigir MFA antes de ampliar a gestão de papéis privilegiados e os envios automatizados em produção.
- [ ] Testar RLS, replay, concorrência e abuso para garantir um voto por eleitor elegível e nenhum acesso entre times.
- [ ] Demonstrar que APIs, painel administrativo, suporte, exports, logs, analytics e backups operacionais não expõem associação entre eleitor e candidato; documentar o risco residual de operadores da infraestrutura.
- [ ] Definir retenção e descarte de recibos e cédulas, preservando apenas o resultado agregado quando possível.
- [ ] Realizar pentest independente antes de liberar links de ação sem login, votação identificada e páginas públicas de partidas em escala.

### 7.3 Melhorias técnicas adiadas no MVP

- [ ] Criar staging isolado com tenant sintético sem PII, segredos e callbacks
  próprios, smoke de escrita idempotente, casos negativos/cross-tenant e
  limpeza automática.
- [ ] Tornar Terraform operacional somente depois de criar state remoto
  protegido e importar, sem recriação, os recursos existentes de Supabase,
  Vercel e GitHub; exigir plano revisado e apply do mesmo artefato.
- [ ] Automatizar E2E mobile das jornadas críticas em Android, iPhone e
  navegador interno do WhatsApp.
- [ ] Ampliar smoke por jornada mantendo produção somente leitura enquanto não
  houver ambiente isolado para escrita.
- [ ] Criar observabilidade operacional com métricas, alertas e logs redigidos
  para autenticação, notificações, jobs e integrações.
- [ ] Configurar backup/PITR e ensaiar restauração com evidência.
- [ ] Atualizar Actions ainda baseadas em Node.js 20 quando os mantenedores
  publicarem versões compatíveis, sem habilitar runtime inseguro.

### 7.2 Produto e análise

- [ ] Painel de números do time sem ranking constrangedor.
- [ ] Histórico de presença e escalações.
- [ ] Comparações por temporada sem ranking constrangedor.
- [ ] Métricas avançadas, filtros por time e temporada e importação de súmulas antigas.
- [ ] Avaliar PWA somente se houver valor mensurável além dos links do WhatsApp.

---

## Próximos candidatos

- **Lista de espera automática:** quando o evento lotar, novas confirmações entram na fila e sobem sozinhas após uma desistência, com aviso pelo WhatsApp.
- **Compromisso no calendário:** adicionar o evento ao calendário do celular ao confirmar presença.
- **Peso de equilíbrio derivado dos jogos:** calcular sinais a partir do histórico em vez de depender apenas de avaliação manual.
- **Pergunta pós-jogo:** “os times ficaram equilibrados?” para calibrar a divisão automática.

## Horizonte exploratório — não desenvolver agora

- marketplace de árbitros;
- marketplace de organizadores de jogos, torneios e eventos;
- busca e reserva de quadras e campos;
- fornecedores de churrasco, alimentação e outros serviços do pós-jogo;
- descoberta e convite de atletas entre times e eventos, com privacidade e consentimento;
- cobrança, divisão e repasse dos pagamentos do racha;
- receita transacional sobre reservas, serviços e pagamentos processados.

Esse horizonte não é backlog executável e não recebe issue, release ou schema agora. Ele depende da validação do ciclo principal, de densidade local de oferta e demanda e de decisões futuras sobre reputação, moderação, suporte, antifraude, identidade, tributação e LGPD.

Arbitragem e súmula oficial de federação, chat geral, mensagens privadas e feed social continuam fora do plano atual.

Perfis e elencos públicos consentidos continuam no plano; uma vitrine aberta para recrutamento só poderá existir dentro do horizonte exploratório e com controles próprios.

A conversa contextual da súmula descrita no Marco 5 faz parte do plano; chat livre fora de uma partida continua fora.

Esses candidatos só entram depois que o ciclo semanal estiver validado de ponta a ponta:

**convite → confirmação → divisão → comunicação**.
