# Instruções de desenvolvimento do DeuTime

## Contexto mínimo

Antes de implementar uma feature:

1. confira `git status --short` e preserve alterações existentes;
2. leia somente o pacote ativo em `docs/releases/`;
3. consulte em `docs/product-context.md` somente os IDs referenciados;
4. leia `docs/work/current.md` se estiver retomando trabalho;
5. consulte em `docs/development.md` apenas o checkpoint ou gate necessário;
6. abra apenas decisões, entrypoints e testes referenciados pelo pacote;
7. use `rg` e `git log -- <caminho>` antes de ampliar a busca.

Não carregue `docs/roadmap.md` nem `docs/development.md` inteiros para uma issue comum. O pacote da release deve ser autossuficiente; esses documentos servem para planejamento ou consulta pontual.

## Regras permanentes

- Produto, interface, mensagens e documentação voltada ao usuário ficam em português.
- Toda jornada nasce mobile-first e WhatsApp-first.
- Preserve o isolamento multi-time e derive identidade da sessão verificada.
- Server Actions validam e delegam; invariantes e escritas sensíveis ficam em RPCs transacionais e RLS.
- Tabela nova nasce com RLS, grants mínimos e pgTAP positivo, negativo e cross-tenant.
- Nunca edite migration aplicada; use expand/contract e correção forward-only.
- Prefira expansão inerte publicada antes do app consumidor; se app e banco saírem juntos, ambos precisam tolerar as duas ordens de deploy.
- Integração externa exige adapter, idempotência, retry, observabilidade e kill switch.
- Feature nova nasce desligada e possui fallback até o piloto provar estabilidade.
- Não declare pronto se faltarem interface, autorização, testes, telemetria ou recuperação operacional da jornada.

## Execução

Trabalhe pelos checkpoints CP0–CP6 e perfis `VAL-*` de `docs/development.md`. Código novo respeita as fronteiras registradas em `docs/architecture.md`; evite ampliar Actions que já misturam domínios.

Ao interromper, substitua `docs/work/current.md` pelo último resultado e a próxima ação concreta. Antes do merge, registre as evidências no pacote e devolva o checkpoint a `idle`.
