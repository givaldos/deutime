---
id: RXX
type: vertical
status: draft
outcome: ""
depends_on: []
baseline: []
verified_at: ""
decisions: []
invariants: []
---

# RXX — Nome da release

## Resultado demonstrável

Descreva em até cinco linhas a jornada que uma pessoa consegue concluir.

## Três tempos

### Passado a preservar

- comportamento, migration, teste ou decisão já existente;

### Presente a resolver

- lacuna concreta e observável;

### Futuro compatível

- evolução prevista que o contrato deve aceitar;
- capacidade explicitamente fora do escopo;

## Escopo

### Incluído

- ...

### Fora

- ...

## Contratos e decisões

- decisão resolvida ou link para ADR;
- modelo de dados, permissões e eventos;
- regra mobile-first e WhatsApp-first aplicável;

## Entry points

- código:
- migrations:
- testes:
- documentação:

## Pacotes de trabalho

Cada pacote deve produzir uma fatia demonstrável e terminar em checkpoint válido. Entry points são arquivos concretos conferidos no commit `verified_at`; diretório amplo exige justificativa.

| Pacote | Critérios | Entry points principais | Validação |
|---|---|---|---|
| `WP-RXX-01` — ... | `AC-RXX-01` | arquivos concretos | `VAL-*` |

## Critérios de aceite

- [ ] `AC-RXX-01` — ...

## Riscos e controles

| Risco | Controle | Evidência |
|---|---|---|
| ... | ... | ... |

## Validação

```bash
npm run typecheck
npm test
```

Acrescente os gates de banco, segurança, mobile e integração exigidos pelo risco.
Quando houver migration, registre o resultado do gate de imutabilidade contra o
merge-base, do censo dinâmico de RLS/grants e da matriz app/schema N/N−1.
Quando houver infraestrutura, anexe o plano revisado e confirme que o apply usou
o mesmo artefato.

## Rollout, fallback e rollback

- flag tipada, desligada por padrão e conferida server-side:
- piloto:
- telemetria:
- fallback:
- kill switches independentes para produzir/consumir efeitos externos:
- smoke de produção somente leitura:
- smoke de staging sintético, idempotente e com limpeza:
- isolamento de staging (dados, chaves, origem e callbacks):
- rollback ensaiado:
- compatibilidade entre deploys N/N−1:

## Evidências e checkpoint

Preencher durante a execução com comandos, IDs de workflows/deployments,
resultado do smoke, coorte, fallback e próximo passo. O estado efêmero fica em
`docs/work/current.md`. CP5 exige evidência do ambiente real; código de workflow
sem execução não substitui o piloto.
