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

## Rollout, fallback e rollback

- flag:
- piloto:
- telemetria:
- fallback:
- rollback:
- compatibilidade entre deploys:

## Evidências e checkpoint

Preencher durante a execução; o estado efêmero fica em `docs/work/current.md`.
