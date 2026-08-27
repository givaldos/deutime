# Segurança

## Meta de garantia

O baseline é OWASP ASVS 5.0 nível 2 e OWASP Top 10. Isso não é uma certificação: produção exige revisão independente, testes de intrusão e operação contínua. Segurança é critério de aceite em toda issue.

## Fronteiras de confiança

- todo dado de navegador, webhook, arquivo, slug e metadado do usuário é não confiável;
- a chave publicável do Supabase é pública por definição;
- a chave secreta do Supabase ignora RLS e só pode existir em runtime server-side;
- autorização é verificada no servidor e no banco, nunca deduzida da interface;
- cada consulta/escrita de domínio deve permanecer limitada ao `team_id` autorizado.

## Controles implementados

| Risco | Controle |
| --- | --- |
| A01 Broken Access Control | RLS em todas as tabelas, chaves compostas anti-cross-tenant, DAL server-side, último owner protegido, convites limitados por papel, súmula mutável somente por staff, agregados públicos condicionados ao opt-in e testes pgTAP por papel |
| A02 Security Misconfiguration | headers seguros, scripts e elementos de estilo protegidos por nonce em produção, atributos de estilo liberados separadamente para runtimes confiáveis, HSTS em produção, `poweredByHeader` removido, schemas expostos mínimos, bucket privado |
| A03 Supply Chain | lockfile, versões exatas, scripts de instalação allowlisted, Dependabot, dependency review, CodeQL, ações GitHub fixadas por SHA |
| A04 Cryptographic Failures | TLS pelas plataformas, segredos fora do Git, tokens de convite aleatórios persistidos somente como SHA-256, variáveis sensíveis na Vercel, estado remoto do Terraform obrigatório |
| A05 Injection | Zod, SQL parametrizado pelo SDK, RPC tipada, sem `eval`/`new Function`, regras ESLint |
| A06 Insecure Design | PII separada, consentimento explícito, registro público pendente, outbox idempotente, deny-by-default |
| A07 Authentication Failures | cookies geridos pelo Supabase SSR, claims verificados no servidor, senha local mínima de 12 caracteres, confirmação de e-mail, redirecionamento interno validado |
| A08 Data Integrity Failures | migrations versionadas, CI, branch protegida, constraints, aceite de convite transacional com row lock, cadastro de atleta/evento atômico, auditoria e workflows fixados por SHA; o gate automático contra edição retroativa entra na R00 |
| A09 Logging and Alerting | audit log de mudanças sensíveis sem conteúdo integral da PII; runbook prevê alertas e resposta a incidente |
| A10 Exceptional Conditions | erros públicos genéricos, timeouts, limites de tamanho, criação de times serializada e limitada por conta, falha fechada para anti-bot em produção, operações idempotentes |

## Cadastro público

O formulário usa duas camadas de validação, campo honeypot, Turnstile validado no servidor, limite de tamanho e resposta genérica antes de solicitar OTP. A conclusão exige sessão autenticada com telefone confirmado e chama `complete_verified_athlete_registration`, que revalida a identidade no banco; não usa a chave secreta da aplicação. Todo cadastro entra como `pending`, invisível no diretório público até aprovação e conforme as flags atuais. `DEC-PUBLIC-PRIVACY` decidiu que BID administrativo não reivindicado nunca recebe consentimento por ato do staff; a retirada do controle legado ainda depende da expansão R04.

O Turnstile não substitui rate limiting. Antes de abrir produção, configure limite por IP/slug no firewall da Vercel ou serviço equivalente, com política conservadora e observabilidade de falsos positivos.

## Operações administrativas

- criação de atleta, dados privados, posições e inclusão nas chamadas futuras ocorre em uma RPC transacional;
- aprovação pública usa bloqueio de linha, só aceita estado `pending` e não pode ser repetida;
- criação de evento materializa a série e popula a chamada do elenco no mesmo commit;
- alteração administrativa de presença confere evento, atleta ativo e time novamente no banco;
- no modelo legado, lançamento da súmula exige staff e atleta confirmado; na expansão R04, autoria interna exige participação real na mesma partida e lado, enquanto fato de adversário externo pode omitir atleta;
- partidas, lados, participações, lances e correções não aceitam escrita direta do cliente; correção após encerramento é append-only, exige motivo e permanece auditada;
- estatísticas ignoram rascunhos e são derivadas somente de eventos concluídos com súmula encerrada;
- perfil reivindicado pelo atleta torna nome, contato, privacidade e posições imutáveis para owner/admin; somente camisa e observação interna do vínculo permanecem editáveis;
- foto de perfil é gravada pelo atleta apenas na própria pasta do bucket privado, vinculada por RPC auditada e exposta por URL temporária somente após opt-in público;
- remoção do vínculo exige owner/admin, apaga cadastros sem histórico e minimiza os que possuem fatos esportivos, removendo contato, nascimento, consentimentos e chamadas futuras enquanto preserva a identificação necessária à súmula;
- `INSERT` direto em `athletes`, `athlete_private`, `venues`, `events` e `event_attendance`, além de mutações diretas em atleta/PII/posições, foi removido de `authenticated` para impedir bypass dos workflows;
- mudanças de status de atleta, evento e presença continuam registradas em `audit_logs` sem copiar PII.
- transmissão de partida aceita somente provedor allowlisted e identificador validado; URL e HTML de embed arbitrários são rejeitados;
- a superfície anônima recebe identidade, escalação, participação ou autoria somente pela projeção e pelos consentimentos específicos definidos em `DEC-PUBLIC-PRIVACY`; sem ambos, o fato permanece anônimo por lado.

## LGPD e privacidade

- definir controlador, operadores e base legal antes da coleta real;
- publicar Termos e Política de Privacidade versionados;
- coletar apenas dados necessários e registrar a versão aceita;
- permitir acesso, correção, portabilidade e eliminação conforme obrigação aplicável;
- definir retenção para cadastros rejeitados, auditoria, backups e notificações;
- formalizar DPA com fornecedores e mapear transferência internacional;
- não usar telefone para WhatsApp sem consentimento válido ou outra base legal revisada;
- usar `privacy_notes` apenas para informação operacional estritamente necessária, nunca dados sensíveis sem avaliação jurídica.

### Projeções esportivas públicas

[`DEC-PUBLIC-PRIVACY`](decisions/DEC-PUBLIC-PRIVACY.md) separa público anônimo,
capability pessoal, atleta autenticado e staff. Evento público não torna atleta
público: placar e fatos por lado podem ser anônimos, mas escalação, participação
e autoria exigem consentimento próprio, específico, versionado e revogável. Foto
e link de perfil exigem também consentimento de perfil.

- staff não concede consentimento pelo atleta e o legado
  `athletes.public_profile` deixa de autorizar pessoa não reivindicada;
- capability encaminhada não revela terceiros, lineup privado ou contato;
- RSVP, ausência, pendência, lista de espera, contato, nascimento, observação,
  capability e cédula individual nunca entram na projeção anônima;
- comentário permanece identificado apenas para a conversa privada autorizada;
- menor de 18 anos ou idade não confirmada não ativa superfície pessoal pública
  no MVP, que ainda não possui fluxo de responsável;
- revogação invalida a projeção e suas URLs assinadas sem reescrever a súmula
  interna; cache privado usa `no-store` e Open Graph nunca varia por pessoa.

### Saída de vínculos e encerramento

O `WP-R12-03` implementa `DEC-ACCOUNT-LIFECYCLE` com bloqueio em duas fases.
Pedidos, convites e vínculos são lidos por RPC derivada de `auth.uid()` e do
e-mail confirmado; IDs enviados pelo formulário nunca definem o titular. Sair
de um time bloqueia a linha do time, revoga membership, consentimentos,
presenças futuras e outbox ainda sem efeito, sem alcançar outro tenant.

- o último `owner` é protegido pelo trigger e pela RPC sob row lock; uma prova
  concorrente com duas conexões mantém exatamente um owner ativo;
- transferir exige destinatário com membership ativo no mesmo time;
- encerrar time ou conta exige senha atual, ou sessão OTP emitida há no máximo
  cinco minutos, seguida de autorização de uso único emitida somente por
  `service_role` e válida por cinco minutos;
- o bloqueio da conta entra em `private.account_exclusion_registry` antes da
  chamada ao Auth. A DAL recusa toda sessão bloqueada mesmo se o provedor falhar;
- `deleteUser(..., true)` faz a exclusão lógica irreversível no Auth sem quebrar
  referências históricas. Perfil, contato, consentimentos, publicações e
  vínculos são removidos; fatos encerrados preservam apenas atleta anônimo;
- arquivos ficam em filas idempotentes com retry exponencial. Logs e auditoria
  guardam somente UUID opaco, etapa, resultado, contagem e código sanitizado;
- recibos e exclusões duram 180 dias. Arquivos e PII operacional devem ser
  minimizados em até 30 dias; restauração de backup reaplica a lista de exclusão
  antes de liberar tráfego.

`account_autonomy` nasce desligado e não pertence ao catálogo do rollout global
anterior. Desligá-lo impede novos comandos e oculta ações, mas a reconciliação
continua concluindo pedidos já bloqueados; rollback nunca republica identidade
ou recria vínculo.

## Credencial reutilizável e sessão duradoura

O acesso WhatsApp-first planejado segue [`DEC-PERSISTENT-ACCESS`](decisions/DEC-PERSISTENT-ACCESS.md): credencial pessoal reutilizável, capability persistente limitada ao evento e sessão de identidade persistente no aparelho. A R00 aprovou o transporte por fragmento + `POST` same-origin e o threat model; antes da R02, a implementação deve demonstrar:

- entropia suficiente, persistência somente de hash e comparação resistente;
- escopo da credencial limitado ao par evento-atleta e autorização recalculada no servidor a cada ação;
- capability `httpOnly` ou proteção equivalente limitada ao evento, sem poder emitir diretamente uma sessão global de identidade;
- sessão rotativa vinculada à identidade atual somente após OTP ou reaproveitamento de aparelho já verificado, sem copiar papéis ou permissões imutáveis para o cliente;
- transporte inicial resistente a unfurl, prefetch e logs — como fragmento trocado por `POST` antes de terceiros — e remoção do segredo da URL após a troca;
- bloqueio do segredo em `Referer`, Open Graph, analytics, logs controlados pela aplicação, erros e suporte, documentando que o provedor da mensagem necessariamente conhece o link enviado;
- revogação individual de credencial/aparelho e revogação global com efeito imediato;
- rotação após uso sensível e proteção contra replay, fixação, concorrência e roubo;
- reidentificação por OTP antes de emitir identidade completa em aparelho novo e sempre diante de credencial ausente/revogada ou sinal de risco;
- limite absoluto e renovação deslizante que evitem autenticação recorrente no uso normal;
- teste específico de link encaminhado e de persistência no navegador interno do WhatsApp;
- resposta a incidente que preserve a URL pública e desabilite somente ações identificadas.

O contrato fixa 256 bits de entropia, hash SHA-256, expiração máxima sete dias
após o evento, capability com renovação deslizante de 30 dias limitada pelo
evento e sessão de aparelho com 30 dias de inatividade e limite absoluto de 180
dias. Mudança de risco, aparelho novo, revogação ou elevação de privilégio exige
OTP. Os detalhes, ameaças e critérios de teste estão no ADR canônico.

A credencial reconhece a elegibilidade no evento; ela não concede por si só sessão global, comentário, voto, papel administrativo nem acesso depois que o vínculo ou a fase deixarem de permitir a ação.

## Voto anônimo do Craque

O voto R05 usa sessão verificada e snapshot privado de SIM/TALVEZ. A RPC deriva
o atleta da sessão, exige candidato em `match_participations`, revalida time,
flag `voting`, partida finalizada e janela aberta. Staff só vota quando também é
atleta elegível.

- cliente nunca envia UUID ou hash do eleitor;
- salt aleatório por partida permanece no schema `private`;
- cédulas e recibos não possuem leitura direta para `anon` ou `authenticated`;
- a assinatura legada que aceitava hashes arbitrários perde `EXECUTE` antes da
  interface consumidora;
- recibo persiste somente como hash e não contém candidato;
- a página autenticada do recibo usa o token bearer somente para confirmar
  “voto computado”, com `noindex` e `no-referrer`, sem consultar a escolha;
- FK composta e pgTAP negativo impedem candidato e voto cross-tenant;
- a flag desligada falha fechado e mantém a súmula como fallback.

O identificador de `/e/{public_id}` não é credencial. Conforme
[`DEC-EVENT-PUBLIC-MINIMUM`](decisions/DEC-EVENT-PUBLIC-MINIMUM.md), o GET
anônimo omite endereço do local, chamada, atletas, presença e prazo interno,
usa `noindex`, `no-referrer` e não autoriza escrita. A credencial personalizada
existe somente no fragmento e é trocada antes de carregar terceiros.

Conforme
[`DEC-UNCLAIMED-IDENTITY`](decisions/DEC-UNCLAIMED-IDENTITY.md), um atleta
administrativo sem `user_id` pode responder somente pelo escopo atleta-evento.
Essa capability não cria identidade; a reivindicação exige OTP no telefone
verificado pelo Auth, preserva o `athlete_id` e revoga/rotaciona acessos emitidos
antes da reivindicação. Conflito ou ambiguidade falha de forma fechada.

## Conversa privada da súmula

A R06 exige sessão de identidade completa. Capability do evento, URL pública e
sessão anônima nunca leem nem escrevem comentários. Cada RPC recalcula time,
vínculo ativo, staff ou atleta do snapshot SIM/TALVEZ, flag `comments`, partida
e prazo; o cliente não envia autoria, papel ou escopo.

- comentários e denúncias não possuem acesso direto para `anon` ou
  `authenticated`; somente projeções e RPCs mínimas atravessam a fronteira;
- conteúdo, identidade e denunciante nunca entram em página pública, Open
  Graph, analytics, logs, erro ou auditoria integral;
- comentário aceita somente texto simples limitado; HTML, anexos e links
  clicáveis ficam fora do MVP;
- respostas pertencem à mesma partida e têm um nível, impedido encadeamento
  arbitrário ou referência cross-tenant;
- denúncia não remove automaticamente conteúdo. Staff oculta ou restaura com
  motivo; a auditoria guarda IDs e motivo sanitizado, nunca corpo ou identidade
  do denunciante;
- escrita é idempotente e limitada por autor/time. Replay e concorrência não
  criam duplicata;
- desligar a flag ou remover vínculo revoga acesso imediatamente; soft-delete
  e moderação preservam marcador sem devolver o texto oculto;
- escrita termina após sete dias. Conteúdo, identidade, denúncia, snapshot e
  auditoria vinculada são eliminados após dois anos por lote transacional,
  idempotente e exclusivo de `service_role`.

O contrato completo está em
[`DEC-CONVERSATION-LIFETIME`](decisions/DEC-CONVERSATION-LIFETIME.md). A
expansão nasce inerte; partidas antigas sem snapshot não recebem backfill de
audiência.

### Registro do fornecedor nos pilotos R02/R03

Revisado em 31/07/2026 para o piloto com dados demo:

| Item | Registro e controle |
|---|---|
| Canal | WhatsApp Business Platform operado por Twilio; os termos específicos da Twilio também vinculam o uso aos termos aplicáveis da WhatsApp LLC/Meta. |
| Conteúdo conhecido | destinatário, corpo da mensagem e URL personalizada completa, inclusive a credencial no fragmento. Isso é `Customer Content` para a Twilio e não é anônimo perante Twilio/Meta. |
| Papel contratual | o [DPA da Twilio](https://www.twilio.com/en-us/legal/data-protection-addendum), incorporado ao acordo de uso, descreve Twilio como operador/suboperador em parte do tratamento e como controlador independente nas finalidades limitadas previstas pelo próprio DPA; ele inclui LGPD e mecanismos de transferência internacional. |
| Terceiros | a [lista de suboperadores](https://www.twilio.com/en-us/legal/sub-processors) identifica Meta no canal WhatsApp e oferece inscrição para alterações. Os [termos específicos](https://www.twilio.com/en-us/legal/service-country-specific-terms) tratam WhatsApp Business Platform como serviço de terceiro sujeito também aos termos da Meta. |
| Minimização do MVP | mensagem contém somente texto operacional, URL pública do evento e credencial atleta-evento. Não enviar nascimento, posição, resposta atual, escalação, endereço privado, observação ou outro dado sensível. |
| Aplicação | o GET, metadata e preview recebem somente a URL pública limpa; a aplicação remove o fragmento antes da jornada, não registra o segredo e permite revogação individual/global. Essas proteções limitam o impacto, mas não apagam a exposição ocorrida no envio. |
| Worker e outbox | conforme [`DEC-WHATSAPP-DISPATCH-SAFETY`](decisions/DEC-WHATSAPP-DISPATCH-SAFETY.md), a outbox não contém a credencial. Uma RPC a emite na preparação e persiste somente o hash; o valor em claro vive apenas na memória do worker. Após a barreira de efeito, timeout ou queda não provoca reenvio automático. |
| Executor interno | aceita somente `POST` com bearer aleatório server-only de no mínimo 32 caracteres, resposta `no-store` e `integration_consume` ativo. O entrypoint publicado em CP2 chama apenas dry-run; libera o lease antes da barreira e não recebe configuração Twilio. |
| Callback | Route Handler valida `X-Twilio-Signature` com o SDK oficial, URL canônica e todos os campos do formulário. A URL nova contém somente o UUID não secreto da tentativa; a RPC é exclusiva do `service_role`, idempotente e monotônica. O token opaco persistido como hash fica apenas para compatibilidade com URLs já emitidas. A projeção operacional guarda estado, código sanitizado e timestamps, nunca telefone, corpo, URL, SID ou credencial. |
| Piloto e produção real | o piloto permanece restrito a pessoas e dados demo. Antes de usar atletas reais, o responsável pelo tratamento deve confirmar base legal/consentimento, entidade contratante da conta, retenção configurada, termos vigentes e avisos de mudança de suboperadores. |

Na R03, callbacks de status e entrada aceitam somente `POST` com
`X-Twilio-Signature` validado pela biblioteca oficial contra a URL pública
exata. Message SID e estado normalizado podem ser persistidos; Auth Token,
telefone, corpo completo e link personalizado não entram em logs ou auditoria.
O Sandbox continua proibido para atletas reais e não substitui sender próprio
nem template aprovado.

O endpoint implementado em CP3 limita o corpo a 16 KiB, aceita somente
`application/x-www-form-urlencoded` e não confia no header `Host` para
reconstruir a URL assinada. `TWILIO_AUTH_TOKEN` é server-only; quando ausente o
webhook responde indisponível. O consumidor live geral continua inacessível;
somente o piloto unitário descrito abaixo possui entrypoint.

O piloto Sandbox acrescenta um entrypoint live separado, sem varredura de fila.
Além do bearer server-only, ele exige modo `sandbox`, time UUID, destinatário
E.164 e `ContentSid` allowlisted no ambiente. A RPC aceita uma única outbox e
repete todos esses vínculos antes do lease; configuração inválida, flag ou
consumo desligados falham fechado. Resultado ambíguo nunca autoriza repetição.

Este registro documenta o fluxo e as salvaguardas técnicas; não substitui a
avaliação jurídica do controlador nem permite declarar anonimato contra o
fornecedor de mensageria.

## Checklist antes de produção

- [ ] domínio e URLs de callback definitivos configurados;
- [ ] SMTP transacional próprio e políticas SPF/DKIM/DMARC;
- [ ] Turnstile e rate limiting ativos;
- [ ] MFA obrigatório para owners/admins quando o fluxo for implementado;
- [ ] segredos exclusivos por ambiente, rotação testada e sem legado `service_role`/`anon` quando possível;
- [ ] Supabase e Vercel na região definida, com backups/PITR e teste de restauração;
- [ ] previews protegidos e sem apontar para dados de produção;
- [ ] logs sem tokens, telefones, e-mails ou payloads de autenticação;
- [ ] threat model, rotação, revogação e testes de replay da credencial duradoura aprovados;
- [ ] alertas para erro, pico de cadastros, falhas de auth, RLS e outbox;
- [ ] política de retenção e rotina de exclusão implementadas;
- [ ] threat model revisado por feature e pentest independente concluído;
- [ ] plano de incidente com responsáveis, contatos e janela de comunicação;
- [ ] conta de serviço de deploy com mínimo privilégio e MFA nas contas humanas;

## Regras de contribuição

1. Não usar chave secreta em Client Component, variável `NEXT_PUBLIC_*`, log ou teste.
2. Toda tabela nova deve habilitar RLS no mesmo migration e ter teste positivo e negativo.
3. Toda escrita deve derivar o usuário da sessão verificada, nunca de `user_id` enviado pelo cliente.
4. Toda alteração de PII deve documentar finalidade, retenção e acesso.
5. Dependência nova precisa de justificativa, licença compatível e manutenção ativa.
6. Falhas de autorização, vazamento, injeção, bypass de anti-bot ou secret scanning bloqueiam o deploy.

Vulnerabilidades devem ser relatadas privadamente conforme `SECURITY.md`, sem abrir issue pública com detalhes exploráveis.
