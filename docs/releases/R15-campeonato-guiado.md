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

- [ ] jornada mostra cinco passos e não expõe “rascunho” durante a configuração;
- [ ] criação combina nome/formato, regras e equipes em Próximo → Próximo → Continuar;
- [ ] convocados são atletas ativos do tenant e cada atleta ocupa uma equipe;
- [ ] agenda é calculada a partir da primeira data e pode ser revisada antes do fim;
- [ ] concluir cria eventos, partidas, lados, vínculos e participações antes de publicar;
- [ ] falha ou conflito duro reverte toda a finalização;
- [ ] owner/admin finaliza; manager, atleta e cross-tenant falham fechados;
- [ ] replay não duplica agenda, partida, vínculo ou convocação;
- [ ] fallback e duas ordens de deploy permanecem funcionais;
- [ ] fluxo passa em 360 px, testes focados, gate completo e smoke produtivo.

## Validação e rollout

1. validar componentes, schemas e Actions;
2. validar pgTAP positivo, negativo, cross-tenant, replay e rollback;
3. promover expansão inerte, depois consumidor;
4. testar no navegador em largura móvel;
5. fazer piloto, smoke e rollback/restauração antes do CP6.
