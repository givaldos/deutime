# DEC-PRELAUNCH-INVITE-ACCESS — Acesso por convite antes do lançamento

- Status: accepted
- Data: 2026-09-05
- Release: R14
- Responsáveis: produto e engenharia do DeuTime

## Contexto

Durante a divulgação inicial, somente pessoas que receberam um código do
DeuTime podem concluir a criação de uma nova equipe. A conta autenticada pode
existir sem equipe, mas o código é a autorização temporária para iniciar um
novo tenant. O controle deve desaparecer no lançamento comercial sem apagar
times ou exigir uma contração imediata do banco.

## Decisão

- cada convite é um código aleatório no formato `XXXX-XXXX-XXXX-XXXX`, de uso
  único por padrão, com validade e revogação opcionais;
- somente o hash SHA-256 normalizado é persistido; código e hash nunca entram
  em logs, auditoria, URL, telemetria ou retorno de leitura;
- emissão é permitida apenas a `service_role`; tabelas não possuem acesso para
  `anon` ou `authenticated` e nascem com RLS;
- consumo do convite e criação da equipe ocorrem na mesma RPC transacional,
  sob locks do usuário e do convite. Falha na equipe não gasta o convite;
- código ausente, inválido, expirado, revogado ou já usado produz a mesma
  resposta pública, evitando enumeração;
- o controle global `team_creation_invite_only` nasce desligado. Ele só será
  ativado depois de banco e aplicação compatíveis estarem em produção;
- desligar o controle libera a criação normal imediatamente, preservando
  convites e resgates para auditoria e eventual reativação.

## Consequências

- o código é um segredo bearer e deve ser enviado diretamente à pessoa
  convidada; encaminhá-lo transfere a capacidade de uso antes do resgate;
- clientes antigos falham fechado depois da ativação porque não enviam código;
  atualizar a página carrega o formulário compatível;
- a política não bloqueia autenticação nem entrada de atletas por convites de
  times existentes; protege exclusivamente a criação de novos times;
- limites de propriedade e intervalo entre criações continuam válidos.

## Recuperação

Desligar `team_creation_invite_only` pela RPC operacional existente restaura a
criação sem código. Nenhum time, vínculo ou resgate é removido. Revogar um código
impede apenas usos futuros.
