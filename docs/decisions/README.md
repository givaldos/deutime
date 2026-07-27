# Decisões arquiteturais

Use um ADR somente quando a escolha alterar schema, autorização, contrato público, modelo de ameaça, integração externa ou compatibilidade futura.

O [Contexto canônico](../product-context.md) mantém o índice e o status dos IDs. Ao resolver um bloqueador:

1. copie [`_template.md`](_template.md) para `DEC-NOME.md`;
2. registre opções, decisão, consequências, validação e migração;
3. altere o status no contexto canônico;
4. referencie o ADR no pacote consumidor;
5. atualize arquitetura, segurança ou runbook no mesmo pull request.

Preferências de texto, layout, arredondamento ou thresholds ajustáveis ficam no pacote da release e não precisam de ADR.
