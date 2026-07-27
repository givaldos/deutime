## Resultado e pacote

<!-- Release/WP, resultado demonstrável e issue. Não descreva somente arquivos ou camadas. -->

## Passado preservado e escopo

<!-- Contratos reaproveitados, compatibilidade mantida e o que ficou explicitamente fora. -->

## Como foi validado

- [ ] lint e typecheck
- [ ] testes unitários
- [ ] build de produção
- [ ] migration, lint e pgTAP (quando aplicável)
- [ ] `terraform-check` e plano revisado (quando houver infraestrutura)
- [ ] fluxo mobile, acessibilidade e estados de falha (quando houver UI)
- [ ] Android, iPhone e navegador interno do WhatsApp (quando fizer parte da jornada)
- [ ] smoke da jornada e telemetria verificável

## Segurança e privacidade

- [ ] autorização server-side e isolamento por time revisados
- [ ] nenhuma chave/PII em código, logs, screenshots ou fixtures
- [ ] inputs, erros, limites e estados excepcionais tratados
- [ ] RLS e teste negativo adicionados para tabela/política nova
- [ ] finalidade/retenção documentadas para PII nova
- [ ] concorrência, replay, retry e idempotência cobertos quando aplicáveis
- [ ] feature flag não é usada como substituto de autorização

## Deploy, piloto e recuperação

<!-- Flag/coorte, fallback, kill switch, smoke, rollback e alertas. -->

- [ ] expansão inerte já foi publicada e verificada, ou este PR documenta por que app/banco podem sair juntos
- [ ] aplicação anterior tolera o schema expandido e, quando aplicável, a nova tolera a ordem independente
- [ ] migration aplicada não foi editada e contração ficou para release posterior
- [ ] documentação, tipos e checkpoint foram atualizados

## Evidências

<!-- Links ou resumo curto dos ACs atendidos, testes e verificação operacional. -->
