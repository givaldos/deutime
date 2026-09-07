---
id: R15
type: vertical
status: active
outcome: "Criar e publicar um campeonato em cinco passos claros, terminando com agenda, partidas e convocados realmente materializados."
depends_on:
  - R09
  - R13
fallback: "Fluxo detalhado anterior e operações manuais de geração, publicação e vínculo permanecem disponíveis durante o piloto."
---

# R15 — Campeonato guiado

## Resultado demonstrável

Owner ou admin toca em **Novo campeonato**, avança por Campeonato → Regras →
Equipes → Convocados → Agenda e conclui em **Criar agenda e publicar**. Não vê
“rascunho”, não precisa gerar a grade separadamente e encontra os jogos na agenda,
com partidas, lados e atletas convocados prontos para operação.

## Contratos

- [`DEC-CHAMPIONSHIP-GUIDED-SETUP`](../decisions/DEC-CHAMPIONSHIP-GUIDED-SETUP.md)
  fecha linguagem, fonte de verdade, autorização, atomicidade e fallback;
- `DEC-CHAMPIONSHIP-MODEL`, `DEC-EVENT-MATCH` e
  `DEC-PROFESSIONAL-SCHEDULING` continuam autoritativas;
- nenhuma classificação, súmula ou agenda paralela é criada.

## Pacote atual — WP-R15-01

Fatia vertical única: assistente de cinco passos, finalização transacional,
testes de aplicação/banco, compatibilidade, piloto e rollout.

## Critérios de aceite

- [x] jornada mostra cinco passos e não expõe “rascunho” durante a configuração;
- [x] criação combina nome/formato, regras e equipes em Próximo → Próximo → Continuar;
- [x] convocados são atletas ativos do tenant e cada atleta ocupa uma equipe;
- [x] agenda é calculada a partir da primeira data e pode ser revisada antes do fim;
- [x] concluir cria eventos, partidas, lados, vínculos e participações antes de publicar;
- [x] falha ou conflito duro reverte toda a finalização;
- [x] owner/admin finaliza; manager, atleta e cross-tenant falham fechados;
- [x] replay não duplica agenda, partida, vínculo ou convocação;
- [x] fallback e duas ordens de deploy permanecem funcionais;
- [ ] fluxo passa em 360 px, testes focados, gate completo e smoke produtivo.

## Validação e rollout

1. validar componentes, schemas e Actions;
2. validar pgTAP positivo, negativo, cross-tenant, replay e rollback;
3. promover expansão inerte, depois consumidor;
4. testar no navegador em largura móvel;
5. fazer piloto, smoke e rollback/restauração antes do CP6.

## Evidências pré-merge

- o PR `#403` aprovou CI, Database, CodeQL, Dependency review, Terraform e
  preview Vercel no commit `b3c6366`;
- 127 arquivos e 611 testes de aplicação passaram; os cinco arquivos focados
  somaram 28 testes da interface, Action, validação e cálculo da agenda;
- o Database reconstruiu o schema, validou tipos gerados e aprovou 71 arquivos
  com 1.862 testes pgTAP, incluindo os 29 casos transacionais da R15;
- lint, TypeScript, integridade das migrations, auditoria npm sem
  vulnerabilidades e build Next.js com Webpack passaram;
- o preview foi publicado, mas a inspeção autenticada pelo navegador ficou para
  produção porque o ambiente de preview exige autenticação adicional da Vercel;
- rollback: a aplicação faz fallback automático para o fluxo detalhado quando a
  RPC de disponibilidade ainda não existe; a finalização aborta integralmente
  diante de conflito duro.
