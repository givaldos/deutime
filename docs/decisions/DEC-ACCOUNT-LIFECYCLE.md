# DEC-ACCOUNT-LIFECYCLE — Saída de vínculos e encerramento da conta

- Status: accepted
- Data: 2026-08-26
- Release: R12
- Dependências: `BASE-IDENTITY`, `BASE-TENANCY`, `BASE-MATCH-REPORT`,
  `DEC-PUBLIC-PRIVACY`

## Contexto

A pessoa autenticada consegue editar dados da conta, mas ainda não possui uma
jornada própria para retirar pedidos, sair de um time ou encerrar a conta. Uma
remoção ingênua pode apagar fatos esportivos de outras pessoas, deixar um time
sem responsável, manter identidade em superfícies públicas ou prometer uma
eliminação física incompatível com auditoria e backups.

A LGPD prevê o término do tratamento e a eliminação após esse término, admite
conservação somente nas hipóteses do art. 16 e garante ao titular acesso,
correção, anonimização, bloqueio, eliminação e revogação do consentimento. O
contrato técnico precisa minimizar por padrão e tornar exceções de retenção
explícitas, sem tratar o consentimento de publicação como base para todas as
operações da conta.

## Opções consideradas

1. **Excluir todas as linhas imediatamente:** parece simples, mas quebra
   súmulas, classificações, auditoria e referências pertencentes ao time.
2. **Apenas desativar a conta:** preserva integridade, porém não atende a
   retirada pública, a minimização nem a autonomia esperada.
3. **Encerramento em duas fases com anonimização:** retira acesso e exposição
   imediatamente, elimina PII operacional em lote idempotente e conserva apenas
   fatos anônimos ou evidência estritamente necessária por prazo definido.

## Decisão

Adotar a terceira opção.

### Finalidades e bases de trabalho

- conta, autenticação, vínculo solicitado e operação privada do time usam a
  execução do serviço pedido pelo titular como base de trabalho;
- perfil público, atividade esportiva pública e comunicação opcional continuam
  dependentes de consentimento específico, versionado e revogável;
- evidência mínima de segurança, atendimento ao titular e defesa de direitos só
  permanece quando necessária para obrigação aplicável ou exercício regular de
  direitos; não autoriza reutilização comercial, ranking ou nova publicação;
- legítimo interesse não será fallback automático para tornar atleta público,
  enviar marketing ou prolongar retenção;
- o mapeamento de controlador, operador e textos jurídicos será ratificado pelo
  responsável pelo tratamento antes do CP5. Essa revisão pode restringir
  prazos ou dados, mas não pode ampliar exposição silenciosamente.

### Saída e último proprietário

- pedido ou convite pendente pode ser retirado ou recusado pelo próprio usuário;
  o artefato deixa de autorizar entrada imediatamente;
- vínculo ativo pode ser encerrado pelo próprio usuário. A operação revoga
  permissões e notificações daquele time sem alterar vínculos com outros times;
- um time mantém ao menos um `owner` ativo. O último owner precisa transferir a
  propriedade em uma operação transacional para outro membro ativo elegível ou
  escolher **Encerrar o time**;
- encerrar o time exige reautenticação, digitação do nome do time e confirmação
  separada. A ação retira páginas públicas, cancela convites e novos efeitos
  externos e agenda a mesma política de minimização; não apaga silenciosamente
  súmulas ou classificações encerradas;
- conta vinculada como último owner de qualquer time não conclui o encerramento
  até que cada time tenha sido transferido ou encerrado. A interface lista os
  bloqueios e oferece a ação correspondente, sem depender de suporte manual.

### Encerramento e retenção

- a confirmação reautenticada coloca a conta em encerramento, revoga todas as
  sessões, credenciais e consentimentos e remove imediatamente perfil, foto,
  metadata e demais projeções públicas;
- PII em tabelas operacionais, arquivos privados e notificações futuras é
  eliminada ou anonimizada por rotina idempotente em até 30 dias. Até concluir,
  a conta permanece bloqueada e não pode ser reativada por login comum;
- pedido rejeitado, convite recusado ou vínculo sem fato esportivo perde PII em
  até 30 dias. Com fato encerrado, a referência vira representação anônima sem
  `user_id`, contato, foto, consentimento ou identificador público recuperável;
- auditoria técnica necessária conserva somente IDs opacos, ação, resultado e
  tempo por 180 dias; payload, nome, telefone, e-mail e conteúdo livre não entram
  nessa evidência. Depois do prazo, a limpeza é transacional e idempotente;
- a evidência redigida do pedido e da conclusão fica por 180 dias para evitar
  reprocessamento e permitir atendimento. Notificações operacionais da R12
  seguem o mesmo limite máximo;
- backups seguem o ciclo configurado do provedor, com limite operacional de 30
  dias a comprovar antes do piloto. Restauração reaplica a lista de exclusões
  antes de liberar leitura ou tráfego; a confirmação informa essa expiração e
  não promete remoção física imediata de cópia protegida;
- agregados e fatos esportivos realmente anonimizados podem acompanhar o
  histórico do time. Se houver meio razoável de reidentificação, continuam
  pessoais e obedecem aos prazos e às bases acima.

### Comunicação e recuperação

- a pessoa recebe confirmação do início e da conclusão por canal previamente
  verificado; a mensagem não contém lista de times, atletas ou outros dados;
- falha ao apagar o usuário no provedor de autenticação mantém a conta bloqueada
  e entra em retry/reconciliação. Nunca se reabre acesso porque uma etapa externa
  falhou;
- suporte pode consultar somente estado, tempos e código redigido da etapa, sem
  restaurar consentimento ou vínculo.

## Consequências

- a autonomia deixa de depender de suporte sem sacrificar o histórico coletivo;
- encerrar uma conta passa a exigir coordenação transacional entre domínio,
  storage e autenticação, com estado intermediário recuperável;
- a rotina de retenção precisa abranger auditoria e notificações da R12 e manter
  uma lista de exclusões aplicável após restore;
- períodos menores definidos por obrigação ou revisão jurídica prevalecem; uma
  ampliação exige nova decisão, finalidade documentada e aviso de privacidade.

## Validação

- pgTAP positivo, negativo, concorrente e cross-tenant para retirar pedido,
  sair, transferir propriedade, encerrar time e anonimizar referências;
- testes provam que o último owner não sai sem resolução e que duas operações
  concorrentes não deixam o time sem owner;
- censo de PII verifica banco, Storage, Auth, outbox, auditoria, logs, analytics,
  páginas, metadata e imagens antes e depois da rotina;
- teste de restore confirma que exclusões pendentes são reaplicadas antes do
  tráfego; métricas registram somente contagens, etapa e duração;
- Android, iPhone e navegador interno confirmam reautenticação, compreensão dos
  efeitos, bloqueios acionáveis e comunicação de conclusão.

## Plano de migração e reversão

- expandir com estado de encerramento, comandos idempotentes, rotinas de
  minimização e flags desligadas antes de expor qualquer ação;
- publicar primeiro leitura de vínculos e bloqueios, depois saída e, por último,
  encerramento de conta/time em coorte controlada;
- rollback esconde novas ações e interrompe novos comandos, mas o worker termina
  pedidos já confirmados; nunca reverte revogação ou republica dados;
- contração de colunas e controles legados ocorre somente depois do censo e do
  ciclo máximo de backup.

## Fontes oficiais consultadas

- [Lei nº 13.709/2018, arts. 15, 16 e 18](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [ANPD — Direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares)
